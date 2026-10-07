<?php

namespace App\Notifications;

use App\Models\Payment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class PaymentSubmittedNotification extends Notification implements ShouldBroadcastNow
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
            'type' => 'payment_submitted',
            'title' => 'Payment Submitted',
            'message' => "Your ₱{$formattedAmount} Premium payment has been submitted and is awaiting verification.",
            'data' => [
                'payment_id' => $this->payment->id,
                'reference_number' => $this->payment->reference_number,
                'amount' => $this->payment->amount,
                'plan' => $this->payment->plan,
                'billing_cycle' => $this->payment->billing_cycle,
                'status' => $this->payment->status,
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
