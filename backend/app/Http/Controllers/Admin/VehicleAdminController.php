<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use App\Models\VehicleType;
use App\Models\VehicleBrand;
use App\Services\AdminActionAuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VehicleAdminController extends Controller
{
    public function index(Request $request)
    {
        $query = Vehicle::with(['user', 'vehicleType', 'vehicleBrand', 'vehicleModel', 'vehicleYear']);

        if ($search = $request->input('search')) {
            $query->where(function ($subQuery) use ($search) {
                $subQuery->where('custom_brand', 'like', "%{$search}%")
                    ->orWhere('custom_model', 'like', "%{$search}%")
                    ->orWhere('model_number', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($u) use ($search) {
                        $u->where('name', 'like', "%{$search}%")
                          ->orWhere('email', 'like', "%{$search}%");
                    })
                    ->orWhereHas('vehicleBrand', function ($b) use ($search) {
                        $b->where('name', 'like', "%{$search}%");
                    })
                    ->orWhereHas('vehicleModel', function ($m) use ($search) {
                        $m->where('name', 'like', "%{$search}%");
                    });
            });
        }

        if ($typeId = $request->input('type')) {
            $query->where('vehicle_type_id', $typeId);
        }

        if ($brandId = $request->input('brand')) {
            $query->where('vehicle_brand_id', $brandId);
        }

        if ($source = $request->input('source')) {
            if ($source === 'custom') {
                $query->where(function ($subQuery) {
                    $subQuery->whereNotNull('custom_brand')
                        ->orWhereNotNull('custom_model')
                        ->orWhereNotNull('custom_year');
                });
            } elseif ($source === 'taxonomy') {
                $query->whereNull('custom_brand')
                    ->whereNull('custom_model')
                    ->whereNull('custom_year');
            }
        }

        if ($status = $request->input('status')) {
            if ($status === 'archived') {
                $query->whereNotNull('archived_at');
            } elseif ($status === 'active') {
                $query->whereNull('archived_at');
            }
        }

        $vehicles = $query->orderByDesc('created_at')->paginate(15)->withQueryString();
        $vehicleTypes = VehicleType::select('id', 'name')->get();
        $vehicleBrands = VehicleBrand::select('id', 'name')->get();

        $totalVehicles = Vehicle::count();
        $customVehiclesCount = Vehicle::where(function ($q) {
            $q->whereNotNull('custom_brand')
              ->orWhereNotNull('custom_model')
              ->orWhereNotNull('custom_year');
        })->count();
        $taxonomyVehiclesCount = Vehicle::whereNull('custom_brand')
            ->whereNull('custom_model')
            ->whereNull('custom_year')
            ->count();

        return view('admin.vehicles.index', compact(
            'vehicles',
            'vehicleTypes',
            'vehicleBrands',
            'totalVehicles',
            'customVehiclesCount',
            'taxonomyVehiclesCount'
        ));
    }

    public function show($id)
    {
        $vehicle = Vehicle::with(['user', 'vehicleType', 'vehicleBrand', 'vehicleModel', 'vehicleYear'])
            ->findOrFail($id);

        return view('admin.vehicles.show', compact('vehicle'));
    }

    public function destroy($id)
    {
        $vehicle = Vehicle::with('user')->findOrFail($id);

        DB::transaction(function () use ($vehicle) {
            $wasArchived = $vehicle->archived_at !== null;
            $vehicle->archived_at = $vehicle->archived_at ?? now();
            $vehicle->save();
            if (! $wasArchived) {
                app(AdminActionAuditService::class)->record(auth()->user(), 'vehicle_archived', 'vehicle', $vehicle->id, [
                    'user_id' => $vehicle->user_id,
                ]);
            }

            $user = $vehicle->user;
            if ($user && (int) $user->active_vehicle_id === (int) $vehicle->id) {
                $nextActiveVehicle = $user->activeVehicles()
                    ->where('id', '!=', $vehicle->id)
                    ->latest()
                    ->first();

                $user->active_vehicle_id = $nextActiveVehicle?->id;
                $user->save();
            }
        });

        return redirect()->route('admin.vehicles.index')->with('status', 'Vehicle archived successfully. Its diagnostic and maintenance history was preserved.');
    }
}
