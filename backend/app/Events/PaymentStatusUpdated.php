<?php

namespace App\Events;

use App\Models\Payment;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PaymentStatusUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public ?int $userId;

    public function __construct(public ?Payment $payment = null, public array $stateData = [], ?int $userId = null)
    {
        $this->userId = $userId ?? $this->payment?->user_id;
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('user.' . ($this->userId ?? $this->payment?->user_id)),
        ];
    }

    public function broadcastAs(): string
    {
        return 'payment.updated';
    }

    public function broadcastWith(): array
    {
        if (! $this->payment) {
            $user = $this->stateData['user'] ?? null;
            return [
                'payment_id' => null,
                'user_id' => $this->userId,
                'plan' => $user?->subscription_plan ?? 'premium',
                'billing_cycle' => $user?->subscription_cycle ?? 'monthly',
                'amount' => 0.0,
                'payment_method' => 'manual',
                'reference_number' => null,
                'status' => 'approved',
                'rejection_reason' => null,
                'refund_status' => 'not_applicable',
                'refund_amount' => null,
                'submitted_at' => null,
                'verified_at' => now()->toIso8601String(),
                'refunded_at' => null,
                'state_data' => $this->stateData,
            ];
        }

        return [
            'payment_id' => $this->payment->id,
            'user_id' => $this->payment->user_id,
            'plan' => $this->payment->plan,
            'billing_cycle' => $this->payment->billing_cycle,
            'amount' => (float) $this->payment->amount,
            'payment_method' => $this->payment->payment_method,
            'reference_number' => $this->payment->reference_number,
            'status' => $this->payment->status,
            'rejection_reason' => $this->payment->rejection_reason,
            'refund_status' => $this->payment->refund_status,
            'refund_amount' => $this->payment->refund_amount ? (float) $this->payment->refund_amount : null,
            'submitted_at' => $this->payment->submitted_at?->toIso8601String(),
            'verified_at' => $this->payment->verified_at?->toIso8601String(),
            'refunded_at' => $this->payment->refunded_at?->toIso8601String(),
            'state_data' => $this->stateData,
        ];
    }
}
