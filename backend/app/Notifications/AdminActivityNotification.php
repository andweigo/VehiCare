<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class AdminActivityNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly string $eventKey,
        private readonly string $title,
        private readonly string $message,
        private readonly array $data = [],
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'kind' => 'admin_activity',
            'event_key' => $this->eventKey,
            'title' => $this->title,
            'message' => $this->message,
            'data' => $this->data,
        ];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->toArray($notifiable));
    }
}
