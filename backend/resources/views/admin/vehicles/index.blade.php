<x-admin-layout>
    <x-slot name="header">Vehicles Management</x-slot>
    <x-slot name="description">Inspect Registered Fleet, Preset Database Models & Custom User-Added Vehicles</x-slot>

    <div class="space-y-6">

        <!-- Top Metric Summary Cards -->
        <div class="grid gap-4 sm:grid-cols-3">
            <div class="rounded-xl border border-[#222222] bg-[#111111] p-4 flex items-center gap-4">
                <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F63B05]/10 border border-[#F63B05]/20 text-[#F63B05]">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                    </svg>
                </div>
                <div>
                    <p class="text-[10px] font-heading font-bold uppercase tracking-wider text-[#666666]">Total Registered Fleet</p>
                    <p class="text-2xl font-heading font-extrabold text-white mt-0.5">{{ number_format($totalVehicles) }}</p>
                </div>
            </div>

            <div class="rounded-xl border border-[#222222] bg-[#111111] p-4 flex items-center gap-4">
                <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981]">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                </div>
                <div>
                    <p class="text-[10px] font-heading font-bold uppercase tracking-wider text-[#666666]">Preset Saved Vehicles</p>
                    <p class="text-2xl font-heading font-extrabold text-[#10B981] mt-0.5">{{ number_format($taxonomyVehiclesCount) }}</p>
                </div>
            </div>

            <div class="rounded-xl border border-[#222222] bg-[#111111] p-4 flex items-center gap-4">
                <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#F59E0B]">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                </div>
                <div>
                    <p class="text-[10px] font-heading font-bold uppercase tracking-wider text-[#666666]">Custom User Added</p>
                    <p class="text-2xl font-heading font-extrabold text-[#F59E0B] mt-0.5">{{ number_format($customVehiclesCount) }}</p>
                </div>
            </div>
        </div>

        <!-- Controls & Filter Section -->
        <div class="rounded-xl border border-[#222222] bg-[#111111] p-4 space-y-4">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 class="text-sm font-heading font-bold text-white uppercase tracking-wider">Registered Vehicles Table</h2>
                    <p class="text-[11px] text-[#A1A1AA]">Filter preset taxonomy vehicles vs user-added custom entries</p>
                </div>
                <div class="text-xs text-[#A1A1AA]">
                    Showing Results: <span class="font-heading font-bold text-white">{{ $vehicles->total() }}</span>
                </div>
            </div>

            <!-- Filter Form -->
            <form method="GET" action="{{ route('admin.vehicles.index') }}" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div>
                    <input type="search" name="search" value="{{ request('search') }}" placeholder="Search brand, model, VIN..." 
                        class="w-full rounded-xl border border-[#222222] bg-[#181818] px-3.5 py-2 text-xs text-white placeholder-[#666666] outline-none focus:border-[#F63B05]" />
                </div>
                <div>
                    <select name="source" class="w-full rounded-xl border border-[#222222] bg-[#181818] px-3.5 py-2 text-xs text-white outline-none focus:border-[#F63B05]">
                        <option value="">All Vehicle Sources</option>
                        <option value="taxonomy" {{ request('source') === 'taxonomy' ? 'selected' : '' }}>Preset Database Vehicles</option>
                        <option value="custom" {{ request('source') === 'custom' ? 'selected' : '' }}>Custom User Added</option>
                    </select>
                </div>
                <div>
                    <select name="type" class="w-full rounded-xl border border-[#222222] bg-[#181818] px-3.5 py-2 text-xs text-white outline-none focus:border-[#F63B05]">
                        <option value="">All Vehicle Types</option>
                        @foreach($vehicleTypes as $vt)
                            <option value="{{ $vt->id }}" {{ request('type') == $vt->id ? 'selected' : '' }}>{{ $vt->name }}</option>
                        @endforeach
                    </select>
                </div>
                <div>
                    <select name="status" class="w-full rounded-xl border border-[#222222] bg-[#181818] px-3.5 py-2 text-xs text-white outline-none focus:border-[#F63B05]">
                        <option value="">All Statuses</option>
                        <option value="active" {{ request('status') === 'active' ? 'selected' : '' }}>Active Vehicles</option>
                        <option value="archived" {{ request('status') === 'archived' ? 'selected' : '' }}>Archived Vehicles</option>
                    </select>
                </div>
                <div>
                    <button type="submit" class="w-full rounded-xl bg-[#F63B05] px-4 py-2 text-xs font-heading font-semibold text-white shadow hover:bg-[#D83000] transition">
                        Apply Filters
                    </button>
                </div>
            </form>
        </div>

        <!-- Main Vehicles Table -->
        <div class="overflow-hidden rounded-xl border border-[#222222] bg-[#111111]">
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs text-[#A1A1AA]">
                    <thead class="bg-[#181818] text-[10px] font-heading font-bold uppercase tracking-wider text-[#666666] border-b border-[#222222]">
                        <tr>
                            <th class="px-4 py-3.5">Vehicle Profile</th>
                            <th class="px-4 py-3.5">Data Source</th>
                            <th class="px-4 py-3.5">Type</th>
                            <th class="px-4 py-3.5">Year</th>
                            <th class="px-4 py-3.5">Status</th>
                            <th class="px-4 py-3.5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-[#222222] bg-[#111111]">
                        @forelse($vehicles as $v)
                            @php
                                $isCustom = !empty($v->custom_brand) || !empty($v->custom_model) || !empty($v->custom_year);
                                $typeName = $v->vehicleType?->name ?? 'Vehicle';
                                $brandName = $v->vehicleBrand?->name ?? $v->custom_brand ?? 'Unspecified';
                                $modelName = $v->vehicleModel?->name ?? $v->custom_model ?? $v->model_number ?? '';
                                $yearName = $v->vehicleYear?->year ?? $v->custom_year ?? '—';
                            @endphp
                            <tr class="hover:bg-[#181818]/60 transition">
                                <td class="px-4 py-3.5">
                                    <div class="flex items-center gap-3">
                                        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#181818] border border-[#222222] text-[#F63B05]">
                                            <x-vehicle-type-icon :type="$typeName" class="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div class="flex items-center gap-2">
                                                <span class="font-heading font-bold text-white text-xs">{{ $brandName }} {{ $modelName }}</span>
                                            </div>
                                            <p class="text-[10px] text-[#666666]">Vehicle ID: #{{ $v->id }} @if($v->model_number) • VIN/Model #: {{ $v->model_number }} @endif</p>
                                        </div>
                                    </div>
                                </td>
                                <td class="px-4 py-3.5">
                                    @if($isCustom)
                                        <span class="inline-flex items-center gap-1 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/30 px-2.5 py-0.5 text-[10px] font-heading font-bold text-[#F59E0B]">
                                            CUSTOM USER ADDED
                                        </span>
                                    @else
                                        <span class="inline-flex items-center gap-1 rounded-full bg-[#10B981]/10 border border-[#10B981]/30 px-2.5 py-0.5 text-[10px] font-heading font-bold text-[#10B981]">
                                            PRESET DATABASE
                                        </span>
                                    @endif
                                </td>
                                <td class="px-4 py-3.5 font-heading font-semibold text-white">
                                    {{ $typeName }}
                                </td>
                                <td class="px-4 py-3.5 text-[#A1A1AA] font-mono font-bold">
                                    {{ $yearName }}
                                </td>
                                <td class="px-4 py-3.5">
                                    @if($v->archived_at)
                                        <span class="inline-flex items-center gap-1 rounded-full bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 text-[10px] font-heading font-bold text-rose-400">
                                            Archived
                                        </span>
                                    @else
                                        <span class="inline-flex items-center gap-1 rounded-full bg-[#32D583]/10 border border-[#32D583]/30 px-2 py-0.5 text-[10px] font-heading font-bold text-[#32D583]">
                                            Registered
                                        </span>
                                    @endif
                                </td>
                                <td class="px-4 py-3.5 text-right">
                                    <a href="{{ route('admin.vehicles.show', $v->id) }}" class="rounded-lg bg-[#181818] border border-[#222222] hover:border-[#F63B05] px-3 py-1.5 text-[11px] font-heading font-semibold text-white transition">
                                        Inspect
                                    </a>
                                </td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="6" class="px-4 py-12 text-center text-xs text-[#666666]">
                                    No registered vehicles found matching your search filters.
                                </td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>

            @if($vehicles->hasPages())
                <div class="p-4 border-t border-[#222222]">
                    {{ $vehicles->links() }}
                </div>
            @endif
        </div>

    </div>
</x-admin-layout>
