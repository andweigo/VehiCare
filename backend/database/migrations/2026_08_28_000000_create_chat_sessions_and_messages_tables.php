<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('chat_messages');
        Schema::dropIfExists('chat_sessions');

        Schema::create('chat_sessions', function (Blueprint $table) {
            $table->string('id', 191)->primary(); // session_123...
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('vehicle_id')->nullable()->constrained()->onDelete('set null');
            $table->string('title')->default('VehiCare AI Consultation');
            $table->string('type')->default('general');
            $table->enum('status', ['active', 'completed'])->default('active');
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['user_id', 'updated_at']);
            $table->index('vehicle_id');
        });

        Schema::create('chat_messages', function (Blueprint $table) {
            $table->id();
            $table->string('chat_session_id', 191);
            $table->foreign('chat_session_id')->references('id')->on('chat_sessions')->onDelete('cascade');
            $table->enum('role', ['user', 'assistant'])->default('user');
            $table->string('sender')->default('user');
            $table->text('text');
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['chat_session_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chat_messages');
        Schema::dropIfExists('chat_sessions');
    }
};
