<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('repair_shops', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('vehicle_category')->default('all'); // car, motorcycle, bicycle, all
            $table->string('address');
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->string('phone_number')->nullable();
            $table->decimal('rating', 3, 2)->default(4.5);
            $table->boolean('is_certified')->default(true);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('repair_shops');
    }
};
