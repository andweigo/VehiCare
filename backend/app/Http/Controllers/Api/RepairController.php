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
            'diagnostic_id' => 'nullable|integer|exists:diagnostics,id',
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
            'diagnostic_id' => $validated['diagnostic_id'] ?? null,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'problem' => $validated['problem'] ?? null,
            'solution' => $validated['solution'] ?? null,
            'cost' => $validated['cost'] ?? 0,
            'status' => $validated['status'] ?? 'completed',
            'performed_at' => $validated['performed_at'] ?? now(),
        ]);

        if ($record->status === 'completed') {
            $this->resolvePendingMaintenanceInspections($user->id, $record);
        }

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
            'diagnostic_id' => 'nullable|integer|exists:diagnostics,id',
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'problem' => 'nullable|string',
            'solution' => 'nullable|string',
            'cost' => 'nullable|numeric|min:0',
            'status' => 'nullable|string|in:pending,in_progress,completed,cancelled',
            'performed_at' => 'nullable|date',
        ]);

        $record->update($validated);

        if ($record->status === 'completed') {
            $this->resolvePendingMaintenanceInspections($user->id, $record);
        }

        $record->load(['vehicle.vehicleBrand', 'vehicle.vehicleModel', 'vehicle.vehicleYear']);

        return response()->json([
            'message' => 'Repair record updated successfully.',
            'data' => $record,
        ]);
    }

    /**
     * Resolve related pending maintenance inspections when a repair is confirmed completed.
     */
    protected function resolvePendingMaintenanceInspections(int $userId, RepairRecord $record): void
    {
        if (! Schema::hasTable('maintenance_records')) {
            return;
        }

        $pendingQuery = \App\Models\MaintenanceRecord::where('user_id', $userId)
            ->where('vehicle_id', $record->vehicle_id)
            ->where('status', 'pending');

        if ($record->diagnostic_id) {
            $pendingQuery->where('diagnostic_id', $record->diagnostic_id)
                ->update([
                    'status' => 'completed',
                    'performed_at' => now(),
                    'notes' => 'Verified and resolved by repair: ' . $record->title,
                ]);
        } else {
            $rawKeywords = explode(' ', strtolower($record->title . ' ' . ($record->problem ?? '')));
            $cleanKeywords = array_filter($rawKeywords, fn($w) => strlen(trim($w)) >= 4);

            if (!empty($cleanKeywords)) {
                $pendingRecords = $pendingQuery->get();
                foreach ($pendingRecords as $pending) {
                    $pText = strtolower($pending->title . ' ' . ($pending->description ?? ''));
                    foreach ($cleanKeywords as $kw) {
                        if (str_contains($pText, $kw)) {
                            $pending->update([
                                'status' => 'completed',
                                'performed_at' => now(),
                                'notes' => 'Verified and resolved by repair: ' . $record->title,
                            ]);
                            break;
                        }
                    }
                }
            }
        }
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
