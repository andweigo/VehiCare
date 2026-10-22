<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use App\Models\Diagnostic;
use App\Models\Vehicle;
use App\Models\UserNotificationPreference;

class MaintenanceRecommendationNotification extends Notification
{
    use Queueable;

    protected ?Vehicle $vehicle;
    protected string $taskTitle;
    protected ?Diagnostic $diagnostic;

    public function __construct(?Vehicle $vehicle, string $taskTitle, ?Diagnostic $diagnostic = null)
    {
        $this->vehicle = $vehicle;
        $this->taskTitle = $taskTitle;
        $this->diagnostic = $diagnostic;
    }

    public function via($notifiable): array
    {
        try {
            $prefs = UserNotificationPreference::where('user_id', $notifiable->id)->first();
            if ($prefs) {
                if (!$prefs->in_app_notifications || !$prefs->maintenance_reminders) {
                    return [];
                }
            }
        } catch (\Throwable $e) {
            // Fail open to database channel
        }

        return ['database'];
    }

    public function toArray($notifiable): array
    {
        $vName = $this->vehicle
            ? (trim(($this->vehicle->custom_brand || $this->vehicle->vehicleBrand?->name || '') . ' ' . ($this->vehicle->custom_model || $this->vehicle->vehicleModel?->name || '')) ?: 'Vehicle')
            : 'Vehicle';

        return [
            'type' => 'maintenance',
            'category' => 'Maintenance',
            'title' => 'Maintenance Recommendation',
            'message' => "New maintenance check recommended for {$vName}: {$this->taskTitle}",
            'vehicle_id' => $this->vehicle?->id,
            'diagnostic_id' => $this->diagnostic?->id,
            'task_title' => $this->taskTitle,
        ];
    }
}
