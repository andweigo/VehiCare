<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_usage_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('guest_uuid')->nullable()->index();
            $table->enum('plan', ['guest', 'free', 'premium'])->default('guest');
            $table->enum('input_type', ['text', 'image', 'voice', 'video'])->default('text');
            $table->unsignedBigInteger('media_size_bytes')->nullable();
            $table->unsignedInteger('video_duration_seconds')->nullable();
            $table->enum('status', ['success', 'failed'])->default('success');
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['guest_uuid', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_usage_logs');
    }
};
