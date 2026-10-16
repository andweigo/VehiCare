<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Announcement extends Model
{
    protected $fillable = [
        'title',
        'body',
        'audience',
        'status',
        'scheduled_at',
        'expires_at',
        'published_at',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
            'expires_at' => 'datetime',
            'published_at' => 'datetime',
            'delivery_completed_at' => 'datetime',
            'recipient_snapshot_at' => 'datetime',
        ];
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function recipients(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'announcement_recipients')
            ->withTimestamps();
    }
}
