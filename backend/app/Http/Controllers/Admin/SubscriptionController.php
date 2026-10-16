<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\User;
use App\Services\SubscriptionService;
use Illuminate\Http\Request;

class SubscriptionController extends Controller
{
    protected SubscriptionService $subscriptionService;

    public function __construct(SubscriptionService $subscriptionService)
    {
        $this->subscriptionService = $subscriptionService;
    }

    public function index(Request $request)
    {
        $tab = $request->get('tab', 'all');

        $paymentsQuery = Payment::with([
            'user:id,name,email',
            'admin:id,name',
            'subscriptionRevokedBy:id,name',
        ])->orderByDesc('created_at');

        if ($tab === 'pending') {
            $paymentsQuery->where('status', Payment::STATUS_PENDING);
        } elseif ($tab === 'refund_processing') {
            $paymentsQuery->where('status', Payment::STATUS_REJECTED)
                ->where('refund_status', Payment::REFUND_PROCESSING);
        } elseif ($tab === 'approved') {
            $paymentsQuery->where('status', Payment::STATUS_APPROVED);
        } elseif ($tab === 'rejected') {
            $paymentsQuery->where('status', Payment::STATUS_REJECTED);
        }

        $payments = $paymentsQuery->get();

        $stats = [
            'total_payments' => Payment::count(),
            'pending_count' => Payment::where('status', Payment::STATUS_PENDING)->count(),
            'refund_processing_count' => Payment::where('status', Payment::STATUS_REJECTED)->where('refund_status', Payment::REFUND_PROCESSING)->count(),
            'approved_count' => Payment::where('status', Payment::STATUS_APPROVED)->count(),
            'premium_users' => User::where('subscription_plan', User::SUBSCRIPTION_PREMIUM)->count(),
        ];

        $users = User::where('role', User::ROLE_USER)
            ->withCount('vehicles')
            ->orderByDesc('subscription_plan')
            ->orderByDesc('created_at')
            ->get();

        if ($request->wantsJson() || $request->ajax() || $request->header('X-Live-Poll')) {
            return response()->json([
                'status' => 'success',
                'tab' => $tab,
                'stats' => $stats,
                'payments' => $payments,
            ]);
        }

        return view('admin.subscriptions.index', compact('payments', 'users', 'stats', 'tab'));
    }

    public function approve(Request $request, $id)
    {
        $payment = Payment::findOrFail($id);
        $admin = $request->user();

        $this->subscriptionService->approvePayment($payment, $admin);

        return back()->with('status', "Payment {$payment->reference_number} has been APPROVED and Premium activated for {$payment->user->name}.");
    }

    public function reject(Request $request, $id)
    {
        $request->validate([
            'rejection_reason_preset' => ['required', 'string'],
            'custom_rejection_reason' => ['nullable', 'string', 'max:255'],
        ]);

        $reason = $request->input('rejection_reason_preset');
        if ($reason === 'Other' && $request->filled('custom_rejection_reason')) {
            $reason = $request->input('custom_rejection_reason');
        }

        $payment = Payment::findOrFail($id);
        $admin = $request->user();

        $this->subscriptionService->rejectPayment($payment, $admin, $reason);

        return back()->with('status', "Payment {$payment->reference_number} REJECTED. Refund is now PROCESSING (1–3 business days).");
    }

    public function completeRefund(Request $request, $id)
    {
        $payment = Payment::findOrFail($id);
        $admin = $request->user();

        $this->subscriptionService->completeRefund($payment, $admin);

        return back()->with('status', "Simulated refund of ₱" . number_format((float) $payment->amount, 2) . " for {$payment->reference_number} COMPLETED.");
    }

    public function update(Request $request, $id)
    {
        $user = User::where('role', User::ROLE_USER)->findOrFail($id);

        $validated = $request->validate([
            'subscription_plan' => [
                'required',
                'in:' . implode(',', [User::SUBSCRIPTION_FREE, User::SUBSCRIPTION_PREMIUM]),
            ],
            'billing_cycle' => ['required_if:subscription_plan,' . User::SUBSCRIPTION_PREMIUM, 'nullable', 'in:monthly,yearly'],
            'reason' => ['required', 'string', 'min:3', 'max:2000'],
        ]);

        if ($validated['subscription_plan'] === User::SUBSCRIPTION_PREMIUM) {
            $this->subscriptionService->grantManualPremium(
                $user,
                $request->user(),
                $validated['billing_cycle'],
                $validated['reason']
            );
        } else {
            $this->subscriptionService->revokePremium($user, $request->user(), $validated['reason']);
        }

        return back()->with('status', 'Subscription settings updated successfully.');
    }

    public function grantPremium(Request $request, $id)
    {
        $user = User::where('role', User::ROLE_USER)->findOrFail($id);

        $validated = $request->validate([
            'billing_cycle' => ['required', 'in:monthly,yearly'],
            'reason' => ['required', 'string', 'min:3', 'max:2000'],
        ]);

        $this->subscriptionService->grantManualPremium(
            $user,
            $request->user(),
            $validated['billing_cycle'],
            $validated['reason']
        );

        return back()->with('status', "Manual Premium access granted to {$user->name}.");
    }

    public function revokePremium(Request $request, $id)
    {
        $user = User::where('role', User::ROLE_USER)->findOrFail($id);
        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:3', 'max:2000'],
        ]);
        $this->subscriptionService->revokePremium($user, $request->user(), $validated['reason']);

        return back()->with('status', "Premium access revoked for {$user->name}. Existing vehicles were preserved; any refund remains a separate payment workflow.");
    }
}
