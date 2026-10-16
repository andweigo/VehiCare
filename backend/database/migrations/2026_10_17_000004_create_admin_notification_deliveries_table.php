<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('admin_notification_deliveries')) {
            Schema::create('admin_notification_deliveries', function (Blueprint $table) {
                $table->id();
                $table->foreignId('admin_id')->constrained('users')->cascadeOnDelete();
                $table->string('event_key', 191);
                $table->timestamps();
                $table->unique(['admin_id', 'event_key']);
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('admin_notification_deliveries')
            && DB::table('admin_notification_deliveries')->exists()) {
            throw new RuntimeException('Export admin notification delivery history before rolling back.');
        }

        Schema::dropIfExists('admin_notification_deliveries');
    }
};
