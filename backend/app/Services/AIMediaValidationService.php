<?php

namespace App\Services;

class AIMediaValidationService
{
    /**
     * Supported video MIME types.
     */
    protected array $allowedVideoMimes = [
        'video/mp4',
        'video/quicktime', // MOV
        'video/x-m4v',
        'video/3gpp',
    ];

    /**
     * Validate video payload against tier constraints.
     */
    public function validateVideo(
        string $mimeType,
        int $fileSizeBytes,
        ?int $durationSeconds,
        array $tierVideoConfig
    ): array {
        $mimeType = strtolower(trim($mimeType));
        if (!in_array($mimeType, $this->allowedVideoMimes, true)) {
            return [
                'valid' => false,
                'error' => 'unsupported_video_format',
                'message' => 'This video format isn\'t supported. Please use MP4 or MOV.',
            ];
        }

        $maxBytes = ($tierVideoConfig['max_size_mb'] ?? 15) * 1024 * 1024;
        if ($fileSizeBytes > $maxBytes) {
            $maxMb = $tierVideoConfig['max_size_mb'] ?? 15;
            return [
                'valid' => false,
                'error' => 'video_too_large',
                'message' => "This video is too large. Your plan allows videos up to {$maxMb} MB.",
            ];
        }

        $maxSec = $tierVideoConfig['max_duration_seconds'] ?? 30;
        if ($durationSeconds !== null && $durationSeconds > $maxSec) {
            return [
                'valid' => false,
                'error' => 'video_too_long',
                'message' => "This video is too long. Your plan allows videos up to {$maxSec} seconds.",
            ];
        }

        return ['valid' => true];
    }

    /**
     * Validate audio payload against tier constraints.
     */
    public function validateAudio(
        int $fileSizeBytes,
        ?int $durationSeconds,
        array $tierAudioConfig
    ): array {
        $maxSec = $tierAudioConfig['max_audio_sec'] ?? 60;
        if ($durationSeconds !== null && $durationSeconds > $maxSec) {
            return [
                'valid' => false,
                'error' => 'audio_too_long',
                'message' => "This audio recording is too long. Your plan allows sound recordings up to {$maxSec} seconds.",
            ];
        }

        return ['valid' => true];
    }

    /**
     * Validate image payload against tier constraints.
     */
    public function validateImage(
        int $fileSizeBytes,
        array $tierImageConfig
    ): array {
        $maxMb = $tierImageConfig['max_image_mb'] ?? 10;
        $maxBytes = $maxMb * 1024 * 1024;

        if ($fileSizeBytes > $maxBytes) {
            return [
                'valid' => false,
                'error' => 'image_too_large',
                'message' => "This image is too large. Your plan allows images up to {$maxMb} MB.",
            ];
        }

        return ['valid' => true];
    }
}
