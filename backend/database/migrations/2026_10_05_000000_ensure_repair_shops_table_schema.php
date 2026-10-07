<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('repair_shops')) {
            Schema::create('repair_shops', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('type')->nullable();
                $table->string('vehicle_category')->nullable()->default('car');
                $table->text('address');
                $table->decimal('latitude', 10, 7);
                $table->decimal('longitude', 10, 7);
                $table->string('contact_number')->nullable();
                $table->string('phone_number')->nullable();
                $table->text('operating_hours')->nullable();
                $table->string('source')->default('admin');
                $table->boolean('is_active')->default(true);
                $table->float('rating')->nullable()->default(4.8);
                $table->boolean('is_certified')->default(true);
                $table->timestamps();

                $table->index(['latitude', 'longitude']);
            });
        } else {
            Schema::table('repair_shops', function (Blueprint $table) {
                if (!Schema::hasColumn('repair_shops', 'type')) {
                    $table->string('type')->nullable()->after('name');
                }
                if (!Schema::hasColumn('repair_shops', 'vehicle_category')) {
                    $table->string('vehicle_category')->nullable()->default('car')->after('type');
                }
                if (!Schema::hasColumn('repair_shops', 'contact_number')) {
                    $table->string('contact_number')->nullable()->after('longitude');
                }
                if (!Schema::hasColumn('repair_shops', 'phone_number')) {
                    $table->string('phone_number')->nullable()->after('contact_number');
                }
                if (!Schema::hasColumn('repair_shops', 'operating_hours')) {
                    $table->text('operating_hours')->nullable()->after('phone_number');
                }
                if (!Schema::hasColumn('repair_shops', 'source')) {
                    $table->string('source')->default('admin')->after('operating_hours');
                }
                if (!Schema::hasColumn('repair_shops', 'is_active')) {
                    $table->boolean('is_active')->default(true)->after('source');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Safe down method
    }
};
