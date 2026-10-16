<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('ai_usage_logs')) {
            if (! Schema::hasColumn('ai_usage_logs', 'request_key')) {
                Schema::table('ai_usage_logs', fn (Blueprint $table) => $table->string('request_key', 64)->nullable());
            }
            if (! Schema::hasColumn('ai_usage_logs', 'payload_hash')) {
                Schema::table('ai_usage_logs', fn (Blueprint $table) => $table->string('payload_hash', 64)->nullable());
            }
            if (! Schema::hasColumn('ai_usage_logs', 'response_payload')) {
                Schema::table('ai_usage_logs', fn (Blueprint $table) => $table->json('response_payload')->nullable());
            }
            if (! Schema::hasIndex('ai_usage_logs', 'ai_usage_logs_request_key_unique')) {
                Schema::table('ai_usage_logs', fn (Blueprint $table) => $table->unique('request_key', 'ai_usage_logs_request_key_unique'));
            }
        }

        if (Schema::hasTable('diagnostics')) {
            if (! Schema::hasColumn('diagnostics', 'request_key')) {
                Schema::table('diagnostics', fn (Blueprint $table) => $table->string('request_key', 64)->nullable());
            }
            if (! Schema::hasIndex('diagnostics', 'diagnostics_request_key_unique')) {
                Schema::table('diagnostics', fn (Blueprint $table) => $table->unique('request_key', 'diagnostics_request_key_unique'));
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('ai_usage_logs', 'response_payload')
            && DB::table('ai_usage_logs')->whereNotNull('response_payload')->exists()) {
            throw new RuntimeException('Export idempotent AI responses before rolling back request idempotency.');
        }
        if (Schema::hasColumn('ai_usage_logs', 'request_key')
            && DB::table('ai_usage_logs')->whereNotNull('request_key')->exists()) {
            throw new RuntimeException('Export AI request keys before rolling back request idempotency.');
        }
        if (Schema::hasColumn('ai_usage_logs', 'payload_hash')
            && DB::table('ai_usage_logs')->whereNotNull('payload_hash')->exists()) {
            throw new RuntimeException('Export AI request hashes before rolling back request idempotency.');
        }

        if (Schema::hasColumn('diagnostics', 'request_key')
            && DB::table('diagnostics')->whereNotNull('request_key')->exists()) {
            throw new RuntimeException('Export diagnostics with request keys before rolling back request idempotency.');
        }

        if (Schema::hasTable('ai_usage_logs')) {
            if (Schema::hasIndex('ai_usage_logs', 'ai_usage_logs_request_key_unique')) {
                Schema::table('ai_usage_logs', fn (Blueprint $table) => $table->dropUnique('ai_usage_logs_request_key_unique'));
            }
            $columns = array_values(array_filter(
                ['request_key', 'payload_hash', 'response_payload'],
                fn (string $column) => Schema::hasColumn('ai_usage_logs', $column)
            ));
            if ($columns !== []) {
                Schema::table('ai_usage_logs', fn (Blueprint $table) => $table->dropColumn($columns));
            }
        }

        if (Schema::hasTable('diagnostics')) {
            if (Schema::hasIndex('diagnostics', 'diagnostics_request_key_unique')) {
                Schema::table('diagnostics', fn (Blueprint $table) => $table->dropUnique('diagnostics_request_key_unique'));
            }
            if (Schema::hasColumn('diagnostics', 'request_key')) {
                Schema::table('diagnostics', fn (Blueprint $table) => $table->dropColumn('request_key'));
            }
        }
    }
};
