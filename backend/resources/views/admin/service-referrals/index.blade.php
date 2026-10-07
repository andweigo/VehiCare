<x-admin-layout>
    <x-slot name="header">Service Referrals</x-slot>
    <x-slot name="description">Certified Repair Shop Referral Dispatch & Status Management</x-slot>

    <div class="space-y-6">

        <div class="rounded-xl border border-[#222222] bg-[#111111] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <h2 class="text-sm font-heading font-bold text-white uppercase tracking-wider">Service Referrals Queue</h2>
                <p class="text-[11px] text-[#A1A1AA]">Manage repair shop referrals initiated from AI vehicle diagnostics</p>
            </div>
            <div class="rounded-xl border border-[#222222] bg-[#181818] px-3.5 py-2 text-xs font-heading font-semibold text-white">
                Total Referrals: <span class="text-[#F63B05]">{{ count($referrals) }}</span>
            </div>
        </div>

        <div class="overflow-hidden rounded-xl border border-[#222222] bg-[#111111]">
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs text-[#A1A1AA]">
                    <thead class="bg-[#181818] text-[10px] font-heading font-bold uppercase tracking-wider text-[#666666] border-b border-[#222222]">
                        <tr>
                            <th class="px-4 py-3">User</th>
                            <th class="px-4 py-3">Vehicle</th>
                            <th class="px-4 py-3">Issue</th>
                            <th class="px-4 py-3">Recommended Shop</th>
                            <th class="px-4 py-3">Status</th>
                            <th class="px-4 py-3">Date</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-[#222222] bg-[#111111]">
                        @forelse($referrals as $ref)
                            <tr class="hover:bg-[#181818]/60 transition">
                                <td class="px-4 py-3 font-heading font-semibold text-white">{{ $ref['user'] }}</td>
                                <td class="px-4 py-3 text-white">{{ $ref['vehicle'] }}</td>
                                <td class="px-4 py-3 text-[#A1A1AA]">{{ $ref['issue'] }}</td>
                                <td class="px-4 py-3 text-white">{{ $ref['shop'] }}</td>
                                <td class="px-4 py-3">
                                    <span class="rounded bg-[#F59E0B]/15 border border-[#F59E0B]/30 px-2 py-0.5 text-[10px] font-heading font-bold text-[#F59E0B]">
                                        {{ strtoupper($ref['status'] ?? 'PENDING') }}
                                    </span>
                                </td>
                                <td class="px-4 py-3 text-[#666666]">{{ $ref['date'] }}</td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="6" class="px-4 py-12 text-center text-xs text-[#666666]">
                                    <!-- Empty State -->
                                    <div class="space-y-2">
                                        <div class="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#181818] text-[#F63B05]">
                                            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0v-4m0 4h4m-4-4l-3-3m3 3l3-3"/>
                                            </svg>
                                        </div>
                                        <p class="font-heading font-bold text-white">No service referrals yet</p>
                                        <p class="text-[11px] text-[#A1A1AA]">When users request automated shop referrals, they will appear in this dispatch queue.</p>
                                    </div>
                                </td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        </div>

    </div>
</x-admin-layout>
