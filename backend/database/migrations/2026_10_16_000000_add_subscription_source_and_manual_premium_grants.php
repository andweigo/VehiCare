<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'subscription_source')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('subscription_source', 20)->default('none')->after('subscription_plan');
            });
        }

        DB::table('users')
            ->where('subscription_plan', 'premium')
            ->where('subscription_source', 'none')
            ->update(['subscription_source' => 'legacy']);

        DB::table('users')
            ->where('subscription_plan', 'premium')
            ->update(['vehicle_limit' => 5]);

        DB::table('users')
            ->where('subscription_plan', '!=', 'premium')
            ->update(['vehicle_limit' => 1]);

        if (! Schema::hasTable('manual_premium_grants')) {
            Schema::create('manual_premium_grants', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->restrictOnDelete();
                $table->foreignId('admin_id')->constrained('users')->restrictOnDelete();
                $table->foreignId('revoked_by')->nullable()->constrained('users')->restrictOnDelete();
                $table->string('billing_cycle', 20);
                $table->text('reason');
                $table->text('revocation_reason')->nullable();
                $table->string('status', 20)->default('active');
                $table->dateTime('granted_at');
                $table->dateTime('expires_at');
                $table->dateTime('ended_at')->nullable();
                $table->timestamps();

                $table->index(['user_id', 'status', 'expires_at']);
            });
        }

        Schema::table('payments', function (Blueprint $table) {
            if (! Schema::hasColumn('payments', 'subscription_revoked_at')) {
                $table->timestamp('subscription_revoked_at')->nullable();
            }
            if (! Schema::hasColumn('payments', 'subscription_revoked_by')) {
                $table->foreignId('subscription_revoked_by')->nullable()->constrained('users')->restrictOnDelete();
            }
            if (! Schema::hasColumn('payments', 'subscription_revocation_reason')) {
                $table->text('subscription_revocation_reason')->nullable();
            }
        });
    }

    public function down(): void
    {
        if (Schema::hasTable('manual_premium_grants') && DB::table('manual_premium_grants')->exists()) {
            throw new RuntimeException('Export manual premium grant history before rolling back this migration.');
        }

        if (Schema::hasColumn('payments', 'subscription_revoked_at')
            && DB::table('payments')->whereNotNull('subscription_revoked_at')->exists()) {
            throw new RuntimeException('Export subscription revocation history before rolling back this migration.');
        }

        Schema::dropIfExists('manual_premium_grants');

        if (Schema::hasTable('payments')) {
            $paymentColumns = array_values(array_filter([
                'subscription_revoked_at',
                'subscription_revoked_by',
                'subscription_revocation_reason',
            ], fn (string $column) => Schema::hasColumn('payments', $column)));

            if (in_array('subscription_revoked_by', $paymentColumns, true)) {
                Schema::table('payments', function (Blueprint $table) {
                    $table->dropForeign(['subscription_revoked_by']);
                });
            }

            if ($paymentColumns !== []) {
                Schema::table('payments', function (Blueprint $table) use ($paymentColumns) {
                    $table->dropColumn($paymentColumns);
                });
            }
        }

        if (Schema::hasColumn('users', 'subscription_source')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('subscription_source');
            });
        }
    }
};
