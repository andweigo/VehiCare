<?php

namespace Tests\Feature;

use App\Mail\VerificationCodeMail;
use App\Models\OtpCode;
use App\Models\User;
use App\Services\OtpService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class RegistrationOtpVerificationFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_creates_unverified_user_and_dispatches_otp_code(): void
    {
        Mail::fake();

        $response = $this->postJson('/api/register', [
            'name' => 'Jane Doe',
            'email' => 'jane@example.com',
            'password' => 'SecurePass123!',
            'password_confirmation' => 'SecurePass123!',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'requires_otp' => true,
                    'email' => 'jane@example.com',
                    'token' => null,
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'jane@example.com',
            'email_verified_at' => null,
        ]);

        Mail::assertSent(VerificationCodeMail::class, function ($mail) {
            return $mail->hasTo('jane@example.com') && $mail->purpose === OtpService::PURPOSE_REGISTRATION;
        });

        $this->assertDatabaseHas('otp_codes', [
            'email' => 'jane@example.com',
            'purpose' => OtpService::PURPOSE_REGISTRATION,
            'verified_at' => null,
        ]);
    }

    public function test_invalid_otp_code_is_rejected_and_does_not_verify_user(): void
    {
        $user = User::factory()->create([
            'email' => 'jane@example.com',
            'email_verified_at' => null,
        ]);

        OtpCode::create([
            'email' => 'jane@example.com',
            'code_hash' => Hash::make('123456'),
            'purpose' => OtpService::PURPOSE_REGISTRATION,
            'expires_at' => now()->addMinutes(5),
            'attempts' => 0,
            'verified_at' => null,
        ]);

        $response = $this->postJson('/api/auth/verify-otp', [
            'email' => 'jane@example.com',
            'purpose' => 'registration',
            'code' => '999999',
        ]);

        $response->assertStatus(400)
            ->assertJson([
                'success' => false,
            ]);

        $user->refresh();
        $this->assertNull($user->email_verified_at);
    }

    public function test_expired_otp_code_is_rejected(): void
    {
        $user = User::factory()->create([
            'email' => 'jane@example.com',
            'email_verified_at' => null,
        ]);

        OtpCode::create([
            'email' => 'jane@example.com',
            'code_hash' => Hash::make('123456'),
            'purpose' => OtpService::PURPOSE_REGISTRATION,
            'expires_at' => now()->subMinute(),
            'attempts' => 0,
            'verified_at' => null,
        ]);

        $response = $this->postJson('/api/auth/verify-otp', [
            'email' => 'jane@example.com',
            'purpose' => 'registration',
            'code' => '123456',
        ]);

        $response->assertStatus(400)
            ->assertJson([
                'success' => false,
            ]);

        $user->refresh();
        $this->assertNull($user->email_verified_at);
    }

    public function test_valid_otp_code_verifies_user_and_returns_authenticated_session(): void
    {
        $user = User::factory()->create([
            'email' => 'jane@example.com',
            'email_verified_at' => null,
        ]);

        OtpCode::create([
            'email' => 'jane@example.com',
            'code_hash' => Hash::make('654321'),
            'purpose' => OtpService::PURPOSE_REGISTRATION,
            'expires_at' => now()->addMinutes(5),
            'attempts' => 0,
            'verified_at' => null,
        ]);

        $response = $this->postJson('/api/auth/verify-otp', [
            'email' => 'jane@example.com',
            'purpose' => 'registration',
            'code' => '654321',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        $this->assertNotNull($response->json('token'));
        $this->assertNotNull($response->json('user.id'));

        $user->refresh();
        $this->assertNotNull($user->email_verified_at);
    }

    public function test_resend_otp_enforces_cooldown(): void
    {
        Mail::fake();

        // 1. Send first OTP
        $this->postJson('/api/auth/send-otp', [
            'email' => 'jane@example.com',
            'purpose' => 'registration',
        ])->assertStatus(200);

        // 2. Immediately attempt to resend
        $response = $this->postJson('/api/auth/resend-otp', [
            'email' => 'jane@example.com',
            'purpose' => 'registration',
        ]);

        $response->assertStatus(400)
            ->assertJson([
                'success' => false,
            ]);

        $this->assertGreaterThan(0, $response->json('cooldown_seconds'));
    }

    public function test_existing_login_flow_remains_unaffected(): void
    {
        $user = User::factory()->create([
            'email' => 'existing@example.com',
            'password' => Hash::make('Secret123!'),
            'email_verified_at' => null, // Existing test/seed accounts without verification
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'existing@example.com',
            'password' => 'Secret123!',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'user' => [
                        'email' => 'existing@example.com',
                    ],
                ],
            ]);

        $this->assertNotNull($response->json('data.token'));
    }
}
