<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\User;
use App\Jobs\DeliverAnnouncement;
use App\Services\AdminActionAuditService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AnnouncementAdminController extends Controller
{
    public function index()
    {
        $announcements = Announcement::with('createdBy:id,name')
            ->withCount('recipients')
            ->latest()
            ->paginate(20);
        $activeUsers = User::query()
            ->where('role', User::ROLE_USER)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'email']);

        return view('admin.announcements.index', compact('announcements', 'activeUsers'));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:160'],
            'body' => ['required', 'string', 'max:5000'],
            'audience' => ['required', 'in:all,free,premium,selected'],
            'scheduled_at' => ['required', 'date'],
            'expires_at' => ['nullable', 'date', 'after:scheduled_at'],
            'recipient_user_ids' => ['required_if:audience,selected', 'array', 'min:1'],
            'recipient_user_ids.*' => [
                'integer',
                'distinct',
                Rule::exists('users', 'id')->where(fn ($query) => $query
                    ->where('role', User::ROLE_USER)
                    ->where('is_active', true)),
            ],
        ]);

        $recipientIds = $validated['recipient_user_ids'] ?? [];
        unset($validated['recipient_user_ids']);

        $announcement = DB::transaction(function () use ($validated, $recipientIds, $request) {
            $adminTz = config('app.admin_timezone');

            $scheduledAt = Carbon::parse($validated['scheduled_at'], $adminTz)
                ->setTimezone('UTC');
            $expiresAt = isset($validated['expires_at'])
                ? Carbon::parse($validated['expires_at'], $adminTz)
                    ->setTimezone('UTC')
                : null;
            $isDue = $scheduledAt->lte(now());
            $isExpired = $expiresAt && $expiresAt->lte(now());

            // Remove raw datetime strings so the spread below cannot
            // overwrite the timezone-converted Carbon values.
            unset($validated['scheduled_at'], $validated['expires_at']);

            $announcement = Announcement::create([
                ...$validated,
                'scheduled_at' => $scheduledAt,
                'expires_at'   => $expiresAt,
                'status' => $isExpired ? 'expired' : ($isDue ? 'published' : 'scheduled'),
                'published_at' => $isDue && ! $isExpired ? now() : null,
                'created_by' => $request->user()->id,
            ]);

            if ($announcement->audience === 'selected') {
                DB::table('announcement_recipients')->insert(
                    collect($recipientIds)->map(fn ($userId) => [
                        'announcement_id' => $announcement->id,
                        'user_id' => $userId,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ])->all()
                );
            }

            return $announcement;
        });

        app(AdminActionAuditService::class)->record(
            $request->user(),
            $announcement->status === 'published' ? 'announcement_published' : 'announcement_scheduled',
            'announcement',
            $announcement->id,
            ['audience' => $announcement->audience],
        );

        if ($announcement->status === 'published') {
            DeliverAnnouncement::dispatch($announcement->id)->afterCommit();
            return redirect()->route('admin.announcements.index')
                ->with('status', 'Announcement published and queued for delivery.');
        }

        if ($announcement->status === 'expired') {
            return redirect()->route('admin.announcements.index')
                ->with('status', 'Announcement was not delivered because its expiry time has passed.');
        }

        return redirect()->route('admin.announcements.index')
            ->with('status', 'Announcement scheduled.');
    }
}
