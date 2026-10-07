<?php

use Illuminate\Support\Facades\Broadcast;

try {
    Broadcast::channel('private-user.{id}', function ($user, $id) {
        return (int) $user->id === (int) $id;
    });
} catch (\Throwable $e) {
    \Illuminate\Support\Facades\Log::warning('Broadcast channel registration skipped: ' . $e->getMessage());
}
