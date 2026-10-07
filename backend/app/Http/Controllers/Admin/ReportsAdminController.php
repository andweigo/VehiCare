<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleCorrectionRequest;
use Illuminate\Http\Request;

class ReportsAdminController extends Controller
{
    public function index()
    {
        $stats = [
            'total_users' => User::where('role', User::ROLE_USER)->count(),
            'total_vehicles' => Vehicle::count(),
            'correction_requests' => VehicleCorrectionRequest::count(),
            'pending_requests' => VehicleCorrectionRequest::where('status', 'pending')->count(),
        ];

        return view('admin.reports.index', compact('stats'));
    }
}
