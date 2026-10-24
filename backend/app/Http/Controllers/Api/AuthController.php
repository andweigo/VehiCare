<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\FirebaseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Register a new user.
     */
    public function register(Request $request): JsonResponse
    {
        /*
         * Retry of an interrupted registration: the account exists but its
         * email was never verified (OTP not completed). Allow the same person
         * (proven by the password) to resume instead of failing with
         * "email already taken" or creating a duplicate account.
         */
        $existingUnverified = User::where('email', strtolower(trim((string) $request->input('email'))))
            ->whereNull('email_verified_at')
            ->first();

        $resumingUnverified = $existingUnverified
            && Hash::check((string) $request->input('password'), $existingUnverified->password);

        $emailRules = ['required', 'email', 'max:255'];
        if (! $resumingUnverified) {
            $emailRules[] = 'unique:users,email';
        }

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'min:2',
                'max:100',
                'regex:/^[\p{L}][\p{L}\s.\'\-]+$/u',
            ],

            'email' => $emailRules,

            'password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
                'regex:/[A-Z]/',
                'regex:/[a-z]/',
                'regex:/[0-9]/',
                'regex:/[^A-Za-z0-9]/',
            ],

            'firebase_uid' => [
                'nullable',
                'string',
                'max:191',
            ],

            // Explicit agreement to the Terms and acknowledgement of the Privacy
            // Policy. Required to create an account; never inferred.
            'accepted_terms' => ['required', 'accepted'],
            'terms_version' => ['required', 'string', 'max:32'],
            'privacy_version' => ['required', 'string', 'max:32'],
        ], [
            'name.required' => 'Please enter your full name.',
            'name.min' => 'Name must be at least 2 characters long.',
            'name.max' => 'Name cannot exceed 100 characters.',
            'name.regex' => 'Name can only contain letters, spaces, hyphens, apostrophes, and periods, and must start with a letter.',
            'accepted_terms.required' => 'You must agree to the Terms and Conditions and acknowledge the Privacy Policy to create an account.',
            'accepted_terms.accepted' => 'You must agree to the Terms and Conditions and acknowledge the Privacy Policy to create an account.',
        ]);

        if (
            $validated['terms_version'] !== (string) config('legal.terms_version')
            || $validated['privacy_version'] !== (string) config('legal.privacy_version')
        ) {
            return response()->json([
                'status' => 'error',
                'code' => 'policy_version_mismatch',
                'message' => 'The Terms and Privacy Policy have been updated. Please review the latest versions and try again.',
                'data' => [
                    'terms_version' => (string) config('legal.terms_version'),
                    'privacy_version' => (string) config('legal.privacy_version'),
                ],
            ], 409);
        }

        $cleanName = trim((string) preg_replace('/\s+/', ' ', $validated['name']));

        if ($resumingUnverified) {
            $user = $existingUnverified;
            $user->name = $cleanName;
            if (! empty($validated['firebase_uid'])) {
                $user->firebase_uid = $validated['firebase_uid'];
            }
            $user->save();
        } else {
            $user = User::create([
                'name' => $cleanName,
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'firebase_uid' => $validated['firebase_uid'] ?? null,
                'role' => User::ROLE_USER,
                'subscription_plan' => User::SUBSCRIPTION_FREE,
                'vehicle_limit' => User::VEHICLE_LIMIT_FREE,
                'is_active' => true,
                'email_verified_at' => null,
            ]);
        }

        /** @var \App\Services\OtpService $otpService */
        $otpService = app(\App\Services\OtpService::class);
        $otpResult = $otpService->generateOtp($user->email, \App\Services\OtpService::PURPOSE_REGISTRATION);

        // A resumed registration that is still inside the resend cooldown
        // already has a valid code in the user's inbox: not a failure.
        $cooldownOnly = $resumingUnverified && isset($otpResult['cooldown_seconds']);

        if (! ($otpResult['success'] ?? false) && ! $cooldownOnly) {
            Log::warning('[AuthController] Failed to dispatch registration OTP email', [
                'user_id' => $user->id,
                'resumed' => $resumingUnverified,
            ]);

            // Only roll back accounts created by THIS request.
            if (! $resumingUnverified) {
                $user->delete();
            }

            return response()->json([
                'status' => 'error',
                'message' => $otpResult['message'] ?? 'Failed to send verification email. Please try again.',
            ], 400);
        }

        // Idempotent: repeated submissions never create duplicate consent rows.
        // The account stays unverified until the OTP is confirmed.
        \App\Models\UserConsent::recordCurrentVersions($user, \App\Models\UserConsent::SOURCE_REGISTRATION);

        return response()->json([
            'status' => 'success',
            'message' => 'Account created successfully. A 6-digit verification code has been sent to your email.',
            'data' => [
                'user' => $user,
                'requires_otp' => true,
                'email' => $user->email,
                'cooldown_seconds' => $otpResult['cooldown_seconds'] ?? 60,
                'expires_in_seconds' => $otpResult['expires_in_seconds'] ?? 600,
                'token' => null,
            ],
        ], $resumingUnverified ? 200 : 201);
    }

    /**
     * Login an existing user.
     */
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => [
                'required',
                'email',
            ],

            'password' => [
                'required',
                'string',
            ],
        ]);

        $user = User::where(
            'email',
            $validated['email']
        )->first();

        if (
            !$user ||
            !Hash::check($validated['password'], $user->password) ||
            ! $user->is_active
        ) {
            throw ValidationException::withMessages([
                'email' => [
                    'The provided credentials are incorrect or the account is disabled.',
                ],
            ]);
        }

        // Email verification is owned by the OTP service. An account created
        // through the OTP registration flow whose email was never verified
        // (it still has an unverified registration code on file) must not
        // receive an API token: send a fresh code and tell the client to
        // continue at OTP verification. Legacy accounts that pre-date the OTP
        // flow have no such record and keep logging in normally.
        $awaitingRegistrationOtp = $user->role === User::ROLE_USER
            && ! $user->email_verified_at
            && \App\Models\OtpCode::where('email', strtolower($user->email))
                ->where('purpose', \App\Services\OtpService::PURPOSE_REGISTRATION)
                ->whereNull('verified_at')
                ->exists();

        if ($awaitingRegistrationOtp) {
            /** @var \App\Services\OtpService $otpService */
            $otpService = app(\App\Services\OtpService::class);
            $otpResult = $otpService->generateOtp($user->email, \App\Services\OtpService::PURPOSE_REGISTRATION);

            return response()->json([
                'status' => 'error',
                'code' => 'email_not_verified',
                'message' => 'Please verify your email address to continue. We sent you a verification code.',
                'data' => [
                    'requires_otp' => true,
                    'email' => $user->email,
                    'cooldown_seconds' => $otpResult['cooldown_seconds'] ?? 60,
                    'expires_in_seconds' => $otpResult['expires_in_seconds'] ?? 600,
                ],
            ], 403);
        }

        $token = $user->createToken(
            'vehicare-mobile'
        )->plainTextToken;

        return response()->json([
            'status' => 'success',
            'message' => 'Login successful.',
            'data' => [
                'user' => $user,
                'token' => $token,
            ],
        ]);
    }

    /**
     * Handle Google login / create a Google user placeholder.
     */
    public function googleLogin(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'id_token' => ['required', 'string'],
        ]);

        $idToken = $validated['id_token'];

        $firebaseAccount = $this->verifyFirebaseIdToken($idToken);
        $firebaseUid = $firebaseAccount['localId'] ?? null;
        $email = $firebaseAccount['email'] ?? null;
        $name = $firebaseAccount['displayName'] ?? 'Google User';
        $avatar = $firebaseAccount['photoUrl'] ?? null;
        $emailVerified = (bool) ($firebaseAccount['emailVerified'] ?? false);

        if (!$firebaseUid) {
            throw ValidationException::withMessages([
                'id_token' => ['The provided Firebase ID token could not be verified.'],
            ]);
        }

        if (!$emailVerified && $email) {
            throw ValidationException::withMessages([
                'id_token' => ['Google account email must be verified.'],
            ]);
        }

        $resolvedEmail = $email ?: "{$firebaseUid}@vehicare.local";

        Log::info('Google auth verification', [
            'uid_present' => !empty($firebaseUid),
            'email_present' => !empty($resolvedEmail),
            'email_verified' => $emailVerified,
        ]);

        $user = User::where('firebase_uid', $firebaseUid)
            ->orWhere('email', $resolvedEmail)
            ->first();

        if (!$user) {
            throw ValidationException::withMessages([
                'id_token' => ['No VehiCare account is linked to this Google account. Please create an account first.'],
            ]);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'id_token' => ['This account has been disabled.'],
            ]);
        }

        $user->firebase_uid = $user->firebase_uid ?? $firebaseUid;
        if (Schema::hasColumn('users', 'auth_provider')) {
            $user->auth_provider = 'google';
        }
        $user->avatar = $avatar ?? $user->avatar;
        $user->name = $user->name ?: $name;
        $user->save();

        $token = $user->createToken('vehicare-mobile')->plainTextToken;

        return response()->json([
            'status' => 'success',
            'message' => 'Google login successful.',
            'data' => [
                'user' => $user,
                'token' => $token,
            ],
        ]);
    }

    public function googleRegister(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'id_token' => ['required', 'string'],
            'accepted_terms' => ['required', 'accepted'],
            'terms_version' => ['required', 'string', 'max:32'],
            'privacy_version' => ['required', 'string', 'max:32'],
        ], [
            'accepted_terms.required' => 'You must agree to the Terms and Conditions and acknowledge the Privacy Policy to create an account.',
            'accepted_terms.accepted' => 'You must agree to the Terms and Conditions and acknowledge the Privacy Policy to create an account.',
        ]);

        if (
            $validated['terms_version'] !== (string) config('legal.terms_version')
            || $validated['privacy_version'] !== (string) config('legal.privacy_version')
        ) {
            return response()->json([
                'status' => 'error',
                'code' => 'policy_version_mismatch',
                'message' => 'The Terms and Privacy Policy have been updated. Please review the latest versions and try again.',
            ], 409);
        }

        $idToken = $validated['id_token'];

        $firebaseAccount = $this->verifyFirebaseIdToken($idToken);
        $firebaseUid = $firebaseAccount['localId'] ?? null;
        $email = $firebaseAccount['email'] ?? null;
        $name = $firebaseAccount['displayName'] ?? 'Google User';
        $avatar = $firebaseAccount['photoUrl'] ?? null;
        $emailVerified = (bool) ($firebaseAccount['emailVerified'] ?? false);

        if (!$firebaseUid) {
            throw ValidationException::withMessages([
                'id_token' => ['The provided Firebase ID token could not be verified.'],
            ]);
        }

        if (!$emailVerified && $email) {
            throw ValidationException::withMessages([
                'id_token' => ['Google account email must be verified.'],
            ]);
        }

        $resolvedEmail = $email ?: "{$firebaseUid}@vehicare.local";

        $user = User::where('firebase_uid', $firebaseUid)
            ->orWhere('email', $resolvedEmail)
            ->first();

        if ($user) {
            throw ValidationException::withMessages([
                'id_token' => ['This Google account is already registered. Please sign in instead.'],
            ]);
        }

        $googleUserAttributes = [
            'name' => $name,
            'email' => $resolvedEmail,
            'password' => Hash::make(Str::random(24)),
            'firebase_uid' => $firebaseUid,
            'avatar' => $avatar,
            'role' => User::ROLE_USER,
            'subscription_plan' => User::SUBSCRIPTION_FREE,
            'vehicle_limit' => User::VEHICLE_LIMIT_FREE,
            'is_active' => true,
            'email_verified_at' => $emailVerified ? now() : null,
        ];
        if (Schema::hasColumn('users', 'auth_provider')) {
            $googleUserAttributes['auth_provider'] = 'google';
        }
        $user = User::create($googleUserAttributes);

        \App\Models\UserConsent::recordCurrentVersions($user, \App\Models\UserConsent::SOURCE_REGISTRATION);

        $token = $user->createToken('vehicare-mobile')->plainTextToken;

        return response()->json([
            'status' => 'success',
            'message' => 'Google registration successful.',
            'data' => [
                'user' => $user,
                'token' => $token,
            ],
        ], 201);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'avatar' => ['sometimes', 'nullable', 'string', 'max:2048'],
            'phone_number' => ['sometimes', 'nullable', 'string', 'max:32'],
        ]);

        if (array_key_exists('name', $validated) && $validated['name'] !== null) {
            $user->name = $validated['name'];
        }

        if (array_key_exists('avatar', $validated)) {
            $user->avatar = $validated['avatar'];
        }

        if (array_key_exists('phone_number', $validated)) {
            $rawPhone = $validated['phone_number'];
            if ($rawPhone !== null && trim((string) $rawPhone) !== '') {
                $cleanedPhone = preg_replace('/[\s\-()]/', '', trim((string) $rawPhone));
                if (! preg_match('/^(09|\+639|639)\d{9}$/', $cleanedPhone)) {
                    throw ValidationException::withMessages([
                        'phone_number' => ['Please enter a valid Philippine mobile number (e.g., 09171234567 or +639171234567).'],
                    ]);
                }

                // Normalize 639XXXXXXXXX to +639XXXXXXXXX
                if (str_starts_with($cleanedPhone, '639')) {
                    $cleanedPhone = '+' . $cleanedPhone;
                }

                $user->phone_number = $cleanedPhone;
            } else {
                $user->phone_number = null;
            }
        }

        $user->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Profile updated successfully.',
            'data' => ['user' => $user],
        ]);
    }

    /** Set a password for a Google-linked account without requiring an old password. */
    public function setGooglePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
                'regex:/[A-Z]/',
                'regex:/[a-z]/',
                'regex:/[0-9]/',
                'regex:/[^A-Za-z0-9]/',
            ],
        ]);
        $user = $request->user();

        if ($user->auth_provider !== 'google') {
            return response()->json([
                'message' => 'This endpoint is only available for Google-linked accounts.',
            ], 403);
        }

        $firebaseResult = app(FirebaseService::class)->updateUserPassword($user, $validated['password']);
        if (! ($firebaseResult['success'] ?? false)) {
            Log::error('[AuthController] Failed to update Google-linked Firebase password', [
                'user_id' => $user->id,
                'error' => $firebaseResult['message'] ?? 'Unknown error',
            ]);
            return response()->json(['message' => 'Unable to update authentication credentials. Please try again later.'], 500);
        }

        $user->password = Hash::make($validated['password']);
        $user->save();

        return response()->json(['success' => true, 'message' => 'Password updated successfully.']);
    }

    private function verifyFirebaseIdToken(string $idToken): array
    {
        $apiKey = config('services.firebase.api_key')
            ?: env('FIREBASE_WEB_API_KEY')
            ?: env('FIREBASE_API_KEY')
            ?: env('GOOGLE_API_KEY');

        if (!$apiKey) {
            throw ValidationException::withMessages([
                'id_token' => ['Firebase server API key is not configured.'],
            ]);
        }

        $response = Http::post(
            "https://www.googleapis.com/identitytoolkit/v3/relyingparty/getAccountInfo?key={$apiKey}",
            [
                'idToken' => $idToken,
            ]
        );

        if (!$response->ok()) {
            throw ValidationException::withMessages([
                'id_token' => ['The provided Firebase ID token could not be verified.'],
            ]);
        }

        $payload = $response->json();
        $account = $payload['users'][0] ?? null;

        if (!$account) {
            throw ValidationException::withMessages([
                'id_token' => ['The provided Firebase ID token could not be verified.'],
            ]);
        }

        return $account;
    }

    /**
     * Get current user profile with subscription status evaluation.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user) {
            $user->checkSubscriptionStatus();
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'user' => $user,
            ],
        ]);
    }

    /**
     * Logout the current user.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()
            ->currentAccessToken()
            ?->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Logged out successfully.',
        ]);
    }
}
