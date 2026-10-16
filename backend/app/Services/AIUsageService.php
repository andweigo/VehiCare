<?php

namespace App\Services;

use App\Models\AiUsageLog;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AIUsageService
{
    private readonly AIRuntimeSettingsService $runtimeSettings;

    public function __construct(?AIRuntimeSettingsService $runtimeSettings = null)
    {
        $this->runtimeSettings = $runtimeSettings ?? new AIRuntimeSettingsService();
    }

    /**
     * Get consolidated AI usage statistics for a user or guest.
     */
    public function getUsageStats(?User $user, ?string $guestUuid = null): array
    {
        if ($user) {
            $user->checkSubscriptionStatus();
            $plan = $user->subscription_plan === User::SUBSCRIPTION_PREMIUM ? 'premium' : 'free';
            $limitsConfig = $this->runtimeSettings->limitsFor($plan) ?? [
                'limit' => $plan === 'premium' ? 100 : 20,
                'period' => 'monthly',
                'max_video_mb' => $plan === 'premium' ? 30 : 15,
                'max_video_sec' => $plan === 'premium' ? 60 : 30,
            ];

            $startOfMonth = Carbon::now()->startOfMonth();

            $usedCount = AiUsageLog::where('user_id', $user->id)
                ->where('created_at', '>=', $startOfMonth)
                ->where(function ($query) {
                    $query->where('status', 'success')
                        ->orWhere(function ($pending) {
                            $pending->where('status', 'pending')
                                ->where('created_at', '>=', now()->subMinutes(10));
                        });
                })
                ->count();

            $limit = (int) $limitsConfig['limit'];
            $remaining = max(0, $limit - $usedCount);
            $resetAt = Carbon::now()->endOfMonth()->toIso8601String();

            return [
                'authenticated' => true,
                'user_id' => $user->id,
                'plan' => $plan,
                'used' => $usedCount,
                'limit' => $limit,
                'remaining' => $remaining,
                'period' => 'monthly',
                'reset_at' => $resetAt,
                'exhausted' => $remaining <= 0,
                'video' => [
                    'max_size_mb' => (int) ($limitsConfig['max_video_mb'] ?? 15),
                    'max_duration_seconds' => (int) ($limitsConfig['max_video_sec'] ?? 30),
                ],
                'media' => [
                    'max_image_mb' => (int) ($limitsConfig['max_image_mb'] ?? 10),
                    'max_video_mb' => (int) ($limitsConfig['max_video_mb'] ?? 15),
                    'max_audio_mb' => (int) ($limitsConfig['max_audio_mb'] ?? 10),
                    'max_video_sec' => (int) ($limitsConfig['max_video_sec'] ?? 30),
                    'max_audio_sec' => (int) ($limitsConfig['max_audio_sec'] ?? 60),
                ],
            ];
        }

        // Guest logic
        $limitsConfig = $this->runtimeSettings->limitsFor('guest') ?? [
            'limit' => 5,
            'period' => 'total',
            'max_image_mb' => 5,
            'max_video_mb' => 10,
            'max_audio_mb' => 10,
            'max_video_sec' => 20,
            'max_audio_sec' => 30,
        ];

        $usedCount = blank($guestUuid)
            ? 0
            : AiUsageLog::where('guest_uuid', $guestUuid)
                ->where(function ($query) {
                    $query->where('status', 'success')
                        ->orWhere(function ($pending) {
                            $pending->where('status', 'pending')
                                ->where('created_at', '>=', now()->subMinutes(10));
                        });
                })
                ->count();

        $limit = (int) $limitsConfig['limit'];
        $remaining = max(0, $limit - $usedCount);

        return [
            'authenticated' => false,
            'guest_uuid' => $guestUuid,
            'plan' => 'guest',
            'used' => $usedCount,
            'limit' => $limit,
            'remaining' => $remaining,
            'period' => 'total',
            'reset_at' => null,
            'exhausted' => $remaining <= 0,
            'video' => [
                'max_size_mb' => (int) ($limitsConfig['max_video_mb'] ?? 10),
                'max_duration_seconds' => (int) ($limitsConfig['max_video_sec'] ?? 20),
            ],
            'media' => [
                'max_image_mb' => (int) ($limitsConfig['max_image_mb'] ?? 5),
                'max_video_mb' => (int) ($limitsConfig['max_video_mb'] ?? 10),
                'max_audio_mb' => (int) ($limitsConfig['max_audio_mb'] ?? 10),
                'max_video_sec' => (int) ($limitsConfig['max_video_sec'] ?? 20),
                'max_audio_sec' => (int) ($limitsConfig['max_audio_sec'] ?? 30),
            ],
        ];
    }

    /**
     * Atomically check and reserve AI consultation usage.
     * Throws an exception or returns false if limit reached.
     */
    public function evaluateAndReserve(
        ?User $user,
        ?string $guestUuid,
        string $inputType,
        ?int $mediaSizeBytes = null,
        ?int $videoDurationSec = null,
        ?string $requestId = null,
        ?string $payloadHash = null
    ): array
    {
        if (! $user && blank($guestUuid)) {
            throw ValidationException::withMessages([
                'guest_uuid' => ['A guest identifier is required to enforce the consultation allowance.'],
            ]);
        }

        $lockIdentity = $user
            ? 'user:' . $user->id
            : 'guest:' . hash('sha256', (string) $guestUuid);

        $requestKey = $requestId === null
            ? null
            : hash('sha256', $lockIdentity . ':request:' . $requestId);

        return Cache::lock('ai-usage-reservation:' . $lockIdentity, 15)->block(10, function () use ($user, $guestUuid, $inputType, $mediaSizeBytes, $videoDurationSec, $requestKey, $payloadHash) {
            try {
                return DB::transaction(function () use ($user, $guestUuid, $inputType, $mediaSizeBytes, $videoDurationSec, $requestKey, $payloadHash) {
                if ($requestKey !== null) {
                    $existing = AiUsageLog::where('request_key', $requestKey)->lockForUpdate()->first();
                    if ($existing) {
                        if (! hash_equals((string) $existing->payload_hash, (string) $payloadHash)) {
                            return ['allowed' => false, 'reason' => 'request_id_reused'];
                        }

                        if ($existing->status === 'success' && is_array($existing->response_payload)) {
                            $stats = $this->getUsageStats($user, $guestUuid);
                            return [
                                'allowed' => true,
                                'replay' => $existing->response_payload,
                                'remaining' => $stats['remaining'],
                            ];
                        }

                        if ($existing->status === 'pending'
                            && $existing->created_at?->greaterThan(now()->subMinutes(10))) {
                            return ['allowed' => false, 'reason' => 'request_in_progress'];
                        }

                        $wasPreviouslyCounted = $existing->status === 'success';
                        $stats = $this->getUsageStats($user, $guestUuid);
                        if (! $wasPreviouslyCounted && $stats['remaining'] <= 0) {
                            return [
                                'allowed' => false,
                                'reason' => 'ai_limit_reached',
                                'plan' => $stats['plan'],
                                'used' => $stats['used'],
                                'limit' => $stats['limit'],
                                'remaining' => 0,
                                'exhausted' => true,
                                'period' => $stats['period'],
                                'reset_at' => $stats['reset_at'],
                            ];
                        }

                        $existing->status = 'pending';
                        $existing->error_code = null;
                        $existing->completed_at = null;
                        $existing->duration_ms = null;
                        $existing->response_payload = null;
                        $existing->created_at = now();
                        $existing->save();
                        return [
                            'allowed' => true,
                            'log_id' => $existing->id,
                            'request_key' => $existing->request_key,
                            'plan' => $existing->plan,
                            'remaining' => max(0, $stats['remaining'] - ($wasPreviouslyCounted ? 0 : 1)),
                        ];
                    }
                }

                $stats = $this->getUsageStats($user, $guestUuid);

                if ($stats['remaining'] <= 0) {
                    return [
                        'allowed' => false,
                        'reason' => 'ai_limit_reached',
                        'plan' => $stats['plan'],
                        'used' => $stats['used'],
                        'limit' => $stats['limit'],
                        'remaining' => 0,
                        'exhausted' => true,
                        'period' => $stats['period'],
                        'reset_at' => $stats['reset_at'],
                    ];
                }

                $log = AiUsageLog::create([
                    'user_id' => $user?->id,
                    'guest_uuid' => $user ? null : $guestUuid,
                    'plan' => $stats['plan'],
                    'input_type' => $inputType,
                    'media_size_bytes' => $mediaSizeBytes,
                    'video_duration_seconds' => $videoDurationSec,
                    'status' => 'pending',
                    'request_key' => $requestKey,
                    'payload_hash' => $payloadHash,
                ]);

                return [
                    'allowed' => true,
                    'log_id' => $log->id,
                    'request_key' => $log->request_key,
                    'plan' => $stats['plan'],
                    'remaining' => $stats['remaining'] - 1,
                ];
                });
            } catch (\Illuminate\Database\QueryException $exception) {
                if ($requestKey === null || ! str_contains(strtolower($exception->getMessage()), 'request_key')) {
                    throw $exception;
                }

                $existing = AiUsageLog::where('request_key', $requestKey)->first();
                if (! $existing) {
                    throw $exception;
                }
                if (! hash_equals((string) $existing->payload_hash, (string) $payloadHash)) {
                    return ['allowed' => false, 'reason' => 'request_id_reused'];
                }
                if ($existing->status === 'success' && is_array($existing->response_payload)) {
                    return [
                        'allowed' => true,
                        'replay' => $existing->response_payload,
                        'remaining' => $this->getUsageStats($user, $guestUuid)['remaining'],
                    ];
                }

                return ['allowed' => false, 'reason' => 'request_in_progress'];
            }
        });
    }

    public function markAsSuccessful(int $logId, ?array $responsePayload = null): void
    {
        $log = AiUsageLog::findOrFail($logId);
        if ($log->status !== 'pending') {
            return;
        }

        $completedAt = Carbon::now();
        $log->update([
            'status' => 'success',
            'completed_at' => $completedAt,
            'duration_ms' => $log->created_at
                ? max(0, $log->created_at->diffInMilliseconds($completedAt))
                : null,
            'error_code' => null,
            'response_payload' => $responsePayload,
        ]);
    }

    /**
     * Mark usage log as failed if Gemini or server errored.
     */
    public function markAsFailed(int $logId, string $errorCode = 'AI_REQUEST_FAILED'): void
    {
        $log = AiUsageLog::findOrFail($logId);
        if ($log->status !== 'pending') {
            return;
        }

        $completedAt = Carbon::now();
        $log->update([
            'status' => 'failed',
            'error_code' => mb_substr($errorCode, 0, 100),
            'completed_at' => $completedAt,
            'duration_ms' => $log->created_at
                ? max(0, $log->created_at->diffInMilliseconds($completedAt))
                : null,
        ]);
    }
}
