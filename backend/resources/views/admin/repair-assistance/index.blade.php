<x-admin-layout>
    <x-slot name="header">Repair Assistance</x-slot>
    <x-slot name="description">Guided Automotive Repair Recommendations & Technical Advice</x-slot>

    <div class="space-y-6">

        <div class="rounded-xl border border-[#222222] bg-[#111111] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <h2 class="text-sm font-heading font-bold text-white uppercase tracking-wider">Repair Assistance Desk</h2>
                <p class="text-[11px] text-[#A1A1AA]">Monitor user requests for step-by-step repair guides and component instructions</p>
            </div>
            <div class="rounded-xl border border-[#222222] bg-[#181818] px-3.5 py-2 text-xs font-heading font-semibold text-white">
                Assistance Requests: <span class="text-[#F63B05]">{{ count($assistanceItems) }}</span>
            </div>
        </div>

        <div class="overflow-hidden rounded-xl border border-[#222222] bg-[#111111]">
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs text-[#A1A1AA]">
                    <thead class="bg-[#181818] text-[10px] font-heading font-bold uppercase tracking-wider text-[#666666] border-b border-[#222222]">
                        <tr>
                            <th class="px-4 py-3">Vehicle</th>
                            <th class="px-4 py-3">User</th>
                            <th class="px-4 py-3">Problem</th>
                            <th class="px-4 py-3">Severity</th>
                            <th class="px-4 py-3">Recommendation</th>
                            <th class="px-4 py-3">Date</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-[#222222] bg-[#111111]">
                        @forelse($assistanceItems as $item)
                            <tr class="hover:bg-[#181818]/60 transition">
                                <td class="px-4 py-3 font-heading font-semibold text-white">{{ $item['vehicle'] }}</td>
                                <td class="px-4 py-3 text-white">{{ $item['user'] }}</td>
                                <td class="px-4 py-3 text-[#A1A1AA]">{{ $item['problem'] }}</td>
                                <td class="px-4 py-3 text-[#F59E0B] font-bold">{{ $item['severity'] }}</td>
                                <td class="px-4 py-3 text-white">{{ $item['recommendation'] }}</td>
                                <td class="px-4 py-3 text-[#666666]">{{ $item['date'] }}</td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="6" class="px-4 py-12 text-center text-xs text-[#666666]">
                                    <div class="space-y-2">
                                        <div class="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#181818] text-[#F63B05]">
                                            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                                            </svg>
                                        </div>
                                        <p class="font-heading font-bold text-white">No active repair assistance requests</p>
                                        <p class="text-[11px] text-[#A1A1AA]">Guided technical assistance inquiries will be logged here.</p>
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
