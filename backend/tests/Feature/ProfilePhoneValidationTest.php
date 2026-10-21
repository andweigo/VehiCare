<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProfilePhoneValidationTest extends TestCase
{
    use RefreshDatabase;

    public function test_rejects_invalid_short_phone_number_such_as_6666(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->patchJson('/api/user', [
            'phone_number' => '6666',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['phone_number']);

        $user->refresh();
        $this->assertNotEquals('6666', $user->phone_number);
    }

    public function test_rejects_arbitrary_text_or_invalid_prefixes(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->patchJson('/api/user', [
            'phone_number' => '08123456789', // Invalid PH mobile prefix
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['phone_number']);
    }

    public function test_accepts_and_normalizes_standard_ph_mobile_numbers(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        // Standard 09XXXXXXXXX format
        $response1 = $this->patchJson('/api/user', [
            'phone_number' => '09171234567',
        ]);

        $response1->assertStatus(200);
        $user->refresh();
        $this->assertEquals('09171234567', $user->phone_number);

        // With formatting dashes and spaces
        $response2 = $this->patchJson('/api/user', [
            'phone_number' => '0918-765-4321',
        ]);

        $response2->assertStatus(200);
        $user->refresh();
        $this->assertEquals('09187654321', $user->phone_number);

        // International format +639XXXXXXXXX
        $response3 = $this->patchJson('/api/user', [
            'phone_number' => '+63 919 123 4567',
        ]);

        $response3->assertStatus(200);
        $user->refresh();
        $this->assertEquals('+639191234567', $user->phone_number);

        // 639XXXXXXXXX without plus
        $response4 = $this->patchJson('/api/user', [
            'phone_number' => '639201234567',
        ]);

        $response4->assertStatus(200);
        $user->refresh();
        $this->assertEquals('+639201234567', $user->phone_number);
    }

    public function test_allows_clearing_phone_number_with_null(): void
    {
        $user = User::factory()->create([
            'phone_number' => '09171234567',
        ]);
        Sanctum::actingAs($user);

        $response = $this->patchJson('/api/user', [
            'phone_number' => null,
        ]);

        $response->assertStatus(200);
        $user->refresh();
        $this->assertNull($user->phone_number);
    }
}
