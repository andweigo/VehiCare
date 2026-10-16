<?php

namespace Tests\Feature;

use App\Models\Diagnostic;
use App\Models\MaintenanceRecord;
use App\Models\RepairRecord;
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

class DiagnosisDrivenMaintenanceTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Vehicle $vehicle;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();

        $type = VehicleType::create(['name' => 'Motorcycle']);
        $brand = VehicleBrand::create([
            'vehicle_type_id' => $type->id,
            'name' => 'Yamaha',
        ]);
        $model = VehicleModel::create([
            'vehicle_brand_id' => $brand->id,
            'name' => 'Mio Aerox',
        ]);
        $year = VehicleYear::create([
            'vehicle_model_id' => $model->id,
            'year' => 2022,
        ]);

        $this->vehicle = Vehicle::create([
            'user_id' => $this->user->id,
            'vehicle_type_id' => $type->id,
            'vehicle_brand_id' => $brand->id,
            'vehicle_model_id' => $model->id,
            'vehicle_year_id' => $year->id,
        ]);

        $this->user->update([
            'active_vehicle_id' => $this->vehicle->id,
        ]);
    }

    #[Test]
    public function it_creates_pending_maintenance_inspections_and_saves_smart_recommendations_from_diagnosis()
    {
        Sanctum::actingAs($this->user);

        $mockAi = Mockery::mock(AIServiceClient::class);

        $mockAi->shouldReceive('analyzeSymptoms')
            ->once()
            ->andReturn([
                'type' => 'diagnostic',
                'status' => 'diagnosis_ready',
                'summary' => 'Starter relay clicks but motorcycle engine does not crank, indicating depleted battery or faulty relay circuit.',
                'severity' => 'HIGH',
                'urgency' => 'Immediate electrical inspection required before riding',
                'confidence' => 'HIGH',
                'possible_causes' => [
                    [
                        'cause' => 'Discharged or failed 12V battery',
                        'probability' => 'High',
                    ],
                    [
                        'cause' => 'Corroded battery terminals or ground connection',
                        'probability' => 'Moderate',
                    ],
                    [
                        'cause' => 'Faulty starter relay switch',
                        'probability' => 'Moderate',
                    ],
                ],
                'recommended_actions' => [
                    'Measure resting battery voltage with multimeter',
                    'Check starter relay contacts',
                ],
                'maintenance_tasks' => [
                    [
                        'title' => 'Inspect 12V Battery and Terminal Connections',
                        'urgency' => 'Immediate',
                        'service_type' => 'Electrical Inspection',
                        'description' => 'Test battery resting voltage (should be >=12.6V) and inspect for terminal oxidation.',
                    ],
                    [
                        'title' => 'Test Starter Relay and Solenoid Circuit',
                        'urgency' => 'High',
                        'service_type' => 'Electrical Inspection',
                        'description' => 'Check starter relay click and voltage transfer to starter motor.',
                    ],
                ],
                'smart_recommendations' => [
                    [
                        'problem' => 'Battery discharge causing starter relay clicking',
                        'preventive_action' => 'Keep battery charged using a smart trickle charger if vehicle sits idle for more than a week',
                        'warning_signs' => 'Dim speedometer cluster, slow horn sound, or flickering lights when ignition is switched on',
                        'safety_precaution' => 'Do not repeatedly hold the starter push button for more than 5 consecutive seconds to avoid starter motor burnout.',
                    ],
                ],
                'estimated_cost' => [
                    'min' => 1200,
                    'max' => 2500,
                    'currency' => 'PHP',
                ],
                'professional_help' => [
                    'recommended' => false,
                    'priority' => 'MODERATE',
                ],
            ]);

        $this->app->instance(AIServiceClient::class, $mockAi);

        $response = $this->postJson('/api/diagnostics', [
            'vehicle_id' => $this->vehicle->id,
            'symptoms' => 'Motorcycle makes a clicking sound when pressing electric starter but engine will not turn over',
            'input_type' => 'text',
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('status', 'success');

        // Verify the diagnostic record.
        $diagnostic = Diagnostic::where('user_id', $this->user->id)->first();

        $this->assertNotNull($diagnostic);
        $this->assertCount(2, $diagnostic->maintenance_tasks);
        $this->assertCount(1, $diagnostic->smart_recommendations);

        $this->assertEquals(
            'Inspect 12V Battery and Terminal Connections',
            $diagnostic->maintenance_tasks[0]['title']
        );

        $this->assertEquals(
            'Keep battery charged using a smart trickle charger if vehicle sits idle for more than a week',
            $diagnostic->smart_recommendations[0]['preventive_action']
        );

        // Verify pending maintenance inspection records were created.
        $records = MaintenanceRecord::where('user_id', $this->user->id)
            ->where('vehicle_id', $this->vehicle->id)
            ->get();

        $this->assertCount(2, $records);

        foreach ($records as $record) {
            $this->assertEquals('pending', $record->status);
            $this->assertTrue((bool) $record->is_inspection);
            $this->assertEquals($diagnostic->id, $record->diagnostic_id);
            $this->assertNotNull($record->due_date);
        }
    }

    #[Test]
    public function it_deduplicates_pending_inspections_on_subsequent_diagnoses()
    {
        Sanctum::actingAs($this->user);

        $mockAi = Mockery::mock(AIServiceClient::class);

        $mockAi->shouldReceive('analyzeSymptoms')
            ->twice()
            ->andReturn([
                'type' => 'diagnostic',
                'status' => 'diagnosis_ready',
                'summary' => 'Repeated starter click symptom analysis',
                'severity' => 'HIGH',
                'urgency' => 'Immediate inspection',
                'confidence' => 'HIGH',
                'possible_causes' => [],
                'recommended_actions' => [],
                'maintenance_tasks' => [
                    [
                        'title' => 'Inspect 12V Battery and Terminal Connections',
                        'urgency' => 'Immediate',
                        'service_type' => 'Electrical Inspection',
                        'description' => 'Test battery voltage.',
                    ],
                ],
                'smart_recommendations' => [],
                'estimated_cost' => [
                    'min' => 1000,
                    'max' => 2000,
                    'currency' => 'PHP',
                ],
            ]);

        $this->app->instance(AIServiceClient::class, $mockAi);

        // First submission.
        $this->postJson('/api/diagnostics', [
            'vehicle_id' => $this->vehicle->id,
            'symptoms' => 'Motorcycle clicking sound when starting',
            'input_type' => 'text',
        ])->assertStatus(200);

        $this->assertEquals(
            1,
            MaintenanceRecord::where('vehicle_id', $this->vehicle->id)->count()
        );

        // Second equivalent diagnosis should not duplicate the inspection.
        $this->postJson('/api/diagnostics', [
            'vehicle_id' => $this->vehicle->id,
            'symptoms' => 'Motorcycle clicking sound when starting again',
            'input_type' => 'text',
        ])->assertStatus(200);

        $this->assertEquals(
            1,
            MaintenanceRecord::where('vehicle_id', $this->vehicle->id)->count()
        );
    }

    #[Test]
    public function completed_repair_automatically_resolves_matching_pending_maintenance_inspections()
    {
        Sanctum::actingAs($this->user);

        // Pre-create a diagnostic and pending battery inspection.
        $diagnostic = Diagnostic::create([
            'user_id' => $this->user->id,
            'vehicle_id' => $this->vehicle->id,
            'input_type' => 'text',
            'symptoms' => 'Starter click',
            'summary' => 'Battery issue suspected',
            'confidence' => 85,
            'severity' => 'HIGH',
            'urgency' => 'Inspect battery',
            'possible_causes' => ['Weak battery'],
            'recommended_actions' => ['Test battery'],
            'maintenance_tasks' => [
                [
                    'title' => 'Inspect 12V Battery and Terminal Connections',
                    'urgency' => 'Immediate',
                ],
            ],
            'smart_recommendations' => [],
        ]);

        $pendingInspection = MaintenanceRecord::create([
            'user_id' => $this->user->id,
            'vehicle_id' => $this->vehicle->id,
            'diagnostic_id' => $diagnostic->id,
            'title' => 'Inspect 12V Battery and Terminal Connections',
            'service_type' => 'Electrical Inspection',
            'status' => 'pending',
            'is_inspection' => true,
            'urgency' => 'Immediate',
            'due_date' => now()->addDay(),
        ]);

        $this->assertEquals('pending', $pendingInspection->status);

        // Record a completed battery repair.
        $repairResponse = $this->postJson('/api/repairs', [
            'vehicle_id' => $this->vehicle->id,
            'diagnostic_id' => $diagnostic->id,
            'title' => 'Replaced 12V Motorcycle Battery',
            'problem' => 'Dead 12V battery failed load test',
            'solution' => 'Installed brand new Yuasa 12V maintenance-free battery and cleaned terminals',
            'cost' => 1850,
            'status' => 'completed',
            'performed_at' => now()->toDateTimeString(),
        ]);

        $repairResponse->assertStatus(201);

        // The matching pending inspection should now be completed.
        $pendingInspection->refresh();

        $this->assertEquals('completed', $pendingInspection->status);
        $this->assertNotNull($pendingInspection->performed_at);

        $this->assertStringContainsString(
            'Verified and resolved by repair: Replaced 12V Motorcycle Battery',
            $pendingInspection->notes
        );
    }
}
