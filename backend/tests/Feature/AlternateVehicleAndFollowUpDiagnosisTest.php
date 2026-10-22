<?php

namespace Tests\Feature;

use App\Models\Diagnostic;
use App\Models\MaintenanceRecord;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleBrand;
use App\Models\VehicleModel;
use App\Models\VehicleType;
use App\Models\VehicleYear;
use App\Services\AI\AIServiceClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Mockery;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class AlternateVehicleAndFollowUpDiagnosisTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Vehicle $savedVehicle;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();

        $type = VehicleType::create(['name' => 'Sedan']);
        $brand = VehicleBrand::create([
            'vehicle_type_id' => $type->id,
            'name' => 'Honda',
        ]);
        $model = VehicleModel::create([
            'vehicle_brand_id' => $brand->id,
            'name' => 'Civic',
        ]);
        $year = VehicleYear::create([
            'vehicle_model_id' => $model->id,
            'year' => 2021,
        ]);

        $this->savedVehicle = Vehicle::create([
            'user_id' => $this->user->id,
            'vehicle_type_id' => $type->id,
            'vehicle_brand_id' => $brand->id,
            'vehicle_model_id' => $model->id,
            'vehicle_year_id' => $year->id,
        ]);

        $this->user->update([
            'active_vehicle_id' => $this->savedVehicle->id,
        ]);
    }

    #[Test]
    public function it_does_not_attach_maintenance_records_to_saved_vehicle_when_diagnosing_alternate_vehicle()
    {
        Sanctum::actingAs($this->user);

        $mockAi = Mockery::mock(AIServiceClient::class);
        $mockAi->shouldReceive('analyzeSymptoms')
            ->once()
            ->withArgs(function ($vehicleInfo, $symptoms) {
                return ($vehicleInfo['is_saved_vehicle'] ?? true) === false
                    && ($vehicleInfo['brand'] ?? '') === 'Ford Ranger';
            })
            ->andReturn([
                'type' => 'diagnostic',
                'status' => 'diagnosis_ready',
                'summary' => 'Diagnosed alternate vehicle pickup differential fluid leak.',
                'severity' => 'MODERATE',
                'urgency' => 'Inspect rear axle differential seal.',
                'confidence' => 'HIGH',
                'possible_causes' => [
                    ['cause' => 'Rear differential pinion seal leak', 'probability' => 'High']
                ],
                'recommended_actions' => ['Check rear differential fluid level and replace seal'],
                'maintenance_tasks' => [
                    [
                        'title' => 'Rear Differential Seal Inspection',
                        'urgency' => 'Moderate',
                        'service_type' => 'Drivetrain Inspection',
                        'description' => 'Inspect rear pinion seal for fluid leakage.'
                    ]
                ],
                'smart_recommendations' => [],
                'image_vehicle_match' => 'not_applicable',
            ]);

        $this->app->instance(AIServiceClient::class, $mockAi);

        $response = $this->postJson('/api/diagnostics', [
            'vehicle_id' => null,
            'is_alternate_vehicle' => true,
            'vehicle_name' => 'Ford Ranger',
            'vehicle_type' => 'pickup',
            'symptoms' => 'Oil stain under rear axle differential',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.vehicle.is_saved_vehicle', false);

        // Verify the saved vehicle has ZERO maintenance records created from this alternate diagnosis
        $this->assertEquals(0, MaintenanceRecord::where('vehicle_id', $this->savedVehicle->id)->count());

        // Verify the diagnostic record has null vehicle_id
        $this->assertDatabaseHas('diagnostics', [
            'user_id' => $this->user->id,
            'vehicle_id' => null,
        ]);
    }

    #[Test]
    public function it_preserves_root_symptom_in_multi_turn_follow_up_diagnosis()
    {
        Sanctum::actingAs($this->user);

        $mockAi = Mockery::mock(AIServiceClient::class);
        $mockAi->shouldReceive('analyzeSymptoms')
            ->once()
            ->withArgs(function ($vehicleInfo, $symptoms, $mediaBase64, $mediaMime, $inputType, $history, $requestId, $userId, $entitlements, $historicalContext, $diagnosticState, $rootSymptom) {
                return $symptoms === 'only when turning sharp right'
                    && $rootSymptom === 'Loud clicking sound from front wheel';
            })
            ->andReturn([
                'type' => 'diagnostic',
                'status' => 'diagnosis_ready',
                'summary' => 'Clicking during right turn indicates worn outer CV joint.',
                'severity' => 'MODERATE',
                'urgency' => 'Replace right outer CV axle assembly before joint failure.',
                'confidence' => 'HIGH',
                'possible_causes' => [
                    ['cause' => 'Right outer CV joint failure', 'probability' => 'High']
                ],
                'recommended_actions' => ['Inspect right drive axle CV boot for tears or grease splatter'],
                'maintenance_tasks' => [],
                'smart_recommendations' => [],
            ]);

        $this->app->instance(AIServiceClient::class, $mockAi);

        $response = $this->postJson('/api/diagnostics', [
            'vehicle_id' => $this->savedVehicle->id,
            'symptoms' => 'only when turning sharp right',
            'history' => [
                ['role' => 'user', 'content' => 'Loud clicking sound from front wheel'],
                ['role' => 'assistant', 'content' => 'Does the clicking happen when turning or driving straight?']
            ],
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.severity', 'MODERATE');
    }

    #[Test]
    public function it_returns_image_vehicle_match_and_details_when_image_mismatch_detected()
    {
        Sanctum::actingAs($this->user);

        $mockAi = Mockery::mock(AIServiceClient::class);
        $mockAi->shouldReceive('analyzeSymptoms')
            ->once()
            ->andReturn([
                'type' => 'diagnostic',
                'status' => 'needs_clarification',
                'summary' => 'The image depicts a motorcycle exhaust rather than your saved Honda Civic sedan.',
                'severity' => 'LOW',
                'urgency' => 'Clarify target vehicle before continuing.',
                'confidence' => 'HIGH',
                'image_vehicle_match' => 'possible_mismatch',
                'image_vehicle_details' => [
                    'category' => 'Motorcycle',
                    'estimated_make' => 'Yamaha',
                    'estimated_model' => 'Mio',
                    'confidence' => 'high',
                    'details' => 'Visible single-cylinder scooter exhaust and swingarm.'
                ],
                'possible_causes' => [],
                'recommended_actions' => [],
                'clarification_questions' => [
                    'Does this image show another vehicle you want to diagnose?'
                ],
                'maintenance_tasks' => [],
                'smart_recommendations' => [],
            ]);

        $this->app->instance(AIServiceClient::class, $mockAi);

        $response = $this->postJson('/api/diagnostics', [
            'vehicle_id' => $this->savedVehicle->id,
            'symptoms' => 'Rust on exhaust pipe',
            'input_type' => 'text',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.image_vehicle_match', 'possible_mismatch')
            ->assertJsonPath('data.image_vehicle_details.category', 'Motorcycle');
    }
}
