<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleBrand;
use App\Models\VehicleCorrectionRequest;
use App\Models\VehicleModel;
use App\Models\VehicleType;
use App\Models\VehicleYear;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VehicleCorrectionRequestTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_approval_safely_maps_string_model_to_custom_model_without_sql_integer_error(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'is_active' => true]);
        $user = User::factory()->create();

        $vehicle = Vehicle::create([
            'user_id' => $user->id,
            'custom_brand' => 'Honda',
            'custom_model' => 'beat',
            'custom_year' => '2018',
        ]);

        $correctionRequest = VehicleCorrectionRequest::create([
            'user_id' => $user->id,
            'vehicle_id' => $vehicle->id,
            'requested_fields' => ['vehicle_model_id'],
            'current_values' => ['vehicle_model_id' => 'beat'],
            'requested_values' => ['vehicle_model_id' => 'Click'],
            'reason' => 'I entered it incorrectly',
            'status' => 'pending',
            'submitted_at' => now(),
        ]);

        $response = $this->actingAs($admin)->post("/admin/correction-requests/{$correctionRequest->id}/approve", [
            'admin_notes' => 'Approved correction',
        ]);

        $response->assertSessionHas('status', 'Correction request approved and vehicle details updated successfully.');
        $response->assertSessionHasNoErrors();

        $vehicle->refresh();
        $this->assertSame('Click', $vehicle->custom_model);
        $this->assertNull($vehicle->vehicle_model_id);
        $this->assertSame('Honda', $vehicle->custom_brand);

        $correctionRequest->refresh();
        $this->assertSame('approved', $correctionRequest->status);
        $this->assertNotNull($correctionRequest->completed_at);
        $this->assertSame($admin->id, $correctionRequest->approved_by);
    }

    public function test_admin_approval_maps_matching_catalogue_model_to_foreign_key_id(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'is_active' => true]);
        $user = User::factory()->create();

        $type = VehicleType::create(['name' => 'Motorcycle']);
        $brand = VehicleBrand::create(['vehicle_type_id' => $type->id, 'name' => 'Honda']);
        $model = VehicleModel::create(['vehicle_brand_id' => $brand->id, 'name' => 'Click 125i']);

        $vehicle = Vehicle::create([
            'user_id' => $user->id,
            'custom_brand' => 'Honda',
            'custom_model' => 'beat',
            'custom_year' => '2018',
        ]);

        $correctionRequest = VehicleCorrectionRequest::create([
            'user_id' => $user->id,
            'vehicle_id' => $vehicle->id,
            'requested_fields' => ['vehicle_model_id'],
            'current_values' => ['vehicle_model_id' => 'beat'],
            'requested_values' => ['vehicle_model_id' => 'Click 125i'],
            'reason' => 'Found in catalog',
            'status' => 'pending',
            'submitted_at' => now(),
        ]);

        $response = $this->actingAs($admin)->post("/admin/correction-requests/{$correctionRequest->id}/approve");

        $response->assertSessionHasNoErrors();

        $vehicle->refresh();
        $this->assertSame($model->id, $vehicle->vehicle_model_id);
        $this->assertSame($brand->id, $vehicle->vehicle_brand_id);
        $this->assertNull($vehicle->custom_model);
        $this->assertNull($vehicle->custom_brand);
    }

    public function test_admin_approval_handles_year_correction_safely(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'is_active' => true]);
        $user = User::factory()->create();

        $vehicle = Vehicle::create([
            'user_id' => $user->id,
            'custom_brand' => 'Honda',
            'custom_model' => 'Click',
            'custom_year' => '2015',
        ]);

        $correctionRequest = VehicleCorrectionRequest::create([
            'user_id' => $user->id,
            'vehicle_id' => $vehicle->id,
            'requested_fields' => ['vehicle_year_id'],
            'current_values' => ['vehicle_year_id' => '2015'],
            'requested_values' => ['vehicle_year_id' => '2020'],
            'reason' => 'Typo in year',
            'status' => 'pending',
            'submitted_at' => now(),
        ]);

        $response = $this->actingAs($admin)->post("/admin/correction-requests/{$correctionRequest->id}/approve");

        $response->assertSessionHasNoErrors();

        $vehicle->refresh();
        $this->assertSame('2020', $vehicle->custom_year);
        $this->assertNull($vehicle->vehicle_year_id);
    }

    public function test_api_vehicle_update_allows_custom_model_when_vehicle_model_id_is_approved(): void
    {
        $user = User::factory()->create();

        $vehicle = Vehicle::create([
            'user_id' => $user->id,
            'custom_brand' => 'Honda',
            'custom_model' => 'beat',
            'custom_year' => '2018',
        ]);

        $correctionRequest = VehicleCorrectionRequest::create([
            'user_id' => $user->id,
            'vehicle_id' => $vehicle->id,
            'requested_fields' => ['vehicle_model_id'],
            'current_values' => ['vehicle_model_id' => 'beat'],
            'requested_values' => ['vehicle_model_id' => 'Click'],
            'reason' => 'Typo in model',
            'status' => 'approved',
            'approved_at' => now(),
            'edit_expires_at' => now()->addDays(3),
            'completed_at' => null,
            'submitted_at' => now(),
        ]);

        $response = $this->actingAs($user, 'sanctum')->putJson("/api/vehicles/{$vehicle->id}", [
            'custom_model' => 'Click',
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'status' => 'success',
            'message' => 'Vehicle updated successfully.',
        ]);

        $vehicle->refresh();
        $this->assertSame('Click', $vehicle->custom_model);
        $this->assertNull($vehicle->vehicle_model_id);
    }
}
