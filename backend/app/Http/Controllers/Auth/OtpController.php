<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\OtpCode;
use App\Models\User;
use App\Services\OtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OtpController extends Controller
{
    protected OtpService $otpService;

    public function __construct(OtpService $otpService)
    {
        $this->otpService = $otpService;
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

            // Check if account is a Google-only account without password
            if ($user->firebase_uid && empty($user->password)) {
                return response()->json([
                    'success' => false,
                    'message' => 'This account is registered via Google Sign-In. Please sign in using your Google account.',
                ], 422);
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
            ->where('updated_at', '>=', now()->subMinutes(15))
            ->orderByDesc('id')
            ->first();

        if (! $verifiedOtp) {
            return response()->json([
                'success' => false,
                'message' => 'Please verify your OTP code first before resetting password.',
            ], 400);
        }

        // 1. Update Laravel database password
        $user->password = Hash::make($newPassword);
        $user->save();

        // 2. Update Firebase Authentication password if user is linked to Firebase
        if ($user->firebase_uid) {
            $apiKey = env('FIREBASE_WEB_API_KEY')
                ?: env('FIREBASE_API_KEY')
                ?: env('GOOGLE_API_KEY');

            if ($apiKey) {
                try {
                    $response = Http::post(
                        "https://identitytoolkit.googleapis.com/v1/accounts:update?key={$apiKey}",
                        [
                            'localId' => $user->firebase_uid,
                            'password' => $newPassword,
                            'returnSecureToken' => false,
                        ]
                    );

                    if ($response->ok()) {
                        Log::info('[OtpController] Firebase password updated successfully for user', ['email' => $email]);
                    } else {
                        Log::warn('[OtpController] Firebase password update warning:', ['response' => $response->json()]);
                    }
                } catch (\Throwable $e) {
                    Log::error('[OtpController] Exception updating Firebase password:', ['error' => $e->getMessage()]);
                }
            }
        }

        // Invalidate verified OTP so it cannot be reused
        $verifiedOtp->delete();

        return response()->json([
            'success' => true,
            'message' => 'Password reset successfully. You can now log in with your new password.',
        ]);
    }
}
