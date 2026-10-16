<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdminActionAudit extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'admin_id',
        'admin_name',
        'action',
        'subject_type',
        'subject_id',
        'metadata',
        'created_at',
    ];

    protected function casts(): array
    {
        return ['metadata' => 'array', 'created_at' => 'datetime'];
    }
}
