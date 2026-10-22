<?php

namespace App\Notifications;

use App\Models\VehicleCorrectionRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class VehicleCorrectionRequestRejected extends Notification
{
    use Queueable;

    public function __construct(public VehicleCorrectionRequest $request)
    {
    }

    public function via($notifiable)
    {
        try {
            $prefs = \App\Models\UserNotificationPreference::where('user_id', $notifiable->id)->first();
            if ($prefs && (!$prefs->in_app_notifications || !$prefs->vehicle_updates || !$prefs->vehicle_edit_requests)) {
                return [];
            }
        } catch (\Throwable $e) {}

        return ['database'];
    }

    public function toArray($notifiable)
    {
        return [
            'type' => 'vehicle_edit_rejected',
            'title' => 'Vehicle Update Rejected',
            'message' => 'Your request to update your vehicle was rejected.',
            'data' => [
                'request_id' => $this->request->id,
                'vehicle_id' => $this->request->vehicle_id,
                'admin_note' => $this->request->admin_notes,
            ],
            'vehicle_id' => $this->request->vehicle_id,
            'request_id' => $this->request->id,
        ];
    }
}
