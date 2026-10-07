<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeminiService
{
    protected string $apiKey;
    protected string $primaryModel;

    public function __construct()
    {
        $this->apiKey = trim(
            (string) config('services.gemini.api_key', '')
        );

        // Gemini model confirmed working by direct PHP cURL test.
        $this->primaryModel = 'gemini-3.6-flash';
    }

    /**
     * Analyze user input, media, and conversation history using Gemini.
     */
    public function analyzeSymptoms(
        array $vehicleInfo,
        string $userMessage,
        ?string $mediaBase64 = null,
        ?string $mediaMime = 'image/jpeg',
        array $history = []
    ): array {
        $hasMedia = !empty($mediaBase64);
        $userMessage = trim($userMessage);

        /*
         * Empty request.
         */
        if ($userMessage === '' && !$hasMedia) {
            return [
                'type' => 'conversation',
                'status' => 'conversation',
                'response' => 'Kumusta! Ako si VehiCare AI. Ano ang maipaglilingkod ko sa iyong sasakyan ngayon? / Hi! How can I help with your vehicle today?',
            ];
        }

        /*
         * Check API key.
         */
        if ($this->apiKey === '') {
            Log::error('[Gemini] API key is empty.');

            return $this->generateRuleBasedFallback(
                $vehicleInfo,
                $userMessage,
                $hasMedia
            );
        }

        $vName = trim(
            ($vehicleInfo['brand'] ?? 'Vehicle') .
            ' ' .
            ($vehicleInfo['model'] ?? '')
        );

        Log::info('[Gemini] Diagnosis request started', [
            'Model' => $this->primaryModel,
            'Vehicle' => trim(
                $vName . ' ' . ($vehicleInfo['year'] ?? '')
            ),
            'History turns' => count($history),
            'Has media' => $hasMedia,
            'Current user message received' => mb_substr(
                $userMessage,
                0,
                100
            ),
        ]);

        /*
         * Build the complete AI prompt.
         */
        $prompt = $this->buildSystemPrompt(
            $vehicleInfo,
            $userMessage,
            $hasMedia,
            $history
        );

        /*
         * Only use the confirmed working model.
         */
        try {
            Log::info('[Gemini] Sending request to Gemini REST API', [
                'model' => $this->primaryModel,
            ]);

            $response = $this->callGeminiApi(
                $this->primaryModel,
                $prompt,
                $mediaBase64,
                $mediaMime
            );

            if (!$response) {
                Log::error('[Gemini] Gemini API returned no response.');

                return $this->generateRuleBasedFallback(
                    $vehicleInfo,
                    $userMessage,
                    $hasMedia
                );
            }

            /*
             * Extract Gemini generated text.
             */
            $rawText = $this->extractResponseText($response);

            if ($rawText === null || trim($rawText) === '') {
                Log::error('[Gemini] Gemini response contained no text.', [
                    'response' => $response,
                ]);

                return $this->generateRuleBasedFallback(
                    $vehicleInfo,
                    $userMessage,
                    $hasMedia
                );
            }

            Log::info('[Gemini] Raw response received', [
                'model' => $this->primaryModel,
                'preview' => mb_substr($rawText, 0, 300),
            ]);

            /*
             * Parse AI JSON.
             */
            $parsed = $this->parseAndValidateJson(
                $rawText,
                $vehicleInfo,
                $userMessage,
                $hasMedia
            );

            if ($parsed !== null) {
                Log::info(
                    '[Gemini] Gemini response parsed successfully',
                    [
                        'model' => $this->primaryModel,
                        'type' => $parsed['type'] ?? null,
                        'status' => $parsed['status'] ?? null,
                        'confidence' => $parsed['confidence'] ?? null,
                        'response_preview' => mb_substr(
                            $parsed['response']
                                ?? $parsed['summary']
                                ?? '',
                            0,
                            150
                        ),
                    ]
                );

                return $parsed;
            }

            Log::error('[Gemini] Failed to parse Gemini response.');

        } catch (\Throwable $e) {
            Log::error('[Gemini] Exception during Gemini request', [
                'model' => $this->primaryModel,
                'class' => get_class($e),
                'message' => $e->getMessage(),
            ]);
        }

        /*
         * Only reach here if Gemini genuinely failed.
         */
        Log::warning(
            '[Gemini] Gemini request failed. Using fallback.'
        );

        return $this->generateRuleBasedFallback(
            $vehicleInfo,
            $userMessage,
            $hasMedia
        );
    }

    /**
     * Validate vehicle combination and model-year consistency using Gemini.
     */
    public function validateVehicleData(
        string $vehicleType,
        string $brand,
        string $model,
        ?int $year = null,
        ?string $modelNumber = null
    ): ?array {
        if ($this->apiKey === '') {
            Log::warning('[Gemini] API key is empty during vehicle validation.');

            return null;
        }

        $prompt = "You are an expert automotive database assistant.\n\n" .
            "Validate whether the following vehicle combination is real, and provide valid production years:\n" .
            "Vehicle Type: {$vehicleType}\n" .
            "Brand: {$brand}\n" .
            "Model: {$model}\n";

        if ($year !== null) {
            $prompt .= "Requested Year: {$year}\n";
        }
        if ($modelNumber !== null && $modelNumber !== '') {
            $prompt .= "Model Number/Variant: {$modelNumber}\n";
        }

        $prompt .= "\nReturn ONLY valid JSON with this exact structure (no markdown, no code block fences):\n" .
            "{\n" .
            '  "is_valid": true,' . "\n" .
            '  "status": "verified",' . "\n" .
            '  "confidence": 0.95,' . "\n" .
            '  "production_year_start": 2015,' . "\n" .
            '  "production_year_end": 2024,' . "\n" .
            '  "suggested_years": [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024],' . "\n" .
            '  "year_valid": true,' . "\n" .
            '  "reason": "The vehicle is a valid production model."' . "\n" .
            "}";

        try {
            $response = $this->callGeminiApi($this->primaryModel, $prompt);

            if (!$response) {
                return null;
            }

            $rawText = $this->extractResponseText($response);

            if ($rawText === null || trim($rawText) === '') {
                return null;
            }

            $clean = trim($rawText);
            $clean = preg_replace('/^```(?:json)?\s*/i', '', $clean);
            $clean = preg_replace('/\s*```$/', '', $clean);
            $clean = trim($clean);

            if (!str_starts_with($clean, '{') || !str_ends_with($clean, '}')) {
                $start = strpos($clean, '{');
                $end = strrpos($clean, '}');

                if ($start !== false && $end !== false && $end > $start) {
                    $clean = substr($clean, $start, $end - $start + 1);
                }
            }

            $data = json_decode($clean, true);

            if (is_array($data)) {
                return $data;
            }
        } catch (\Throwable $e) {
            Log::warning('[Gemini] Exception during vehicle validation: ' . $e->getMessage());
        }

        return null;
    }

    /**
     * Call Gemini generateContent REST API.
     *
     * Uses the exact endpoint confirmed working by direct PHP cURL.
     */
    protected function callGeminiApi(
        string $model,
        string $prompt,
        ?string $mediaBase64 = null,
        ?string $mediaMime = 'image/jpeg'
    ): ?array {
        $parts = [
            [
                'text' => $prompt,
            ],
        ];

        /*
         * Add media if supplied.
         */
        if (!empty($mediaBase64)) {
            $cleanBase64 = $this->cleanBase64Image(
                $mediaBase64
            );

            if ($cleanBase64 !== null) {
                $mimeType = $this->normalizeMediaMimeType(
                    $mediaMime
                );

                Log::info('[Gemini] Adding media to request', [
                    'mime_type' => $mimeType,
                    'base64_length' => strlen($cleanBase64),
                ]);

                $parts[] = [
                    'inline_data' => [
                        'mime_type' => $mimeType,
                        'data' => $cleanBase64,
                    ],
                ];
            } else {
                Log::warning(
                    '[Gemini] Media was supplied but could not be decoded.'
                );
            }
        }

        /*
         * IMPORTANT:
         *
         * Gemini 3.6 Flash is working with this simple
         * generation configuration.
         *
         * Do not send temperature/topP/topK here.
         */
        $payload = [
            'contents' => [
                [
                    'role' => 'user',
                    'parts' => $parts,
                ],
            ],
            'generationConfig' => [
                'maxOutputTokens' => 4096,
            ],
        ];

        /*
         * Exact endpoint that worked in gemini-test.php.
         */
        $endpoint =
            'https://generativelanguage.googleapis.com/' .
            'v1beta/models/' .
            rawurlencode($model) .
            ':generateContent';

        Log::info('[Gemini] HTTP request', [
            'endpoint' => $endpoint,
            'model' => $model,
            'payload_has_media' => !empty($mediaBase64),
            'prompt_length' => strlen($prompt),
        ]);

        try {
            $response = Http::timeout(60)
                ->connectTimeout(15)
                ->withHeaders([
                    'Content-Type' => 'application/json',
                    'x-goog-api-key' => $this->apiKey,
                ])
                ->post(
                    $endpoint,
                    $payload
                );

            Log::info('[Gemini] HTTP response received', [
                'status' => $response->status(),
                'successful' => $response->successful(),
                'body_preview' => mb_substr(
                    $response->body(),
                    0,
                    500
                ),
            ]);

            /*
             * Successful Gemini response.
             */
            if ($response->successful()) {
                $json = $response->json();

                if (is_array($json)) {
                    return $json;
                }

                Log::error(
                    '[Gemini] Successful HTTP response was not valid JSON.'
                );

                return null;
            }

            /*
             * Gemini returned an HTTP error.
             */
            Log::error('[Gemini] Gemini API error', [
                'model' => $model,
                'status' => $response->status(),
                'body' => mb_substr(
                    $response->body(),
                    0,
                    3000
                ),
            ]);

        } catch (\Throwable $e) {
            Log::error('[Gemini] HTTP exception', [
                'model' => $model,
                'class' => get_class($e),
                'message' => $e->getMessage(),
            ]);
        }

        return null;
    }

    /**
     * Build the VehiCare AI prompt.
     */
    protected function buildSystemPrompt(
        array $vehicleInfo,
        string $userMessage,
        bool $hasMedia,
        array $history = []
    ): string {
        $vType = trim(
            (string) ($vehicleInfo['type'] ?? 'Vehicle')
        );

        $vBrand = trim(
            (string) ($vehicleInfo['brand'] ?? 'Unknown Brand')
        );

        $vModel = trim(
            (string) ($vehicleInfo['model'] ?? 'Unknown Model')
        );

        $vYear = trim(
            (string) ($vehicleInfo['year'] ?? 'Unknown Year')
        );

        /*
         * Conversation history.
         */
        $historyText = '';

        if (!empty($history)) {
            $formattedTurns = [];

            foreach ($history as $turn) {
                $role = strtolower(
                    (string) ($turn['role'] ?? '')
                );

                $roleLabel =
                    $role === 'user'
                        ? 'User'
                        : 'VehiCare AI';

                $content = trim(
                    (string) (
                        $turn['content']
                        ?? $turn['text']
                        ?? ''
                    )
                );

                if ($content !== '') {
                    $formattedTurns[] =
                        "{$roleLabel}: {$content}";
                }
            }

            if (!empty($formattedTurns)) {
                $historyText =
                    "\n\n" .
                    "==================================================\n" .
                    "RECENT CONVERSATION HISTORY\n" .
                    "==================================================\n" .
                    implode("\n", $formattedTurns);
            }
        }

        /*
         * Preferred language.
         */
        $preferredLanguage =
            strtolower(
                (string) (
                    $vehicleInfo['preferred_language']
                    ?? 'en'
                )
            );

        $langInstruction = match ($preferredLanguage) {
            'fil' =>
                'MANDATORY LANGUAGE: Filipino/Tagalog. Respond naturally and clearly in Filipino.',

            'taglish' =>
                'MANDATORY LANGUAGE: Taglish. Respond naturally using a conversational mix of Filipino and English.',

            default =>
                'LANGUAGE: Detect the user language. Respond in the same language. Default to English.',
        };

/*
 * Media instruction.
 */
if ($hasMedia) {
    $mediaInstruction = implode("\n", [
        'MEDIA IS ATTACHED.',
        'Analyze the supplied media carefully.',
        '',
        'If it is an image:',
        '- Inspect visible warning lights.',
        '- Inspect visible leaks.',
        '- Inspect damaged components.',
        '- Inspect tire condition.',
        '- Inspect belts, hoses, wiring, corrosion, cracks, and abnormal wear.',
        '',
        'If it is video:',
        '- Inspect visible smoke.',
        '- Inspect vibration.',
        '- Inspect engine behavior.',
        '- Inspect leaks.',
        '- Inspect moving components.',
        '',
        'Do NOT claim to hear audio unless actual audio information is available.',
        'Do NOT invent visual findings.',
    ]);
} else {
    $mediaInstruction =
        'NO MEDIA IS ATTACHED. Base the diagnosis only on the user message and conversation history.';
}
        return <<<PROMPT
You are VehiCare AI, an expert automotive diagnostic and maintenance assistant.

You are operating inside the VehiCare mobile application.

VEHICLE INFORMATION:
Type: {$vType}
Brand: {$vBrand}
Model: {$vModel}
Year: {$vYear}

{$langInstruction}

{$historyText}

==================================================
CURRENT USER MESSAGE
==================================================

"{$userMessage}"

==================================================
MEDIA
==================================================

{$mediaInstruction}

==================================================
DOMAIN
==================================================

Stay focused on:

- Vehicle diagnostics
- Vehicle maintenance
- Automotive parts
- Repair procedures
- Vehicle safety
- Troubleshooting
- Preventive maintenance

If the question is unrelated to vehicles, politely explain that you specialize in vehicle assistance.

==================================================
INTENT CLASSIFICATION
==================================================

Use "conversation" for:

- Greetings
- General vehicle questions
- Maintenance questions
- Part explanations
- Basic automotive information
- Casual vehicle-related conversation

Use "diagnostic" when the user reports:

- A malfunction
- Unusual sound
- Warning light
- Starting problem
- Stalling
- Smoke
- Leak
- Vibration
- Overheating
- Performance issue
- Other active vehicle symptoms
- A diagnostic image/media

==================================================
DIAGNOSTIC RULES
==================================================

Never pretend certainty when the evidence is insufficient.

If the information is insufficient:

status = "needs_clarification"
confidence = "INSUFFICIENT"

Ask 2-4 useful clarification questions.

If enough information exists:

status = "diagnosis_ready"

Use:

HIGH
MODERATE
LOW

for confidence.

Possible causes must be specific to the CURRENT symptom.

Do not blindly repeat causes from conversation history.

==================================================
SAFETY
==================================================

If the symptom could indicate a dangerous condition, clearly warn the user.

Examples:

- Brake failure
- Severe overheating
- Engine fire
- Heavy smoke
- Major fuel leak
- Major oil leak
- Loss of steering
- Serious electrical burning smell
- Vehicle cannot safely move

For serious problems:

professional_help.recommended = true

For simple checks:

professional_help.recommended = false

==================================================
RESPONSE FORMAT
==================================================

Return ONLY valid JSON.

Do not use markdown.

Do not put JSON inside ```json fences.

For CONVERSATION:

{
    "type": "conversation",
    "status": "conversation",
    "response": "AI response"
}

For DIAGNOSTIC:

{
    "type": "diagnostic",
    "status": "diagnosis_ready",
    "confidence": "HIGH",
    "summary": "Short assessment",
    "reported": [
        "Reported symptom"
    ],
    "observed": [
        "Only actual observations from attached media"
    ],
    "severity": "LOW",
    "urgency": "Urgency recommendation",
    "possible_causes": [
        {
            "cause": "Specific possible cause",
            "likelihood": "HIGH",
            "reason": "Why this cause is possible"
        }
    ],
    "recommended_actions": [
        "Safe action 1",
        "Safe action 2"
    ],
    "clarification_questions": [],
    "estimated_cost": {
        "min": 500,
        "max": 3000,
        "currency": "PHP"
    },
    "professional_help": {
        "recommended": false,
        "reason": "Reason",
        "severity": "LOW"
    }
}

==================================================
CONVERSATION FOLLOW-UP & CONTINUATION RULE
==================================================

If there is RECENT CONVERSATION HISTORY and the current user message is a short affirmative response, follow-up, or continuation (e.g. "opo", "yes", "sige", "go ahead", "sure", "okay", "tell me more", "how?", "asan na"):

1. DO NOT reset the conversation or respond with a generic welcome greeting (e.g. NEVER say "Hi! I'm VehiCare AI...").
2. Read the preceding assistant turn in the conversation history carefully. If the assistant asked if the user wanted steps, instructions, causes, or advice, FULFILL THAT REQUEST DIRECTLY!
3. Provide the detailed step-by-step inspection guide, repair steps, or explanation in the user's language (Taglish/Filipino/English).

==================================================
IMPORTANT
==================================================

Prioritize the CURRENT USER MESSAGE while maintaining context from RECENT CONVERSATION HISTORY.

Do not reset context on short user replies like "opo", "yes", "sige", "okay".

Do not invent information that was not provided or observed.

Return ONLY JSON.
PROMPT;
    }

    /**
     * Extract generated text from Gemini response.
     */
    protected function extractResponseText(
        array $response
    ): ?string {
        $candidates =
            $response['candidates'] ?? [];

        if (
            !is_array($candidates) ||
            empty($candidates)
        ) {
            Log::warning(
                '[Gemini] No candidates in response.'
            );

            return null;
        }

        foreach ($candidates as $candidate) {
            $parts =
                $candidate['content']['parts'] ?? [];

            if (!is_array($parts)) {
                continue;
            }

            foreach ($parts as $part) {
                if (
                    isset($part['text']) &&
                    is_string($part['text']) &&
                    trim($part['text']) !== ''
                ) {
                    return trim($part['text']);
                }
            }
        }

        return null;
    }

    /**
     * Safely parse Gemini JSON.
     */
    protected function parseAndValidateJson(
        string $rawText,
        array $vehicleInfo,
        string $userMessage,
        bool $hasMedia
    ): ?array {
        $clean = trim($rawText);

        /*
         * Remove markdown JSON fences.
         */
        $clean = preg_replace(
            '/^```(?:json)?\s*/i',
            '',
            $clean
        );

        $clean = preg_replace(
            '/\s*```$/',
            '',
            $clean
        );

        $clean = trim($clean);

        /*
         * Extract JSON object if Gemini included
         * additional text.
         */
        if (
            !str_starts_with($clean, '{') ||
            !str_ends_with($clean, '}')
        ) {
            $start = strpos($clean, '{');
            $end = strrpos($clean, '}');

            if (
                $start !== false &&
                $end !== false &&
                $end > $start
            ) {
                $clean = substr(
                    $clean,
                    $start,
                    $end - $start + 1
                );
            }
        }

        $data = json_decode($clean, true);

        if (!is_array($data)) {
            $sanitized = preg_replace('/[\x00-\x1F\x7F]/u', '', $clean);
            $data = json_decode($sanitized, true);
        }

        if (!is_array($data) && str_starts_with($clean, '{')) {
            // Remove trailing commas
            $repaired = preg_replace('/,\s*([\}\]])/', '$1', $clean);
            
            // Auto-repair truncated JSON output if token limit was reached mid-sentence
            if (substr_count($repaired, '"') % 2 !== 0) {
                $repaired .= '"';
            }
            $openBraces = substr_count($repaired, '{') - substr_count($repaired, '}');
            $openBrackets = substr_count($repaired, '[') - substr_count($repaired, ']');
            
            for ($i = 0; $i < $openBrackets; $i++) {
                $repaired .= ']';
            }
            for ($i = 0; $i < $openBraces; $i++) {
                $repaired .= '}';
            }

            $data = json_decode($repaired, true);
        }

        if (!is_array($data)) {
            if (strlen($clean) > 2 && !str_starts_with($clean, '{')) {
                return [
                    'type' => 'conversation',
                    'status' => 'conversation',
                    'response' => $clean,
                ];
            }

            Log::warning(
                '[Gemini] Could not decode Gemini JSON.',
                [
                    'raw' => mb_substr(
                        $rawText,
                        0,
                        1000
                    ),
                ]
            );

            return null;
        }

        $type = strtolower(
            trim(
                (string) (
                    $data['type']
                    ?? 'conversation'
                )
            )
        );

        /*
         * Media always means diagnostic context.
         */
        if ($hasMedia) {
            $type = 'diagnostic';
        }

        /*
         * Conversation response.
         */
        if (
            in_array(
                $type,
                [
                    'conversation',
                    'general',
                    'maintenance',
                    'vehicle_information',
                ],
                true
            ) &&
            empty($data['possible_causes']) &&
            empty($data['clarification_questions'])
        ) {
            return [
                'type' => 'conversation',
                'status' => 'conversation',
                'response' => (string) (
                    $data['response']
                    ?? $data['summary']
                    ?? 'Hello! How can I assist you with your vehicle today?'
                ),
            ];
        }

        /*
         * Diagnostic response.
         */
        if (
            $type === 'diagnostic' ||
            isset($data['severity']) ||
            isset($data['clarification_questions'])
        ) {
            return $this->normalizeDiagnosticResponse(
                $data,
                $vehicleInfo,
                $userMessage
            );
        }

        return [
            'type' => 'conversation',
            'status' => 'conversation',
            'response' => (string) (
                $data['response']
                ?? 'Hi! How can I help with your vehicle?'
            ),
        ];
    }

    /**
     * Normalize diagnostic response.
     */
    protected function normalizeDiagnosticResponse(
        array $data,
        array $vehicleInfo,
        string $userMessage
    ): array {
        /*
         * Severity.
         */
        $severity = strtoupper(
            trim(
                (string) (
                    $data['severity']
                    ?? 'MODERATE'
                )
            )
        );

        if (
            !in_array(
                $severity,
                [
                    'LOW',
                    'MODERATE',
                    'HIGH',
                    'CRITICAL',
                ],
                true
            )
        ) {
            $severity = 'MODERATE';
        }

        /*
         * Status.
         */
        $status = strtolower(
            trim(
                (string) (
                    $data['status']
                    ?? ''
                )
            )
        );

        if (
            !in_array(
                $status,
                [
                    'diagnosis_ready',
                    'needs_clarification',
                    'conversation',
                ],
                true
            )
        ) {
            $status =
                !empty(
                    $data['clarification_questions']
                )
                    ? 'needs_clarification'
                    : 'diagnosis_ready';
        }

        /*
         * Confidence.
         */
        $confidence = strtoupper(
            trim(
                (string) (
                    $data['confidence']
                    ?? 'MODERATE'
                )
            )
        );

        if (
            !in_array(
                $confidence,
                [
                    'HIGH',
                    'MODERATE',
                    'LOW',
                    'INSUFFICIENT',
                ],
                true
            )
        ) {
            $confidence =
                $status === 'needs_clarification'
                    ? 'INSUFFICIENT'
                    : 'MODERATE';
        }

        /*
         * Professional help.
         */
        $proHelp =
            is_array(
                $data['professional_help'] ?? null
            )
                ? $data['professional_help']
                : [];

        $recommended =
            (bool) (
                $proHelp['recommended']
                ?? in_array(
                    $severity,
                    [
                        'HIGH',
                        'CRITICAL',
                    ],
                    true
                )
            );

        if (
            in_array(
                $severity,
                [
                    'HIGH',
                    'CRITICAL',
                ],
                true
            )
        ) {
            $recommended = true;
        }

        /*
         * Reported symptoms.
         */
        $reported =
            is_array(
                $data['reported'] ?? null
            )
                ? $data['reported']
                : [];

        if (
            empty($reported) &&
            $userMessage !== ''
        ) {
            $reported = [
                $userMessage,
            ];
        }

        /*
         * Observed media findings.
         */
        $observed =
            is_array(
                $data['observed'] ?? null
            )
                ? $data['observed']
                : [];

        /*
         * Clarification questions.
         */
        $clarificationQuestions =
            is_array(
                $data['clarification_questions']
                    ?? null
            )
                ? $data['clarification_questions']
                : [];

        /*
         * Possible causes.
         */
        $possibleCauses = [];

        if (
            is_array(
                $data['possible_causes'] ?? null
            )
        ) {
            foreach (
                $data['possible_causes']
                as $item
            ) {
                if (is_array($item)) {
                    $likelihood = strtoupper(
                        (string) (
                            $item['likelihood']
                            ?? 'MODERATE'
                        )
                    );

                    if (
                        !in_array(
                            $likelihood,
                            [
                                'HIGH',
                                'MODERATE',
                                'LOW',
                            ],
                            true
                        )
                    ) {
                        $likelihood = 'MODERATE';
                    }

                    $possibleCauses[] = [
                        'cause' => (string) (
                            $item['cause']
                            ?? 'Unspecified component issue'
                        ),
                        'likelihood' => $likelihood,
                        'reason' => (string) (
                            $item['reason']
                            ?? ''
                        ),
                    ];
                } elseif (
                    is_string($item)
                ) {
                    $possibleCauses[] = [
                        'cause' => $item,
                        'likelihood' => 'MODERATE',
                        'reason' => '',
                    ];
                }
            }
        }

        /*
         * Recommended actions.
         */
        $recommendedActions =
            is_array(
                $data['recommended_actions']
                    ?? null
            )
                ? $data['recommended_actions']
                : [
                    'Consult a certified technician',
                ];

        /*
         * Estimated cost.
         */
        $estimatedCost =
            is_array(
                $data['estimated_cost'] ?? null
            )
                ? $data['estimated_cost']
                : [];

        return [
            'type' => 'diagnostic',

            'status' => $status,

            'confidence' => $confidence,

            'summary' => (string) (
                $data['summary']
                ??
                (
                    $status === 'needs_clarification'
                        ? 'Additional details are needed to narrow down your symptom.'
                        : 'Diagnostic evaluation complete.'
                )
            ),

            'reported' => array_values(
                array_filter($reported)
            ),

            'observed' => array_values(
                array_filter($observed)
            ),

            'severity' => $severity,

            'urgency' => (string) (
                $data['urgency']
                ?? $severity
            ),

            'possible_causes' => $possibleCauses,

            'recommended_actions' =>
                array_values(
                    array_filter(
                        $recommendedActions,
                        'is_string'
                    )
                ),

            'clarification_questions' =>
                array_values(
                    array_filter(
                        $clarificationQuestions,
                        'is_string'
                    )
                ),

            'estimated_cost' => [
                'min' => (float) (
                    $estimatedCost['min']
                    ?? 1000
                ),

                'max' => (float) (
                    $estimatedCost['max']
                    ?? 3500
                ),

                'currency' => 'PHP',
            ],

            'professional_help' => [
                'recommended' => $recommended,

                'reason' => (string) (
                    $proHelp['reason']
                    ??
                    'Professional repair shop inspection is recommended for vehicle safety.'
                ),

                'severity' => strtoupper(
                    (string) (
                        $proHelp['severity']
                        ??
                        $proHelp['priority']
                        ??
                        $severity
                    )
                ),
            ],
        ];
    }

    /**
     * Rule-based fallback.
     */
    protected function generateRuleBasedFallback(
        array $vehicleInfo,
        string $userMessage,
        bool $hasMedia
    ): array {
        $vName = trim(
            ($vehicleInfo['brand'] ?? 'Vehicle') .
            ' ' .
            ($vehicleInfo['model'] ?? '')
        );

        if ($hasMedia) {
            return $this->buildDiagnosticFallback(
                $vehicleInfo,
                $userMessage,
                true
            );
        }

        return [
            'type' => 'conversation',
            'status' => 'conversation',
            'response' =>
                "Hi! I'm VehiCare AI, ready to help with your {$vName}. " .
                "You can ask me vehicle questions, maintenance advice, " .
                "or report unusual sounds, warning lights, or symptoms.",
        ];
    }

    /**
     * Diagnostic fallback.
     */
    protected function buildDiagnosticFallback(
        array $vehicleInfo,
        string $userMessage,
        bool $hasMedia
    ): array {
        $vName = trim(
            ($vehicleInfo['brand'] ?? 'Vehicle') .
            ' ' .
            ($vehicleInfo['model'] ?? '')
        );

        return [
            'type' => 'diagnostic',
            'status' => 'needs_clarification',
            'confidence' => 'INSUFFICIENT',

            'summary' =>
                "The reported symptoms for your {$vName} require additional information or component inspection.",

            'reported' => $userMessage !== ''
                ? [$userMessage]
                : [],

            'observed' => [],

            'severity' => 'MODERATE',

            'urgency' =>
                'Further inspection is recommended before making a repair decision.',

            'possible_causes' => [
                [
                    'cause' => 'Component inspection required',
                    'likelihood' => 'MODERATE',
                    'reason' =>
                        'Gemini AI was temporarily unavailable, so a definitive diagnosis cannot be made safely.',
                ],
            ],

            'recommended_actions' => [
                'Do not continue operating the vehicle if the symptom is severe.',
                'Check the relevant visible components if it is safe to do so.',
                'Consult a certified technician if the problem persists.',
            ],

            'clarification_questions' => [
                'When exactly does the symptom occur?',
                'Did this problem start suddenly or gradually?',
            ],

            'estimated_cost' => [
                'min' => 1000,
                'max' => 3500,
                'currency' => 'PHP',
            ],

            'professional_help' => [
                'recommended' => false,
                'reason' =>
                    'Professional inspection may be required if the symptom continues.',
                'severity' => 'MODERATE',
            ],
        ];
    }

    /**
     * Clean base64 media.
     */
    protected function cleanBase64Image(
        string $imageBase64
    ): ?string {
        $imageBase64 = trim($imageBase64);

        if ($imageBase64 === '') {
            return null;
        }

        /*
         * Remove data URI prefix.
         */
        $imageBase64 = preg_replace(
            '/^data:[^;]+;base64,/i',
            '',
            $imageBase64
        );

        /*
         * Remove whitespace.
         */
        $imageBase64 = preg_replace(
            '/\s+/',
            '',
            $imageBase64
        );

        /*
         * Validate actual base64.
         */
        if (
            base64_decode(
                $imageBase64,
                true
            ) === false
        ) {
            Log::warning(
                '[Gemini] Invalid base64 media supplied.'
            );

            return null;
        }

        return $imageBase64;
    }

    /**
     * Normalize media MIME type.
     */
    protected function normalizeMediaMimeType(
        ?string $mime
    ): string {
        $mime = strtolower(
            trim((string) $mime)
        );

        $allowed = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/webp',
            'image/heic',
            'image/heif',

            'video/mp4',
            'video/quicktime',
            'video/x-m4v',
            'video/3gpp',

            'audio/mp4',
            'audio/m4a',
            'audio/aac',
            'audio/wav',
            'audio/mp3',
            'audio/mpeg',
            'audio/ogg',
            'audio/3gpp',
        ];

        if (
            in_array(
                $mime,
                $allowed,
                true
            )
        ) {
            return $mime === 'image/jpg'
                ? 'image/jpeg'
                : $mime;
        }

        if (
            str_starts_with(
                $mime,
                'audio/'
            )
        ) {
            return 'audio/mp4';
        }

        return 'image/jpeg';
    }
}