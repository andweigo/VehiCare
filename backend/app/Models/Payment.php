<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    use HasFactory;

    public const STATUS_PENDING = 'pending';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_REJECTED = 'rejected';

    public const REFUND_NOT_APPLICABLE = 'not_applicable';
    public const REFUND_PROCESSING = 'processing';
    public const REFUND_REFUNDED = 'refunded';

    public const PRICE_MONTHLY = 149.00;
    public const PRICE_YEARLY = 1490.00;

    protected $fillable = [
        'user_id',
        'plan',
        'billing_cycle',
        'amount',
        'payment_method',
        'reference_number',
        'status',
        'rejection_reason',
        'refund_status',
        'refund_amount',
        'submitted_at',
        'verified_at',
        'refunded_at',
        'admin_id',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'refund_amount' => 'decimal:2',
            'submitted_at' => 'datetime',
            'verified_at' => 'datetime',
            'refunded_at' => 'datetime',
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

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    public function isApproved(): bool
    {
        return $this->status === self::STATUS_APPROVED;
    }

    public function isRejected(): bool
    {
        return $this->status === self::STATUS_REJECTED;
    }

    public function isRefundProcessing(): bool
    {
        return $this->refund_status === self::REFUND_PROCESSING;
    }

    public function isRefunded(): bool
    {
        return $this->refund_status === self::REFUND_REFUNDED;
    }

    /**
     * Calculate price for billing cycle.
     */
    public static function getPriceForCycle(string $cycle): float
    {
        return strtolower($cycle) === User::SUBSCRIPTION_CYCLE_YEARLY
            ? self::PRICE_YEARLY
            : self::PRICE_MONTHLY;
    }
}
