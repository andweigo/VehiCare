<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_notification_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->onDelete('cascade');
            
            // General
            $table->boolean('push_notifications')->default(true);
            $table->boolean('in_app_notifications')->default(true);
            
            // Vehicle
            $table->boolean('vehicle_updates')->default(true);
            $table->boolean('vehicle_edit_requests')->default(true);
            
            // AI Diagnostics
            $table->boolean('diagnostic_results')->default(true);
            $table->boolean('high_severity_alerts')->default(true);
            $table->boolean('critical_alerts')->default(true);
            
            // Maintenance
            $table->boolean('maintenance_reminders')->default(true);
            $table->boolean('overdue_maintenance')->default(true);
            $table->boolean('maintenance_schedule_updates')->default(true);
            
            // Repair & Service
            $table->boolean('professional_assistance')->default(true);
            $table->boolean('nearby_repair_shops')->default(true);
            $table->boolean('service_referrals')->default(true);
            
            // Quiet Hours
            $table->boolean('quiet_hours_enabled')->default(false);
            $table->string('quiet_hours_start', 10)->default('22:00');
            $table->string('quiet_hours_end', 10)->default('07:00');
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_notification_preferences');
    }
};
