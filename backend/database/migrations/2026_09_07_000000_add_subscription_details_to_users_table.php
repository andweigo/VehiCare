<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'subscription_status')) {
                $table->string('subscription_status')->default('none')->after('subscription_plan');
            }

            if (! Schema::hasColumn('users', 'subscription_cycle')) {
                $table->string('subscription_cycle')->nullable()->after('subscription_status');
            }

            if (! Schema::hasColumn('users', 'subscription_started_at')) {
                $table->timestamp('subscription_started_at')->nullable()->after('subscription_cycle');
            }

            if (! Schema::hasColumn('users', 'subscription_expires_at')) {
                $table->timestamp('subscription_expires_at')->nullable()->after('subscription_started_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'subscription_expires_at')) {
                $table->dropColumn('subscription_expires_at');
            }
            if (Schema::hasColumn('users', 'subscription_started_at')) {
                $table->dropColumn('subscription_started_at');
            }
            if (Schema::hasColumn('users', 'subscription_cycle')) {
                $table->dropColumn('subscription_cycle');
            }
            if (Schema::hasColumn('users', 'subscription_status')) {
                $table->dropColumn('subscription_status');
            }
        });
    }
};
