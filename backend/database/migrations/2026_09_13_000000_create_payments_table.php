<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('plan')->default('premium');
            $table->string('billing_cycle'); // monthly, yearly
            $table->decimal('amount', 10, 2);
            $table->string('payment_method'); // card, gcash
            $table->string('reference_number')->unique();
            $table->string('status')->default('pending'); // pending, approved, rejected
            $table->string('rejection_reason')->nullable();
            $table->string('refund_status')->default('not_applicable'); // not_applicable, processing, refunded
            $table->decimal('refund_amount', 10, 2)->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->timestamp('refunded_at')->nullable();
            $table->foreignId('admin_id')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
