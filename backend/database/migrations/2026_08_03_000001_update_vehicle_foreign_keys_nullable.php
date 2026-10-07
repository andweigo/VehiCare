<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            $table->dropForeign(['vehicle_brand_id']);
            $table->dropForeign(['vehicle_model_id']);
            $table->dropForeign(['vehicle_year_id']);
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE vehicles MODIFY vehicle_brand_id BIGINT UNSIGNED NULL');
            DB::statement('ALTER TABLE vehicles MODIFY vehicle_model_id BIGINT UNSIGNED NULL');
            DB::statement('ALTER TABLE vehicles MODIFY vehicle_year_id BIGINT UNSIGNED NULL');
        } else {
            Schema::table('vehicles', function (Blueprint $table) {
                $table->unsignedBigInteger('vehicle_brand_id')->nullable()->change();
                $table->unsignedBigInteger('vehicle_model_id')->nullable()->change();
                $table->unsignedBigInteger('vehicle_year_id')->nullable()->change();
            });
        }

        Schema::table('vehicles', function (Blueprint $table) {
            $table->foreign('vehicle_brand_id')
                ->references('id')
                ->on('vehicle_brands')
                ->cascadeOnDelete();

            $table->foreign('vehicle_model_id')
                ->references('id')
                ->on('vehicle_models')
                ->cascadeOnDelete();

            $table->foreign('vehicle_year_id')
                ->references('id')
                ->on('vehicle_years')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            $table->dropForeign(['vehicle_brand_id']);
            $table->dropForeign(['vehicle_model_id']);
            $table->dropForeign(['vehicle_year_id']);
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE vehicles MODIFY vehicle_brand_id BIGINT UNSIGNED NOT NULL');
            DB::statement('ALTER TABLE vehicles MODIFY vehicle_model_id BIGINT UNSIGNED NOT NULL');
            DB::statement('ALTER TABLE vehicles MODIFY vehicle_year_id BIGINT UNSIGNED NOT NULL');
        } else {
            Schema::table('vehicles', function (Blueprint $table) {
                $table->unsignedBigInteger('vehicle_brand_id')->nullable(false)->change();
                $table->unsignedBigInteger('vehicle_model_id')->nullable(false)->change();
                $table->unsignedBigInteger('vehicle_year_id')->nullable(false)->change();
            });
        }

        Schema::table('vehicles', function (Blueprint $table) {
            $table->foreign('vehicle_brand_id')
                ->references('id')
                ->on('vehicle_brands')
                ->cascadeOnDelete();

            $table->foreign('vehicle_model_id')
                ->references('id')
                ->on('vehicle_models')
                ->cascadeOnDelete();

            $table->foreign('vehicle_year_id')
                ->references('id')
                ->on('vehicle_years')
                ->cascadeOnDelete();
        });
    }
};
