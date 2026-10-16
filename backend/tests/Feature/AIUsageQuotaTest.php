<?php

namespace Tests\Feature;

use App\Models\AiUsageLog;
use App\Models\User;
use App\Services\AIUsageService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class AIUsageQuotaTest extends TestCase
{
    use RefreshDatabase;

    protected AIUsageService $usageService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->usageService = new AIUsageService();
    }

    #[Test]
    public function it_returns_authoritative_free_tier_limits_of_20_monthly()
    {
        $user = User::factory()->create([
            'subscription_plan' => User::SUBSCRIPTION_FREE,
        ]);

        $stats = $this->usageService->getUsageStats($user);

        $this->assertEquals('free', $stats['plan']);
        $this->assertEquals(20, $stats['limit']);
        $this->assertEquals(0, $stats['used']);
        $this->assertEquals(20, $stats['remaining']);
        $this->assertEquals('monthly', $stats['period']);
        $this->assertFalse($stats['exhausted']);
        $this->assertNotNull($stats['reset_at']);
    }

    #[Test]
    public function it_returns_authoritative_guest_tier_limits_of_5_total()
    {
        $stats = $this->usageService->getUsageStats(null, 'guest-uuid-123');

        $this->assertEquals('guest', $stats['plan']);
        $this->assertEquals(5, $stats['limit']);
        $this->assertEquals(0, $stats['used']);
        $this->assertEquals(5, $stats['remaining']);
        $this->assertEquals('total', $stats['period']);
        $this->assertFalse($stats['exhausted']);
        $this->assertNull($stats['reset_at']);
    }

    #[Test]
    public function it_returns_authoritative_premium_tier_limits_of_100_monthly()
    {
        $user = User::factory()->create([
            'subscription_plan' => User::SUBSCRIPTION_PREMIUM,
        ]);

        $stats = $this->usageService->getUsageStats($user);

        $this->assertEquals('premium', $stats['plan']);
        $this->assertEquals(100, $stats['limit']);
        $this->assertEquals(0, $stats['used']);
        $this->assertEquals(100, $stats['remaining']);
        $this->assertEquals('monthly', $stats['period']);
        $this->assertFalse($stats['exhausted']);
        $this->assertNotNull($stats['reset_at']);
    }

    #[Test]
    public function it_blocks_and_returns_quota_exhausted_when_free_limit_is_reached()
    {
        $user = User::factory()->create([
            'subscription_plan' => User::SUBSCRIPTION_FREE,
        ]);

        // Create 20 successful usage logs for this month
        for ($i = 0; $i < 20; $i++) {
            AiUsageLog::create([
                'user_id' => $user->id,
                'plan' => 'free',
                'input_type' => 'text',
                'status' => 'success',
                'created_at' => Carbon::now(),
            ]);
        }

        $stats = $this->usageService->getUsageStats($user);
        $this->assertEquals(20, $stats['used']);
        $this->assertEquals(0, $stats['remaining']);
        $this->assertTrue($stats['exhausted']);

        $reservation = $this->usageService->evaluateAndReserve($user, null, 'text');
        $this->assertFalse($reservation['allowed']);
        $this->assertEquals('ai_limit_reached', $reservation['reason']);
        $this->assertEquals(0, $reservation['remaining']);
        $this->assertTrue($reservation['exhausted']);
    }

    #[Test]
    public function it_serves_ai_usage_endpoint_with_authoritative_data()
    {
        $user = User::factory()->create([
            'subscription_plan' => User::SUBSCRIPTION_FREE,
        ]);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/ai/usage');

        $response->assertStatus(200);
        $response->assertJson([
            'status' => 'success',
            'data' => [
                'plan' => 'free',
                'limit' => 20,
                'used' => 0,
                'remaining' => 20,
                'period' => 'monthly',
                'exhausted' => false,
            ],
        ]);
        $this->assertNotNull($response->json('data.reset_at'));
    }

    #[Test]
    public function it_reserves_consultations_as_pending_and_releases_failed_attempts()
    {
        $guestUuid = 'guest-reservation-test';

        $reservation = $this->usageService->evaluateAndReserve(null, $guestUuid, 'audio');

        $this->assertTrue($reservation['allowed']);
        $this->assertDatabaseHas('ai_usage_logs', [
            'id' => $reservation['log_id'],
            'guest_uuid' => $guestUuid,
            'input_type' => 'audio',
            'status' => 'pending',
        ]);
        $this->assertEquals(1, $this->usageService->getUsageStats(null, $guestUuid)['used']);

        $this->usageService->markAsFailed($reservation['log_id'], 'AI_SERVICE_BUSY');

        $this->assertDatabaseHas('ai_usage_logs', [
            'id' => $reservation['log_id'],
            'status' => 'failed',
            'error_code' => 'AI_SERVICE_BUSY',
        ]);
        $this->assertEquals(0, $this->usageService->getUsageStats(null, $guestUuid)['used']);
    }
}
