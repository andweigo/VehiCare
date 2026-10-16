<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AiRuntimeSetting;
use App\Services\AIRuntimeSettingsService;
use App\Services\AdminActionAuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SettingsAdminController extends Controller
{
    public function index(AIRuntimeSettingsService $runtimeSettings)
    {
        return view('admin.settings.index', [
            'settings' => $runtimeSettings->all(),
        ]);
    }

    public function updateAiLimits(Request $request)
    {
        $rules = ['limits' => ['required', 'array:guest,free,premium']];
        $plans = ['guest' => 20, 'free' => 100, 'premium' => 500];
        $mediaBounds = [
            'max_image_mb' => 15,
            'max_video_mb' => 30,
            'max_audio_mb' => 10,
            'max_video_sec' => 120,
            'max_audio_sec' => 300,
        ];

        foreach ($plans as $plan => $maxConsultations) {
            $rules["limits.{$plan}"] = ['required', 'array:limit,max_image_mb,max_video_mb,max_audio_mb,max_video_sec,max_audio_sec'];
            $rules["limits.{$plan}.limit"] = ['required', 'integer', "between:1,{$maxConsultations}"];
            foreach ($mediaBounds as $field => $maximum) {
                $rules["limits.{$plan}.{$field}"] = ['required', 'integer', "between:1,{$maximum}"];
            }
        }

        $validated = $request->validate($rules);

        DB::transaction(function () use ($validated, $request) {
            foreach ($validated['limits'] as $plan => $values) {
                $setting = AiRuntimeSetting::where('plan', $plan)->firstOrFail();
                $setting->update([
                    'consultation_limit' => $values['limit'],
                    'max_image_mb' => $values['max_image_mb'],
                    'max_video_mb' => $values['max_video_mb'],
                    'max_audio_mb' => $values['max_audio_mb'],
                    'max_video_seconds' => $values['max_video_sec'],
                    'max_audio_seconds' => $values['max_audio_sec'],
                    'updated_by' => $request->user()->id,
                ]);
            }
            app(AdminActionAuditService::class)->record(
                $request->user(),
                'ai_limits_updated',
                'settings',
                'ai_runtime_limits',
            );
        });

        return back()->with('status', 'AI usage and media limits updated.');
    }
}
