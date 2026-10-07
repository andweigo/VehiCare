<?php

namespace App\Notifications;

use App\Models\Payment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class RefundCompletedNotification extends Notification implements ShouldBroadcastNow
{
    use Queueable;

    public function __construct(public Payment $payment)
    {
    }

    public function via($notifiable): array
    {
        return ['database', 'broadcast'];
    }

    public function toArray($notifiable): array
    {
        $formattedAmount = number_format((float) ($this->payment->refund_amount ?? $this->payment->amount), 2);

        return [
            'type' => 'refund_completed',
            'title' => 'Refund Completed',
            'message' => "Your ₱{$formattedAmount} payment has been successfully refunded. We're sorry that your payment could not be verified. You may now submit a new payment if you would like to continue with Premium.",
            'data' => [
                'payment_id' => $this->payment->id,
                'reference_number' => $this->payment->reference_number,
                'refund_amount' => $this->payment->refund_amount ?? $this->payment->amount,
                'refund_status' => $this->payment->refund_status,
                'refunded_at' => $this->payment->refunded_at?->toIso8601String(),
            ],
            'payment_id' => $this->payment->id,
            'reference_number' => $this->payment->reference_number,
        ];
    }

    public function toBroadcast($notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->toArray($notifiable));
    }
}
