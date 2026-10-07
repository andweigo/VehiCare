<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RepairShop extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'type',
        'vehicle_category',
        'address',
        'latitude',
        'longitude',
        'contact_number',
        'phone_number',
        'operating_hours',
        'source',
        'is_active',
        'rating',
        'is_certified',
    ];

    protected $casts = [
        'latitude' => 'float',
        'longitude' => 'float',
        'rating' => 'float',
        'is_certified' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function serviceReferrals()
    {
        return $this->hasMany(ServiceReferral::class);
    }
}
