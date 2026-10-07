<?php

namespace App\Services;

use App\Models\AiDiagnosisCache;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class AIDiagnosticCacheService
{
    protected SymptomNormalizationService $normalizer;

    public function __construct(SymptomNormalizationService $normalizer)
    {
        $this->normalizer = $normalizer;
    }

    /**
     * Look up a valid cached diagnosis.
     */
    public function find(array $vehicleInfo, string $symptoms): ?array
    {
        if (!config('services.gemini_cache.enabled', true)) {
            Log::info('[AI Cache] Cache lookup disabled via config');
            return null;
        }

        // Clean & normalize symptom
        $symptomKey = $this->normalizer->normalize($symptoms, $vehicleInfo);

        if ($symptomKey === null) {
            if ($this->normalizer->isHighRisk(strtolower($symptoms))) {
                Log::info('[AI Cache] Cache BYPASS - high risk symptom pattern', ['symptoms' => $symptoms]);
            } else {
                Log::info('[AI Cache] Cache BYPASS - unknown or unclassified symptom', ['symptoms' => $symptoms]);
            }
            return null;
        }

        $vType = strtolower(trim((string) ($vehicleInfo['type'] ?? 'vehicle')));
        $vBrand = strtolower(trim((string) ($vehicleInfo['brand'] ?? 'generic')));
        $vModel = strtolower(trim((string) ($vehicleInfo['model'] ?? 'generic')));
        $vYear = strtolower(trim((string) ($vehicleInfo['year'] ?? 'generic')));
        $lang = strtolower(trim((string) ($vehicleInfo['preferred_language'] ?? 'en')));

        Log::info('[AI Cache] Cache lookup started', [
            'symptom_key' => $symptomKey,
            'vehicle' => "{$vType}/{$vBrand}/{$vModel}/{$vYear}",
            'language' => $lang,
        ]);

        // Request-level lock key to prevent duplicate simultaneous Gemini requests
        $lockKey = "gemini-diagnosis:{$vType}:{$vBrand}:{$vModel}:{$symptomKey}:{$lang}";

        return Cache::lock($lockKey, 15)->block(10, function () use ($vType, $vBrand, $vModel, $vYear, $symptomKey, $lang) {
            Log::info('[AI Cache] Lock acquired for cache lookup', ['symptom_key' => $symptomKey]);

            // Query matching active cache entry (exact vehicle match first)
            $cached = AiDiagnosisCache::active()
                ->where('symptom_key', $symptomKey)
                ->where('language', $lang)
                ->where('vehicle_type', $vType)
                ->where('brand', $vBrand)
                ->where('model', $vModel)
                ->first();

            // Fallback query matching vehicle_type + symptom_key + language
            if (!$cached) {
                $cached = AiDiagnosisCache::active()
                    ->where('symptom_key', $symptomKey)
                    ->where('language', $lang)
                    ->where('vehicle_type', $vType)
                    ->first();
            }

            if ($cached) {
                $cached->increment('hit_count');
                Log::info('[AI Cache] Cache HIT', [
                    'cache_id' => $cached->id,
                    'symptom_key' => $symptomKey,
                    'hit_count' => $cached->hit_count,
                    'vehicle' => "{$vType}/{$vBrand}/{$vModel}",
                    'language' => $lang,
                ]);

                $data = $cached->diagnosis_data;
                if (is_array($data)) {
                    $data['ai_source'] = 'cache';
                    return $data;
                }
            }

            Log::info('[AI Cache] Cache MISS', [
                'symptom_key' => $symptomKey,
                'vehicle' => "{$vType}/{$vBrand}/{$vModel}",
            ]);

            return null;
        });
    }

    /**
     * Store a valid Gemini diagnostic response in cache.
     */
    public function store(array $vehicleInfo, string $symptoms, array $diagnosisData): void
    {
        if (!config('services.gemini_cache.enabled', true)) {
            return;
        }

        // Only store successful diagnostic responses (never store conversation, clarification, or errors)
        $type = strtolower(trim((string) ($diagnosisData['type'] ?? '')));
        $status = strtolower(trim((string) ($diagnosisData['status'] ?? '')));

        if ($type !== 'diagnostic' || $status !== 'diagnosis_ready') {
            Log::info('[AI Cache] Skipping cache store - non-diagnostic or incomplete status', [
                'type' => $type,
                'status' => $status,
            ]);
            return;
        }

        $symptomKey = $this->normalizer->normalize($symptoms, $vehicleInfo);
        if ($symptomKey === null) {
            return;
        }

        $vType = strtolower(trim((string) ($vehicleInfo['type'] ?? 'vehicle')));
        $vBrand = strtolower(trim((string) ($vehicleInfo['brand'] ?? 'generic')));
        $vModel = strtolower(trim((string) ($vehicleInfo['model'] ?? 'generic')));
        $vYear = strtolower(trim((string) ($vehicleInfo['year'] ?? 'generic')));
        $lang = strtolower(trim((string) ($vehicleInfo['preferred_language'] ?? 'en')));

        $ttlDays = (int) config('services.gemini_cache.ttl_days', 30);
        $expiresAt = now()->addDays($ttlDays);

        // Remove ephemeral metadata before caching
        unset($diagnosisData['ai_source']);
        unset($diagnosisData['remaining_consultations']);

        try {
            $cacheRecord = AiDiagnosisCache::updateOrCreate(
                [
                    'vehicle_type' => $vType,
                    'brand' => $vBrand,
                    'model' => $vModel,
                    'year' => $vYear,
                    'symptom_key' => $symptomKey,
                    'language' => $lang,
                ],
                [
                    'diagnosis_data' => $diagnosisData,
                    'expires_at' => $expiresAt,
                ]
            );

            Log::info('[AI Cache] Stored diagnosis in cache', [
                'cache_id' => $cacheRecord->id,
                'symptom_key' => $symptomKey,
                'vehicle' => "{$vType}/{$vBrand}/{$vModel}/{$vYear}",
                'expires_at' => $expiresAt->toDateTimeString(),
            ]);
        } catch (\Throwable $e) {
            Log::error('[AI Cache] Failed to store cache entry', ['error' => $e->getMessage()]);
        }
    }
}
