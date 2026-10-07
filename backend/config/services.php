<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'gemini' => [
        'api_key' => env('GEMINI_API_KEY'),
        'model' => env('GEMINI_MODEL', 'gemini-3.7-flash'),
    ],

    'gemini_cache' => [
        'enabled' => env('GEMINI_CACHE_ENABLED', true),
        'ttl_days' => (int) env('GEMINI_CACHE_TTL_DAYS', 30),
    ],

    'ai_service' => [
        'url' => env('AI_SERVICE_URL', 'http://127.0.0.1:5000'),
        'secret' => env('AI_SERVICE_SECRET', 'vehicare_internal_ai_secret_key_2026'),
    ],

    'ai_limits' => [
        'guest' => [
            'limit' => (int) env('AI_LIMIT_GUEST', 5),
            'period' => 'total',
            'max_image_mb' => (int) env('AI_MEDIA_MAX_IMAGE_SIZE_GUEST', 5),
            'max_video_mb' => (int) env('AI_MEDIA_MAX_VIDEO_SIZE_GUEST', 10),
            'max_video_sec' => (int) env('AI_MEDIA_MAX_VIDEO_DURATION_GUEST', 20),
            'max_audio_sec' => (int) env('AI_MEDIA_MAX_AUDIO_DURATION_GUEST', 30),
        ],
        'free' => [
            'limit' => (int) env('FREE_AI_MONTHLY_LIMIT', 10),
            'period' => 'monthly',
            'max_image_mb' => (int) env('AI_MEDIA_MAX_IMAGE_SIZE_FREE', 10),
            'max_video_mb' => (int) env('AI_MEDIA_MAX_VIDEO_SIZE_FREE', 15),
            'max_video_sec' => (int) env('AI_MEDIA_MAX_VIDEO_DURATION_FREE', 30),
            'max_audio_sec' => (int) env('AI_MEDIA_MAX_AUDIO_DURATION_FREE', 60),
        ],
        'premium' => [
            'limit' => (int) env('PREMIUM_AI_MONTHLY_LIMIT', 100),
            'period' => 'monthly',
            'max_image_mb' => (int) env('AI_MEDIA_MAX_IMAGE_SIZE_PREMIUM', 15),
            'max_video_mb' => (int) env('AI_MEDIA_MAX_VIDEO_SIZE_PREMIUM', 30),
            'max_video_sec' => (int) env('AI_MEDIA_MAX_VIDEO_DURATION_PREMIUM', 60),
            'max_audio_sec' => (int) env('AI_MEDIA_MAX_AUDIO_DURATION_PREMIUM', 120),
        ],
    ],

];
