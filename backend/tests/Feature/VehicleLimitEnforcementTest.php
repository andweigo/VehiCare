<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleBrand;
use App\Models\VehicleModel;
use App\Models\VehicleType;
use App\Models\VehicleYear;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class VehicleLimitEnforcementTest extends TestCase
{
    use RefreshDatabase;

    protected VehicleType $type;
    protected VehicleBrand $brand;
    protected VehicleModel $model;
    protected VehicleYear $year;

    protected function setUp(): void
    {
        parent::setUp();

        $this->type = VehicleType::create(['name' => 'Motorcycle']);
        $this->brand = VehicleBrand::create([
            'vehicle_type_id' => $this->type->id,
            'name' => 'Yamaha',
        ]);
        $this->model = VehicleModel::create([
            'vehicle_brand_id' => $this->brand->id,
            'name' => 'Mio Aerox 155',
        ]);
        $this->year = VehicleYear::create([
            'vehicle_model_id' => $this->model->id,
            'year' => 2023,
        ]);
    }

    public function test_premium_user_can_create_up_to_five_vehicles(): void
    {
        $premiumUser = User::factory()->create([
            'subscription_plan' => User::SUBSCRIPTION_PREMIUM,
            'subscription_status' => User::SUBSCRIPTION_STATUS_ACTIVE,
            'subscription_expires_at' => Carbon::now()->addMonth(),
            'vehicle_limit' => User::VEHICLE_LIMIT_PREMIUM,
        ]);

        Sanctum::actingAs($premiumUser);

        for ($i = 1; $i <= 5; $i++) {
            $response = $this->postJson('/api/vehicles', [
                'vehicle_type_id' => $this->type->id,
                'vehicle_brand_id' => $this->brand->id,
                'vehicle_model_id' => $this->model->id,
                'vehicle_year_id' => $this->year->id,
                'model_number' => "VIN-00{$i}",
            ]);

            $response->assertStatus(201)
                ->assertJsonPath('status', 'success');
        }

        $this->assertSame(5, $premiumUser->vehicles()->count());
    }

    public function test_premium_user_cannot_bypass_five_vehicle_limit_by_archiving(): void
    {
        $premiumUser = User::factory()->create([
            'subscription_plan' => User::SUBSCRIPTION_PREMIUM,
            'subscription_status' => User::SUBSCRIPTION_STATUS_ACTIVE,
            'subscription_expires_at' => Carbon::now()->addMonth(),
            'vehicle_limit' => User::VEHICLE_LIMIT_PREMIUM,
        ]);

        Sanctum::actingAs($premiumUser);

        $createdVehicles = [];
        for ($i = 1; $i <= 5; $i++) {
            $vehicle = Vehicle::create([
                'user_id' => $premiumUser->id,
                'vehicle_type_id' => $this->type->id,
                'vehicle_brand_id' => $this->brand->id,
                'vehicle_model_id' => $this->model->id,
                'vehicle_year_id' => $this->year->id,
                'model_number' => "VIN-00{$i}",
            ]);
            $createdVehicles[] = $vehicle;
        }

        // Archive the first vehicle
        $archiveResponse = $this->deleteJson("/api/vehicles/{$createdVehicles[0]->id}");
        $archiveResponse->assertStatus(200);

        $createdVehicles[0]->refresh();
        $this->assertNotNull($createdVehicles[0]->archived_at);
        $this->assertSame(4, $premiumUser->activeVehicles()->count());
        $this->assertSame(5, $premiumUser->vehicles()->count());

        // Attempt to create a 6th vehicle profile
        $response = $this->postJson('/api/vehicles', [
            'vehicle_type_id' => $this->type->id,
            'vehicle_brand_id' => $this->brand->id,
            'vehicle_model_id' => $this->model->id,
            'vehicle_year_id' => $this->year->id,
            'model_number' => 'VIN-006',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('status', 'error')
            ->assertJsonPath('message', 'Your Premium plan allows up to 5 vehicle profile(s) (including archived vehicles).');

        // Verify total vehicle count remains 5
        $this->assertSame(5, $premiumUser->vehicles()->count());
    }

    public function test_premium_user_can_unarchive_vehicle_when_within_limit(): void
    {
        $premiumUser = User::factory()->create([
            'subscription_plan' => User::SUBSCRIPTION_PREMIUM,
            'subscription_status' => User::SUBSCRIPTION_STATUS_ACTIVE,
            'subscription_expires_at' => Carbon::now()->addMonth(),
            'vehicle_limit' => User::VEHICLE_LIMIT_PREMIUM,
        ]);

        Sanctum::actingAs($premiumUser);

        $vehicle1 = Vehicle::create([
            'user_id' => $premiumUser->id,
            'vehicle_type_id' => $this->type->id,
            'vehicle_brand_id' => $this->brand->id,
            'vehicle_model_id' => $this->model->id,
            'vehicle_year_id' => $this->year->id,
            'archived_at' => now(),
        ]);

        $unarchiveResponse = $this->postJson("/api/vehicles/{$vehicle1->id}/unarchive");
        $unarchiveResponse->assertStatus(200)
            ->assertJsonPath('status', 'success');

        $vehicle1->refresh();
        $this->assertNull($vehicle1->archived_at);
    }

    public function test_free_user_enforces_one_active_vehicle_rule(): void
    {
        $freeUser = User::factory()->create([
            'subscription_plan' => User::SUBSCRIPTION_FREE,
            'vehicle_limit' => User::VEHICLE_LIMIT_FREE,
        ]);

        Sanctum::actingAs($freeUser);

        // 1. Create first vehicle
        $response1 = $this->postJson('/api/vehicles', [
            'vehicle_type_id' => $this->type->id,
            'vehicle_brand_id' => $this->brand->id,
            'vehicle_model_id' => $this->model->id,
            'vehicle_year_id' => $this->year->id,
            'model_number' => 'FREE-001',
        ]);
        $response1->assertStatus(201);
        $firstVehicleId = $response1->json('data.id');

        // 2. Attempt to create 2nd active vehicle -> rejected
        $response2 = $this->postJson('/api/vehicles', [
            'vehicle_type_id' => $this->type->id,
            'vehicle_brand_id' => $this->brand->id,
            'vehicle_model_id' => $this->model->id,
            'vehicle_year_id' => $this->year->id,
            'model_number' => 'FREE-002',
        ]);
        $response2->assertStatus(422)
            ->assertJsonPath('status', 'error')
            ->assertJsonPath('message', 'Your current plan allows only 1 active vehicle(s). Upgrade to add more vehicles.');

        // 3. Free user archives first vehicle
        $archiveResponse = $this->deleteJson("/api/vehicles/{$firstVehicleId}");
        $archiveResponse->assertStatus(200);

        // 4. Free user can now create another active vehicle
        $response3 = $this->postJson('/api/vehicles', [
            'vehicle_type_id' => $this->type->id,
            'vehicle_brand_id' => $this->brand->id,
            'vehicle_model_id' => $this->model->id,
            'vehicle_year_id' => $this->year->id,
            'model_number' => 'FREE-003',
        ]);
        $response3->assertStatus(201);

        // 5. Attempting to unarchive the first vehicle while the second is active is rejected
        $unarchiveResponse = $this->postJson("/api/vehicles/{$firstVehicleId}/unarchive");
        $unarchiveResponse->assertStatus(422)
            ->assertJsonPath('status', 'error');
    }
}
