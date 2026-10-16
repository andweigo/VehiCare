<?php

namespace Tests\Feature;

use App\Models\AiRuntimeSetting;
use App\Models\Announcement;
use App\Models\FeedbackSubmission;
use App\Models\User;
use App\Notifications\AdminActivityNotification;
use App\Notifications\AnnouncementNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AdminExpansionTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create([
            'role' => User::ROLE_ADMIN,
            'is_active' => true,
        ]);
    }

    public function test_feedback_is_persisted_and_notifies_active_administrators(): void
    {
        Notification::fake();
        $admin = $this->admin();

        $this->postJson('/api/feedback', [
            'category' => 'accuracy',
            'rating' => 2,
            'subject' => 'Diagnosis was inaccurate',
            'message' => 'The suggested cause did not match the issue.',
            'email' => 'guest@example.test',
        ])->assertCreated();

        $feedback = FeedbackSubmission::firstOrFail();
        $this->assertSame('new', $feedback->status);
        $this->assertNull($feedback->user_id);
        Notification::assertSentTo($admin, AdminActivityNotification::class);
    }

    public function test_admin_can_update_bounded_runtime_ai_limits(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->put(route('admin.settings.ai-limits.update'), [
            'limits' => [
                'guest' => ['limit' => 6, 'max_image_mb' => 5, 'max_video_mb' => 10, 'max_audio_mb' => 10, 'max_video_sec' => 20, 'max_audio_sec' => 30],
                'free' => ['limit' => 25, 'max_image_mb' => 10, 'max_video_mb' => 15, 'max_audio_mb' => 10, 'max_video_sec' => 30, 'max_audio_sec' => 60],
                'premium' => ['limit' => 120, 'max_image_mb' => 15, 'max_video_mb' => 30, 'max_audio_mb' => 10, 'max_video_sec' => 60, 'max_audio_sec' => 120],
            ],
        ])->assertRedirect();

        $this->assertDatabaseHas('ai_runtime_settings', [
            'plan' => 'guest',
            'consultation_limit' => 6,
            'updated_by' => $admin->id,
        ]);
        $this->assertSame(25, app(\App\Services\AIRuntimeSettingsService::class)->limitsFor('free')['limit']);
    }

    public function test_due_announcement_is_delivered_once_and_expiry_is_applied(): void
    {
        $admin = $this->admin();
        $user = User::factory()->create([
            'role' => User::ROLE_USER,
            'is_active' => true,
            'subscription_plan' => User::SUBSCRIPTION_FREE,
        ]);
        $announcement = Announcement::create([
            'title' => 'Service update',
            'body' => 'A scheduled service notice.',
            'audience' => 'free',
            'status' => 'scheduled',
            'scheduled_at' => now()->subMinute(),
            'expires_at' => now()->addDay(),
            'created_by' => $admin->id,
        ]);

        $this->artisan('announcements:deliver')->assertExitCode(0);
        $this->artisan('announcements:deliver')->assertExitCode(0);

        $this->assertDatabaseHas('announcements', [
            'id' => $announcement->id,
            'status' => 'published',
        ]);
        $this->assertDatabaseHas('announcement_deliveries', [
            'announcement_id' => $announcement->id,
            'user_id' => $user->id,
        ]);
        $this->assertSame(
            1,
            $user->notifications()->where('type', AnnouncementNotification::class)->count()
        );
    }
}
