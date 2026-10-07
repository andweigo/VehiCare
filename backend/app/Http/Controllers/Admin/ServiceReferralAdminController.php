<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ServiceReferral;
use Illuminate\Http\Request;

class ServiceReferralAdminController extends Controller
{
    public function index(Request $request)
    {
        $query = ServiceReferral::with(['user', 'diagnostic', 'repairShop']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $referrals = $query->latest()->paginate(15);

        return view('admin.service-referrals.index', compact('referrals'));
    }
}
