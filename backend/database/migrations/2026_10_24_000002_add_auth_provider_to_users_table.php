<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'auth_provider')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('auth_provider', 24)->default('email')->after('firebase_uid');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('users', 'auth_provider')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('auth_provider');
            });
        }
    }
};
