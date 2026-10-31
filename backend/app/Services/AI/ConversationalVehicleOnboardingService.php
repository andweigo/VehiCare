<?php

namespace App\Services\AI;

class ConversationalVehicleOnboardingService
{
    /**
     * Known automotive, motorcycle, and bicycle brands mapped to their canonical casing and default type.
     */
    protected const KNOWN_BRANDS = [
        'toyota' => ['name' => 'Toyota', 'default_type' => 'Car'],
        'mitsubishi' => ['name' => 'Mitsubishi', 'default_type' => 'Car'],
        'ford' => ['name' => 'Ford', 'default_type' => 'Car'],
        'nissan' => ['name' => 'Nissan', 'default_type' => 'Car'],
        'hyundai' => ['name' => 'Hyundai', 'default_type' => 'Car'],
        'kia' => ['name' => 'Kia', 'default_type' => 'Car'],
        'mazda' => ['name' => 'Mazda', 'default_type' => 'Car'],
        'isuzu' => ['name' => 'Isuzu', 'default_type' => 'Car'],
        'subaru' => ['name' => 'Subaru', 'default_type' => 'Car'],
        'chevrolet' => ['name' => 'Chevrolet', 'default_type' => 'Car'],
        'geely' => ['name' => 'Geely', 'default_type' => 'Car'],
        'mg' => ['name' => 'MG', 'default_type' => 'Car'],
        'byd' => ['name' => 'BYD', 'default_type' => 'Car'],
        'chery' => ['name' => 'Chery', 'default_type' => 'Car'],
        'changan' => ['name' => 'Changan', 'default_type' => 'Car'],
        'foton' => ['name' => 'Foton', 'default_type' => 'Car'],
        'gac' => ['name' => 'GAC', 'default_type' => 'Car'],
        'jetour' => ['name' => 'Jetour', 'default_type' => 'Car'],
        'lexus' => ['name' => 'Lexus', 'default_type' => 'Car'],
        'mercedes-benz' => ['name' => 'Mercedes-Benz', 'default_type' => 'Car'],
        'mercedes' => ['name' => 'Mercedes-Benz', 'default_type' => 'Car'],
        'audi' => ['name' => 'Audi', 'default_type' => 'Car'],
        'volkswagen' => ['name' => 'Volkswagen', 'default_type' => 'Car'],
        'peugeot' => ['name' => 'Peugeot', 'default_type' => 'Car'],
        'volvo' => ['name' => 'Volvo', 'default_type' => 'Car'],
        'jeep' => ['name' => 'Jeep', 'default_type' => 'Car'],
        'tesla' => ['name' => 'Tesla', 'default_type' => 'Car'],
        'honda' => ['name' => 'Honda', 'default_type' => null], // Makes both Cars & Motorcycles
        'suzuki' => ['name' => 'Suzuki', 'default_type' => null], // Makes both Cars & Motorcycles
        'bmw' => ['name' => 'BMW', 'default_type' => null],
        'yamaha' => ['name' => 'Yamaha', 'default_type' => 'Motorcycle'],
        'kawasaki' => ['name' => 'Kawasaki', 'default_type' => 'Motorcycle'],
        'vespa' => ['name' => 'Vespa', 'default_type' => 'Motorcycle'],
        'kymco' => ['name' => 'Kymco', 'default_type' => 'Motorcycle'],
        'sym' => ['name' => 'SYM', 'default_type' => 'Motorcycle'],
        'bristol' => ['name' => 'Bristol', 'default_type' => 'Motorcycle'],
        'cfmoto' => ['name' => 'CFMoto', 'default_type' => 'Motorcycle'],
        'rusi' => ['name' => 'Rusi', 'default_type' => 'Motorcycle'],
        'motorstar' => ['name' => 'MotorStar', 'default_type' => 'Motorcycle'],
        'skygo' => ['name' => 'Skygo', 'default_type' => 'Motorcycle'],
        'ducati' => ['name' => 'Ducati', 'default_type' => 'Motorcycle'],
        'ktm' => ['name' => 'KTM', 'default_type' => 'Motorcycle'],
        'triumph' => ['name' => 'Triumph', 'default_type' => 'Motorcycle'],
        'royal enfield' => ['name' => 'Royal Enfield', 'default_type' => 'Motorcycle'],
        'harley-davidson' => ['name' => 'Harley-Davidson', 'default_type' => 'Motorcycle'],
        'harley' => ['name' => 'Harley-Davidson', 'default_type' => 'Motorcycle'],
        'aprilia' => ['name' => 'Aprilia', 'default_type' => 'Motorcycle'],
        'benelli' => ['name' => 'Benelli', 'default_type' => 'Motorcycle'],
        'QJMotor' => ['name' => 'QJMotor', 'default_type' => 'Motorcycle'],
        'giant' => ['name' => 'Giant', 'default_type' => 'Bicycle'],
        'trek' => ['name' => 'Trek', 'default_type' => 'Bicycle'],
        'specialized' => ['name' => 'Specialized', 'default_type' => 'Bicycle'],
        'merida' => ['name' => 'Merida', 'default_type' => 'Bicycle'],
        'trinx' => ['name' => 'Trinx', 'default_type' => 'Bicycle'],
        'cannondale' => ['name' => 'Cannondale', 'default_type' => 'Bicycle'],
        'bianchi' => ['name' => 'Bianchi', 'default_type' => 'Bicycle'],
        'polygon' => ['name' => 'Polygon', 'default_type' => 'Bicycle'],
        'foxter' => ['name' => 'Foxter', 'default_type' => 'Bicycle'],
        'mountainpeak' => ['name' => 'Mountainpeak', 'default_type' => 'Bicycle'],
        'sunpeed' => ['name' => 'Sunpeed', 'default_type' => 'Bicycle'],
    ];

