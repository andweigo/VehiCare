<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Vehicle extends Model
{
    protected $fillable = [
        'user_id',
        'vehicle_type_id',
        'vehicle_brand_id',
        'vehicle_model_id',
        'vehicle_year_id',
        'custom_brand',
        'custom_model',
        'custom_year',
        'model_number',
        'archived_at',
    ];
    
    protected $casts = [
        'archived_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function vehicleType(): BelongsTo
    {
        return $this->belongsTo(VehicleType::class);
    }

    public function vehicleBrand(): BelongsTo
    {
        return $this->belongsTo(VehicleBrand::class);
    }

    public function vehicleModel(): BelongsTo
    {
        return $this->belongsTo(VehicleModel::class);
    }

    public function vehicleYear(): BelongsTo
    {
        return $this->belongsTo(VehicleYear::class);
    }
}