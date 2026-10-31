<?php

namespace Tests\Unit;

use App\Services\AI\ConversationalVehicleOnboardingService;
use PHPUnit\Framework\TestCase;

class ConversationalVehicleOnboardingServiceTest extends TestCase
{
    private ConversationalVehicleOnboardingService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new ConversationalVehicleOnboardingService();
    }

    public function test_free_user_is_immediately_told_to_subscribe_first(): void
    {
        $entitlements = [
            'plan' => 'free',
            'vehicle_count' => 1,
            'vehicle_allowance' => 1,
        ];

        $result = $this->service->handleTurn(
            'I want to add a new vehicle',
            [],
            $entitlements,
            'en'
        );

        $this->assertNotNull($result);
        $this->assertSame('conversation', $result['type']);
        $this->assertTrue($result['upgrade_required']);
        $this->assertStringContainsString('Free Plan', $result['response']);
        $this->assertStringContainsString('Premium', $result['response']);
    }

    public function test_premium_user_at_limit_is_told_garage_is_full(): void
    {
        $entitlements = [
            'plan' => 'premium',
            'vehicle_count' => 5,
            'vehicle_allowance' => 5,
        ];

        $result = $this->service->handleTurn(
            'Can you add another vehicle for me?',
            [],
            $entitlements,
            'en'
        );

        $this->assertNotNull($result);
        $this->assertSame('conversation', $result['type']);
        $this->assertStringContainsString('5 vehicles', $result['response']);
    }

    public function test_premium_user_step_by_step_vehicle_onboarding_flow(): void
    {
        $entitlements = [
            'plan' => 'premium',
            'vehicle_count' => 1,
            'vehicle_allowance' => 5,
        ];

        // Turn 1: User asks to add a new vehicle without details
        $turn1 = $this->service->handleTurn('I want to add a new vehicle', [], $entitlements, 'en');
        $this->assertNotNull($turn1);
        $this->assertSame('conversation', $turn1['type']);
        $this->assertStringContainsString('add a new vehicle to your garage', $turn1['response']);

        $history = [
            ['role' => 'user', 'content' => 'I want to add a new vehicle'],
            ['role' => 'assistant', 'content' => $turn1['response']],
        ];

        // Turn 2: User provides Brand and Model ("Honda Click 160")
        $turn2 = $this->service->handleTurn('Honda Click 160', $history, $entitlements, 'en');
        $this->assertNotNull($turn2);
        $this->assertSame('conversation', $turn2['type']);
        $this->assertStringContainsString('Honda', $turn2['response']);
        $this->assertStringContainsString('Click 160', $turn2['response']);
        $this->assertStringContainsString('Year', $turn2['response']);

        $history[] = ['role' => 'user', 'content' => 'Honda Click 160'];
        $history[] = ['role' => 'assistant', 'content' => $turn2['response']];

        // Turn 3: User provides Year ("2023") -> should return action_proposal
        $turn3 = $this->service->handleTurn('2023', $history, $entitlements, 'en');
        $this->assertNotNull($turn3);
        $this->assertSame('action_proposal', $turn3['type']);
        $this->assertSame('create_vehicle', $turn3['action']);
        $this->assertTrue($turn3['requires_confirmation']);
        $this->assertSame('Motorcycle', $turn3['parameters']['vehicle_type']);
        $this->assertSame('Honda', $turn3['parameters']['brand']);
        $this->assertSame('Click 160', $turn3['parameters']['model']);
        $this->assertSame(2023, $turn3['parameters']['year']);

        $history[] = ['role' => 'user', 'content' => '2023'];
        $history[] = ['role' => 'assistant', 'content' => $turn3['response']];

        // Turn 4: User replies "Yes" in chat -> requires_confirmation becomes false for immediate execution
        $turn4 = $this->service->handleTurn('Yes', $history, $entitlements, 'en');
        $this->assertNotNull($turn4);
        $this->assertSame('action_proposal', $turn4['type']);
        $this->assertSame('create_vehicle', $turn4['action']);
        $this->assertFalse($turn4['requires_confirmation']);
    }

    public function test_invalid_vin_prompts_for_17_char_vin_or_skip(): void
    {
        $entitlements = [
            'plan' => 'premium',
            'vehicle_count' => 2,
            'vehicle_allowance' => 5,
        ];

        $turn = $this->service->handleTurn(
            'Add my 2022 Toyota Vios Car with VIN: 12345ABC',
            [],
            $entitlements,
            'en'
        );

        $this->assertNotNull($turn);
        $this->assertSame('conversation', $turn['type']);
        $this->assertStringContainsString('17 alphanumeric characters', $turn['response']);
    }
}
