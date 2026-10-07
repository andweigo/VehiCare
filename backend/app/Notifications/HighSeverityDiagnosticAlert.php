<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use App\Models\Diagnostic;

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
