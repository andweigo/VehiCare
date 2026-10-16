<?php

namespace App\Services;

use App\Models\AiRuntimeSetting;

class AIRuntimeSettingsService
{
    public function limitsFor(string $plan): array
    {
        $defaults = config("services.ai_limits.{$plan}");
        $setting = AiRuntimeSetting::where('plan', $plan)->first();

        if (! $setting) {
            return $defaults;
        }

        return array_merge($defaults, [
            'limit' => $setting->consultation_limit,
            'max_image_mb' => $setting->max_image_mb,
            'max_video_mb' => $setting->max_video_mb,
            'max_audio_mb' => $setting->max_audio_mb,
            'max_video_sec' => $setting->max_video_seconds,
            'max_audio_sec' => $setting->max_audio_seconds,
        ]);
    }

    public function all(): array
    {
        return collect(['guest', 'free', 'premium'])
            ->mapWithKeys(fn (string $plan) => [$plan => $this->limitsFor($plan)])
            ->all();
    }
}
