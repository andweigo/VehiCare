<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::query()->where('role', User::ROLE_USER)->withCount('vehicles');

        if ($search = $request->input('search')) {
            $query->where(function ($subQuery) use ($search) {
                $subQuery->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($subscription = $request->input('subscription')) {
            $query->where('subscription_plan', $subscription);
        }

        if ($status = $request->input('status')) {
            if ($status === 'active') {
                $query->where('is_active', true);
            } elseif ($status === 'disabled') {
                $query->where('is_active', false);
            }
        }

        $users = $query->orderByDesc('created_at')->paginate(15)->withQueryString();

        return view('admin.users.index', compact('users'));
    }

    public function show($id)
    {
        $user = User::where('role', User::ROLE_USER)
            ->with(['vehicles.vehicleType', 'vehicles.vehicleBrand', 'vehicles.vehicleModel'])
            ->findOrFail($id);

        return view('admin.users.show', compact('user'));
    }

    public function update(Request $request, $id)
    {
        $user = User::where('role', User::ROLE_USER)
            ->findOrFail($id);

        $validated = $request->validate([
            'subscription_plan' => [
                'required',
                'in:' . implode(',', [User::SUBSCRIPTION_FREE, User::SUBSCRIPTION_PREMIUM]),
            ],
            'vehicle_limit' => ['required', 'integer', 'min:1'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $user->update([
            'subscription_plan' => $validated['subscription_plan'],
            'vehicle_limit' => $validated['vehicle_limit'],
            'is_active' => $validated['is_active'] ?? $user->is_active,
        ]);

        return back()->with('status', 'User account updated successfully.');
    }

    public function toggle($id)
    {
        $user = User::where('role', User::ROLE_USER)->findOrFail($id);
        $user->update(['is_active' => !$user->is_active]);

        $statusLabel = $user->is_active ? 'activated' : 'suspended';

        return back()->with('status', "User account {$statusLabel} successfully.");
    }

    public function destroy($id)
    {
        $user = User::where('role', User::ROLE_USER)->findOrFail($id);
        $user->delete();

        return redirect()->route('admin.users.index')->with('status', 'User account deleted successfully.');
    }
}
