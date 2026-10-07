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
        $this->baseUrl = rtrim((string) config('services.ai_service.url', 'http://127.0.0.1:5000'), '/');
        $this->secret = (string) config('services.ai_service.secret', '');
    }

    /**
     * Send trusted AI diagnosis payload to Node.js microservice.
     */
    public function analyzeSymptoms(
        array $vehicleInfo,
        string $symptoms,
        ?string $mediaBase64 = null,
        ?string $mediaMime = 'image/jpeg',
        array $history = [],
        ?string $requestId = null,
        ?int $userId = null
    ): array {
        $requestId = $requestId ?: ('req_' . bin2hex(random_bytes(8)));

        $payload = [
            'request_id' => $requestId,
            'user_context' => [
                'id' => $userId,
                'language' => $vehicleInfo['preferred_language'] ?? 'en',
            ],
            'vehicle_context' => [
                'type' => $vehicleInfo['type'] ?? 'Vehicle',
                'brand' => $vehicleInfo['brand'] ?? 'Unknown',
                'model' => $vehicleInfo['model'] ?? 'Unknown',
                'year' => $vehicleInfo['year'] ?? 'Unknown',
                'model_number' => $vehicleInfo['model_number'] ?? null,
            ],
            'diagnosis' => [
                'symptoms' => $symptoms,
                'input_type' => !empty($mediaBase64) ? 'image' : 'text',
                'media_base64' => $mediaBase64,
                'media_mime' => $mediaMime,
                'history' => $history,
            ],
        ];

        $endpoint = "{$this->baseUrl}/api/diagnosis";

        $brandStr = $this->safeStr($vehicleInfo['brand'] ?? 'Unknown');
        $modelStr = $this->safeStr($vehicleInfo['model'] ?? '');

        Log::info('[AIServiceClient] Sending request to Node.js AI Service', [
            'request_id' => $requestId,
            'endpoint' => $endpoint,
            'vehicle' => trim("{$brandStr} {$modelStr}"),
            'has_media' => !empty($mediaBase64),
        ]);

        try {
            $response = Http::timeout(65)
                ->connectTimeout(10)
                ->withHeaders([
                    'Content-Type' => 'application/json',
                    'Authorization' => "Bearer {$this->secret}",
                    'X-Request-ID' => $requestId,
                ])
                ->post($endpoint, $payload);

            if ($response->successful()) {
                $data = $response->json();
                if (isset($data['success']) && $data['success'] && isset($data['diagnosis'])) {
                    Log::info('[AIServiceClient] Received successful AI diagnosis from Node.js', [
                        'request_id' => $requestId,
                        'ai_source' => $data['ai_source'] ?? 'unknown',
                        'model' => $data['model'] ?? 'unknown',
                    ]);
                    $data['diagnosis']['ai_source'] = $data['ai_source'] ?? 'gemini';
                    return $data['diagnosis'];
                }
            }

            Log::error('[AIServiceClient] Node.js AI Service returned error response', [
                'request_id' => $requestId,
                'status' => $response->status(),
                'body' => mb_substr($response->body(), 0, 500),
            ]);
        } catch (\Throwable $e) {
            Log::error('[AIServiceClient] HTTP Exception communicating with Node.js AI Service', [
                'request_id' => $requestId,
                'error' => $e->getMessage(),
            ]);
        }

        // Return fallback if Node.js microservice fails
        return $this->generateFallback($vehicleInfo, $symptoms);
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

    protected function generateFallback(array $vehicleInfo, string $symptoms): array
    {
        $vBrand = $this->safeStr($vehicleInfo['brand'] ?? '', 'Vehicle');
        $vModel = $this->safeStr($vehicleInfo['model'] ?? '');
        $vName = trim("{$vBrand} {$vModel}");

        return [
            'type' => 'diagnostic',
            'status' => 'needs_clarification',
            'confidence' => 'INSUFFICIENT',
            'summary' => "The reported symptoms for your {$vName} require additional information.",
            'reported' => $symptoms !== '' ? [$symptoms] : [],
            'observed' => [],
            'severity' => 'MODERATE',
            'urgency' => 'Further inspection recommended.',
            'possible_causes' => [
                [
                    'cause' => 'Component inspection required',
                    'likelihood' => 'MODERATE',
                    'reason' => 'AI Service temporarily unavailable. Physical inspection recommended.',
                ],
            ],
            'recommended_actions' => [
                'Consult a certified technician if the problem persists.',
            ],
            'clarification_questions' => [
                'When does the symptom occur?',
            ],
            'estimated_cost' => [
                'min' => 1000,
                'max' => 3500,
                'currency' => 'PHP',
            ],
            'professional_help' => [
                'recommended' => false,
                'reason' => 'Professional inspection recommended if symptoms persist.',
                'severity' => 'MODERATE',
            ],
        ];
    }
}
