<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
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
            ->get()
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
                    'timestamp' => $n->created_at ? $n->created_at->timestamp * 1000 : Date.now(),
                ];
            });

        return response()->json([
            'status' => 'success',
            'data' => $notifications,
        ]);
    }

    public function unreadCount(): JsonResponse
    {
        $user = Auth::user();
        $unreadCount = $user->unreadNotifications()->count();

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
}
