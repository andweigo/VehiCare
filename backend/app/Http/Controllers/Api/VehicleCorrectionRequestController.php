<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use App\Models\VehicleCorrectionRequest;
use App\Notifications\VehicleCorrectionRequestSubmitted;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class VehicleCorrectionRequestController extends Controller
{
    public function index(): JsonResponse
    {
        $requests = VehicleCorrectionRequest::with(['vehicle.vehicleType', 'vehicle.vehicleBrand', 'vehicle.vehicleModel', 'vehicle.vehicleYear'])
            ->where('user_id', Auth::id())
            ->latest('submitted_at')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $requests,
        ]);
    }

    public function forVehicle($vehicleId): JsonResponse
    {
        $vehicle = Vehicle::where('user_id', Auth::id())->findOrFail($vehicleId);

        $request = VehicleCorrectionRequest::with(['vehicle.vehicleType', 'vehicle.vehicleBrand', 'vehicle.vehicleModel', 'vehicle.vehicleYear'])
            ->where('vehicle_id', $vehicle->id)
            ->where('status', 'pending')
            ->latest('submitted_at')
            ->first();

        return response()->json([
            'status' => 'success',
            'data' => $request,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'vehicle_id' => ['required', 'integer', 'exists:vehicles,id'],
            'requested_fields' => ['required', 'array', 'min:1'],
            'requested_fields.*' => ['required', 'string', 'in:vehicle_type_id,vehicle_brand_id,vehicle_model_id,vehicle_year_id,custom_brand,custom_model,custom_year,model_number'],
            'current_values' => ['required', 'array'],
            'requested_values' => ['required', 'array'],
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        $vehicle = Vehicle::where('user_id', Auth::id())->findOrFail($validated['vehicle_id']);

        if ($vehicle->archived_at) {
            return response()->json([
                'status' => 'error',
                'message' => 'Archived vehicles cannot be corrected.',
            ], 403);
        }

        // 1. Check for active pending request on this vehicle
        $existingRequest = VehicleCorrectionRequest::where('vehicle_id', $vehicle->id)
            ->where('status', 'pending')
            ->exists();

        if ($existingRequest) {
            return response()->json([
                'status' => 'error',
                'message' => 'You already have an active pending correction request for this vehicle.',
            ], 422);
        }

        // 2. Cooldown Check: 7-day cooldown after an approved vehicle update to prevent abuse
        $recentApproved = VehicleCorrectionRequest::where('vehicle_id', $vehicle->id)
            ->where('status', 'approved')
            ->where(function ($query) {
                $query->where('approved_at', '>', now()->subDays(7))
                    ->orWhere('completed_at', '>', now()->subDays(7));
            })
            ->exists();

        if ($recentApproved) {
            return response()->json([
                'status' => 'error',
                'message' => 'Vehicle details were updated recently. Please wait 7 days between edit requests for the same vehicle.',
            ], 422);
        }

        // 3. Global Account Limit: Limit to 1 pending edit request per user across all vehicles
        $userPendingCount = VehicleCorrectionRequest::where('user_id', Auth::id())
            ->where('status', 'pending')
            ->count();

        if ($userPendingCount >= 1) {
            return response()->json([
                'status' => 'error',
                'message' => 'You already have a pending edit request under review. Please wait for admin review before submitting another.',
            ], 422);
        }

        $correctionRequest = VehicleCorrectionRequest::create([
            'user_id' => Auth::id(),
            'vehicle_id' => $vehicle->id,
            'requested_fields' => $validated['requested_fields'],
            'current_values' => $validated['current_values'],
            'requested_values' => $validated['requested_values'],
            'reason' => $validated['reason'],
            'status' => 'pending',
            'submitted_at' => now(),
        ]);

        Auth::user()->notify(new VehicleCorrectionRequestSubmitted($correctionRequest));

        return response()->json([
            'status' => 'success',
            'message' => 'Correction request submitted successfully.',
            'data' => $correctionRequest,
        ], 201);
    }
}
