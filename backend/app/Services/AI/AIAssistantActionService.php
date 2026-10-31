<?php

namespace App\Services\AI;

use App\Models\Diagnostic;
use App\Models\MaintenanceRecord;
use App\Models\RepairRecord;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleType;
use App\Notifications\MaintenanceRecommendationNotification;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AIAssistantActionService
{
    /**
     * Dispatch an action by name to its corresponding handler method.
     */
    public function execute(User $user, string $action, array $params = []): array
    {
        Log::info('[AIAssistantActionService] Executing action', [
            'user_id' => $user->id,
            'action' => $action,
            'params' => array_keys($params),
        ]);

        return match ($action) {
            // Group A: Vehicle Management
            'create_vehicle' => $this->createVehicle($user, $params),
            'update_vehicle' => $this->updateVehicle($user, $params),
            'switch_active_vehicle' => $this->switchActiveVehicle($user, $params),
            'get_vehicle_details' => $this->getVehicleDetails($user, $params),
            'get_all_user_vehicles' => $this->getAllUserVehicles($user),

            // Group B: Maintenance Planning & Scheduling
            'generate_maintenance_plan' => $this->generateMaintenancePlan($user, $params),
            'create_maintenance_task' => $this->createMaintenanceTask($user, $params),
            'create_maintenance_schedule' => $this->createMaintenanceSchedule($user, $params),
            'create_maintenance_reminder' => $this->createMaintenanceReminder($user, $params),
            'update_maintenance_schedule' => $this->updateMaintenanceSchedule($user, $params),
            'get_upcoming_maintenance' => $this->getUpcomingMaintenance($user, $params),
            'complete_maintenance_task' => $this->completeMaintenanceTask($user, $params),

            // Group C: Diagnosis Follow-Through
            'get_diagnostic_history' => $this->getDiagnosticHistory($user, $params),
            'create_diagnostic_followup_task' => $this->createDiagnosticFollowupTask($user, $params),
            'record_repair_outcome' => $this->recordRepairOutcome($user, $params),
            'reassess_vehicle_issue' => $this->reassessVehicleIssue($user, $params),

            // Group D: Maintenance History & Expenses
            'log_maintenance_record' => $this->logMaintenanceRecord($user, $params),
            'get_maintenance_history' => $this->getMaintenanceHistory($user, $params),
            'update_maintenance_record' => $this->updateMaintenanceRecord($user, $params),
            'summarize_vehicle_expenses' => $this->summarizeVehicleExpenses($user, $params),
            'generate_vehicle_care_report' => $this->generateVehicleCareReport($user, $params),

            // Group E: Smart Vehicle Priority
            'calculate_vehicle_priority' => $this->calculateVehiclePriority($user, $params),
            'rank_user_vehicles' => $this->rankUserVehicles($user),
            'get_vehicle_attention_summary' => $this->getVehicleAttentionSummary($user, $params),

            // Group F: Proactive Briefing
            'generate_proactive_briefing' => $this->generateProactiveBriefing($user, $params),

            default => [
                'success' => false,
                'message' => "Unknown action '{$action}'.",
                'code' => 'UNKNOWN_ACTION',
            ],
        };
    }

    // =========================================================================
    // GROUP A: CONVERSATIONAL VEHICLE MANAGEMENT
    // =========================================================================

    public function createVehicle(User $user, array $params): array
    {
        $rawType = trim((string) ($params['vehicle_type'] ?? $params['type'] ?? 'car'));
        $brand = trim((string) ($params['brand'] ?? $params['custom_brand'] ?? ''));
        $model = trim((string) ($params['model'] ?? $params['custom_model'] ?? ''));
        $year = trim((string) ($params['year'] ?? $params['custom_year'] ?? ''));
        $vinRaw = strtoupper(trim((string) ($params['vin'] ?? $params['model_number'] ?? '')));

        if ($brand === '' || $model === '') {
            return [
                'success' => false,
                'message' => 'Please provide the vehicle brand and model to create a profile.',
                'code' => 'MISSING_REQUIRED_FIELDS',
            ];
        }

        $isBicycle = str_contains(strtolower($rawType), 'bicycle')
            || (str_contains(strtolower($rawType), 'bike') && !str_contains(strtolower($rawType), 'motorbike') && !str_contains(strtolower($rawType), 'motorcycle'));

        if (!$isBicycle && $vinRaw !== '' && !preg_match('/^[A-HJ-NPR-Z0-9]{17}$/i', $vinRaw)) {
            return [
                'success' => false,
                'message' => 'Vehicle Identification Number (VIN) must be 17 alphanumeric characters (excluding I, O, and Q), or left blank.',
                'code' => 'INVALID_VIN',
            ];
        }

        $modelNumber = $isBicycle ? ($vinRaw ?: null) : ($vinRaw ?: null);

        return DB::transaction(function () use ($user, $rawType, $brand, $model, $year, $modelNumber) {
            $lockedUser = User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            $lockedUser->checkSubscriptionStatus();
            $allowance = $lockedUser->vehicleAllowance();
            $isPremium = $lockedUser->isPremium();

            $countToCheck = $isPremium
                ? $lockedUser->vehicles()->count()
                : $lockedUser->activeVehicles()->count();

            if ($countToCheck >= $allowance) {
                return [
                    'success' => false,
                    'message' => $isPremium
                        ? "Your Premium plan allows up to {$allowance} vehicle profile(s) (including archived vehicles)."
                        : "Your current plan allows only {$allowance} active vehicle profile. Upgrade to Premium to add more vehicles.",
                    'code' => 'VEHICLE_LIMIT_REACHED',
                ];
            }

            // 2-minute idempotency check against duplicate submissions
            $recentDuplicate = $lockedUser->vehicles()
                ->where('created_at', '>=', now()->subMinutes(2))
                ->where('custom_brand', $brand)
                ->where('custom_model', $model)
                ->latest('id')
                ->first();

            if ($recentDuplicate) {
                $recentDuplicate->load(['vehicleType', 'vehicleBrand', 'vehicleModel', 'vehicleYear']);
                return [
                    'success' => true,
                    'message' => 'Vehicle profile is already saved in your garage.',
                    'vehicle_id' => $recentDuplicate->id,
                    'vehicle' => $recentDuplicate,
                ];
            }

            // Match vehicle type
            $typeModel = VehicleType::where('name', 'like', "%{$rawType}%")->first();
            $typeId = $typeModel ? $typeModel->id : 1;

            $vehicle = $lockedUser->vehicles()->create([
                'vehicle_type_id' => $typeId,
                'custom_brand' => $brand,
                'custom_model' => $model,
                'custom_year' => $year ?: null,
                'model_number' => $modelNumber ?: null,
            ]);

            if (!$lockedUser->active_vehicle_id) {
                $lockedUser->active_vehicle_id = $vehicle->id;
                $lockedUser->save();
            }

            $vehicle->load(['vehicleType', 'vehicleBrand', 'vehicleModel', 'vehicleYear']);

            return [
                'success' => true,
                'message' => "Successfully added {$year} {$brand} {$model} to your garage.",
                'vehicle_id' => $vehicle->id,
                'vehicle' => $vehicle,
            ];
        }, 3);
    }

    public function updateVehicle(User $user, array $params): array
    {
        $vehicleId = $params['vehicle_id'] ?? $user->active_vehicle_id;
        $vehicle = $user->vehicles()->with('vehicleType')->where('id', $vehicleId)->first();

        if (!$vehicle) {
            return [
                'success' => false,
                'message' => 'Vehicle not found or you do not have permission to edit it.',
                'code' => 'VEHICLE_NOT_FOUND',
            ];
        }

        $updates = [];
        if (!empty($params['brand']) || !empty($params['custom_brand'])) {
            $updates['custom_brand'] = trim($params['brand'] ?? $params['custom_brand']);
        }
        if (!empty($params['model']) || !empty($params['custom_model'])) {
            $updates['custom_model'] = trim($params['model'] ?? $params['custom_model']);
        }
        if (!empty($params['year']) || !empty($params['custom_year'])) {
            $updates['custom_year'] = trim($params['year'] ?? $params['custom_year']);
        }
        if (array_key_exists('vin', $params) || array_key_exists('model_number', $params)) {
            $vinVal = strtoupper(trim((string) ($params['vin'] ?? $params['model_number'] ?? '')));
            $typeName = strtolower((string) ($vehicle->vehicleType?->name ?? 'car'));
            $isBicycle = str_contains($typeName, 'bicycle') || ($typeName === 'bike');
            if (!$isBicycle && $vinVal !== '' && !preg_match('/^[A-HJ-NPR-Z0-9]{17}$/i', $vinVal)) {
                return [
                    'success' => false,
                    'message' => 'Vehicle Identification Number (VIN) must be 17 alphanumeric characters (excluding I, O, and Q), or left blank.',
                    'code' => 'INVALID_VIN',
                ];
            }
            $updates['model_number'] = $vinVal ?: null;
        }

        if (empty($updates)) {
            return [
                'success' => false,
                'message' => 'No changes were provided to update.',
                'code' => 'NO_UPDATES_PROVIDED',
            ];
        }

        $vehicle->update($updates);
        $vehicle->load(['vehicleType', 'vehicleBrand', 'vehicleModel', 'vehicleYear']);

        return [
            'success' => true,
            'message' => 'Vehicle profile updated successfully.',
            'vehicle_id' => $vehicle->id,
            'vehicle' => $vehicle,
        ];
    }

    public function switchActiveVehicle(User $user, array $params): array
    {
        $targetVehicle = null;

        if (!empty($params['vehicle_id'])) {
            $targetVehicle = $user->vehicles()->whereNull('archived_at')->find($params['vehicle_id']);
        }

        if (!$targetVehicle && !empty($params['search_name'])) {
            $search = strtolower(trim($params['search_name']));
            $targetVehicle = $user->vehicles()
                ->whereNull('archived_at')
                ->where(function ($q) use ($search) {
                    $q->where('custom_brand', 'like', "%{$search}%")
                      ->orWhere('custom_model', 'like', "%{$search}%");
                })
                ->first();
        }

        if (!$targetVehicle) {
            return [
                'success' => false,
                'message' => 'Could not find the specified vehicle in your garage.',
                'code' => 'VEHICLE_NOT_FOUND',
            ];
        }

        $user->active_vehicle_id = $targetVehicle->id;
        $user->save();

        $targetVehicle->load(['vehicleType', 'vehicleBrand', 'vehicleModel', 'vehicleYear']);

        $vName = trim(($targetVehicle->custom_brand ?: $targetVehicle->vehicleBrand?->name ?: '') . ' ' . ($targetVehicle->custom_model ?: $targetVehicle->vehicleModel?->name ?: '')) ?: 'Vehicle';

        return [
            'success' => true,
            'message' => "Switched active vehicle to {$vName}.",
            'active_vehicle' => $targetVehicle,
        ];
    }

    public function getVehicleDetails(User $user, array $params): array
    {
        $vehicle = $this->resolveVehicle($user, $params['vehicle_id'] ?? null);

        if (!$vehicle) {
            return [
                'success' => false,
                'message' => 'Vehicle not found.',
                'code' => 'VEHICLE_NOT_FOUND',
            ];
        }

        $healthScore = $this->calculateVehicleHealthScore($vehicle);
        $pendingTasks = MaintenanceRecord::where('user_id', $user->id)
            ->where('vehicle_id', $vehicle->id)
            ->where('status', 'pending')
            ->latest('created_at')
            ->limit(5)
            ->get();

        $activeDiagnostics = Diagnostic::where('vehicle_id', $vehicle->id)
            ->whereDoesntHave('repairRecords', function ($q) {
                $q->where('status', 'completed');
            })
            ->latest('created_at')
            ->limit(3)
            ->get();

        return [
            'success' => true,
            'vehicle' => $vehicle,
            'health_score' => $healthScore,
            'pending_tasks' => $pendingTasks,
            'active_diagnostics' => $activeDiagnostics,
        ];
    }

    public function getAllUserVehicles(User $user): array
    {
        $activeId = $user->active_vehicle_id;
        $vehicles = $user->vehicles()
            ->whereNull('archived_at')
            ->with(['vehicleType', 'vehicleBrand', 'vehicleModel', 'vehicleYear'])
            ->latest()
            ->get()
            ->map(function ($vehicle) use ($activeId) {
                $health = $this->calculateVehicleHealthScore($vehicle);
                return [
                    'id' => $vehicle->id,
                    'name' => trim(($vehicle->custom_brand ?: $vehicle->vehicleBrand?->name ?: '') . ' ' . ($vehicle->custom_model ?: $vehicle->vehicleModel?->name ?: '')) ?: 'Vehicle',
                    'type' => $vehicle->vehicleType?->name ?? 'Vehicle',
                    'year' => $vehicle->custom_year ?: $vehicle->vehicleYear?->year,
                    'is_active' => $activeId && $vehicle->id === $activeId,
                    'health_score' => $health,
                    'health_badge' => $health >= 80 ? 'OPTIMAL' : ($health >= 60 ? 'GOOD' : 'ATTENTION'),
                ];
            });

        return [
            'success' => true,
            'vehicles' => $vehicles,
        ];
    }

    // =========================================================================
    // GROUP B: MAINTENANCE PLANNING & SCHEDULING
    // =========================================================================

    public function generateMaintenancePlan(User $user, array $params): array
    {
        $vehicle = $this->resolveVehicle($user, $params['vehicle_id'] ?? null);

        if (!$vehicle) {
            return [
                'success' => false,
                'message' => 'No vehicle selected to generate a maintenance plan.',
                'code' => 'VEHICLE_NOT_FOUND',
            ];
        }

        $type = strtolower($vehicle->vehicleType?->name ?? 'car');
        $odometer = (int) ($params['current_odometer'] ?? $params['odometer'] ?? 0);

        $plans = [];
        if (str_contains($type, 'motorcycle') || str_contains($type, 'scooter') || str_contains($type, 'bike')) {
            $plans = [
                [
                    'title' => 'Engine Oil & Filter Service',
                    'interval_km' => 3000,
                    'interval_months' => 3,
                    'source' => 'Manufacturer standard interval',
                    'urgency' => 'Routine',
                    'service_type' => 'Oil Change',
                ],
                [
                    'title' => 'Drive Chain / CVT Belt Inspection',
                    'interval_km' => 1000,
                    'interval_months' => 1,
                    'source' => 'General preventive care',
                    'urgency' => 'Routine',
                    'service_type' => 'Drivetrain',
                ],
                [
                    'title' => 'Brake Pads & Fluid Level Inspection',
                    'interval_km' => 5000,
                    'interval_months' => 6,
                    'source' => 'Safety critical standard',
                    'urgency' => 'Urgent',
                    'service_type' => 'Brakes',
                ],
                [
                    'title' => 'Spark Plug & Air Filter Check',
                    'interval_km' => 6000,
                    'interval_months' => 6,
                    'source' => 'Manufacturer standard interval',
                    'urgency' => 'Routine',
                    'service_type' => 'Engine Tuning',
                ],
            ];
        } elseif (str_contains($type, 'bicycle')) {
            $plans = [
                [
                    'title' => 'Chain Cleaning & Lubrication',
                    'interval_km' => 200,
                    'interval_months' => 1,
                    'source' => 'Drivetrain longevity standard',
                    'urgency' => 'Routine',
                    'service_type' => 'Lubrication',
                ],
                [
                    'title' => 'Brake Cable Tension & Pad Alignment',
                    'interval_km' => 500,
                    'interval_months' => 1,
                    'source' => 'Safety critical standard',
                    'urgency' => 'Urgent',
                    'service_type' => 'Brakes',
                ],
                [
                    'title' => 'Tire Tread, Sidewall & Spoke Tension Check',
                    'interval_km' => 1000,
                    'interval_months' => 3,
                    'source' => 'General preventive care',
                    'urgency' => 'Routine',
                    'service_type' => 'Wheels & Tires',
                ],
            ];
        } else {
            // Standard car / automobile
            $plans = [
                [
                    'title' => 'Engine Oil & Filter Replacement',
                    'interval_km' => 7500,
                    'interval_months' => 6,
                    'source' => 'Manufacturer standard interval',
                    'urgency' => 'Routine',
                    'service_type' => 'Oil Change',
                ],
                [
                    'title' => 'Tire Rotation & Wheel Alignment Check',
                    'interval_km' => 10000,
                    'interval_months' => 6,
                    'source' => 'Manufacturer standard interval',
                    'urgency' => 'Routine',
                    'service_type' => 'Tire Service',
                ],
                [
                    'title' => 'Brake System Inspection (Pads, Rotors, Fluid)',
                    'interval_km' => 15000,
                    'interval_months' => 12,
                    'source' => 'Safety critical standard',
                    'urgency' => 'Urgent',
                    'service_type' => 'Brakes',
                ],
                [
                    'title' => 'Engine Air Filter & Cabin AC Filter Replacement',
                    'interval_km' => 20000,
                    'interval_months' => 12,
                    'source' => 'General preventive care',
                    'urgency' => 'Routine',
                    'service_type' => 'Filters',
                ],
            ];
        }

        return [
            'success' => true,
            'vehicle_id' => $vehicle->id,
            'current_odometer' => $odometer,
            'vehicle_type' => $type,
            'recommended_plan' => $plans,
        ];
    }

    public function createMaintenanceTask(User $user, array $params): array
    {
        $title = trim((string) ($params['title'] ?? ''));

        if ($title === '') {
            return [
                'success' => false,
                'message' => 'Please provide a title for the maintenance task.',
                'code' => 'MISSING_TASK_TITLE',
            ];
        }

        $vehicle = $this->resolveVehicle($user, $params['vehicle_id'] ?? null);
        if (!$vehicle) {
            return [
                'success' => false,
                'message' => 'Vehicle ownership verification failed.',
                'code' => 'UNAUTHORIZED_VEHICLE',
            ];
        }

        $existing = MaintenanceRecord::where('user_id', $user->id)
            ->where('vehicle_id', $vehicle->id)
            ->where('title', $title)
            ->where('status', 'pending')
            ->first();

        if ($existing) {
            return [
                'success' => true,
                'message' => 'Maintenance task is already scheduled.',
                'record_id' => $existing->id,
                'vehicle_id' => $existing->vehicle_id,
                'record' => $existing,
            ];
        }

        $dueDate = null;
        if (!empty($params['due_date'])) {
            try {
                $dueDate = Carbon::parse($params['due_date']);
            } catch (\Throwable) {
                $dueDate = now()->addDays(7);
            }
        }

        $record = MaintenanceRecord::create([
            'user_id' => $user->id,
            'vehicle_id' => $vehicle->id,
            'title' => $title,
            'description' => $params['description'] ?? "Maintenance task scheduled by VehiCare AI.",
            'service_type' => $params['service_type'] ?? 'General Inspection',
            'status' => 'pending',
            'is_inspection' => false,
            'urgency' => $params['urgency'] ?? 'Routine',
            'due_date' => $dueDate,
            'notes' => $params['notes'] ?? null,
            'cost' => (float) ($params['cost'] ?? 0),
        ]);

        if ($dueDate) {
            $this->dispatchMaintenanceNotification($user, $vehicle, $record);
        }

        return [
            'success' => true,
            'message' => "Scheduled '{$title}' successfully.",
            'record_id' => $record->id,
            'vehicle_id' => $vehicle->id,
            'record' => $record,
        ];
    }

    public function createMaintenanceSchedule(User $user, array $params): array
    {
        return $this->createMaintenanceTask($user, $params);
    }

    public function createMaintenanceReminder(User $user, array $params): array
    {
        $recordId = $params['record_id'] ?? $params['maintenance_record_id'] ?? null;
        $record = null;

        if ($recordId) {
            $record = MaintenanceRecord::where('user_id', $user->id)->find($recordId);
        }

        if (!$record) {
            return $this->createMaintenanceTask($user, $params);
        }

        $vehicle = $user->vehicles()->find($record->vehicle_id);
        $this->dispatchMaintenanceNotification($user, $vehicle, $record);

        return [
            'success' => true,
            'message' => "Reminder set for '{$record->title}'.",
            'record_id' => $record->id,
            'vehicle_id' => $record->vehicle_id,
            'record' => $record,
        ];
    }

    public function updateMaintenanceSchedule(User $user, array $params): array
    {
        $recordId = $params['record_id'] ?? null;
        $record = MaintenanceRecord::where('user_id', $user->id)->find($recordId);

        if (!$record) {
            return [
                'success' => false,
                'message' => 'Maintenance record not found.',
                'code' => 'RECORD_NOT_FOUND',
            ];
        }

        $updates = [];
        if (!empty($params['due_date'])) {
            try {
                $updates['due_date'] = Carbon::parse($params['due_date']);
            } catch (\Throwable) {}
        }
        if (!empty($params['status'])) {
            $updates['status'] = $params['status'];
        }
        if (!empty($params['notes'])) {
            $updates['notes'] = $params['notes'];
        }

        $record->update($updates);

        return [
            'success' => true,
            'message' => 'Maintenance schedule updated.',
            'record' => $record,
        ];
    }

    public function getUpcomingMaintenance(User $user, array $params): array
    {
        $vehicle = $this->resolveVehicle($user, $params['vehicle_id'] ?? null);

        if (!$vehicle) {
            return [
                'success' => false,
                'message' => 'No active vehicle found.',
                'code' => 'VEHICLE_NOT_FOUND',
            ];
        }

        $tasks = MaintenanceRecord::where('user_id', $user->id)
            ->where('vehicle_id', $vehicle->id)
            ->where('status', 'pending')
            ->orderBy('due_date', 'asc')
            ->get();

        $now = now();
        $overdue = [];
        $upcoming = [];

        foreach ($tasks as $task) {
            if ($task->due_date && Carbon::parse($task->due_date)->lt($now)) {
                $overdue[] = $task;
            } else {
                $upcoming[] = $task;
            }
        }

        return [
            'success' => true,
            'vehicle_id' => $vehicle->id,
            'overdue_tasks' => $overdue,
            'upcoming_tasks' => $upcoming,
            'total_pending' => $tasks->count(),
        ];
    }

    public function completeMaintenanceTask(User $user, array $params): array
    {
        $recordId = $params['record_id'] ?? null;
        $record = null;

        if ($recordId) {
            $record = MaintenanceRecord::where('user_id', $user->id)->find($recordId);
        }

        if (!$record && !empty($params['task_title'])) {
            $title = trim($params['task_title']);
            $record = MaintenanceRecord::where('user_id', $user->id)
                ->where('title', 'like', "%{$title}%")
                ->where('status', 'pending')
                ->latest('id')
                ->first();
        }

        if (!$record) {
            return [
                'success' => false,
                'message' => 'Maintenance task not found or already completed.',
                'code' => 'TASK_NOT_FOUND',
            ];
        }

        $cost = (float) ($params['cost'] ?? $record->cost ?? 0);
        $odometer = isset($params['odometer']) ? (int) $params['odometer'] : $record->odometer;

        $record->update([
            'status' => 'completed',
            'performed_at' => now(),
            'cost' => $cost,
            'odometer' => $odometer,
            'notes' => $params['notes'] ?? $record->notes,
        ]);

        $vehicle = $user->vehicles()->find($record->vehicle_id);
        $newHealth = $vehicle ? $this->calculateVehicleHealthScore($vehicle) : 100;

        return [
            'success' => true,
            'message' => "Marked '{$record->title}' as completed.",
            'record' => $record,
            'updated_health_score' => $newHealth,
        ];
    }

    // =========================================================================
    // GROUP C: DIAGNOSIS FOLLOW-THROUGH
    // =========================================================================

    public function getDiagnosticHistory(User $user, array $params): array
    {
        $vehicleId = $params['vehicle_id'] ?? $user->active_vehicle_id;
        $limit = min(10, max(1, (int) ($params['limit'] ?? 5)));

        $diagnostics = Diagnostic::where('user_id', $user->id)
            ->when($vehicleId, fn($q) => $q->where('vehicle_id', $vehicleId))
            ->latest('created_at')
            ->limit($limit)
            ->get();

        return [
            'success' => true,
            'diagnostics' => $diagnostics,
        ];
    }

    public function createDiagnosticFollowupTask(User $user, array $params): array
    {
        $diagnosticId = $params['diagnostic_id'] ?? null;
        $diagnostic = Diagnostic::where('user_id', $user->id)->find($diagnosticId);

        if (!$diagnostic) {
            return [
                'success' => false,
                'message' => 'Diagnostic record not found.',
                'code' => 'DIAGNOSTIC_NOT_FOUND',
            ];
        }

        $title = trim((string) ($params['task_title'] ?? $params['title'] ?? 'Follow-up Inspection'));

        $record = MaintenanceRecord::create([
            'user_id' => $user->id,
            'vehicle_id' => $diagnostic->vehicle_id,
            'diagnostic_id' => $diagnostic->id,
            'title' => $title,
            'description' => "Inspection task derived from diagnosis #{$diagnostic->id}: " . ($diagnostic->summary ?? ''),
            'service_type' => 'Diagnostic Follow-up',
            'status' => 'pending',
            'is_inspection' => true,
            'urgency' => $diagnostic->severity ?? 'Routine',
            'due_date' => now()->addDays(7),
            'cost' => 0,
        ]);

        return [
            'success' => true,
            'message' => "Created follow-up inspection task: '{$title}'.",
            'record_id' => $record->id,
            'vehicle_id' => $record->vehicle_id,
            'record' => $record,
        ];
    }

    public function recordRepairOutcome(User $user, array $params): array
    {
        $vehicle = $this->resolveVehicle($user, $params['vehicle_id'] ?? null);

        if (!$vehicle) {
            return [
                'success' => false,
                'message' => 'Vehicle ownership verification failed.',
                'code' => 'UNAUTHORIZED_VEHICLE',
            ];
        }

        $diagnosticId = $params['diagnostic_id'] ?? null;
        $title = trim((string) ($params['title'] ?? 'Vehicle Repair'));
        $problem = $params['problem'] ?? null;
        $solution = $params['solution'] ?? null;
        $cost = (float) ($params['cost'] ?? 0);

        $repair = RepairRecord::create([
            'user_id' => $user->id,
            'vehicle_id' => $vehicle->id,
            'diagnostic_id' => $diagnosticId,
            'title' => $title,
            'problem' => $problem,
            'solution' => $solution,
            'cost' => $cost,
            'status' => 'completed',
            'performed_at' => now(),
        ]);

        // Auto-resolve pending maintenance inspection records linked to this diagnosis or title
        $this->resolvePendingInspections($user->id, $repair);

        $newHealth = $this->calculateVehicleHealthScore($vehicle);

        return [
            'success' => true,
            'message' => "Recorded completed repair '{$title}'.",
            'repair' => $repair,
            'updated_health_score' => $newHealth,
        ];
    }

    public function reassessVehicleIssue(User $user, array $params): array
    {
        $diagnosticId = $params['diagnostic_id'] ?? null;
        $diagnostic = Diagnostic::where('user_id', $user->id)->find($diagnosticId);

        if (!$diagnostic) {
            return [
                'success' => false,
                'message' => 'Previous diagnostic record not found.',
                'code' => 'DIAGNOSTIC_NOT_FOUND',
            ];
        }

        $repair = RepairRecord::where('diagnostic_id', $diagnostic->id)->where('status', 'completed')->first();

        return [
            'success' => true,
            'diagnostic' => $diagnostic,
            'confirmed_repair' => $repair,
            'status' => $repair ? 'resolved' : 'unresolved',
            'message' => $repair
                ? "This issue was repaired on " . Carbon::parse($repair->performed_at)->format('M d, Y') . " ({$repair->solution})."
                : "This issue has no recorded completed repair. A follow-up inspection is recommended.",
        ];
    }

    // =========================================================================
    // GROUP D: MAINTENANCE HISTORY & EXPENSES
    // =========================================================================

    public function logMaintenanceRecord(User $user, array $params): array
    {
        $vehicle = $this->resolveVehicle($user, $params['vehicle_id'] ?? null);

        if (!$vehicle) {
            return [
                'success' => false,
                'message' => 'Vehicle ownership verification failed.',
                'code' => 'UNAUTHORIZED_VEHICLE',
            ];
        }

        $title = trim((string) ($params['title'] ?? 'Service Record'));
        $cost = max(0, (float) ($params['cost'] ?? 0));
        $odometer = isset($params['odometer']) ? max(0, (int) $params['odometer']) : null;

        $performedAt = now();
        if (!empty($params['performed_at'])) {
            try {
                $performedAt = Carbon::parse($params['performed_at']);
            } catch (\Throwable) {}
        }

        $record = MaintenanceRecord::create([
            'user_id' => $user->id,
            'vehicle_id' => $vehicle->id,
            'title' => $title,
            'service_type' => $params['service_type'] ?? 'General Service',
            'status' => 'completed',
            'performed_at' => $performedAt,
            'cost' => $cost,
            'odometer' => $odometer,
            'notes' => $params['notes'] ?? null,
            'is_inspection' => false,
            'urgency' => 'Routine',
        ]);

        $newHealth = $this->calculateVehicleHealthScore($vehicle);

        return [
            'success' => true,
            'message' => "Logged '{$title}' to maintenance history.",
            'record_id' => $record->id,
            'vehicle_id' => $vehicle->id,
            'record' => $record,
            'updated_health_score' => $newHealth,
        ];
    }

    public function getMaintenanceHistory(User $user, array $params): array
    {
        $vehicleId = $params['vehicle_id'] ?? $user->active_vehicle_id;
        $limit = min(20, max(1, (int) ($params['limit'] ?? 10)));

        $records = MaintenanceRecord::where('user_id', $user->id)
            ->where('status', 'completed')
            ->when($vehicleId, fn($q) => $q->where('vehicle_id', $vehicleId))
            ->latest('performed_at')
            ->limit($limit)
            ->get();

        return [
            'success' => true,
            'records' => $records,
        ];
    }

    public function updateMaintenanceRecord(User $user, array $params): array
    {
        $recordId = $params['record_id'] ?? null;
        $record = MaintenanceRecord::where('user_id', $user->id)->find($recordId);

        if (!$record) {
            return [
                'success' => false,
                'message' => 'Record not found.',
                'code' => 'RECORD_NOT_FOUND',
            ];
        }

        $updates = [];
        if (isset($params['cost'])) $updates['cost'] = max(0, (float) $params['cost']);
        if (isset($params['odometer'])) $updates['odometer'] = max(0, (int) $params['odometer']);
        if (isset($params['notes'])) $updates['notes'] = $params['notes'];
        if (isset($params['title'])) $updates['title'] = trim($params['title']);

        $record->update($updates);

        return [
            'success' => true,
            'message' => 'Record updated successfully.',
            'record' => $record,
        ];
    }

    public function summarizeVehicleExpenses(User $user, array $params): array
    {
        $vehicle = $this->resolveVehicle($user, $params['vehicle_id'] ?? null);

        if (!$vehicle) {
            return [
                'success' => false,
                'message' => 'No active vehicle found.',
                'code' => 'VEHICLE_NOT_FOUND',
            ];
        }

        $maintTotal = (float) MaintenanceRecord::where('user_id', $user->id)
            ->where('vehicle_id', $vehicle->id)
            ->where('status', 'completed')
            ->sum('cost');

        $repairTotal = (float) RepairRecord::where('user_id', $user->id)
            ->where('vehicle_id', $vehicle->id)
            ->where('status', 'completed')
            ->sum('cost');

        $totalSpent = $maintTotal + $repairTotal;

        $byServiceType = MaintenanceRecord::where('user_id', $user->id)
            ->where('vehicle_id', $vehicle->id)
            ->where('status', 'completed')
            ->select('service_type', DB::raw('SUM(cost) as total_cost'), DB::raw('COUNT(*) as count'))
            ->groupBy('service_type')
            ->get();

        $vName = trim(($vehicle->custom_brand ?: $vehicle->vehicleBrand?->name ?: '') . ' ' . ($vehicle->custom_model ?: $vehicle->vehicleModel?->name ?: '')) ?: 'Vehicle';

        return [
            'success' => true,
            'vehicle_id' => $vehicle->id,
            'vehicle_name' => $vName,
            'total_spent' => $totalSpent,
            'maintenance_spent' => $maintTotal,
            'repair_spent' => $repairTotal,
            'breakdown_by_service_type' => $byServiceType,
            'currency' => 'PHP',
        ];
    }

    public function generateVehicleCareReport(User $user, array $params): array
    {
        $vehicle = $this->resolveVehicle($user, $params['vehicle_id'] ?? null);

        if (!$vehicle) {
            return [
                'success' => false,
                'message' => 'Vehicle not found.',
                'code' => 'VEHICLE_NOT_FOUND',
            ];
        }

        $priority = $this->calculateVehiclePriority($user, ['vehicle_id' => $vehicle->id]);
        $expenses = $this->summarizeVehicleExpenses($user, ['vehicle_id' => $vehicle->id]);
        $upcoming = $this->getUpcomingMaintenance($user, ['vehicle_id' => $vehicle->id]);

        $vName = trim(($vehicle->custom_brand ?: $vehicle->vehicleBrand?->name ?: '') . ' ' . ($vehicle->custom_model ?: $vehicle->vehicleModel?->name ?: '')) ?: 'Vehicle';

        return [
            'success' => true,
            'vehicle_id' => $vehicle->id,
            'vehicle_name' => $vName,
            'health_score' => $priority['health_score'],
            'priority_score' => $priority['priority_score'],
            'priority_category' => $priority['category'],
            'total_spent' => $expenses['total_spent'],
            'overdue_tasks_count' => count($upcoming['overdue_tasks']),
            'upcoming_tasks_count' => count($upcoming['upcoming_tasks']),
            'reasons' => $priority['reasons'],
        ];
    }

    // =========================================================================
    // GROUP E: SMART VEHICLE PRIORITY
    // =========================================================================

    public function calculateVehiclePriority(User $user, array $params = []): array
    {
        $vehicle = $this->resolveVehicle($user, $params['vehicle_id'] ?? null);

        if (!$vehicle) {
            return [
                'success' => false,
                'message' => 'No active vehicle found to assess priority.',
                'priority_score' => 0,
                'category' => 'STABLE',
            ];
        }

        // 1. Diagnostics score (P_diag)
        $activeDiags = Diagnostic::where('vehicle_id', $vehicle->id)
            ->whereDoesntHave('repairRecords', function ($q) {
                $q->where('status', 'completed');
            })
            ->get();

        $pDiag = 0;
        $diagReasons = [];
        foreach ($activeDiags as $diag) {
            $sev = strtolower((string) $diag->severity);
            if (in_array($sev, ['critical', 'urgent', 'high'])) {
                $pDiag += 40;
                $diagReasons[] = "High-severity alert: " . ($diag->summary ?? 'Unresolved diagnostic issue');
            } elseif (in_array($sev, ['medium', 'moderate'])) {
                $pDiag += 18;
                $diagReasons[] = "Moderate alert: " . ($diag->summary ?? 'Diagnostic check needed');
            } else {
                $pDiag += 8;
            }
        }

        // 2. Maintenance score (P_maint)
        $pendingTasks = MaintenanceRecord::where('user_id', $user->id)
            ->where('vehicle_id', $vehicle->id)
            ->where('status', 'pending')
            ->get();

        $pMaint = 0;
        $now = now();
        $maintReasons = [];
        foreach ($pendingTasks as $task) {
            if ($task->due_date) {
                $dueDate = Carbon::parse($task->due_date);
                if ($dueDate->isPast()) {
                    $pMaint += 20;
                    $maintReasons[] = "Overdue task: {$task->title} (was due {$dueDate->diffForHumans()})";
                } elseif ($dueDate->diffInDays($now) <= 7) {
                    $pMaint += 10;
                    $maintReasons[] = "Task due soon: {$task->title} (in {$dueDate->diffInDays($now)} days)";
                } elseif ($dueDate->diffInDays($now) <= 30) {
                    $pMaint += 4;
                }
            }
        }
        $pMaint = min(40, $pMaint);

        // 3. Health score inversion (P_health)
        $healthScore = $this->calculateVehicleHealthScore($vehicle, $activeDiags, $pendingTasks);
        $pHealth = 0;
        if ($healthScore < 60) {
            $pHealth = 25;
        } elseif ($healthScore < 80) {
            $pHealth = 10;
        }

        // 4. Service dormancy (P_age)
        $lastService = MaintenanceRecord::where('user_id', $user->id)
            ->where('vehicle_id', $vehicle->id)
            ->where('status', 'completed')
            ->latest('performed_at')
            ->first();

        $pAge = 0;
        if (!$lastService || ($lastService->performed_at && Carbon::parse($lastService->performed_at)->diffInDays(now()) > 180)) {
            $pAge = 10;
            $maintReasons[] = "No maintenance logged in over 6 months.";
        }

        $rawScore = $pDiag + $pMaint + $pHealth + $pAge;
        $priorityScore = min(100, max(0, $rawScore));

        $category = 'STABLE';
        $badgeColor = '#32D583';
        if ($priorityScore >= 70) {
            $category = 'CRITICAL';
            $badgeColor = '#FF5A5F';
        } elseif ($priorityScore >= 40) {
            $category = 'ATTENTION';
            $badgeColor = '#F5B942';
        }

        $vName = trim(($vehicle->custom_brand ?: $vehicle->vehicleBrand?->name ?: '') . ' ' . ($vehicle->custom_model ?: $vehicle->vehicleModel?->name ?: '')) ?: 'Vehicle';

        return [
            'success' => true,
            'vehicle_id' => $vehicle->id,
            'vehicle_name' => $vName,
            'vehicle_type' => $vehicle->vehicleType?->name ?? 'Vehicle',
            'health_score' => $healthScore,
            'priority_score' => $priorityScore,
            'category' => $category,
            'badge_color' => $badgeColor,
            'breakdown' => [
                'diagnostic_points' => $pDiag,
                'maintenance_points' => $pMaint,
                'health_inversion_points' => $pHealth,
                'dormancy_points' => $pAge,
            ],
            'reasons' => array_merge($diagReasons, $maintReasons),
        ];
    }

    public function rankUserVehicles(User $user): array
    {
        $vehicles = $user->vehicles()
            ->whereNull('archived_at')
            ->with(['vehicleType', 'vehicleBrand', 'vehicleModel', 'vehicleYear'])
            ->get();

        if ($vehicles->isEmpty()) {
            return [
                'success' => true,
                'ranked_vehicles' => [],
                'message' => 'No active vehicles in your garage.',
            ];
        }

        $ranked = [];
        foreach ($vehicles as $vehicle) {
            $priority = $this->calculateVehiclePriority($user, ['vehicle_id' => $vehicle->id]);
            $ranked[] = [
                'vehicle_id' => $vehicle->id,
                'vehicle_name' => $priority['vehicle_name'],
                'vehicle_type' => $priority['vehicle_type'],
                'priority_score' => $priority['priority_score'],
                'health_score' => $priority['health_score'],
                'category' => $priority['category'],
                'badge_color' => $priority['badge_color'],
                'reasons' => $priority['reasons'],
                'is_active' => $user->active_vehicle_id === $vehicle->id,
            ];
        }

        usort($ranked, fn($a, $b) => $b['priority_score'] <=> $a['priority_score']);

        $top = $ranked[0];

        return [
            'success' => true,
            'ranked_vehicles' => $ranked,
            'highest_priority_vehicle' => $top,
            'summary' => "{$top['vehicle_name']} currently has the highest priority score ({$top['priority_score']}/100) and needs attention first.",
        ];
    }

    public function getVehicleAttentionSummary(User $user, array $params): array
    {
        $priority = $this->calculateVehiclePriority($user, $params);
        return [
            'success' => true,
            'summary' => $priority['reasons'],
            'priority' => $priority,
        ];
    }

    // =========================================================================
    // GROUP F: PROACTIVE BRIEFINGS
    // =========================================================================

    public function generateProactiveBriefing(User $user, array $params = []): array
    {
        $vehicle = $this->resolveVehicle($user, $params['vehicle_id'] ?? null);

        if (!$vehicle) {
            return [
                'success' => true,
                'briefing' => "Welcome to VehiCare! You haven't added an active vehicle yet. Would you like me to help you add your car, motorcycle, or bicycle?",
            ];
        }

        $priority = $this->calculateVehiclePriority($user, ['vehicle_id' => $vehicle->id]);
        $upcoming = $this->getUpcomingMaintenance($user, ['vehicle_id' => $vehicle->id]);

        $vName = $priority['vehicle_name'];
        $health = $priority['health_score'];
        $category = $priority['category'];
        $overdueCount = count($upcoming['overdue_tasks']);
        $upcomingCount = count($upcoming['upcoming_tasks']);

        $lines = [];
        $lines[] = "🚗 **VehiCare Daily Care Briefing for {$vName}**";
        $lines[] = "• Health Score: **{$health}%** ({$category})";

        if ($overdueCount > 0) {
            $lines[] = "⚠️ **{$overdueCount} overdue maintenance task(s)** require immediate attention:";
            foreach (array_slice($upcoming['overdue_tasks'], 0, 2) as $task) {
                $lines[] = "   - {$task->title}";
            }
        } elseif ($upcomingCount > 0) {
            $next = $upcoming['upcoming_tasks'][0];
            $lines[] = "📅 Next scheduled service: **{$next->title}** (due " . Carbon::parse($next->due_date)->format('M d') . ").";
        } else {
            $lines[] = "✅ All maintenance schedules are up to date! No immediate service required.";
        }

        if (!empty($priority['reasons'])) {
            $lines[] = "💡 Focus: " . $priority['reasons'][0];
        }

        return [
            'success' => true,
            'vehicle_name' => $vName,
            'health_score' => $health,
            'priority_score' => $priority['priority_score'],
            'category' => $category,
            'briefing' => implode("\n", $lines),
        ];
    }

    // =========================================================================
    // HELPER METHODS
    // =========================================================================

    public function calculateVehicleHealthScore(Vehicle $vehicle, $activeDiags = null, $pendingTasks = null): int
    {
        if ($activeDiags === null) {
            $activeDiags = Diagnostic::where('vehicle_id', $vehicle->id)
                ->whereDoesntHave('repairRecords', function ($q) {
                    $q->where('status', 'completed');
                })
                ->get();
        }

        if ($pendingTasks === null) {
            $pendingTasks = MaintenanceRecord::where('vehicle_id', $vehicle->id)
                ->where('status', 'pending')
                ->get();
        }

        if ($activeDiags->isEmpty()) {
            $now = now();
            $overdueCount = $pendingTasks->filter(function ($t) use ($now) {
                return $t->due_date && Carbon::parse($t->due_date)->lt($now);
            })->count();

            if ($overdueCount === 0) {
                return 94;
            }
            return max(70, 94 - ($overdueCount * 6));
        }

        $urgentCount = $activeDiags->filter(function ($d) {
            $sev = strtolower((string) $d->severity);
            return in_array($sev, ['critical', 'urgent', 'high']);
        })->count();

        $penalty = ($urgentCount * 25) + (($activeDiags->count() - $urgentCount) * 12);
        return max(30, min(95, 100 - $penalty));
    }

    protected function resolvePendingInspections(int $userId, RepairRecord $record): void
    {
        $pendingQuery = MaintenanceRecord::where('user_id', $userId)
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

    protected function resolveVehicle(User $user, ?int $vehicleId = null): ?Vehicle
    {
        $query = $user->vehicles()
            ->whereNull('archived_at')
            ->with(['vehicleType', 'vehicleBrand', 'vehicleModel', 'vehicleYear']);

        if ($vehicleId) {
            return $query->find($vehicleId);
        }

        if ($user->active_vehicle_id) {
            $vehicle = (clone $query)->find($user->active_vehicle_id);
            if ($vehicle) {
                return $vehicle;
            }
        }

        $fallback = $query->first();
        if ($fallback) {
            $user->active_vehicle_id = $fallback->id;
            $user->save();
        }

        return $fallback;
    }

    protected function dispatchMaintenanceNotification(User $user, ?Vehicle $vehicle, MaintenanceRecord $record): void
    {
        try {
            $user->notify(new MaintenanceRecommendationNotification($vehicle, $record->title));
        } catch (\Throwable $e) {
            Log::warning('[AIAssistantActionService] Notification delivery skipped: ' . $e->getMessage());
        }
    }
}
