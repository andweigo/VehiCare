<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiUsageLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'guest_uuid',
        'plan',
        'input_type',
        'media_size_bytes',
        'video_duration_seconds',
        'status',
        'error_code',
        'duration_ms',
        'completed_at',
        'request_key',
        'payload_hash',
        'response_payload',
    ];

    protected function casts(): array
    {
        return [
            'completed_at' => 'datetime',
            'duration_ms' => 'integer',
            'media_size_bytes' => 'integer',
            'video_duration_seconds' => 'integer',
            'response_payload' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
