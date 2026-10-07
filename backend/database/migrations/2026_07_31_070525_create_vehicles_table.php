<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vehicles', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                ->constrained('users')
                ->cascadeOnDelete();

            $table->foreignId('vehicle_type_id')
                ->constrained('vehicle_types')
                ->cascadeOnDelete();

            $table->foreignId('vehicle_brand_id')
                ->constrained('vehicle_brands')
                ->cascadeOnDelete();

            $table->foreignId('vehicle_model_id')
                ->constrained('vehicle_models')
                ->cascadeOnDelete();

            $table->foreignId('vehicle_year_id')
                ->constrained('vehicle_years')
                ->cascadeOnDelete();

            $table->string('model_number')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vehicles');
    }
};