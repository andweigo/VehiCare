<?php

namespace Tests\Feature;

use App\Models\Payment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminSafetyTest extends TestCase
{
    use RefreshDatabase;

    protected function makeUser(array $attributes = []): User
    {
        return User::create(array_merge([
            'name' => 'Test User',
            'email' => 'user' . uniqid() . '@example.com',
            'password' => Hash::make('password123'),
            'role' => User::ROLE_USER,
            'subscription_plan' => User::SUBSCRIPTION_FREE,
            'vehicle_limit' => User::VEHICLE_LIMIT_FREE,
            'is_active' => true,
        ], $attributes));
    }

    protected function makeAdmin(array $attributes = []): User
    {
        return $this->makeUser(array_merge([
            'role' => User::ROLE_ADMIN,
            'is_active' => true,
            'email' => 'admin' . uniqid() . '@example.com',
        ], $attributes));
    }

    public function test_non_admin_cannot_access_admin_routes(): void
    {
        $user = $this->makeUser();

        $this->actingAs($user)
            ->get('/admin/dashboard')
            ->assertRedirect('/admin/login');
    }

    public function test_inactive_admin_cannot_access_admin_routes(): void
    {
        $admin = $this->makeAdmin(['is_active' => false]);

        $this->actingAs($admin)
            ->get('/admin/dashboard')
            ->assertRedirect('/admin/login');
    }

    public function test_non_admin_cannot_use_destructive_admin_endpoints(): void
    {
        $user = $this->makeUser();
        $target = $this->makeAdmin();

        $this->actingAs($user)
            ->delete('/admin/admins/' . $target->id)
            ->assertRedirect('/admin/login');

        $this->assertDatabaseHas('users', ['id' => $target->id]);
    }

    public function test_default_protected_admin_cannot_be_deleted(): void
    {
        $protectedAdmin = $this->makeAdmin(['email' => User::protectedAdminEmail()]);
        $actingAdmin = $this->makeAdmin();

        $this->actingAs($actingAdmin)
            ->delete('/admin/admins/' . $protectedAdmin->id)
            ->assertSessionHasErrors('email');

        $this->assertDatabaseHas('users', ['id' => $protectedAdmin->id, 'email' => User::protectedAdminEmail()]);
    }

    public function test_default_protected_admin_cannot_be_disabled(): void
    {
        $protectedAdmin = $this->makeAdmin(['email' => User::protectedAdminEmail()]);
        $actingAdmin = $this->makeAdmin();

        $this->actingAs($actingAdmin)
            ->post('/admin/admins/' . $protectedAdmin->id . '/toggle')
            ->assertSessionHasErrors('admin');

        $this->assertDatabaseHas('users', ['id' => $protectedAdmin->id, 'is_active' => true]);
    }

    public function test_admins_cannot_disable_or_delete_their_own_account(): void
    {
        $admin = $this->makeAdmin(['email' => 'owner-admin@example.com']);
        $this->makeAdmin();

        $this->actingAs($admin)
            ->post('/admin/admins/' . $admin->id . '/toggle')
            ->assertSessionHasErrors('admin');

        $this->actingAs($admin)
            ->delete('/admin/admins/' . $admin->id)
            ->assertSessionHasErrors('admin');
    }

    public function test_last_active_admin_cannot_be_disabled(): void
    {
        $admin = $this->makeAdmin(['email' => 'solo-admin@example.com']);

        $this->actingAs($admin)
            ->post('/admin/admins/' . $admin->id . '/toggle')
            ->assertSessionHasErrors([
                'admin' => 'At least one active administrator must remain available.',
            ]);

        $this->actingAs($admin)
            ->delete('/admin/admins/' . $admin->id)
            ->assertSessionHasErrors([
                'admin' => 'The last active administrator cannot be removed.',
            ]);

        $this->assertDatabaseHas('users', ['id' => $admin->id, 'is_active' => true]);
    }

    public function test_admin_with_recorded_payment_actions_cannot_be_deleted(): void
    {
        $user = $this->makeUser();
        $admin = $this->makeAdmin();
        $otherAdmin = $this->makeAdmin();

        Payment::create([
            'user_id' => $user->id,
            'plan' => User::SUBSCRIPTION_PREMIUM,
            'billing_cycle' => User::SUBSCRIPTION_CYCLE_MONTHLY,
            'amount' => 149.00,
            'payment_method' => 'card',
            'reference_number' => 'REF-ADMIN-ACTOR',
            'status' => Payment::STATUS_APPROVED,
            'submitted_at' => now(),
            'verified_at' => now(),
            'admin_id' => $admin->id,
        ]);

        $this->actingAs($otherAdmin)
            ->delete('/admin/admins/' . $admin->id)
            ->assertSessionHasErrors('admin');

        $this->assertDatabaseHas('users', ['id' => $admin->id]);
    }

    public function test_user_with_related_payment_cannot_be_deleted(): void
    {
        $user = $this->makeUser([
            'email' => 'customer@example.com',
        ]);
        $admin = $this->makeAdmin();

        Payment::create([
            'user_id' => $user->id,
            'plan' => User::SUBSCRIPTION_PREMIUM,
            'billing_cycle' => User::SUBSCRIPTION_CYCLE_MONTHLY,
            'amount' => 149.00,
            'payment_method' => 'card',
            'reference_number' => 'REF-123',
            'status' => Payment::STATUS_APPROVED,
            'submitted_at' => now(),
            'verified_at' => now(),
            'admin_id' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->delete('/admin/users/' . $user->id)
            ->assertSessionHasErrors('user');

        $this->assertDatabaseHas('users', ['id' => $user->id]);
    }

    public function test_clean_user_can_still_be_deleted(): void
    {
        $user = $this->makeUser(['email' => 'clean-user@example.com']);
        $admin = $this->makeAdmin();

        $this->actingAs($admin)
            ->delete('/admin/users/' . $user->id)
            ->assertSessionDoesntHaveErrors();

        $this->assertDatabaseMissing('users', ['id' => $user->id]);
    }
}
