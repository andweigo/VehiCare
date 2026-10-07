<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\RepairShop;
use Illuminate\Http\Request;

class RepairShopAdminController extends Controller
{
    /**
     * Display a listing of administrator-managed repair shops.
     */
    public function index(Request $request)
    {
        $query = RepairShop::query();

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('address', 'like', "%{$search}%")
                  ->orWhere('contact_number', 'like', "%{$search}%")
                  ->orWhere('phone_number', 'like', "%{$search}%");
            });
        }

        if ($request->filled('category')) {
            $cat = $request->input('category');
            $query->where(function ($q) use ($cat) {
                $q->where('vehicle_category', $cat)
                  ->orWhere('type', $cat);
            });
        }

        if ($request->has('status') && $request->status !== '') {
            $status = filter_var($request->status, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if ($status !== null) {
                $query->where('is_active', $status);
            }
        }

        $shops = $query->orderBy('name', 'asc')->paginate(15);

        return view('admin.repair-shops.index', compact('shops'));
    }

    /**
     * Show the form for creating a new repair shop.
     */
    public function create()
    {
        return view('admin.repair-shops.create');
    }

    /**
     * Store a newly created repair shop in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'nullable|string|max:100',
            'vehicle_category' => 'nullable|string|max:100',
            'address' => 'required|string|max:1000',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'contact_number' => 'nullable|string|max:50',
            'phone_number' => 'nullable|string|max:50',
            'operating_hours' => 'nullable|string|max:255',
            'is_active' => 'nullable|boolean',
        ]);

        $category = $validated['vehicle_category'] ?? $validated['type'] ?? 'car';
        $contact = $validated['contact_number'] ?? $validated['phone_number'] ?? null;

        RepairShop::create([
            'name' => $validated['name'],
            'type' => $category,
            'vehicle_category' => $category,
            'address' => $validated['address'],
            'latitude' => (float) $validated['latitude'],
            'longitude' => (float) $validated['longitude'],
            'contact_number' => $contact,
            'phone_number' => $contact,
            'operating_hours' => $validated['operating_hours'] ?? null,
            'source' => 'admin',
            'is_active' => $request->has('is_active') ? (bool)$request->is_active : true,
            'rating' => 4.8,
            'is_certified' => true,
        ]);

        return redirect()->route('admin.repair-shops.index')
            ->with('status', 'Repair shop created successfully and added to directory.');
    }

    /**
     * Show the form for editing the specified repair shop.
     */
    public function edit($id)
    {
        $shop = RepairShop::findOrFail($id);

        return view('admin.repair-shops.edit', compact('shop'));
    }

    /**
     * Update the specified repair shop in storage.
     */
    public function update(Request $request, $id)
    {
        $shop = RepairShop::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'nullable|string|max:100',
            'vehicle_category' => 'nullable|string|max:100',
            'address' => 'required|string|max:1000',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'contact_number' => 'nullable|string|max:50',
            'phone_number' => 'nullable|string|max:50',
            'operating_hours' => 'nullable|string|max:255',
            'is_active' => 'nullable|boolean',
        ]);

        $category = $validated['vehicle_category'] ?? $validated['type'] ?? $shop->vehicle_category ?? 'car';
        $contact = $validated['contact_number'] ?? $validated['phone_number'] ?? $shop->contact_number;

        $shop->update([
            'name' => $validated['name'],
            'type' => $category,
            'vehicle_category' => $category,
            'address' => $validated['address'],
            'latitude' => (float) $validated['latitude'],
            'longitude' => (float) $validated['longitude'],
            'contact_number' => $contact,
            'phone_number' => $contact,
            'operating_hours' => $validated['operating_hours'] ?? null,
            'source' => 'admin',
            'is_active' => $request->has('is_active') ? (bool)$request->is_active : false,
        ]);

        return redirect()->route('admin.repair-shops.index')
            ->with('status', 'Repair shop updated successfully.');
    }

    /**
     * Toggle repair shop activation state (activate / deactivate).
     */
    public function toggle($id)
    {
        $shop = RepairShop::findOrFail($id);
        $shop->is_active = !$shop->is_active;
        $shop->save();

        $statusLabel = $shop->is_active ? 'activated' : 'deactivated';

        return redirect()->back()
            ->with('status', "Repair shop '{$shop->name}' was {$statusLabel}.");
    }

    /**
     * Remove the specified repair shop from directory storage.
     */
    public function destroy($id)
    {
        $shop = RepairShop::findOrFail($id);
        $shopName = $shop->name;
        $shop->delete();

        return redirect()->route('admin.repair-shops.index')
            ->with('status', "Repair shop '{$shopName}' removed from directory.");
    }
}
