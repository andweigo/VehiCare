<?php

namespace Tests\Feature;

use App\Models\Diagnostic;
use App\Models\MaintenanceRecord;
use App\Models\RepairRecord;
use App\Models\User;
use App\Models\Vehicle;
use App\Services\EntitlementService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubscriptionEntitlementsTest extends TestCase
{
    use RefreshDatabase;

    protected EntitlementService $entitlementService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->entitlementService = new EntitlementService();
    }

    public function test_it_returns_authoritative_guest_entitlements(): void
    {
        $entitlements = $this->entitlementService->getEntitlements(null);

        $this->assertSame('guest', $entitlements['plan']);
        $this->assertFalse($entitlements['is_premium']);
        $this->assertTrue($entitlements['is_guest']);
        $this->assertSame(5, $entitlements['ai_consultations_quota']);
        $this->assertSame('total', $entitlements['quota_period']);
        $this->assertSame(0, $entitlements['max_saved_vehicles']);
        $this->assertSame('essential', $entitlements['response_depth']);
        $this->assertSame('basic', $entitlements['diagnostic_followup']);
        $this->assertFalse($entitlements['historical_context_enabled']);
        $this->assertSame('standard', $entitlements['repair_guidance_detail']);
        $this->assertSame('basic', $entitlements['cost_breakdown_detail']);
    }

    public function test_it_returns_authoritative_free_entitlements(): void
    {
        $user = User::factory()->create([
            'subscription_plan' => User::SUBSCRIPTION_FREE,
            'subscription_status' => User::SUBSCRIPTION_STATUS_NONE,
            'vehicle_limit' => User::VEHICLE_LIMIT_FREE,
        ]);

        $entitlements = $this->entitlementService->getEntitlements($user);

        $this->assertSame('free', $entitlements['plan']);
        $this->assertFalse($entitlements['is_premium']);
        $this->assertTrue($entitlements['is_free']);
        $this->assertSame(20, $entitlements['ai_consultations_quota']);
        $this->assertSame('monthly', $entitlements['quota_period']);
        $this->assertSame(1, $entitlements['max_saved_vehicles']);
        $this->assertSame('essential', $entitlements['response_depth']);
        $this->assertSame('basic', $entitlements['diagnostic_followup']);
        $this->assertFalse($entitlements['historical_context_enabled']);
        $this->assertSame('standard', $entitlements['repair_guidance_detail']);
        $this->assertSame('basic', $entitlements['cost_breakdown_detail']);
    }

    public function test_it_returns_authoritative_premium_entitlements(): void
    {
        $user = User::factory()->create([
            'subscription_plan' => User::SUBSCRIPTION_PREMIUM,
            'subscription_status' => User::SUBSCRIPTION_STATUS_ACTIVE,
            'subscription_expires_at' => Carbon::now()->addMonth(),
            'vehicle_limit' => User::VEHICLE_LIMIT_PREMIUM,
        ]);

        $entitlements = $this->entitlementService->getEntitlements($user);

        $this->assertSame('premium', $entitlements['plan']);
        $this->assertTrue($entitlements['is_premium']);
        $this->assertFalse($entitlements['is_free']);
        $this->assertSame(100, $entitlements['ai_consultations_quota']);
        $this->assertSame('monthly', $entitlements['quota_period']);
        $this->assertSame(5, $entitlements['max_saved_vehicles']);
        $this->assertSame('deep_structured', $entitlements['response_depth']);
        $this->assertSame('adaptive', $entitlements['diagnostic_followup']);
        $this->assertTrue($entitlements['historical_context_enabled']);
        $this->assertSame('comprehensive', $entitlements['repair_guidance_detail']);
        $this->assertSame('itemized', $entitlements['cost_breakdown_detail']);
        $this->assertSame('vehicle_history_personalized', $entitlements['maintenance_personalization']);
    }

    public function test_it_automatically_downgrades_expired_premium_subscription(): void
    {
        $user = User::factory()->create([
            'subscription_plan' => User::SUBSCRIPTION_PREMIUM,
            'subscription_status' => User::SUBSCRIPTION_STATUS_ACTIVE,
            'subscription_expires_at' => Carbon::now()->subDay(), // Expired yesterday
            'vehicle_limit' => User::VEHICLE_LIMIT_PREMIUM,
        ]);

        $plan = $this->entitlementService->resolvePlan($user);
        $entitlements = $this->entitlementService->getEntitlements($user);

        $this->assertSame('free', $plan);
        $this->assertSame('free', $entitlements['plan']);
        $this->assertFalse($entitlements['is_premium']);
        $this->assertSame(20, $entitlements['ai_consultations_quota']);
        $this->assertSame('essential', $entitlements['response_depth']);
        $this->assertFalse($entitlements['historical_context_enabled']);

        $user->refresh();
        $this->assertSame(User::SUBSCRIPTION_FREE, $user->subscription_plan);
        $this->assertSame(User::SUBSCRIPTION_STATUS_EXPIRED, $user->subscription_status);
        $this->assertSame(User::VEHICLE_LIMIT_FREE, $user->vehicle_limit);
    }

    protected function createTestVehicle(User $user): Vehicle
    {
        return Vehicle::create([
            'user_id' => $user->id,
            'custom_brand' => 'Yamaha',
            'custom_model' => 'Mio Aerox',
            'custom_year' => '2022',
        ]);
    }

    public function test_it_does_not_retrieve_history_for_free_users(): void
    {
        $user = User::factory()->create([
            'subscription_plan' => User::SUBSCRIPTION_FREE,
        ]);
        $vehicle = $this->createTestVehicle($user);

        RepairRecord::create([
            'user_id' => $user->id,
            'vehicle_id' => $vehicle->id,
            'title' => 'Replaced battery',
            'status' => 'completed',
        ]);

        $history = $this->entitlementService->getAuthorizedHistoricalContext($user, $vehicle);

        $this->assertEmpty($history);
    }

    public function test_it_retrieves_and_categorizes_history_for_authorized_premium_users(): void
    {
        $user = User::factory()->create([
            'subscription_plan' => User::SUBSCRIPTION_PREMIUM,
            'subscription_status' => User::SUBSCRIPTION_STATUS_ACTIVE,
            'subscription_expires_at' => Carbon::now()->addMonth(),
        ]);
        $vehicle = $this->createTestVehicle($user);

        // 1. Confirmed repair
        RepairRecord::create([
            'user_id' => $user->id,
            'vehicle_id' => $vehicle->id,
            'title' => 'Replaced starter motor',
            'problem' => 'Engine clicking sound',
            'solution' => 'Installed new starter motor',
            'cost' => 3500.00,
            'status' => 'completed',
            'performed_at' => Carbon::now()->subMonths(2),
        ]);

        // 2. Maintenance record
        MaintenanceRecord::create([
            'user_id' => $user->id,
            'vehicle_id' => $vehicle->id,
            'title' => 'Electrical system check',
            'service_type' => 'Electrical Inspection',
            'status' => 'completed',
            'is_inspection' => true,
            'performed_at' => Carbon::now()->subMonth(),
        ]);

        // 3. Past diagnostic hypothesis
        Diagnostic::create([
            'user_id' => $user->id,
            'vehicle_id' => $vehicle->id,
            'symptoms' => 'Clicking sound when starting',
            'summary' => 'Possible weak battery or starter relay',
            'possible_causes' => [
                ['cause' => 'Weak battery', 'likelihood' => 'HIGH'],
                ['cause' => 'Starter relay failure', 'likelihood' => 'MEDIUM'],
            ],
            'severity' => 'MODERATE',
        ]);

        $history = $this->entitlementService->getAuthorizedHistoricalContext($user, $vehicle);

        $this->assertNotEmpty($history);
        $this->assertCount(1, $history['recent_repairs']);
        $this->assertSame('confirmed_repair', $history['recent_repairs'][0]['type']);
        $this->assertSame('Replaced starter motor', $history['recent_repairs'][0]['title']);

        $this->assertCount(1, $history['recent_maintenance']);
        $this->assertSame('maintenance_record', $history['recent_maintenance'][0]['type']);

        $this->assertCount(1, $history['past_diagnostics']);
        $this->assertSame('unconfirmed_past_hypothesis', $history['past_diagnostics'][0]['type']);
        $this->assertContains('Weak battery', $history['past_diagnostics'][0]['suspected_causes']);
    }

    public function test_it_never_retrieves_history_for_vehicles_belonging_to_another_user(): void
    {
        $owner = User::factory()->create([
            'subscription_plan' => User::SUBSCRIPTION_PREMIUM,
            'subscription_expires_at' => Carbon::now()->addMonth(),
        ]);
        $attacker = User::factory()->create([
            'subscription_plan' => User::SUBSCRIPTION_PREMIUM,
            'subscription_expires_at' => Carbon::now()->addMonth(),
        ]);

        $ownerVehicle = $this->createTestVehicle($owner);

        RepairRecord::create([
            'user_id' => $owner->id,
            'vehicle_id' => $ownerVehicle->id,
            'title' => 'Confidential repair',
            'status' => 'completed',
        ]);

        // Attacker attempts to get history for owner's vehicle
        $history = $this->entitlementService->getAuthorizedHistoricalContext($attacker, $ownerVehicle);

        $this->assertEmpty($history);
    }
}
