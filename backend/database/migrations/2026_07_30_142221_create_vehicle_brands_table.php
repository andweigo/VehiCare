<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vehicle_brands', function (Blueprint $table) {
            $table->id();

            $table->foreignId('vehicle_type_id')
                ->constrained('vehicle_types')
                ->cascadeOnDelete();

            $table->string('name');

            $table->timestamps();

            $table->unique(['vehicle_type_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vehicle_brands');
    }
};