<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RepairRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'vehicle_id',
        'diagnostic_id',
        'title',
        'description',
        'problem',
        'solution',
        'cost',
        'status',
        'performed_at',
    ];

    protected $casts = [
        'performed_at' => 'datetime',
        'cost' => 'float',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function diagnostic(): BelongsTo
    {
        return $this->belongsTo(Diagnostic::class);
    }
}
