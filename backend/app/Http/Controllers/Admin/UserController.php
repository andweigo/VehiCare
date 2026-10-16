<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AdminActionAuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class UserController extends Controller
{
    protected function hasRelatedData(User $user): bool
    {
        $tables = [
            'vehicles',
            'payments',
            'diagnostics',
            'maintenance_records',
            'repair_records',
            'service_referrals',
            'vehicle_correction_requests',
            'user_notification_preferences',
            'ai_usage_logs',
            'chat_sessions',
            'manual_premium_grants',
            'feedback_submissions',
            'announcements',
            'announcement_recipients',
            'sessions',
        ];

        foreach ($tables as $table) {
            if (Schema::hasTable($table)
                && Schema::hasColumn($table, 'user_id')
                && DB::table($table)->where('user_id', $user->id)->exists()) {
                return true;
            }
        }

        $hasNotifications = Schema::hasTable('notifications')
            && DB::table('notifications')
                ->where('notifiable_id', $user->id)
                ->where('notifiable_type', User::class)
                ->exists();

        $hasPersonalAccessTokens = Schema::hasTable('personal_access_tokens')
            && DB::table('personal_access_tokens')
                ->where('tokenable_id', $user->id)
                ->where('tokenable_type', User::class)
                ->exists();

        return $hasNotifications || $hasPersonalAccessTokens;
    }

    public function index(Request $request)
    {
        $query = User::query()
            ->where('role', User::ROLE_USER)
            ->withCount(['vehicles', 'activeVehicles']);

        if ($search = $request->input('search')) {
            $query->where(function ($subQuery) use ($search) {
                $subQuery->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($subscription = $request->input('subscription')) {
            $query->where('subscription_plan', $subscription);
        }

        if ($status = $request->input('status')) {
            if ($status === 'active') {
                $query->where('is_active', true);
            } elseif ($status === 'disabled') {
                $query->where('is_active', false);
            }
        }

        $users = $query->orderByDesc('created_at')->paginate(15)->withQueryString();

        return view('admin.users.index', compact('users'));
    }

    public function show($id)
    {
        $user = User::where('role', User::ROLE_USER)
            ->with([
                'vehicles.vehicleType',
                'vehicles.vehicleBrand',
                'vehicles.vehicleModel',
                'vehicles.vehicleYear',
                'manualPremiumGrants.admin',
                'manualPremiumGrants.revokedBy',
            ])
            ->findOrFail($id);
        $user->checkSubscriptionStatus();
        $user->load(['manualPremiumGrants.admin', 'manualPremiumGrants.revokedBy']);
        $vehicleAllowance = $user->subscription_plan === User::SUBSCRIPTION_PREMIUM
            ? User::VEHICLE_LIMIT_PREMIUM
            : User::VEHICLE_LIMIT_FREE;
        $activeVehicleCount = $user->activeVehicles()->count();
        $isOverVehicleAllowance = $activeVehicleCount > $vehicleAllowance;

        return view('admin.users.show', compact(
            'user',
            'vehicleAllowance',
            'activeVehicleCount',
            'isOverVehicleAllowance'
        ));
    }

    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'is_active' => ['sometimes', 'boolean'],
        ]);

        DB::transaction(function () use ($id, $validated, $request) {
            $user = User::where('role', User::ROLE_USER)->lockForUpdate()->findOrFail($id);
            $wasActive = (bool) $user->is_active;
            $user->update(['is_active' => $validated['is_active'] ?? $user->is_active]);
            if ($wasActive !== (bool) $user->is_active) {
                app(AdminActionAuditService::class)->record($request->user(), 'user_status_changed', 'user', $user->id, [
                    'is_active' => (bool) $user->is_active,
                ]);
            }
        });

        return back()->with('status', 'User account updated successfully.');
    }

    public function toggle(Request $request, $id)
    {
        $user = DB::transaction(function () use ($id, $request) {
            $user = User::where('role', User::ROLE_USER)->lockForUpdate()->findOrFail($id);
            $user->update(['is_active' => ! $user->is_active]);
            app(AdminActionAuditService::class)->record($request->user(), 'user_status_changed', 'user', $user->id, [
                'is_active' => (bool) $user->is_active,
            ]);

            return $user;
        });

        $statusLabel = $user->is_active ? 'activated' : 'suspended';

        return back()->with('status', "User account {$statusLabel} successfully.");
    }

    public function destroy($id)
    {
        $deleted = DB::transaction(function () use ($id) {
            $user = User::where('role', User::ROLE_USER)
                ->lockForUpdate()
                ->findOrFail($id);

            if ($this->hasRelatedData($user)) {
                return false;
            }

            if (Schema::hasTable('password_reset_tokens')) {
                DB::table('password_reset_tokens')
                    ->where('email', $user->email)
                    ->delete();
            }

            app(AdminActionAuditService::class)->record(request()->user(), 'user_deleted', 'user', $user->id);
            $user->delete();

            return true;
        }, 3);

        if (! $deleted) {
            return redirect()->route('admin.users.index')
                ->withErrors(['user' => 'This user cannot be deleted while related account, payment, vehicle, maintenance, diagnostic, consultation, referral, or notification records exist. Deactivate the account instead.']);
        }

        return redirect()->route('admin.users.index')->with('status', 'User account deleted successfully.');
    }
}