    protected const MOTORCYCLE_MODEL_HINTS = [
        'click', 'beat', 'pcx', 'adv', 'tmx', 'wave', 'xrm', 'rs125', 'rs 125', 'winner', 'airblade', 'dio', 'cbr', 'cb150', 'cb400', 'cb500', 'cb650', 'crf', 'xr150',
        'nmax', 'aerox', 'mio', 'sniper', 'fazzio', 'gravis', 'sight', 'yzf', 'r15', 'r3', 'mt-15', 'mt15', 'mt-03', 'mt-07', 'mt-09', 'xmax', 'tmax', 'xtz', 'serow',
        'burgman', 'raider', 'smash', 'skydrive', 'avenis', 'gixxer', 'gsx', 'v-strom',
        'ninja', 'z400', 'z650', 'z900', 'z1000', 'versys', 'klx', 'barako', 'rouser', 'dominar',
    ];

    protected const CAR_MODEL_HINTS = [
        'vios', 'fortuner', 'hilux', 'innova', 'wigo', 'avanza', 'veloz', 'raize', 'yaris', 'corolla', 'altis', 'camry', 'hiace', 'rush', 'land cruiser', 'alphard',
        'civic', 'city', 'cr-v', 'crv', 'br-v', 'brv', 'hr-v', 'hrv', 'brio', 'jazz', 'accord', 'odyssey', 'pilot',
        'montero', 'xpander', 'mirage', 'g4', 'strada', 'triton', 'l300', 'pajero',
        'ranger', 'everest', 'territory', 'mustang', 'ecosport', 'raptor',
        'navara', 'terra', 'almera', 'urvan', 'kicks', 'patrol', 'livina',
        'ertiga', 'swift', 'jimny', 'celerio', 'dzire', 's-presso', 'spresso', 'xl7', 'apv', 'carry',
        'tucson', 'staria', 'stargazer', 'creta', 'accent', 'reina', 'santa fe', 'palisade',
        'soluto', 'stonic', 'seltos', 'sonet', 'carnival', 'sportage', 'picanto',
        'd-max', 'dmax', 'mu-x', 'mux', 'traviz',
        'coolray', 'okavango', 'azkarra', 'emgrand',
    ];

