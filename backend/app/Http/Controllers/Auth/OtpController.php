<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\OtpCode;
use App\Models\User;
use App\Services\FirebaseService;
use App\Services\OtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class OtpController extends Controller
{
    protected OtpService $otpService;
    protected FirebaseService $firebaseService;

    public function __construct(OtpService $otpService, FirebaseService $firebaseService)
    {
        $this->otpService = $otpService;
        $this->firebaseService = $firebaseService;
    }

    /**
     * Send an OTP code to specified email.
     */
    public function sendOtp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'purpose' => ['required', 'string', 'in:registration,password_reset'],
        ]);

        $email = strtolower(trim($validated['email']));
        $purpose = $validated['purpose'];

        if ($purpose === OtpService::PURPOSE_PASSWORD_RESET) {
            $user = User::where('email', $email)->first();

            if (! $user) {
                return response()->json([
                    'success' => false,
                    'message' => 'No account found with this email address.',
                ], 404);
            }
        }

        $result = $this->otpService->generateOtp($email, $purpose);

        $statusCode = $result['success'] ? 200 : 400;
        return response()->json($result, $statusCode);
    }

    /**
     * Verify submitted OTP code.
     */
    public function verifyOtp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'purpose' => ['required', 'string', 'in:registration,password_reset'],
            'code' => ['required', 'string', 'size:6'],
        ]);

        $result = $this->otpService->verifyOtp(
            $validated['email'],
            $validated['purpose'],
            $validated['code']
        );

        $statusCode = $result['success'] ? 200 : 400;
        return response()->json($result, $statusCode);
    }

    /**
     * Resend OTP code with cooldown enforcement.
     */
    public function resendOtp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'purpose' => ['required', 'string', 'in:registration,password_reset'],
        ]);

        $result = $this->otpService->resendOtp(
            $validated['email'],
            $validated['purpose']
        );

        $statusCode = $result['success'] ? 200 : 400;
        return response()->json($result, $statusCode);
    }

    /**
     * Reset user password after verified OTP.
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'code' => ['required', 'string', 'size:6'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $email = strtolower(trim($validated['email']));
        $code = trim($validated['code']);
        $newPassword = $validated['password'];

        $user = User::where('email', $email)->first();

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'No account found with this email address.',
            ], 404);
        }

        // Check for recent verified password_reset OTP for this email
        $verifiedOtp = OtpCode::where('email', $email)
            ->where('purpose', OtpService::PURPOSE_PASSWORD_RESET)
            ->whereNotNull('verified_at')
            ->orderByDesc('id')
            ->first();

        if (! $verifiedOtp) {
            $unverifiedOtp = OtpCode::where('email', $email)
                ->where('purpose', OtpService::PURPOSE_PASSWORD_RESET)
                ->whereNull('verified_at')
                ->orderByDesc('id')
                ->first();

            if ($unverifiedOtp && ! $unverifiedOtp->isExpired() && Hash::check($code, $unverifiedOtp->code_hash)) {
                $unverifiedOtp->update([
                    'verified_at' => now(),
                    'expires_at' => now()->addMinutes(15),
                ]);
                $verifiedOtp = $unverifiedOtp->fresh();
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Please verify your OTP code first before resetting password.',
                ], 400);
            }
        }

        if ($verifiedOtp->isExpired() || ($verifiedOtp->verified_at && $verifiedOtp->verified_at->lt(now()->subMinutes(15)))) {
            return response()->json([
                'success' => false,
                'message' => 'The verification code has expired. Please request a new code.',
            ], 400);
        }

        if (! Hash::check($code, $verifiedOtp->code_hash)) {
            return response()->json([
                'success' => false,
                'message' => 'The provided verification code is invalid.',
            ], 400);
        }

        // 1. Update Firebase Authentication credential first if FirebaseService is configured.
        // A verified password-reset OTP is sufficient proof of account ownership for
        // VehiCare's own password login. Do not block the reset when Firebase Admin
        // is temporarily unavailable; the local credential must still be updated.
        $firebaseSyncPending = false;
        if ($this->firebaseService->isConfigured()) {
            $firebaseResult = $this->firebaseService->updateUserPassword($user, $newPassword);
            if (! ($firebaseResult['success'] ?? false)) {
                Log::error('[OtpController] Failed to update Firebase password during reset', [
                    'user_id' => $user->id,
                    'error' => $firebaseResult['message'] ?? 'Unknown error',
                ]);
                $firebaseSyncPending = true;
            }
        } elseif ($user->firebase_uid) {
            Log::warning('[OtpController] Firebase service account credentials not configured. Firebase user password could not be updated.', [
                'user_id' => $user->id,
                'firebase_uid' => $user->firebase_uid,
            ]);
            $firebaseSyncPending = true;
        }

        // 2. Update Laravel database password
        $user->password = Hash::make($newPassword);
        $user->save();

        // 3. Invalidate verified OTP so it cannot be reused (single-use)
        $verifiedOtp->delete();

        return response()->json([
            'success' => true,
            'message' => 'Password reset successfully. You can now log in with your new password.',
            'firebase_sync_pending' => $firebaseSyncPending,
        ]);
    }
}
