<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Diagnostics table: add maintenance_tasks and smart_recommendations JSON columns
        if (Schema::hasTable('diagnostics')) {
            Schema::table('diagnostics', function (Blueprint $table) {
                if (!Schema::hasColumn('diagnostics', 'maintenance_tasks')) {
                    $table->json('maintenance_tasks')->nullable()->after('recommended_actions');
                }
                if (!Schema::hasColumn('diagnostics', 'smart_recommendations')) {
                    $table->json('smart_recommendations')->nullable()->after('maintenance_tasks');
                }
            });
        }

        // 2. Maintenance records table: add status, diagnostic_id, due_date, is_inspection, urgency
        if (Schema::hasTable('maintenance_records')) {
            Schema::table('maintenance_records', function (Blueprint $table) {
                if (!Schema::hasColumn('maintenance_records', 'diagnostic_id')) {
                    $table->foreignId('diagnostic_id')->nullable()->after('vehicle_id')->constrained('diagnostics')->nullOnDelete();
                }
                if (!Schema::hasColumn('maintenance_records', 'status')) {
                    $table->string('status', 30)->default('completed')->after('notes');
                }
                if (!Schema::hasColumn('maintenance_records', 'due_date')) {
                    $table->timestamp('due_date')->nullable()->after('performed_at');
                }
                if (!Schema::hasColumn('maintenance_records', 'is_inspection')) {
                    $table->boolean('is_inspection')->default(true)->after('service_type');
                }
                if (!Schema::hasColumn('maintenance_records', 'urgency')) {
                    $table->string('urgency', 30)->nullable()->default('Routine')->after('is_inspection');
                }
            });
        }

        // 3. Repair records table: add diagnostic_id foreign key
        if (Schema::hasTable('repair_records')) {
            Schema::table('repair_records', function (Blueprint $table) {
                if (!Schema::hasColumn('repair_records', 'diagnostic_id')) {
                    $table->foreignId('diagnostic_id')->nullable()->after('vehicle_id')->constrained('diagnostics')->nullOnDelete();
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('repair_records')) {
            Schema::table('repair_records', function (Blueprint $table) {
                if (Schema::hasColumn('repair_records', 'diagnostic_id')) {
                    $table->dropForeign(['diagnostic_id']);
                    $table->dropColumn('diagnostic_id');
                }
            });
        }

        if (Schema::hasTable('maintenance_records')) {
            Schema::table('maintenance_records', function (Blueprint $table) {
                if (Schema::hasColumn('maintenance_records', 'diagnostic_id')) {
                    $table->dropForeign(['diagnostic_id']);
                    $table->dropColumn('diagnostic_id');
                }
                $columnsToDrop = array_filter(['status', 'due_date', 'is_inspection', 'urgency'], function ($col) {
                    return Schema::hasColumn('maintenance_records', $col);
                });
                if (!empty($columnsToDrop)) {
                    $table->dropColumn($columnsToDrop);
                }
            });
        }

        if (Schema::hasTable('diagnostics')) {
            Schema::table('diagnostics', function (Blueprint $table) {
                $columnsToDrop = array_filter(['maintenance_tasks', 'smart_recommendations'], function ($col) {
                    return Schema::hasColumn('diagnostics', $col);
                });
                if (!empty($columnsToDrop)) {
                    $table->dropColumn($columnsToDrop);
                }
            });
        }
    }
};
