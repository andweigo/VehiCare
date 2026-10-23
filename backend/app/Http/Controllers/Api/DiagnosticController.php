<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Diagnostic;
use App\Models\Vehicle;
use App\Notifications\HighSeverityDiagnosticAlert;
use App\Services\AI\AIServiceClient;
use App\Services\AI\AIServiceException;
use App\Services\AIMediaValidationService;
use App\Services\AIUsageService;
use App\Services\GeminiService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use App\Services\AIDiagnosticCacheService;
use Illuminate\Support\Facades\Storage;

class DiagnosticController extends Controller
{
    protected AIServiceClient $aiServiceClient;
    protected GeminiService $geminiService;
    protected AIUsageService $usageService;
    protected AIMediaValidationService $mediaValidationService;
    protected AIDiagnosticCacheService $cacheService;
    protected \App\Services\EntitlementService $entitlementService;

    public function __construct(
        AIServiceClient $aiServiceClient,
        GeminiService $geminiService,
        AIUsageService $usageService,
        AIMediaValidationService $mediaValidationService,
        AIDiagnosticCacheService $cacheService,
        \App\Services\EntitlementService $entitlementService
    ) {
        $this->aiServiceClient = $aiServiceClient;
        $this->geminiService = $geminiService;
        $this->usageService = $usageService;
        $this->mediaValidationService = $mediaValidationService;
        $this->cacheService = $cacheService;
        $this->entitlementService = $entitlementService;
    }

    protected function toSafeString($value, string $default = ''): string
    {
        if (is_string($value)) {
            return $value;
        }
        if (is_numeric($value) || is_bool($value)) {
            return (string) $value;
        }
        if (is_array($value)) {
            if (isset($value['name']) && is_string($value['name'])) {
                return $value['name'];
            }
            if (isset($value['brand']) && is_string($value['brand'])) {
                return $value['brand'];
            }
            if (isset($value['model']) && is_string($value['model'])) {
                return $value['model'];
            }
            if (isset($value['type']) && is_string($value['type'])) {
                return $value['type'];
            }
            if (isset($value['reason']) && is_string($value['reason'])) {
                return $value['reason'];
            }
            if (isset($value['text']) && is_string($value['text'])) {
                return $value['text'];
            }
            $stringParts = array_filter($value, fn($v) => is_string($v) || is_numeric($v));
            if (!empty($stringParts)) {
                return implode(' ', $stringParts);
            }
            return json_encode($value);
        }
        return $default;
    }

    protected function ensurePendingMaintenanceRecords(
        \App\Models\User $user,
        Vehicle $vehicle,
        Diagnostic $diagnostic
    ): void {
        $createdTasks = [];
        foreach ($diagnostic->maintenance_tasks ?? [] as $task) {
            $taskTitle = is_string($task) ? $task : ($task['title'] ?? '');
            if (! is_string($taskTitle) || trim($taskTitle) === '') {
                continue;
            }

            $cleanTitle = trim($taskTitle);
            $subTitle = substr($cleanTitle, 0, 30);
            $alreadyPending = \App\Models\MaintenanceRecord::where('user_id', $user->id)
                ->where('vehicle_id', $vehicle->id)
                ->where('status', 'pending')
                ->where(function ($query) use ($cleanTitle, $subTitle) {
                    $query->where('title', $cleanTitle)
                        ->orWhere('title', 'like', '%' . $subTitle . '%');
                })
                ->exists();

            if ($alreadyPending) {
                continue;
            }

            // Exclude tasks already completed unless due again
            $alreadyCompleted = \App\Models\MaintenanceRecord::where('user_id', $user->id)
                ->where('vehicle_id', $vehicle->id)
                ->where('status', 'completed')
                ->where(function ($query) use ($cleanTitle, $subTitle) {
                    $query->where('title', $cleanTitle)
                        ->orWhere('title', 'like', '%' . $subTitle . '%');
                })
                ->where(function ($query) {
                    $query->whereNull('due_date')
                        ->orWhere('due_date', '>', now());
                })
                ->exists();

            if ($alreadyCompleted) {
                continue;
            }

            $urgency = is_array($task) ? ($task['urgency'] ?? 'Routine') : 'Routine';
            $dueDays = match (strtoupper((string) $urgency)) {
                'IMMEDIATE' => 1,
                'URGENT', 'HIGH' => 3,
                'MODERATE', 'MEDIUM' => 7,
                default => 14,
            };

            $desc = is_array($task) ? ($task['description'] ?? null) : null;
            if (is_array($task) && !empty($task['why_it_matters']) && empty($desc)) {
                $desc = $task['why_it_matters'];
            }

            $notes = null;
            if (is_array($task)) {
                $meta = array_filter([
                    'what_to_do' => $task['what_to_do'] ?? null,
                    'why_it_matters' => $task['why_it_matters'] ?? null,
                    'when_due' => $task['when_due'] ?? null,
                    'skill_level' => $task['skill_level'] ?? null,
                    'completion_check' => $task['completion_check'] ?? null,
                ]);
                if (!empty($meta)) {
                    $notes = json_encode($meta);
                }
            }

            \App\Models\MaintenanceRecord::create([
                'user_id' => $user->id,
                'vehicle_id' => $vehicle->id,
                'diagnostic_id' => $diagnostic->id,
                'title' => $cleanTitle,
                'description' => $desc,
                'service_type' => is_array($task) ? ($task['service_type'] ?? 'General Inspection') : 'General Inspection',
                'status' => 'pending',
                'is_inspection' => true,
                'urgency' => $urgency,
                'performed_at' => null,
                'due_date' => now()->addDays($dueDays),
                'cost' => 0,
                'notes' => $notes,
            ]);

            $createdTasks[] = $cleanTitle;
        }

        if (!empty($createdTasks)) {
            try {
                $primaryTask = $createdTasks[0];
                $user->notify(new \App\Notifications\MaintenanceRecommendationNotification($vehicle, $primaryTask, $diagnostic));
            } catch (\Throwable $e) {
                Log::warning('[DiagnosticController] Maintenance notification delivery failed: ' . $e->getMessage());
            }
        }
    }

