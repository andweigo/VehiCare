<x-admin-layout>
    <x-slot name="header">Vehicle Edit Request #{{ $request->id }}</x-slot>
    <x-slot name="description">Review requested changes, compare current vs requested values, and approve or reject</x-slot>

    <div class="space-y-6 max-w-4xl">
        <!-- Back Link -->
        <div>
            <a href="{{ route('admin.correction-requests.index') }}" class="inline-flex items-center gap-1.5 text-xs font-heading font-semibold text-[#A1A1AA] hover:text-white transition">
                &larr; Back to Correction Requests Queue
            </a>
        </div>

        <!-- Request Status Header -->
        <div class="rounded-xl border border-[#222222] bg-[#111111] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <p class="text-[10px] font-heading font-bold uppercase text-[#666666]">Submitted By</p>
                <h1 class="text-lg font-heading font-bold text-white mt-0.5">{{ $request->user->name }}</h1>
                <p class="text-xs text-[#A1A1AA]">{{ $request->user->email }} &bull; Submitted {{ optional($request->submitted_at)->format('M d, Y H:i') }}</p>
            </div>
            <div>
                @if($request->status === 'pending')
                    <span class="rounded bg-[#F59E0B]/15 border border-[#F59E0B]/30 px-3 py-1 text-xs font-heading font-bold text-[#F59E0B]">PENDING REVIEW</span>
                @elseif($request->status === 'approved')
                    <span class="rounded bg-[#32D583]/15 border border-[#32D583]/30 px-3 py-1 text-xs font-heading font-bold text-[#32D583]">APPROVED & APPLIED</span>
                @else
                    <span class="rounded bg-rose-500/15 border border-rose-500/30 px-3 py-1 text-xs font-heading font-bold text-rose-400">REJECTED</span>
                @endif
            </div>
        </div>

        <!-- Requested Changes Diff Table -->
        <div class="rounded-xl border border-[#222222] bg-[#111111] p-5 space-y-4">
            <h2 class="text-sm font-heading font-bold text-white uppercase tracking-wider">Requested Value Comparison</h2>

            @php
                $curr = (array)$request->current_values;
                $req = (array)$request->requested_values;
                $fields = (array)$request->requested_fields;
            @endphp

            <div class="overflow-x-auto rounded-xl border border-[#222222]">
                <table class="w-full text-left text-xs text-[#A1A1AA]">
                    <thead class="bg-[#181818] text-[10px] font-heading font-bold uppercase tracking-wider text-[#666666] border-b border-[#222222]">
                        <tr>
                            <th class="px-4 py-3">Field</th>
                            <th class="px-4 py-3">Current Value</th>
                            <th class="px-4 py-3">Requested Value</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-[#222222] bg-[#111111]">
                        @forelse($req as $key => $newVal)
                            @php
                                $oldVal = $curr[$key] ?? '—';
                                $fieldName = ucwords(str_replace(['_', 'id'], [' ', ''], $key));
                            @endphp
                            <tr class="hover:bg-[#181818]/60 transition">
                                <td class="px-4 py-3 font-heading font-bold text-white">
                                    {{ $fieldName }}
                                </td>
                                <td class="px-4 py-3 text-[#A1A1AA] line-through">
                                    {{ is_array($oldVal) ? json_encode($oldVal) : $oldVal }}
                                </td>
                                <td class="px-4 py-3 font-heading font-bold text-[#32D583]">
                                    {{ is_array($newVal) ? json_encode($newVal) : $newVal }}
                                </td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="3" class="px-4 py-6 text-center text-xs text-[#666666]">
                                    No value comparisons recorded.
                                </td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>

            <!-- Reason Box -->
            <div class="pt-2">
                <p class="text-[10px] font-heading font-bold uppercase text-[#666666] mb-1">Reason for Request</p>
                <div class="rounded-xl border border-[#222222] bg-[#181818] p-3 text-xs text-white leading-relaxed">
                    {{ $request->reason }}
                </div>
            </div>
        </div>

        <!-- Decision Action Cards -->
        @if($request->status === 'pending')
            <div class="grid gap-6 md:grid-cols-2">
                
                <!-- APPROVE FORM -->
                <div class="rounded-xl border border-[#32D583]/30 bg-[#111111] p-5 space-y-4">
                    <h3 class="text-xs font-heading font-bold text-[#32D583] uppercase tracking-wider">Approve & Apply Changes</h3>
                    <p class="text-xs text-[#A1A1AA]">Approving will automatically update the vehicle record and send a notification to the user.</p>

                    <form action="{{ route('admin.correction-requests.approve', $request->id) }}" method="POST" class="space-y-3">
                        @csrf
                        <div>
                            <label class="block text-[10px] font-heading font-bold text-[#A1A1AA] mb-1 uppercase">Approval Notes (Optional)</label>
                            <textarea name="admin_notes" rows="2" placeholder="Optional notes for user..." class="w-full rounded-xl border border-[#222222] bg-[#181818] p-2.5 text-xs text-white outline-none focus:border-[#32D583]"></textarea>
                        </div>
                        <button type="submit" class="w-full rounded-xl bg-[#32D583] px-4 py-2.5 text-xs font-heading font-semibold text-black hover:bg-[#28b86e] transition">
                            Approve & Update Vehicle
                        </button>
                    </form>
                </div>

                <!-- REJECT FORM -->
                <div class="rounded-xl border border-rose-500/30 bg-[#111111] p-5 space-y-4">
                    <h3 class="text-xs font-heading font-bold text-rose-400 uppercase tracking-wider">Reject Request</h3>
                    <p class="text-xs text-[#A1A1AA]">Rejecting requires providing a reason. The vehicle record will remain unchanged.</p>

                    <form action="{{ route('admin.correction-requests.reject', $request->id) }}" method="POST" class="space-y-3">
                        @csrf
                        <div>
                            <label class="block text-[10px] font-heading font-bold text-rose-400 mb-1 uppercase">Rejection Reason (Required)</label>
                            <textarea name="admin_notes" rows="2" required placeholder="Explain why request was rejected..." class="w-full rounded-xl border border-[#222222] bg-[#181818] p-2.5 text-xs text-white outline-none focus:border-rose-500"></textarea>
                        </div>
                        <button type="submit" class="w-full rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-heading font-semibold text-white hover:bg-rose-700 transition">
                            Reject Request & Send Reason
                        </button>
                    </form>
                </div>

            </div>
        @else
            <div class="rounded-xl border border-[#222222] bg-[#111111] p-5 text-center space-y-2">
                <p class="text-xs font-heading font-bold text-white uppercase">Request Processed</p>
                <p class="text-xs text-[#A1A1AA]">Status: <span class="font-bold text-white">{{ strtoupper($request->status) }}</span></p>
                @if($request->admin_notes)
                    <p class="text-xs text-[#666666]">Admin Notes: "{{ $request->admin_notes }}"</p>
                @endif
            </div>
        @endif

    </div>
</x-admin-layout>
