<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\VehicleCorrectionRequest;
use App\Notifications\VehicleCorrectionRequestApproved;
use App\Notifications\VehicleCorrectionRequestRejected;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Throwable;

class VehicleCorrectionRequestController extends Controller
{
    public function index()
    {
        $requests = VehicleCorrectionRequest::with(['user', 'vehicle.vehicleType', 'vehicle.vehicleBrand', 'vehicle.vehicleModel', 'vehicle.vehicleYear', 'approver'])
            ->latest('submitted_at')
            ->get();

        return view('admin.correction-requests.index', compact('requests'));
    }

    public function show($id)
    {
        $request = VehicleCorrectionRequest::with(['user', 'vehicle.vehicleType', 'vehicle.vehicleBrand', 'vehicle.vehicleModel', 'vehicle.vehicleYear', 'approver'])
            ->findOrFail($id);

        return view('admin.correction-requests.show', compact('request'));
    }

    public function approve(Request $request, $id)
    {
        $correctionRequest = VehicleCorrectionRequest::with(['user', 'vehicle'])->findOrFail($id);

        // Concurrency Safety: Check if already processed
        if ($correctionRequest->status !== 'pending') {
            return back()->withErrors(['status' => 'This request has already been processed and is no longer pending.']);
        }

        $request->validate([
            'edit_expires_at' => ['nullable', 'date', 'after:now'],
            'admin_notes' => ['nullable', 'string', 'max:1000'],
        ]);

        try {
            DB::transaction(function () use ($request, $correctionRequest) {
                $vehicle = $correctionRequest->vehicle;
                $requestedValues = (array)$correctionRequest->requested_values;

                // Step 3: Apply requested values to actual vehicle record
                foreach ($requestedValues as $key => $value) {
                    if (in_array($key, [
                        'vehicle_type_id', 'vehicle_brand_id', 'vehicle_model_id', 'vehicle_year_id',
                        'custom_brand', 'custom_model', 'custom_year', 'model_number'
                    ])) {
                        $vehicle->{$key} = $value;
                    } elseif ($key === 'brand') {
                        $vehicle->custom_brand = $value;
                    } elseif ($key === 'model') {
                        $vehicle->custom_model = $value;
                    } elseif ($key === 'year') {
                        $vehicle->custom_year = $value;
                    }
                }

                $vehicle->save();

                // Step 4: Update request status and metadata
                $expiration = $request->input('edit_expires_at') ? now()->parse($request->input('edit_expires_at')) : now()->addDays(3);
                $correctionRequest->status = 'approved';
                $correctionRequest->approved_at = now();
                $correctionRequest->completed_at = now();
                $correctionRequest->edit_expires_at = $expiration;
                $correctionRequest->approved_by = $request->user()->id;
                $correctionRequest->admin_notes = $request->input('admin_notes');
                $correctionRequest->save();

                // Step 5: Send notification to user
                $correctionRequest->user->notify(new VehicleCorrectionRequestApproved($correctionRequest));
            });
        } catch (Throwable $e) {
            return back()->withErrors(['error' => 'Failed to apply vehicle update: ' . $e->getMessage()]);
        }

        return back()->with('status', 'Correction request approved and vehicle details updated successfully.');
    }

    public function reject(Request $request, $id)
    {
        $correctionRequest = VehicleCorrectionRequest::with(['user', 'vehicle'])->findOrFail($id);

        // Concurrency Safety: Check if already processed
        if ($correctionRequest->status !== 'pending') {
            return back()->withErrors(['status' => 'This request has already been processed and is no longer pending.']);
        }

        // Rejection reason is strictly mandatory
        $validated = $request->validate([
            'admin_notes' => ['required', 'string', 'min:3', 'max:1000'],
        ], [
            'admin_notes.required' => 'A rejection reason is required before rejecting this edit request.',
        ]);

        try {
            DB::transaction(function () use ($correctionRequest, $validated) {
                $correctionRequest->status = 'rejected';
                $correctionRequest->rejected_at = now();
                $correctionRequest->admin_notes = $validated['admin_notes'];
                $correctionRequest->save();

                $correctionRequest->user->notify(new VehicleCorrectionRequestRejected($correctionRequest));
            });
        } catch (Throwable $e) {
            return back()->withErrors(['error' => 'Failed to reject request: ' . $e->getMessage()]);
        }

        return back()->with('status', 'Correction request rejected successfully.');
    }
}