    protected function sanitizeDiagnosticState(mixed $state): array
    {
        if (is_string($state)) {
            try {
                $state = json_decode($state, true, 16, JSON_THROW_ON_ERROR);
            } catch (\JsonException) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'diagnostic_state' => ['The diagnostic conversation state is invalid.'],
                ]);
            }
        }

        if (! is_array($state)) {
            return ['assessments' => []];
        }

        $sanitizeText = static function (mixed $value, int $limit): string {
            if (! is_string($value)) {
                return '';
            }
            $value = trim($value);
            return function_exists('mb_substr') ? mb_substr($value, 0, $limit) : substr($value, 0, $limit);
        };

        $assessments = [];
        $rawAssessments = is_array($state['assessments'] ?? null) ? $state['assessments'] : [];
        foreach (array_slice($rawAssessments, -3) as $assessment) {
            if (! is_array($assessment)) {
                continue;
            }
            $assessments[] = [
                'status' => ($assessment['status'] ?? null) === 'needs_clarification'
                    ? 'needs_clarification'
                    : 'diagnosis_ready',
                'summary' => $sanitizeText($assessment['summary'] ?? null, 500),
                'reported' => array_values(array_filter(array_map(
                    fn ($value) => $sanitizeText($value, 200),
                    array_slice(is_array($assessment['reported'] ?? null) ? $assessment['reported'] : [], 0, 5)
                ))),
                'observed' => array_values(array_filter(array_map(
                    fn ($value) => $sanitizeText($value, 200),
                    array_slice(is_array($assessment['observed'] ?? null) ? $assessment['observed'] : [], 0, 5)
                ))),
                'possible_causes' => array_values(array_filter(array_map(
                    fn ($cause) => $sanitizeText(is_array($cause) ? ($cause['cause'] ?? null) : $cause, 200),
                    array_slice(is_array($assessment['possible_causes'] ?? null) ? $assessment['possible_causes'] : [], 0, 5)
                ))),
                'clarification_questions' => array_values(array_filter(array_map(
                    fn ($question) => $sanitizeText(is_array($question) ? ($question['question'] ?? null) : $question, 300),
                    array_slice(is_array($assessment['clarification_questions'] ?? null) ? $assessment['clarification_questions'] : [], 0, 5)
                ))),
            ];
        }

        $sanitized = ['assessments' => $assessments];
        if (strlen(json_encode($sanitized, JSON_INVALID_UTF8_SUBSTITUTE)) > 12000) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'diagnostic_state' => ['The diagnostic conversation state is too large.'],
            ]);
        }

        return $sanitized;
    }

    /**
     * Store and process AI request (conversation vs diagnostic) with atomic limit checks and video support.
     */
    public function store(Request $request)
    {
        $user = Auth::guard('sanctum')->user() ?? Auth::user();
        $guestUuid = $request->header('X-Guest-UUID') ?: $request->input('guest_uuid');
        $isGeminiConfigured = !empty(config('services.gemini.api_key'));

        Log::info('[DiagnosticController] Incoming AI request', [
            'user_id' => $user?->id,
            'input_type' => $request->input('input_type', 'text'),
            'gemini_configured' => $isGeminiConfigured,
        ]);

        $usageStats = $this->usageService->getUsageStats($user, $guestUuid);
        $mediaLimits = $usageStats['media'];

        $validated = $request->validate([
            'vehicle_id' => 'nullable|integer|min:1',
            'request_id' => 'nullable|string|min:1|max:80',
            'symptoms' => 'required|string|max:2000',
            'root_symptom' => 'nullable|string|max:2000',
            'is_alternate_vehicle' => 'nullable',
            'input_type' => 'nullable|string|in:text,image,voice,video,audio',
            'image_base64' => ['nullable', 'string', 'max:' . ((int) $mediaLimits['max_image_mb'] * 1400)],
            'image_mime' => 'nullable|string|starts_with:image/',
            'image' => ['nullable', 'image', 'max:' . ((int) $mediaLimits['max_image_mb'] * 1024)],
            'video_base64' => ['nullable', 'string', 'max:' . ((int) $mediaLimits['max_video_mb'] * 1400)],
            'video_mime' => 'nullable|string',
            'video_duration' => ['nullable', 'numeric', 'min:0', 'max:' . (int) $usageStats['video']['max_duration_seconds']],
            'video' => ['nullable', 'file', 'mimes:mp4,mov,m4v,3gp', 'max:' . ((int) $mediaLimits['max_video_mb'] * 1024)],
            'audio_base64' => ['nullable', 'string', 'max:' . ((int) $mediaLimits['max_audio_mb'] * 1400)],
            'audio_mime' => 'nullable|string|starts_with:audio/',
            'audio_duration' => ['nullable', 'numeric', 'min:0', 'max:' . (int) $usageStats['media']['max_audio_sec']],
            'audio' => ['nullable', 'file', 'mimes:mp3,wav,m4a,aac,mp4,3gp,amr,ogg,oga', 'max:' . ((int) $mediaLimits['max_audio_mb'] * 1024)],
            'vehicle_name' => 'nullable',
            'vehicle_type' => 'nullable',
            'vehicle_brand' => 'nullable|string|max:120',
            'vehicle_model' => 'nullable|string|max:120',
            'vehicle_year' => 'nullable',
            'model_number' => 'nullable|string|max:120',
            'history' => 'nullable|array',
            'diagnostic_state' => 'nullable',
        ]);
        $diagnosticState = $this->sanitizeDiagnosticState($validated['diagnostic_state'] ?? []);

        $vehicle = null;
        $rawVehicleId = $request->input('vehicle_id');
        $vehicleId = (is_numeric($rawVehicleId) && (int) $rawVehicleId > 0) ? (int) $rawVehicleId : null;
        $isExplicitAlternateVehicle = $request->boolean('is_alternate_vehicle') || ($request->has('vehicle_id') && is_null($rawVehicleId));
        $entitlements = $this->entitlementService->getEntitlements($user);
        if ($user) {
            $vehicleQuery = $user->vehicles()
                ->whereNull('archived_at')
                ->with(['vehicleType', 'vehicleBrand', 'vehicleModel', 'vehicleYear']);
            $freeEligibleVehicleId = $user->active_vehicle_id;
            if ($entitlements['plan'] === 'free' && ! $freeEligibleVehicleId) {
                $activeVehicleIds = (clone $vehicleQuery)->reorder()->limit(2)->pluck('id');
                if ($activeVehicleIds->count() === 1) {
                    $freeEligibleVehicleId = (int) $activeVehicleIds->first();
                }
            }

            if ($vehicleId) {
                $vehicle = (clone $vehicleQuery)->findOrFail($vehicleId);
                if ($entitlements['plan'] === 'free'
                    && (int) $freeEligibleVehicleId !== (int) $vehicle->id) {
                    return response()->json([
                        'status' => 'error',
                        'reason' => 'vehicle_not_eligible',
                        'message' => 'Select your eligible active vehicle before requesting a diagnosis.',
                    ], 403);
                }
            } elseif (! $isExplicitAlternateVehicle && $user->active_vehicle_id) {
                // Only default to user active vehicle when vehicle_id was not explicitly omitted or designated alternate
                $vehicle = (clone $vehicleQuery)->find($user->active_vehicle_id);
            }
        }

        $inputType = $validated['input_type'] ?? 'text';
        $attachedMediaTypes = array_filter([
            ($request->hasFile('video') || !empty($validated['video_base64'])) ? 'video' : null,
            ($request->hasFile('image') || !empty($validated['image_base64'])) ? 'image' : null,
            ($request->hasFile('audio') || !empty($validated['audio_base64'])) ? 'audio' : null,
        ]);
        if (count($attachedMediaTypes) > 1) {
            return response()->json([
                'status' => 'error',
                'reason' => 'conflicting_media_inputs',
                'message' => 'Submit one media type per diagnostic request.',
            ], 422);
        }

        $mediaBase64 = null;
        $mediaMime = 'image/jpeg';
        $mediaSizeBytes = null;
        $videoDurationSec = null;
        $tempStoredPath = null;

        // Process uploaded media files and legacy Base64 clients.
        if ($request->hasFile('video')) {
            $inputType = 'video';
            $file = $request->file('video');
            $mediaMime = $file->getMimeType() ?: 'video/mp4';
            $mediaSizeBytes = $file->getSize();
            $videoDurationSec = (int) ($validated['video_duration'] ?? 0);

            $validation = $this->mediaValidationService->validateVideo(
                $mediaMime,
                $mediaSizeBytes,
                $videoDurationSec,
                $usageStats['video']
            );

            if (!$validation['valid']) {
                return response()->json([
                    'status' => 'error',
                    'reason' => $validation['error'],
                    'message' => $validation['message'],
                ], 422);
            }

            $tempStoredPath = $file->store('diagnostics_temp', 'public');
            $mediaBase64 = base64_encode(file_get_contents($file->getRealPath()));
        } elseif (!empty($validated['video_base64'])) {
            $inputType = 'video';
            $mediaMime = strtolower(trim((string) ($validated['video_mime'] ?? 'video/mp4')));
            $cleanBase64 = preg_replace('/^data:video\/[a-zA-Z0-9.+-]+;base64,/i', '', trim($validated['video_base64']));
            $mediaBase64 = $cleanBase64;
            $mediaSizeBytes = (int) (strlen($cleanBase64) * 0.75);
            $videoDurationSec = (int) ($validated['video_duration'] ?? 0);

            $validation = $this->mediaValidationService->validateVideo(
                $mediaMime,
                $mediaSizeBytes,
                $videoDurationSec,
                $usageStats['video']
            );

            if (!$validation['valid']) {
                return response()->json([
                    'status' => 'error',
                    'reason' => $validation['error'],
                    'message' => $validation['message'],
                ], 422);
            }
        } elseif ($request->hasFile('image')) {
            $inputType = 'image';
            $file = $request->file('image');
            $mediaSizeBytes = $file->getSize();

            $validation = $this->mediaValidationService->validateImage($mediaSizeBytes, $usageStats['media'] ?? []);
            if (!$validation['valid']) {
                return response()->json([
                    'status' => 'error',
                    'reason' => $validation['error'],
                    'message' => $validation['message'],
                ], 422);
            }

            $path = $file->store('diagnostics', 'public');
            $tempStoredPath = $path;
            $mediaBase64 = base64_encode(file_get_contents($file->getRealPath()));
            $mediaMime = $file->getMimeType();
        } elseif (!empty($validated['image_base64'])) {
            $inputType = 'image';
            $cleanBase64 = preg_replace('/^data:image\/[a-zA-Z0-9.+-]+;base64,/i', '', trim($validated['image_base64']));
            $mediaBase64 = $cleanBase64;
            $mediaMime = $validated['image_mime'] ?? 'image/jpeg';
            $mediaSizeBytes = (int) (strlen($cleanBase64) * 0.75);

            $validation = $this->mediaValidationService->validateImage($mediaSizeBytes, $usageStats['media'] ?? []);
            if (!$validation['valid']) {
                return response()->json([
                    'status' => 'error',
                    'reason' => $validation['error'],
                    'message' => $validation['message'],
                ], 422);
            }
        } elseif ($request->hasFile('audio')) {
            $inputType = 'voice';
            $file = $request->file('audio');
            $detectedMime = $file->getMimeType();
            $clientMime = $file->getClientMimeType();
            $mediaMime = is_string($detectedMime) && str_starts_with($detectedMime, 'audio/')
                ? $detectedMime
                : (is_string($clientMime) && str_starts_with($clientMime, 'audio/')
                    ? $clientMime
                    : ($validated['audio_mime'] ?? 'audio/mp4'));
            $mediaSizeBytes = $file->getSize();
            $audioDurationSec = (int) ($validated['audio_duration'] ?? 0);

            $validation = $this->mediaValidationService->validateAudio($mediaSizeBytes, $audioDurationSec, $usageStats['media'] ?? []);
            if (!$validation['valid']) {
                return response()->json([
                    'status' => 'error',
                    'reason' => $validation['error'],
                    'message' => $validation['message'],
                ], 422);
            }

            $mediaBase64 = base64_encode(file_get_contents($file->getRealPath()));
        } elseif (!empty($validated['audio_base64'])) {
            $inputType = 'voice';
            $cleanBase64 = preg_replace('/^data:audio\/[a-zA-Z0-9.+-]+;base64,/i', '', trim($validated['audio_base64']));
            $mediaBase64 = $cleanBase64;
            $mediaMime = $validated['audio_mime'] ?? 'audio/mp4';
            $mediaSizeBytes = (int) (strlen($cleanBase64) * 0.75);
            $audioDurationSec = (int) ($validated['audio_duration'] ?? 0);

            $validation = $this->mediaValidationService->validateAudio($mediaSizeBytes, $audioDurationSec, $usageStats['media'] ?? []);
            if (!$validation['valid']) {
                return response()->json([
                    'status' => 'error',
                    'reason' => $validation['error'],
                    'message' => $validation['message'],
                ], 422);
            }
        }

        $requestId = $validated['request_id'] ?? (string) \Illuminate\Support\Str::uuid();
        $payloadHash = hash('sha256', serialize([
            'vehicle_id' => $vehicle?->id,
            'vehicle_name' => $vehicle ? null : $request->input('vehicle_name'),
            'vehicle_type' => $vehicle ? null : $request->input('vehicle_type'),
            'symptoms' => $validated['symptoms'],
            'input_type' => $inputType,
            'media_sha256' => $mediaBase64 ? hash('sha256', $mediaBase64) : null,
            'media_mime' => $mediaMime,
            'video_duration' => $validated['video_duration'] ?? null,
            'audio_duration' => $validated['audio_duration'] ?? null,
            'history' => $validated['history'] ?? [],
            'diagnostic_state' => $diagnosticState,
            'language' => $request->header('X-User-Language', 'en'),
        ]));

        // 2. ATOMIC USAGE EVALUATION & RESERVATION
        $reservation = $this->usageService->evaluateAndReserve(
            $user,
            $guestUuid,
            $inputType,
            $mediaSizeBytes,
            $videoDurationSec,
            $requestId,
            $payloadHash
        );

        if (($reservation['reason'] ?? null) === 'request_id_reused') {
            if ($tempStoredPath && Storage::disk('public')->exists($tempStoredPath)) {
                Storage::disk('public')->delete($tempStoredPath);
            }
            return response()->json([
                'status' => 'error',
                'reason' => 'request_id_reused',
                'message' => 'This request identifier was already used for a different diagnostic request.',
            ], 409);
        }

        if (($reservation['reason'] ?? null) === 'request_in_progress') {
            if ($tempStoredPath && Storage::disk('public')->exists($tempStoredPath)) {
                Storage::disk('public')->delete($tempStoredPath);
            }
            return response()->json([
                'status' => 'error',
                'reason' => 'request_in_progress',
                'message' => 'This diagnostic request is still processing. Please retry shortly using the same request.',
            ], 409);
        }

        if (isset($reservation['replay'])) {
            if ($tempStoredPath && Storage::disk('public')->exists($tempStoredPath)) {
                Storage::disk('public')->delete($tempStoredPath);
            }
            return response()->json([
                'status' => 'success',
                'data' => $reservation['replay'],
            ], 200);
        }

        if (!$reservation['allowed']) {
            // Clean up temp stored file if limit reached
            if ($tempStoredPath && Storage::disk('public')->exists($tempStoredPath)) {
                Storage::disk('public')->delete($tempStoredPath);
            }

            return response()->json([
                'status' => 'error',
                'allowed' => false,
                'reason' => 'ai_limit_reached',
                'plan' => $reservation['plan'],
                'used' => $reservation['used'],
                'limit' => $reservation['limit'],
                'remaining' => 0,
                'exhausted' => true,
                'period' => $reservation['period'] ?? ($user ? 'monthly' : 'total'),
                'reset_at' => $reservation['reset_at'] ?? null,
                'message' => $user
                    ? 'You have reached your AI consultation limit for this period.'
                    : 'You have used all 5 guest AI consultations.',
            ], 403);
        }

        $logId = $reservation['log_id'];

        $existingDiagnostic = Diagnostic::where('request_key', $reservation['request_key'])
            ->with(['vehicle.vehicleType', 'vehicle.vehicleBrand', 'vehicle.vehicleModel', 'vehicle.vehicleYear'])
            ->first();
        if ($existingDiagnostic) {
            if ($tempStoredPath && Storage::disk('public')->exists($tempStoredPath)) {
                Storage::disk('public')->delete($tempStoredPath);
            }
            $recoveredVehicle = $existingDiagnostic->vehicle;
            if ($user && $recoveredVehicle) {
                $this->ensurePendingMaintenanceRecords($user, $recoveredVehicle, $existingDiagnostic);
            }
            $responseData = [
                'type' => 'diagnostic',
                'id' => $existingDiagnostic->id,
                'plan_tier' => $existingDiagnostic->plan_tier,
                'entitlements' => $entitlements,
                'status' => 'diagnosis_ready',
                'vehicle' => $recoveredVehicle ? [
                    'id' => $recoveredVehicle->id,
                    'name' => trim(($recoveredVehicle->custom_brand ?: $recoveredVehicle->vehicleBrand?->name ?: '') . ' ' . ($recoveredVehicle->custom_model ?: $recoveredVehicle->vehicleModel?->name ?: '')),
                    'type' => $recoveredVehicle->vehicleType?->name,
                    'year' => $recoveredVehicle->custom_year ?: $recoveredVehicle->vehicleYear?->year,
                ] : null,
                'symptoms' => $existingDiagnostic->symptoms,
                'input_type' => $existingDiagnostic->input_type,
                'summary' => $existingDiagnostic->summary,
                'confidence' => $existingDiagnostic->confidence,
                'severity' => $existingDiagnostic->severity,
                'urgency' => $existingDiagnostic->urgency,
                'possible_causes' => $existingDiagnostic->possible_causes,
                'recommended_actions' => $existingDiagnostic->recommended_actions,
                'maintenance_tasks' => $existingDiagnostic->maintenance_tasks,
                'smart_recommendations' => $existingDiagnostic->smart_recommendations,
                'repair_guidance' => $existingDiagnostic->repair_guidance,
                'cost_breakdown' => $existingDiagnostic->cost_breakdown,
                'history_insights' => $existingDiagnostic->history_insights,
                'clarification_questions' => $existingDiagnostic->clarification_questions,
                'estimated_cost' => [
                    'min' => $existingDiagnostic->estimated_cost_min,
                    'max' => $existingDiagnostic->estimated_cost_max,
                    'currency' => $existingDiagnostic->currency,
                ],
                'professional_help' => [
                    'recommended' => $existingDiagnostic->professional_help_recommended,
                    'reason' => $existingDiagnostic->professional_help_reason,
                    'priority' => $existingDiagnostic->professional_help_priority,
                    'severity' => $existingDiagnostic->professional_help_priority,
                ],
                'ai_source' => 'recovered',
                'media_fallback' => false,
                'media_notice' => null,
                'remaining_consultations' => $reservation['remaining'],
                'created_at' => $existingDiagnostic->created_at->toIso8601String(),
            ];
            $this->usageService->markAsSuccessful($logId, $responseData);
            return response()->json(['status' => 'success', 'data' => $responseData], 200);
        }

        $rootSymptom = $validated['root_symptom'] ?? null;
        if (!empty($rootSymptom) && preg_match('/^(hello|hi|hey|good morning|good afternoon|good evening|kumusta|how can i fix|how to fix|what can i do)/i', trim($rootSymptom))) {
            $rootSymptom = null;
        }

        if (empty($rootSymptom) && !empty($validated['history'])) {
            foreach ($validated['history'] as $turn) {
                if (($turn['role'] ?? null) === 'user' && !empty($turn['content'])) {
                    $content = trim($turn['content']);
                    if (!preg_match('/^(hello|hi|hey|good morning|good afternoon|good evening|kumusta|how can i fix|how to fix|what can i do|^[a-d][.)]\s)/i', $content) && strlen($content) >= 5) {
                        $rootSymptom = $content;
                        break;
                    }
                }
            }
        }
        $rootSymptom = $rootSymptom ?: $validated['symptoms'];

        $reqBrand = $this->toSafeString($request->input('vehicle_brand'), '');
        $reqModel = $this->toSafeString($request->input('vehicle_model'), '');
        $reqYear = $this->toSafeString($request->input('vehicle_year'), '');
        $reqModelNumber = $this->toSafeString($request->input('model_number'), '');
        $reqVehicleName = $this->toSafeString($request->input('vehicle_name'), '');

        if (!$isExplicitAlternateVehicle && $vehicle === null && $reqBrand === '' && $reqVehicleName !== '' && strtolower($reqVehicleName) !== 'active vehicle') {
            $nameTokens = preg_split('/\s+/', trim($reqVehicleName)) ?: [];
            if (!empty($nameTokens) && preg_match('/^(19|20)\d{2}$/', $nameTokens[0])) {
                if ($reqYear === '') {
                    $reqYear = array_shift($nameTokens);
                } else {
                    array_shift($nameTokens);
                }
            }
            if (!empty($nameTokens)) {
                $reqBrand = array_shift($nameTokens);
            }
            if (!empty($nameTokens) && $reqModel === '') {
                $reqModel = implode(' ', $nameTokens);
            }
        }

        $resolvedBrand = $this->toSafeString(
            $vehicle?->custom_brand ?: ($vehicle?->vehicleBrand?->name ?: ($reqBrand ?: $reqVehicleName)),
            'Unknown'
        );
        $resolvedModel = $this->toSafeString(
            $vehicle?->custom_model ?: ($vehicle?->vehicleModel?->name ?: $reqModel),
            'Unknown'
        );
        $resolvedYear = $this->toSafeString(
            $vehicle?->custom_year ?: ($vehicle?->vehicleYear?->year ?: $reqYear),
            'Unknown'
        );
        $resolvedModelNumber = $this->toSafeString(
            $vehicle?->model_number ?: $reqModelNumber,
            ''
        );
        $hasSelectedVehicleContext = !$isExplicitAlternateVehicle && (
            $vehicle !== null
            || $reqBrand !== ''
            || $reqModel !== ''
            || ($reqVehicleName !== '' && strtolower($reqVehicleName) !== 'active vehicle')
        );

        $vehicleInfo = [
            'type' => $this->toSafeString($vehicle?->vehicleType?->name ?? $request->input('vehicle_type'), 'Vehicle'),
            'brand' => $resolvedBrand,
            'model' => $resolvedModel,
            'year' => $resolvedYear,
            'model_number' => $resolvedModelNumber,
            'preferred_language' => $request->header('X-User-Language', 'en'),
            'is_saved_vehicle' => $hasSelectedVehicleContext,
            'target_vehicle_desc' => !$hasSelectedVehicleContext ? ($reqVehicleName ?: $request->input('vehicle_type')) : null,
            'root_symptom' => $rootSymptom,
        ];

        Log::info('[DiagnosticController] AI request prepared', [
            'input_type' => $inputType,
            'user_id' => $user?->id,
            'has_vehicle' => $vehicle !== null,
            'is_saved_vehicle' => $vehicle !== null,
            'history_turns' => count($validated['history'] ?? []),
        ]);

        // Resolve entitlements and authorized historical context
        $historicalContext = $vehicle ? $this->entitlementService->getAuthorizedHistoricalContext($user, $vehicle) : [];

        try {
            $analysis = null;
            $aiSource = 'gemini';

            // Fast local database cache lookup for text diagnoses (instant response, zero external API failure risk)
            if ($inputType === 'text' && empty($mediaBase64) && empty($validated['history'])) {
                $cached = $this->cacheService->find($vehicleInfo, $validated['symptoms']);
                if ($cached !== null) {
                    $analysis = $cached;
                    $aiSource = 'cache';
                }
            }

            if ($analysis === null) {
                try {
                    $analysis = $this->aiServiceClient->analyzeSymptoms(
                        $vehicleInfo,
                        $validated['symptoms'],
                        $mediaBase64,
                        $mediaMime,
                        $inputType,
                        $validated['history'] ?? [],
                        $requestId,
                        $user?->id,
                        $entitlements,
                        $historicalContext,
                        $diagnosticState,
                        $rootSymptom
                    );
                    $aiSource = $analysis['ai_source'] ?? 'gemini';
                } catch (AIServiceException $microserviceException) {
                    if ($isGeminiConfigured) {
                        Log::warning('[DiagnosticController] Node.js AI service unavailable, attempting Gemini direct fallback', [
                            'request_id' => $requestId,
                            'reason' => $microserviceException->errorCode,
                            'message' => $microserviceException->getMessage(),
                        ]);

                        $analysis = $this->geminiService->analyzeSymptoms(
                            $vehicleInfo,
                            $validated['symptoms'],
                            $mediaBase64,
                            $mediaMime,
                            $validated['history'] ?? []
                        );
                        $aiSource = 'gemini_direct_fallback';
                    } else {
                        throw $microserviceException;
                    }
                }
            }

            if (($analysis['status'] ?? null) === 'temporarily_busy') {
                throw new AIServiceException(
                    'AI_SERVICE_BUSY',
                    'VehiCare AI is currently handling several requests. Please try again shortly.',
                    true,
                    503
                );
            }

            // Check for Vehicle Mismatch
            $isMismatch = ($analysis['type'] ?? '') === 'vehicle_mismatch'
                || ($analysis['status'] ?? '') === 'vehicle_mismatch'
                || ($analysis['image_vehicle_match'] ?? '') === 'possible_mismatch'
                || ($analysis['vehicle_context_status'] ?? '') === 'mismatch';

            if ($isMismatch) {
                $responseData = [
                    ...$analysis,
                    'type' => 'vehicle_mismatch',
                    'status' => 'vehicle_mismatch',
                    'image_vehicle_match' => 'possible_mismatch',
                    'vehicle_context_status' => 'mismatch',
                    'maintenance_tasks' => [],
                    'smart_recommendations' => [],
                    'possible_causes' => [],
                    'repair_guidance' => null,
                    'cost_breakdown' => null,
                    'estimated_cost' => null,
                    'plan_tier' => $entitlements['plan'],
                    'entitlements' => $entitlements,
                    'ai_source' => $aiSource,
                    'remaining_consultations' => $reservation['remaining'],
                ];
                $this->usageService->markAsSuccessful($logId, $responseData);
                return response()->json(['status' => 'success', 'data' => $responseData], 200);
            }

            // Check for Vehicle Switch Confirmation Required
            $isSwitchRequired = ($analysis['type'] ?? '') === 'vehicle_switch_confirmation_required'
                || ($analysis['status'] ?? '') === 'vehicle_switch_confirmation_required'
                || ($analysis['vehicle_context_status'] ?? '') === 'different_vehicle_mentioned';

            if ($isSwitchRequired) {
                $responseData = [
                    ...$analysis,
                    'type' => 'vehicle_switch_confirmation_required',
                    'status' => 'vehicle_switch_confirmation_required',
                    'vehicle_context_status' => 'different_vehicle_mentioned',
                    'maintenance_tasks' => [],
                    'smart_recommendations' => [],
                    'possible_causes' => [],
                    'repair_guidance' => null,
                    'cost_breakdown' => null,
                    'estimated_cost' => null,
                    'plan_tier' => $entitlements['plan'],
                    'entitlements' => $entitlements,
                    'ai_source' => $aiSource,
                    'remaining_consultations' => $reservation['remaining'],
                ];
                $this->usageService->markAsSuccessful($logId, $responseData);
                return response()->json(['status' => 'success', 'data' => $responseData], 200);
            }

            $intentType = strtolower($analysis['type'] ?? 'conversation');

            // Conversation Intent
            if ($intentType !== 'diagnostic') {
                $responseData = [
                        'type' => 'conversation',
                        'status' => 'conversation',
                        'response' => $analysis['response'] ?? 'I am here to assist with your vehicle.',
                        'plan_tier' => $entitlements['plan'],
                        'entitlements' => $entitlements,
                        'ai_source' => $aiSource,
                        'media_fallback' => (bool) ($analysis['media_fallback'] ?? false),
                        'media_notice' => $analysis['media_notice'] ?? null,
                        'remaining_consultations' => $reservation['remaining'],
                    ];
                $this->usageService->markAsSuccessful($logId, $responseData);
                return response()->json(['status' => 'success', 'data' => $responseData], 200);
            }

            if (($analysis['status'] ?? null) === 'needs_clarification') {
                $responseData = [
                        ...$analysis,
                        'type' => 'diagnostic',
                        'plan_tier' => $entitlements['plan'],
                        'entitlements' => $entitlements,
                        'remaining_consultations' => $reservation['remaining'],
                    ];
                $this->usageService->markAsSuccessful($logId, $responseData);
                return response()->json(['status' => 'success', 'data' => $responseData], 200);
            }

            if (($analysis['status'] ?? null) !== 'diagnosis_ready') {
                throw new AIServiceException(
                    'INVALID_AI_RESPONSE',
                    'The AI response could not be validated. Please retry the request.',
                    false,
                    502
                );
            }

            // Diagnostic Intent
            $costBreakdown = is_array($analysis['cost_breakdown'] ?? null) ? $analysis['cost_breakdown'] : null;
            $hasItemizedCost = isset($costBreakdown['parts']['min'], $costBreakdown['parts']['max'])
                && isset($costBreakdown['labor']['min'], $costBreakdown['labor']['max']);
            $estCostMin = $hasItemizedCost
                ? (float) $costBreakdown['parts']['min'] + (float) $costBreakdown['labor']['min']
                : (float) ($analysis['estimated_cost']['min'] ?? 0);
            $estCostMax = $hasItemizedCost
                ? (float) $costBreakdown['parts']['max'] + (float) $costBreakdown['labor']['max']
                : (float) ($analysis['estimated_cost']['max'] ?? 0);
            $currencyStr = $this->toSafeString($analysis['estimated_cost']['currency'] ?? 'PHP', 'PHP');
            $proHelpRec = (bool) ($analysis['professional_help']['recommended'] ?? false);
            $proHelpReason = $this->toSafeString($analysis['professional_help']['reason'] ?? '', '');
            $proHelpPriority = $this->toSafeString($analysis['professional_help']['priority'] ?? $analysis['professional_help']['severity'] ?? $analysis['severity'] ?? 'MODERATE', 'MODERATE');

            $rawConfidence = $analysis['confidence'] ?? null;
            if (is_array($rawConfidence) && is_numeric($rawConfidence['score'] ?? null)) {
                $numericConfidence = max(0, min(100, (int) round((float) $rawConfidence['score'])));
            } else {
                $confidenceLevel = strtoupper($this->toSafeString(
                    is_array($rawConfidence) ? ($rawConfidence['level'] ?? null) : $rawConfidence,
                    'INSUFFICIENT'
                ));
                $numericConfidence = match ($confidenceLevel) {
                    'VERY_HIGH' => 95,
                    'HIGH' => 85,
                    'MEDIUM', 'MODERATE' => 65,
                    'LOW' => 40,
                    default => is_numeric($rawConfidence) ? max(0, min(100, (int) $rawConfidence)) : 15,
                };
            }

            $diagnostic = Diagnostic::create([
                'request_key' => $reservation['request_key'],
                'user_id' => $user?->id,
                'vehicle_id' => $vehicle?->id,
                'plan_tier' => $entitlements['plan'],
                'input_type' => $inputType,
                'symptoms' => $this->toSafeString($validated['symptoms']),
                'image_path' => ($inputType === 'image' && $tempStoredPath) ? Storage::url($tempStoredPath) : null,
                'summary' => $this->toSafeString($analysis['summary'] ?? 'Diagnostic evaluation complete.', 'Diagnostic evaluation complete.'),
                'confidence' => $numericConfidence,
                'severity' => $this->toSafeString($analysis['severity'] ?? 'MODERATE', 'MODERATE'),
                'urgency' => $this->toSafeString($analysis['urgency'] ?? 'Inspection recommended.', 'Inspection recommended.'),
                'possible_causes' => is_array($analysis['possible_causes'] ?? null) ? $analysis['possible_causes'] : [],
                'recommended_actions' => is_array($analysis['recommended_actions'] ?? null) ? $analysis['recommended_actions'] : [],
                'maintenance_tasks' => is_array($analysis['maintenance_tasks'] ?? null) ? $analysis['maintenance_tasks'] : [],
                'smart_recommendations' => is_array($analysis['smart_recommendations'] ?? null) ? $analysis['smart_recommendations'] : [],
                'repair_guidance' => is_array($analysis['repair_guidance'] ?? null) ? $analysis['repair_guidance'] : null,
                'cost_breakdown' => $costBreakdown,
                'history_insights' => !empty($analysis['history_insights']) ? $this->toSafeString($analysis['history_insights']) : null,
                'clarification_questions' => is_array($analysis['clarification_questions'] ?? null) ? $analysis['clarification_questions'] : [],
                'estimated_cost_min' => $estCostMin,
                'estimated_cost_max' => $estCostMax,
                'currency' => $currencyStr,
                'professional_help_recommended' => $proHelpRec,
                'professional_help_reason' => $proHelpReason,
                'professional_help_priority' => $proHelpPriority,
            ]);

            // Automatically register pending inspection tasks for the vehicle without duplicating
            if ($user && $vehicle && !empty($diagnostic->maintenance_tasks)) {
                $this->ensurePendingMaintenanceRecords($user, $vehicle, $diagnostic);
            }

            if ($user && in_array($diagnostic->severity, ['HIGH', 'CRITICAL'])) {
                try {
                    $user->notify(new HighSeverityDiagnosticAlert($diagnostic));
                } catch (\Throwable $e) {
                    Log::warning('[DiagnosticController] Notification delivery failed.', [
                        'exception' => get_class($e),
                    ]);
                }
            }

            // Store successful text diagnosis in database cache for instant future retrieval
            if ($aiSource !== 'cache' && $inputType === 'text' && empty($mediaBase64) && empty($validated['history']) && ($analysis['status'] ?? null) === 'diagnosis_ready') {
                $this->cacheService->store($vehicleInfo, $validated['symptoms'], $analysis);
            }

            Log::info('[DiagnosticController] Diagnostic response generated successfully', [
                'id' => $diagnostic->id,
                'plan_tier' => $diagnostic->plan_tier,
                'severity' => $diagnostic->severity,
                'status' => $analysis['status'] ?? 'diagnosis_ready',
                'ai_source' => $aiSource,
            ]);

            $responseData = [
                    'type' => 'diagnostic',
                    'id' => $diagnostic->id,
                    'plan_tier' => $diagnostic->plan_tier,
                    'entitlements' => $entitlements,
                    'status' => $analysis['status'] ?? 'diagnosis_ready',
                    'vehicle' => $vehicle ? [
                        'id' => $vehicle->id,
                        'name' => $vehicleInfo['brand'] . ' ' . $vehicleInfo['model'],
                        'type' => $vehicleInfo['type'],
                        'year' => $vehicleInfo['year'],
                        'is_saved_vehicle' => true,
                    ] : [
                        'id' => null,
                        'name' => trim(($vehicleInfo['brand'] ?? '') . ' ' . ($vehicleInfo['model'] ?? '')) ?: ($vehicleInfo['type'] ?? 'Alternate Vehicle'),
                        'type' => $vehicleInfo['type'] ?? 'car',
                        'year' => $vehicleInfo['year'] ?? null,
                        'is_saved_vehicle' => false,
                    ],
                    'image_vehicle_match' => $analysis['image_vehicle_match'] ?? 'not_applicable',
                    'image_vehicle_details' => $analysis['image_vehicle_details'] ?? null,
                    'symptoms' => $diagnostic->symptoms,
                    'input_type' => $diagnostic->input_type,
                    'summary' => $diagnostic->summary,
                    'confidence' => $analysis['confidence'] ?? $diagnostic->confidence,
                    'severity' => $diagnostic->severity,
                    'urgency' => $diagnostic->urgency,
                    'possible_causes' => $diagnostic->possible_causes,
                    'recommended_actions' => $diagnostic->recommended_actions,
                    'maintenance_tasks' => $diagnostic->maintenance_tasks,
                    'smart_recommendations' => $diagnostic->smart_recommendations,
                    'repair_guidance' => $diagnostic->repair_guidance,
                    'cost_breakdown' => $diagnostic->cost_breakdown,
                    'history_insights' => $diagnostic->history_insights,
                    'clarification_questions' => $diagnostic->clarification_questions ?: ($analysis['clarification_questions'] ?? []),
                    'estimated_cost' => [
                        'min' => $diagnostic->estimated_cost_min,
                        'max' => $diagnostic->estimated_cost_max,
                        'currency' => $diagnostic->currency,
                    ],
                    'professional_help' => [
                        'recommended' => $diagnostic->professional_help_recommended,
                        'reason' => $diagnostic->professional_help_reason,
                        'priority' => $diagnostic->professional_help_priority,
                        'severity' => $diagnostic->professional_help_priority,
                    ],
                    'ai_source' => $aiSource,
                    'media_fallback' => (bool) ($analysis['media_fallback'] ?? false),
                    'media_notice' => $analysis['media_notice'] ?? null,
                    'remaining_consultations' => $reservation['remaining'],
                    'created_at' => $diagnostic->created_at->toIso8601String(),
                ];
            $this->usageService->markAsSuccessful($logId, $responseData);
            return response()->json(['status' => 'success', 'data' => $responseData], 200);
        } catch (\Throwable $e) {
            Log::error('[DiagnosticController] Exception during AI processing', [
                'exception' => get_class($e),
            ]);

            $isAiServiceError = $e instanceof AIServiceException;
            $errorCode = $isAiServiceError ? $e->errorCode : 'AI_SERVICE_UNAVAILABLE';
            $this->usageService->markAsFailed($logId, $errorCode);
            $message = $isAiServiceError
                ? $e->getMessage()
                : 'VehiCare AI is temporarily unavailable. Please try again.';
            $retryable = $isAiServiceError ? $e->retryable : true;

            return response()->json([
                'success' => false,
                'status' => 'error',
                'reason' => $errorCode,
                'message' => $message,
                'error' => [
                    'code' => $errorCode,
                    'message' => $message,
                    'retryable' => $retryable,
                    'details' => $isAiServiceError ? $e->details : null,
                ],
            ], $isAiServiceError ? $e->httpStatus : 503);
        } finally {
            // Delete temp video file if uploaded
            if ($inputType === 'video' && $tempStoredPath && Storage::disk('public')->exists($tempStoredPath)) {
                Storage::disk('public')->delete($tempStoredPath);
            }
        }
    }

    public function index()
    {
        $user = Auth::user();

        $diagnostics = Diagnostic::where('user_id', $user->id)
            ->with(['vehicle.vehicleType', 'vehicle.vehicleBrand', 'vehicle.vehicleModel', 'vehicle.vehicleYear'])
            ->latest()
            ->paginate(15);

        return response()->json([
            'status' => 'success',
            'data' => $diagnostics
        ]);
    }

    public function show($id)
    {
        $diagnostic = Diagnostic::where('user_id', Auth::id())
            ->with(['vehicle.vehicleType', 'vehicle.vehicleBrand', 'vehicle.vehicleModel', 'vehicle.vehicleYear'])
            ->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => $diagnostic
        ]);
    }
}
