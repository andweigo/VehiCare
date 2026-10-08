<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Diagnostic;
use App\Models\ServiceReferral;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Http\Request;

class MaintenanceAdminController extends Controller
{
    /**
     * Display real maintenance and diagnostic metrics across all user accounts.
     */
    public function index(Request $request)
    {
        // 1. Total System Metrics across all registered user accounts
        $totalUsers = User::where('role', User::ROLE_USER)->count();
        $totalVehicles = Vehicle::count();
        $totalDiagnostics = Diagnostic::count();
        $totalReferrals = ServiceReferral::count();

        // 2. Health & Severity Breakdown across all user vehicles
        $lowCount = Diagnostic::where('severity', 'LOW')->count();
        $moderateCount = Diagnostic::where('severity', 'MODERATE')->count();
        $highCount = Diagnostic::where('severity', 'HIGH')->count();
        $criticalCount = Diagnostic::where('severity', 'CRITICAL')->count();
        $proHelpCount = Diagnostic::where('professional_help_recommended', true)->count();

        // Count unique user vehicles requiring urgent attention
        $vehiclesNeedingAttention = Diagnostic::whereIn('severity', ['HIGH', 'CRITICAL'])
            ->whereNotNull('vehicle_id')
            ->distinct('vehicle_id')
            ->count('vehicle_id');

        // 3. Paginated list of real maintenance & diagnostic logs across all user accounts
        $query = Diagnostic::with(['user', 'vehicle.vehicleType', 'vehicle.vehicleBrand'])
            ->latest();

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('summary', 'like', "%{$search}%")
                  ->orWhere('symptoms', 'like', "%{$search}%")
                  ->orWhereHas('user', function ($uQ) use ($search) {
                      $uQ->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                  });
            });
        }

        if ($request->filled('severity') && $request->severity !== 'all') {
            $query->where('severity', strtoupper($request->severity));
        }

        $maintenanceItems = $query->paginate(15);

        return view('admin.maintenance.index', compact(
            'totalUsers',
            'totalVehicles',
            'totalDiagnostics',
            'totalReferrals',
            'lowCount',
            'moderateCount',
            'highCount',
            'criticalCount',
            'proHelpCount',
            'vehiclesNeedingAttention',
            'maintenanceItems'
        ));
    }
}
