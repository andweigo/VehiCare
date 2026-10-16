<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_usage_logs', function (Blueprint $table) {
            $table->string('status', 20)->default('pending')->change();
            $table->string('input_type', 20)->change();

            if (! Schema::hasColumn('ai_usage_logs', 'error_code')) {
                $table->string('error_code', 100)->nullable();
            }
            if (! Schema::hasColumn('ai_usage_logs', 'duration_ms')) {
                $table->unsignedInteger('duration_ms')->nullable();
            }
            if (! Schema::hasColumn('ai_usage_logs', 'completed_at')) {
                $table->timestamp('completed_at')->nullable();
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('ai_usage_logs')) {
            return;
        }

        if (Schema::hasColumn('ai_usage_logs', 'status')
            && DB::table('ai_usage_logs')->where('status', 'pending')->exists()) {
            throw new RuntimeException('Resolve pending AI usage records before rolling back status support.');
        }

        if (Schema::hasColumn('ai_usage_logs', 'input_type')
            && DB::table('ai_usage_logs')->where('input_type', 'audio')->exists()) {
            throw new RuntimeException('Export audio usage records before rolling back input type support.');
        }

        foreach (['error_code', 'duration_ms', 'completed_at'] as $column) {
            if (Schema::hasColumn('ai_usage_logs', $column)
                && DB::table('ai_usage_logs')->whereNotNull($column)->exists()) {
                throw new RuntimeException("Export AI usage {$column} history before rolling back this migration.");
            }
        }

        Schema::table('ai_usage_logs', function (Blueprint $table) {
            $table->enum('status', ['success', 'failed'])->default('success')->change();
            $table->enum('input_type', ['text', 'image', 'voice', 'video'])->default('text')->change();
            $columns = array_values(array_filter(
                ['error_code', 'duration_ms', 'completed_at'],
                fn (string $column) => Schema::hasColumn('ai_usage_logs', $column)
            ));
            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });
    }
};
