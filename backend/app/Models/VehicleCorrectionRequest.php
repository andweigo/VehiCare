<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\AsArrayObject;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VehicleCorrectionRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'vehicle_id',
        'requested_fields',
        'current_values',
        'requested_values',
        'reason',
        'admin_notes',
        'approved_by',
        'status',
        'submitted_at',
        'approved_at',
        'rejected_at',
        'completed_at',
        'edit_expires_at',
    ];

    protected $casts = [
        'requested_fields' => AsArrayObject::class,
        'current_values' => AsArrayObject::class,
        'requested_values' => AsArrayObject::class,
        'submitted_at' => 'datetime',
        'approved_at' => 'datetime',
        'rejected_at' => 'datetime',
        'completed_at' => 'datetime',
        'edit_expires_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function isApproved(): bool
    {
        return $this->status === 'approved' && $this->edit_expires_at && $this->edit_expires_at->isFuture();
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    public function isRejected(): bool
    {
        return $this->status === 'rejected';
    }

    public function isExpired(): bool
    {
        return $this->status === 'expired' || ($this->status === 'approved' && $this->edit_expires_at && $this->edit_expires_at->isPast());
    }
}
