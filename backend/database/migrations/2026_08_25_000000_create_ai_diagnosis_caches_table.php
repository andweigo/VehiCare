<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('ai_diagnosis_caches');

        Schema::create('ai_diagnosis_caches', function (Blueprint $table) {
            $table->id();
            $table->string('vehicle_type', 50)->default('vehicle');
            $table->string('brand', 50)->default('generic');
            $table->string('model', 50)->default('generic');
            $table->string('year', 20)->default('generic');
            $table->string('symptom_key', 128)->index();
            $table->string('language', 10)->default('en');
            $table->json('diagnosis_data');
            $table->unsignedInteger('hit_count')->default(1);
            $table->timestamp('expires_at')->index();
            $table->timestamps();

            $table->index(
                ['vehicle_type', 'brand', 'model', 'year', 'symptom_key', 'language'],
                'idx_ai_diag_cache_lookup'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_diagnosis_caches');
    }
};
