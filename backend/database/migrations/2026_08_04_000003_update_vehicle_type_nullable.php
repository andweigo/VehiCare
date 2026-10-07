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
            $table->dropForeign(['vehicle_type_id']);
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE vehicles MODIFY vehicle_type_id BIGINT UNSIGNED NULL');
        } else {
            Schema::table('vehicles', function (Blueprint $table) {
                $table->unsignedBigInteger('vehicle_type_id')->nullable()->change();
            });
        }

        Schema::table('vehicles', function (Blueprint $table) {
            $table->foreign('vehicle_type_id')
                ->references('id')
                ->on('vehicle_types')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            $table->dropForeign(['vehicle_type_id']);
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE vehicles MODIFY vehicle_type_id BIGINT UNSIGNED NOT NULL');
        } else {
            Schema::table('vehicles', function (Blueprint $table) {
                $table->unsignedBigInteger('vehicle_type_id')->nullable(false)->change();
            });
        }

        Schema::table('vehicles', function (Blueprint $table) {
            $table->foreign('vehicle_type_id')
                ->references('id')
                ->on('vehicle_types')
                ->cascadeOnDelete();
        });
    }
};
