<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\NhtsaService;
use Illuminate\Http\JsonResponse;

class NhtsaController extends Controller
{
    public function __construct(
        private NhtsaService $nhtsaService
    ) {}

    public function makes(string $type): JsonResponse
    {
        try {
            $makes = $this->nhtsaService->getMakes($type);

            return response()->json([
                'status' => 'success',
                'data' => $makes,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function models(string $make): JsonResponse
    {
        try {
            $models = $this->nhtsaService->getModelsForMake($make);

            return response()->json([
                'status' => 'success',
                'data' => $models,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function decodeVin(string $vin): JsonResponse
    {
        try {
            $data = $this->nhtsaService->decodeVin($vin);

            return response()->json([
                'status' => 'success',
                'data' => $data,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}