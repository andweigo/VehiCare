<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Diagnostic;
use App\Models\ServiceReferral;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Http\Request;

class AiActivityAdminController extends Controller
{
    public function index()
    {
        $totalUsers = User::where('role', User::ROLE_USER)->count();
        $totalVehicles = Vehicle::count();
        
        $totalDiagnostics = Diagnostic::count();
        $lowCount = Diagnostic::where('severity', 'LOW')->count();
        $moderateCount = Diagnostic::where('severity', 'MODERATE')->count();
        $highCount = Diagnostic::where('severity', 'HIGH')->count();
        $criticalCount = Diagnostic::where('severity', 'CRITICAL')->count();
        $proHelpCount = Diagnostic::where('professional_help_recommended', true)->count();
        $totalReferrals = ServiceReferral::count();

        $timelineEvents = Diagnostic::with(['user', 'vehicle.vehicleType', 'vehicle.vehicleBrand'])
            ->latest()
            ->take(30)
            ->get();

        return view('admin.ai-activity.index', compact(
            'totalUsers',
            'totalVehicles',
            'totalDiagnostics',
            'lowCount',
            'moderateCount',
            'highCount',
            'criticalCount',
            'proHelpCount',
            'totalReferrals',
            'timelineEvents'
        ));
    }
}
