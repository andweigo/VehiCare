<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use App\Models\VehicleBrand;
use App\Models\VehicleCorrectionRequest;
use App\Models\VehicleModel;
use App\Models\VehicleType;
use App\Models\User;
use App\Notifications\VehicleCorrectionRequestCompleted;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
        $result = DB::transaction(function () use ($user, $validated) {
            $lockedUser = User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            $lockedUser->checkSubscriptionStatus();
            $vehicleAllowance = $lockedUser->vehicleAllowance();
            $isPremium = $lockedUser->isPremium();

            $countToCheck = $isPremium
                ? $lockedUser->vehicles()->count()
                : $lockedUser->activeVehicles()->count();

            if ($countToCheck >= $vehicleAllowance) {
                return [
                    'allowed' => false,
                    'allowance' => $vehicleAllowance,
                    'is_premium' => $isPremium,
                ];
            }

            $vehicle = $lockedUser->vehicles()->create($validated);
            $hasActiveVehicle = $lockedUser->active_vehicle_id
                && $lockedUser->activeVehicles()->whereKey($lockedUser->active_vehicle_id)->exists();
            if (! $hasActiveVehicle) {
                $lockedUser->active_vehicle_id = $vehicle->id;
                $lockedUser->save();
            }

            return [
                'allowed' => true,
                'vehicle' => $vehicle->load([
                    'vehicleType',
                    'vehicleBrand',
                    'vehicleModel',
                    'vehicleYear',
                ]),
            ];
        }, 3);

        if (! $result['allowed']) {
            $message = $result['is_premium']
                ? 'Your Premium plan allows up to '.$result['allowance'].' vehicle profile(s) (including archived vehicles).'
                : 'Your current plan allows only '.$result['allowance'].' active vehicle(s). Upgrade to add more vehicles.';

            return response()->json([
                'status' => 'error',
                'message' => $message,
            ], 422);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Vehicle saved successfully.',
            'data' => $result['vehicle'],
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

        if ($vehicle->archived_at) {
            return response()->json([
                'status' => 'error',
                'message' => 'An archived vehicle cannot be set as the active vehicle.',
            ], 422);
        }

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
        $expandedAllowedFields = $allowedFields;
        if (in_array('vehicle_model_id', $allowedFields) && !in_array('custom_model', $expandedAllowedFields)) {
            $expandedAllowedFields[] = 'custom_model';
        }
        if (in_array('custom_model', $allowedFields) && !in_array('vehicle_model_id', $expandedAllowedFields)) {
            $expandedAllowedFields[] = 'vehicle_model_id';
        }
        if (in_array('vehicle_brand_id', $allowedFields) && !in_array('custom_brand', $expandedAllowedFields)) {
            $expandedAllowedFields[] = 'custom_brand';
        }
        if (in_array('custom_brand', $allowedFields) && !in_array('vehicle_brand_id', $expandedAllowedFields)) {
            $expandedAllowedFields[] = 'vehicle_brand_id';
        }
        if (in_array('vehicle_year_id', $allowedFields) && !in_array('custom_year', $expandedAllowedFields)) {
            $expandedAllowedFields[] = 'custom_year';
        }
        if (in_array('custom_year', $allowedFields) && !in_array('vehicle_year_id', $expandedAllowedFields)) {
            $expandedAllowedFields[] = 'vehicle_year_id';
        }

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

        $unauthorizedFields = array_diff($changedFields, $expandedAllowedFields);

        if (! empty($unauthorizedFields)) {
            return response()->json([
                'status' => 'error',
                'message' => 'You may only modify approved correction fields for this vehicle.',
                'fields' => array_values($unauthorizedFields),
            ], 403);
        }

        $vehicle->applyCorrectionValues($validated);
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
        $user = $request->user();
        $vehicle = $user
            ->vehicles()
            ->findOrFail($id);

        if ($vehicle->archived_at) {
            return response()->json([
                'status' => 'success',
                'message' => 'Vehicle already archived.',
                'data' => [
                    'archived_at' => $vehicle->archived_at,
                    'active_vehicle_id' => $user->active_vehicle_id,
                ],
            ]);
        }

        $nextActiveVehicle = null;

        DB::transaction(function () use ($user, $vehicle, &$nextActiveVehicle) {
            $vehicle->archived_at = now();
            $vehicle->save();

            if ((int) $user->active_vehicle_id === (int) $vehicle->id) {
                $nextActiveVehicle = $user->activeVehicles()
                    ->where('id', '!=', $vehicle->id)
                    ->latest()
                    ->first();

                $user->active_vehicle_id = $nextActiveVehicle?->id;
                $user->save();
            }
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Vehicle archived successfully.',
            'data' => [
                'archived_at' => $vehicle->archived_at,
                'active_vehicle_id' => $user->active_vehicle_id,
                'next_active_vehicle' => $nextActiveVehicle ? $nextActiveVehicle->load([
                    'vehicleType',
                    'vehicleBrand',
                    'vehicleModel',
                    'vehicleYear',
                ]) : null,
            ],
        ]);
    }

    public function unarchive(Request $request, $id): JsonResponse
    {
        $user = $request->user();
        $result = DB::transaction(function () use ($user, $id) {
            $lockedUser = User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            $lockedUser->checkSubscriptionStatus();
            $vehicle = $lockedUser->vehicles()->lockForUpdate()->findOrFail($id);

            if (! $vehicle->archived_at) {
                return [
                    'status' => 'already_active',
                    'active_vehicle_id' => $lockedUser->active_vehicle_id,
                ];
            }

            $vehicleAllowance = $lockedUser->vehicleAllowance();
            if ($lockedUser->activeVehicles()->count() >= $vehicleAllowance) {
                return [
                    'status' => 'limit',
                    'allowance' => $vehicleAllowance,
                ];
            }

            $vehicle->archived_at = null;
            $vehicle->save();

            $hasActive = $lockedUser->active_vehicle_id
                && $lockedUser->activeVehicles()->whereKey($lockedUser->active_vehicle_id)->exists();
            if (! $hasActive) {
                $lockedUser->active_vehicle_id = $vehicle->id;
                $lockedUser->save();
            }

            return [
                'status' => 'unarchived',
                'vehicle' => $vehicle->load([
                    'vehicleType',
                    'vehicleBrand',
                    'vehicleModel',
                    'vehicleYear',
                ]),
                'active_vehicle_id' => $lockedUser->active_vehicle_id,
            ];
        }, 3);

        if ($result['status'] === 'limit') {
            return response()->json([
                'status' => 'error',
                'message' => 'Your current plan allows only '.$result['allowance'].' active vehicle(s). Upgrade to unarchive or add more vehicles.',
            ], 422);
        }

        $responseData = [
            'archived_at' => null,
            'active_vehicle_id' => $result['active_vehicle_id'],
        ];
        if ($result['status'] === 'unarchived') {
            $responseData['vehicle'] = $result['vehicle'];
        }

        return response()->json([
            'status' => 'success',
            'message' => $result['status'] === 'already_active'
                ? 'Vehicle is already active.'
                : 'Vehicle unarchived successfully.',
            'data' => $responseData,
        ]);
    }
}
