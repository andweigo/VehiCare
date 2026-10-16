<?php

namespace Tests\Feature;

use App\Models\OtpCode;
use App\Models\User;
use App\Services\FirebaseService;
use App\Services\OtpService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Tests\TestCase;

class PasswordResetFlowTest extends TestCase
{
    use RefreshDatabase;

    protected array $mockServiceAccount;

    protected const TEST_RSA_PRIVATE_KEY = <<<EOD
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQChMEo9tqquK15A
t+8R0CCza9pm26gHHrawI8/Cd8LvkClxda6W64vkBnM+fJ1rOSyuvL3aWBK1KkUC
Wd9NQ+B5ijYImq/TfBJq8dNx06iqDG4szcKO3xG28bxICOAYXkch6NEOJQDqxbkV
qhFjZ0UPP5pL7xo6+2ZxoM62J7SivXzyxUpQnrVT6/r8T2GwPgUVo5Mk0220/te2
ZDJJkFlj4+Nenbr37IunhFgpz72xs0DGeJ43bULY30KDzbQNX7oJtql4/FrlvIki
2nGjsbYvIO5e2RK7s0qbMR5y+IuWj1Xd0Gy0bFQ1VHxCXIzFUuEUO3gMEDCP7+Jq
mx+mzeRrAgMBAAECggEAFL2y/+fuZIT+FtPUNnWSj6PUMaIYJ/pixZ2GEV75vXvO
aWQcOB1NHeValPLSCscLodx1jZABsEAlKx1HZ5jRXLJVK5xD/bGcaRh+/cmfjWoW
DzvWyi2YCPNoJ9jEhT40Zv+fTvOh/5O7sjb1D9ZtA35Kq3Sz6l0JHJv1nWjUjJAj
I/z9GpSWvqkqGjz0/vmZT7MU/FrSz5URt1i4fz9sGWzDO0UpmWshhaWDH2xT/Qip
YPVb07HNZ2op9yfWoBLoCYqCiTkXlCCXYkkxP9Oqx30MYhf15L1N9G8k/6ZumVz2
9x0Shz6t8pPH+4yoOWUP+p+m8bNYXGtFac+6aavCKQKBgQDRIoMdkjE7Ot3SwFdC
hIFnClASSrGkgFUr+VCe89ljENZOqWToNhDa2MiODerYKbxAYqJic6LcGtoJfTYN
saV/p2J63aMmwGHa2reyrqGBcikPLuTXXJ5ReVqLzvBpVp6o/EzTOyWQm50Vk+2T
3WaEctqHYLyuSQzBXSt45UGJZwKBgQDFTzzURDhP5OekMyIwefLTfmW6H1I7CCnE
nl9SIQxBMHNJe4Bg5rB21SNIhGY8KKebCiuiTxRZC3GV4L5FP8huhhKb1tQ3S987
5o0R7BSHVas5dusIvsLOZcYi9r3IN6K1cG7v83TuXZZqniSLQVDU+YvgwGKYK+F2
7gMt5Jr2XQKBgAJGdti2g3SagllNoGVn3aSKVy6rw1z/zG1rC/Z+vqm2QC6g5ykj
lXFcFGp/OkPZyGOG7y9VBLuSSzb5NsJVYXCPGKIvkRvV0fq4kHEQN0+aN1oj73ds
WYiXYmXM/Y6X06gQ/qD5rsHw/3eBoX8PVJMyULBSXBslTk84PUXWcK0XAoGBAMKB
sHeYoOKxx2DpP4UGUskHS4VFpyymiXZYoaM3DPuepagE5bOg9sjOqC+uxZH8ie2f
AxDIYEi/rUORAEEH9bBu3x1dlGrGktRcHSlTz5DydQ77GgvO8f/B+KczEje0EORI
aDSHjfgFrmiAaYoV43dwYeI4BXn5mBRD4kJ1oAXJAoGAFhMwwL/YXTekwZP9BAtl
bwMiI65hoUdxsxRtmunZejNpu+41T9Ge+fs7fzXlHNTTYIxo0tLr0hj1xN+ON535
oQgkBYwBactZ4MLHuvNykPLulhUjpN/FEOj4f4fA5nF/HJZatUlX4lRcJtyFk4GO
BxDPsNpTTLIb171lcMZM/e0=
-----END PRIVATE KEY-----
EOD;

