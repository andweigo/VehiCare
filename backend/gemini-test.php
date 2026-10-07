<?php

$apiKey = getenv('GEMINI_API_KEY') ?: ($_ENV['GEMINI_API_KEY'] ?? '');
if (empty($apiKey)) {
    echo "ERROR: GEMINI_API_KEY environment variable is not set." . PHP_EOL;
    exit(1);
}

$url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent';

$payload = [
    'contents' => [
        [
            'parts' => [
                [
                    'text' => 'Reply with exactly: VehiCare AI is connected.'
                ]
            ]
        ]
    ]
];

$ch = curl_init($url);

curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'x-goog-api-key: ' . $apiKey,
    ],
    CURLOPT_POSTFIELDS => json_encode($payload),
]);

$result = curl_exec($ch);

echo "HTTP STATUS: " . curl_getinfo($ch, CURLINFO_HTTP_CODE) . PHP_EOL;
echo "CURL ERROR: " . curl_error($ch) . PHP_EOL;
echo "CURL ERROR CODE: " . curl_errno($ch) . PHP_EOL;
echo PHP_EOL;
echo "RESPONSE:" . PHP_EOL;
echo $result . PHP_EOL;

curl_close($ch);