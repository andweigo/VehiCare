<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Diagnostic;

class RepairAssistanceAdminController extends Controller
{
    public function index()
    {
        $assistanceItems = Diagnostic::query()
            ->with([
                'user:id,name',
                'vehicle:id,custom_brand,custom_model,custom_year,vehicle_brand_id,vehicle_model_id,vehicle_year_id',
                'vehicle.vehicleBrand:id,name',
                'vehicle.vehicleModel:id,name',
                'vehicle.vehicleYear:id,year',
            ])
            ->where(function ($query) {
                $query->where('professional_help_recommended', true)
                    ->orWhereJsonLength('repair_guidance', '>', 0);
            })
            ->latest()
            ->paginate(15);

        return view('admin.repair-assistance.index', compact('assistanceItems'));
    }
}
