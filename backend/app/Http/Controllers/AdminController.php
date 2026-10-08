<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\RepairShop;
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
        $repairShops = RepairShop::query()
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->orderBy('name')
            ->get([
                'id',
                'name',
                'address',
                'latitude',
                'longitude',
                'vehicle_category',
                'type',
                'contact_number',
                'phone_number',
                'is_active',
            ]);
        $repairShopMapData = $repairShops->map(fn (RepairShop $shop) => [
            'name' => $shop->name,
            'address' => $shop->address,
            'latitude' => $shop->latitude,
            'longitude' => $shop->longitude,
            'category' => $shop->vehicle_category ?: $shop->type ?: 'General',
            'contact' => $shop->contact_number ?: $shop->phone_number,
            'active' => (bool) $shop->is_active,
        ])->values();
        $pendingAdminRequests = \App\Models\ServiceReferral::where('status', 'PENDING')->count();
        $pendingCorrectionRequests = VehicleCorrectionRequest::where('status', 'pending')->count();

        // AI Activity Chart Data (Daily for last 30 days)
        $startDate = \Carbon\Carbon::now()->subDays(30)->startOfDay();
        $rawDailyUsage = \App\Models\Diagnostic::select(
                \Illuminate\Support\Facades\DB::raw('DATE(created_at) as date'),
                \Illuminate\Support\Facades\DB::raw('COUNT(*) as total_runs')
            )
            ->where('created_at', '>=', $startDate)
            ->groupBy(\Illuminate\Support\Facades\DB::raw('DATE(created_at)'))
            ->orderBy('date', 'ASC')
            ->get()
            ->keyBy('date');

        $aiChartLabels = [];
        $aiChartData = [];
        for ($i = 29; $i >= 0; $i--) {
            $dateObj = \Carbon\Carbon::now()->subDays($i);
            $dateStr = $dateObj->format('Y-m-d');
            $aiChartLabels[] = $dateObj->format('M d');
            $aiChartData[] = isset($rawDailyUsage[$dateStr]) ? (int)$rawDailyUsage[$dateStr]->total_runs : 0;
        }

        return view('admin.dashboard', compact(
            'totalUsers',
            'activeUsers',
            'freeUsers',
            'premiumUsers',
            'totalVehicles',
            'totalAdmins',
            'recentUsers',
            'diagnosticsPerformed',
            'repairShops',
            'repairShopMapData',
            'pendingAdminRequests',
            'pendingCorrectionRequests',
            'aiChartLabels',
            'aiChartData'
        ));
    }
}