    protected function setUp(): void
    {
        parent::setUp();

        $this->mockServiceAccount = [
            'project_id' => 'vehicare-62de4',
            'client_email' => 'firebase-adminsdk@vehicare-62de4.iam.gserviceaccount.com',
            'private_key' => self::TEST_RSA_PRIVATE_KEY,
        ];

        config([
            'services.firebase.service_account_json' => json_encode($this->mockServiceAccount),
            'services.firebase.project_id' => 'vehicare-62de4',
        ]);

        Cache::forget('firebase_admin_oauth_token');
    }

    public function test_google_only_account_can_request_otp_and_reset_password_establishing_credentials(): void
    {
        Mail::fake();

        // Account originally created via Google Sign-In (random placeholder password in DB, firebase_uid present)
        $user = User::factory()->create([
            'email' => 'googleuser@example.com',
            'password' => Hash::make(Str::random(24)),
            'firebase_uid' => 'google-firebase-uid-123',
            'is_active' => true,
        ]);

        // 1. Request OTP for password reset (previously returned 422 for Google accounts)
        $sendResponse = $this->postJson('/api/auth/send-otp', [
            'email' => 'googleuser@example.com',
            'purpose' => 'password_reset',
        ]);

        $sendResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Verification code sent successfully.',
            ]);

        $otpRecord = OtpCode::where('email', 'googleuser@example.com')
            ->where('purpose', OtpService::PURPOSE_PASSWORD_RESET)
            ->first();
        $this->assertNotNull($otpRecord);

        // 2. Simulate OTP verification
        $otpCode = '654321';
        $otpRecord->update([
            'code_hash' => Hash::make($otpCode),
            'verified_at' => now(),
            'updated_at' => now(),
        ]);

        // 3. Mock Google OAuth2 token and Firebase Identity Toolkit accounts:update endpoints
        Http::fake([
            'https://oauth2.googleapis.com/token' => Http::response([
                'access_token' => 'mock-google-access-token',
                'expires_in' => 3600,
            ], 200),
            'https://identitytoolkit.googleapis.com/*' => Http::response([
                'localId' => 'google-firebase-uid-123',
                'email' => 'googleuser@example.com',
                'providerUserInfo' => [
                    ['providerId' => 'google.com'],
                    ['providerId' => 'password'],
                ],
            ], 200),
        ]);

        // 4. Submit password reset with verified code
        $resetResponse = $this->postJson('/api/auth/reset-password', [
            'email' => 'googleuser@example.com',
            'code' => $otpCode,
            'password' => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ]);

        $resetResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Password reset successfully. You can now log in with your new password.',
            ]);

        // Verify Firebase accounts:update was called with correct localId and password
        Http::assertSent(function ($request) {
            return str_contains($request->url(), 'accounts:update') &&
                $request['localId'] === 'google-firebase-uid-123' &&
                $request['password'] === 'NewPassword123!';
        });

        // Verify Laravel user now has the new password set and UID is preserved
        $user->refresh();
        $this->assertTrue(Hash::check('NewPassword123!', $user->password));
        $this->assertEquals('google-firebase-uid-123', $user->firebase_uid);

        // Verify OTP is destroyed (single-use)
        $this->assertDatabaseMissing('otp_codes', ['id' => $otpRecord->id]);
    }

    public function test_existing_email_password_account_can_reset_password_and_subsequently_login(): void
    {
        $user = User::factory()->create([
            'email' => 'standard@example.com',
            'password' => Hash::make('OldPassword123!'),
            'firebase_uid' => 'standard-firebase-uid-456',
            'is_active' => true,
        ]);

        $otpRecord = OtpCode::create([
            'email' => 'standard@example.com',
            'code_hash' => Hash::make('112233'),
            'purpose' => OtpService::PURPOSE_PASSWORD_RESET,
            'expires_at' => now()->addMinutes(5),
            'verified_at' => now(),
            'updated_at' => now(),
            'attempts' => 1,
        ]);

        Http::fake([
            'https://oauth2.googleapis.com/token' => Http::response([
                'access_token' => 'mock-google-access-token',
                'expires_in' => 3600,
            ], 200),
            'https://identitytoolkit.googleapis.com/*' => Http::response([
                'localId' => 'standard-firebase-uid-456',
                'email' => 'standard@example.com',
            ], 200),
        ]);

        $resetResponse = $this->postJson('/api/auth/reset-password', [
            'email' => 'standard@example.com',
            'code' => '112233',
            'password' => 'BrandNewPassword123!',
            'password_confirmation' => 'BrandNewPassword123!',
        ]);

        $resetResponse->assertStatus(200);

        $user->refresh();
        $this->assertTrue(Hash::check('BrandNewPassword123!', $user->password));

        // Test subsequent login with new password via /api/login
        $loginResponse = $this->postJson('/api/login', [
            'email' => 'standard@example.com',
            'password' => 'BrandNewPassword123!',
        ]);

        $loginResponse->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'message' => 'Login successful.',
            ])
            ->assertJsonStructure([
                'data' => ['user', 'token'],
            ]);
    }

    public function test_password_reset_rejects_invalid_otp_code_and_does_not_change_password(): void
    {
        $user = User::factory()->create([
            'email' => 'secureuser@example.com',
            'password' => Hash::make('OriginalPassword123!'),
            'firebase_uid' => 'uid-789',
        ]);

        OtpCode::create([
            'email' => 'secureuser@example.com',
            'code_hash' => Hash::make('123456'),
            'purpose' => OtpService::PURPOSE_PASSWORD_RESET,
            'expires_at' => now()->addMinutes(5),
            'verified_at' => now(),
            'updated_at' => now(),
            'attempts' => 1,
        ]);

        // Wrong code passed in reset request
        $response = $this->postJson('/api/auth/reset-password', [
            'email' => 'secureuser@example.com',
            'code' => '999999',
            'password' => 'AttemptedNewPassword123!',
            'password_confirmation' => 'AttemptedNewPassword123!',
        ]);

        $response->assertStatus(400)
            ->assertJson([
                'success' => false,
                'message' => 'The provided verification code is invalid.',
            ]);

        $user->refresh();
        $this->assertTrue(Hash::check('OriginalPassword123!', $user->password));
    }

    public function test_password_reset_rejects_expired_otp(): void
    {
        $user = User::factory()->create([
            'email' => 'expired@example.com',
            'password' => Hash::make('OriginalPassword123!'),
            'firebase_uid' => 'uid-expired',
        ]);

        OtpCode::create([
            'email' => 'expired@example.com',
            'code_hash' => Hash::make('123456'),
            'purpose' => OtpService::PURPOSE_PASSWORD_RESET,
            'expires_at' => now()->subMinute(), // Expired
            'verified_at' => now()->subMinutes(2),
            'updated_at' => now()->subMinutes(2),
            'attempts' => 1,
        ]);

        $response = $this->postJson('/api/auth/reset-password', [
            'email' => 'expired@example.com',
            'code' => '123456',
            'password' => 'NewPass123456!',
            'password_confirmation' => 'NewPass123456!',
        ]);

        $response->assertStatus(400)
            ->assertJson([
                'success' => false,
                'message' => 'The verification code has expired. Please request a new code.',
            ]);

        $user->refresh();
        $this->assertTrue(Hash::check('OriginalPassword123!', $user->password));
    }

    public function test_otp_cannot_be_reused_after_successful_reset(): void
    {
        $user = User::factory()->create([
            'email' => 'singleuse@example.com',
            'password' => Hash::make('FirstPass123!'),
            'firebase_uid' => 'uid-single-use',
        ]);

        OtpCode::create([
            'email' => 'singleuse@example.com',
            'code_hash' => Hash::make('654321'),
            'purpose' => OtpService::PURPOSE_PASSWORD_RESET,
            'expires_at' => now()->addMinutes(5),
            'verified_at' => now(),
            'updated_at' => now(),
            'attempts' => 1,
        ]);

        Http::fake([
            'https://oauth2.googleapis.com/token' => Http::response(['access_token' => 'mock-token'], 200),
            'https://identitytoolkit.googleapis.com/*' => Http::response([], 200),
        ]);

        // First reset succeeds
        $firstResponse = $this->postJson('/api/auth/reset-password', [
            'email' => 'singleuse@example.com',
            'code' => '654321',
            'password' => 'SecondPass123!',
            'password_confirmation' => 'SecondPass123!',
        ]);
        $firstResponse->assertStatus(200);

        // Second reset with the same code fails because OTP was deleted
        $secondResponse = $this->postJson('/api/auth/reset-password', [
            'email' => 'singleuse@example.com',
            'code' => '654321',
            'password' => 'ThirdPass123!',
            'password_confirmation' => 'ThirdPass123!',
        ]);
        $secondResponse->assertStatus(400)
            ->assertJson([
                'success' => false,
                'message' => 'Please verify your OTP code first before resetting password.',
            ]);
    }

    public function test_failed_firebase_credential_update_rolls_back_laravel_password_change(): void
    {
        $user = User::factory()->create([
            'email' => 'failurecase@example.com',
            'password' => Hash::make('InitialPassword123!'),
            'firebase_uid' => 'uid-fail',
        ]);

        $otp = OtpCode::create([
            'email' => 'failurecase@example.com',
            'code_hash' => Hash::make('778899'),
            'purpose' => OtpService::PURPOSE_PASSWORD_RESET,
            'expires_at' => now()->addMinutes(5),
            'verified_at' => now(),
            'updated_at' => now(),
            'attempts' => 1,
        ]);

        // Simulate Firebase outage / API error
        Http::fake([
            'https://oauth2.googleapis.com/token' => Http::response(['access_token' => 'mock-token'], 200),
            'https://identitytoolkit.googleapis.com/*' => Http::response([
                'error' => ['message' => 'INTERNAL_ERROR'],
            ], 500),
        ]);

        $response = $this->postJson('/api/auth/reset-password', [
            'email' => 'failurecase@example.com',
            'code' => '778899',
            'password' => 'FailedNewPassword123!',
            'password_confirmation' => 'FailedNewPassword123!',
        ]);

        $response->assertStatus(500)
            ->assertJson([
                'success' => false,
                'message' => 'Unable to update authentication credentials. Please try again later.',
            ]);

        // Verify password was NOT changed in Laravel database
        $user->refresh();
        $this->assertTrue(Hash::check('InitialPassword123!', $user->password));

        // Verify OTP was NOT deleted so user can retry
        $this->assertDatabaseHas('otp_codes', ['id' => $otp->id]);
    }

    public function test_reset_password_endpoint_enforces_rate_limiting(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/auth/reset-password', [
                'email' => 'rate-limit@example.com',
                'code' => '123456',
                'password' => 'Password123!',
                'password_confirmation' => 'Password123!',
            ]);
        }

        // 6th attempt should be blocked by throttle:5,1 middleware
        $response = $this->postJson('/api/auth/reset-password', [
            'email' => 'rate-limit@example.com',
            'code' => '123456',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $response->assertStatus(429);
    }
}

