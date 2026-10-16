<?php

namespace App\Console\Commands;

use App\Jobs\DeliverAnnouncement;
use App\Models\Announcement;
use Illuminate\Console\Command;

class DeliverScheduledAnnouncements extends Command
{
    protected $signature = 'announcements:deliver';

    protected $description = 'Publish due announcements and queue pending recipient delivery';

    public function handle(): int
    {
        $now = now();

        Announcement::where('status', 'scheduled')
            ->where('scheduled_at', '<=', $now)
            ->where(function ($query) use ($now) {
                $query->whereNull('expires_at')->orWhere('expires_at', '>', $now);
            })
            ->update(['status' => 'published', 'published_at' => $now]);

        Announcement::whereIn('status', ['scheduled', 'published'])
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', $now)
            ->update(['status' => 'expired']);

        Announcement::where('status', 'published')
            ->whereNull('delivery_completed_at')
            ->where(function ($query) use ($now) {
                $query->whereNull('expires_at')->orWhere('expires_at', '>', $now);
            })
            ->orderBy('id')
            ->chunkById(100, function ($announcements) {
                foreach ($announcements as $announcement) {
                    DeliverAnnouncement::dispatchSync($announcement->id);
                }
            });

        return self::SUCCESS;
    }
}
