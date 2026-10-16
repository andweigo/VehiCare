<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const ANNOUNCEMENT_COLUMNS = [
        'id',
        'title',
        'body',
        'audience',
        'status',
        'scheduled_at',
        'expires_at',
        'published_at',
        'created_by',
        'created_at',
        'updated_at',
    ];

    private const DELIVERY_COLUMNS = [
        'id',
        'announcement_id',
        'user_id',
        'created_at',
        'updated_at',
    ];

    public function up(): void
    {
        $hasAnnouncements = Schema::hasTable('announcements');
        $hasDeliveries = Schema::hasTable('announcement_deliveries');

        if ($hasAnnouncements) {
            $existing = Schema::getColumnListing('announcements');
            $missing = array_diff(self::ANNOUNCEMENT_COLUMNS, $existing);
            if (! empty($missing)) {
                throw new RuntimeException(
                    "Unexpected partial schema state: 'announcements' table already exists but is missing required column(s): " . implode(', ', $missing) . '.'
                );
            }
        }

        if ($hasDeliveries) {
            $existing = Schema::getColumnListing('announcement_deliveries');
            $missing = array_diff(self::DELIVERY_COLUMNS, $existing);
            if (! empty($missing)) {
                throw new RuntimeException(
                    "Unexpected partial schema state: 'announcement_deliveries' table already exists but is missing required column(s): " . implode(', ', $missing) . '.'
                );
            }
        }

        if ($hasAnnouncements !== $hasDeliveries) {
            $existingTable = $hasAnnouncements ? 'announcements' : 'announcement_deliveries';
            $missingTable = $hasAnnouncements ? 'announcement_deliveries' : 'announcements';
            throw new RuntimeException(
                "Unexpected partial schema state: table '{$existingTable}' exists but table '{$missingTable}' is missing."
            );
        }

        if (! $hasAnnouncements && ! $hasDeliveries) {
            Schema::create('announcements', function (Blueprint $table) {
                $table->id();
                $table->string('title', 160);
                $table->text('body');
                $table->string('audience', 20);
                $table->string('status', 20)->default('scheduled');
                $table->timestamp('scheduled_at');
                $table->timestamp('expires_at')->nullable();
                $table->timestamp('published_at')->nullable();
                $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
                $table->timestamps();
                $table->index(['status', 'scheduled_at']);
            });

            Schema::create('announcement_deliveries', function (Blueprint $table) {
                $table->id();
                $table->foreignId('announcement_id')->constrained()->restrictOnDelete();
                $table->foreignId('user_id')->constrained()->restrictOnDelete();
                $table->timestamps();
                $table->unique(['announcement_id', 'user_id']);
            });

            Schema::create('_announcements_tables_created', function (Blueprint $table) {
                $table->id();
            });
        }
    }

    public function down(): void
    {
        if ((Schema::hasTable('announcement_deliveries') && DB::table('announcement_deliveries')->exists())
            || (Schema::hasTable('announcements') && DB::table('announcements')->exists())) {
            throw new RuntimeException('Export announcement and delivery history before rolling back.');
        }

        if (! Schema::hasTable('_announcements_tables_created')) {
            // Pre-existing schema objects that this migration did not create must not be dropped.
            return;
        }

        Schema::dropIfExists('announcement_deliveries');
        Schema::dropIfExists('announcements');
        Schema::dropIfExists('_announcements_tables_created');
    }
};
