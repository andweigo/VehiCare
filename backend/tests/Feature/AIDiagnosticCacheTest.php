<?php

namespace Tests\Feature;

use App\Models\AiDiagnosisCache;
use App\Services\AIDiagnosticCacheService;
use App\Services\SymptomNormalizationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class AIDiagnosticCacheTest extends TestCase
{
    use RefreshDatabase;

    protected SymptomNormalizationService $normalizer;
    protected AIDiagnosticCacheService $cacheService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->normalizer = new SymptomNormalizationService();
        $this->cacheService = new AIDiagnosticCacheService($this->normalizer);
    }

    #[Test]
    public function it_normalizes_equivalent_starting_symptoms_to_the_same_key()
    {
        $input1 = "My motorcycle makes a clicking sound when I start it.";
        $input2 = "May clicking sound pag ini-start ko yung Sniper.";
        $input3 = "tik tik sound when starting";

        $key1 = $this->normalizer->normalize($input1);
        $key2 = $this->normalizer->normalize($input2);
        $key3 = $this->normalizer->normalize($input3);

        $this->assertEquals('starting_problem|clicking_sound', $key1);
        $this->assertEquals('starting_problem|clicking_sound', $key2);
        $this->assertEquals('starting_problem|clicking_sound', $key3);
    }

    #[Test]
    public function it_bypasses_cache_for_high_risk_symptoms()
    {
        $highRiskInput1 = "My brakes completely failed while driving";
        $highRiskInput2 = "There is white smoke and severe overheating from the engine";

        $this->assertNull($this->normalizer->normalize($highRiskInput1));
        $this->assertNull($this->normalizer->normalize($highRiskInput2));
    }

    #[Test]
    public function it_stores_and_retrieves_cached_diagnosis()
    {
        $vehicleInfo = [
            'type' => 'Motorcycle',
            'brand' => 'Yamaha',
            'model' => 'Sniper 150',
            'year' => '2017',
            'preferred_language' => 'en',
        ];

        $symptoms = "clicking sound when starting";
        $diagnosisData = [
            'type' => 'diagnostic',
            'status' => 'diagnosis_ready',
            'confidence' => 'HIGH',
            'summary' => 'Weak battery or starter relay failure.',
            'possible_causes' => [
                ['cause' => 'Weak Battery', 'likelihood' => 'HIGH', 'reason' => 'Low voltage']
            ],
            'recommended_actions' => ['Check battery voltage'],
            'severity' => 'MODERATE',
            'urgency' => 'Inspect battery',
            'estimated_cost' => ['min' => 500, 'max' => 2000, 'currency' => 'PHP'],
            'professional_help' => ['recommended' => false, 'reason' => 'Simple DIY check'],
        ];

        // Store diagnosis in cache
        $this->cacheService->store($vehicleInfo, $symptoms, $diagnosisData);

        $this->assertDatabaseHas('ai_diagnosis_caches', [
            'symptom_key' => 'starting_problem|clicking_sound',
            'vehicle_type' => 'motorcycle',
            'hit_count' => 1,
        ]);

        // Equivalent query should return cache HIT
        $equivalentSymptom = "May clicking sound pag ini-start ko";
        $cachedResult = $this->cacheService->find($vehicleInfo, $equivalentSymptom);

        $this->assertNotNull($cachedResult);
        $this->assertEquals('cache', $cachedResult['ai_source']);
        $this->assertEquals('Weak battery or starter relay failure.', $cachedResult['summary']);
    }

    #[Test]
    public function it_does_not_return_expired_cache_records()
    {
        $vehicleInfo = [
            'type' => 'Motorcycle',
            'brand' => 'Yamaha',
            'model' => 'Sniper 150',
            'year' => '2017',
            'preferred_language' => 'en',
        ];

        // Create expired entry manually
        AiDiagnosisCache::create([
            'vehicle_type' => 'motorcycle',
            'brand' => 'yamaha',
            'model' => 'sniper 150',
            'year' => '2017',
            'symptom_key' => 'starting_problem|clicking_sound',
            'language' => 'en',
            'diagnosis_data' => ['type' => 'diagnostic', 'status' => 'diagnosis_ready', 'summary' => 'Old data'],
            'hit_count' => 1,
            'expires_at' => now()->subDay(), // Expired yesterday
        ]);

        $cachedResult = $this->cacheService->find($vehicleInfo, "clicking sound when starting");
        $this->assertNull($cachedResult);
    }
}
