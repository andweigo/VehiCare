<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class AdminNotificationController extends Controller
{
    public function unreadCount(Request $request)
    {
        $notifications = $request->user()->notifications()
            ->where('data->kind', 'admin_activity');

        return response()->json([
            'unread_count' => (clone $notifications)->whereNull('read_at')->count(),
        ]);
    }

    public function index(Request $request)
    {
        $notifications = $request->user()->notifications()
            ->where('data->kind', 'admin_activity')
            ->latest()
            ->paginate(20);

        return view('admin.notifications.index', compact('notifications'));
    }

    public function markAsRead(Request $request, string $id)
    {
        $notification = $request->user()->notifications()
            ->where('data->kind', 'admin_activity')
            ->whereKey($id)
            ->firstOrFail();
        $notification->markAsRead();

        return back()->with('status', 'Notification marked as read.');
    }
}
