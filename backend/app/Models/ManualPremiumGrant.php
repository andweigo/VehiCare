<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ManualPremiumGrant extends Model
{
    public const STATUS_ACTIVE = 'active';
    public const STATUS_EXPIRED = 'expired';
    public const STATUS_REVOKED = 'revoked';
    public const STATUS_SUPERSEDED = 'superseded';

    protected $fillable = [
        'user_id',
        'admin_id',
        'revoked_by',
        'billing_cycle',
        'reason',
        'revocation_reason',
        'status',
        'granted_at',
        'expires_at',
        'ended_at',
    ];

    protected function casts(): array
    {
        return [
            'granted_at' => 'datetime',
            'expires_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }

    public function revokedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'revoked_by');
    }
}
