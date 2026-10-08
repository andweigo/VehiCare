<x-admin-layout>
    <x-slot name="header">Maintenance Analytics</x-slot>
    <x-slot name="description">Real-time system-wide maintenance logs & vehicle health metrics across all user accounts</x-slot>

    <div class="space-y-6">

        <!-- Stat Cards Grid with Real Aggregated Metrics -->
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div class="rounded-xl border border-[#222222] bg-[#111111] p-4">
                <p class="text-[10px] font-heading font-bold uppercase tracking-wider text-[#A1A1AA]">Registered User Accounts</p>
                <p class="mt-2 text-2xl font-heading font-extrabold text-white">{{ number_format($totalUsers) }}</p>
                <p class="text-[10px] text-[#666666] mt-1">Total active member profiles</p>
            </div>

            <div class="rounded-xl border border-[#222222] bg-[#111111] p-4">
                <p class="text-[10px] font-heading font-bold uppercase tracking-wider text-[#A1A1AA]">Total Registered Fleet</p>
                <p class="mt-2 text-2xl font-heading font-extrabold text-[#32D583]">{{ number_format($totalVehicles) }}</p>
                <p class="text-[10px] text-[#666666] mt-1">Vehicles tracked across all users</p>
            </div>

            <div class="rounded-xl border border-[#222222] bg-[#111111] p-4">
                <p class="text-[10px] font-heading font-bold uppercase tracking-wider text-[#A1A1AA]">Vehicles Needing Attention</p>
                <p class="mt-2 text-2xl font-heading font-extrabold text-[#F63B05]">{{ number_format($vehiclesNeedingAttention) }}</p>
                <p class="text-[10px] text-[#666666] mt-1">High or Critical diagnostic flags</p>
            </div>

            <div class="rounded-xl border border-[#222222] bg-[#111111] p-4">
                <p class="text-[10px] font-heading font-bold uppercase tracking-wider text-[#A1A1AA]">Total Maintenance Logs</p>
                <p class="mt-2 text-2xl font-heading font-extrabold text-[#38BDF8]">{{ number_format($totalDiagnostics) }}</p>
                <p class="text-[10px] text-[#666666] mt-1">{{ number_format($proHelpCount) }} recommended shop visits</p>
            </div>
        </div>

        <!-- Severity Distribution Breakdown -->
        <div class="rounded-xl border border-[#222222] bg-[#111111] p-5 space-y-4">
            <h2 class="text-sm font-heading font-bold text-white uppercase tracking-wider">System-Wide Health Severity Distribution</h2>
            <div class="grid gap-3 sm:grid-cols-4">
                <div class="p-3 rounded-lg bg-[#181818] border border-[#222222]">
                    <span class="text-[10px] font-heading font-bold text-[#32D583] uppercase">Healthy (Low Severity)</span>
                    <p class="text-xl font-heading font-bold text-white mt-1">{{ number_format($lowCount) }}</p>
                </div>
                <div class="p-3 rounded-lg bg-[#181818] border border-[#222222]">
                    <span class="text-[10px] font-heading font-bold text-[#F59E0B] uppercase">Moderate Severity</span>
                    <p class="text-xl font-heading font-bold text-white mt-1">{{ number_format($moderateCount) }}</p>
                </div>
                <div class="p-3 rounded-lg bg-[#181818] border border-[#222222]">
                    <span class="text-[10px] font-heading font-bold text-[#F63B05] uppercase">High Severity</span>
                    <p class="text-xl font-heading font-bold text-white mt-1">{{ number_format($highCount) }}</p>
                </div>
                <div class="p-3 rounded-lg bg-[#181818] border border-[#222222]">
                    <span class="text-[10px] font-heading font-bold text-[#EF4444] uppercase">Critical Severity</span>
                    <p class="text-xl font-heading font-bold text-white mt-1">{{ number_format($criticalCount) }}</p>
                </div>
            </div>
        </div>

        <!-- Real Maintenance & Diagnostic Records Table -->
        <div class="rounded-xl border border-[#222222] bg-[#111111] p-5 space-y-4">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 class="text-sm font-heading font-bold text-white uppercase tracking-wider">All User Maintenance & Diagnostic Logs</h2>
                    <p class="text-[11px] text-[#A1A1AA]">Real-time records from all user accounts</p>
                </div>
                <form method="GET" action="{{ route('admin.maintenance.index') }}" class="flex items-center gap-2">
                    <select name="severity" onchange="this.form.submit()" class="rounded-lg border border-[#222222] bg-[#181818] px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#F63B05]">
                        <option value="all" {{ request('severity') == 'all' ? 'selected' : '' }}>All Severities</option>
                        <option value="low" {{ request('severity') == 'low' ? 'selected' : '' }}>Low</option>
                        <option value="moderate" {{ request('severity') == 'moderate' ? 'selected' : '' }}>Moderate</option>
                        <option value="high" {{ request('severity') == 'high' ? 'selected' : '' }}>High</option>
                        <option value="critical" {{ request('severity') == 'critical' ? 'selected' : '' }}>Critical</option>
                    </select>
                    <input type="text" name="search" value="{{ request('search') }}" placeholder="Search user, symptoms..." class="rounded-lg border border-[#222222] bg-[#181818] px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#F63B05]">
                    <button type="submit" class="rounded-lg bg-[#F63B05] px-3 py-1.5 text-xs font-heading font-bold text-white">Filter</button>
                </form>
            </div>

            @if($maintenanceItems->count() > 0)
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs text-[#A1A1AA]">
                        <thead class="border-b border-[#222222] bg-[#181818] text-[10px] uppercase font-heading font-bold text-white">
                            <tr>
                                <th class="p-3">User Account</th>
                                <th class="p-3">Vehicle</th>
                                <th class="p-3">Summary / Symptoms</th>
                                <th class="p-3">Severity</th>
                                <th class="p-3">Pro Help?</th>
                                <th class="p-3">Date</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-[#222222]">
                            @foreach($maintenanceItems as $item)
                                <tr class="hover:bg-[#181818]/60 transition-colors">
                                    <td class="p-3 font-medium text-white">
                                        {{ $item->user->name ?? 'Guest User' }}
                                        <div class="text-[10px] text-[#666666]">{{ $item->user->email ?? 'N/A' }}</div>
                                    </td>
                                    <td class="p-3 text-white">
                                        {{ $item->vehicle->vehicleBrand->name ?? $item->vehicle->custom_brand ?? 'Vehicle' }}
                                        {{ $item->vehicle->vehicleModel->name ?? $item->vehicle->custom_model ?? '' }}
                                    </td>
                                    <td class="p-3 text-[#A1A1AA] max-w-xs truncate">
                                        <div class="font-semibold text-white">{{ $item->summary ?: 'Diagnostic Log' }}</div>
                                        <div class="text-[10px] text-[#666666] truncate">{{ $item->symptoms ?: 'N/A' }}</div>
                                    </td>
                                    <td class="p-3">
                                        @switch(strtoupper($item->severity))
                                            @case('CRITICAL')
                                                <span class="rounded bg-[#EF4444]/20 px-2 py-0.5 text-[10px] font-bold text-[#EF4444]">CRITICAL</span>
                                                @break
                                            @case('HIGH')
                                                <span class="rounded bg-[#F63B05]/20 px-2 py-0.5 text-[10px] font-bold text-[#F63B05]">HIGH</span>
                                                @break
                                            @case('MODERATE')
                                                <span class="rounded bg-[#F59E0B]/20 px-2 py-0.5 text-[10px] font-bold text-[#F59E0B]">MODERATE</span>
                                                @break
                                            @default
                                                <span class="rounded bg-[#32D583]/20 px-2 py-0.5 text-[10px] font-bold text-[#32D583]">LOW</span>
                                        @endswitch
                                    </td>
                                    <td class="p-3">
                                        @if($item->professional_help_recommended)
                                            <span class="text-[#F63B05] font-bold">Yes (Shop Advised)</span>
                                        @else
                                            <span class="text-[#32D583]">Self Maintenance</span>
                                        @endif
                                    </td>
                                    <td class="p-3 text-[10px] text-[#666666]">
                                        {{ $item->created_at ? $item->created_at->format('M d, Y g:i A') : 'N/A' }}
                                    </td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>
                <div class="mt-4">
                    {{ $maintenanceItems->links() }}
                </div>
            @else
                <div class="rounded-xl border border-[#222222] bg-[#181818]/40 p-10 text-center space-y-3">
                    <div class="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#181818] text-[#F63B05]">
                        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                    </div>
                    <h3 class="text-sm font-heading font-bold text-white">No maintenance or diagnostic records found</h3>
                    <p class="text-xs text-[#A1A1AA]">Maintenance logs submitted by users will display here automatically.</p>
                </div>
            @endif
        </div>

    </div>
</x-admin-layout>
