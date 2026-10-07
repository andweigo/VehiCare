<?php

namespace App\Services;

use App\Models\AiUsageLog;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AIUsageService
{
    /**
     * Get consolidated AI usage statistics for a user or guest.
     */
    public function getUsageStats(?User $user, ?string $guestUuid = null): array
    {
        if ($user) {
            $plan = $user->subscription_plan === User::SUBSCRIPTION_PREMIUM ? 'premium' : 'free';
            $limitsConfig = config("services.ai_limits.{$plan}", [
                'limit' => $plan === 'premium' ? 100 : 10,
                'period' => 'monthly',
                'max_video_mb' => $plan === 'premium' ? 30 : 15,
                'max_video_sec' => $plan === 'premium' ? 60 : 30,
            ]);

            $startOfMonth = Carbon::now()->startOfMonth();

            $usedCount = AiUsageLog::where('user_id', $user->id)
                ->where('created_at', '>=', $startOfMonth)
                ->where('status', 'success')
                ->count();

            $limit = (int) $limitsConfig['limit'];
            $remaining = max(0, $limit - $usedCount);

            return [
                'authenticated' => true,
                'user_id' => $user->id,
                'plan' => $plan,
                'used' => $usedCount,
                'limit' => $limit,
                'remaining' => $remaining,
                'period' => 'monthly',
                'video' => [
                    'max_size_mb' => (int) ($limitsConfig['max_video_mb'] ?? 15),
                    'max_duration_seconds' => (int) ($limitsConfig['max_video_sec'] ?? 30),
                ],
                'media' => [
                    'max_image_mb' => (int) ($limitsConfig['max_image_mb'] ?? 10),
                    'max_video_mb' => (int) ($limitsConfig['max_video_mb'] ?? 15),
                    'max_video_sec' => (int) ($limitsConfig['max_video_sec'] ?? 30),
                    'max_audio_sec' => (int) ($limitsConfig['max_audio_sec'] ?? 60),
                ],
            ];
        }

        // Guest logic
        $limitsConfig = config('services.ai_limits.guest', [
            'limit' => 5,
            'period' => 'total',
            'max_image_mb' => 5,
            'max_video_mb' => 10,
            'max_video_sec' => 20,
            'max_audio_sec' => 30,
        ]);

        $usedCount = 0;
        if (!empty($guestUuid)) {
            $usedCount = AiUsageLog::where('guest_uuid', $guestUuid)
                ->where('status', 'success')
                ->count();
        }

        $limit = (int) $limitsConfig['limit'];
        $remaining = max(0, $limit - $usedCount);

        return [
            'authenticated' => false,
            'guest_uuid' => $guestUuid,
            'plan' => 'guest',
            'used' => $usedCount,
            'limit' => $limit,
            'remaining' => $remaining,
            'period' => 'guest',
            'video' => [
                'max_size_mb' => (int) ($limitsConfig['max_video_mb'] ?? 10),
                'max_duration_seconds' => (int) ($limitsConfig['max_video_sec'] ?? 20),
            ],
            'media' => [
                'max_image_mb' => (int) ($limitsConfig['max_image_mb'] ?? 5),
                'max_video_mb' => (int) ($limitsConfig['max_video_mb'] ?? 10),
                'max_video_sec' => (int) ($limitsConfig['max_video_sec'] ?? 20),
                'max_audio_sec' => (int) ($limitsConfig['max_audio_sec'] ?? 30),
            ],
        ];
    }

    /**
     * Atomically check and reserve AI consultation usage.
     * Throws an exception or returns false if limit reached.
     */
    public function evaluateAndReserve(?User $user, ?string $guestUuid, string $inputType, ?int $mediaSizeBytes = null, ?int $videoDurationSec = null): array
    {
        return DB::transaction(function () use ($user, $guestUuid, $inputType, $mediaSizeBytes, $videoDurationSec) {
            $stats = $this->getUsageStats($user, $guestUuid);

            if ($stats['remaining'] <= 0) {
                return [
                    'allowed' => false,
                    'reason' => 'ai_limit_reached',
                    'plan' => $stats['plan'],
                    'used' => $stats['used'],
                    'limit' => $stats['limit'],
                    'remaining' => 0,
                ];
            }

            // Create pending usage record
            $log = AiUsageLog::create([
                'user_id' => $user?->id,
                'guest_uuid' => $user ? null : $guestUuid,
                'plan' => $stats['plan'],
                'input_type' => $inputType,
                'media_size_bytes' => $mediaSizeBytes,
                'video_duration_seconds' => $videoDurationSec,
                'status' => 'success',
            ]);

            return [
                'allowed' => true,
                'log_id' => $log->id,
                'plan' => $stats['plan'],
                'remaining' => $stats['remaining'] - 1,
            ];
        });
    }

    /**
     * Mark usage log as failed if Gemini or server errored.
     */
    public function markAsFailed(int $logId): void
    {
        try {
            AiUsageLog::where('id', $logId)->update(['status' => 'failed']);
        } catch (\Throwable $e) {
            Log::warning('[AIUsageService] Failed to mark log as failed: ' . $e->getMessage());
        }
    }
}
