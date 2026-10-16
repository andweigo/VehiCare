<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class SystemHealthAdminController extends Controller
{
    public function index()
    {
        try {
            DB::connection()->select('SELECT 1');
            $database = 'healthy';
        } catch (\Throwable $exception) {
            report($exception);
            $database = 'unavailable';
        }

        try {
            $response = Http::timeout(3)
                ->connectTimeout(2)
                ->get(rtrim((string) config('services.ai_service.url'), '/') . '/api/health');
            $aiService = $response->successful() && $response->json('status') === 'ok'
                ? 'healthy'
                : 'unavailable';
        } catch (\Throwable $exception) {
            report($exception);
            $aiService = 'unavailable';
        }

        $broadcast = config('broadcasting.default');
        $reverbConfig = config('broadcasting.connections.reverb', []);
        $reverbConfigured = $broadcast === 'reverb'
            && filled($reverbConfig['key'] ?? null)
            && filled($reverbConfig['secret'] ?? null)
            && ($reverbConfig['secret'] ?? null) !== 'vehicare_secret_2026';

        return view('admin.health.index', compact('database', 'aiService', 'broadcast', 'reverbConfigured'));
    }
}
