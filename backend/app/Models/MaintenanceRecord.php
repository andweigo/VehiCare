<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MaintenanceRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'vehicle_id',
        'diagnostic_id',
        'title',
        'description',
        'service_type',
        'performed_at',
        'due_date',
        'status',
        'cost',
        'odometer',
        'notes',
        'is_inspection',
        'urgency',
    ];

    protected $casts = [
        'performed_at' => 'datetime',
        'due_date' => 'datetime',
        'cost' => 'float',
        'odometer' => 'integer',
        'is_inspection' => 'boolean',
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
