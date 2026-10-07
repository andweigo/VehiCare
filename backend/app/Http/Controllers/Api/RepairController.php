<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RepairRecord;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class RepairController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! Schema::hasTable('repair_records')) {
            return response()->json(['data' => []]);
        }

        $query = RepairRecord::where('user_id', $user->id)
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

        if (! Schema::hasTable('repair_records')) {
            return response()->json(['message' => 'Repair table not migrated yet.'], 503);
        }

        $validated = $request->validate([
            'vehicle_id' => 'required|integer|exists:vehicles,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'problem' => 'nullable|string',
            'solution' => 'nullable|string',
            'cost' => 'nullable|numeric|min:0',
            'status' => 'nullable|string|in:pending,in_progress,completed,cancelled',
            'performed_at' => 'nullable|date',
        ]);

        $ownsVehicle = $user->vehicles()->where('id', $validated['vehicle_id'])->exists();
        if (! $ownsVehicle) {
            return response()->json(['message' => 'Vehicle ownership verification failed.'], 403);
        }

        $record = RepairRecord::create([
            'user_id' => $user->id,
            'vehicle_id' => $validated['vehicle_id'],
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'problem' => $validated['problem'] ?? null,
            'solution' => $validated['solution'] ?? null,
            'cost' => $validated['cost'] ?? 0,
            'status' => $validated['status'] ?? 'completed',
            'performed_at' => $validated['performed_at'] ?? now(),
        ]);

        $record->load(['vehicle.vehicleBrand', 'vehicle.vehicleModel', 'vehicle.vehicleYear']);

        return response()->json([
            'message' => 'Repair record created successfully.',
            'data' => $record,
        ], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        if (! Schema::hasTable('repair_records')) {
            return response()->json(['message' => 'Record not found.'], 404);
        }

        $record = RepairRecord::where('id', $id)
            ->where('user_id', $user->id)
            ->with(['vehicle.vehicleBrand', 'vehicle.vehicleModel', 'vehicle.vehicleYear'])
            ->first();

        if (! $record) {
            return response()->json(['message' => 'Repair record not found or unauthorized.'], 404);
        }

        return response()->json(['data' => $record]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        if (! Schema::hasTable('repair_records')) {
            return response()->json(['message' => 'Record not found.'], 404);
        }

        $record = RepairRecord::where('id', $id)
            ->where('user_id', $user->id)
            ->first();

        if (! $record) {
            return response()->json(['message' => 'Repair record not found or unauthorized.'], 404);
        }

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'problem' => 'nullable|string',
            'solution' => 'nullable|string',
            'cost' => 'nullable|numeric|min:0',
            'status' => 'nullable|string|in:pending,in_progress,completed,cancelled',
            'performed_at' => 'nullable|date',
        ]);

        $record->update($validated);
        $record->load(['vehicle.vehicleBrand', 'vehicle.vehicleModel', 'vehicle.vehicleYear']);

        return response()->json([
            'message' => 'Repair record updated successfully.',
            'data' => $record,
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        if (! Schema::hasTable('repair_records')) {
            return response()->json(['message' => 'Record not found.'], 404);
        }

        $record = RepairRecord::where('id', $id)
            ->where('user_id', $user->id)
            ->first();

        if (! $record) {
            return response()->json(['message' => 'Repair record not found or unauthorized.'], 404);
        }

        $record->delete();

        return response()->json(['message' => 'Repair record deleted successfully.']);
    }
}
