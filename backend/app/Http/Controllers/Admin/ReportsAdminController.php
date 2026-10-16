<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AiUsageLog;
use App\Models\Diagnostic;
use App\Models\MaintenanceRecord;
use App\Models\Payment;
use App\Models\RepairShop;
use App\Models\ServiceReferral;
use App\Models\User;
use App\Models\Vehicle;

class ReportsAdminController extends Controller
{
    public function index()
    {
        $stats = [
            'total_users' => User::where('role', User::ROLE_USER)->count(),
            'total_vehicles' => Vehicle::count(),
            'active_vehicles' => Vehicle::whereNull('archived_at')->count(),
            'archived_vehicles' => Vehicle::whereNotNull('archived_at')->count(),
            'diagnostics' => Diagnostic::count(),
            'ai_successful' => AiUsageLog::where('status', 'success')->count(),
            'ai_failed' => AiUsageLog::where('status', 'failed')->count(),
            'pending_payments' => Payment::where('status', Payment::STATUS_PENDING)->count(),
            'approved_payments' => Payment::where('status', Payment::STATUS_APPROVED)->count(),
            'active_repair_shops' => RepairShop::where('is_active', true)->count(),
            'service_referrals' => ServiceReferral::count(),
            'maintenance_records' => MaintenanceRecord::count(),
        ];

        return view('admin.reports.index', compact('stats'));
    }
}
