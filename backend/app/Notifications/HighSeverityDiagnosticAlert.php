<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use App\Models\Diagnostic;
use App\Models\UserNotificationPreference;

class HighSeverityDiagnosticAlert extends Notification
{
    use Queueable;

    protected Diagnostic $diagnostic;

    public function __construct(Diagnostic $diagnostic)
    {
        $this->diagnostic = $diagnostic;
    }

    public function via($notifiable): array
    {
        try {
            $prefs = UserNotificationPreference::where('user_id', $notifiable->id)->first();
            if ($prefs) {
                if (!$prefs->in_app_notifications) {
                    return [];
                }
                if ($this->diagnostic->severity === 'CRITICAL' && !$prefs->critical_alerts) {
                    return [];
                }
                if ($this->diagnostic->severity === 'HIGH' && !$prefs->high_severity_alerts) {
                    return [];
                }
            }
        } catch (\Throwable $e) {
            // Fail open to database channel if preference lookup fails
        }

        return ['database'];
    }

    public function toArray($notifiable): array
    {
        $vName = $this->diagnostic->vehicle
            ? ($this->diagnostic->vehicle->custom_brand || $this->diagnostic->vehicle->vehicleBrand?->name || 'Vehicle')
            : 'Vehicle';

        return [
            'type' => 'diagnostic',
            'category' => 'Diagnostics',
            'title' => 'Diagnostic Alert: ' . $this->diagnostic->severity . ' Severity',
            'message' => "Your recent diagnostic check for {$vName} was flagged as {$this->diagnostic->severity} severity: {$this->diagnostic->summary}",
            'diagnostic_id' => $this->diagnostic->id,
            'vehicle_id' => $this->diagnostic->vehicle_id,
            'severity' => $this->diagnostic->severity,
            'urgency' => $this->diagnostic->urgency,
        ];
    }
}
