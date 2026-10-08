<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Diagnostic;
use App\Models\ServiceReferral;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AiActivityAdminController extends Controller
{
    /**
     * Display AI Activity analytics dashboard with daily usage chart.
     */
    public function index(Request $request)
    {
        $days = (int) $request->input('days', 30);
        if ($days < 7 || $days > 90) {
            $days = 30;
        }

        $startDate = Carbon::now()->subDays($days)->startOfDay();

        $totalUsers = User::where('role', User::ROLE_USER)->count();
        $totalVehicles = Vehicle::count();
        $totalDiagnostics = Diagnostic::count();
        $totalReferrals = ServiceReferral::count();

        // Query AI Diagnostic Runs grouped by DATE(created_at)
        $rawDailyUsage = Diagnostic::select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('COUNT(*) as total_runs'),
                DB::raw('COUNT(DISTINCT user_id) as unique_users')
            )
            ->where('created_at', '>=', $startDate)
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('date', 'ASC')
            ->get()
            ->keyBy('date');

        // Build continuous date series for Chart.js
        $chartLabels = [];
        $chartData = [];
        $uniqueUserData = [];

        for ($i = $days - 1; $i >= 0; $i--) {
            $dateObj = Carbon::now()->subDays($i);
            $dateStr = $dateObj->format('Y-m-d');
            $label = $dateObj->format('M d');

            $chartLabels[] = $label;
            $count = isset($rawDailyUsage[$dateStr]) ? (int)$rawDailyUsage[$dateStr]->total_runs : 0;
            $users = isset($rawDailyUsage[$dateStr]) ? (int)$rawDailyUsage[$dateStr]->unique_users : 0;

            $chartData[] = $count;
            $uniqueUserData[] = $users;
        }

        $totalAiUsagePeriod = array_sum($chartData);
        $avgDailyUsage = round($totalAiUsagePeriod / max(1, $days), 1);

        return view('admin.ai-activity.index', compact(
            'totalUsers',
            'totalVehicles',
            'totalDiagnostics',
            'totalReferrals',
            'chartLabels',
            'chartData',
            'uniqueUserData',
            'avgDailyUsage',
            'totalAiUsagePeriod',
            'days'
        ));
    }
}
