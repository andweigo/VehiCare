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
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'firebase_uid')) {
                $table->string('firebase_uid')->nullable()->after('email');
            }

            if (!Schema::hasColumn('users', 'avatar')) {
                $table->string('avatar')->nullable()->after('firebase_uid');
            }

            if (!Schema::hasColumn('users', 'role')) {
                $table->string('role')->default('user')->after('avatar');
            }
        });

        if (!Schema::hasColumn('users', 'firebase_uid')) {
            Schema::table('users', function (Blueprint $table) {
                $table->unique('firebase_uid');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['firebase_uid', 'avatar', 'role']);
        });
    }
};
