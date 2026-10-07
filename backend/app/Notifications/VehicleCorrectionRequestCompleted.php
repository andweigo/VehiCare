<?php

namespace App\Notifications;

use App\Models\VehicleCorrectionRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class VehicleCorrectionRequestCompleted extends Notification
{
    use Queueable;

    public function __construct(public VehicleCorrectionRequest $request)
    {
    }

    public function via($notifiable)
    {
        return ['database'];
    }

    public function toArray($notifiable)
    {
        return [
            'title' => 'Correction Completed',
            'message' => 'Your vehicle correction for vehicle '.$this->request->vehicle->id.' has been completed successfully.',
            'vehicle_id' => $this->request->vehicle->id,
            'request_id' => $this->request->id,
        ];
    }
}