    /**
     * Determine whether the user's current message explicitly initiates adding a new vehicle.
     */
    public function isAddVehicleIntent(string $message): bool
    {
        $clean = strtolower(trim($message));
        if ($clean === '') {
            return false;
        }

        // Direct English and Tagalog/Taglish patterns for adding/registering a vehicle
        $patterns = [
            '/\b(?:add|register|create|set\s*up|setup|enroll)\s+(?:a\s+|an\s+|my\s+|another\s+|new\s+|second\s+|third\s+)*(?:new\s+|another\s+)*(?:vehicle|car|motorcycle|motorbike|motor|scooter|bicycle|bike|suv|sedan|truck|pickup|van|profile|sasakyan|kotse|motorsiklo)\b/i',
            '/\b(?:can\s+you|could\s+you|please|help\s+me|i\s+want\s+to|i\'d\s+like\s+to|want\s+to|how\s+to|how\s+can\s+i|let\s+me)\s+(?:add|register|create)\s+(?:a\s+|an\s+|my\s+|another\s+|new\s+)*(?:vehicle|car|motorcycle|motor|scooter|bicycle|bike|sasakyan|kotse|\d{4}\s+[a-z]+)/i',
            '/\b(?:add|register)\s+my\s+(?:\d{4}\s+)?[a-z0-9]+/i',
            '/\b(?:mag\s*-?\s*add|magdagdag|dagdag|mag\s*-?\s*register|i-?add)\s+(?:ako\s+)?(?:ng\s+)?(?:bagong\s+|isa\s+pang\s+)?(?:vehicle|sasakyan|kotse|motor|motorsiklo|bike|bicycle)\b/i',
            '/\b(?:new\s+vehicle\s+profile|add\s+to\s+my\s+garage|add\s+vehicle\s+thru\s+chat|add\s+vehicle\s+through\s+chat)\b/i',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $clean)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Determine whether the conversation history is currently in an active Add-Vehicle onboarding flow.
     */
    public function isAddVehicleFlowContinuation(string $message, array $history): bool
    {
        if (empty($history)) {
            return false;
        }

        $clean = strtolower(trim($message));
        if ($clean === '' || $this->isCancelIntent($clean)) {
            return false;
        }

        // Do not hijack explicit symptom reports
        if (preg_match('/\b(knocking|squealing|squeaking|grinding|overheating|stalling|leaking|wont\s+start|won\'t\s+start|check\s+engine|warning\s+light|smoke|vibrating|misfire)\b/i', $clean)) {
            return false;
        }

        // Inspect the last assistant message in history
        $lastAssistantText = null;
        for ($i = count($history) - 1; $i >= 0; $i--) {
            $role = strtolower((string) ($history[$i]['role'] ?? $history[$i]['sender'] ?? ''));
            if ($role === 'assistant' || $role === 'ai') {
                $lastAssistantText = (string) ($history[$i]['content'] ?? $history[$i]['text'] ?? '');
                break;
            }
        }

        if ($lastAssistantText === null || trim($lastAssistantText) === '') {
            return false;
        }

        $onboardingMarkers = [
            'add a new vehicle to your garage',
            'register it right here in chat',
            'to finish adding your vehicle',
            'prepared your new vehicle profile',
            'add this vehicle to your garage',
            'magdagdag ng bagong sasakyan sa iyong garage',
            'ma-add ang sasakyan mo sa iyong garage',
            'naihanda ko na ang iyong bagong vehicle profile',
            'what year model is your',
            'anong year model ng iyong',
            'what brand and model is the',
            'please provide the remaining details to add your vehicle',
        ];

        $lowerAssistant = strtolower($lastAssistantText);
        foreach ($onboardingMarkers as $marker) {
            if (str_contains($lowerAssistant, $marker)) {
                return true;
            }
        }

        return false;
    }

    public function isCancelIntent(string $message): bool
    {
        return (bool) preg_match('/^(cancel|stop|never\s*mind|abort|quit|exit|wag\s+na|huwag\s+na|ayoko\s+na)\b/i', trim($message));
    }

    public function isAffirmativeConfirmation(string $message): bool
    {
        return (bool) preg_match('/^(yes|yep|yeah|confirm|confirmed|yes\s+please|sure|ok|okay|go\s+ahead|proceed|save|save\s+it|add\s+it|do\s+it|oo|opo|sige|tama|go)\s*[.!]*$/i', trim($message));
    }

    /**
     * Handle the conversational vehicle onboarding turn deterministically.
     * Returns an analysis array compatible with DiagnosticController@store, or null if not applicable.
     */
    public function handleTurn(
        string $userMessage,
        array $history,
        array $entitlements,
        string $language = 'en'
    ): ?array {
        $isStarter = $this->isAddVehicleIntent($userMessage);
        $isContinuation = !$isStarter && $this->isAddVehicleFlowContinuation($userMessage, $history);

        if (!$isStarter && !$isContinuation) {
            return null;
        }

        $plan = strtolower((string) ($entitlements['plan'] ?? 'free'));
        $vehicleCount = (int) ($entitlements['vehicle_count'] ?? 1);
        $vehicleAllowance = (int) ($entitlements['vehicle_allowance'] ?? ($plan === 'premium' ? 5 : 1));

        // 1. FREE PLAN RESTRICTION: Immediately inform the user they cannot add a new vehicle on Free mode
        if ($plan !== 'premium') {
            return [
                'type' => 'conversation',
                'status' => 'conversation',
                'upgrade_required' => true,
                'out_of_scope' => false,
                'response' => $this->buildFreePlanRestrictionMessage($language),
            ];
        }

        // 2. PREMIUM PLAN AT FULL CAPACITY (5/5 vehicles)
        if ($vehicleCount >= $vehicleAllowance) {
            return [
                'type' => 'conversation',
                'status' => 'conversation',
                'out_of_scope' => false,
                'response' => $this->buildPremiumLimitFullMessage($language, $vehicleCount, $vehicleAllowance),
            ];
        }

        // 3. Collect all user messages that belong to the current add-vehicle onboarding session
        $sessionUserInputs = $this->collectOnboardingUserInputs($userMessage, $history, $isStarter);

        // 4. Extract and validate vehicle fields across the collected inputs
        $extracted = $this->extractVehicleDetails($sessionUserInputs);

        // Check if the last assistant message already presented the confirmation summary and user replied "yes"/"confirm"
        $lastAssistantText = $this->getLastAssistantMessage($history);
        $awaitingConfirmation = $lastAssistantText !== null && (
            str_contains(strtolower($lastAssistantText), 'prepared your new vehicle profile')
            || str_contains(strtolower($lastAssistantText), 'naihanda ko na ang iyong bagong vehicle profile')
        );

        if (
            $awaitingConfirmation
            && $this->isAffirmativeConfirmation($userMessage)
            && !empty($extracted['vehicle_type'])
            && !empty($extracted['brand'])
            && !empty($extracted['model'])
            && !empty($extracted['year'])
            && empty($extracted['year_error'])
            && empty($extracted['vin_error'])
        ) {
            $params = [
                'vehicle_type' => $extracted['vehicle_type'],
                'brand' => $extracted['brand'],
                'model' => $extracted['model'],
                'year' => (int) $extracted['year'],
                'vin' => $extracted['vin'] ?: null,
                'model_number' => $extracted['vin'] ?: null,
                'set_active' => true,
            ];

            return [
                'type' => 'action_proposal',
                'status' => 'action_proposal',
                'action' => 'create_vehicle',
                'parameters' => $params,
                'requires_confirmation' => false, // Execute immediately on backend since user explicitly confirmed!
                'confirmation_summary' => $this->buildConfirmationSummary($params, $language),
                'response' => $this->buildConfirmedExecutionMessage($params, $language),
            ];
        }

        // 5. If user provided an invalid year or invalid VIN, explain it in a friendly way
        if (!empty($extracted['year_error'])) {
            return [
                'type' => 'conversation',
                'status' => 'conversation',
                'response' => $this->buildValidationErrorPrompt($extracted, 'year', $language),
            ];
        }

        if (!empty($extracted['vin_error'])) {
            return [
                'type' => 'conversation',
                'status' => 'conversation',
                'response' => $this->buildValidationErrorPrompt($extracted, 'vin', $language),
            ];
        }

        // 6. Check if all 4 required fields (vehicle_type, brand, model, year) are present
        $missing = [];
        if (empty($extracted['vehicle_type'])) {
            $missing[] = 'vehicle_type';
        }
        if (empty($extracted['brand'])) {
            $missing[] = 'brand';
        }
        if (empty($extracted['model'])) {
            $missing[] = 'model';
        }
        if (empty($extracted['year'])) {
            $missing[] = 'year';
        }

        if (empty($missing)) {
            $params = [
                'vehicle_type' => $extracted['vehicle_type'],
                'brand' => $extracted['brand'],
                'model' => $extracted['model'],
                'year' => (int) $extracted['year'],
                'vin' => $extracted['vin'] ?: null,
                'model_number' => $extracted['vin'] ?: null,
                'set_active' => true,
            ];

            return [
                'type' => 'action_proposal',
                'status' => 'action_proposal',
                'action' => 'create_vehicle',
                'parameters' => $params,
                'requires_confirmation' => true,
                'confirmation_summary' => $this->buildConfirmationSummary($params, $language),
                'response' => $this->buildProposalMessage($params, $language),
            ];
        }

        // 7. If this is the very first message and no fields were given yet, show the friendly welcome & checklist
        if (count($missing) === 4) {
            return [
                'type' => 'conversation',
                'status' => 'conversation',
                'response' => $this->buildInitialOnboardingPrompt($language, $vehicleCount, $vehicleAllowance),
            ];
        }

        // 8. Otherwise, acknowledge the fields already provided and ask only for the missing ones!
        return [
            'type' => 'conversation',
            'status' => 'conversation',
            'response' => $this->buildFollowUpMissingFieldsPrompt($extracted, $missing, $language),
        ];
    }

    /**
     * Collect user messages belonging to the current add-vehicle onboarding session.
     */
    protected function collectOnboardingUserInputs(string $currentMessage, array $history, bool $isStarter): array
    {
        if ($isStarter && empty($history)) {
            return [$currentMessage];
        }

        $inputs = [];
        $inFlow = false;

        foreach ($history as $turn) {
            $role = strtolower((string) ($turn['role'] ?? $turn['sender'] ?? ''));
            $text = trim((string) ($turn['content'] ?? $turn['text'] ?? ''));
            if ($text === '') {
                continue;
            }

            if ($role === 'user') {
                if ($this->isAddVehicleIntent($text)) {
                    $inFlow = true;
                    $inputs = [$text]; // Start fresh from the latest add-vehicle request
                } elseif ($inFlow) {
                    $inputs[] = $text;
                }
            } elseif ($role === 'assistant' || $role === 'ai') {
                $lower = strtolower($text);
                if (
                    str_contains($lower, 'add a new vehicle to your garage')
                    || str_contains($lower, 'to finish adding your vehicle')
                    || str_contains($lower, 'prepared your new vehicle profile')
                    || str_contains($lower, 'magdagdag ng bagong sasakyan sa iyong garage')
                    || str_contains($lower, 'ma-add ang sasakyan mo sa iyong garage')
                    || str_contains($lower, 'naihanda ko na ang iyong bagong vehicle profile')
                ) {
                    $inFlow = true;
                } elseif (str_contains($lower, 'added to your garage') || str_contains($lower, 'action cancelled')) {
                    $inFlow = false;
                    $inputs = [];
                }
            }
        }

        $inputs[] = $currentMessage;
        return $inputs;
    }

    protected function getLastAssistantMessage(array $history): ?string
    {
        for ($i = count($history) - 1; $i >= 0; $i--) {
            $role = strtolower((string) ($history[$i]['role'] ?? $history[$i]['sender'] ?? ''));
            if ($role === 'assistant' || $role === 'ai') {
                return (string) ($history[$i]['content'] ?? $history[$i]['text'] ?? '');
            }
        }
        return null;
    }

    /**
     * Extract vehicle_type, brand, model, year, and vin from the accumulated user inputs.
     */
    public function extractVehicleDetails(array $inputs): array
    {
        $vehicleType = null;
        $brand = null;
        $model = null;
        $year = null;
        $yearError = null;
        $vin = null;
        $vinError = null;

        $maxValidYear = (int) date('Y') + 1;

        foreach ($inputs as $rawInput) {
            $text = trim($rawInput);
            if ($text === '' || $this->isAffirmativeConfirmation($text)) {
                continue;
            }

            $lower = strtolower($text);

            // 1. Check if user explicitly skipped VIN
            if (preg_match('/^(none|no\s*vin|skip|n\/a|na|wala|walang\s*vin|pass)$/i', $text)) {
                $vinError = null;
                continue;
            }

            // 2. Check for explicit VIN label or 17-char candidate
            if (preg_match('/\bvin\s*(?:is|:|-|=)?\s*([a-z0-9]{5,25})\b/i', $text, $vinMatch)) {
                $candidateVin = strtoupper($vinMatch[1]);
                if (preg_match('/^[A-HJ-NPR-Z0-9]{17}$/', $candidateVin)) {
                    $vin = $candidateVin;
                    $vinError = null;
                } else {
                    $vinError = $candidateVin;
                }
                $text = str_replace($vinMatch[0], ' ', $text);
                $lower = strtolower($text);
            } elseif (preg_match('/\b([A-HJ-NPR-Z0-9]{17})\b/i', $text, $standaloneVin)) {
                $candidateVin = strtoupper($standaloneVin[1]);
                if (preg_match('/[A-Z]/', $candidateVin) && preg_match('/[0-9]/', $candidateVin)) {
                    $vin = $candidateVin;
                    $vinError = null;
                    $text = str_replace($standaloneVin[0], ' ', $text);
                    $lower = strtolower($text);
                }
            }

            // 3. Extract Vehicle Type
            if (preg_match('/\b(motorcycle|motorbike|scooter|underbone|big\s*bike|moped|tricycle|motorsiklo|two-wheeler|2-wheeler)\b/i', $lower)) {
                $vehicleType = 'Motorcycle';
            } elseif (preg_match('/\b(bicycle|mountain\s*bike|mtb|road\s*bike|bmx|folding\s*bike|gravel\s*bike|fixie|bisikleta)\b/i', $lower)) {
                $vehicleType = 'Bicycle';
            } elseif (preg_match('/\b(car|sedan|suv|hatchback|pickup|pick-up|mpv|crossover|coupe|wagon|auv|kotse|four-wheeler|4-wheeler)\b/i', $lower)) {
                $vehicleType = 'Car';
            } elseif (preg_match('/\b(motor)\b/i', $lower) && !preg_match('/\bmotor\s+oil\b/i', $lower)) {
                $vehicleType = 'Motorcycle';
            }

            // 4. Extract 4-digit Year
            if (preg_match_all('/\b(\d{4})\b/', $text, $yearMatches)) {
                foreach ($yearMatches[1] as $numStr) {
                    $num = (int) $numStr;
                    if ($num >= 1950 && $num <= $maxValidYear) {
                        $year = $num;
                        $yearError = null;
                    } elseif ($num >= 1800 && $num <= 2100) {
                        $yearError = $numStr;
                    }
                }
            }

            // 5. Explicit labeled fields (e.g. "Brand: Toyota, Model: Vios")
            if (preg_match('/\b(?:brand|make)\s*(?:is|:|-|=)\s*([a-zA-Z0-9\-\s]{2,25}?)(?:,|\.|;|\band\b|\bmodel\b|\byear\b|\btype\b|$)/i', $text, $brandLabelMatch)) {
                $candidateBrand = trim($brandLabelMatch[1]);
                if ($candidateBrand !== '') {
                    $brand = $this->normalizeBrandName($candidateBrand);
                }
            }
            if (preg_match('/\bmodel\s*(?:is|:|-|=)\s*([a-zA-Z0-9\-\s]{1,30}?)(?:,|\.|;|\band\b|\bbrand\b|\byear\b|\btype\b|\bvin\b|$)/i', $text, $modelLabelMatch)) {
                $candidateModel = trim($modelLabelMatch[1]);
                if ($candidateModel !== '' && !preg_match('/^(year|is|number)$/i', $candidateModel)) {
                    $model = $this->formatModelName($candidateModel);
                }
            }

            // 6. Match Known Brands & Infer Model / Type
            foreach (self::KNOWN_BRANDS as $brandKey => $brandMeta) {
                if (preg_match('/\b' . preg_quote($brandKey, '/') . '\b/i', $lower, $bMatch, PREG_OFFSET_CAPTURE)) {
                    $brand = $brandMeta['name'];
                    if ($vehicleType === null && $brandMeta['default_type'] !== null) {
                        $vehicleType = $brandMeta['default_type'];
                    }

                    // Extract the words immediately following the brand as the candidate model
                    $afterBrand = substr($text, $bMatch[0][1] + strlen($bMatch[0][0]));
                    $candidateModel = $this->cleanModelCandidate($afterBrand);
                    if ($candidateModel !== '') {
                        $model = $candidateModel;
                    }
                    break;
                }
            }

            // 7. Infer Vehicle Type from well-known Motorcycle or Car models
            foreach (self::MOTORCYCLE_MODEL_HINTS as $mHint) {
                if (preg_match('/\b' . preg_quote($mHint, '/') . '\b/i', $lower)) {
                    if ($vehicleType === null) {
                        $vehicleType = 'Motorcycle';
                    }
                    break;
                }
            }
            foreach (self::CAR_MODEL_HINTS as $cHint) {
                if (preg_match('/\b' . preg_quote($cHint, '/') . '\b/i', $lower)) {
                    if ($vehicleType === null) {
                        $vehicleType = 'Car';
                    }
                    break;
                }
            }

            // 8. Handle short single-field replies when brand or model is still missing
            $cleanedShort = $this->cleanFillerPhrases($text);
            if ($cleanedShort !== '') {
                $tokens = preg_split('/\s+/', $cleanedShort) ?: [];
                // E.g. user replied "Brand Model" for an unlisted/custom brand (like "BYD Sealion 6" or "Changan Alsvin")
                if ($brand === null && $model === null && count($tokens) >= 2 && count($tokens) <= 5) {
                    $firstToken = $tokens[0];
                    if (!preg_match('/^(add|register|create|vehicle|car|motorcycle|bicycle|my|new|please|want|help)$/i', $firstToken)) {
                        $brand = $this->normalizeBrandName($firstToken);
                        $model = $this->formatModelName(implode(' ', array_slice($tokens, 1)));
                    }
                } elseif ($brand !== null && $model === null && count($tokens) >= 1 && count($tokens) <= 4) {
                    // User already provided brand earlier and now replied with just the model name (e.g., "Click 160" or "Vios")
                    if (strtolower($cleanedShort) !== strtolower($brand)) {
                        $model = $this->formatModelName($cleanedShort);
                    }
                } elseif ($brand === null && count($tokens) === 1 && strlen($cleanedShort) >= 2) {
                    if (!preg_match('/^(add|register|create|vehicle|car|motorcycle|bicycle|motor|bike|scooter|sedan|suv|yes|no|ok|okay)$/i', $cleanedShort)) {
                        $brand = $this->normalizeBrandName($cleanedShort);
                    }
                }
            }
        }

        if ($vehicleType === 'Bicycle') {
            $vin = null;
            $vinError = null;
        }

        return [
            'vehicle_type' => $vehicleType,
            'brand' => $brand,
            'model' => $model,
            'year' => $year,
            'year_error' => $yearError,
            'vin' => $vin,
            'vin_error' => $vinError,
        ];
    }

    protected function cleanModelCandidate(string $afterBrand): string
    {
        $clean = preg_replace('/^[\s,:\-]+/', '', $afterBrand);
        // Stop at punctuation or clause boundaries
        $clean = preg_split('/[,;.\n]|\b(?:and|with|vin|year|type|which|that|please|for\s+me|to\s+my|in\s+my|sa\s+garage)\b/i', $clean)[0] ?? '';
        // Strip years (1950-2039) and vehicle type nouns
        $clean = preg_replace('/\b(19[5-9]\d|20[0-3]\d)\b/', ' ', $clean);
        $clean = preg_replace('/\b(car|motorcycle|motorbike|motor|scooter|bicycle|bike|sedan|suv|hatchback|pickup|mpv|van|truck|kotse|sasakyan|motorsiklo|model|brand)\b/i', ' ', $clean);
        $clean = trim(preg_replace('/\s+/', ' ', $clean));

        return $clean !== '' ? $this->formatModelName($clean) : '';
    }

    protected function cleanFillerPhrases(string $text): string
    {
        $clean = $text;
        $clean = preg_replace('/\b(i\s+want\s+to|i\'d\s+like\s+to|can\s+you|could\s+you|please|help\s+me|add|register|create|set\s*up|my|a|an|new|another|vehicle|profile|to\s+my\s+garage|thru\s+chat|through\s+chat|it\'s|its|it\s+is|ang|yung|po|naman|gusto\s+ko|mag\s*add|magdagdag|ng|sasakyan)\b/i', ' ', $clean);
        $clean = preg_replace('/\b(19[5-9]\d|20[0-3]\d)\b/', ' ', $clean);
        $clean = preg_replace('/\b(car|motorcycle|motorbike|motor|scooter|bicycle|bike|sedan|suv|hatchback|pickup|mpv|van|truck|kotse|motorsiklo|bisikleta)\b/i', ' ', $clean);
        $clean = preg_replace('/[^\w\s\-]/', ' ', $clean);
        return trim(preg_replace('/\s+/', ' ', $clean));
    }

    protected function normalizeBrandName(string $raw): string
    {
        $key = strtolower(trim($raw));
        if (isset(self::KNOWN_BRANDS[$key])) {
            return self::KNOWN_BRANDS[$key]['name'];
        }
        return ucwords(strtolower(trim($raw)));
    }

    protected function formatModelName(string $raw): string
    {
        $parts = preg_split('/\s+/', trim($raw)) ?: [];
        $formatted = array_map(function (string $word) {
            if (preg_match('/^(cr-v|br-v|hr-v|mu-x|d-max|pcx|adv|nmax|tmax|xmax|tmx|xrm|cbr|crf|klx|gsx|mtb|bmx|g4|xl7|apv|l300|r15|r3|z400|z650|z900|z1000)$/i', $word)) {
                return strtoupper($word);
            }
            return ucfirst($word);
        }, $parts);
        return implode(' ', $formatted);
    }

    protected function buildFreePlanRestrictionMessage(string $language): string
    {
        return match ($language) {
            'fil' => "Napansin kong nasa **Free Plan** ka ngayon. Sa Free Plan, limitado sa **1 sasakyan** ang iyong garage at hindi pa magagamit ang pagdadagdag ng bagong sasakyan sa pamamagitan ng chat.\n\nPara makapagrehistro ng hanggang **5 sasakyan** at ma-add ang mga ito nang direkta dito sa chat, mag-subscribe muna sa **VehiCare Premium**!",
            'taglish' => "Napansin ko na naka-**Free Plan** ka ngayon. Sa Free Plan, limited sa **1 registered vehicle** ang garage mo at hindi pa pwedeng mag-add ng bagong vehicle thru chat.\n\nPara makapag-add ng up to **5 vehicles** directly dito sa chat kasama ko, please subscribe muna sa **VehiCare Premium**!",
            default => "You are currently on the **Free Plan**, which is limited to **1 registered vehicle** and does not allow adding a new vehicle profile through chat.\n\nTo register up to **5 vehicles** and add them directly with me here in chat, please subscribe to **VehiCare Premium** first!",
        };
    }

    protected function buildPremiumLimitFullMessage(string $language, int $count, int $allowance): string
    {
        return match ($language) {
            'fil' => "Naabot mo na ang maximum na **{$allowance} sasakyan** ({$count}/{$allowance}) sa iyong **Premium Plan**. Mag-archive o mag-alis muna ng isang sasakyan sa **My Vehicles** bago magdagdag ng bago.",
            'taglish' => "Na-reach mo na ang maximum limit na **{$allowance} vehicles** ({$count}/{$allowance}) sa iyong **Premium Plan**. Pwedeng mag-archive o mag-remove muna ng existing vehicle sa **My Vehicles** para makapag-add ng bago.",
            default => "You have reached the maximum limit of **{$allowance} vehicles** ({$count}/{$allowance}) on your **Premium Plan**. Please archive or remove an existing vehicle in **My Vehicles** first before adding a new one.",
        };
    }

    protected function buildInitialOnboardingPrompt(string $language, int $count, int $allowance): string
    {
        return match ($language) {
            'fil' => "Ikagagalak kong tulungan kang magdagdag ng bagong sasakyan sa iyong garage! Dahil naka-**Premium Plan** ka ({$count} sa {$allowance} sasakyan ang nagamit), maaari natin itong irehistro dito mismo sa chat.\n\nPakibigay lang ang mga sumusunod na detalye:\n1. **Uri ng Sasakyan** (Car, Motorcycle, o Bicycle)\n2. **Brand / Make** (hal. Toyota, Honda, Yamaha)\n3. **Model** (hal. Vios, Click 160, NMAX)\n4. **Year** (4-digit na taon, hal. 2023)\n5. **VIN** *(opsyonal — 17 characters para sa kotse o motor)*\n\nMaaari mo itong ibigay nang sabay-sabay (hal. *\"2023 Honda Click 160 Motorcycle\"*) o isa-isa!",
            'taglish' => "I'd love to help you magdagdag ng bagong sasakyan sa iyong garage! Since naka-**Premium Plan** ka ({$count} of {$allowance} vehicles used), pwede natin itong i-register right here in chat.\n\nPara makapagsimula, please share the following details:\n1. **Vehicle Type** (Car, Motorcycle, o Bicycle)\n2. **Brand / Make** (e.g., Toyota, Honda, Yamaha)\n3. **Model** (e.g., Vios, Click 160, NMAX)\n4. **Year** (4-digit year, e.g., 2023)\n5. **VIN** *(optional — 17 characters para sa car o motorcycle)*\n\nPwede mong i-send lahat sa isang message (hal. *\"2023 Honda Click 160 Motorcycle\"*) o isa-isa!",
            default => "I'd be happy to help you add a new vehicle to your garage! Since you're on the **Premium Plan** ({$count} of {$allowance} vehicles used), we can register it right here in chat.\n\nTo get started, please share your vehicle's details:\n1. **Vehicle Type** (Car, Motorcycle, or Bicycle)\n2. **Brand / Make** (e.g., Toyota, Honda, Yamaha)\n3. **Model** (e.g., Vios, Click 160, NMAX)\n4. **Year** (4-digit year, e.g., 2023)\n5. **VIN** *(optional — 17-character Vehicle Identification Number)*\n\nYou can type them all at once (for example: *\"2023 Honda Click 160 Motorcycle\"*) or one by one!",
        };
    }

    protected function buildFollowUpMissingFieldsPrompt(array $extracted, array $missing, string $language): string
    {
        $capturedParts = [];
        if (!empty($extracted['vehicle_type'])) {
            $capturedParts[] = "**Type:** {$extracted['vehicle_type']}";
        }
        if (!empty($extracted['brand'])) {
            $capturedParts[] = "**Brand:** {$extracted['brand']}";
        }
        if (!empty($extracted['model'])) {
            $capturedParts[] = "**Model:** {$extracted['model']}";
        }
        if (!empty($extracted['year'])) {
            $capturedParts[] = "**Year:** {$extracted['year']}";
        }
        if (!empty($extracted['vin'])) {
            $capturedParts[] = "**VIN:** {$extracted['vin']}";
        }

        $capturedSummary = !empty($capturedParts) ? implode(' • ', $capturedParts) : '';

        $missingLabelsEn = [];
        $missingLabelsFil = [];
        foreach ($missing as $field) {
            if ($field === 'vehicle_type') {
                $missingLabelsEn[] = '**Vehicle Type** (Car, Motorcycle, or Bicycle)';
                $missingLabelsFil[] = '**Uri ng Sasakyan** (Car, Motorcycle, o Bicycle)';
            } elseif ($field === 'brand') {
                $missingLabelsEn[] = '**Brand / Make** (e.g., Toyota, Honda, Yamaha)';
                $missingLabelsFil[] = '**Brand / Make** (hal. Toyota, Honda, Yamaha)';
            } elseif ($field === 'model') {
                $missingLabelsEn[] = '**Model** (e.g., Vios, Click 160, NMAX)';
                $missingLabelsFil[] = '**Model** (hal. Vios, Click 160, NMAX)';
            } elseif ($field === 'year') {
                $missingLabelsEn[] = '**Year** (4-digit production year, e.g., 2023)';
                $missingLabelsFil[] = '**Year** (4-digit na taon, hal. 2023)';
            }
        }

        $listEn = implode(', ', $missingLabelsEn);
        $listFil = implode(', ', $missingLabelsFil);

        return match ($language) {
            'fil' => "Nakuha ko na ang detalye: {$capturedSummary}.\n\nPara ma-add ang sasakyan mo sa iyong garage, pakibigay na lang ang kulang na impormasyon: {$listFil}.",
            'taglish' => "Got it! Nakuha ko na ito: {$capturedSummary}.\n\nTo finish adding your vehicle sa iyong garage, please provide the remaining details: {$listEn}.",
            default => "Got it! Here is what I have so far: {$capturedSummary}.\n\nTo finish adding your vehicle to your garage, please provide the remaining detail(s): {$listEn}.",
        };
    }

    protected function buildValidationErrorPrompt(array $extracted, string $errorField, string $language): string
    {
        $maxYear = (int) date('Y') + 1;
        if ($errorField === 'year') {
            $badYear = $extracted['year_error'];
            return match ($language) {
                'fil' => "Ang taon na **{$badYear}** ay hindi valid. Para ma-add ang sasakyan mo sa iyong garage, pakibigay ang tamang 4-digit **Year** sa pagitan ng **1950** at **{$maxYear}**.",
                'taglish' => "Mukhang hindi valid ang year na **{$badYear}**. To finish adding your vehicle, please enter a valid 4-digit **Year** between **1950** and **{$maxYear}**.",
                default => "The year **{$badYear}** doesn't look right. To finish adding your vehicle to your garage, please provide a valid 4-digit **Year** between **1950** and **{$maxYear}**.",
            };
        }

        $badVin = $extracted['vin_error'];
        return match ($language) {
            'fil' => "Ang VIN na **{$badVin}** ay hindi valid. Ang **Vehicle Identification Number (VIN)** ay dapat eksaktong **17 alphanumeric characters** (walang letrang I, O, o Q). Pakilagay ang tamang 17-character VIN, o i-reply ang **\"skip\"** kung wala ito ngayon para ma-add ang sasakyan mo sa iyong garage.",
            'taglish' => "Ang VIN na **{$badVin}** ay hindi valid. Ang **Vehicle Identification Number (VIN)** ay dapat eksaktong **17 characters** (letters & numbers, excluding I, O, at Q). Please re-enter ang 17-character VIN o i-type ang **\"skip\"** to finish adding your vehicle.",
            default => "The VIN **{$badVin}** isn't valid. A standard **Vehicle Identification Number (VIN)** must be exactly **17 alphanumeric characters** (excluding the letters I, O, and Q). Please enter a valid 17-character VIN, or reply **\"skip\"** to continue adding your vehicle without a VIN.",
        };
    }

    protected function buildConfirmationSummary(array $params, string $language): string
    {
        $vinPart = !empty($params['vin']) ? " • VIN: {$params['vin']}" : '';
        return match ($language) {
            'fil' => "Idagdag ang {$params['year']} {$params['brand']} {$params['model']} ({$params['vehicle_type']}){$vinPart} sa iyong garage at gawing active vehicle.",
            default => "Add {$params['year']} {$params['brand']} {$params['model']} ({$params['vehicle_type']}){$vinPart} to your garage and set it as your active vehicle.",
        };
    }

    protected function buildProposalMessage(array $params, string $language): string
    {
        $vinLine = !empty($params['vin']) ? "\n• **VIN:** {$params['vin']}" : '';
        return match ($language) {
            'fil' => "Naihanda ko na ang iyong bagong vehicle profile:\n\n• **Uri ng Sasakyan:** {$params['vehicle_type']}\n• **Brand:** {$params['brand']}\n• **Model:** {$params['model']}\n• **Year:** {$params['year']}{$vinLine}\n\nPaki-tap ang **Confirm** sa ibaba (o mag-reply ng **Yes**) para ma-save ang sasakyan sa iyong garage!",
            'taglish' => "Naihanda ko na ang iyong bagong vehicle profile:\n\n• **Vehicle Type:** {$params['vehicle_type']}\n• **Brand:** {$params['brand']}\n• **Model:** {$params['model']}\n• **Year:** {$params['year']}{$vinLine}\n\nPlease tap **Confirm** sa ibaba (o mag-reply ng **Yes**) para ma-save ito sa iyong garage!",
            default => "I've prepared your new vehicle profile:\n\n• **Vehicle Type:** {$params['vehicle_type']}\n• **Brand:** {$params['brand']}\n• **Model:** {$params['model']}\n• **Year:** {$params['year']}{$vinLine}\n\nPlease tap **Confirm** below (or reply **Yes**) to add this vehicle to your garage!",
        };
    }

    protected function buildConfirmedExecutionMessage(array $params, string $language): string
    {
        return match ($language) {
            'fil' => "✅ Matagumpay na naidagdag ang **{$params['year']} {$params['brand']} {$params['model']} ({$params['vehicle_type']})** sa iyong garage at naitakda bilang iyong active vehicle!",
            'taglish' => "✅ Successfully added na ang **{$params['year']} {$params['brand']} {$params['model']} ({$params['vehicle_type']})** sa iyong garage at naka-set na bilang active vehicle mo!",
            default => "✅ Your **{$params['year']} {$params['brand']} {$params['model']} ({$params['vehicle_type']})** has been added to your garage and set as your active vehicle!",
        };
    }
}
