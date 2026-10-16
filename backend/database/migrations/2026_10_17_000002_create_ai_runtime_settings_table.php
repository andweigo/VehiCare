<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('ai_runtime_settings')) {
            Schema::create('ai_runtime_settings', function (Blueprint $table) {
                $table->id();
                $table->string('plan', 10)->unique();
                $table->unsignedSmallInteger('consultation_limit');
                $table->unsignedSmallInteger('max_image_mb');
                $table->unsignedSmallInteger('max_video_mb');
                $table->unsignedSmallInteger('max_audio_mb');
                $table->unsignedSmallInteger('max_video_seconds');
                $table->unsignedSmallInteger('max_audio_seconds');
                $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }

        foreach (['guest', 'free', 'premium'] as $plan) {
            $limits = config("services.ai_limits.{$plan}");
            DB::table('ai_runtime_settings')->insertOrIgnore([
                'plan' => $plan,
                'consultation_limit' => $limits['limit'],
                'max_image_mb' => $limits['max_image_mb'],
                'max_video_mb' => $limits['max_video_mb'],
                'max_audio_mb' => $limits['max_audio_mb'],
                'max_video_seconds' => $limits['max_video_sec'],
                'max_audio_seconds' => $limits['max_audio_sec'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('ai_runtime_settings')
            && DB::table('ai_runtime_settings')->whereNotNull('updated_by')->exists()) {
            throw new RuntimeException('Export administrator-managed AI limits before rolling back this migration.');
        }

        Schema::dropIfExists('ai_runtime_settings');
    }
};
