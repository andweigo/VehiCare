<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Laravel\Sanctum\HasApiTokens;
use App\Models\Vehicle;
use App\Models\ManualPremiumGrant;

class User extends Authenticatable
{
    public const ROLE_USER = 'user';
    public const ROLE_ADMIN = 'admin';

    public const SUBSCRIPTION_FREE = 'free';
    public const SUBSCRIPTION_PREMIUM = 'premium';

    public const SUBSCRIPTION_STATUS_ACTIVE = 'active';
    public const SUBSCRIPTION_STATUS_EXPIRED = 'expired';
    public const SUBSCRIPTION_STATUS_NONE = 'none';

    public const SUBSCRIPTION_CYCLE_MONTHLY = 'monthly';
    public const SUBSCRIPTION_CYCLE_YEARLY = 'yearly';

    public const VEHICLE_LIMIT_FREE = 1;
    public const VEHICLE_LIMIT_PREMIUM = 5;

    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'firebase_uid',
        'auth_provider',
        'avatar',
        'phone_number',
        'role',
        'subscription_plan',
        'subscription_status',
        'subscription_cycle',
        'subscription_source',
        'subscription_started_at',
        'subscription_expires_at',
        'vehicle_limit',
        'is_active',
        'active_vehicle_id',
        'email_verified_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'subscription_started_at' => 'datetime',
            'subscription_expires_at' => 'datetime',
        ];
    }

    public function checkSubscriptionStatus(): self
    {
        if ($this->subscription_plan === self::SUBSCRIPTION_PREMIUM && $this->subscription_expires_at) {
            if ($this->subscription_expires_at->isPast()) {
                $wasManualGrant = $this->subscription_source === 'manual';
                $this->update([
                    'subscription_plan' => self::SUBSCRIPTION_FREE,
                    'subscription_status' => self::SUBSCRIPTION_STATUS_EXPIRED,
                    'subscription_source' => 'none',
                    'vehicle_limit' => self::VEHICLE_LIMIT_FREE,
                ]);

                if ($wasManualGrant) {
                    $this->manualPremiumGrants()
                        ->where('status', ManualPremiumGrant::STATUS_ACTIVE)
                        ->update([
                            'status' => ManualPremiumGrant::STATUS_EXPIRED,
                            'ended_at' => now(),
                        ]);
                }
            }
        }

        return $this;
    }

    public function isAdmin(): bool
    {
        return $this->role === self::ROLE_ADMIN;
    }

    public function isPremium(): bool
    {
        return $this->subscription_plan === self::SUBSCRIPTION_PREMIUM;
    }

    public static function protectedAdminEmail(): string
    {
        return config('app.default_admin_email', 'admin@vehicare.local');
    }

    public function isActive(): bool
    {
        return $this->is_active;
    }

    public function receivesBroadcastNotificationsOn(): string
    {
        return $this->isAdmin()
            ? 'private-admin.' . $this->getKey()
            : 'private-user.' . $this->getKey();
    }

    public function vehicleAllowance(): int
    {
        return $this->subscription_plan === self::SUBSCRIPTION_PREMIUM
            ? self::VEHICLE_LIMIT_PREMIUM
            : self::VEHICLE_LIMIT_FREE;
    }

    public function vehicles(): HasMany
    {
        return $this->hasMany(Vehicle::class);
    }

    public function activeVehicles(): HasMany
    {
        return $this->hasMany(Vehicle::class)->whereNull('archived_at');
    }

    public function activeVehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class, 'active_vehicle_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(\App\Models\Payment::class)->orderByDesc('created_at');
    }

    public function latestPayment()
    {
        return $this->hasOne(\App\Models\Payment::class)->latestOfMany();
    }

    public function manualPremiumGrants(): HasMany
    {
        return $this->hasMany(ManualPremiumGrant::class)->latest('granted_at');
    }
}
