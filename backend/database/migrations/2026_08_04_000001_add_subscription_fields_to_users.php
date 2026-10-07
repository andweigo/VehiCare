<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'subscription_plan')) {
                $table->string('subscription_plan')->default('free')->after('role');
            }

            if (! Schema::hasColumn('users', 'vehicle_limit')) {
                $table->unsignedTinyInteger('vehicle_limit')->default(1)->after('subscription_plan');
            }
        });

        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'role')) {
                $table->string('role')->default('user')->after('avatar');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'vehicle_limit')) {
                $table->dropColumn('vehicle_limit');
            }

            if (Schema::hasColumn('users', 'subscription_plan')) {
                $table->dropColumn('subscription_plan');
            }
        });
    }
};
