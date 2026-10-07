<?php

$defaultDriver = env('BROADCAST_CONNECTION', 'log');

// If reverb or pusher driver is configured but composer package is not installed, fallback safely to 'log'
if (in_array($defaultDriver, ['reverb', 'pusher'], true) && ! class_exists('Pusher\\Pusher') && ! class_exists('Laravel\\Reverb\\Application')) {
    $defaultDriver = 'log';
}

return [

    'default' => $defaultDriver,

    'connections' => [

        'reverb' => [
            'driver' => 'reverb',
            'key' => env('REVERB_APP_KEY', 'vehicare_key_2026'),
            'secret' => env('REVERB_APP_SECRET', 'vehicare_secret_2026'),
            'app_id' => env('REVERB_APP_ID', 'vehicare_app'),
            'options' => [
                'host' => env('REVERB_HOST', '127.0.0.1'),
                'port' => (int) env('REVERB_PORT', 8080),
                'scheme' => env('REVERB_SCHEME', 'http'),
                'useTLS' => env('REVERB_SCHEME', 'http') === 'https',
            ],
            'client_options' => [],
        ],

        'pusher' => [
            'driver' => 'pusher',
            'key' => env('PUSHER_APP_KEY', env('REVERB_APP_KEY', 'vehicare_key_2026')),
            'secret' => env('PUSHER_APP_SECRET', env('REVERB_APP_SECRET', 'vehicare_secret_2026')),
            'app_id' => env('PUSHER_APP_ID', env('REVERB_APP_ID', 'vehicare_app')),
            'options' => [
                'cluster' => env('PUSHER_APP_CLUSTER'),
                'host' => env('PUSHER_HOST', env('REVERB_HOST', '127.0.0.1')),
                'port' => (int) env('PUSHER_PORT', env('REVERB_PORT', 8080)),
                'scheme' => env('PUSHER_SCHEME', env('REVERB_SCHEME', 'http')),
                'encrypted' => true,
                'useTLS' => env('PUSHER_SCHEME', env('REVERB_SCHEME', 'http')) === 'https',
            ],
            'client_options' => [],
        ],

        'log' => [
            'driver' => 'log',
        ],

        'null' => [
            'driver' => 'null',
        ],

    ],

];
