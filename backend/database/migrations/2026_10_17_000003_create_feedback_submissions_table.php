<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('feedback_submissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('category', 30);
            $table->unsignedTinyInteger('rating')->nullable();
            $table->string('subject');
            $table->text('message');
            $table->string('contact_email')->nullable();
            $table->string('status', 20)->default('new');
            $table->text('admin_notes')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        if (Schema::hasTable('feedback_submissions')
            && DB::table('feedback_submissions')->exists()) {
            throw new RuntimeException('Export feedback submissions before rolling back this migration.');
        }

        Schema::dropIfExists('feedback_submissions');
    }
};
