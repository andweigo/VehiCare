<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Records which version of each legal document a user explicitly accepted.
     * No OTP codes, passwords or tokens are ever stored here.
     */
    public function up(): void
    {
        Schema::create('user_consents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('document_type', 32); // terms | privacy
            $table->string('document_version', 32);
            $table->timestamp('accepted_at');
            $table->string('source', 32)->default('registration'); // registration | reacceptance | settings
            $table->timestamps();

            // Idempotency: repeated submissions can never duplicate a record.
            $table->unique(['user_id', 'document_type', 'document_version'], 'user_consents_unique_acceptance');
            $table->index(['document_type', 'document_version']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_consents');
    }
};
