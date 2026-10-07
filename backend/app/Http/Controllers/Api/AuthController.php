<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Register a new user.
     */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
            ],

            'email' => [
                'required',
                'email',
                'max:255',
                'unique:users,email',
            ],

            'password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
            ],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => User::ROLE_USER,
            'subscription_plan' => User::SUBSCRIPTION_FREE,
            'vehicle_limit' => User::VEHICLE_LIMIT_FREE,
            'is_active' => true,
        ]);

        $token = $user->createToken(
            'vehicare-mobile'
        )->plainTextToken;

        return response()->json([
            'status' => 'success',
            'message' => 'Account created successfully.',
            'data' => [
                'user' => $user,
                'token' => $token,
            ],
        ], 201);
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

        $user = User::where('firebase_uid', $firebaseUid)
            ->orWhere('email', $resolvedEmail)
            ->first();

        if ($user) {
            throw ValidationException::withMessages([
                'id_token' => ['This Google account is already registered. Please sign in instead.'],
            ]);
        }

        $user = User::create([
            'name' => $name,
            'email' => $resolvedEmail,
            'password' => Hash::make(Str::random(24)),
            'firebase_uid' => $firebaseUid,
            'avatar' => $avatar,
            'role' => User::ROLE_USER,
            'subscription_plan' => User::SUBSCRIPTION_FREE,
            'vehicle_limit' => User::VEHICLE_LIMIT_FREE,
            'is_active' => true,
        ]);

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
            $user->phone_number = $validated['phone_number'];
        }

        $user->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Profile updated successfully.',
            'data' => ['user' => $user],
        ]);
    }

    private function verifyFirebaseIdToken(string $idToken): array
    {
        $apiKey = env('FIREBASE_WEB_API_KEY')
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