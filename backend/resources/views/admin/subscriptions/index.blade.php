<x-admin-layout>
    <x-slot name="header">Payment & Subscription Management</x-slot>
    <x-slot name="description">Verify Simulated Payments, Handle Rejections & Complete Refunds (VehiCare Capstone)</x-slot>

    <div class="space-y-6">

        {{-- Status Flash Alert --}}
        @if(session('status'))
            <div class="rounded-xl border border-[#F63B05]/30 bg-[#F63B05]/10 p-4 text-xs font-heading font-semibold text-white flex items-center gap-3">
                <svg class="w-5 h-5 text-[#F63B05]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{{ session('status') }}</span>
            </div>
        @endif

        {{-- Overview Metric Cards --}}
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="rounded-xl border border-[#222222] bg-[#111111] p-4 flex items-center justify-between">
                <div>
                    <p class="text-[10px] font-heading font-bold text-[#A1A1AA] uppercase tracking-wider">Pending Verification</p>
                    <p id="statPendingCount" class="text-xl font-heading font-bold text-amber-500 mt-1">{{ $stats['pending_count'] }}</p>
                </div>
                <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                </div>
            </div>

            <div class="rounded-xl border border-[#222222] bg-[#111111] p-4 flex items-center justify-between">
                <div>
                    <p class="text-[10px] font-heading font-bold text-[#A1A1AA] uppercase tracking-wider">Refund Processing</p>
                    <p id="statRefundProcessingCount" class="text-xl font-heading font-bold text-rose-500 mt-1">{{ $stats['refund_processing_count'] }}</p>
                </div>
                <div class="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                    </svg>
                </div>
            </div>

            <div class="rounded-xl border border-[#222222] bg-[#111111] p-4 flex items-center justify-between">
                <div>
                    <p class="text-[10px] font-heading font-bold text-[#A1A1AA] uppercase tracking-wider">Active Premium Users</p>
                    <p id="statPremiumUsersCount" class="text-xl font-heading font-bold text-[#F63B05] mt-1">{{ $stats['premium_users'] }}</p>
                </div>
                <div class="w-10 h-10 rounded-xl bg-[#F63B05]/10 border border-[#F63B05]/20 flex items-center justify-center text-[#F63B05]">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                    </svg>
                </div>
            </div>

            <div class="rounded-xl border border-[#222222] bg-[#111111] p-4 flex items-center justify-between">
                <div>
                    <p class="text-[10px] font-heading font-bold text-[#A1A1AA] uppercase tracking-wider">Total Payment Attempts</p>
                    <p id="statTotalPaymentsCount" class="text-xl font-heading font-bold text-white mt-1">{{ $stats['total_payments'] }}</p>
                </div>
                <div class="w-10 h-10 rounded-xl bg-[#181818] border border-[#222222] flex items-center justify-center text-[#A1A1AA]">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                </div>
            </div>
        </div>

        {{-- Filter Tabs --}}
        <div class="flex flex-wrap items-center gap-2 border-b border-[#222222] pb-3">
            <a href="{{ route('admin.subscriptions.index', ['tab' => 'all']) }}" 
               class="px-3.5 py-1.5 rounded-lg text-xs font-heading font-semibold transition {{ $tab === 'all' ? 'bg-[#F63B05] text-white' : 'bg-[#181818] text-[#A1A1AA] hover:text-white border border-[#222222]' }}">
               All Payments (<span id="tabAllCount">{{ $stats['total_payments'] }}</span>)
            </a>
            <a href="{{ route('admin.subscriptions.index', ['tab' => 'pending']) }}" 
               class="px-3.5 py-1.5 rounded-lg text-xs font-heading font-semibold transition {{ $tab === 'pending' ? 'bg-amber-500 text-white' : 'bg-[#181818] text-[#A1A1AA] hover:text-white border border-[#222222]' }}">
               Pending Verification (<span id="tabPendingCount">{{ $stats['pending_count'] }}</span>)
            </a>
            <a href="{{ route('admin.subscriptions.index', ['tab' => 'refund_processing']) }}" 
               class="px-3.5 py-1.5 rounded-lg text-xs font-heading font-semibold transition {{ $tab === 'refund_processing' ? 'bg-rose-500 text-white' : 'bg-[#181818] text-[#A1A1AA] hover:text-white border border-[#222222]' }}">
               Refund Processing (<span id="tabRefundProcessingCount">{{ $stats['refund_processing_count'] }}</span>)
            </a>
            <a href="{{ route('admin.subscriptions.index', ['tab' => 'approved']) }}" 
               class="px-3.5 py-1.5 rounded-lg text-xs font-heading font-semibold transition {{ $tab === 'approved' ? 'bg-emerald-600 text-white' : 'bg-[#181818] text-[#A1A1AA] hover:text-white border border-[#222222]' }}">
               Approved (<span id="tabApprovedCount">{{ $stats['approved_count'] }}</span>)
            </a>
        </div>

        {{-- Payments Table --}}
        <div class="overflow-hidden rounded-xl border border-[#222222] bg-[#111111]">
            <div class="p-4 border-b border-[#222222] flex justify-between items-center">
                <div class="flex items-center gap-2.5">
                    <h3 class="text-sm font-heading font-bold text-white uppercase tracking-wider">Simulated Payment Records</h3>
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-heading font-bold text-emerald-400">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                        LIVE REALTIME SYNC
                    </span>
                </div>
                <span class="text-xs text-[#A1A1AA]">VehiCare Capstone Financial Workflow</span>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs text-[#A1A1AA]">
                    <thead class="bg-[#181818] text-[10px] font-heading font-bold uppercase tracking-wider text-[#666666] border-b border-[#222222]">
                        <tr>
                            <th class="px-4 py-3">User</th>
                            <th class="px-4 py-3">Plan & Cycle</th>
                            <th class="px-4 py-3">Amount</th>
                            <th class="px-4 py-3">Method</th>
                            <th class="px-4 py-3">Reference Number</th>
                            <th class="px-4 py-3">Payment Status</th>
                            <th class="px-4 py-3">Refund Status</th>
                            <th class="px-4 py-3">Submitted Date</th>
                            <th class="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="paymentsTableBody" class="divide-y divide-[#222222] bg-[#111111]">
                        @forelse($payments as $payment)
                            <tr class="hover:bg-[#181818]/60 transition" data-id="{{ $payment->id }}">
                                <td class="px-4 py-3">
                                    <div class="font-heading font-semibold text-white">{{ $payment->user?->name ?? 'User #' . $payment->user_id }}</div>
                                    <div class="text-[11px] text-[#666666]">{{ $payment->user?->email }}</div>
                                </td>
                                <td class="px-4 py-3 font-heading font-medium text-white">
                                    Premium ({{ ucfirst($payment->billing_cycle) }})
                                </td>
                                <td class="px-4 py-3 font-heading font-bold text-[#F63B05]">
                                    ₱{{ number_format((float) $payment->amount, 2) }}
                                </td>
                                <td class="px-4 py-3">
                                    <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-heading font-bold uppercase bg-[#181818] text-[#A1A1AA] border border-[#222222]">
                                        {{ $payment->payment_method }}
                                    </span>
                                </td>
                                <td class="px-4 py-3 font-mono text-xs font-semibold text-white">
                                    {{ $payment->reference_number }}
                                </td>
                                <td class="px-4 py-3">
                                    @if($payment->status === 'approved')
                                        <span class="inline-flex items-center gap-1 rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-heading font-bold text-emerald-400">
                                            ✓ APPROVED
                                        </span>
                                    @elseif($payment->status === 'rejected')
                                        <span class="inline-flex items-center gap-1 rounded bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[10px] font-heading font-bold text-rose-400">
                                            ✕ REJECTED
                                        </span>
                                    @else
                                        <span class="inline-flex items-center gap-1 rounded bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-heading font-bold text-amber-400">
                                            ⏳ PENDING
                                        </span>
                                    @endif
                                </td>
                                <td class="px-4 py-3">
                                    @if($payment->refund_status === 'refunded')
                                        <span class="inline-flex items-center gap-1 rounded bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 text-[10px] font-heading font-bold text-blue-400">
                                            REFUNDED
                                        </span>
                                    @elseif($payment->refund_status === 'processing')
                                        <span class="inline-flex items-center gap-1 rounded bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[10px] font-heading font-bold text-rose-400 animate-pulse">
                                            PROCESSING
                                        </span>
                                    @else
                                        <span class="text-[#666666]">—</span>
                                    @endif
                                </td>
                                <td class="px-4 py-3 text-[11px] text-[#A1A1AA]">
                                    {{ $payment->submitted_at ? $payment->submitted_at->format('M d, Y H:i') : $payment->created_at->format('M d, Y') }}
                                </td>
                                <td class="px-4 py-3 text-right">
                                    <div class="flex items-center justify-end gap-2">
                                        @if($payment->status === 'pending')
                                            {{-- Approve Button --}}
                                            <form action="{{ route('admin.payments.approve', $payment->id) }}" method="POST" onsubmit="return confirm('Approve payment {{ $payment->reference_number }} and activate Premium for {{ $payment->user?->name }}?');">
                                                @csrf
                                                <button type="submit" class="rounded bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 text-[11px] font-heading font-bold transition shadow">
                                                    Approve
                                                </button>
                                            </form>

                                            {{-- Reject Trigger Modal Button --}}
                                            <button type="button" 
                                                    onclick="openRejectModal({{ $payment->id }}, '{{ $payment->reference_number }}', '{{ $payment->user?->name }}', '₱{{ number_format((float) $payment->amount, 2) }}')" 
                                                    class="rounded bg-rose-600/20 hover:bg-rose-600 border border-rose-600/40 text-rose-400 hover:text-white px-2.5 py-1 text-[11px] font-heading font-bold transition">
                                                Reject
                                            </button>
                                        @elseif($payment->status === 'rejected' && $payment->refund_status === 'processing')
                                            {{-- Complete Refund Action Button --}}
                                            <form action="{{ route('admin.payments.complete-refund', $payment->id) }}" method="POST" onsubmit="return confirm('Complete simulated refund of ₱{{ number_format((float) $payment->amount, 2) }} for {{ $payment->reference_number }}? User will be allowed to make a new payment.');">
                                                @csrf
                                                <button type="submit" class="rounded bg-rose-600 hover:bg-rose-500 text-white px-2.5 py-1 text-[11px] font-heading font-bold transition shadow flex items-center gap-1">
                                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                                                    Complete Refund
                                                </button>
                                            </form>
                                        @else
                                            <span class="text-[11px] text-[#666666] italic">Verified</span>
                                        @endif
                                    </div>
                                </td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="9" class="px-4 py-8 text-center text-[#666666]">
                                    No payment records found for this filter tab.
                                </td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        </div>

    </div>

    {{-- Rejection Modal --}}
    <div id="rejectModal" class="fixed inset-0 z-50 hidden bg-black/75 backdrop-blur-sm items-center justify-center p-4">
        <div class="w-full max-w-md rounded-2xl border border-[#222222] bg-[#111111] p-6 shadow-2xl space-y-4">
            <div class="flex justify-between items-center border-b border-[#222222] pb-3">
                <h3 class="text-sm font-heading font-bold text-white uppercase tracking-wider">Reject Simulated Payment</h3>
                <button type="button" onclick="closeRejectModal()" class="text-[#A1A1AA] hover:text-white">&times;</button>
            </div>

            <form id="rejectForm" method="POST" class="space-y-4">
                @csrf
                <div>
                    <p class="text-xs text-[#A1A1AA]">Reference: <span id="modalRef" class="font-mono text-white font-bold"></span></p>
                    <p class="text-xs text-[#A1A1AA]">Subscriber: <span id="modalUser" class="text-white font-bold"></span></p>
                    <p class="text-xs text-[#A1A1AA]">Amount: <span id="modalAmount" class="text-[#F63B05] font-bold"></span></p>
                </div>

                <div class="space-y-1">
                    <label class="text-xs font-heading font-semibold text-[#A1A1AA]">Rejection Reason</label>
                    <select name="rejection_reason_preset" id="reasonSelect" onchange="toggleCustomReason()" class="w-full rounded-xl border border-[#222222] bg-[#181818] px-3 py-2 text-xs text-white focus:border-[#F63B05] focus:outline-none">
                        <option value="Payment could not be verified">Payment could not be verified</option>
                        <option value="Incorrect reference number">Incorrect reference number</option>
                        <option value="Incorrect amount">Incorrect amount</option>
                        <option value="Duplicate transaction">Duplicate transaction</option>
                        <option value="Invalid payment details">Invalid payment details</option>
                        <option value="Other">Other (Custom Reason)</option>
                    </select>
                </div>

                <div id="customReasonWrap" class="space-y-1 hidden">
                    <label class="text-xs font-heading font-semibold text-[#A1A1AA]">Custom Reason Details</label>
                    <textarea name="custom_rejection_reason" rows="3" placeholder="Enter reason details..." class="w-full rounded-xl border border-[#222222] bg-[#181818] p-3 text-xs text-white focus:border-[#F63B05] focus:outline-none"></textarea>
                </div>

                <div class="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-[11px] text-rose-300">
                    ⚠️ Rejecting this payment sets refund status to <strong>Processing (1–3 business days)</strong> and blocks user from paying again until refund completion.
                </div>

                <div class="flex justify-end gap-3 pt-2">
                    <button type="button" onclick="closeRejectModal()" class="rounded-xl border border-[#222222] bg-[#181818] px-4 py-2 text-xs font-heading font-semibold text-white hover:bg-[#222222] transition">
                        Cancel
                    </button>
                    <button type="submit" class="rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-heading font-bold text-white transition shadow">
                        Confirm Rejection
                    </button>
                </div>
            </form>
        </div>
    </div>

    <script>
        const currentTab = '{{ $tab }}';
        let isModalOpen = false;

        function openRejectModal(id, ref, user, amount) {
            isModalOpen = true;
            document.getElementById('modalRef').innerText = ref;
            document.getElementById('modalUser').innerText = user;
            document.getElementById('modalAmount').innerText = amount;
            document.getElementById('rejectForm').action = '/admin/payments/' + id + '/reject';
            document.getElementById('rejectModal').classList.remove('hidden');
            document.getElementById('rejectModal').classList.add('flex');
        }

        function closeRejectModal() {
            isModalOpen = false;
            document.getElementById('rejectModal').classList.remove('flex');
            document.getElementById('rejectModal').classList.add('hidden');
        }

        function toggleCustomReason() {
            const select = document.getElementById('reasonSelect');
            const wrap = document.getElementById('customReasonWrap');
            if (select.value === 'Other') {
                wrap.classList.remove('hidden');
            } else {
                wrap.classList.add('hidden');
            }
        }

        // Live Realtime Poller for Admin Dashboard
        async function fetchLiveAdminData() {
            if (isModalOpen) return;

            try {
                const response = await fetch('/admin/subscriptions?tab=' + currentTab, {
                    headers: {
                        'Accept': 'application/json',
                        'X-Live-Poll': 'true'
                    }
                });

                if (!response.ok) return;

                const data = await response.json();
                if (data.status === 'success' && data.stats) {
                    // Update Stats Cards
                    document.getElementById('statPendingCount').innerText = data.stats.pending_count;
                    document.getElementById('statRefundProcessingCount').innerText = data.stats.refund_processing_count;
                    document.getElementById('statPremiumUsersCount').innerText = data.stats.premium_users;
                    document.getElementById('statTotalPaymentsCount').innerText = data.stats.total_payments;

                    // Update Tab Counters
                    if (document.getElementById('tabAllCount')) document.getElementById('tabAllCount').innerText = data.stats.total_payments;
                    if (document.getElementById('tabPendingCount')) document.getElementById('tabPendingCount').innerText = data.stats.pending_count;
                    if (document.getElementById('tabRefundProcessingCount')) document.getElementById('tabRefundProcessingCount').innerText = data.stats.refund_processing_count;
                    if (document.getElementById('tabApprovedCount')) document.getElementById('tabApprovedCount').innerText = data.stats.approved_count;

                    // Update Table Rows
                    if (Array.isArray(data.payments)) {
                        renderAdminTableRows(data.payments);
                    }
                }
            } catch (err) {
                console.warn('Live admin data poll error:', err);
            }
        }

        function renderAdminTableRows(payments) {
            const tbody = document.getElementById('paymentsTableBody');
            if (!tbody) return;

            if (payments.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="9" class="px-4 py-8 text-center text-[#666666]">
                            No payment records found for this filter tab.
                        </td>
                    </tr>
                `;
                return;
            }

            const rowsHtml = payments.map(p => {
                const userName = p.user ? p.user.name : ('User #' + p.user_id);
                const userEmail = p.user ? p.user.email : '';
                const amount = Number(p.amount).toFixed(2);
                const cycle = p.billing_cycle ? (p.billing_cycle.charAt(0).toUpperCase() + p.billing_cycle.slice(1)) : 'Monthly';
                const method = (p.payment_method || 'CARD').toUpperCase();
                const submittedDate = p.submitted_at ? new Date(p.submitted_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

                // Payment Status Badge
                let statusBadge = '';
                if (p.status === 'approved') {
                    statusBadge = `<span class="inline-flex items-center gap-1 rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-heading font-bold text-emerald-400">✓ APPROVED</span>`;
                } else if (p.status === 'rejected') {
                    statusBadge = `<span class="inline-flex items-center gap-1 rounded bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[10px] font-heading font-bold text-rose-400">✕ REJECTED</span>`;
                } else {
                    statusBadge = `<span class="inline-flex items-center gap-1 rounded bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-heading font-bold text-amber-400">⏳ PENDING</span>`;
                }

                // Refund Status Badge
                let refundBadge = '<span class="text-[#666666]">—</span>';
                if (p.refund_status === 'refunded') {
                    refundBadge = `<span class="inline-flex items-center gap-1 rounded bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 text-[10px] font-heading font-bold text-blue-400">REFUNDED</span>`;
                } else if (p.refund_status === 'processing') {
                    refundBadge = `<span class="inline-flex items-center gap-1 rounded bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[10px] font-heading font-bold text-rose-400 animate-pulse">PROCESSING</span>`;
                }

                // Action Buttons
                let actionsHtml = '<span class="text-[11px] text-[#666666] italic">Verified</span>';
                if (p.status === 'pending') {
                    actionsHtml = `
                        <form action="/admin/payments/${p.id}/approve" method="POST" onsubmit="return confirm('Approve payment ${p.reference_number} and activate Premium for ${userName}?');">
                            <input type="hidden" name="_token" value="${csrfToken}">
                            <button type="submit" class="rounded bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 text-[11px] font-heading font-bold transition shadow">
                                Approve
                            </button>
                        </form>
                        <button type="button" 
                                onclick="openRejectModal(${p.id}, '${p.reference_number}', '${userName}', '₱${amount}')" 
                                class="rounded bg-rose-600/20 hover:bg-rose-600 border border-rose-600/40 text-rose-400 hover:text-white px-2.5 py-1 text-[11px] font-heading font-bold transition">
                            Reject
                        </button>
                    `;
                } else if (p.status === 'rejected' && p.refund_status === 'processing') {
                    actionsHtml = `
                        <form action="/admin/payments/${p.id}/complete-refund" method="POST" onsubmit="return confirm('Complete simulated refund of ₱${amount} for ${p.reference_number}? User will be allowed to make a new payment.');">
                            <input type="hidden" name="_token" value="${csrfToken}">
                            <button type="submit" class="rounded bg-rose-600 hover:bg-rose-500 text-white px-2.5 py-1 text-[11px] font-heading font-bold transition shadow flex items-center gap-1">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                                Complete Refund
                            </button>
                        </form>
                    `;
                }

                return `
                    <tr class="hover:bg-[#181818]/60 transition" data-id="${p.id}">
                        <td class="px-4 py-3">
                            <div class="font-heading font-semibold text-white">${userName}</div>
                            <div class="text-[11px] text-[#666666]">${userEmail}</div>
                        </td>
                        <td class="px-4 py-3 font-heading font-medium text-white">
                            Premium (${cycle})
                        </td>
                        <td class="px-4 py-3 font-heading font-bold text-[#F63B05]">
                            ₱${amount}
                        </td>
                        <td class="px-4 py-3">
                            <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-heading font-bold uppercase bg-[#181818] text-[#A1A1AA] border border-[#222222]">
                                ${method}
                            </span>
                        </td>
                        <td class="px-4 py-3 font-mono text-xs font-semibold text-white">
                            ${p.reference_number}
                        </td>
                        <td class="px-4 py-3">
                            ${statusBadge}
                        </td>
                        <td class="px-4 py-3">
                            ${refundBadge}
                        </td>
                        <td class="px-4 py-3 text-[11px] text-[#A1A1AA]">
                            ${submittedDate}
                        </td>
                        <td class="px-4 py-3 text-right">
                            <div class="flex items-center justify-end gap-2">
                                ${actionsHtml}
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');

            tbody.innerHTML = rowsHtml;
        }

        const csrfToken = '{{ csrf_token() }}';

        // Poll every 3 seconds for live real-time updates
        setInterval(fetchLiveAdminData, 3000);
    </script>
</x-admin-layout>
