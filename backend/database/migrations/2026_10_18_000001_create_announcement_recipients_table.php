<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const RECIPIENT_COLUMNS = [
        'id',
        'announcement_id',
        'user_id',
        'created_at',
        'updated_at',
    ];

    public function up(): void
    {
        if (! Schema::hasTable('announcements')) {
            throw new RuntimeException("Unexpected partial schema state: prerequisite table 'announcements' does not exist.");
        }

        $createdCompletedCol = false;
        if (! Schema::hasColumn('announcements', 'delivery_completed_at')) {
            Schema::table('announcements', function (Blueprint $table) {
                $table->timestamp('delivery_completed_at')->nullable()->index();
            });
            $createdCompletedCol = true;
        }

        $createdSnapshotCol = false;
        if (! Schema::hasColumn('announcements', 'recipient_snapshot_at')) {
            Schema::table('announcements', function (Blueprint $table) {
                $table->timestamp('recipient_snapshot_at')->nullable();
            });
            $createdSnapshotCol = true;
        }

        if ($createdCompletedCol || $createdSnapshotCol) {
            if (! Schema::hasTable('_announcement_columns_created')) {
                Schema::create('_announcement_columns_created', function (Blueprint $table) {
                    $table->id();
                    $table->boolean('delivery_completed_at')->default(false);
                    $table->boolean('recipient_snapshot_at')->default(false);
                });
                DB::table('_announcement_columns_created')->insert([
                    'delivery_completed_at' => $createdCompletedCol,
                    'recipient_snapshot_at' => $createdSnapshotCol,
                ]);
            }
        }

        if (Schema::hasTable('announcement_recipients')) {
            $existing = Schema::getColumnListing('announcement_recipients');
            $missing = array_diff(self::RECIPIENT_COLUMNS, $existing);
            if (! empty($missing)) {
                throw new RuntimeException(
                    "Unexpected partial schema state: 'announcement_recipients' table already exists but is missing required column(s): " . implode(', ', $missing) . '.'
                );
            }
        } else {
            Schema::create('announcement_recipients', function (Blueprint $table) {
                $table->id();
                $table->foreignId('announcement_id')->constrained()->restrictOnDelete();
                $table->foreignId('user_id')->constrained()->restrictOnDelete();
                $table->timestamps();
                $table->unique(['announcement_id', 'user_id']);
            });

            Schema::create('_announcement_recipients_created', function (Blueprint $table) {
                $table->id();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('announcement_recipients')
            && DB::table('announcement_recipients')->exists()) {
            throw new RuntimeException('Export announcement recipient history before rolling back.');
        }

        if (Schema::hasTable('announcements')
            && (Schema::hasColumn('announcements', 'delivery_completed_at')
                || Schema::hasColumn('announcements', 'recipient_snapshot_at'))) {
            $hasDeliveryHistory = Schema::hasColumn('announcements', 'delivery_completed_at')
                && DB::table('announcements')->whereNotNull('delivery_completed_at')->exists();
            $hasSnapshotHistory = Schema::hasColumn('announcements', 'recipient_snapshot_at')
                && DB::table('announcements')->whereNotNull('recipient_snapshot_at')->exists();

            if ($hasDeliveryHistory || $hasSnapshotHistory) {
                throw new RuntimeException('Export announcement delivery state before rolling back.');
            }
        }

        if (Schema::hasTable('_announcement_recipients_created')) {
            Schema::dropIfExists('announcement_recipients');
            Schema::dropIfExists('_announcement_recipients_created');
        }

        if (Schema::hasTable('_announcement_columns_created') && Schema::hasTable('announcements')) {
            $tracking = DB::table('_announcement_columns_created')->first();
            $colsToDrop = [];
            if ($tracking?->delivery_completed_at && Schema::hasColumn('announcements', 'delivery_completed_at')) {
                $colsToDrop[] = 'delivery_completed_at';
            }
            if ($tracking?->recipient_snapshot_at && Schema::hasColumn('announcements', 'recipient_snapshot_at')) {
                $colsToDrop[] = 'recipient_snapshot_at';
            }
            if (! empty($colsToDrop)) {
                Schema::table('announcements', function (Blueprint $table) use ($colsToDrop) {
                    $table->dropColumn($colsToDrop);
                });
            }
            Schema::dropIfExists('_announcement_columns_created');
        }
    }
};
