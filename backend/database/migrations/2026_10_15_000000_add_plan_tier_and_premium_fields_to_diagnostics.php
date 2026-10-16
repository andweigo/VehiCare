<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('diagnostics')) {
            Schema::table('diagnostics', function (Blueprint $table) {
                if (!Schema::hasColumn('diagnostics', 'plan_tier')) {
                    $table->string('plan_tier', 20)->default('free')->after('input_type');
                }
                if (!Schema::hasColumn('diagnostics', 'repair_guidance')) {
                    $table->json('repair_guidance')->nullable()->after('smart_recommendations');
                }
                if (!Schema::hasColumn('diagnostics', 'cost_breakdown')) {
                    $table->json('cost_breakdown')->nullable()->after('repair_guidance');
                }
                if (!Schema::hasColumn('diagnostics', 'history_insights')) {
                    $table->text('history_insights')->nullable()->after('cost_breakdown');
                }
                if (!Schema::hasColumn('diagnostics', 'clarification_questions')) {
                    $table->json('clarification_questions')->nullable()->after('history_insights');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('diagnostics')) {
            Schema::table('diagnostics', function (Blueprint $table) {
                $columnsToDrop = array_filter(
                    ['plan_tier', 'repair_guidance', 'cost_breakdown', 'history_insights', 'clarification_questions'],
                    fn ($col) => Schema::hasColumn('diagnostics', $col)
                );
                if (!empty($columnsToDrop)) {
                    $table->dropColumn($columnsToDrop);
                }
            });
        }
    }
};
