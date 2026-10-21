<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class PremiumRevokedNotification extends Notification implements ShouldBroadcastNow
{
    use Queueable;

    public function __construct(public string $reason = '')
    {
    }

    public function via($notifiable): array
    {
        return ['database', 'broadcast'];
    }

    public function toArray($notifiable): array
    {
        return [
            'type' => 'premium_revoked',
            'title' => 'VehiCare Premium Revoked',
            'message' => 'Your VehiCare Premium access has been revoked.' . ($this->reason ? " Reason: {$this->reason}" : ''),
            'data' => [
                'plan' => 'free',
                'reason' => $this->reason,
            ],
        ];
    }

    public function toBroadcast($notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->toArray($notifiable));
    }
}
