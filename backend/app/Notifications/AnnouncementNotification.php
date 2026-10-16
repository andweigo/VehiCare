<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class AnnouncementNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly int $announcementId, private readonly string $title, private readonly string $body, private readonly ?string $expiresAt)
    {
    }

    public function via(object $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'kind' => 'announcement',
            'type' => 'announcement',
            'announcement_id' => $this->announcementId,
            'title' => $this->title,
            'message' => $this->body,
            'expires_at' => $this->expiresAt,
        ];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->toArray($notifiable));
    }
}
