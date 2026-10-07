<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\VehicleValidationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class VehicleValidationController extends Controller
{
    public function __construct(
        protected VehicleValidationService $validationService
    ) {}

    /**
     * Validate vehicle combination and model-year consistency.
     * Endpoint: POST /api/vehicles/validate
     */
    public function validate(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'vehicle_type' => 'nullable|string|max:100',
                'brand' => 'nullable|string|max:150',
                'model' => 'nullable|string|max:150',
                'year' => 'nullable',
                'custom_brand' => 'nullable|string|max:150',
                'custom_model' => 'nullable|string|max:150',
                'custom_year' => 'nullable',
                'model_number' => 'nullable|string|max:150',
            ]);

            $result = $this->validationService->validateVehicle($validated);

            return response()->json([
                'success' => true,
                'validation' => $result,
            ], 200);
        } catch (\Throwable $e) {
            Log::error('[VehicleValidationController] Validation failed: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'status' => 'validation_unavailable',
                'message' => 'Vehicle verification is temporarily unavailable.',
                'validation' => [
                    'is_valid' => true,
                    'status' => 'validation_unavailable',
                    'confidence' => 0.5,
                    'reason' => 'Vehicle verification service unavailable.',
                ],
            ], 200);
        }
    }

    /**
     * Get validated production years for a vehicle model.
     * Endpoint: GET /api/vehicles/models/{modelId}/validated-years
     */
    public function getValidatedYears(int $modelId): JsonResponse
    {
        try {
            $years = $this->validationService->getValidatedYearsForModel($modelId);

            return response()->json([
                'status' => 'success',
                'data' => $years,
            ], 200);
        } catch (\Throwable $e) {
            Log::warning('[VehicleValidationController] Failed fetching validated years: ' . $e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Unable to fetch validated vehicle years.',
            ], 500);
        }
    }

    /**
     * Get admin vehicle data quality metrics and conflicts.
     * Endpoint: GET /api/admin/vehicle-data-quality
     */
    public function dataQuality(): JsonResponse
    {
        $metrics = $this->validationService->getVehicleDataQualityMetrics();

        return response()->json([
            'status' => 'success',
            'data' => $metrics,
        ], 200);
    }
}
