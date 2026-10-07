<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ServiceReferral extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'diagnostic_id',
        'repair_shop_id',
        'shop_name',
        'shop_address',
        'shop_phone',
        'status',
        'is_custom_shop',
        'notes',
    ];

    protected $casts = [
        'is_custom_shop' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function diagnostic()
    {
        return $this->belongsTo(Diagnostic::class);
    }

    public function repairShop()
    {
        return $this->belongsTo(RepairShop::class);
    }
}
