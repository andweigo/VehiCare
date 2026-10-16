<?php

namespace Tests\Feature;

use Tests\TestCase;

class AdminLoginViewTest extends TestCase
{
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
}
