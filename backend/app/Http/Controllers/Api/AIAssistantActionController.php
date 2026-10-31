<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AI\AIAssistantActionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AIAssistantActionController extends Controller
{
    protected AIAssistantActionService $actionService;

    public function __construct(AIAssistantActionService $actionService)
    {
        $this->actionService = $actionService;
    }

    /**
     * Execute an approved AI conversational action.
     */
    public function execute(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'action' => 'required|string|max:100',
            'parameters' => 'nullable|array',
        ]);

        $action = $validated['action'];
        $params = $validated['parameters'] ?? [];

        $result = $this->actionService->execute($user, $action, $params);

        if (!($result['success'] ?? false)) {
            $code = $result['code'] ?? 'ACTION_FAILED';
            $statusCode = match ($code) {
                'VEHICLE_LIMIT_REACHED' => 403,
                'UNAUTHORIZED_VEHICLE' => 403,
                'VEHICLE_NOT_FOUND', 'RECORD_NOT_FOUND', 'DIAGNOSTIC_NOT_FOUND', 'TASK_NOT_FOUND' => 404,
                'MISSING_REQUIRED_FIELDS', 'MISSING_TASK_TITLE', 'INVALID_VIN' => 422,
                default => 400,
            };

            return response()->json([
                'status' => 'error',
                'code' => $code,
                'message' => $result['message'] ?? 'Failed to execute requested vehicle care action.',
                'data' => $result,
            ], $statusCode);
        }

        return response()->json([
            'status' => 'success',
            'message' => $result['message'] ?? 'Action executed successfully.',
            'data' => $result,
        ], 200);
    }
}
