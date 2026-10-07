<?php

namespace App\Services;

use App\Events\PaymentStatusUpdated;
use App\Models\Payment;
use App\Models\User;
use App\Notifications\PaymentApprovedNotification;
use App\Notifications\PaymentRejectedNotification;
use App\Notifications\PaymentSubmittedNotification;
use App\Notifications\RefundCompletedNotification;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class SubscriptionService
{
    /**
     * Evaluate and update subscription expiration if past.
     */
    public function evaluateSubscription(User $user): User
    {
        return $user->checkSubscriptionStatus();
    }

    /**
     * Submit a simulated payment attempt.
     */
    public function submitPayment(
        User $user,
        string $plan,
        string $billingCycle,
        string $paymentMethod = 'card',
        ?string $referenceNumber = null
    ): Payment {
        $normalizedPlan = strtolower(trim($plan));
        $normalizedCycle = strtolower(trim($billingCycle));
        $normalizedMethod = strtolower(trim($paymentMethod));

        if ($normalizedPlan !== User::SUBSCRIPTION_PREMIUM) {
            throw ValidationException::withMessages([
                'plan' => ['Only premium plan subscription is supported.'],
            ]);
        }

        if (! in_array($normalizedCycle, [User::SUBSCRIPTION_CYCLE_MONTHLY, User::SUBSCRIPTION_CYCLE_YEARLY], true)) {
            throw ValidationException::withMessages([
                'billing_cycle' => ['Invalid billing cycle. Choose monthly or yearly.'],
            ]);
        }

        // Restriction Check 1: User cannot submit payment if a previous payment is pending verification
        $pendingPayment = Payment::where('user_id', $user->id)
            ->where('status', Payment::STATUS_PENDING)
            ->first();

        if ($pendingPayment) {
            throw ValidationException::withMessages([
                'payment' => ["Your previous payment ({$pendingPayment->reference_number}) is currently awaiting verification. Please wait for review."],
            ]);
        }

        // Restriction Check 2: User cannot submit payment if a previous refund is currently processing
        $processingRefund = Payment::where('user_id', $user->id)
            ->where('status', Payment::STATUS_REJECTED)
            ->where('refund_status', Payment::REFUND_PROCESSING)
            ->first();

        if ($processingRefund) {
            throw ValidationException::withMessages([
                'payment' => ["Your previous payment refund ({$processingRefund->reference_number}) is currently in progress. Please wait until your refund is completed before submitting another payment."],
            ]);
        }

        $amount = Payment::getPriceForCycle($normalizedCycle);
        $generatedReference = $this->generateUniqueReference();
        $finalReference = $referenceNumber && trim($referenceNumber) !== ''
            ? trim($referenceNumber)
            : $generatedReference;

        $payment = DB::transaction(function () use ($user, $normalizedPlan, $normalizedCycle, $normalizedMethod, $amount, $finalReference) {
            $payment = Payment::create([
                'user_id' => $user->id,
                'plan' => $normalizedPlan,
                'billing_cycle' => $normalizedCycle,
                'amount' => $amount,
                'payment_method' => $normalizedMethod,
                'reference_number' => $finalReference,
                'status' => Payment::STATUS_PENDING,
                'refund_status' => Payment::REFUND_NOT_APPLICABLE,
                'submitted_at' => Carbon::now(),
            ]);

            $user->notify(new PaymentSubmittedNotification($payment));

            return $payment;
        });

        try {
            $state = $this->getSubscriptionState($user);
            event(new PaymentStatusUpdated($payment, $state));
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Broadcast PaymentStatusUpdated skipped: ' . $e->getMessage());
        }

        return $payment;
    }

    /**
     * Admin approves a pending payment and activates Premium.
     */
    public function approvePayment(Payment $payment, User $admin): Payment
    {
        if (! $payment->isPending()) {
            throw ValidationException::withMessages([
                'payment' => ["Cannot approve payment with status '{$payment->status}'."],
            ]);
        }

        $approvedPayment = DB::transaction(function () use ($payment, $admin) {
            $now = Carbon::now();
            $cycle = $payment->billing_cycle;

            if ($cycle === User::SUBSCRIPTION_CYCLE_MONTHLY) {
                $expiresAt = $now->copy()->addMonth();
            } else {
                $expiresAt = $now->copy()->addYear();
            }

            $payment->update([
                'status' => Payment::STATUS_APPROVED,
                'refund_status' => Payment::REFUND_NOT_APPLICABLE,
                'verified_at' => $now,
                'admin_id' => $admin->id,
            ]);

            $user = $payment->user;
            $user->update([
                'subscription_plan' => User::SUBSCRIPTION_PREMIUM,
                'subscription_status' => User::SUBSCRIPTION_STATUS_ACTIVE,
                'subscription_cycle' => $cycle,
                'subscription_started_at' => $now,
                'subscription_expires_at' => $expiresAt,
                'vehicle_limit' => User::VEHICLE_LIMIT_PREMIUM,
            ]);

            $user->notify(new PaymentApprovedNotification($payment));

            return $payment->fresh();
        });

        try {
            $state = $this->getSubscriptionState($approvedPayment->user);
            event(new PaymentStatusUpdated($approvedPayment, $state));
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Broadcast PaymentStatusUpdated skipped: ' . $e->getMessage());
        }

        return $approvedPayment;
    }

    /**
     * Admin rejects a pending payment and sets refund to processing.
     */
    public function rejectPayment(Payment $payment, User $admin, string $reason): Payment
    {
        if (! $payment->isPending()) {
            throw ValidationException::withMessages([
                'payment' => ["Cannot reject payment with status '{$payment->status}'."],
            ]);
        }

        if (trim($reason) === '') {
            throw ValidationException::withMessages([
                'rejection_reason' => ['A valid rejection reason is required.'],
            ]);
        }

        $rejectedPayment = DB::transaction(function () use ($payment, $admin, $reason) {
            $now = Carbon::now();

            $payment->update([
                'status' => Payment::STATUS_REJECTED,
                'rejection_reason' => trim($reason),
                'refund_status' => Payment::REFUND_PROCESSING,
                'refund_amount' => $payment->amount,
                'verified_at' => $now,
                'admin_id' => $admin->id,
            ]);

            $user = $payment->user;
            $user->notify(new PaymentRejectedNotification($payment));

            return $payment->fresh();
        });

        try {
            $state = $this->getSubscriptionState($rejectedPayment->user);
            event(new PaymentStatusUpdated($rejectedPayment, $state));
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Broadcast PaymentStatusUpdated skipped: ' . $e->getMessage());
        }

        return $rejectedPayment;
    }

    /**
     * Admin completes a simulated refund for a rejected payment.
     */
    public function completeRefund(Payment $payment, User $admin): Payment
    {
        if (! $payment->isRejected() || ! $payment->isRefundProcessing()) {
            throw ValidationException::withMessages([
                'payment' => ['Refund can only be completed for rejected payments that are currently processing.'],
            ]);
        }

        $refundedPayment = DB::transaction(function () use ($payment) {
            $now = Carbon::now();

            $payment->update([
                'refund_status' => Payment::REFUND_REFUNDED,
                'refunded_at' => $now,
            ]);

            $user = $payment->user;
            $user->notify(new RefundCompletedNotification($payment));

            return $payment->fresh();
        });

        try {
            $state = $this->getSubscriptionState($refundedPayment->user);
            event(new PaymentStatusUpdated($refundedPayment, $state));
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Broadcast PaymentStatusUpdated skipped: ' . $e->getMessage());
        }

        return $refundedPayment;
    }

    /**
     * Get complete subscription status and payment restriction info for a user.
     */
    public function getSubscriptionState(User $user): array
    {
        $evaluatedUser = $this->evaluateSubscription($user);

        // Fetch active pending or processing refund payment
        $activeRestrictionPayment = Payment::where('user_id', $user->id)
            ->where(function ($query) {
                $query->where('status', Payment::STATUS_PENDING)
                    ->orWhere(function ($q) {
                        $q->where('status', Payment::STATUS_REJECTED)
                            ->where('refund_status', Payment::REFUND_PROCESSING);
                    });
            })
            ->latest()
            ->first();

        // Fetch latest refunded payment if any
        $latestRefundedPayment = Payment::where('user_id', $user->id)
            ->where('status', Payment::STATUS_REJECTED)
            ->where('refund_status', Payment::REFUND_REFUNDED)
            ->latest()
            ->first();

        $latestPayment = Payment::where('user_id', $user->id)->latest()->first();

        $restrictionState = 'none';
        if ($activeRestrictionPayment) {
            if ($activeRestrictionPayment->isPending()) {
                $restrictionState = 'pending_verification';
            } elseif ($activeRestrictionPayment->isRefundProcessing()) {
                $restrictionState = 'refund_processing';
            }
        } elseif ($latestPayment && $latestPayment->isRefunded()) {
            $restrictionState = 'refund_completed';
        }

        return [
            'user' => $evaluatedUser,
            'restriction_state' => $restrictionState,
            'can_submit_payment' => in_array($restrictionState, ['none', 'refund_completed'], true) && $evaluatedUser->subscription_plan !== User::SUBSCRIPTION_PREMIUM,
            'active_payment' => $activeRestrictionPayment ?? $latestPayment,
            'payments' => Payment::where('user_id', $user->id)->orderByDesc('created_at')->get(),
        ];
    }

    /**
     * Generate unique reference number: VC-YYYYMMDD-XXXX
     */
    protected function generateUniqueReference(): string
    {
        $datePrefix = 'VC-' . Carbon::now()->format('Ymd') . '-';

        for ($i = 0; $i < 10; $i++) {
            $randomDigits = str_pad((string) mt_rand(1, 9999), 4, '0', STR_PAD_LEFT);
            $reference = $datePrefix . $randomDigits;

            if (! Payment::where('reference_number', $reference)->exists()) {
                return $reference;
            }
        }

        return $datePrefix . strtoupper(Str::random(4));
    }
}
