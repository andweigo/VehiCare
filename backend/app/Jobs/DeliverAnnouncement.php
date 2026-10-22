<?php

namespace App\Jobs;

use App\Models\Announcement;
use App\Models\User;
use App\Notifications\AnnouncementNotification;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;

class DeliverAnnouncement implements ShouldQueue, ShouldBeUnique
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $uniqueFor = 3600;

    public function __construct(public readonly int $announcementId)
    {
    }

    public function uniqueId(): string
    {
        return (string) $this->announcementId;
    }

    public function backoff(): array
    {
        return [30, 90, 180];
    }

    public function handle(): void
    {
        $announcement = Announcement::query()
            ->whereKey($this->announcementId)
            ->where('status', 'published')
            ->where(function ($query) {
                $query->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->first();

        if (! $announcement) {
            return;
        }

        $recipientCutoff = $announcement->published_at ?? $announcement->created_at;
        $this->snapshotRecipients($announcement);

        $users = User::query()
            ->where('users.is_active', true)
            ->where('users.created_at', '<=', $recipientCutoff)
            ->whereNotExists(function ($query) {
                $query->selectRaw('1')
                    ->from('announcement_deliveries')
                    ->whereColumn('announcement_deliveries.user_id', 'users.id')
                    ->where('announcement_deliveries.announcement_id', $this->announcementId);
            });

        if ($announcement->audience !== 'all' && $announcement->audience !== 'selected') {
            $users->where('users.role', User::ROLE_USER);
        }

        $users->whereIn('users.id', function ($query) {
            $query->select('user_id')
                ->from('announcement_recipients')
                ->where('announcement_id', $this->announcementId);
        });

        $deliveryAborted = false;

        $users->select('users.*')
            ->orderBy('users.id')
            ->chunkById(100, function ($recipients) use (&$announcement, &$deliveryAborted) {
                $currentAnnouncement = Announcement::query()
                    ->whereKey($this->announcementId)
                    ->where('status', 'published')
                    ->where(function ($query) {
                        $query->whereNull('expires_at')->orWhere('expires_at', '>', now());
                    })
                    ->first();

                if (! $currentAnnouncement) {
                    $deliveryAborted = true;
                    return false;
                }

                $announcement = $currentAnnouncement;

                foreach ($recipients as $recipient) {
                    DB::transaction(function () use ($announcement, $recipient) {
                        $inAppEnabled = DB::table('user_notification_preferences')
                            ->where('user_id', $recipient->id)
                            ->value('in_app_notifications');
                        $pushEnabled = DB::table('user_notification_preferences')
                            ->where('user_id', $recipient->id)
                            ->value('push_notifications');

                        if (($inAppEnabled !== null && ! (bool) $inAppEnabled) && ($pushEnabled !== null && ! (bool) $pushEnabled)) {
                            return;
                        }

                        $recipient->checkSubscriptionStatus();

                        if ($announcement->audience === 'premium'
                            && $recipient->subscription_plan !== User::SUBSCRIPTION_PREMIUM) {
                            return;
                        }

                        if ($announcement->audience === 'free'
                            && $recipient->subscription_plan === User::SUBSCRIPTION_PREMIUM) {
                            return;
                        }

                        $reserved = DB::table('announcement_deliveries')->insertOrIgnore([
                            'announcement_id' => $announcement->id,
                            'user_id' => $recipient->id,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);

                        if ($reserved === 1) {
                            $recipient->notify(new AnnouncementNotification(
                                $announcement->id,
                                $announcement->title,
                                $announcement->body,
                                $announcement->expires_at?->toIso8601String(),
                            ));
                        }
                    });
                }
            }, 'users.id', 'id');

        if (! $deliveryAborted) {
            Announcement::whereKey($announcement->id)
                ->where('status', 'published')
                ->where(function ($query) {
                    $query->whereNull('expires_at')->orWhere('expires_at', '>', now());
                })
                ->whereNull('delivery_completed_at')
                ->update(['delivery_completed_at' => now()]);
        }
    }

    private function snapshotRecipients(Announcement $announcement): void
    {
        if ($announcement->recipient_snapshot_at) {
            return;
        }

        DB::transaction(function () use ($announcement) {
            $lockedAnnouncement = Announcement::whereKey($announcement->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedAnnouncement->recipient_snapshot_at) {
                return;
            }

            $snapshotAt = now();
            if ($lockedAnnouncement->audience !== 'selected') {
                $users = User::query()
                    ->where('is_active', true)
                    ->where('created_at', '<=', $lockedAnnouncement->published_at ?? $lockedAnnouncement->created_at);

                if ($lockedAnnouncement->audience !== 'all') {
                    $users->where('role', User::ROLE_USER);
                }

                if ($lockedAnnouncement->audience === 'premium') {
                    $users->where('subscription_plan', User::SUBSCRIPTION_PREMIUM)
                        ->where(function ($query) use ($snapshotAt) {
                            $query->whereNull('subscription_expires_at')
                                    ->orWhere('subscription_expires_at', '>=', $snapshotAt);
                        });
                } elseif ($lockedAnnouncement->audience === 'free') {
                    $users->where(function ($query) use ($snapshotAt) {
                        $query->whereNull('subscription_plan')
                            ->orWhere('subscription_plan', '!=', User::SUBSCRIPTION_PREMIUM)
                            ->orWhere(function ($expiredPremium) use ($snapshotAt) {
                                $expiredPremium->where('subscription_plan', User::SUBSCRIPTION_PREMIUM)
                                    ->whereNotNull('subscription_expires_at')
                                ->where('subscription_expires_at', '<', $snapshotAt);
                            });
                    });
                }

                $users->whereNotExists(function ($query) use ($lockedAnnouncement) {
                    $query->selectRaw('1')
                        ->from('announcement_recipients')
                        ->whereColumn('announcement_recipients.user_id', 'users.id')
                        ->where('announcement_recipients.announcement_id', $lockedAnnouncement->id);
                });

                $now = Carbon::now();
                DB::table('announcement_recipients')->insertUsing(
                    ['announcement_id', 'user_id', 'created_at', 'updated_at'],
                    $users->selectRaw('? as announcement_id, users.id as user_id, ? as created_at, ? as updated_at', [
                        $lockedAnnouncement->id,
                        $now,
                        $now,
                    ])
                );
            }

            $lockedAnnouncement->update(['recipient_snapshot_at' => $snapshotAt]);
        });
    }
}
