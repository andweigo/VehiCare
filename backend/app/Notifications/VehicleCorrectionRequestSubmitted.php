<?php

namespace App\Notifications;

use App\Models\VehicleCorrectionRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class VehicleCorrectionRequestSubmitted extends Notification
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
            'title' => 'Correction Request Submitted',
            'message' => 'Your correction request for vehicle '.$this->request->vehicle->id.' has been submitted and is pending review.',
            'vehicle_id' => $this->request->vehicle->id,
            'request_id' => $this->request->id,
        ];
    }
}
