<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AiDiagnosisCache extends Model
{
    use HasFactory;

    protected $table = 'ai_diagnosis_caches';

    protected $fillable = [
        'vehicle_type',
        'brand',
        'model',
        'year',
        'symptom_key',
        'language',
        'diagnosis_data',
        'hit_count',
        'expires_at',
    ];

    protected $casts = [
        'diagnosis_data' => 'array',
        'expires_at' => 'datetime',
        'hit_count' => 'integer',
    ];

    /**
     * Scope to only include active (non-expired) cache entries.
     */
    public function scopeActive($query)
    {
        return $query->where('expires_at', '>', now());
    }
}
