<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('diagnostics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('vehicle_id')->nullable()->constrained()->nullOnDelete();
            $table->string('input_type')->default('text'); // text, image, voice
            $table->text('symptoms');
            $table->string('image_path')->nullable();
            
            // AI Response JSON fields
            $table->text('summary');
            $table->unsignedInteger('confidence')->default(85);
            $table->enum('severity', ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'])->default('LOW');
            $table->string('urgency')->default('Routine Inspection');
            $table->json('possible_causes')->nullable();
            $table->json('recommended_actions')->nullable();
            $table->decimal('estimated_cost_min', 10, 2)->default(0.00);
            $table->decimal('estimated_cost_max', 10, 2)->default(0.00);
            $table->string('currency', 10)->default('PHP');
            
            // Professional Help
            $table->boolean('professional_help_recommended')->default(false);
            $table->text('professional_help_reason')->nullable();
            $table->string('professional_help_priority')->nullable();
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('diagnostics');
    }
};
