<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DiagnosticMedia extends Model
{
    use HasFactory;

    protected $table = 'diagnostic_media';

    protected $fillable = [
        'diagnostic_id',
        'type',
        'storage_path',
        'url',
        'mime_type',
    ];

    public function diagnostic(): BelongsTo
    {
        return $this->belongsTo(Diagnostic::class);
    }
}
