<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ChatSession;
use App\Models\Diagnostic;
use App\Models\MaintenanceRecord;
use App\Models\RepairRecord;
use App\Models\ServiceReferral;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class HistoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $type = $request->query('type', 'all');
        $search = strtolower(trim((string) $request->query('search', '')));
        $vehicleId = $request->query('vehicle_id');
        $sort = $request->query('sort', 'recent');
        $page = max(1, (int) $request->query('page', 1));
        $perPage = max(1, min(100, (int) $request->query('per_page', 20)));

        $items = collect();

        // Helper to extract vehicle array
        $getVehicleData = function ($v) {
            if (! $v) {
                return null;
            }
            $brand = $v->custom_brand ?: ($v->vehicleBrand->name ?? '');
            $model = $v->custom_model ?: ($v->vehicleModel->name ?? '');
            $year = $v->custom_year ?: ($v->vehicleYear->year ?? '');
            $name = trim("{$brand} {$model} {$year}") ?: 'Vehicle';

            return [
                'id' => $v->id,
                'name' => $name,
                'brand' => $brand ?: null,
                'model' => $model ?: null,
                'year' => $year ?: null,
            ];
        };

        // 1. Diagnostics
        if (in_array($type, ['all', 'diagnosis'], true) && Schema::hasTable('diagnostics')) {
            $diagQuery = Diagnostic::where('user_id', $user->id)
                ->with(['vehicle.vehicleBrand', 'vehicle.vehicleModel', 'vehicle.vehicleYear']);

            if ($vehicleId) {
                $diagQuery->where('vehicle_id', $vehicleId);
            }

            if ($search !== '') {
                $diagQuery->where(function ($q) use ($search) {
                    $q->where('symptoms', 'like', "%{$search}%")
                      ->orWhere('summary', 'like', "%{$search}%")
                      ->orWhere('urgency', 'like', "%{$search}%")
                      ->orWhere('severity', 'like', "%{$search}%");
                });
            }

            $diagnostics = $diagQuery->get();

            foreach ($diagnostics as $diag) {
                $vehicleData = $getVehicleData($diag->vehicle);
                $symptomsArr = is_array($diag->symptoms)
                    ? $diag->symptoms
                    : (is_string($diag->symptoms) && trim($diag->symptoms) !== '' ? [trim($diag->symptoms)] : []);

                $items->push([
                    'id' => "diagnosis:{$diag->id}",
                    'raw_id' => (string) $diag->id,
                    'type' => 'diagnosis',
                    'title' => $diag->summary ?: ($symptomsArr[0] ?? 'AI Diagnostic Assessment'),
                    'summary' => $diag->summary ?: implode(', ', $symptomsArr),
                    'vehicle' => $vehicleData,
                    'vehicle_id' => $diag->vehicle_id,
                    'vehicleName' => $vehicleData['name'] ?? null,
                    'created_at' => $diag->created_at ? $diag->created_at->toISOString() : now()->toISOString(),
                    'updated_at' => $diag->updated_at ? $diag->updated_at->toISOString() : now()->toISOString(),
                    'urgency' => strtolower((string) $diag->urgency),
                    'severity' => $diag->severity,
                    'confidence' => (float) $diag->confidence,
                    'symptoms' => $symptomsArr,
                    'possible_causes' => $diag->possible_causes ?? [],
                    'possibleCauses' => $diag->possible_causes ?? [],
                    'recommended_actions' => $diag->recommended_actions ?? [],
                    'recommendedActions' => $diag->recommended_actions ?? [],
                    'estimated_cost' => [
                        'min' => (float) $diag->estimated_cost_min,
                        'max' => (float) $diag->estimated_cost_max,
                        'currency' => $diag->currency ?: 'PHP',
                    ],
                    'estimatedCost' => [
                        'min' => (float) $diag->estimated_cost_min,
                        'max' => (float) $diag->estimated_cost_max,
                        'currency' => $diag->currency ?: 'PHP',
                    ],
                    'professional_help' => [
                        'recommended' => (bool) $diag->professional_help_recommended,
                        'reason' => $diag->professional_help_reason,
                        'priority' => $diag->professional_help_priority,
                    ],
                    'diagnostic_id' => $diag->id,
                ]);
            }
        }

        // 2. Chat Sessions
        if (in_array($type, ['all', 'chat'], true) && Schema::hasTable('chat_sessions')) {
            $chatQuery = ChatSession::where('user_id', $user->id)
                ->with(['vehicle.vehicleBrand', 'vehicle.vehicleModel', 'vehicle.vehicleYear', 'messages']);

            if ($vehicleId) {
                $chatQuery->where('vehicle_id', $vehicleId);
            }

            if ($search !== '') {
                $chatQuery->where(function ($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                      ->orWhereHas('messages', function ($mq) use ($search) {
                          $mq->where('text', 'like', "%{$search}%");
                      });
                });
            }

            $sessions = $chatQuery->get();

            foreach ($sessions as $sess) {
                $vehicleData = $getVehicleData($sess->vehicle);
                $lastMsg = $sess->messages->last();

                $items->push([
                    'id' => "chat:{$sess->id}",
                    'raw_id' => (string) $sess->id,
                    'type' => 'chat',
                    'title' => $sess->title ?: ($vehicleData ? "Chat ({$vehicleData['name']})" : 'Ask VehiCare Chat'),
                    'summary' => $lastMsg ? $lastMsg->text : 'Vehicle diagnostic consultation',
                    'vehicle' => $vehicleData,
                    'vehicle_id' => $sess->vehicle_id,
                    'vehicleName' => $vehicleData['name'] ?? null,
                    'created_at' => $sess->created_at ? $sess->created_at->toISOString() : now()->toISOString(),
                    'updated_at' => $sess->updated_at ? $sess->updated_at->toISOString() : now()->toISOString(),
                    'session_id' => $sess->id,
                    'status' => $sess->status,
                    'message_count' => $sess->messages->count(),
                    'messages' => $sess->messages->map(fn ($m) => [
                        'id' => $m->id,
                        'role' => $m->role,
                        'sender' => $m->sender,
                        'text' => $m->text,
                        'message' => $m->text,
                        'metadata' => $m->metadata,
                        'created_at' => $m->created_at ? $m->created_at->toISOString() : now()->toISOString(),
                    ])->values()->toArray(),
                ]);
            }
        }

        // 3. Maintenance Records
        if (in_array($type, ['all', 'maintenance'], true) && Schema::hasTable('maintenance_records')) {
            $maintQuery = MaintenanceRecord::where('user_id', $user->id)
                ->with(['vehicle.vehicleBrand', 'vehicle.vehicleModel', 'vehicle.vehicleYear']);

            if ($vehicleId) {
                $maintQuery->where('vehicle_id', $vehicleId);
            }

            if ($search !== '') {
                $maintQuery->where(function ($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%")
                      ->orWhere('service_type', 'like', "%{$search}%");
                });
            }

            foreach ($maintQuery->get() as $maint) {
                $vehicleData = $getVehicleData($maint->vehicle);
                $items->push([
                    'id' => "maintenance:{$maint->id}",
                    'raw_id' => (string) $maint->id,
                    'type' => 'maintenance',
                    'title' => $maint->title ?: 'Vehicle Maintenance',
                    'summary' => $maint->description ?: "Service: {$maint->service_type}",
                    'vehicle' => $vehicleData,
                    'vehicle_id' => $maint->vehicle_id,
                    'vehicleName' => $vehicleData['name'] ?? null,
                    'service_type' => $maint->service_type,
                    'cost' => (float) $maint->cost,
                    'odometer' => $maint->odometer,
                    'notes' => $maint->notes,
                    'performed_at' => $maint->performed_at ? $maint->performed_at->toISOString() : null,
                    'created_at' => $maint->created_at ? $maint->created_at->toISOString() : now()->toISOString(),
                    'updated_at' => $maint->updated_at ? $maint->updated_at->toISOString() : now()->toISOString(),
                ]);
            }
        }

        // 4. Repair Records
        if (in_array($type, ['all', 'repair'], true) && Schema::hasTable('repair_records')) {
            $repairQuery = RepairRecord::where('user_id', $user->id)
                ->with(['vehicle.vehicleBrand', 'vehicle.vehicleModel', 'vehicle.vehicleYear']);

            if ($vehicleId) {
                $repairQuery->where('vehicle_id', $vehicleId);
            }

            if ($search !== '') {
                $repairQuery->where(function ($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%")
                      ->orWhere('problem', 'like', "%{$search}%")
                      ->orWhere('solution', 'like', "%{$search}%");
                });
            }

            foreach ($repairQuery->get() as $rep) {
                $vehicleData = $getVehicleData($rep->vehicle);
                $items->push([
                    'id' => "repair:{$rep->id}",
                    'raw_id' => (string) $rep->id,
                    'type' => 'repair',
                    'title' => $rep->title ?: 'Vehicle Repair',
                    'summary' => $rep->description ?: $rep->problem ?: 'Vehicle repair service',
                    'vehicle' => $vehicleData,
                    'vehicle_id' => $rep->vehicle_id,
                    'vehicleName' => $vehicleData['name'] ?? null,
                    'problem' => $rep->problem,
                    'solution' => $rep->solution,
                    'status' => $rep->status,
                    'cost' => (float) $rep->cost,
                    'performed_at' => $rep->performed_at ? $rep->performed_at->toISOString() : null,
                    'created_at' => $rep->created_at ? $rep->created_at->toISOString() : now()->toISOString(),
                    'updated_at' => $rep->updated_at ? $rep->updated_at->toISOString() : now()->toISOString(),
                ]);
            }
        }

        // 5. Service Referrals
        if (in_array($type, ['all', 'referral'], true) && Schema::hasTable('service_referrals')) {
            $refQuery = ServiceReferral::where('user_id', $user->id)
                ->with(['vehicle.vehicleBrand', 'vehicle.vehicleModel', 'vehicle.vehicleYear']);

            if ($vehicleId) {
                $refQuery->where('vehicle_id', $vehicleId);
            }

            if ($search !== '') {
                $refQuery->where(function ($q) use ($search) {
                    $q->where('shop_name', 'like', "%{$search}%")
                      ->orWhere('reason', 'like', "%{$search}%");
                });
            }

            foreach ($refQuery->get() as $ref) {
                $vehicleData = $getVehicleData($ref->vehicle);
                $items->push([
                    'id' => "referral:{$ref->id}",
                    'raw_id' => (string) $ref->id,
                    'type' => 'referral',
                    'title' => $ref->shop_name ? "Referral: {$ref->shop_name}" : 'Shop Referral',
                    'summary' => $ref->reason ?: 'Recommended repair shop referral.',
                    'vehicle' => $vehicleData,
                    'vehicle_id' => $ref->vehicle_id,
                    'vehicleName' => $vehicleData['name'] ?? null,
                    'shop_name' => $ref->shop_name,
                    'shop_address' => $ref->shop_address,
                    'status' => $ref->status,
                    'created_at' => $ref->created_at ? $ref->created_at->toISOString() : now()->toISOString(),
                    'updated_at' => $ref->updated_at ? $ref->updated_at->toISOString() : now()->toISOString(),
                ]);
            }
        }

        // 6. Sort unified list
        if ($sort === 'oldest') {
            $sorted = $items->sortBy(fn ($i) => strtotime($i['created_at']))->values();
        } elseif ($sort === 'updated') {
            $sorted = $items->sortByDesc(fn ($i) => strtotime($i['updated_at']))->values();
        } else {
            // 'recent'
            $sorted = $items->sortByDesc(fn ($i) => strtotime($i['created_at']))->values();
        }

        $total = $sorted->count();
        $lastPage = (int) ceil($total / $perPage);
        if ($lastPage < 1) {
            $lastPage = 1;
        }

        $pagedData = $sorted->slice(($page - 1) * $perPage, $perPage)->values();

        return response()->json([
            'data' => $pagedData,
            'meta' => [
                'current_page' => $page,
                'last_page' => $lastPage,
                'per_page' => $perPage,
                'total' => $total,
            ],
        ]);
    }

    public function show(Request $request, string $type, string $id): JsonResponse
    {
        $user = $request->user();
        $cleanId = preg_replace('/^(diagnosis:|chat:|maintenance:|repair:|referral:)/', '', $id);

        if ($type === 'diagnosis' && Schema::hasTable('diagnostics')) {
            $diag = Diagnostic::where('id', $cleanId)
                ->where('user_id', $user->id)
                ->with(['vehicle.vehicleBrand', 'vehicle.vehicleModel', 'vehicle.vehicleYear', 'media'])
                ->first();

            if (! $diag) {
                return response()->json(['message' => 'Diagnostic record not found.'], 404);
            }

            return response()->json(['data' => $diag]);
        }

        if ($type === 'chat' && Schema::hasTable('chat_sessions')) {
            $session = ChatSession::where('id', $cleanId)
                ->where('user_id', $user->id)
                ->with(['vehicle.vehicleBrand', 'vehicle.vehicleModel', 'vehicle.vehicleYear', 'messages'])
                ->first();

            if (! $session) {
                return response()->json(['message' => 'Chat session not found.'], 404);
            }

            return response()->json(['data' => $session]);
        }

        if ($type === 'maintenance' && Schema::hasTable('maintenance_records')) {
            $record = MaintenanceRecord::where('id', $cleanId)
                ->where('user_id', $user->id)
                ->with(['vehicle.vehicleBrand', 'vehicle.vehicleModel', 'vehicle.vehicleYear'])
                ->first();

            if (! $record) {
                return response()->json(['message' => 'Maintenance record not found.'], 404);
            }

            return response()->json(['data' => $record]);
        }

        if ($type === 'repair' && Schema::hasTable('repair_records')) {
            $record = RepairRecord::where('id', $cleanId)
                ->where('user_id', $user->id)
                ->with(['vehicle.vehicleBrand', 'vehicle.vehicleModel', 'vehicle.vehicleYear'])
                ->first();

            if (! $record) {
                return response()->json(['message' => 'Repair record not found.'], 404);
            }

            return response()->json(['data' => $record]);
        }

        if ($type === 'referral' && Schema::hasTable('service_referrals')) {
            $record = ServiceReferral::where('id', $cleanId)
                ->where('user_id', $user->id)
                ->with(['vehicle.vehicleBrand', 'vehicle.vehicleModel', 'vehicle.vehicleYear'])
                ->first();

            if (! $record) {
                return response()->json(['message' => 'Service referral not found.'], 404);
            }

            return response()->json(['data' => $record]);
        }

        return response()->json(['message' => 'History record not found or unsupported type.'], 404);
    }
}
