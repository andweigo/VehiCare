<?php

namespace Tests\Feature;

use App\Models\Payment;
use App\Models\User;
use App\Services\SubscriptionService;
use App\Notifications\AdminActivityNotification;
use App\Notifications\PremiumGrantedNotification;
use App\Notifications\PremiumRevokedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AdminSubscriptionManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function makeAccount(string $role): User
    {
        return User::factory()->create([
            'role' => $role,
            'subscription_plan' => User::SUBSCRIPTION_FREE,
            'subscription_status' => User::SUBSCRIPTION_STATUS_NONE,
            'vehicle_limit' => User::VEHICLE_LIMIT_FREE,
            'is_active' => true,
        ]);
    }

    public function test_manual_premium_grant_records_admin_reason_and_five_vehicle_allowance(): void
    {
        $admin = $this->makeAccount(User::ROLE_ADMIN);
        $user = $this->makeAccount(User::ROLE_USER);

        app(SubscriptionService::class)->grantManualPremium(
            $user,
            $admin,
            User::SUBSCRIPTION_CYCLE_MONTHLY,
            'Customer support compensation'
        );

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'subscription_plan' => User::SUBSCRIPTION_PREMIUM,
            'subscription_source' => 'manual',
            'vehicle_limit' => User::VEHICLE_LIMIT_PREMIUM,
        ]);
        $this->assertDatabaseHas('manual_premium_grants', [
            'user_id' => $user->id,
            'admin_id' => $admin->id,
            'reason' => 'Customer support compensation',
            'status' => 'active',
        ]);
    }

    public function test_manual_premium_revocation_records_actor_and_preserves_user_vehicle_allowance_rules(): void
    {
        $admin = $this->makeAccount(User::ROLE_ADMIN);
        $user = $this->makeAccount(User::ROLE_USER);
        $service = app(SubscriptionService::class);

        $grant = $service->grantManualPremium(
            $user,
            $admin,
            User::SUBSCRIPTION_CYCLE_MONTHLY,
            'Temporary access'
        );

        $service->revokePremium($user, $admin, 'Grant no longer required');

        $this->assertDatabaseHas('manual_premium_grants', [
            'id' => $grant->id,
            'status' => 'revoked',
            'revoked_by' => $admin->id,
            'revocation_reason' => 'Grant no longer required',
        ]);
        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'subscription_plan' => User::SUBSCRIPTION_FREE,
            'subscription_source' => 'none',
            'vehicle_limit' => User::VEHICLE_LIMIT_FREE,
        ]);
    }

    public function test_payment_verified_premium_revocation_records_actor_and_reason(): void
    {
        Notification::fake();
        Event::fake();

        $admin = $this->makeAccount(User::ROLE_ADMIN);
        $user = $this->makeAccount(User::ROLE_USER);
        $payment = Payment::create([
            'user_id' => $user->id,
            'plan' => User::SUBSCRIPTION_PREMIUM,
            'billing_cycle' => User::SUBSCRIPTION_CYCLE_MONTHLY,
            'amount' => Payment::PRICE_MONTHLY,
            'payment_method' => 'card',
            'reference_number' => 'REF-REVOKE-' . uniqid(),
            'status' => Payment::STATUS_PENDING,
            'submitted_at' => now(),
        ]);
        $service = app(SubscriptionService::class);

        $service->approvePayment($payment, $admin);
        $service->revokePremium($user, $admin, 'Subscription eligibility was withdrawn');

        $this->assertDatabaseHas('payments', [
            'id' => $payment->id,
            'status' => Payment::STATUS_APPROVED,
            'subscription_revoked_by' => $admin->id,
            'subscription_revocation_reason' => 'Subscription eligibility was withdrawn',
        ]);
        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'subscription_plan' => User::SUBSCRIPTION_FREE,
            'subscription_source' => 'none',
            'vehicle_limit' => User::VEHICLE_LIMIT_FREE,
        ]);
    }

    public function test_manual_premium_grant_requires_a_reason(): void
    {
        $admin = $this->makeAccount(User::ROLE_ADMIN);
        $user = $this->makeAccount(User::ROLE_USER);

        $this->actingAs($admin)
            ->post(route('admin.users.premium.grant', $user), [
                'billing_cycle' => User::SUBSCRIPTION_CYCLE_MONTHLY,
                'reason' => '',
            ])
            ->assertSessionHasErrors('reason');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'subscription_plan' => User::SUBSCRIPTION_FREE,
        ]);
    }

    public function test_manual_premium_grant_notifies_user_of_premium_access(): void
    {
        Notification::fake();
        Event::fake();

        $admin = $this->makeAccount(User::ROLE_ADMIN);
        $user = $this->makeAccount(User::ROLE_USER);

        app(SubscriptionService::class)->grantManualPremium(
            $user,
            $admin,
            User::SUBSCRIPTION_CYCLE_MONTHLY,
            'Loyalty reward program'
        );

        Notification::assertSentTo($user, PremiumGrantedNotification::class);
    }

    public function test_user_subscription_purchase_notifies_active_admins(): void
    {
        Notification::fake();
        Event::fake();

        $admin = $this->makeAccount(User::ROLE_ADMIN);
        $user = $this->makeAccount(User::ROLE_USER);

        app(SubscriptionService::class)->submitPayment(
            $user,
            'premium',
            User::SUBSCRIPTION_CYCLE_MONTHLY,
            'card'
        );

        Notification::assertSentTo($admin, AdminActivityNotification::class, function ($notification) {
            $data = $notification->toArray(new \stdClass());
            return str_contains($data['title'], 'New Subscription Purchase');
        });
    }

    public function test_manual_premium_revocation_notifies_user(): void
    {
        Notification::fake();
        Event::fake();

        $admin = $this->makeAccount(User::ROLE_ADMIN);
        $user = $this->makeAccount(User::ROLE_USER);
        $service = app(SubscriptionService::class);

        $service->grantManualPremium(
            $user,
            $admin,
            User::SUBSCRIPTION_CYCLE_MONTHLY,
            'Temporary access'
        );

        $service->revokePremium($user, $admin, 'Subscription period finished');

        Notification::assertSentTo($user, PremiumRevokedNotification::class);
    }
}
