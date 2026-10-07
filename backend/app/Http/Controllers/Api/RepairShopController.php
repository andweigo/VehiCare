<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\RepairShopResource;
use App\Models\ServiceReferral;
use App\Services\RepairShopService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class RepairShopController extends Controller
{
    protected RepairShopService $repairShopService;

    /**
     * Inject RepairShopService via Dependency Injection.
     */
    public function __construct(RepairShopService $repairShopService)
    {
        $this->repairShopService = $repairShopService;
    }

    /**
     * Get nearby active repair shops filtered by coordinates, vehicle category, and search radius.
     */
    public function nearby(Request $request)
    {
        try {
            $validated = $request->validate([
                'latitude' => 'nullable|numeric|between:-90,90',
                'longitude' => 'nullable|numeric|between:-180,180',
                'radius' => 'nullable|numeric|min:0.1|max:100000',
                'vehicle_type' => 'nullable|string|max:50',
            ]);

            $userLat = (float) ($validated['latitude'] ?? 14.6500);
            $userLng = (float) ($validated['longitude'] ?? 121.0300);
            $radius = (float) ($validated['radius'] ?? 10);
            $vehicleType = $validated['vehicle_type'] ?? null;

            $shops = $this->repairShopService->findNearby($userLat, $userLng, $radius, $vehicleType);

            return response()->json([
                'success' => true,
                'status' => 'success',
                'data' => RepairShopResource::collection($shops),
            ]);
        } catch (\Illuminate\Validation\ValidationException $ve) {
            return response()->json([
                'success' => false,
                'status' => 'error',
                'message' => 'Validation error',
                'errors' => $ve->errors(),
            ], 422);
        } catch (\Throwable $e) {
            Log::error('[RepairShopController] nearby error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'status' => 'error',
                'message' => 'Failed to fetch nearby repair shops: ' . $e->getMessage(),
                'data' => [],
            ], 500);
        }
    }

    /**
     * Create a service referral request.
     */
    public function createReferral(Request $request)
    {
        $validated = $request->validate([
            'diagnostic_id' => 'nullable|exists:diagnostics,id',
            'repair_shop_id' => 'nullable|exists:repair_shops,id',
            'shop_name' => 'required|string|max:255',
            'shop_address' => 'nullable|string|max:255',
            'shop_phone' => 'nullable|string|max:50',
            'is_custom_shop' => 'nullable|boolean',
            'notes' => 'nullable|string|max:1000',
        ]);

        $referral = ServiceReferral::create([
            'user_id' => Auth::id(),
            'diagnostic_id' => $validated['diagnostic_id'] ?? null,
            'repair_shop_id' => $validated['repair_shop_id'] ?? null,
            'shop_name' => $validated['shop_name'],
            'shop_address' => $validated['shop_address'] ?? null,
            'shop_phone' => $validated['shop_phone'] ?? null,
            'status' => 'RECOMMENDED',
            'is_custom_shop' => $validated['is_custom_shop'] ?? false,
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'status' => 'success',
            'message' => 'Service referral dispatched successfully.',
            'data' => $referral
        ], 201);
    }
}
