<x-admin-layout>
    <x-slot name="header">Correction Requests</x-slot>
    <x-slot name="description">Review User Submissions & Approve Spec Corrections</x-slot>

    <div class="space-y-6">

        <div class="rounded-xl border border-[#222222] bg-[#111111] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <h2 class="text-sm font-heading font-bold text-white uppercase tracking-wider">Vehicle Correction Queue</h2>
                <p class="text-[11px] text-[#A1A1AA]">Review user requests to correct vehicle brands, models, or specifications</p>
            </div>
            <div class="rounded-xl border border-[#222222] bg-[#181818] px-3.5 py-2 text-xs font-heading font-semibold text-white">
                Queue Total: <span class="text-[#F63B05]">{{ $requests->count() }}</span>
            </div>
        </div>

        <div class="overflow-hidden rounded-xl border border-[#222222] bg-[#111111]">
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs text-[#A1A1AA]">
                    <thead class="bg-[#181818] text-[10px] font-heading font-bold uppercase tracking-wider text-[#666666] border-b border-[#222222]">
                        <tr>
                            <th class="px-4 py-3">Request ID</th>
                            <th class="px-4 py-3">User</th>
                            <th class="px-4 py-3">Target Vehicle</th>
                            <th class="px-4 py-3">Status</th>
                            <th class="px-4 py-3">Submitted Date</th>
                            <th class="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-[#222222] bg-[#111111]">
                        @forelse($requests as $req)
                            <tr class="hover:bg-[#181818]/60 transition">
                                <td class="px-4 py-3 font-heading font-bold text-white">
                                    #{{ $req->id }}
                                </td>
                                <td class="px-4 py-3 text-white">
                                    {{ $req->user->name ?? 'User #'.$req->user_id }}
                                </td>
                                <td class="px-4 py-3 text-[#A1A1AA]">
                                    {{ optional($req->vehicle->vehicleBrand)->name ?? $req->vehicle->custom_brand ?? 'Vehicle #'.$req->vehicle_id }}
                                </td>
                                <td class="px-4 py-3">
                                    @if($req->status === 'pending')
                                        <span class="rounded bg-[#F59E0B]/15 border border-[#F59E0B]/30 px-2 py-0.5 text-[10px] font-heading font-bold text-[#F59E0B]">PENDING</span>
                                    @elseif($req->status === 'approved')
                                        <span class="rounded bg-[#32D583]/15 border border-[#32D583]/30 px-2 py-0.5 text-[10px] font-heading font-bold text-[#32D583]">APPROVED</span>
                                    @else
                                        <span class="rounded bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[10px] font-heading font-bold text-rose-400">REJECTED</span>
                                    @endif
                                </td>
                                <td class="px-4 py-3 text-[#666666]">
                                    {{ optional($req->submitted_at)->format('M d, Y') ?? '—' }}
                                </td>
                                <td class="px-4 py-3 text-right">
                                    <a href="{{ route('admin.correction-requests.show', $req->id) }}" class="rounded bg-[#181818] border border-[#222222] hover:border-[#F63B05] px-2.5 py-1 text-[11px] font-heading font-semibold text-white transition">
                                        Review
                                    </a>
                                </td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="6" class="px-4 py-12 text-center text-xs text-[#666666]">
                                    No vehicle correction requests pending.
                                </td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        </div>

    </div>
</x-admin-layout>
