<?php

namespace Tests\Feature;

use App\Services\AIMediaValidationService;
use Tests\TestCase;

class AIMediaValidationLimitsTest extends TestCase
{
    protected AIMediaValidationService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new AIMediaValidationService();
    }

    public function test_validates_free_tier_video_size_and_duration(): void
    {
        $freeConfig = [
            'max_size_mb' => 15,
            'max_duration_seconds' => 30,
        ];

        // 10 MB, 15 seconds - valid
        $res = $this->service->validateVideo('video/mp4', 10 * 1024 * 1024, 15, $freeConfig);
        $this->assertTrue($res['valid']);

        // 16 MB - exceeds 15 MB
        $res = $this->service->validateVideo('video/mp4', 16 * 1024 * 1024, 15, $freeConfig);
        $this->assertFalse($res['valid']);
        $this->assertSame('video_too_large', $res['error']);

        // 35 seconds - exceeds 30s
        $res = $this->service->validateVideo('video/mp4', 5 * 1024 * 1024, 35, $freeConfig);
        $this->assertFalse($res['valid']);
        $this->assertSame('video_too_long', $res['error']);
    }

    public function test_validates_premium_tier_video_size_and_duration(): void
    {
        $premiumConfig = [
            'max_size_mb' => 30,
            'max_duration_seconds' => 60,
        ];

        // 25 MB, 45 seconds - valid for premium
        $res = $this->service->validateVideo('video/mp4', 25 * 1024 * 1024, 45, $premiumConfig);
        $this->assertTrue($res['valid']);

        // 35 MB - exceeds 30 MB
        $res = $this->service->validateVideo('video/mp4', 35 * 1024 * 1024, 45, $premiumConfig);
        $this->assertFalse($res['valid']);
        $this->assertSame('video_too_large', $res['error']);
    }

    public function test_rejects_unsupported_video_mime(): void
    {
        $config = ['max_size_mb' => 30, 'max_duration_seconds' => 60];

        $res = $this->service->validateVideo('video/avi', 5 * 1024 * 1024, 10, $config);
        $this->assertFalse($res['valid']);
        $this->assertSame('unsupported_video_format', $res['error']);
    }

    public function test_deployment_configuration_includes_large_upload_directives(): void
    {
        $userIniPath = public_path('.user.ini');
        $this->assertFileExists($userIniPath);

        $content = file_get_contents($userIniPath);
        $this->assertStringContainsString('upload_max_filesize = 40M', $content);
        $this->assertStringContainsString('post_max_size = 45M', $content);
        $this->assertStringContainsString('display_errors = Off', $content);
    }
}
