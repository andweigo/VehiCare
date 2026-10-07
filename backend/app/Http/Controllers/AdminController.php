<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\VehicleCorrectionRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class AdminController extends Controller
{
    public function loginView()
    {
        return view('admin.login');
    }

    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (! Auth::attempt($validated, $request->boolean('remember'))) {
            return back()->withErrors(['email' => 'Invalid credentials'])->withInput();
        }

        $user = Auth::user();

        if (! $user || $user->role !== User::ROLE_ADMIN || ! $user->is_active) {
            Auth::logout();

            return back()->withErrors(['email' => 'You are not authorized to access the admin dashboard.']);
        }

        $request->session()->regenerate();

        return redirect()->route('admin.dashboard');
    }

    public function logout(Request $request)
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('admin.login');
    }

    public function dashboard()
    {
        $totalUsers = User::where('role', User::ROLE_USER)->count();
        $activeUsers = User::where('role', User::ROLE_USER)->where('is_active', true)->count();
        $freeUsers = User::where('subscription_plan', User::SUBSCRIPTION_FREE)->count();
        $premiumUsers = User::where('subscription_plan', User::SUBSCRIPTION_PREMIUM)->count();
        $totalVehicles = \App\Models\Vehicle::count();
        $totalAdmins = User::where('role', User::ROLE_ADMIN)->count();
        $recentUsers = User::where('role', User::ROLE_USER)
            ->latest('created_at')
            ->take(6)
            ->withCount('vehicles')
            ->get();
        $diagnosticsPerformed = \App\Models\Diagnostic::count();
        $pendingAdminRequests = \App\Models\ServiceReferral::where('status', 'PENDING')->count();
        $pendingCorrectionRequests = VehicleCorrectionRequest::where('status', 'pending')->count();

        return view('admin.dashboard', compact(
            'totalUsers',
            'activeUsers',
            'freeUsers',
            'premiumUsers',
            'totalVehicles',
            'totalAdmins',
            'recentUsers',
            'diagnosticsPerformed',
            'pendingAdminRequests',
            'pendingCorrectionRequests'
        ));
    }
}
