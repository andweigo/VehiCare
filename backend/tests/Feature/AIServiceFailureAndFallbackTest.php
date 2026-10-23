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
use App\Services\AI\AIServiceException;
use App\Services\GeminiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Laravel\Sanctum\Sanctum;
use Mockery;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class AIServiceFailureAndFallbackTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Vehicle $vehicle;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create([
            'role' => User::ROLE_USER,
            'subscription_plan' => User::SUBSCRIPTION_FREE,
            'vehicle_limit' => User::VEHICLE_LIMIT_FREE,
            'is_active' => true,
        ]);

        $type = VehicleType::create(['name' => 'Car']);
        $brand = VehicleBrand::create([
            'vehicle_type_id' => $type->id,
            'name' => 'Toyota',
        ]);
        $model = VehicleModel::create([
            'vehicle_brand_id' => $brand->id,
            'name' => 'Corolla',
        ]);
        $year = VehicleYear::create([
            'vehicle_model_id' => $model->id,
            'year' => 2021,
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
    public function it_successfully_processes_diagnosis_via_ai_service_client()
    {
        Sanctum::actingAs($this->user);

        $mockAi = Mockery::mock(AIServiceClient::class);
        $mockAi->shouldReceive('analyzeSymptoms')
            ->once()
            ->andReturn([
                'type' => 'diagnostic',
                'status' => 'diagnosis_ready',
                'summary' => 'Squeaking brake pads detected on front axle.',
                'confidence' => 85,
                'severity' => 'LOW',
                'urgency' => 'Routine Maintenance Advice',
                'possible_causes' => ['Brake pad wear'],
                'recommended_actions' => ['Inspect front brake pads'],
                'maintenance_tasks' => [],
                'smart_recommendations' => [],
                'repair_guidance' => null,
                'cost_breakdown' => null,
                'history_insights' => null,
                'clarification_questions' => [],
                'estimated_cost' => ['min' => 1000, 'max' => 2500, 'currency' => 'PHP'],
                'professional_help' => ['recommended' => false, 'priority' => 'LOW', 'severity' => 'LOW'],
                'ai_source' => 'gemini',
            ]);

        $this->app->instance(AIServiceClient::class, $mockAi);

        $response = $this->postJson('/api/diagnostics', [
            'vehicle_id' => $this->vehicle->id,
            'symptoms' => 'brakes squeaking when stopping',
            'input_type' => 'text',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'type' => 'diagnostic',
                    'status' => 'diagnosis_ready',
                    'summary' => 'Squeaking brake pads detected on front axle.',
                ],
            ]);
    }

    #[Test]
    public function it_falls_back_to_gemini_service_when_ai_microservice_returns_gateway_or_unavailable_error()
    {
        Sanctum::actingAs($this->user);
        config(['services.gemini.api_key' => 'fake_gemini_key_for_test']);

        $mockAi = Mockery::mock(AIServiceClient::class);
        $mockAi->shouldReceive('analyzeSymptoms')
            ->once()
            ->andThrow(new AIServiceException(
                'AI_SERVICE_UNAVAILABLE',
                'The AI service could not complete the request. Please try again.',
                true,
                502
            ));

        $mockGemini = Mockery::mock(GeminiService::class);
        $mockGemini->shouldReceive('analyzeSymptoms')
            ->once()
            ->andReturn([
                'type' => 'diagnostic',
                'status' => 'diagnosis_ready',
                'summary' => 'Fallback diagnosis generated directly from Gemini.',
                'confidence' => 80,
                'severity' => 'LOW',
                'urgency' => 'Routine Maintenance Advice',
                'possible_causes' => ['Brake pad wear'],
                'recommended_actions' => ['Check brake pads'],
                'maintenance_tasks' => [],
                'smart_recommendations' => [],
                'repair_guidance' => null,
                'cost_breakdown' => null,
                'history_insights' => null,
                'clarification_questions' => [],
                'estimated_cost' => ['min' => 500, 'max' => 1500, 'currency' => 'PHP'],
                'professional_help' => ['recommended' => false, 'priority' => 'LOW', 'severity' => 'LOW'],
            ]);

        $this->app->instance(AIServiceClient::class, $mockAi);
        $this->app->instance(GeminiService::class, $mockGemini);

        $response = $this->postJson('/api/diagnostics', [
            'vehicle_id' => $this->vehicle->id,
            'symptoms' => 'brakes squeaking when stopping',
            'input_type' => 'text',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'type' => 'diagnostic',
                    'summary' => 'Fallback diagnosis generated directly from Gemini.',
                    'ai_source' => 'gemini_direct_fallback',
                ],
            ]);
    }

    #[Test]
    public function it_returns_clean_error_and_marks_usage_when_ai_service_fails_and_no_gemini_fallback_available()
    {
        Sanctum::actingAs($this->user);
        config(['services.gemini.api_key' => null]);

        $mockAi = Mockery::mock(AIServiceClient::class);
        $mockAi->shouldReceive('analyzeSymptoms')
            ->once()
            ->andThrow(new AIServiceException(
                'AI_SERVICE_UNAVAILABLE',
                'The AI service could not complete the request. Please try again.',
                true,
                502
            ));

        $this->app->instance(AIServiceClient::class, $mockAi);

        $response = $this->postJson('/api/diagnostics', [
            'vehicle_id' => $this->vehicle->id,
            'symptoms' => 'brakes squeaking when stopping',
            'input_type' => 'text',
        ]);

        $response->assertStatus(502)
            ->assertJson([
                'success' => false,
                'status' => 'error',
                'reason' => 'AI_SERVICE_UNAVAILABLE',
                'message' => 'The AI service could not complete the request. Please try again.',
                'error' => [
                    'code' => 'AI_SERVICE_UNAVAILABLE',
                    'retryable' => true,
                ],
            ]);
    }

    #[Test]
    public function it_does_not_persist_diagnostic_or_maintenance_when_vehicle_mismatch_is_detected()
    {
        Sanctum::actingAs($this->user);

        $mockAi = Mockery::mock(AIServiceClient::class);
        $mockAi->shouldReceive('analyzeSymptoms')
            ->once()
            ->andReturn([
                'type' => 'vehicle_mismatch',
                'status' => 'vehicle_mismatch',
                'image_vehicle_match' => 'possible_mismatch',
                'vehicle_context_status' => 'mismatch',
                'response' => 'The uploaded photo appears to depict a motorcycle, which does not match your Toyota Corolla.',
                'summary' => 'Vehicle mismatch detected between uploaded photo and vehicle profile.',
                'maintenance_tasks' => [
                    [
                        'title' => 'Motorcycle Chain Inspection',
                        'service_type' => 'Chain Drive',
                    ],
                ],
                'clarification_questions' => [
                    [
                        'question' => 'How would you like to proceed?',
                        'options' => ['Upload correct media', 'Switch vehicle profile', 'Start separate consultation'],
                    ],
                ],
            ]);

        $this->app->instance(AIServiceClient::class, $mockAi);

        $response = $this->postJson('/api/diagnostics', [
            'vehicle_id' => $this->vehicle->id,
            'symptoms' => 'Check brake photo',
            'input_type' => 'image',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'type' => 'vehicle_mismatch',
                    'status' => 'vehicle_mismatch',
                    'image_vehicle_match' => 'possible_mismatch',
                    'vehicle_context_status' => 'mismatch',
                    'maintenance_tasks' => [],
                ],
            ]);

        // CRUCIAL: No Diagnostic record created, no MaintenanceRecord created!
        $this->assertEquals(0, Diagnostic::count(), 'No diagnostic record should be saved on vehicle mismatch');
        $this->assertEquals(0, MaintenanceRecord::count(), 'No maintenance record should be attached to vehicle on mismatch');
    }

    #[Test]
    public function it_does_not_persist_diagnostic_or_maintenance_when_vehicle_switch_confirmation_is_required()
    {
        Sanctum::actingAs($this->user);

        $mockAi = Mockery::mock(AIServiceClient::class);
        $mockAi->shouldReceive('analyzeSymptoms')
            ->once()
            ->andReturn([
                'type' => 'vehicle_switch_confirmation_required',
                'status' => 'vehicle_switch_confirmation_required',
                'vehicle_context_status' => 'different_vehicle_mentioned',
                'mentioned_vehicle' => 'Ferrari F8',
                'response' => 'Your question refers to a Ferrari F8, but your active vehicle is a Toyota Corolla.',
                'summary' => 'Inquiry refers to a different vehicle profile.',
                'maintenance_tasks' => [],
                'clarification_questions' => [
                    [
                        'question' => 'How would you like to proceed?',
                        'options' => ['Switch vehicle profile', 'Start separate consultation', 'Continue with current vehicle'],
                    ],
                ],
            ]);

        $this->app->instance(AIServiceClient::class, $mockAi);

        $response = $this->postJson('/api/diagnostics', [
            'vehicle_id' => $this->vehicle->id,
            'symptoms' => 'How to change Ferrari oil?',
            'input_type' => 'text',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'type' => 'vehicle_switch_confirmation_required',
                    'status' => 'vehicle_switch_confirmation_required',
                    'vehicle_context_status' => 'different_vehicle_mentioned',
                ],
            ]);

        $this->assertEquals(0, Diagnostic::count(), 'No diagnostic record should be saved when vehicle switch confirmation is required');
        $this->assertEquals(0, MaintenanceRecord::count(), 'No maintenance record should be saved when vehicle switch confirmation is required');
    }
}
