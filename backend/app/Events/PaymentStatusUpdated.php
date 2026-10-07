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

    public function __construct(public Payment $payment, public array $stateData = [])
    {
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('user.' . $this->payment->user_id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'payment.updated';
    }

    public function broadcastWith(): array
    {
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
