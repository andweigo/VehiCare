<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AIUsageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AIUsageController extends Controller
{
    protected AIUsageService $usageService;

    public function __construct(AIUsageService $usageService)
    {
        $this->usageService = $usageService;
    }

    /**
     * Return AI usage statistics for authenticated user or guest.
     */
    public function show(Request $request)
    {
        $user = Auth::guard('sanctum')->user() ?? Auth::user();
        $guestUuid = $request->header('X-Guest-UUID') ?: $request->input('guest_uuid');

        $stats = $this->usageService->getUsageStats($user, $guestUuid);

        return response()->json([
            'status' => 'success',
            'data' => $stats,
        ]);
    }
}
