<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use App\Models\VehicleBrand;
use App\Models\VehicleCorrectionRequest;
use App\Models\VehicleModel;
use App\Models\VehicleType;
use App\Notifications\VehicleCorrectionRequestCompleted;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VehicleController extends Controller
{
    /**
     * Get all vehicle types, brands, models, and years.
     */
    public function index(): JsonResponse
    {
        $vehicleTypes = VehicleType::with([
            'brands.models.years'
        ])->get();

        return response()->json([
            'status' => 'success',
            'data' => $vehicleTypes,
        ]);
    }

    /**
     * Get vehicle types.
     */
    public function types(): JsonResponse
    {
        $vehicleTypes = VehicleType::select(
            'id',
            'name'
        )->get();

        return response()->json([
            'status' => 'success',
            'data' => $vehicleTypes,
        ]);
    }

    /**
     * Get brands for a vehicle type.
     */
    public function brands($vehicleTypeId): JsonResponse
    {
        $vehicleType = VehicleType::findOrFail(
            $vehicleTypeId
        );

        $brands = $vehicleType->brands()
            ->select(
                'id',
                'vehicle_type_id',
                'name'
            )
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $brands,
        ]);
    }

    /**
     * Get models for a brand.
     */
    public function models($brandId): JsonResponse
    {
        $brand = VehicleBrand::findOrFail(
            $brandId
        );

        $models = $brand->models()
            ->select(
                'id',
                'vehicle_brand_id',
                'name'
            )
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $models,
        ]);
    }

    /**
     * Get years for a model.
     */
    public function years($modelId): JsonResponse
    {
        $model = VehicleModel::findOrFail(
            $modelId
        );

        $years = $model->years()
            ->select(
                'id',
                'vehicle_model_id',
                'year'
            )
            ->orderByDesc('year')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $years,
        ]);
    }

    /**
     * Save a vehicle for the authenticated user.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'vehicle_type_id' => [
                'nullable',
                'exists:vehicle_types,id',
            ],

            'vehicle_brand_id' => [
                'nullable',
                'exists:vehicle_brands,id',
            ],

            'vehicle_model_id' => [
                'nullable',
                'exists:vehicle_models,id',
            ],

            'vehicle_year_id' => [
                'nullable',
                'exists:vehicle_years,id',
            ],

            'custom_brand' => [
                'nullable',
                'string',
                'max:255',
            ],

            'custom_model' => [
                'nullable',
                'string',
                'max:255',
            ],

            'custom_year' => [
                'nullable',
                'string',
                'max:255',
            ],

            'model_number' => [
                'nullable',
                'string',
                'max:255',
            ],
        ]);

        $user = $request->user();
        if ($user) {
            $user->checkSubscriptionStatus();
        }

        $vehicleCount = $user->vehicles()->count();
        if ($vehicleCount >= $user->vehicle_limit) {
            return response()->json([
                'status' => 'error',
                'message' => 'Your current plan allows only '.$user->vehicle_limit.' vehicle(s). Upgrade to add more vehicles.',
            ], 422);
        }

        $vehicle = $user->vehicles()
            ->create($validated);

        if (! $user->active_vehicle_id) {
            $user->active_vehicle_id = $vehicle->id;
            $user->save();
        }

        $vehicle->load([
            'vehicleType',
            'vehicleBrand',
            'vehicleModel',
            'vehicleYear',
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Vehicle saved successfully.',
            'data' => $vehicle,
        ], 201);
    }

    /**
     * Get vehicles belonging to the authenticated user.
     */
    public function myVehicles(Request $request): JsonResponse
    {
        $activeVehicleId = $request->user()->active_vehicle_id;

        $vehicles = $request->user()
            ->vehicles()
            ->with([
                'vehicleType',
                'vehicleBrand',
                'vehicleModel',
                'vehicleYear',
            ])
            ->latest()
            ->get()
            ->transform(function ($vehicle) use ($activeVehicleId) {
                $vehicle->isActive = $activeVehicleId && $vehicle->id === $activeVehicleId;
                $vehicle->isArchived = !is_null($vehicle->archived_at);
                return $vehicle;
            });

        return response()->json([
            'status' => 'success',
            'data' => $vehicles,
        ]);
    }

    public function show(Request $request, $id): JsonResponse
    {
        $vehicle = $request->user()
            ->vehicles()
            ->with([
                'vehicleType',
                'vehicleBrand',
                'vehicleModel',
                'vehicleYear',
            ])
            ->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => $vehicle,
        ]);
    }

    public function setActiveVehicle(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'vehicle_id' => ['required', 'integer', 'exists:vehicles,id'],
        ]);

        $vehicle = $request->user()
            ->vehicles()
            ->findOrFail($validated['vehicle_id']);

        $user = $request->user();
        $user->active_vehicle_id = $vehicle->id;
        $user->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Active vehicle updated successfully.',
            'data' => [
                'active_vehicle_id' => $vehicle->id,
                'vehicle' => $vehicle,
            ],
        ]);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $validated = $request->validate([
            'vehicle_type_id' => [
                'nullable',
                'exists:vehicle_types,id',
            ],

            'vehicle_brand_id' => [
                'nullable',
                'exists:vehicle_brands,id',
            ],

            'vehicle_model_id' => [
                'nullable',
                'exists:vehicle_models,id',
            ],

            'vehicle_year_id' => [
                'nullable',
                'exists:vehicle_years,id',
            ],

            'custom_brand' => [
                'nullable',
                'string',
                'max:255',
            ],

            'custom_model' => [
                'nullable',
                'string',
                'max:255',
            ],

            'custom_year' => [
                'nullable',
                'string',
                'max:255',
            ],

            'model_number' => [
                'nullable',
                'string',
                'max:255',
            ],
        ]);

        $vehicle = $request->user()
            ->vehicles()
            ->findOrFail($id);

        if ($vehicle->archived_at) {
            return response()->json([
                'status' => 'error',
                'message' => 'Archived vehicles cannot be corrected.',
            ], 403);
        }

        $correctionRequest = VehicleCorrectionRequest::where('vehicle_id', $vehicle->id)
            ->where('status', 'approved')
            ->where('edit_expires_at', '>', now())
            ->whereNull('completed_at')
            ->latest('approved_at')
            ->first();

        if (! $correctionRequest) {
            return response()->json([
                'status' => 'error',
                'message' => 'Vehicle profile corrections must be requested and approved before fields can be updated.',
            ], 403);
        }

        $allowedFields = (array) $correctionRequest->requested_fields;
        $changedFields = [];

        foreach ($validated as $field => $value) {
            $existingValue = $vehicle->{$field};

            if (is_string($existingValue)) {
                $existingValue = trim($existingValue);
            }

            if (is_string($value)) {
                $value = trim($value);
            }

            if ((string) $existingValue !== (string) $value) {
                $changedFields[] = $field;
            }
        }

        if (empty($changedFields)) {
            return response()->json([
                'status' => 'error',
                'message' => 'No changes were detected for the vehicle profile.',
            ], 422);
        }

        $unauthorizedFields = array_diff($changedFields, $allowedFields);

        if (! empty($unauthorizedFields)) {
            return response()->json([
                'status' => 'error',
                'message' => 'You may only modify approved correction fields for this vehicle.',
                'fields' => array_values($unauthorizedFields),
            ], 403);
        }

        $vehicle->fill($validated);
        $vehicle->save();

        $correctionRequest->status = 'completed';
        $correctionRequest->completed_at = now();
        $correctionRequest->save();

        $correctionRequest->user->notify(new VehicleCorrectionRequestCompleted($correctionRequest));

        $vehicle->load([
            'vehicleType',
            'vehicleBrand',
            'vehicleModel',
            'vehicleYear',
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Vehicle updated successfully.',
            'data' => $vehicle,
        ]);
    }

    public function destroy(Request $request, $id): JsonResponse
    {
        $vehicle = $request->user()
            ->vehicles()
            ->findOrFail($id);

        if ($vehicle->archived_at) {
            return response()->json([
                'status' => 'success',
                'message' => 'Vehicle already archived.',
            ]);
        }

        $vehicle->archived_at = now();
        $vehicle->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Vehicle archived successfully.',
            'data' => [
                'archived_at' => $vehicle->archived_at,
            ],
        ]);
    }

    public function unarchive(Request $request, $id): JsonResponse
    {
        $vehicle = $request->user()
            ->vehicles()
            ->findOrFail($id);

        if (! $vehicle->archived_at) {
            return response()->json([
                'status' => 'success',
                'message' => 'Vehicle is already active.',
            ]);
        }

        $vehicle->archived_at = null;
        $vehicle->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Vehicle unarchived successfully.',
            'data' => [
                'archived_at' => $vehicle->archived_at,
            ],
        ]);
    }
}
