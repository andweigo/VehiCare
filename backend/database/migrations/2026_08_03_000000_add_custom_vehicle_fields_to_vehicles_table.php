<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            $table->string('custom_brand')->nullable()->after('vehicle_year_id');
            $table->string('custom_model')->nullable()->after('custom_brand');
            $table->string('custom_year')->nullable()->after('custom_model');
        });
    }

    public function down(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            $table->dropColumn([
                'custom_brand',
                'custom_model',
                'custom_year',
            ]);
        });
    }
};
