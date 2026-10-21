<?php

namespace App\Notifications;

use App\Models\ManualPremiumGrant;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class PremiumGrantedNotification extends Notification implements ShouldBroadcastNow
{
    use Queueable;

    public function __construct(public ManualPremiumGrant $grant)
    {
    }

    public function via($notifiable): array
    {
        return ['database', 'broadcast'];
    }

    public function toArray($notifiable): array
    {
        $cycleLabel = ucfirst($this->grant->billing_cycle);
        $expires = $this->grant->expires_at ? $this->grant->expires_at->toFormattedDateString() : 'Active';

        return [
            'type' => 'premium_granted',
            'title' => 'VehiCare Premium Granted',
            'message' => "An administrator has granted you VehiCare Premium access ({$cycleLabel} plan). Enjoy up to 5 vehicle profiles, 100 AI consultations per month, and advanced diagnostics!",
            'data' => [
                'grant_id' => $this->grant->id,
                'plan' => 'premium',
                'billing_cycle' => $this->grant->billing_cycle,
                'status' => $this->grant->status,
                'expires_at' => $this->grant->expires_at?->toIso8601String(),
                'reason' => $this->grant->reason,
            ],
            'grant_id' => $this->grant->id,
        ];
    }

    public function toBroadcast($notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->toArray($notifiable));
    }
}
