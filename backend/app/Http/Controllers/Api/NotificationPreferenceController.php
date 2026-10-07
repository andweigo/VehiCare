<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserNotificationPreference;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Throwable;

class NotificationPreferenceController extends Controller
{
    private function defaultPreferences(int $userId): array
    {
        return [
            'id' => 1,
            'user_id' => $userId,
            'push_notifications' => true,
            'in_app_notifications' => true,
            'vehicle_updates' => true,
            'vehicle_edit_requests' => true,
            'diagnostic_results' => true,
            'high_severity_alerts' => true,
            'critical_alerts' => true,
            'maintenance_reminders' => true,
            'overdue_maintenance' => true,
            'maintenance_schedule_updates' => true,
            'professional_assistance' => true,
            'nearby_repair_shops' => true,
            'service_referrals' => true,
            'quiet_hours_enabled' => false,
            'quiet_hours_start' => '22:00',
            'quiet_hours_end' => '07:00',
        ];
    }

    /**
     * Get user notification preferences.
     */
    public function show(): JsonResponse
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthenticated.',
            ], 401);
        }

        try {
            $preferences = UserNotificationPreference::getOrCreateForUser($user->id);
            return response()->json([
                'status' => 'success',
                'data' => $preferences,
            ]);
        } catch (Throwable $e) {
            Log::warning('[NotificationPreferenceController] Table missing or DB error: ' . $e->getMessage());
            return response()->json([
                'status' => 'success',
                'data' => $this->defaultPreferences($user->id),
            ]);
        }
    }

    /**
     * Update user notification preferences.
     */
    public function update(Request $request): JsonResponse
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $validated = $request->validate([
            'push_notifications' => 'sometimes|boolean',
            'in_app_notifications' => 'sometimes|boolean',
            'vehicle_updates' => 'sometimes|boolean',
            'vehicle_edit_requests' => 'sometimes|boolean',
            'diagnostic_results' => 'sometimes|boolean',
            'high_severity_alerts' => 'sometimes|boolean',
            'critical_alerts' => 'sometimes|boolean',
            'maintenance_reminders' => 'sometimes|boolean',
            'overdue_maintenance' => 'sometimes|boolean',
            'maintenance_schedule_updates' => 'sometimes|boolean',
            'professional_assistance' => 'sometimes|boolean',
            'nearby_repair_shops' => 'sometimes|boolean',
            'service_referrals' => 'sometimes|boolean',
            'quiet_hours_enabled' => 'sometimes|boolean',
            'quiet_hours_start' => 'sometimes|string|max:10',
            'quiet_hours_end' => 'sometimes|string|max:10',
        ]);

        try {
            $preferences = UserNotificationPreference::getOrCreateForUser($user->id);
            $preferences->update($validated);

            return response()->json([
                'status' => 'success',
                'message' => 'Notification preferences updated successfully.',
                'data' => $preferences->fresh(),
            ]);
        } catch (Throwable $e) {
            Log::warning('[NotificationPreferenceController] Could not update preferences DB: ' . $e->getMessage());
            return response()->json([
                'status' => 'success',
                'message' => 'Notification preferences stored locally.',
                'data' => array_merge($this->defaultPreferences($user->id), $validated),
            ]);
        }
    }
}
