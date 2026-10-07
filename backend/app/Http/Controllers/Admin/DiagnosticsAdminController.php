<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Diagnostic;
use Illuminate\Http\Request;

class DiagnosticsAdminController extends Controller
{
    public function index(Request $request)
    {
        $query = Diagnostic::with(['user', 'vehicle.vehicleType', 'vehicle.vehicleBrand', 'vehicle.vehicleModel']);

        if ($request->filled('severity')) {
            $query->where('severity', $request->severity);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('symptoms', 'like', "%{$search}%")
                  ->orWhere('summary', 'like', "%{$search}%");
            });
        }

        $diagnostics = $query->latest()->paginate(15);
        $totalCount = Diagnostic::count();

        return view('admin.diagnostics.index', compact('diagnostics', 'totalCount'));
    }

    public function show($id)
    {
        $diagnosis = Diagnostic::with(['user', 'vehicle.vehicleType', 'vehicle.vehicleBrand', 'vehicle.vehicleModel', 'serviceReferrals.repairShop'])
            ->findOrFail($id);

        return view('admin.diagnostics.show', compact('diagnosis', 'id'));
    }
}
