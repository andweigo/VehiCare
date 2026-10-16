<?php

namespace Tests\Feature;

use App\Jobs\DeliverAnnouncement;
use App\Models\Announcement;
use App\Models\User;
use App\Notifications\AnnouncementNotification;
use App\Notifications\HighSeverityDiagnosticAlert;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AnnouncementNotificationFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_published_announcement_is_delivered_to_both_user_and_admin_when_audience_is_all(): void
    {
        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
            'is_active' => true,
            'created_at' => now()->subHour(),
        ]);

        $regularUser = User::factory()->create([
            'role' => User::ROLE_USER,
            'is_active' => true,
            'created_at' => now()->subHour(),
        ]);

        $announcement = Announcement::create([
            'title' => 'System Maintenance Tonight',
            'body' => 'We will perform scheduled updates at midnight.',
            'audience' => 'all',
            'status' => 'published',
            'scheduled_at' => now()->subMinute(),
            'expires_at' => now()->addDays(5),
            'published_at' => now(),
            'created_by' => $admin->id,
        ]);

        DeliverAnnouncement::dispatchSync($announcement->id);

        // Both regular user and admin should have received the notification
        $this->assertSame(1, $regularUser->notifications()->count());
        $this->assertSame(1, $admin->notifications()->count());

        // Verify API retrieval for regular user
        $responseUser = $this->actingAs($regularUser, 'sanctum')->getJson('/api/notifications');
        $responseUser->assertOk();
        $responseUser->assertJsonPath('data.0.type', 'announcement');
        $responseUser->assertJsonPath('data.0.title', 'System Maintenance Tonight');
        $responseUser->assertJsonPath('data.0.message', 'We will perform scheduled updates at midnight.');
        $responseUser->assertJsonPath('data.0.is_read', false);

        // Verify API retrieval for admin
        $responseAdmin = $this->actingAs($admin, 'sanctum')->getJson('/api/notifications');
        $responseAdmin->assertOk();
        $responseAdmin->assertJsonPath('data.0.type', 'announcement');
        $responseAdmin->assertJsonPath('data.0.title', 'System Maintenance Tonight');
    }

    public function test_delivery_is_idempotent_and_does_not_create_duplicates(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN, 'is_active' => true, 'created_at' => now()->subHour()]);
        $user = User::factory()->create(['role' => User::ROLE_USER, 'is_active' => true, 'created_at' => now()->subHour()]);

        $announcement = Announcement::create([
            'title' => 'Single Notice',
            'body' => 'This must only be delivered once.',
            'audience' => 'all',
            'status' => 'published',
            'scheduled_at' => now()->subMinute(),
            'expires_at' => now()->addDay(),
            'published_at' => now(),
            'created_by' => $admin->id,
        ]);

        // Deliver twice
        DeliverAnnouncement::dispatchSync($announcement->id);
        DeliverAnnouncement::dispatchSync($announcement->id);

        $this->assertSame(1, $user->notifications()->count());
        $this->assertSame(1, DB::table('announcement_deliveries')->where('announcement_id', $announcement->id)->where('user_id', $user->id)->count());
    }

    public function test_expired_announcements_are_excluded_from_api_and_unread_count(): void
    {
        $user = User::factory()->create(['role' => User::ROLE_USER, 'is_active' => true]);

        // Create an active announcement notification
        $user->notify(new AnnouncementNotification(
            101,
            'Active Notice',
            'Still valid.',
            now()->addDay()->toIso8601String()
        ));

        // Create an expired announcement notification
        $user->notify(new AnnouncementNotification(
            102,
            'Old Flash Sale',
            'Already over.',
            now()->subHour()->toIso8601String()
        ));

        $listResponse = $this->actingAs($user, 'sanctum')->getJson('/api/notifications');
        $listResponse->assertOk();
        $listResponse->assertJsonCount(1, 'data');
        $listResponse->assertJsonPath('data.0.title', 'Active Notice');

        $unreadResponse = $this->actingAs($user, 'sanctum')->getJson('/api/notifications/unread-count');
        $unreadResponse->assertOk();
        $unreadResponse->assertJsonPath('data.unread_count', 1);
    }

    public function test_non_announcement_notifications_remain_visible(): void
    {
        $user = User::factory()->create(['role' => User::ROLE_USER, 'is_active' => true]);

        // Insert non-announcement notification (e.g. system alert)
        DB::table('notifications')->insert([
            'id' => '00000000-0000-0000-0000-000000000001',
            'type' => 'App\\Notifications\\VehicleCorrectionRequestApproved',
            'notifiable_type' => User::class,
            'notifiable_id' => $user->id,
            'data' => json_encode([
                'type' => 'vehicle_edit_approved',
                'title' => 'Vehicle Approved',
                'message' => 'Your vehicle update was approved.',
                'data' => ['vehicle_id' => 5],
            ]),
            'read_at' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/notifications');
        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.type', 'vehicle_edit_approved');
        $response->assertJsonPath('data.0.title', 'Vehicle Approved');
    }

    public function test_read_and_unread_operations_work_properly(): void
    {
        $user = User::factory()->create(['role' => User::ROLE_USER, 'is_active' => true]);

        $user->notify(new AnnouncementNotification(
            201,
            'Notice 1',
            'Body 1',
            now()->addDay()->toIso8601String()
        ));
        $user->notify(new AnnouncementNotification(
            202,
            'Notice 2',
            'Body 2',
            now()->addDay()->toIso8601String()
        ));

        $unreadResponse = $this->actingAs($user, 'sanctum')->getJson('/api/notifications/unread-count');
        $unreadResponse->assertJsonPath('data.unread_count', 2);

        $notificationId = $user->notifications()->first()->id;

        // Mark single as read
        $markOne = $this->actingAs($user, 'sanctum')->patchJson("/api/notifications/{$notificationId}/read");
        $markOne->assertOk();

        $unreadResponse2 = $this->actingAs($user, 'sanctum')->getJson('/api/notifications/unread-count');
        $unreadResponse2->assertJsonPath('data.unread_count', 1);

        // Mark all as read
        $markAll = $this->actingAs($user, 'sanctum')->patchJson('/api/notifications/read-all');
        $markAll->assertOk();

        $unreadResponse3 = $this->actingAs($user, 'sanctum')->getJson('/api/notifications/unread-count');
        $unreadResponse3->assertJsonPath('data.unread_count', 0);
    }

    public function test_recipient_isolation_prevents_user_from_seeing_others_notifications(): void
    {
        $userA = User::factory()->create(['role' => User::ROLE_USER, 'is_active' => true]);
        $userB = User::factory()->create(['role' => User::ROLE_USER, 'is_active' => true]);

        $userA->notify(new AnnouncementNotification(
            301,
            'Private for User A',
            'Secret',
            now()->addDay()->toIso8601String()
        ));

        $responseB = $this->actingAs($userB, 'sanctum')->getJson('/api/notifications');
        $responseB->assertOk();
        $responseB->assertJsonCount(0, 'data');
    }

    public function test_malformed_or_missing_notification_data_does_not_crash_endpoint(): void
    {
        $user = User::factory()->create(['role' => User::ROLE_USER, 'is_active' => true]);

        // Notification with empty string data
        DB::table('notifications')->insert([
            'id' => '00000000-0000-0000-0000-000000000002',
            'type' => 'App\\Notifications\\GenericNotice',
            'notifiable_type' => User::class,
            'notifiable_id' => $user->id,
            'data' => '',
            'read_at' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Notification with empty JSON
        DB::table('notifications')->insert([
            'id' => '00000000-0000-0000-0000-000000000003',
            'type' => 'App\\Notifications\\GenericNotice',
            'notifiable_type' => User::class,
            'notifiable_id' => $user->id,
            'data' => '{}',
            'read_at' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/notifications');
        $response->assertOk();
        $response->assertJsonCount(2, 'data');
    }
}
