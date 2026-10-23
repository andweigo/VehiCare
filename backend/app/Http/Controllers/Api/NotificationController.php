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
                $data = is_array($n->data) ? $n->data : json_decode($n->data ?? '', true);
                $data = is_array($data) ? $data : [];

                $type = $data['type'] ?? ($n->type === 'App\\Notifications\\AnnouncementNotification' ? 'announcement' : $n->type);
                $title = $data['title'] ?? ($data['data']['title'] ?? ($data['subject'] ?? 'VehiCare Notification'));
                $message = $data['message'] ?? ($data['data']['message'] ?? ($data['body'] ?? ($data['data']['body'] ?? ($data['content'] ?? ($data['description'] ?? '')))));
                
                return [
                    'id' => (string) $n->id,
                    'type' => $type,
                    'title' => $title,
                    'message' => $message,
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
        $visibleUnread = $user->unreadNotifications()
            ->latest('created_at')
            ->get()
            ->filter(fn ($notification) => $this->isVisible($notification))
            ->values();

        $unreadCount = $visibleUnread->count();
        $latest = $visibleUnread->first();
        $latestUnread = null;

        if ($latest) {
            $data = is_array($latest->data) ? $latest->data : json_decode($latest->data ?? '', true);
            $data = is_array($data) ? $data : [];
            $type = $data['type'] ?? ($latest->type === 'App\\Notifications\\AnnouncementNotification' ? 'announcement' : $latest->type);
            $title = $data['title'] ?? ($data['data']['title'] ?? ($data['subject'] ?? 'VehiCare Notification'));
            $message = $data['message'] ?? ($data['data']['message'] ?? ($data['body'] ?? ($data['data']['body'] ?? ($data['content'] ?? ($data['description'] ?? '')))));

            $latestUnread = [
                'id' => (string) $latest->id,
                'type' => (string) $type,
                'title' => (string) $title,
                'message' => (string) $message,
                'data' => $data['data'] ?? $data,
                'created_at' => $latest->created_at ? $latest->created_at->toIso8601String() : null,
                'timestamp' => $latest->created_at ? $latest->created_at->timestamp * 1000 : null,
            ];
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'unread_count' => $unreadCount,
                'latest_unread' => $latestUnread,
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
        $data = is_array($notification->data)
            ? $notification->data
            : json_decode($notification->data ?? '', true);

        $data = is_array($data) ? $data : [];

        $isAnnouncement = ($data['kind'] ?? null) === 'announcement'
            || ($data['type'] ?? null) === 'announcement'
            || $notification->type === 'App\\Notifications\\AnnouncementNotification';

        if (! $isAnnouncement) {
            return true;
        }

        if (empty($data['expires_at'])) {
            return true;
        }

        try {
            return Carbon::parse($data['expires_at'])->isFuture();
        } catch (\Throwable) {
            return true;
        }
    }
}
