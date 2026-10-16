<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiRuntimeSetting extends Model
{
    protected $fillable = [
        'plan',
        'consultation_limit',
        'max_image_mb',
        'max_video_mb',
        'max_audio_mb',
        'max_video_seconds',
        'max_audio_seconds',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'consultation_limit' => 'integer',
            'max_image_mb' => 'integer',
            'max_video_mb' => 'integer',
            'max_audio_mb' => 'integer',
            'max_video_seconds' => 'integer',
            'max_audio_seconds' => 'integer',
        ];
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
