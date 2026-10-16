<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    public function index(): JsonResponse
    {
        $user = Auth::user();

        $notifications = $user->notifications()
            ->latest('created_at')
            ->limit(100)
            ->get()
            ->filter(fn ($notification) => $this->isVisible($notification))
            ->map(function ($n) {
                $data = is_array($n->data) ? $n->data : json_decode($n->data, true);
                
                return [
                    'id' => $n->id,
                    'type' => $data['type'] ?? $n->type,
                    'title' => $data['title'] ?? 'Notification',
                    'message' => $data['message'] ?? '',
                    'data' => $data['data'] ?? $data,
                    'read_at' => $n->read_at ? $n->read_at->toIso8601String() : null,
                    'is_read' => !is_null($n->read_at),
                    'created_at' => $n->created_at ? $n->created_at->toIso8601String() : null,
                    'timestamp' => $n->created_at ? $n->created_at->timestamp * 1000 : null,
                ];
            });

        return response()->json([
            'status' => 'success',
            'data' => $notifications->values(),
        ]);
    }

    public function unreadCount(): JsonResponse
    {
        $user = Auth::user();
        $unreadCount = $user->unreadNotifications()
            ->get()
            ->filter(fn ($notification) => $this->isVisible($notification))
            ->count();

        return response()->json([
            'status' => 'success',
            'data' => [
                'unread_count' => $unreadCount,
            ],
        ]);
    }

    public function markAsRead(string $id): JsonResponse
    {
        $user = Auth::user();
        $notification = $user->notifications()->where('id', $id)->first();

        if ($notification && is_null($notification->read_at)) {
            $notification->markAsRead();
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Notification marked as read',
        ]);
    }

    public function markAllAsRead(): JsonResponse
    {
        $user = Auth::user();
        $user->unreadNotifications->markAsRead();

        return response()->json([
            'status' => 'success',
            'message' => 'All notifications marked as read',
        ]);
    }

    private function isVisible($notification): bool
    {
        $data = is_array($notification->data) ? $notification->data : json_decode($notification->data, true);

        return ($data['kind'] ?? null) !== 'announcement'
            || empty($data['expires_at'])
            || Carbon::parse($data['expires_at'])->isFuture();
    }
}
