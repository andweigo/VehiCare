<x-admin-layout>
    <x-slot name="header">Diagnostics</x-slot>
    <x-slot name="description">AI Vehicle Symptom Analysis & Fault Severity Audit Queue</x-slot>

    <div class="space-y-6">

        <!-- Top Overview Banner -->
        <div class="rounded-xl border border-[#222222] bg-[#111111] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <h2 class="text-sm font-heading font-bold text-white uppercase tracking-wider">AI Symptom Diagnostics Queue</h2>
                <p class="text-[11px] text-[#A1A1AA]">Real-time record of multi-modal AI diagnostics performed by VehiCare members</p>
            </div>
            <div class="rounded-xl border border-[#222222] bg-[#181818] px-3.5 py-2 text-xs font-heading font-semibold text-white">
                Recorded Logs: <span class="text-[#F63B05]">{{ $totalCount }}</span>
            </div>
        </div>

        <!-- Diagnostics Table -->
        <div class="overflow-hidden rounded-xl border border-[#222222] bg-[#111111]">
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs text-[#A1A1AA]">
                    <thead class="bg-[#181818] text-[10px] font-heading font-bold uppercase tracking-wider text-[#666666] border-b border-[#222222]">
                        <tr>
                            <th class="px-4 py-3.5">ID</th>
                            <th class="px-4 py-3.5">User</th>
                            <th class="px-4 py-3.5">Vehicle Profile</th>
                            <th class="px-4 py-3.5">Symptoms</th>
                            <th class="px-4 py-3.5">Severity</th>
                            <th class="px-4 py-3.5">AI Cost Estimation</th>
                            <th class="px-4 py-3.5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-[#222222] bg-[#111111]">
                        @forelse($diagnostics as $d)
                            @php
                                $veh = $d->vehicle;
                                $vehName = $veh ? (($veh->vehicleBrand?->name ?? $veh->custom_brand ?? '') . ' ' . ($veh->vehicleModel?->name ?? $veh->custom_model ?? '')) : 'Unspecified';
                                $vehType = $veh->vehicleType?->name ?? 'Car';
                                $sev = strtoupper($d->severity ?? 'LOW');
                                $minCost = (float)($d->estimated_cost_min ?? 0);
                                $maxCost = (float)($d->estimated_cost_max ?? 0);
                                $hasCost = $minCost > 0 || $maxCost > 0;
                            @endphp
                            <tr class="hover:bg-[#181818]/60 transition">
                                <td class="px-4 py-3.5 font-heading font-bold text-white">
                                    #{{ $d->id }}
                                </td>
                                <td class="px-4 py-3.5">
                                    <div class="font-heading font-medium text-white">
                                        {{ $d->user?->name ?? 'Guest User' }}
                                    </div>
                                    <p class="text-[10px] text-[#666666]">{{ $d->user?->email ?? 'No email' }}</p>
                                </td>
                                <td class="px-4 py-3.5">
                                    <div class="flex items-center gap-2">
                                        <x-vehicle-type-icon :type="$vehType" class="h-4 w-4 text-[#F63B05]" />
                                        <span class="text-white font-medium">{{ trim($vehName) ?: 'Vehicle' }}</span>
                                    </div>
                                </td>
                                <td class="px-4 py-3.5 text-[#A1A1AA] max-w-xs truncate">
                                    {{ $d->symptoms ?: 'General inquiry' }}
                                </td>
                                <td class="px-4 py-3.5">
                                    @if($sev === 'CRITICAL')
                                        <span class="rounded bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[10px] font-heading font-bold text-rose-400">CRITICAL</span>
                                    @elseif($sev === 'HIGH')
                                        <span class="rounded bg-[#F63B05]/15 border border-[#F63B05]/30 px-2 py-0.5 text-[10px] font-heading font-bold text-[#F63B05]">HIGH</span>
                                    @elseif($sev === 'MODERATE')
                                        <span class="rounded bg-[#F59E0B]/15 border border-[#F59E0B]/30 px-2 py-0.5 text-[10px] font-heading font-bold text-[#F59E0B]">MODERATE</span>
                                    @else
                                        <span class="rounded bg-[#32D583]/15 border border-[#32D583]/30 px-2 py-0.5 text-[10px] font-heading font-bold text-[#32D583]">LOW</span>
                                    @endif
                                </td>
                                <td class="px-4 py-3.5 font-heading font-bold text-[#10B981]">
                                    @if($hasCost)
                                        ₱{{ number_format($minCost, 0) }} – ₱{{ number_format($maxCost, 0) }} PHP
                                    @else
                                        <span class="text-[#666666] font-normal text-[11px]">N/A</span>
                                    @endif
                                </td>
                                <td class="px-4 py-3.5 text-right">
                                    <a href="{{ route('admin.diagnostics.show', $d->id) }}" class="rounded-lg bg-[#181818] border border-[#222222] hover:border-[#F63B05] px-3 py-1.5 text-[11px] font-heading font-semibold text-white transition">
                                        View Report
                                    </a>
                                </td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="7" class="px-4 py-12 text-center text-xs text-[#666666]">
                                    No AI diagnostic logs recorded yet.
                                </td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>

            @if(method_exists($diagnostics, 'hasPages') && $diagnostics->hasPages())
                <div class="p-4 border-t border-[#222222]">
                    {{ $diagnostics->links() }}
                </div>
            @endif
        </div>

    </div>
</x-admin-layout>
