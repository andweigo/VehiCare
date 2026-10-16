<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('admin_action_audits')) {
            Schema::create('admin_action_audits', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('admin_id');
                $table->string('admin_name', 255);
                $table->string('action', 80);
                $table->string('subject_type', 40);
                $table->string('subject_id', 64);
                $table->json('metadata')->nullable();
                $table->timestamp('created_at');
                $table->index(['subject_type', 'subject_id', 'created_at']);
                $table->index(['action', 'created_at']);
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('admin_action_audits')
            && DB::table('admin_action_audits')->exists()) {
            throw new RuntimeException('Export administrator action history before rolling back.');
        }

        Schema::dropIfExists('admin_action_audits');
    }
};
