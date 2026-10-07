<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('diagnostic_media');
        Schema::dropIfExists('repair_records');
        Schema::dropIfExists('maintenance_records');

        Schema::create('maintenance_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('vehicle_id')->constrained()->onDelete('cascade');
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('service_type')->default('General Inspection');
            $table->timestamp('performed_at')->nullable();
            $table->decimal('cost', 10, 2)->default(0.00);
            $table->unsignedInteger('odometer')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['vehicle_id', 'created_at']);
        });

        Schema::create('repair_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('vehicle_id')->constrained()->onDelete('cascade');
            $table->string('title');
            $table->text('description')->nullable();
            $table->text('problem')->nullable();
            $table->text('solution')->nullable();
            $table->decimal('cost', 10, 2)->default(0.00);
            $table->enum('status', ['pending', 'in_progress', 'completed', 'cancelled'])->default('completed');
            $table->timestamp('performed_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['vehicle_id', 'created_at']);
        });

        Schema::create('diagnostic_media', function (Blueprint $table) {
            $table->id();
            $table->foreignId('diagnostic_id')->constrained('diagnostics')->onDelete('cascade');
            $table->enum('type', ['image', 'video'])->default('image');
            $table->string('storage_path')->nullable();
            $table->text('url')->nullable();
            $table->string('mime_type')->nullable();
            $table->timestamps();

            $table->index('diagnostic_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('diagnostic_media');
        Schema::dropIfExists('repair_records');
        Schema::dropIfExists('maintenance_records');
    }
};
