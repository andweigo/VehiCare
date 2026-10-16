<?php

namespace App\Services;

use App\Models\User;
use App\Notifications\AdminActivityNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AdminNotificationService
{
    public function notify(string $eventKey, string $title, string $message, array $data = []): void
    {
        foreach (User::where('role', User::ROLE_ADMIN)->where('is_active', true)->get() as $admin) {
            try {
                DB::transaction(function () use ($admin, $eventKey, $title, $message, $data) {
                    $reserved = DB::table('admin_notification_deliveries')->insertOrIgnore([
                        'admin_id' => $admin->id,
                        'event_key' => $eventKey,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                    if ($reserved === 1) {
                        $admin->notify(new AdminActivityNotification($eventKey, $title, $message, $data));
                    }
                });
            } catch (\Throwable $exception) {
                Log::warning('Admin activity notification delivery failed.', [
                    'exception' => get_class($exception),
                    'event_key' => $eventKey,
                ]);
            }
        }
    }
}
