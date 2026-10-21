<?php

namespace Tests\Feature;

use App\Models\AiUsageLog;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminAiActivityTest extends TestCase
{
    use RefreshDatabase;

    protected function makeAdmin(): User
    {
        return User::create([
            'name' => 'Admin User',
            'email' => 'admin_' . uniqid() . '@example.com',
            'password' => Hash::make('password123'),
            'role' => User::ROLE_ADMIN,
            'subscription_plan' => User::SUBSCRIPTION_PREMIUM,
            'vehicle_limit' => User::VEHICLE_LIMIT_PREMIUM,
            'is_active' => true,
        ]);
    }

    public function test_admin_dashboard_ai_chart_reflects_real_successful_ai_counts(): void
    {
        $admin = $this->makeAdmin();

        // 3 successful runs today
        AiUsageLog::create([
            'user_id' => $admin->id,
            'plan' => 'premium',
            'input_type' => 'text',
            'request_key' => 'req_' . uniqid(),
            'status' => 'success',
            'duration_ms' => 450,
            'created_at' => Carbon::now(),
        ]);
        AiUsageLog::create([
            'user_id' => $admin->id,
            'plan' => 'premium',
            'input_type' => 'image',
            'request_key' => 'req_' . uniqid(),
            'status' => 'success',
            'duration_ms' => 600,
            'created_at' => Carbon::now(),
        ]);
        AiUsageLog::create([
            'user_id' => $admin->id,
            'plan' => 'premium',
            'input_type' => 'video',
            'request_key' => 'req_' . uniqid(),
            'status' => 'success',
            'duration_ms' => 850,
            'created_at' => Carbon::now(),
        ]);

        // 1 failed run today - should NOT inflate successful daily chart runs
        AiUsageLog::create([
            'user_id' => $admin->id,
            'plan' => 'premium',
            'input_type' => 'video',
            'request_key' => 'req_' . uniqid(),
            'status' => 'failed',
            'error_code' => 'AI_INVALID_MEDIA',
            'duration_ms' => 120,
            'created_at' => Carbon::now(),
        ]);

        $response = $this->actingAs($admin)->get('/admin/dashboard');

        $response->assertStatus(200);
        $response->assertViewHas('aiChartData', function (array $data) {
            // The last entry (today) must be exactly 3 (only successful runs)
            $todayCount = end($data);
            return $todayCount === 3;
        });
        $response->assertSee('overviewAiChart');
        $response->assertSee("type: 'bar'", false);
    }

    public function test_admin_ai_activity_page_displays_bar_chart_with_true_values(): void
    {
        $admin = $this->makeAdmin();

        AiUsageLog::create([
            'user_id' => $admin->id,
            'plan' => 'free',
            'input_type' => 'text',
            'request_key' => 'req_' . uniqid(),
            'status' => 'success',
            'duration_ms' => 300,
            'created_at' => Carbon::now()->subDays(2),
        ]);
        AiUsageLog::create([
            'user_id' => $admin->id,
            'plan' => 'free',
            'input_type' => 'text',
            'request_key' => 'req_' . uniqid(),
            'status' => 'success',
            'duration_ms' => 320,
            'created_at' => Carbon::now()->subDays(2),
        ]);

        $response = $this->actingAs($admin)->get(route('admin.ai-activity.index'));

        $response->assertStatus(200);
        $response->assertViewHas('chartData');
        $response->assertViewHas('successfulRequests', 2);
        $response->assertSee('aiDailyChart');
        $response->assertSee("type: 'bar'", false);
    }
}
