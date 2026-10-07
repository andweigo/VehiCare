<x-admin-layout>
    <x-slot name="header">Repair Shop Directory</x-slot>
    <x-slot name="description">Administrator-Managed Repair Shop Directory & Location Management</x-slot>

    <div class="space-y-6">

        <!-- Top Header Controls & Search Bar -->
        <div class="rounded-xl border border-[#222222] bg-[#111111] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <h2 class="text-sm font-heading font-bold text-white uppercase tracking-wider">Managed Repair Shops Directory</h2>
                <p class="text-[11px] text-[#A1A1AA]">VehiCare provides an administrator-managed directory of repair shops and uses the user's location to display nearby listed establishments.</p>
            </div>
            <div class="flex items-center gap-3">
                <a href="{{ route('admin.repair-shops.create') }}" class="rounded-xl bg-[#F63B05] px-4 py-2.5 text-xs font-heading font-bold text-white shadow-md hover:bg-[#D83000] transition flex items-center gap-2">
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                    </svg>
                    <span>Add Repair Shop</span>
                </a>
            </div>
        </div>

        <!-- Filter / Search Form -->
        <div class="rounded-xl border border-[#222222] bg-[#111111] p-4">
            <form method="GET" action="{{ route('admin.repair-shops.index') }}" class="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                    <label class="block text-[10px] font-heading font-bold uppercase tracking-wider text-[#A1A1AA] mb-1">Search</label>
                    <input type="text" name="search" value="{{ request('search') }}" placeholder="Search name or address..." class="w-full rounded-xl border border-[#222222] bg-[#181818] px-3 py-1.5 text-xs text-white placeholder-[#666666] outline-none focus:border-[#F63B05]">
                </div>
                <div>
                    <label class="block text-[10px] font-heading font-bold uppercase tracking-wider text-[#A1A1AA] mb-1">Vehicle Category</label>
                    <select name="category" class="w-full rounded-xl border border-[#222222] bg-[#181818] px-3 py-1.5 text-xs text-white outline-none focus:border-[#F63B05]">
                        <option value="">All Categories</option>
                        <option value="car" {{ request('category') == 'car' ? 'selected' : '' }}>Car / Automotive</option>
                        <option value="motorcycle" {{ request('category') == 'motorcycle' ? 'selected' : '' }}>Motorcycle</option>
                        <option value="bicycle" {{ request('category') == 'bicycle' ? 'selected' : '' }}>Bicycle</option>
                    </select>
                </div>
                <div>
                    <label class="block text-[10px] font-heading font-bold uppercase tracking-wider text-[#A1A1AA] mb-1">Status</label>
                    <select name="status" class="w-full rounded-xl border border-[#222222] bg-[#181818] px-3 py-1.5 text-xs text-white outline-none focus:border-[#F63B05]">
                        <option value="">All Statuses</option>
                        <option value="1" {{ request('status') === '1' ? 'selected' : '' }}>Active</option>
                        <option value="0" {{ request('status') === '0' ? 'selected' : '' }}>Inactive</option>
                    </select>
                </div>
                <div class="flex items-end gap-2">
                    <button type="submit" class="w-full rounded-xl bg-[#222222] hover:bg-[#333333] px-3 py-1.5 text-xs font-heading font-bold text-white transition">Filter</button>
                    @if(request()->anyFilled(['search', 'category', 'status']))
                        <a href="{{ route('admin.repair-shops.index') }}" class="rounded-xl border border-[#222222] px-3 py-1.5 text-xs font-heading font-semibold text-[#A1A1AA] hover:text-white">Reset</a>
                    @endif
                </div>
            </form>
        </div>

        <!-- Table Listing -->
        <div class="overflow-hidden rounded-xl border border-[#222222] bg-[#111111]">
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs text-[#A1A1AA]">
                    <thead class="bg-[#181818] text-[10px] font-heading font-bold uppercase tracking-wider text-[#666666] border-b border-[#222222]">
                        <tr>
                            <th class="px-4 py-3">Shop Name</th>
                            <th class="px-4 py-3">Category</th>
                            <th class="px-4 py-3">Address</th>
                            <th class="px-4 py-3">Coordinates (Lat, Lng)</th>
                            <th class="px-4 py-3">Contact</th>
                            <th class="px-4 py-3">Status</th>
                            <th class="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-[#222222] bg-[#111111]">
                        @forelse($shops as $shop)
                            <tr class="hover:bg-[#181818]/60 transition">
                                <td class="px-4 py-3 font-heading font-semibold text-white">
                                    {{ $shop->name }}
                                </td>
                                <td class="px-4 py-3">
                                    <span class="rounded bg-[#222222] px-2 py-0.5 text-[10px] font-heading font-semibold text-white capitalize">
                                        {{ $shop->vehicle_category ?? $shop->type ?? 'General' }}
                                    </span>
                                </td>
                                <td class="px-4 py-3 text-[#A1A1AA] max-w-xs truncate" title="{{ $shop->address }}">
                                    {{ $shop->address }}
                                </td>
                                <td class="px-4 py-3 text-white font-mono text-[11px]">
                                    {{ number_format($shop->latitude, 6) }}, {{ number_format($shop->longitude, 6) }}
                                </td>
                                <td class="px-4 py-3 text-[#A1A1AA]">
                                    {{ $shop->contact_number ?? $shop->phone_number ?? 'N/A' }}
                                </td>
                                <td class="px-4 py-3">
                                    @if($shop->is_active)
                                        <span class="rounded bg-[#32D583]/15 border border-[#32D583]/30 px-2 py-0.5 text-[10px] font-heading font-bold text-[#32D583]">
                                            ACTIVE
                                        </span>
                                    @else
                                        <span class="rounded bg-[#EF4444]/15 border border-[#EF4444]/30 px-2 py-0.5 text-[10px] font-heading font-bold text-[#EF4444]">
                                            INACTIVE
                                        </span>
                                    @endif
                                </td>
                                <td class="px-4 py-3 text-right space-x-2">
                                    <!-- Edit -->
                                    <a href="{{ route('admin.repair-shops.edit', $shop->id) }}" class="inline-flex items-center px-2.5 py-1 text-[11px] font-heading font-semibold rounded-lg bg-[#222222] text-white hover:bg-[#333333] transition">
                                        Edit
                                    </a>

                                    <!-- Toggle Status -->
                                    <form action="{{ route('admin.repair-shops.toggle', $shop->id) }}" method="POST" class="inline">
                                        @csrf
                                        <button type="submit" class="inline-flex items-center px-2.5 py-1 text-[11px] font-heading font-semibold rounded-lg {{ $shop->is_active ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' }} transition">
                                            {{ $shop->is_active ? 'Deactivate' : 'Activate' }}
                                        </button>
                                    </form>

                                    <!-- Delete -->
                                    <form action="{{ route('admin.repair-shops.destroy', $shop->id) }}" method="POST" class="inline" onsubmit="return confirm('Are you sure you want to delete this repair shop?');">
                                        @csrf
                                        @method('DELETE')
                                        <button type="submit" class="inline-flex items-center px-2 py-1 text-[11px] font-heading font-semibold rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition">
                                            Delete
                                        </button>
                                    </form>
                                </td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="7" class="px-4 py-12 text-center text-xs text-[#666666]">
                                    <div class="space-y-2">
                                        <div class="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#181818] text-[#F63B05]">
                                            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0v-4m0 4h4m-4-4l-3-3m3 3l3-3"/>
                                            </svg>
                                        </div>
                                        <p class="font-heading font-bold text-white">No repair shops listed in directory</p>
                                        <p class="text-[11px] text-[#A1A1AA]">Click "Add Repair Shop" to register a new establishment.</p>
                                    </div>
                                </td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>

            @if($shops->hasPages())
                <div class="border-t border-[#222222] bg-[#181818] p-4">
                    {{ $shops->links() }}
                </div>
            @endif
        </div>

    </div>
</x-admin-layout>
