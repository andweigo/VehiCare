<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AdminActionAuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

class AdminManagementController extends Controller
{
    public function index()
    {
        $admins = User::where('role', User::ROLE_ADMIN)
            ->orderByDesc('created_at')
            ->paginate(20)
            ->withQueryString();

        return view('admin.admins.index', compact('admins'));
    }

    public function create()
    {
        return view('admin.admins.create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'is_active' => ['required', 'boolean'],
        ]);

        DB::transaction(function () use ($validated, $request) {
            $admin = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'role' => User::ROLE_ADMIN,
                'subscription_plan' => User::SUBSCRIPTION_FREE,
                'vehicle_limit' => User::VEHICLE_LIMIT_FREE,
                'is_active' => $validated['is_active'],
            ]);
            app(AdminActionAuditService::class)->record($request->user(), 'admin_created', 'admin', $admin->id, [
                'is_active' => (bool) $admin->is_active,
            ]);
        });

        return redirect()->route('admin.admins.index')
            ->with('status', 'Admin account created successfully.');
    }

    public function toggle($id)
    {
        $result = DB::transaction(function () use ($id) {
            $admins = User::where('role', User::ROLE_ADMIN)
                ->orderBy('id')
                ->lockForUpdate()
                ->get();
            $admin = $admins->firstWhere('id', (int) $id);

            abort_if(! $admin, 404);

            if ($admin->email === User::protectedAdminEmail() && $admin->is_active) {
                return 'protected';
            }

            if ($admin->is_active && $admins->where('is_active', true)->count() <= 1) {
                return 'last';
            }

            if (auth()->id() === $admin->id) {
                return 'self';
            }

            $admin->update(['is_active' => ! $admin->is_active]);
            app(AdminActionAuditService::class)->record(auth()->user(), 'admin_status_changed', 'admin', $admin->id, [
                'is_active' => (bool) $admin->is_active,
            ]);

            return 'updated';
        }, 3);

        if ($result === 'protected') {
            return back()->withErrors(['admin' => 'The default protected admin account cannot be disabled.']);
        }

        if ($result === 'self') {
            return back()->withErrors(['admin' => 'You cannot disable your own administrator account.']);
        }

        if ($result === 'last') {
            return back()->withErrors(['admin' => 'At least one active administrator must remain available.']);
        }

        return back()->with('status', 'Admin status updated successfully.');
    }

    public function destroy($id)
    {
        $result = DB::transaction(function () use ($id) {
            $admins = User::where('role', User::ROLE_ADMIN)
                ->orderBy('id')
                ->lockForUpdate()
                ->get();
            $admin = $admins->firstWhere('id', (int) $id);

            abort_if(! $admin, 404);

            if ($admin->email === User::protectedAdminEmail()) {
                return 'protected';
            }

            if ($admin->is_active && $admins->where('is_active', true)->count() <= 1) {
                return 'last';
            }

            if (auth()->id() === $admin->id) {
                return 'self';
            }

            if (DB::table('payments')->where(function ($query) use ($admin) {
                $query->where('admin_id', $admin->id);
                if (Schema::hasColumn('payments', 'subscription_revoked_by')) {
                    $query->orWhere('subscription_revoked_by', $admin->id);
                }
            })->exists()
                || DB::table('vehicle_correction_requests')->where('approved_by', $admin->id)->exists()
                || (Schema::hasTable('manual_premium_grants')
                    && DB::table('manual_premium_grants')->where(function ($query) use ($admin) {
                        $query->where('admin_id', $admin->id)
                            ->orWhere('revoked_by', $admin->id);
                    })->exists())
                || (Schema::hasTable('announcements')
                    && DB::table('announcements')->where('created_by', $admin->id)->exists())) {
                return 'referenced';
            }

            DB::table('notifications')
                ->where('notifiable_id', $admin->id)
                ->where('notifiable_type', User::class)
                ->delete();
            $admin->delete();
            app(AdminActionAuditService::class)->record(auth()->user(), 'admin_deleted', 'admin', $admin->id);

            return 'deleted';
        }, 3);

        if ($result === 'self') {
            return back()->withErrors(['admin' => 'You cannot delete your own administrator account.']);
        }

        if ($result === 'protected') {
            return back()->withErrors(['email' => 'The default protected admin account cannot be deleted.']);
        }

        if ($result === 'last') {
            return back()->withErrors(['admin' => 'The last active administrator cannot be removed.']);
        }

        if ($result === 'referenced') {
            return back()->withErrors(['admin' => 'This administrator is referenced by payment, subscription grant, or vehicle-correction history. Disable the account instead.']);
        }

        return back()->with('status', 'Admin account removed successfully.');
    }
}
