<?php

namespace App\Services;

use App\Models\VehicleBrand;
use App\Models\VehicleModel;
use App\Models\VehicleType;
use App\Models\VehicleYear;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class VehicleValidationService
{
    public function __construct(
        protected GeminiService $geminiService,
        protected NhtsaService $nhtsaService
    ) {}

    /**
     * Validate vehicle combination and model-year consistency.
     */
    public function validateVehicle(array $params): array
    {
        $vehicleType = trim((string) ($params['vehicle_type'] ?? ''));
        $brand = trim((string) ($params['brand'] ?? $params['custom_brand'] ?? ''));
        $model = trim((string) ($params['model'] ?? $params['custom_model'] ?? ''));
        $yearRaw = $params['year'] ?? $params['custom_year'] ?? null;
        $year = (is_numeric($yearRaw) && (int)$yearRaw > 1900) ? (int)$yearRaw : null;
        $modelNumber = isset($params['model_number']) ? trim((string)$params['model_number']) : null;

        if ($vehicleType === '' || $brand === '' || $model === '') {
            return [
                'is_valid' => false,
                'status' => 'invalid',
                'confidence' => 0.9,
                'vehicle_type' => $vehicleType,
                'brand' => $brand,
                'model' => $model,
                'requested_year' => $year,
                'year_valid' => false,
                'production_year_start' => null,
                'production_year_end' => null,
                'suggested_years' => [],
                'reason' => 'Vehicle type, brand, and model are required for validation.',
            ];
        }

        // Cache Key for vehicle combination
        $cacheKey = 'vehicle_validation:' . StrSlug($vehicleType) . ':' . StrSlug($brand) . ':' . StrSlug($model) . ':' . ($year ?? '0') . ':' . StrSlug($modelNumber ?? 'none');

        return Cache::remember($cacheKey, now()->addDays(7), function () use ($vehicleType, $brand, $model, $year, $modelNumber) {
            return $this->performValidation($vehicleType, $brand, $model, $year, $modelNumber);
        });
    }

    /**
     * Get validated years for a specific model ID.
     */
    public function getValidatedYearsForModel(int $modelId): array
    {
        $vehicleModel = VehicleModel::with(['brand.vehicleType', 'years'])->find($modelId);

        if (!$vehicleModel) {
            return [];
        }

        $brand = $vehicleModel->brand?->name ?? '';
        $vehicleType = $vehicleModel->brand?->vehicleType?->name ?? 'Car';
        $modelName = $vehicleModel->name;

        $dbYears = $vehicleModel->years->pluck('year')->map(fn($y) => (int)$y)->toArray();
        sort($dbYears);

        // Cache Key for model production range
        $cacheKey = 'vehicle_validation_model:' . StrSlug($vehicleType) . ':' . StrSlug($brand) . ':' . StrSlug($modelName);

        $modelValidation = Cache::remember($cacheKey, now()->addDays(14), function () use ($vehicleType, $brand, $modelName, $dbYears) {
            $aiResult = $this->geminiService->validateVehicleData($vehicleType, $brand, $modelName);
            if ($aiResult && !empty($aiResult['suggested_years'])) {
                return $aiResult;
            }
            return null;
        });

        if ($modelValidation && !empty($modelValidation['suggested_years'])) {
            $suggested = array_map('intval', $modelValidation['suggested_years']);
            sort($suggested);

            // Filter DB years by AI suggested years when available
            $filteredYears = array_values(array_intersect($dbYears, $suggested));

            // If intersection is empty but suggested years exist, return suggested years formatted
            if (empty($filteredYears) && !empty($suggested)) {
                return array_map(fn($y) => ['id' => null, 'year' => $y, 'validated' => true], $suggested);
            }

            return $vehicleModel->years()
                ->whereIn('year', $filteredYears)
                ->orderByDesc('year')
                ->get()
                ->toArray();
        }

        // Fallback to existing structured DB years if validation is unavailable
        return $vehicleModel->years()
            ->orderByDesc('year')
            ->get()
            ->toArray();
    }

    /**
     * Perform multi-tiered vehicle validation logic.
     */
    protected function performValidation(
        string $vehicleType,
        string $brand,
        string $model,
        ?int $year = null,
        ?string $modelNumber = null
    ): array {
        // Tier 1: Check Local Database Taxonomy
        $dbBrand = VehicleBrand::whereHas('vehicleType', function ($q) use ($vehicleType) {
            $q->where('name', 'LIKE', $vehicleType);
        })->where('name', 'LIKE', $brand)->first();

        $dbModel = null;
        if ($dbBrand) {
            $dbModel = VehicleModel::where('vehicle_brand_id', $dbBrand->id)
                ->where('name', 'LIKE', $model)
                ->first();
        }

        // Tier 2: Call Gemini AI Validation
        $aiResult = null;
        try {
            $aiResult = $this->geminiService->validateVehicleData($vehicleType, $brand, $model, $year, $modelNumber);
        } catch (\Throwable $e) {
            Log::warning('[VehicleValidationService] Gemini validation failed: ' . $e->getMessage());
        }

        if ($aiResult) {
            $status = strtolower(trim((string)($aiResult['status'] ?? 'uncertain')));
            $isValid = (bool)($aiResult['is_valid'] ?? ($status === 'verified' || $status === 'likely_valid'));
            $yearValid = (bool)($aiResult['year_valid'] ?? true);
            $suggestedYears = array_map('intval', (array)($aiResult['suggested_years'] ?? []));

            if ($year !== null && !empty($suggestedYears)) {
                $yearValid = in_array($year, $suggestedYears, true);
            }

            return [
                'is_valid' => $isValid && $yearValid,
                'status' => $status,
                'confidence' => (float)($aiResult['confidence'] ?? 0.85),
                'vehicle_type' => $vehicleType,
                'brand' => $brand,
                'model' => $model,
                'requested_year' => $year,
                'year_valid' => $yearValid,
                'production_year_start' => $aiResult['production_year_start'] ?? (empty($suggestedYears) ? null : min($suggestedYears)),
                'production_year_end' => $aiResult['production_year_end'] ?? (empty($suggestedYears) ? null : max($suggestedYears)),
                'suggested_years' => $suggestedYears,
                'reason' => (string)($aiResult['reason'] ?? 'Vehicle validation completed.'),
            ];
        }

        // Tier 3: Structured DB Fallback if AI is offline
        if ($dbModel) {
            $dbYears = $dbModel->years->pluck('year')->map(fn($y) => (int)$y)->toArray();
            $yearValid = $year ? in_array($year, $dbYears, true) : true;

            return [
                'is_valid' => $yearValid,
                'status' => 'likely_valid',
                'confidence' => 0.80,
                'vehicle_type' => $vehicleType,
                'brand' => $brand,
                'model' => $model,
                'requested_year' => $year,
                'year_valid' => $yearValid,
                'production_year_start' => empty($dbYears) ? null : min($dbYears),
                'production_year_end' => empty($dbYears) ? null : max($dbYears),
                'suggested_years' => $dbYears,
                'reason' => $yearValid
                    ? 'Vehicle matched existing database taxonomy.'
                    : 'The requested model year is not listed in our database for this model.',
            ];
        }

        // Default Fallback when validation is unavailable
        return [
            'is_valid' => true,
            'status' => 'validation_unavailable',
            'confidence' => 0.50,
            'vehicle_type' => $vehicleType,
            'brand' => $brand,
            'model' => $model,
            'requested_year' => $year,
            'year_valid' => true,
            'production_year_start' => null,
            'production_year_end' => null,
            'suggested_years' => [],
            'reason' => 'Vehicle verification is temporarily unavailable.',
        ];
    }

    /**
     * Quality metrics for Admin Dashboard inspection.
     */
    public function getVehicleDataQualityMetrics(): array
    {
        $totalModels = VehicleModel::count();
        $modelsWithYears = VehicleModel::with(['brand.vehicleType', 'years'])->has('years')->get();

        $conflicts = [];
        $validatedCount = 0;

        foreach ($modelsWithYears->take(50) as $vModel) {
            $dbYears = $vModel->years->pluck('year')->map(fn($y) => (int)$y)->toArray();
            if (empty($dbYears)) continue;

            sort($dbYears);
            $dbMin = min($dbYears);
            $dbMax = max($dbYears);

            $brandName = $vModel->brand?->name ?? 'Unknown';
            $typeName = $vModel->brand?->vehicleType?->name ?? 'Car';

            $cacheKey = 'vehicle_validation_model:' . StrSlug($typeName) . ':' . StrSlug($brandName) . ':' . StrSlug($vModel->name);
            $validation = Cache::get($cacheKey);

            if ($validation && !empty($validation['suggested_years'])) {
                $validatedCount++;
                $aiYears = array_map('intval', $validation['suggested_years']);
                $aiMin = min($aiYears);
                $aiMax = max($aiYears);

                if ($dbMin < $aiMin || $dbMax > $aiMax) {
                    $conflicts[] = [
                        'model_id' => $vModel->id,
                        'brand' => $brandName,
                        'model' => $vModel->name,
                        'db_year_range' => "{$dbMin}–{$dbMax}",
                        'validated_year_range' => "{$aiMin}–{$aiMax}",
                        'status' => 'data_conflict',
                    ];
                }
            }
        }

        return [
            'total_models' => $totalModels,
            'validated_models_cached' => $validatedCount,
            'data_conflicts_count' => count($conflicts),
            'conflicts' => $conflicts,
        ];
    }
}

function StrSlug(string $title): string
{
    return strtolower(trim(preg_replace('/[^A-Za-z0-9]+/', '_', $title), '_'));
}
