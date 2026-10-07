<x-admin-layout>
    <x-slot name="header">Users</x-slot>
    <x-slot name="description">Manage Registered User Accounts, Plan Subscriptions & Access Rights</x-slot>

    <div class="space-y-6">

        <!-- Top Controls & Search/Filters -->
        <div class="rounded-xl border border-[#222222] bg-[#111111] p-4 space-y-4">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 class="text-sm font-heading font-bold text-white uppercase tracking-wider">User Directory</h2>
                    <p class="text-[11px] text-[#A1A1AA]">Search and manage platform accounts across subscription tiers</p>
                </div>
                <div class="text-xs text-[#A1A1AA]">
                    Total Accounts: <span class="font-heading font-bold text-white">{{ $users->total() }}</span>
                </div>
            </div>

            <!-- Filter Search Form -->
            <form method="GET" action="{{ route('admin.users.index') }}" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                    <input type="search" name="search" value="{{ request('search') }}" placeholder="Search name or email..." 
                        class="w-full rounded-xl border border-[#222222] bg-[#181818] px-3.5 py-2 text-xs text-white placeholder-[#666666] outline-none focus:border-[#F63B05]" />
                </div>
                <div>
                    <select name="subscription" class="w-full rounded-xl border border-[#222222] bg-[#181818] px-3.5 py-2 text-xs text-white outline-none focus:border-[#F63B05]">
                        <option value="">All Subscription Plans</option>
                        <option value="free" {{ request('subscription') === 'free' ? 'selected' : '' }}>Free Tier</option>
                        <option value="premium" {{ request('subscription') === 'premium' ? 'selected' : '' }}>Premium Tier</option>
                    </select>
                </div>
                <div>
                    <select name="status" class="w-full rounded-xl border border-[#222222] bg-[#181818] px-3.5 py-2 text-xs text-white outline-none focus:border-[#F63B05]">
                        <option value="">All Account Statuses</option>
                        <option value="active" {{ request('status') === 'active' ? 'selected' : '' }}>Active Accounts</option>
                        <option value="disabled" {{ request('status') === 'disabled' ? 'selected' : '' }}>Disabled Accounts</option>
                    </select>
                </div>
                <div>
                    <button type="submit" class="w-full rounded-xl bg-[#F63B05] px-4 py-2 text-xs font-heading font-semibold text-white shadow hover:bg-[#D83000] transition">
                        Apply Filters
                    </button>
                </div>
            </form>
        </div>

        <!-- Users Table Card -->
        <div class="overflow-hidden rounded-xl border border-[#222222] bg-[#111111]">
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs text-[#A1A1AA]">
                    <thead class="bg-[#181818] text-[10px] font-heading font-bold uppercase tracking-wider text-[#666666] border-b border-[#222222]">
                        <tr>
                            <th class="px-4 py-3">User</th>
                            <th class="px-4 py-3">Role</th>
                            <th class="px-4 py-3">Subscription</th>
                            <th class="px-4 py-3">Vehicles</th>
                            <th class="px-4 py-3">Status</th>
                            <th class="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-[#222222] bg-[#111111]">
                        @forelse($users as $user)
                            <tr class="hover:bg-[#181818]/60 transition">
                                <td class="px-4 py-3">
                                    <div class="flex items-center gap-3">
                                        <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-[#181818] border border-[#222222] font-heading font-bold text-white text-xs">
                                            {{ strtoupper(substr($user->name, 0, 1)) }}
                                        </div>
                                        <div>
                                            <p class="font-heading font-semibold text-white">{{ $user->name }}</p>
                                            <p class="text-[10px] text-[#666666]">{{ $user->email }}</p>
                                        </div>
                                    </div>
                                </td>
                                <td class="px-4 py-3 text-[#A1A1AA] font-heading font-semibold text-[10px] uppercase">
                                    {{ ucfirst($user->role) }}
                                </td>
                                <td class="px-4 py-3">
                                    @if($user->subscription_plan === 'premium')
                                        <span class="inline-flex rounded bg-[#F63B05]/15 border border-[#F63B05]/30 px-2 py-0.5 text-[10px] font-heading font-bold text-[#F63B05]">
                                            PREMIUM
                                        </span>
                                    @else
                                        <span class="inline-flex rounded bg-[#181818] border border-[#222222] px-2 py-0.5 text-[10px] font-heading font-bold text-[#666666]">
                                            FREE
                                        </span>
                                    @endif
                                </td>
                                <td class="px-4 py-3 font-heading font-semibold text-white">
                                    {{ $user->vehicles_count }}
                                </td>
                                <td class="px-4 py-3">
                                    @if($user->is_active)
                                        <span class="inline-flex items-center gap-1 rounded-full bg-[#32D583]/10 px-2 py-0.5 text-[10px] font-heading font-bold text-[#32D583]">
                                            Active
                                        </span>
                                    @else
                                        <span class="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-heading font-bold text-rose-400">
                                            Disabled
                                        </span>
                                    @endif
                                </td>
                                <td class="px-4 py-3 text-right space-x-2">
                                    <a href="{{ route('admin.users.show', $user->id) }}" class="rounded bg-[#181818] border border-[#222222] hover:border-[#F63B05] px-2.5 py-1 text-[11px] font-heading font-semibold text-white transition">
                                        View
                                    </a>
                                    <form action="{{ route('admin.users.toggle', $user->id) }}" method="POST" class="inline">
                                        @csrf
                                        <button type="submit" class="rounded bg-[#181818] border border-[#222222] hover:border-[#F59E0B] px-2.5 py-1 text-[11px] font-heading font-semibold text-[#F59E0B] transition">
                                            {{ $user->is_active ? 'Suspend' : 'Activate' }}
                                        </button>
                                    </form>
                                    <form action="{{ route('admin.users.destroy', $user->id) }}" method="POST" class="inline" onsubmit="return confirm('Are you sure you want to delete user {{ $user->name }}? This action cannot be undone.');">
                                        @csrf
                                        @method('DELETE')
                                        <button type="submit" class="rounded bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500 hover:text-white px-2.5 py-1 text-[11px] font-heading font-semibold text-rose-400 transition">
                                            Delete
                                        </button>
                                    </form>
                                </td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="6" class="px-4 py-12 text-center text-xs text-[#666666]">
                                    No user accounts found matching the search criteria.
                                </td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>

            @if($users->hasPages())
                <div class="p-4 border-t border-[#222222]">
                    {{ $users->links() }}
                </div>
            @endif
        </div>

    </div>
</x-admin-layout>
