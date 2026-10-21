<?php

namespace App\Services;

use App\Events\PaymentStatusUpdated;
use App\Models\ManualPremiumGrant;
use App\Models\Payment;
use App\Models\User;
use App\Notifications\PaymentApprovedNotification;
use App\Notifications\PaymentRejectedNotification;
use App\Notifications\PaymentSubmittedNotification;
use App\Notifications\PremiumGrantedNotification;
use App\Notifications\PremiumRevokedNotification;
use App\Notifications\RefundCompletedNotification;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class SubscriptionService
{
    public function __construct(
        private readonly ?AdminNotificationService $adminNotifications = null,
        private readonly ?AdminActionAuditService $auditLog = null,
    ) {
    }

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
        if ($referenceNumber && trim($referenceNumber) !== '') {
            $trimmedRef = trim($referenceNumber);
            if (Payment::where('reference_number', $trimmedRef)->exists()) {
                throw ValidationException::withMessages([
                    'payment' => ["The payment reference number '{$trimmedRef}' has already been submitted. Please check your transaction receipt and enter a unique reference number."],
                ]);
            }
            $finalReference = $trimmedRef;
        } else {
            $finalReference = $this->generateUniqueReference();
        }

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

        ($this->adminNotifications ?? app(AdminNotificationService::class))->notify(
            "payment-submitted:{$payment->id}",
            'New Subscription Purchase',
            "User {$user->name} ({$user->email}) purchased a {$payment->billing_cycle} Premium subscription (Ref: {$payment->reference_number}) for ₱" . number_format((float) $payment->amount, 2) . '.',
            [
                'payment_id' => $payment->id,
                'user_id' => $payment->user_id,
                'reference_number' => $payment->reference_number,
                'amount' => $payment->amount,
                'billing_cycle' => $payment->billing_cycle,
            ],
        );

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
            $payment = Payment::whereKey($payment->id)->lockForUpdate()->firstOrFail();
            if (! $payment->isPending()) {
                throw ValidationException::withMessages([
                    'payment' => ["Cannot approve payment with status '{$payment->status}'."],
                ]);
            }

            $now = Carbon::now();
            $cycle = $payment->billing_cycle;

            $user = User::whereKey($payment->user_id)->lockForUpdate()->firstOrFail();
            $user->checkSubscriptionStatus();
            $periodStartsAt = $user->subscription_plan === User::SUBSCRIPTION_PREMIUM
                && $user->subscription_expires_at
                && $user->subscription_expires_at->isFuture()
                    ? $user->subscription_expires_at->copy()
                    : $now->copy();

            if ($cycle === User::SUBSCRIPTION_CYCLE_MONTHLY) {
                $expiresAt = $periodStartsAt->copy()->addMonth();
            } elseif ($cycle === User::SUBSCRIPTION_CYCLE_YEARLY) {
                $expiresAt = $periodStartsAt->copy()->addYear();
            } else {
                throw ValidationException::withMessages([
                    'billing_cycle' => ['The payment has an unsupported billing cycle.'],
                ]);
            }

            $payment->update([
                'status' => Payment::STATUS_APPROVED,
                'refund_status' => Payment::REFUND_NOT_APPLICABLE,
                'verified_at' => $now,
                'admin_id' => $admin->id,
            ]);

            $user->manualPremiumGrants()
                ->where('status', ManualPremiumGrant::STATUS_ACTIVE)
                ->update([
                    'status' => ManualPremiumGrant::STATUS_SUPERSEDED,
                    'ended_at' => $now,
                ]);

            $user->update([
                'subscription_plan' => User::SUBSCRIPTION_PREMIUM,
                'subscription_status' => User::SUBSCRIPTION_STATUS_ACTIVE,
                'subscription_cycle' => $cycle,
                'subscription_source' => 'payment',
                'subscription_started_at' => $periodStartsAt,
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
        ($this->adminNotifications ?? app(AdminNotificationService::class))->notify(
            "payment-approved:{$approvedPayment->id}",
            'Payment approved',
            'A subscription payment was approved.',
            ['payment_id' => $approvedPayment->id, 'user_id' => $approvedPayment->user_id],
        );
        $this->recordAdminAction($admin, 'payment_approved', 'payment', $approvedPayment->id, [
            'user_id' => $approvedPayment->user_id,
            'billing_cycle' => $approvedPayment->billing_cycle,
        ]);

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
        ($this->adminNotifications ?? app(AdminNotificationService::class))->notify(
            "payment-rejected:{$rejectedPayment->id}",
            'Payment rejected',
            'A subscription payment was rejected.',
            ['payment_id' => $rejectedPayment->id, 'user_id' => $rejectedPayment->user_id],
        );
        $this->recordAdminAction($admin, 'payment_rejected', 'payment', $rejectedPayment->id, [
            'user_id' => $rejectedPayment->user_id,
        ]);

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

        $refundedPayment = DB::transaction(function () use ($payment, $admin) {
            $now = Carbon::now();

            $payment->update([
                'refund_status' => Payment::REFUND_REFUNDED,
                'refunded_at' => $now,
                'admin_id' => $admin->id,
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
        ($this->adminNotifications ?? app(AdminNotificationService::class))->notify(
            "refund-completed:{$refundedPayment->id}",
            'Refund completed',
            'A payment refund was marked complete.',
            ['payment_id' => $refundedPayment->id, 'user_id' => $refundedPayment->user_id],
        );
        $this->recordAdminAction($admin, 'refund_completed', 'payment', $refundedPayment->id, [
            'user_id' => $refundedPayment->user_id,
        ]);

        return $refundedPayment;
    }

    public function grantManualPremium(User $user, User $admin, string $billingCycle, string $reason): ManualPremiumGrant
    {
        $billingCycle = strtolower(trim($billingCycle));
        $reason = trim($reason);

        if (! in_array($billingCycle, [User::SUBSCRIPTION_CYCLE_MONTHLY, User::SUBSCRIPTION_CYCLE_YEARLY], true)) {
            throw ValidationException::withMessages([
                'billing_cycle' => ['Choose a monthly or yearly Premium grant period.'],
            ]);
        }

        if ($reason === '') {
            throw ValidationException::withMessages([
                'reason' => ['A reason is required for a manual Premium grant.'],
            ]);
        }

        $grant = DB::transaction(function () use ($user, $admin, $billingCycle, $reason) {
            $user = User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            $user->checkSubscriptionStatus();

            if ($user->subscription_plan === User::SUBSCRIPTION_PREMIUM) {
                throw ValidationException::withMessages([
                    'subscription' => ['This account already has Premium access. Wait for it to expire before granting manual Premium.'],
                ]);
            }

            $grantedAt = Carbon::now();
            $expiresAt = $billingCycle === User::SUBSCRIPTION_CYCLE_MONTHLY
                ? $grantedAt->copy()->addMonth()
                : $grantedAt->copy()->addYear();

            $grant = ManualPremiumGrant::create([
                'user_id' => $user->id,
                'admin_id' => $admin->id,
                'billing_cycle' => $billingCycle,
                'reason' => $reason,
                'status' => ManualPremiumGrant::STATUS_ACTIVE,
                'granted_at' => $grantedAt,
                'expires_at' => $expiresAt,
            ]);

            $user->update([
                'subscription_plan' => User::SUBSCRIPTION_PREMIUM,
                'subscription_status' => User::SUBSCRIPTION_STATUS_ACTIVE,
                'subscription_cycle' => $billingCycle,
                'subscription_source' => 'manual',
                'subscription_started_at' => $grantedAt,
                'subscription_expires_at' => $expiresAt,
                'vehicle_limit' => User::VEHICLE_LIMIT_PREMIUM,
            ]);

            // Notify user that they have been granted Premium access
            $user->notify(new PremiumGrantedNotification($grant));

            return $grant->fresh(['admin', 'user']);
        });

        try {
            $state = $this->getSubscriptionState($user);
            event(new PaymentStatusUpdated(null, $state, $user->id));
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Broadcast PaymentStatusUpdated skipped: ' . $e->getMessage());
        }

        ($this->adminNotifications ?? app(AdminNotificationService::class))->notify(
            "premium-granted:{$grant->id}",
            'Manual Premium access granted',
            'An administrator granted manual Premium access.',
            ['grant_id' => $grant->id, 'user_id' => $grant->user_id],
        );
        $this->recordAdminAction($admin, 'premium_granted', 'subscription', $grant->id, [
            'user_id' => $grant->user_id,
            'billing_cycle' => $grant->billing_cycle,
        ]);

        return $grant;
    }

    public function revokePremium(User $user, User $admin, string $reason): void
    {
        $reason = trim($reason);
        if ($reason === '') {
            throw ValidationException::withMessages([
                'reason' => ['A reason is required to revoke Premium access.'],
            ]);
        }

        $user->refresh()->checkSubscriptionStatus();

        DB::transaction(function () use ($user, $admin, $reason) {
            $user = User::whereKey($user->id)->lockForUpdate()->firstOrFail();

            if ($user->subscription_plan !== User::SUBSCRIPTION_PREMIUM) {
                throw ValidationException::withMessages([
                    'subscription' => ['This account does not have active Premium access to revoke.'],
                ]);
            }

            if ($user->subscription_source === 'manual') {
                $grant = $user->manualPremiumGrants()
                    ->where('status', ManualPremiumGrant::STATUS_ACTIVE)
                    ->lockForUpdate()
                    ->first();

                if (! $grant) {
                    throw ValidationException::withMessages([
                        'subscription' => ['No active manual Premium grant is available to revoke.'],
                    ]);
                }

                $grant->update([
                    'status' => ManualPremiumGrant::STATUS_REVOKED,
                    'revoked_by' => $admin->id,
                    'revocation_reason' => $reason,
                    'ended_at' => Carbon::now(),
                ]);
            } elseif ($user->subscription_source === 'payment') {
                $payment = Payment::where('user_id', $user->id)
                    ->where('status', Payment::STATUS_APPROVED)
                    ->whereNull('subscription_revoked_at')
                    ->orderByDesc('verified_at')
                    ->lockForUpdate()
                    ->first();

                if (! $payment) {
                    throw ValidationException::withMessages([
                        'subscription' => ['No active payment-verified subscription record is available to revoke.'],
                    ]);
                }

                $payment->update([
                    'subscription_revoked_at' => Carbon::now(),
                    'subscription_revoked_by' => $admin->id,
                    'subscription_revocation_reason' => $reason,
                ]);
            } else {
                throw ValidationException::withMessages([
                    'subscription' => ['This legacy Premium subscription has no verifiable source record and cannot be revoked through this action.'],
                ]);
            }

            $user->update([
                'subscription_plan' => User::SUBSCRIPTION_FREE,
                'subscription_status' => User::SUBSCRIPTION_STATUS_NONE,
                'subscription_cycle' => null,
                'subscription_source' => 'none',
                'subscription_started_at' => null,
                'subscription_expires_at' => null,
                'vehicle_limit' => User::VEHICLE_LIMIT_FREE,
            ]);
        });

        // Notify user that their Premium access was revoked
        $user->notify(new PremiumRevokedNotification($reason));

        try {
            $state = $this->getSubscriptionState($user);
            event(new PaymentStatusUpdated(null, $state, $user->id));
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Broadcast PaymentStatusUpdated skipped: ' . $e->getMessage());
        }

        ($this->adminNotifications ?? app(AdminNotificationService::class))->notify(
            'premium-revoked:' . $user->id . ':' . now()->timestamp,
            'Premium access revoked',
            'An administrator revoked Premium access.',
            ['user_id' => $user->id],
        );
        $this->recordAdminAction($admin, 'premium_revoked', 'subscription', $user->id);
    }

    private function recordAdminAction(User $admin, string $action, string $subjectType, int|string $subjectId, array $metadata = []): void
    {
        ($this->auditLog ?? app(AdminActionAuditService::class))
            ->record($admin, $action, $subjectType, $subjectId, $metadata);
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
            'can_submit_payment' => in_array($restrictionState, ['none', 'refund_completed'], true),
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
