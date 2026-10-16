<?php

namespace App\Services;

use App\Models\Diagnostic;
use App\Models\MaintenanceRecord;
use App\Models\RepairRecord;
use App\Models\User;
use App\Models\Vehicle;

class EntitlementService
{
    public const PLAN_GUEST = 'guest';
    public const PLAN_FREE = 'free';
    public const PLAN_PREMIUM = 'premium';

    /**
     * Resolve authoritative plan for a user (or guest).
     * Automatically triggers checkSubscriptionStatus() to downgrade expired subscriptions.
     */
    public function resolvePlan(?User $user): string
    {
        if (!$user) {
            return self::PLAN_GUEST;
        }

        $user->checkSubscriptionStatus();

        return $user->subscription_plan === User::SUBSCRIPTION_PREMIUM
            ? self::PLAN_PREMIUM
            : self::PLAN_FREE;
    }

    /**
     * Get authoritative plan capabilities and limits.
     */
    public function getEntitlements(string|User|null $userOrPlan): array
    {
        $plan = is_string($userOrPlan) ? strtolower(trim($userOrPlan)) : $this->resolvePlan($userOrPlan);

        $base = [
            'plan' => $plan,
            'is_premium' => $plan === self::PLAN_PREMIUM,
            'is_free' => $plan === self::PLAN_FREE,
            'is_guest' => $plan === self::PLAN_GUEST,
        ];

        return match ($plan) {
            self::PLAN_PREMIUM => array_merge($base, [
                'plan_name' => 'Premium — Advanced Vehicle Care',
                'max_saved_vehicles' => User::VEHICLE_LIMIT_PREMIUM,
                'ai_consultations_quota' => 100,
                'quota_period' => 'monthly',
                'response_depth' => 'deep_structured',
                'diagnostic_followup' => 'adaptive',
                'historical_context_enabled' => true,
                'max_history_records' => 5,
                'repair_guidance_detail' => 'comprehensive',
                'cost_breakdown_detail' => 'itemized',
                'maintenance_personalization' => 'vehicle_history_personalized',
                'features' => [
                    'deep_diagnostic_reasoning' => true,
                    'adaptive_clarification_questions' => true,
                    'step_by_step_repair_guidance' => true,
                    'itemized_parts_and_labor' => true,
                    'vehicle_history_synthesis' => true,
                    'personalized_preventive_care' => true,
                    'multi_vehicle_support' => true,
                ],
            ]),
            self::PLAN_FREE => array_merge($base, [
                'plan_name' => 'Free — Essential Vehicle Care',
                'max_saved_vehicles' => User::VEHICLE_LIMIT_FREE,
                'ai_consultations_quota' => 20,
                'quota_period' => 'monthly',
                'response_depth' => 'essential',
                'diagnostic_followup' => 'basic',
                'historical_context_enabled' => false,
                'max_history_records' => 0,
                'repair_guidance_detail' => 'standard',
                'cost_breakdown_detail' => 'basic',
                'maintenance_personalization' => 'standard',
                'features' => [
                    'deep_diagnostic_reasoning' => false,
                    'adaptive_clarification_questions' => false,
                    'step_by_step_repair_guidance' => false,
                    'itemized_parts_and_labor' => false,
                    'vehicle_history_synthesis' => false,
                    'personalized_preventive_care' => false,
                    'multi_vehicle_support' => false,
                ],
            ]),
            default => array_merge($base, [
                'plan_name' => 'Guest — Temporary Consultation',
                'max_saved_vehicles' => 0,
                'ai_consultations_quota' => 5,
                'quota_period' => 'total',
                'response_depth' => 'essential',
                'diagnostic_followup' => 'basic',
                'historical_context_enabled' => false,
                'max_history_records' => 0,
                'repair_guidance_detail' => 'standard',
                'cost_breakdown_detail' => 'basic',
                'maintenance_personalization' => 'standard',
                'features' => [
                    'deep_diagnostic_reasoning' => false,
                    'adaptive_clarification_questions' => false,
                    'step_by_step_repair_guidance' => false,
                    'itemized_parts_and_labor' => false,
                    'vehicle_history_synthesis' => false,
                    'personalized_preventive_care' => false,
                    'multi_vehicle_support' => false,
                ],
            ]),
        };
    }

    /**
     * Gather authorized historical vehicle context for AI diagnosis.
     * ONLY returns history if:
     * 1. The user is authorized for historical context (Premium plan).
     * 2. The vehicle belongs to the authenticated user.
     *
     * Items are strictly categorized (confirmed repair vs maintenance vs past hypothesis)
     * so that the AI never treats unconfirmed hypotheses as confirmed repairs or fabricates history.
     */
    public function getAuthorizedHistoricalContext(?User $user, ?Vehicle $vehicle): array
    {
        if (!$user || !$vehicle || $vehicle->user_id !== $user->id) {
            return [];
        }

        $entitlements = $this->getEntitlements($user);
        if (!$entitlements['historical_context_enabled']) {
            return [];
        }

        $maxRecords = $entitlements['max_history_records'] ?? 5;

        // 1. Recent confirmed repairs
        $recentRepairs = RepairRecord::where('vehicle_id', $vehicle->id)
            ->where('user_id', $user->id)
            ->latest('performed_at')
            ->limit($maxRecords)
            ->get()
            ->map(fn ($r) => [
                'type' => 'confirmed_repair',
                'title' => $r->title,
                'problem' => $r->problem,
                'solution' => $r->solution,
                'cost' => $r->cost ? (float) $r->cost : null,
                'status' => $r->status,
                'date' => $r->performed_at?->format('Y-m-d') ?: $r->created_at?->format('Y-m-d'),
            ])->toArray();

        // 2. Recent maintenance records
        $recentMaintenance = MaintenanceRecord::where('vehicle_id', $vehicle->id)
            ->where('user_id', $user->id)
            ->latest('performed_at')
            ->limit($maxRecords)
            ->get()
            ->map(fn ($m) => [
                'type' => 'maintenance_record',
                'title' => $m->title,
                'service_type' => $m->service_type,
                'status' => $m->status,
                'is_inspection' => (bool) $m->is_inspection,
                'date' => $m->performed_at?->format('Y-m-d') ?: $m->created_at?->format('Y-m-d'),
            ])->toArray();

        // 3. Past diagnostic hypotheses (explicitly marked as unconfirmed suspected hypotheses!)
        $pastDiagnostics = Diagnostic::where('vehicle_id', $vehicle->id)
            ->where('user_id', $user->id)
            ->latest()
            ->limit($maxRecords)
            ->get()
            ->map(function ($d) {
                $topCauses = is_array($d->possible_causes) ? array_slice($d->possible_causes, 0, 2) : [];
                $causeSummaries = array_map(function ($c) {
                    if (is_array($c)) {
                        return $c['cause'] ?? '';
                    }
                    return (string) $c;
                }, $topCauses);

                return [
                    'type' => 'unconfirmed_past_hypothesis',
                    'symptoms' => $d->symptoms,
                    'suspected_causes' => array_values(array_filter($causeSummaries)),
                    'severity' => $d->severity,
                    'date' => $d->created_at?->format('Y-m-d'),
                ];
            })->toArray();

        return [
            'recent_repairs' => $recentRepairs,
            'recent_maintenance' => $recentMaintenance,
            'past_diagnostics' => $pastDiagnostics,
        ];
    }
}
