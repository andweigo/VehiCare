<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AIServiceClient
{
    protected string $baseUrl;
    protected string $secret;

    public function __construct()
    {
        $rawUrl = (string) config('services.ai_service.url', 'http://127.0.0.1:5000');
        $rawUrl = rtrim($rawUrl, '/');
        if (str_ends_with($rawUrl, '/api')) {
            $rawUrl = substr($rawUrl, 0, -4);
        }
        $this->baseUrl = $rawUrl;
        $this->secret = trim((string) config('services.ai_service.secret', ''));
    }

    /**
     * Send trusted AI diagnosis payload to Node.js microservice.
     */
    public function analyzeSymptoms(
        array $vehicleInfo,
        string $symptoms,
        ?string $mediaBase64 = null,
        ?string $mediaMime = null,
        string $inputType = 'text',
        array $history = [],
        ?string $requestId = null,
        ?int $userId = null,
        array $entitlements = [],
        array $historicalContext = [],
        array $diagnosticState = [],
        ?string $rootSymptom = null
    ): array {
        if ($this->secret === '') {
            throw new AIServiceException(
                'AI_CONFIG_ERROR',
                'AI_SERVICE_SECRET must be configured before calling the AI service.',
                false,
                500
            );
        }

        $requestId = $requestId ?: ('req_' . bin2hex(random_bytes(8)));
        $history = $this->sanitizeHistory($history);

        $payload = [
            'request_id' => $requestId,
            'user_context' => [
                'id' => $userId,
                'language' => $vehicleInfo['preferred_language'] ?? 'en',
                'plan' => $entitlements['plan'] ?? 'free',
            ],
            'entitlements' => empty($entitlements) ? (object) [] : $entitlements,
            'historical_context' => empty($historicalContext) ? (object) [] : $historicalContext,
            'diagnostic_state' => empty($diagnosticState) ? (object) ['assessments' => []] : $diagnosticState,

            'vehicle_context' => [
                'type' => $vehicleInfo['type'] ?? 'Vehicle',
                'brand' => $vehicleInfo['brand'] ?? 'Unknown',
                'model' => $vehicleInfo['model'] ?? 'Unknown',
                'year' => $vehicleInfo['year'] ?? 'Unknown',
                'model_number' => $vehicleInfo['model_number'] ?? null,
                'is_saved_vehicle' => $vehicleInfo['is_saved_vehicle'] ?? true,
                'target_vehicle_desc' => $vehicleInfo['target_vehicle_desc'] ?? null,
            ],
            'diagnosis' => [
                'symptoms' => $symptoms,
                'root_symptom' => $rootSymptom ?: ($vehicleInfo['root_symptom'] ?? $symptoms),
                'input_type' => $inputType,
                'media_base64' => $mediaBase64,
                'media_mime' => $mediaMime ?: 'image/jpeg',
                'history' => $history,
            ],
        ];

        $endpoint = "{$this->baseUrl}/api/diagnosis";

        Log::info('[AIServiceClient] Sending request to Node.js AI Service', [
            'request_id' => $requestId,
            'has_media' => !empty($mediaBase64),
            'endpoint' => $endpoint,
        ]);

        try {
            $response = Http::timeout((int) config('services.ai_service.timeout', 360))
                ->connectTimeout((int) config('services.ai_service.connect_timeout', 30))
                ->retry(2, 2000, function ($exception, $request) {
                    return $exception instanceof \Illuminate\Http\Client\ConnectionException;
                }, throw: false)
                ->withHeaders([
                    'Content-Type' => 'application/json',
                    'Authorization' => "Bearer {$this->secret}",
                    'X-Request-ID' => $requestId,
                ])
                ->post($endpoint, $payload);
        } catch (\Throwable $e) {
            Log::error('[AIServiceClient] HTTP Exception communicating with Node.js AI Service', [
                'request_id' => $requestId,
                'exception' => get_class($e),
                'message' => $e->getMessage(),
            ]);

            throw new AIServiceException(
                'AI_SERVICE_UNAVAILABLE',
                'The AI service is temporarily unavailable. Please try again.',
                true,
                503,
                $e
            );
        }

        $data = $response->json();
        if ($response->successful() && isset($data['success']) && $data['success'] && isset($data['diagnosis'])) {
            Log::info('[AIServiceClient] Received successful AI diagnosis from Node.js', [
                'request_id' => $requestId,
                'ai_source' => $data['ai_source'] ?? 'unknown',
                'model' => $data['model'] ?? 'unknown',
            ]);
            $data['diagnosis']['ai_source'] = $data['ai_source'] ?? 'gemini';
            return $data['diagnosis'];
        }

        $errorCode = data_get($data, 'error.code', 'AI_SERVICE_UNAVAILABLE');
        $message = data_get($data, 'error.message', 'The AI service could not complete the request. Please try again.');
        $details = data_get($data, 'error.details');
        $retryable = (bool) data_get($data, 'error.retryable', $response->serverError());
        $status = $response->status() >= 400 ? $response->status() : 502;

        Log::error('[AIServiceClient] Node.js AI Service returned error response', [
            'request_id' => $requestId,
            'status' => $response->status(),
            'error_code' => $errorCode,
            'retryable' => $retryable,
        ]);

        throw new AIServiceException(
            (string) $errorCode,
            (string) $message,
            $retryable,
            $status,
            null,
            is_array($details) ? $details : null
        );
    }

    protected function sanitizeHistory(array $history): array
    {
        $sanitized = [];

        foreach ($history as $entry) {
            if (!is_array($entry)) {
                continue;
            }

            if (!is_string($entry['role'] ?? null)) {
                continue;
            }
            $role = strtolower(trim($entry['role']));
            if (!in_array($role, ['user', 'assistant'], true)) {
                continue;
            }

            $content = $entry['content'] ?? $entry['text'] ?? null;
            if (!is_string($content)) {
                continue;
            }

            $content = trim($content);
            if ($content === '') {
                continue;
            }

            $sanitized[] = [
                'role' => $role,
                'content' => function_exists('mb_substr') ? mb_substr($content, 0, 4000) : substr($content, 0, 4000),
            ];
        }

        return array_slice($sanitized, -20);
    }

    protected function safeStr($val, string $default = ''): string
    {
        if (is_string($val)) return $val;
        if (is_numeric($val) || is_bool($val)) return (string) $val;
        if (is_array($val)) {
            if (isset($val['name']) && is_string($val['name'])) return $val['name'];
            if (isset($val['brand']) && is_string($val['brand'])) return $val['brand'];
            if (isset($val['model']) && is_string($val['model'])) return $val['model'];
            $parts = array_filter($val, fn($v) => is_string($v) || is_numeric($v));
            if (!empty($parts)) return implode(' ', $parts);
            return json_encode($val);
        }
        return $default;
    }

}
