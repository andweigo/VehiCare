<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserConsent extends Model
{
    public const TYPE_TERMS = 'terms';
    public const TYPE_PRIVACY = 'privacy';

    public const SOURCE_REGISTRATION = 'registration';
    public const SOURCE_REACCEPTANCE = 'reacceptance';
    public const SOURCE_SETTINGS = 'settings';

    protected $fillable = [
        'user_id',
        'document_type',
        'document_version',
        'accepted_at',
        'source',
    ];

    protected function casts(): array
    {
        return [
            'accepted_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Idempotently record acceptance of the current versions of both documents.
     */
    public static function recordCurrentVersions(User $user, string $source): void
    {
        $now = now();

        foreach ([
            self::TYPE_TERMS => (string) config('legal.terms_version'),
            self::TYPE_PRIVACY => (string) config('legal.privacy_version'),
        ] as $type => $version) {
            static::firstOrCreate(
                [
                    'user_id' => $user->id,
                    'document_type' => $type,
                    'document_version' => $version,
                ],
                [
                    'accepted_at' => $now,
                    'source' => $source,
                ]
            );
        }
    }

    public static function hasAcceptedCurrentVersions(User $user): bool
    {
        return static::where('user_id', $user->id)
            ->where(function ($query) {
                $query->where(function ($q) {
                    $q->where('document_type', self::TYPE_TERMS)
                        ->where('document_version', (string) config('legal.terms_version'));
                })->orWhere(function ($q) {
                    $q->where('document_type', self::TYPE_PRIVACY)
                        ->where('document_version', (string) config('legal.privacy_version'));
                });
            })
            ->count() >= 2;
    }
}
