<?php

namespace App\Services;

class SymptomNormalizationService
{
    /**
     * High-risk terms and dangerous conditions that MUST bypass cache.
     */
    protected array $highRiskKeywords = [
        'brake failure', 'brakes failed', 'no brakes', 'brakes not working', 'nawalan ng preno', 'walang preno', 'nawawalan ng preno',
        'fuel leak', 'gasoline leak', 'gas leak', 'major oil leak', 'tumatagas na gasolina', 'tumatagas na langis', 'leaking fuel',
        'overheating', 'severe overheating', 'mainit na mainit', 'kumukulo ang tubig', 'sumasabog ang radiator',
        'engine fire', 'fire', 'sunog', 'nasusunog',
        'smoke', 'white smoke', 'black smoke', 'blue smoke', 'usok', 'mausok', 'mabilis ang usok',
        'burning smell', 'burning electrical', 'amoy sunog', 'amoy wiring', 'electrical smell',
        'loss of steering', 'steering failed', 'matigas ang manibela', 'hindi maliko',
    ];

    /**
     * Map symptoms to deterministic symptom keys.
     */
    public function normalize(string $symptoms, array $vehicleInfo = []): ?string
    {
        $clean = $this->cleanText($symptoms);

        if (empty($clean)) {
            return null;
        }

        // 1. High-risk safety check (Return null to force Gemini API call)
        if ($this->isHighRisk($clean)) {
            return null;
        }

        // 2. Check for multiple distinct symptoms (Complex cases bypass cache)
        if ($this->isMultiSymptomComplex($clean)) {
            return null;
        }

        // 3. Pattern Matching (Order by specificity)
        
        // A. Starting Problem + Clicking Sound
        if ($this->matchesAny($clean, ['click', 'clicking', 'ticking', 'tiktik', 'tik tik', 'nagki-click', 'nagkiclick']) &&
            $this->matchesAny($clean, ['start', 'starting', 'starter', 'ini-start', 'inistart', 'mag-start', 'magstart', 'press starter'])) {
            return 'starting_problem|clicking_sound';
        }

        // B. Starting Problem - General No Start
        if ($this->matchesAny($clean, ["won't start", 'wont start', 'no start', 'ayaw mag-start', 'ayaw magstart', 'ayaw aandar', 'ayaw umandar', 'hindi gumagana ang starter', 'cranking but no start', 'cannot start'])) {
            return 'starting_problem|no_start';
        }

        // C. Starting Problem - Hard Starting
        if ($this->matchesAny($clean, ['hard start', 'hard starting', 'mahirap i-start', 'mahirap istart', 'matagal bago mag-start', 'matagal bago magstart', 'delayed start'])) {
            return 'starting_problem|hard_start';
        }

        // D. Battery Weak
        if ($this->matchesAny($clean, ['battery weak', 'weak battery', 'low battery', 'drained battery', 'mahinang baterya', 'mahina baterya', 'drained ang baterya', 'dead battery', 'batt weak'])) {
            return 'battery|weak';
        }

        // E. Electrical - Dim Lights / Weak Horn
        if ($this->matchesAny($clean, ['dim light', 'dim lights', 'mahinang ilaw', 'mahina ang ilaw', 'mahinang busina', 'mahina busina', 'dim headlights', 'weak horn', 'flickering lights'])) {
            return 'electrical|dim_lights_horn';
        }

        // F. Brakes - Squeaking / Screeching (Non-failure)
        if ($this->matchesAny($clean, ['squeaking', 'squeal', 'screeching', 'maingay na preno', 'tunog sa preno', ' brake noise', 'brakes noise', 'squicky', 'squiking']) &&
            $this->matchesAny($clean, ['brake', 'brakes', 'preno'])) {
            return 'brakes|squeaking';
        }

        // G. Engine - Squealing Belt
        if ($this->matchesAny($clean, ['squealing belt', 'belt noise', 'maingay na belt', 'squeaking belt', 'serpentine belt noise', 'tunog sa belt'])) {
            return 'engine|squealing_belt';
        }

        // H. Engine - Knocking / Metallic Sound
        if ($this->matchesAny($clean, ['engine knocking', 'knocking sound', 'knocking noise', 'kalampag sa makina', 'tok tok sound', 'rod knock', 'toktok sa makina'])) {
            return 'engine|knocking';
        }

        // I. Engine - Stalling
        if ($this->matchesAny($clean, ['stalling', 'stalls', 'namamatay ang makina', 'namamatay habang umaandar', 'namamatay sa idle', 'engine dies'])) {
            return 'engine|stalling';
        }

        // J. Engine - Weak Acceleration / Loss of Power
        if ($this->matchesAny($clean, ['weak acceleration', 'loss of power', 'walang hatak', 'mahinang hatak', 'mabagal umabante', 'lagging acceleration', 'kapa ang hatak'])) {
            return 'engine|weak_acceleration';
        }

        // K. Wheels - Flat Tire
        if ($this->matchesAny($clean, ['flat tire', 'flat tyre', 'nabutas ang gulong', 'flat gulong', 'pudpud na gulong'])) {
            return 'wheels|flat_tire';
        }

        // Unclassified / Custom symptom pattern -> return null to let Gemini analyze
        return null;
    }

    /**
     * Clean and normalize raw symptom string.
     */
    protected function cleanText(string $text): string
    {
        $text = mb_strtolower($text);
        // Remove URLs and HTML tags
        $text = preg_replace('/https?:\/\/\S+/i', '', $text);
        // Replace non-alphanumeric punctuation with single space
        $text = preg_replace('/[^\p{L}\p{N}\s]/u', ' ', $text);
        // Collapse whitespace
        $text = preg_replace('/\s+/', ' ', $text);
        return trim($text);
    }

    /**
     * Check if symptom contains high-risk / dangerous keywords.
     */
    public function isHighRisk(string $cleanText): bool
    {
        foreach ($this->highRiskKeywords as $keyword) {
            if (str_contains($cleanText, $keyword)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if request contains multiple distinct symptom categories simultaneously.
     */
    protected function isMultiSymptomComplex(string $text): bool
    {
        $categoryMatches = 0;

        if ($this->matchesAny($text, ['brake', 'brakes', 'preno'])) $categoryMatches++;
        if ($this->matchesAny($text, ['overheat', 'init', 'radiator'])) $categoryMatches++;
        if ($this->matchesAny($text, ['transmission', 'kambiyo', 'clutch', 'gears'])) $categoryMatches++;
        if ($this->matchesAny($text, ['steering', 'manibela', 'suspension', 'kabig'])) $categoryMatches++;
        if ($this->matchesAny($text, ['oil', 'langis', 'fluid', 'tumatagas'])) $categoryMatches++;

        return $categoryMatches >= 2;
    }

    /**
     * Helper to match any of the substrings in clean text.
     */
    protected function matchesAny(string $text, array $needles): bool
    {
        foreach ($needles as $needle) {
            if (str_contains($text, strtolower($needle))) {
                return true;
            }
        }
        return false;
    }
}
