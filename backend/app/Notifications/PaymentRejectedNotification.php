<?php

namespace App\Notifications;

use App\Models\Payment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class PaymentRejectedNotification extends Notification implements ShouldBroadcastNow
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
        $formattedAmount = number_format((float) $this->payment->amount, 2);

        return [
            'type' => 'payment_rejected',
            'title' => 'Payment Rejected',
            'message' => "Your ₱{$formattedAmount} payment could not be verified. We're sorry for the inconvenience. Your payment is now being processed for a refund.",
            'data' => [
                'payment_id' => $this->payment->id,
                'reference_number' => $this->payment->reference_number,
                'amount' => $this->payment->amount,
                'rejection_reason' => $this->payment->rejection_reason,
                'refund_status' => $this->payment->refund_status,
                'estimated_days' => '1–3 business days',
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
