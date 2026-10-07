<?php

namespace App\Services;

use App\Mail\VerificationCodeMail;
use App\Models\OtpCode;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class OtpService
{
    public const PURPOSE_REGISTRATION = 'registration';
    public const PURPOSE_PASSWORD_RESET = 'password_reset';

    /**
     * Generate and dispatch a 6-digit OTP code to specified email.
     */
    public function generateOtp(string $email, string $purpose = self::PURPOSE_REGISTRATION): array
    {
        $normalizedEmail = strtolower(trim($email));

        if (! in_array($purpose, [self::PURPOSE_REGISTRATION, self::PURPOSE_PASSWORD_RESET], true)) {
            return [
                'success' => false,
                'message' => 'Invalid OTP verification purpose.',
            ];
        }

        // Check 60-second resend cooldown
        $latestOtp = OtpCode::where('email', $normalizedEmail)
            ->where('purpose', $purpose)
            ->whereNull('verified_at')
            ->orderByDesc('id')
            ->first();

        if ($latestOtp && $latestOtp->created_at) {
            $secondsSinceCreation = now()->diffInSeconds($latestOtp->created_at);
            if ($secondsSinceCreation < 60) {
                $cooldownRemaining = 60 - $secondsSinceCreation;
                return [
                    'success' => false,
                    'message' => "Please wait {$cooldownRemaining} seconds before requesting a new code.",
                    'cooldown_seconds' => $cooldownRemaining,
                ];
            }
        }

        // Invalidate previous unverified OTP codes for email + purpose
        OtpCode::where('email', $normalizedEmail)
            ->where('purpose', $purpose)
            ->whereNull('verified_at')
            ->delete();

        // Generate 6-digit numeric OTP
        $rawCode = (string) random_int(100000, 999999);
        $codeHash = Hash::make($rawCode);
        $expiresAt = now()->addMinutes(5);

        OtpCode::create([
            'email' => $normalizedEmail,
            'code_hash' => $codeHash,
            'purpose' => $purpose,
            'expires_at' => $expiresAt,
            'attempts' => 0,
            'verified_at' => null,
        ]);

        try {
            Mail::to($normalizedEmail)->send(new VerificationCodeMail($rawCode, $purpose));

            Log::info('[OtpService] Sent OTP email successfully', [
                'email' => $normalizedEmail,
                'purpose' => $purpose,
            ]);

            return [
                'success' => true,
                'message' => 'Verification code sent successfully.',
                'cooldown_seconds' => 60,
            ];
        } catch (\Throwable $e) {
            Log::error('[OtpService] Failed to send OTP email', [
                'email' => $normalizedEmail,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'message' => 'Failed to send verification email. Please try again later.',
            ];
        }
    }

    /**
     * Verify an OTP code.
     */
    public function verifyOtp(string $email, string $purpose, string $code): array
    {
        $normalizedEmail = strtolower(trim($email));
        $submittedCode = trim((string) $code);

        $otpRecord = OtpCode::where('email', $normalizedEmail)
            ->where('purpose', $purpose)
            ->orderByDesc('id')
            ->first();

        if (! $otpRecord) {
            return [
                'success' => false,
                'message' => 'No active verification code found. Please request a new code.',
            ];
        }

        // Handle idempotent verification call if code was already verified recently (within 15 mins)
        if ($otpRecord->isVerified()) {
            if ($otpRecord->updated_at && $otpRecord->updated_at->gt(now()->subMinutes(15))) {
                return [
                    'success' => true,
                    'message' => 'Verification code verified successfully.',
                ];
            }

            return [
                'success' => false,
                'message' => 'This verification code has already been used. Please request a new code.',
            ];
        }

        if ($otpRecord->isExpired()) {
            return [
                'success' => false,
                'message' => 'The verification code has expired. Please request a new code.',
            ];
        }

        if ($otpRecord->attempts >= 5) {
            return [
                'success' => false,
                'message' => 'Maximum verification attempts reached. Please request a new code.',
            ];
        }

        // Increment attempts count
        $otpRecord->increment('attempts');

        // Check OTP Hash match
        if (! Hash::check($submittedCode, $otpRecord->code_hash)) {
            $remaining = 5 - $otpRecord->attempts;
            $attemptsNotice = $remaining > 0 ? " ({$remaining} attempts remaining)" : '';
            return [
                'success' => false,
                'message' => "The verification code is incorrect.{$attemptsNotice}",
            ];
        }

        // Mark OTP as verified
        $otpRecord->update([
            'verified_at' => now(),
        ]);

        // If registration verification, mark user as verified in DB
        if ($purpose === self::PURPOSE_REGISTRATION) {
            $user = User::where('email', $normalizedEmail)->first();
            if ($user && ! $user->email_verified_at) {
                $user->email_verified_at = now();
                $user->save();
            }
        }

        return [
            'success' => true,
            'message' => 'Verification code verified successfully.',
        ];
    }

    /**
     * Resend an OTP code with cooldown enforcement.
     */
    public function resendOtp(string $email, string $purpose): array
    {
        return $this->generateOtp($email, $purpose);
    }
}
