<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Diagnostic;
use App\Models\Vehicle;
use App\Notifications\HighSeverityDiagnosticAlert;
use App\Services\AI\AIServiceClient;
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

    public function __construct(
        AIServiceClient $aiServiceClient,
        GeminiService $geminiService,
        AIUsageService $usageService,
        AIMediaValidationService $mediaValidationService,
        AIDiagnosticCacheService $cacheService
    ) {
        $this->aiServiceClient = $aiServiceClient;
        $this->geminiService = $geminiService;
        $this->usageService = $usageService;
        $this->mediaValidationService = $mediaValidationService;
        $this->cacheService = $cacheService;
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
            'guest_uuid' => $guestUuid,
            'input_type' => $request->input('input_type', 'text'),
            'symptoms' => $request->input('symptoms'),
            'gemini_configured' => $isGeminiConfigured,
        ]);

        $validated = $request->validate([
            'vehicle_id' => 'nullable',
            'symptoms' => 'required|string|max:2000',
            'input_type' => 'nullable|string|in:text,image,voice,video,audio',
            'image_base64' => 'nullable|string',
            'image' => 'nullable|image|max:10240',
            'video_base64' => 'nullable|string',
            'video_mime' => 'nullable|string',
            'video_duration' => 'nullable|numeric',
            'video' => 'nullable|file|mimes:mp4,mov,m4v,3gp|max:30720',
            'audio_base64' => 'nullable|string',
            'audio' => 'nullable|file',
            'vehicle_name' => 'nullable',
            'vehicle_type' => 'nullable',
            'history' => 'nullable|array',
        ]);

        // 1. Resolve plan and usage stats first (for media limit validation)
        $usageStats = $this->usageService->getUsageStats($user, $guestUuid);
        $inputType = $validated['input_type'] ?? 'text';

        $mediaBase64 = null;
        $mediaMime = 'image/jpeg';
        $mediaSizeBytes = null;
        $videoDurationSec = null;
        $tempStoredPath = null;

        // Process File Uploads (Image or Video)
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
            $mediaMime = 'image/jpeg';
            $mediaSizeBytes = (int) (strlen($cleanBase64) * 0.75);

            $validation = $this->mediaValidationService->validateImage($mediaSizeBytes, $usageStats['media'] ?? []);
            if (!$validation['valid']) {
                return response()->json([
                    'status' => 'error',
                    'reason' => $validation['error'],
                    'message' => $validation['message'],
                ], 422);
            }
        } elseif (!empty($validated['audio_base64'])) {
            $inputType = 'voice';
            $cleanBase64 = preg_replace('/^data:audio\/[a-zA-Z0-9.+-]+;base64,/i', '', trim($validated['audio_base64']));
            $mediaBase64 = $cleanBase64;
            $mediaMime = 'audio/mp4';
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

        // 2. ATOMIC USAGE EVALUATION & RESERVATION
        $reservation = $this->usageService->evaluateAndReserve(
            $user,
            $guestUuid,
            $inputType,
            $mediaSizeBytes,
            $videoDurationSec
        );

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
                'message' => $user
                    ? 'You have reached your AI consultation limit for this period.'
                    : 'You have used all 5 guest AI consultations.',
            ], 403);
        }

        $logId = $reservation['log_id'];

        // Resolve active vehicle
        $vehicle = null;
        $rawVehicleId = $request->input('vehicle_id');
        $vehicleId = (is_numeric($rawVehicleId) && (int) $rawVehicleId > 0) ? (int) $rawVehicleId : null;

        if ($vehicleId) {
            $vehicle = Vehicle::with(['vehicleType', 'vehicleBrand', 'vehicleModel', 'vehicleYear'])->find($vehicleId);
        } elseif ($user && $user->active_vehicle_id) {
            $vehicle = Vehicle::with(['vehicleType', 'vehicleBrand', 'vehicleModel', 'vehicleYear'])->find($user->active_vehicle_id);
        }

        $vehicleInfo = [
            'type' => $this->toSafeString($vehicle?->vehicleType?->name ?? $request->input('vehicle_type'), 'Vehicle'),
            'brand' => $this->toSafeString($vehicle?->custom_brand ?: ($vehicle?->vehicleBrand?->name ?? $request->input('vehicle_name')), 'Unknown'),
            'model' => $this->toSafeString($vehicle?->custom_model ?: ($vehicle?->vehicleModel?->name ?? 'Unknown'), 'Unknown'),
            'year' => $this->toSafeString($vehicle?->custom_year ?: ($vehicle?->vehicleYear?->year ?? 'Unknown'), 'Unknown'),
            'model_number' => $this->toSafeString($vehicle?->model_number ?? null, ''),
            'preferred_language' => $request->header('X-User-Language', 'en'),
        ];

        Log::info('[DiagnosticController] PIPELINE FLOW: MOBILE INPUT -> LARAVEL REQUEST -> GEMINI REQUEST', [
            'symptoms' => $validated['symptoms'],
            'input_type' => $validated['input_type'] ?? 'text',
            'user_id' => $user?->id,
            'guest_uuid' => $guestUuid,
            'vehicle_info' => $vehicleInfo,
            'history_turns' => count($validated['history'] ?? []),
        ]);

        try {
            $analysis = $this->aiServiceClient->analyzeSymptoms(
                $vehicleInfo,
                $validated['symptoms'],
                $mediaBase64,
                $mediaMime,
                $validated['history'] ?? [],
                null,
                $user?->id
            );
            $aiSource = $analysis['ai_source'] ?? 'gemini';

            $intentType = strtolower($analysis['type'] ?? 'conversation');

            // Conversation Intent
            if ($intentType !== 'diagnostic') {
                return response()->json([
                    'status' => 'success',
                    'data' => [
                        'type' => 'conversation',
                        'response' => $analysis['response'] ?? 'I am here to assist with your vehicle.',
                        'ai_source' => $aiSource,
                        'remaining_consultations' => $reservation['remaining'],
                    ]
                ], 200);
            }

            // Diagnostic Intent
            $estCostMin = (float) ($analysis['estimated_cost']['min'] ?? 1000);
            $estCostMax = (float) ($analysis['estimated_cost']['max'] ?? 3500);
            $currencyStr = $this->toSafeString($analysis['estimated_cost']['currency'] ?? 'PHP', 'PHP');
            $proHelpRec = (bool) ($analysis['professional_help']['recommended'] ?? false);
            $proHelpReason = $this->toSafeString($analysis['professional_help']['reason'] ?? 'Professional inspection recommended for vehicle safety.', 'Professional inspection recommended for vehicle safety.');
            $proHelpPriority = $this->toSafeString($analysis['professional_help']['priority'] ?? $analysis['professional_help']['severity'] ?? $analysis['severity'] ?? 'MODERATE', 'MODERATE');

            $rawConfidence = $analysis['confidence'] ?? 'MODERATE';
            $numericConfidence = match (strtoupper($this->toSafeString($rawConfidence, 'MODERATE'))) {
                'HIGH' => 90,
                'MODERATE' => 75,
                'LOW' => 50,
                'INSUFFICIENT' => 30,
                default => is_numeric($rawConfidence) ? (int) $rawConfidence : 75,
            };

            $diagnostic = Diagnostic::create([
                'user_id' => $user?->id,
                'vehicle_id' => $vehicle?->id,
                'input_type' => $inputType,
                'symptoms' => $this->toSafeString($validated['symptoms']),
                'image_path' => ($inputType === 'image' && $tempStoredPath) ? Storage::url($tempStoredPath) : null,
                'summary' => $this->toSafeString($analysis['summary'] ?? 'Diagnostic evaluation complete.', 'Diagnostic evaluation complete.'),
                'confidence' => $numericConfidence,
                'severity' => $this->toSafeString($analysis['severity'] ?? 'MODERATE', 'MODERATE'),
                'urgency' => $this->toSafeString($analysis['urgency'] ?? 'Inspection recommended.', 'Inspection recommended.'),
                'possible_causes' => is_array($analysis['possible_causes'] ?? null) ? $analysis['possible_causes'] : [],
                'recommended_actions' => is_array($analysis['recommended_actions'] ?? null) ? $analysis['recommended_actions'] : [],
                'estimated_cost_min' => $estCostMin,
                'estimated_cost_max' => $estCostMax,
                'currency' => $currencyStr,
                'professional_help_recommended' => $proHelpRec,
                'professional_help_reason' => $proHelpReason,
                'professional_help_priority' => $proHelpPriority,
            ]);

            if ($user && in_array($diagnostic->severity, ['HIGH', 'CRITICAL'])) {
                try {
                    $user->notify(new HighSeverityDiagnosticAlert($diagnostic));
                } catch (\Throwable $e) {
                    Log::warning('[DiagnosticController] Notification failed: ' . $e->getMessage());
                }
            }

            Log::info('[DiagnosticController] Diagnostic response generated successfully', [
                'id' => $diagnostic->id,
                'severity' => $diagnostic->severity,
                'status' => $analysis['status'] ?? 'diagnosis_ready',
                'ai_source' => $aiSource,
            ]);

            return response()->json([
                'status' => 'success',
                'data' => [
                    'type' => 'diagnostic',
                    'id' => $diagnostic->id,
                    'status' => $analysis['status'] ?? 'diagnosis_ready',
                    'vehicle' => $vehicle ? [
                        'id' => $vehicle->id,
                        'name' => $vehicleInfo['brand'] . ' ' . $vehicleInfo['model'],
                        'type' => $vehicleInfo['type'],
                        'year' => $vehicleInfo['year'],
                    ] : null,
                    'symptoms' => $diagnostic->symptoms,
                    'input_type' => $diagnostic->input_type,
                    'summary' => $diagnostic->summary,
                    'confidence' => $analysis['confidence'] ?? $diagnostic->confidence,
                    'severity' => $diagnostic->severity,
                    'urgency' => $diagnostic->urgency,
                    'possible_causes' => $diagnostic->possible_causes,
                    'recommended_actions' => $diagnostic->recommended_actions,
                    'clarification_questions' => $analysis['clarification_questions'] ?? [],
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
                    'remaining_consultations' => $reservation['remaining'],
                    'created_at' => $diagnostic->created_at->toIso8601String(),
                ]
            ], 200);
        } catch (\Throwable $e) {
            Log::error('[DiagnosticController] Exception during AI processing', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            $this->usageService->markAsFailed($logId);

            return response()->json([
                'status' => 'error',
                'reason' => 'ai_service_unavailable',
                'message' => 'VehiCare AI error: ' . $e->getMessage(),
            ], 500);
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
