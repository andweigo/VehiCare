<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_referrals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('diagnostic_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('repair_shop_id')->nullable()->constrained()->nullOnDelete();
            $table->string('shop_name');
            $table->string('shop_address')->nullable();
            $table->string('shop_phone')->nullable();
            $table->enum('status', ['PENDING', 'RECOMMENDED', 'ACCEPTED', 'COMPLETED', 'CANCELLED'])->default('PENDING');
            $table->boolean('is_custom_shop')->default(false); // True if user selected "I know a repair shop"
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_referrals');
    }
};
