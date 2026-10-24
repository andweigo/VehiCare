<?php

namespace Tests\Feature;

use App\Models\OtpCode;
use App\Models\User;
use App\Models\UserConsent;
use App\Services\OtpService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class LegalConsentAndSessionTest extends TestCase
{
    use RefreshDatabase;

    private function registrationPayload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Jane Doe',
            'email' => 'jane@example.com',
            'password' => 'SecurePass123!',
            'password_confirmation' => 'SecurePass123!',
            'accepted_terms' => true,
            'terms_version' => config('legal.terms_version'),
            'privacy_version' => config('legal.privacy_version'),
        ], $overrides);
    }

    public function test_registration_requires_explicit_agreement(): void
    {
        Mail::fake();

        $payload = $this->registrationPayload();
        unset($payload['accepted_terms']);

        $this->postJson('/api/register', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['accepted_terms']);

        $this->postJson('/api/register', $this->registrationPayload(['accepted_terms' => false]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['accepted_terms']);

        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('user_consents', 0);
    }

    public function test_registration_rejects_unknown_policy_versions(): void
    {
        Mail::fake();

        $this->postJson('/api/register', $this->registrationPayload(['terms_version' => '0.0-never-shown']))
            ->assertStatus(409)
            ->assertJson(['code' => 'policy_version_mismatch']);

        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('user_consents', 0);
    }

    public function test_registration_records_versions_and_timestamp_without_secrets(): void
    {
        Mail::fake();

        $this->postJson('/api/register', $this->registrationPayload())
            ->assertStatus(201)
            ->assertJsonPath('data.requires_otp', true)
            ->assertJsonPath('data.token', null);

        $user = User::where('email', 'jane@example.com')->firstOrFail();
        $this->assertNull($user->email_verified_at, 'Account must stay unverified until OTP succeeds.');

        $terms = UserConsent::where('user_id', $user->id)->where('document_type', 'terms')->firstOrFail();
        $privacy = UserConsent::where('user_id', $user->id)->where('document_type', 'privacy')->firstOrFail();

        $this->assertSame(config('legal.terms_version'), $terms->document_version);
        $this->assertSame(config('legal.privacy_version'), $privacy->document_version);
        $this->assertNotNull($terms->accepted_at);
        $this->assertSame('registration', $terms->source);

        $columns = \Illuminate\Support\Facades\Schema::getColumnListing('user_consents');
        foreach (['code', 'code_hash', 'password', 'token'] as $forbidden) {
            $this->assertNotContains($forbidden, $columns);
        }
    }

    public function test_repeated_registration_submission_does_not_duplicate_account_or_consent(): void
    {
        Mail::fake();

        $this->postJson('/api/register', $this->registrationPayload())->assertStatus(201);

        // Interrupted flow: user resubmits the same registration (same password).
        $second = $this->postJson('/api/register', $this->registrationPayload());
        $second->assertStatus(200)->assertJsonPath('data.requires_otp', true);

        $this->assertSame(1, User::where('email', 'jane@example.com')->count());
        $this->assertSame(2, UserConsent::count(), 'One row per document, never duplicated.');
    }

    public function test_registration_cannot_take_over_existing_unverified_account_with_other_password(): void
    {
        Mail::fake();

        $this->postJson('/api/register', $this->registrationPayload())->assertStatus(201);

        $this->postJson('/api/register', $this->registrationPayload([
            'password' => 'AnotherPass999!',
            'password_confirmation' => 'AnotherPass999!',
        ]))->assertStatus(422)->assertJsonValidationErrors(['email']);
    }

    public function test_verified_account_cannot_be_re_registered(): void
    {
        Mail::fake();

        User::factory()->create([
            'email' => 'jane@example.com',
            'password' => Hash::make('SecurePass123!'),
            'email_verified_at' => now(),
        ]);

        $this->postJson('/api/register', $this->registrationPayload())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_unverified_registered_account_cannot_login_for_a_token_and_gets_new_otp(): void
    {
        Mail::fake();

        $this->postJson('/api/register', $this->registrationPayload())->assertStatus(201);

        // Skip the resend cooldown so a fresh code can be issued.
        OtpCode::query()->update(['created_at' => now()->subMinutes(5)]);

        $this->postJson('/api/login', [
            'email' => 'jane@example.com',
            'password' => 'SecurePass123!',
        ])
            ->assertStatus(403)
            ->assertJsonPath('code', 'email_not_verified')
            ->assertJsonPath('data.requires_otp', true)
            ->assertJsonMissingPath('data.token');

        $this->assertSame(0, \Laravel\Sanctum\PersonalAccessToken::count());
    }

    public function test_reusing_a_verified_code_requires_the_same_code(): void
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

        $this->postJson('/api/auth/verify-otp', [
            'email' => 'jane@example.com',
            'purpose' => 'registration',
            'code' => '654321',
        ])->assertStatus(200)->assertJsonPath('success', true);

        // Anyone replaying the endpoint with a wrong code must not succeed.
        $this->postJson('/api/auth/verify-otp', [
            'email' => 'jane@example.com',
            'purpose' => 'registration',
            'code' => '111111',
        ])->assertStatus(400)->assertJsonPath('success', false);

        // The legitimate client retrying with the same code still succeeds and
        // receives a token (lost-response recovery).
        $retry = $this->postJson('/api/auth/verify-otp', [
            'email' => 'jane@example.com',
            'purpose' => 'registration',
            'code' => '654321',
        ])->assertStatus(200);

        $this->assertNotNull($retry->json('token'));
        $this->assertNotNull($user->fresh()->email_verified_at);
    }

    public function test_consent_status_and_reacceptance_flow(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $this->actingAs($user, 'sanctum');

        $this->getJson('/api/user/consents/status')
            ->assertOk()
            ->assertJsonPath('data.accepted_current_versions', false);

        // Mismatched versions are refused (user was shown different text).
        $this->postJson('/api/user/consents', [
            'accepted' => true,
            'terms_version' => 'stale',
            'privacy_version' => config('legal.privacy_version'),
        ])->assertStatus(409)->assertJson(['code' => 'policy_version_mismatch']);

        $payload = [
            'accepted' => true,
            'terms_version' => config('legal.terms_version'),
            'privacy_version' => config('legal.privacy_version'),
        ];

        $this->postJson('/api/user/consents', $payload)->assertOk();
        $this->postJson('/api/user/consents', $payload)->assertOk(); // idempotent

        $this->assertSame(2, UserConsent::where('user_id', $user->id)->count());
        $this->getJson('/api/user/consents/status')
            ->assertOk()
            ->assertJsonPath('data.accepted_current_versions', true);

        // A material policy change requires renewed acceptance.
        config(['legal.privacy_version' => '2.0']);
        $this->getJson('/api/user/consents/status')
            ->assertJsonPath('data.accepted_current_versions', false);
    }

    public function test_logout_revokes_the_token_server_side(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
            'password' => Hash::make('Secret123!'),
        ]);

        $token = $user->createToken('vehicare-mobile')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/logout')
            ->assertOk();

        $this->assertSame(0, $user->tokens()->count());

        // Fresh application instance so Sanctum cannot reuse a cached guard user.
        $this->app['auth']->forgetGuards();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/user/me')
            ->assertStatus(401);
    }

    public function test_vehicle_and_profile_endpoints_require_authentication(): void
    {
        $this->getJson('/api/my-vehicles')->assertStatus(401);
        $this->getJson('/api/user/me')->assertStatus(401);
        $this->postJson('/api/vehicles', [])->assertStatus(401);
    }

    private function seedVehicleCatalog(): array
    {
        $type = \App\Models\VehicleType::create(['name' => 'Motorcycle']);
        $brand = \App\Models\VehicleBrand::create(['vehicle_type_id' => $type->id, 'name' => 'Yamaha']);
        $model = \App\Models\VehicleModel::create(['vehicle_brand_id' => $brand->id, 'name' => 'Mio']);
        $year = \App\Models\VehicleYear::create(['vehicle_model_id' => $model->id, 'year' => 2023]);

        return [
            'vehicle_type_id' => $type->id,
            'vehicle_brand_id' => $brand->id,
            'vehicle_model_id' => $model->id,
            'vehicle_year_id' => $year->id,
        ];
    }

    public function test_retrying_vehicle_setup_does_not_create_duplicates_or_trip_plan_limit(): void
    {
        $payload = $this->seedVehicleCatalog();
        $user = User::factory()->create(['email_verified_at' => now()]);
        \Laravel\Sanctum\Sanctum::actingAs($user);

        $first = $this->postJson('/api/vehicles', $payload)->assertStatus(201);
        // Same request again (lost response / double tap / back-navigation).
        $second = $this->postJson('/api/vehicles', $payload);

        $second->assertSuccessful();
        $this->assertNotNull($first->json('data.id'));
        $this->assertSame($first->json('data.id'), $second->json('data.id'));
        $this->assertSame(1, $user->vehicles()->count());
    }

    public function test_one_account_cannot_read_or_modify_another_accounts_vehicle(): void
    {
        $payload = $this->seedVehicleCatalog();
        $owner = User::factory()->create(['email_verified_at' => now()]);
        $other = User::factory()->create(['email_verified_at' => now()]);

        $vehicle = $owner->vehicles()->create($payload);

        \Laravel\Sanctum\Sanctum::actingAs($other);

        $this->getJson('/api/vehicles/' . $vehicle->id)->assertStatus(404);
        $this->deleteJson('/api/vehicles/' . $vehicle->id)->assertStatus(404);

        $mine = $this->getJson('/api/my-vehicles')->assertOk();
        $this->assertStringNotContainsString((string) $vehicle->id . '"', json_encode($mine->json('data') ?? []) . '"x');
        $this->assertSame(1, $owner->vehicles()->count());
    }
}
