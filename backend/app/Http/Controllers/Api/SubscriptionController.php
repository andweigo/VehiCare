<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\SubscriptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubscriptionController extends Controller
{
    protected SubscriptionService $subscriptionService;

    public function __construct(SubscriptionService $subscriptionService)
    {
        $this->subscriptionService = $subscriptionService;
    }

    /**
     * Submit simulated payment for Premium subscription.
     */
    public function subscribe(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'plan' => ['required', 'string', 'in:premium'],
            'billing_cycle' => ['required', 'string', 'in:monthly,yearly'],
            'payment_method' => ['nullable', 'string', 'in:card,gcash'],
            'reference_number' => ['nullable', 'string', 'max:100'],
        ]);

        $user = $request->user();

        $payment = $this->subscriptionService->submitPayment(
            $user,
            $validated['plan'],
            $validated['billing_cycle'],
            $validated['payment_method'] ?? 'card',
            $validated['reference_number'] ?? null
        );

        $state = $this->subscriptionService->getSubscriptionState($user);

        return response()->json([
            'status' => 'success',
            'message' => 'Your payment has been submitted successfully and is awaiting verification.',
            'payment' => [
                'id' => $payment->id,
                'plan' => $payment->plan,
                'billing_cycle' => $payment->billing_cycle,
                'amount' => (float) $payment->amount,
                'payment_method' => $payment->payment_method,
                'reference_number' => $payment->reference_number,
                'status' => $payment->status,
                'refund_status' => $payment->refund_status,
                'submitted_at' => $payment->submitted_at?->toIso8601String(),
            ],
            'restriction_state' => $state['restriction_state'],
            'can_submit_payment' => $state['can_submit_payment'],
            'subscription' => [
                'plan' => $state['user']->subscription_plan,
                'status' => $state['user']->subscription_status,
                'billing_cycle' => $state['user']->subscription_cycle,
                'started_at' => $state['user']->subscription_started_at?->toIso8601String(),
                'expires_at' => $state['user']->subscription_expires_at?->toIso8601String(),
            ],
            'user' => $state['user'],
        ]);
    }

    /**
     * Get current user subscription status and payment restrictions.
     */
    public function status(Request $request): JsonResponse
    {
        $user = $request->user();
        $state = $this->subscriptionService->getSubscriptionState($user);

        return response()->json([
            'status' => 'success',
            'subscription' => [
                'plan' => $state['user']->subscription_plan,
                'status' => $state['user']->subscription_status,
                'billing_cycle' => $state['user']->subscription_cycle,
                'started_at' => $state['user']->subscription_started_at?->toIso8601String(),
                'expires_at' => $state['user']->subscription_expires_at?->toIso8601String(),
            ],
            'restriction_state' => $state['restriction_state'],
            'can_submit_payment' => $state['can_submit_payment'],
            'active_payment' => $state['active_payment'],
            'user' => $state['user'],
        ]);
    }

    /**
     * Get payment history for authenticated user.
     */
    public function payments(Request $request): JsonResponse
    {
        $user = $request->user();
        $payments = $user->payments()->get()->map(function ($p) {
            return [
                'id' => $p->id,
                'plan' => $p->plan,
                'billing_cycle' => $p->billing_cycle,
                'amount' => (float) $p->amount,
                'payment_method' => $p->payment_method,
                'reference_number' => $p->reference_number,
                'status' => $p->status,
                'rejection_reason' => $p->rejection_reason,
                'refund_status' => $p->refund_status,
                'refund_amount' => $p->refund_amount ? (float) $p->refund_amount : null,
                'submitted_at' => $p->submitted_at?->toIso8601String(),
                'verified_at' => $p->verified_at?->toIso8601String(),
                'refunded_at' => $p->refunded_at?->toIso8601String(),
            ];
        });

        return response()->json([
            'status' => 'success',
            'payments' => $payments,
        ]);
    }
}
