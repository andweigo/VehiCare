<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AdminManagementController extends Controller
{
    public function index()
    {
        $admins = User::where('role', User::ROLE_ADMIN)
            ->orderByDesc('created_at')
            ->get();

        return view('admin.admins.index', compact('admins'));
    }

    public function create()
    {
        return view('admin.admins.create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'is_active' => ['required', 'boolean'],
        ]);

        User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => User::ROLE_ADMIN,
            'subscription_plan' => User::SUBSCRIPTION_FREE,
            'vehicle_limit' => User::VEHICLE_LIMIT_FREE,
            'is_active' => $validated['is_active'],
        ]);

        return redirect()->route('admin.admins.index')
            ->with('status', 'Admin account created successfully.');
    }

    public function toggle($id)
    {
        $admin = User::where('role', User::ROLE_ADMIN)->findOrFail($id);
        $admin->update(['is_active' => ! $admin->is_active]);

        return back()->with('status', 'Admin status updated successfully.');
    }

    public function destroy($id)
    {
        $admin = User::where('role', User::ROLE_ADMIN)->findOrFail($id);

        if ($admin->email === 'admin@vehicare.local') {
            return back()->withErrors(['email' => 'The default admin account cannot be deleted.']);
        }

        $admin->delete();

        return back()->with('status', 'Admin account removed successfully.');
    }
}
