<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FirebaseService
{
    protected ?string $projectId;
    protected ?array $serviceAccount = null;
    protected bool $resolved = false;

    public function __construct()
    {
        $this->projectId = config('services.firebase.project_id', 'vehicare-62de4');
    }

    /**
     * Determine if Firebase Admin credentials are configured.
     */
    public function isConfigured(): bool
    {
        return ! empty($this->getServiceAccount());
    }

    /**
     * Set the service account credentials directly (useful for testing or overrides).
     */
    public function setServiceAccount(?array $serviceAccount): self
    {
        $this->serviceAccount = $serviceAccount;
        $this->resolved = true;

        return $this;
    }

    /**
     * Get the parsed Firebase service account credentials.
     */
    public function getServiceAccount(): ?array
    {
        if ($this->resolved) {
            return $this->serviceAccount;
        }

        $this->resolved = true;
        $this->serviceAccount = $this->resolveServiceAccount();

        return $this->serviceAccount;
    }

    /**
     * Resolve service account credentials from configuration or environment.
     */
    protected function resolveServiceAccount(): ?array
    {
        // 1. Check raw JSON string in config
        $json = config('services.firebase.service_account_json');
        if (! empty($json)) {
            $decoded = json_decode($json, true);
            if (is_array($decoded) && ! empty($decoded['private_key']) && ! empty($decoded['client_email'])) {
                return $decoded;
            }
        }

        // 2. Check base64 encoded JSON string
        $base64 = config('services.firebase.service_account_key');
        if (! empty($base64)) {
            $decoded = json_decode(base64_decode($base64), true);
            if (is_array($decoded) && ! empty($decoded['private_key']) && ! empty($decoded['client_email'])) {
                return $decoded;
            }
        }

        // 3. Check credentials file path
        $credentialsPath = config('services.firebase.credentials');
        if (! empty($credentialsPath) && file_exists($credentialsPath)) {
            $content = file_get_contents($credentialsPath);
            $decoded = json_decode($content, true);
            if (is_array($decoded) && ! empty($decoded['private_key']) && ! empty($decoded['client_email'])) {
                return $decoded;
            }
        }

        // 4. Check individual environment variables
        $clientEmail = env('FIREBASE_CLIENT_EMAIL');
        $privateKey = env('FIREBASE_PRIVATE_KEY');
        if (! empty($clientEmail) && ! empty($privateKey)) {
            // Handle literal escaped newlines if passed through environment variables
            $privateKey = str_replace('\\n', "\n", $privateKey);
            return [
                'client_email' => $clientEmail,
                'private_key' => $privateKey,
                'project_id' => $this->projectId,
            ];
        }

        return null;
    }

    /**
     * Obtain a valid Google OAuth2 access token using the Service Account JWT.
     */
    public function getAccessToken(): ?string
    {
        $cachedToken = Cache::get('firebase_admin_oauth_token');
        if ($cachedToken) {
            return $cachedToken;
        }

        $serviceAccount = $this->getServiceAccount();
        if (! $serviceAccount) {
            Log::error('[FirebaseService] Cannot obtain access token: Service account credentials not configured.');
            return null;
        }

        $clientEmail = $serviceAccount['client_email'] ?? null;
        $privateKey = $serviceAccount['private_key'] ?? null;

        if (! $clientEmail || ! $privateKey) {
            Log::error('[FirebaseService] Service account is missing client_email or private_key.');
            return null;
        }

        $now = time();
        $jwt = $this->createSignedJwtAssertion($clientEmail, $privateKey, $now);
        if (! $jwt) {
            Log::error('[FirebaseService] Failed to sign JWT with service account private key.');
            return null;
        }

        try {
            $response = Http::asForm()->timeout(10)->post('https://oauth2.googleapis.com/token', [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => $jwt,
            ]);

            if (! $response->ok()) {
                $dateHeader = $response->header('Date');
                $serverTime = $dateHeader ? strtotime($dateHeader) : false;

                if ($serverTime && abs($serverTime - $now) > 60) {
                    $retryJwt = $this->createSignedJwtAssertion($clientEmail, $privateKey, $serverTime);
                    if ($retryJwt) {
                        $response = Http::asForm()->timeout(10)->post('https://oauth2.googleapis.com/token', [
                            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                            'assertion' => $retryJwt,
                        ]);
                    }
                }
            }

            if (! $response->ok()) {
                Log::error('[FirebaseService] Failed to exchange JWT for OAuth2 token', [
                    'status' => $response->status(),
                    'error' => $response->body(),
                ]);
                return null;
            }

            $tokenData = $response->json();
            $accessToken = $tokenData['access_token'] ?? null;
            $expiresIn = (int) ($tokenData['expires_in'] ?? 3600);

            if ($accessToken) {
                Cache::put('firebase_admin_oauth_token', $accessToken, now()->addSeconds(max(60, $expiresIn - 300)));
                return $accessToken;
            }
        } catch (\Throwable $e) {
            Log::error('[FirebaseService] Exception while fetching OAuth2 token: ' . $e->getMessage());
        }

        return null;
    }

    private function createSignedJwtAssertion(string $clientEmail, string $privateKey, int $timestamp): ?string
    {
        $header = $this->base64UrlEncode(json_encode([
            'alg' => 'RS256',
            'typ' => 'JWT',
        ]));

        $claims = $this->base64UrlEncode(json_encode([
            'iss' => $clientEmail,
            'sub' => $clientEmail,
            'aud' => 'https://oauth2.googleapis.com/token',
            'iat' => $timestamp,
            'exp' => $timestamp + 3600,
            'scope' => 'https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/firebase',
        ]));

        $signatureInput = "{$header}.{$claims}";
        $signature = '';

        $success = openssl_sign($signatureInput, $signature, $privateKey, OPENSSL_ALGO_SHA256);
        if (! $success) {
            return null;
        }

        return "{$signatureInput}." . $this->base64UrlEncode($signature);
    }

    /**
     * Update user password in Firebase Authentication.
     * Works for both existing email/password users and Google-only users.
     * Preserves UID and Google account link.
     */
    public function updateUserPassword(User $user, string $newPassword): array
    {
        $token = $this->getAccessToken();
        if (! $token) {
            Log::warning('[FirebaseService] OAuth2 token unavailable; proceeding with local database password update.', [
                'user_id' => $user->id,
                'email' => $user->email,
            ]);
            return [
                'success' => true,
                'firebase_skipped' => true,
                'message' => 'Firebase Admin OAuth unavailable; local database password updated.',
            ];
        }

        $firebaseUid = $user->firebase_uid;

        // If user doesn't have firebase_uid stored, attempt to find by email
        if (empty($firebaseUid)) {
            $existingAccount = $this->lookupUserByEmail($user->email, $token);
            if ($existingAccount && ! empty($existingAccount['localId'])) {
                $firebaseUid = $existingAccount['localId'];
                $user->firebase_uid = $firebaseUid;
                $user->save();
            }
        }

        $projectId = $this->getProjectId();

        // If user exists in Firebase, update password via accounts:update
        if (! empty($firebaseUid)) {
            try {
                $response = Http::withToken($token)
                    ->timeout(10)
                    ->post("https://identitytoolkit.googleapis.com/v1/projects/{$projectId}/accounts:update", [
                        'localId' => $firebaseUid,
                        'password' => $newPassword,
                        'returnSecureToken' => false,
                    ]);

                if ($response->ok()) {
                    Log::info('[FirebaseService] Successfully updated Firebase password for user', [
                        'user_id' => $user->id,
                        'firebase_uid' => $firebaseUid,
                    ]);

                    return [
                        'success' => true,
                        'firebase_uid' => $firebaseUid,
                    ];
                }

                $errorData = $response->json();
                $fbErrorMsg = (string) ($errorData['error']['message'] ?? 'Unknown Firebase error');

                // If stored firebase_uid was not found in Firebase, fall back to email lookup / account creation
                if (! str_contains(strtoupper($fbErrorMsg), 'USER_NOT_FOUND')) {
                    Log::error('[FirebaseService] Firebase Admin accounts:update failed', [
                        'status' => $response->status(),
                        'error' => $fbErrorMsg,
                    ]);

                    return [
                        'success' => false,
                        'message' => 'Unable to update Firebase credentials: ' . $fbErrorMsg,
                    ];
                }
            } catch (\Throwable $e) {
                Log::error('[FirebaseService] Exception while calling Firebase accounts:update: ' . $e->getMessage());
                return [
                    'success' => false,
                    'message' => 'Exception while updating Firebase credentials.',
                ];
            }
        }

        // If user doesn't exist in Firebase yet, create the user with password
        try {
            $response = Http::withToken($token)
                ->timeout(10)
                ->post("https://identitytoolkit.googleapis.com/v1/projects/{$projectId}/accounts", [
                    'email' => $user->email,
                    'password' => $newPassword,
                    'emailVerified' => true,
                ]);

            if ($response->ok()) {
                $data = $response->json();
                $newUid = $data['localId'] ?? null;
                if ($newUid) {
                    $user->firebase_uid = $newUid;
                    $user->save();
                }

                Log::info('[FirebaseService] Created Firebase user with password for user', [
                    'user_id' => $user->id,
                    'firebase_uid' => $newUid,
                ]);

                return [
                    'success' => true,
                    'firebase_uid' => $newUid,
                ];
            }

            Log::error('[FirebaseService] Firebase accounts creation failed', [
                'status' => $response->status(),
                'error' => $response->body(),
            ]);

            return [
                'success' => false,
                'message' => 'Failed to create Firebase user account.',
            ];
        } catch (\Throwable $e) {
            Log::error('[FirebaseService] Exception while creating Firebase user: ' . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Exception while creating Firebase user.',
            ];
        }
    }

    /**
     * Lookup a user in Firebase Authentication by email.
     */
    public function lookupUserByEmail(string $email, ?string $token = null): ?array
    {
        $token = $token ?: $this->getAccessToken();
        if (! $token) {
            return null;
        }

        $projectId = $this->getProjectId();

        try {
            $response = Http::withToken($token)
                ->timeout(10)
                ->post("https://identitytoolkit.googleapis.com/v1/projects/{$projectId}/accounts:lookup", [
                    'email' => [$email],
                ]);

            if ($response->ok()) {
                $users = $response->json('users');
                if (! empty($users) && is_array($users)) {
                    return $users[0];
                }
            }
        } catch (\Throwable $e) {
            Log::error('[FirebaseService] Exception looking up user by email: ' . $e->getMessage());
        }

        return null;
    }

    /**
     * Lookup a user in Firebase Authentication by UID.
     */
    public function lookupUserByUid(string $uid, ?string $token = null): ?array
    {
        $token = $token ?: $this->getAccessToken();
        if (! $token) {
            return null;
        }

        $projectId = $this->getProjectId();

        try {
            $response = Http::withToken($token)
                ->timeout(10)
                ->post("https://identitytoolkit.googleapis.com/v1/projects/{$projectId}/accounts:lookup", [
                    'localId' => [$uid],
                ]);

            if ($response->ok()) {
                $users = $response->json('users');
                if (! empty($users) && is_array($users)) {
                    return $users[0];
                }
            }
        } catch (\Throwable $e) {
            Log::error('[FirebaseService] Exception looking up user by UID: ' . $e->getMessage());
        }

        return null;
    }

    /**
     * Get the Firebase project ID.
     */
    public function getProjectId(): string
    {
        $serviceAccount = $this->getServiceAccount();
        if (! empty($serviceAccount['project_id'])) {
            return $serviceAccount['project_id'];
        }

        return $this->projectId ?: 'vehicare-62de4';
    }

    /**
     * URL-safe Base64 encoding.
     */
    protected function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}
