<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MaintenanceRecord;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class MaintenanceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! Schema::hasTable('maintenance_records')) {
            return response()->json(['data' => []]);
        }

        $query = MaintenanceRecord::where('user_id', $user->id)
            ->with(['vehicle.vehicleBrand', 'vehicle.vehicleModel', 'vehicle.vehicleYear']);

        if ($request->has('vehicle_id')) {
            $query->where('vehicle_id', $request->query('vehicle_id'));
        }

        $records = $query->latest('created_at')->get();

        return response()->json([
            'data' => $records,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! Schema::hasTable('maintenance_records')) {
            return response()->json(['message' => 'Maintenance table not migrated yet.'], 503);
        }

        $validated = $request->validate([
            'vehicle_id' => 'required|integer|exists:vehicles,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'service_type' => 'nullable|string|max:100',
            'performed_at' => 'nullable|date',
            'cost' => 'nullable|numeric|min:0',
            'odometer' => 'nullable|integer|min:0',
            'notes' => 'nullable|string',
        ]);

        $ownsVehicle = $user->vehicles()->where('id', $validated['vehicle_id'])->exists();
        if (! $ownsVehicle) {
            return response()->json(['message' => 'Vehicle ownership verification failed.'], 403);
        }

        $record = MaintenanceRecord::create([
            'user_id' => $user->id,
            'vehicle_id' => $validated['vehicle_id'],
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'service_type' => $validated['service_type'] ?? 'General Inspection',
            'performed_at' => $validated['performed_at'] ?? now(),
            'cost' => $validated['cost'] ?? 0,
            'odometer' => $validated['odometer'] ?? null,
            'notes' => $validated['notes'] ?? null,
        ]);

        $record->load(['vehicle.vehicleBrand', 'vehicle.vehicleModel', 'vehicle.vehicleYear']);

        return response()->json([
            'message' => 'Maintenance record created successfully.',
            'data' => $record,
        ], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        if (! Schema::hasTable('maintenance_records')) {
            return response()->json(['message' => 'Record not found.'], 404);
        }

        $record = MaintenanceRecord::where('id', $id)
            ->where('user_id', $user->id)
            ->with(['vehicle.vehicleBrand', 'vehicle.vehicleModel', 'vehicle.vehicleYear'])
            ->first();

        if (! $record) {
            return response()->json(['message' => 'Maintenance record not found or unauthorized.'], 404);
        }

        return response()->json(['data' => $record]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        if (! Schema::hasTable('maintenance_records')) {
            return response()->json(['message' => 'Record not found.'], 404);
        }

        $record = MaintenanceRecord::where('id', $id)
            ->where('user_id', $user->id)
            ->first();

        if (! $record) {
            return response()->json(['message' => 'Maintenance record not found or unauthorized.'], 404);
        }

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'service_type' => 'nullable|string|max:100',
            'performed_at' => 'nullable|date',
            'cost' => 'nullable|numeric|min:0',
            'odometer' => 'nullable|integer|min:0',
            'notes' => 'nullable|string',
        ]);

        $record->update($validated);
        $record->load(['vehicle.vehicleBrand', 'vehicle.vehicleModel', 'vehicle.vehicleYear']);

        return response()->json([
            'message' => 'Maintenance record updated successfully.',
            'data' => $record,
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        if (! Schema::hasTable('maintenance_records')) {
            return response()->json(['message' => 'Record not found.'], 404);
        }

        $record = MaintenanceRecord::where('id', $id)
            ->where('user_id', $user->id)
            ->first();

        if (! $record) {
            return response()->json(['message' => 'Maintenance record not found or unauthorized.'], 404);
        }

        $record->delete();

        return response()->json(['message' => 'Maintenance record deleted successfully.']);
    }
}
