<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserNotificationPreference extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'push_notifications',
        'in_app_notifications',
        'vehicle_updates',
        'vehicle_edit_requests',
        'diagnostic_results',
        'high_severity_alerts',
        'critical_alerts',
        'maintenance_reminders',
        'overdue_maintenance',
        'maintenance_schedule_updates',
        'professional_assistance',
        'nearby_repair_shops',
        'service_referrals',
        'quiet_hours_enabled',
        'quiet_hours_start',
        'quiet_hours_end',
    ];

    protected $casts = [
        'push_notifications' => 'boolean',
        'in_app_notifications' => 'boolean',
        'vehicle_updates' => 'boolean',
        'vehicle_edit_requests' => 'boolean',
        'diagnostic_results' => 'boolean',
        'high_severity_alerts' => 'boolean',
        'critical_alerts' => 'boolean',
        'maintenance_reminders' => 'boolean',
        'overdue_maintenance' => 'boolean',
        'maintenance_schedule_updates' => 'boolean',
        'professional_assistance' => 'boolean',
        'nearby_repair_shops' => 'boolean',
        'service_referrals' => 'boolean',
        'quiet_hours_enabled' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get or create default notification preferences for a user.
     */
    public static function getOrCreateForUser(int $userId): self
    {
        return static::firstOrCreate(
            ['user_id' => $userId],
            [
                'push_notifications' => true,
                'in_app_notifications' => true,
                'vehicle_updates' => true,
                'vehicle_edit_requests' => true,
                'diagnostic_results' => true,
                'high_severity_alerts' => true,
                'critical_alerts' => true,
                'maintenance_reminders' => true,
                'overdue_maintenance' => true,
                'maintenance_schedule_updates' => true,
                'professional_assistance' => true,
                'nearby_repair_shops' => true,
                'service_referrals' => true,
                'quiet_hours_enabled' => false,
                'quiet_hours_start' => '22:00',
                'quiet_hours_end' => '07:00',
            ]
        );
    }
}
