<?php

use Illuminate\Support\Facades\Broadcast;

try {
    Broadcast::channel('private-user.{id}', function ($user, $id) {
        return $user->isActive() && (int) $user->id === (int) $id;
    });

    Broadcast::channel('private-admin.{id}', function ($user, $id) {
        return $user->isActive()
            && $user->isAdmin()
            && (int) $user->id === (int) $id;
    });
} catch (\Throwable $e) {
    \Illuminate\Support\Facades\Log::warning('Broadcast channel registration skipped: ' . $e->getMessage());
}
