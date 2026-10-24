<?php

namespace Tests\Feature;

use App\Models\MaintenanceRecord;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleBrand;
use App\Models\VehicleModel;
use App\Models\VehicleType;
use App\Models\VehicleYear;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class MaintenanceRecordCrudTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Vehicle $vehicle;
    private Vehicle $otherUsersVehicle;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $otherUser = User::factory()->create();
        $type = VehicleType::create(['name' => 'Motorcycle']);
        $brand = VehicleBrand::create(['vehicle_type_id' => $type->id, 'name' => 'Yamaha']);
        $model = VehicleModel::create(['vehicle_brand_id' => $brand->id, 'name' => 'Aerox']);
        $year = VehicleYear::create(['vehicle_model_id' => $model->id, 'year' => 2022]);

        $this->vehicle = Vehicle::create([
            'user_id' => $this->user->id,
            'vehicle_type_id' => $type->id,
            'vehicle_brand_id' => $brand->id,
            'vehicle_model_id' => $model->id,
            'vehicle_year_id' => $year->id,
        ]);
        $this->otherUsersVehicle = Vehicle::create([
            'user_id' => $otherUser->id,
            'vehicle_type_id' => $type->id,
            'vehicle_brand_id' => $brand->id,
            'vehicle_model_id' => $model->id,
            'vehicle_year_id' => $year->id,
        ]);
    }

    #[Test]
    public function it_persists_lists_updates_and_deletes_a_users_maintenance_record(): void
    {
        Sanctum::actingAs($this->user);

        $created = $this->postJson('/api/maintenance', [
            'vehicle_id' => $this->vehicle->id,
            'title' => 'Oil change',
            'service_type' => 'Oil change',
            'due_date' => now()->addWeek()->toDateString(),
            'cost' => 1500,
        ])->assertCreated()
            ->assertJsonPath('data.status', 'pending');

        $recordId = $created->json('data.id');

        $this->getJson('/api/maintenance?vehicle_id='.$this->vehicle->id)
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Oil change');

        $this->patchJson('/api/maintenance/'.$recordId, [
            'status' => 'completed',
            'cost' => 1700,
        ])->assertOk()
            ->assertJsonPath('data.status', 'completed')
            ->assertJsonPath('data.cost', 1700);

        $this->assertNotNull(MaintenanceRecord::findOrFail($recordId)->performed_at);

        $this->deleteJson('/api/maintenance/'.$recordId)
            ->assertOk();

        $this->assertDatabaseMissing('maintenance_records', ['id' => $recordId]);
    }

    #[Test]
    public function it_rejects_records_for_vehicles_owned_by_another_user(): void
    {
        Sanctum::actingAs($this->user);

        $this->postJson('/api/maintenance', [
            'vehicle_id' => $this->otherUsersVehicle->id,
            'title' => 'Unauthorized service',
        ])->assertForbidden();

        $this->assertDatabaseMissing('maintenance_records', ['title' => 'Unauthorized service']);
    }
}
