<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminLoginViewTest extends TestCase
{
    use RefreshDatabase;
    public function test_admin_login_page_renders_successfully(): void
    {
        $response = $this->get(route('admin.login'));

        $response->assertStatus(200);
        $response->assertSee('Administrator Sign In');
        $response->assertSee('VehiCare Console');
    }

    public function test_admin_logo_endpoint_returns_success(): void
    {
        $response = $this->get(route('admin.logo'));

        $response->assertStatus(200);
    }

    public function test_admin_layout_renders_mobile_drawer_and_toggle_button(): void
    {
        $admin = \App\Models\User::create([
            'name' => 'Drawer Admin',
            'email' => 'drawer_' . uniqid() . '@example.com',
            'password' => \Illuminate\Support\Facades\Hash::make('password123'),
            'role' => \App\Models\User::ROLE_ADMIN,
            'subscription_plan' => \App\Models\User::SUBSCRIPTION_PREMIUM,
            'vehicle_limit' => \App\Models\User::VEHICLE_LIMIT_PREMIUM,
            'is_active' => true,
        ]);

        $response = $this->actingAs($admin)->get(route('admin.dashboard'));

        $response->assertStatus(200);
        $response->assertSee('admin-mobile-menu-btn');
        $response->assertSee('admin-mobile-drawer');
        $response->assertSee('admin-mobile-drawer-backdrop');
        $response->assertSee('admin-mobile-drawer-close');
    }
}
