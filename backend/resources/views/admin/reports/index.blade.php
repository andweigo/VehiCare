<x-admin-layout>
    <x-slot name="header">Reports</x-slot>
    <x-slot name="description">Platform Operations Reports & Data Summary Metrics</x-slot>

    <div class="space-y-6">

        <div class="rounded-xl border border-[#222222] bg-[#111111] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <h2 class="text-sm font-heading font-bold text-white uppercase tracking-wider">System Operations Summary Report</h2>
                <p class="text-[11px] text-[#A1A1AA]">Real-time operational counts calculated directly from current backend database records</p>
            </div>
            <button onclick="window.print()" class="inline-flex items-center gap-2 rounded-xl bg-[#181818] border border-[#222222] hover:border-[#F63B05] px-3.5 py-2 text-xs font-heading font-semibold text-white transition">
                <svg class="h-4 w-4 text-[#F63B05]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
                </svg>
                Print Report Summary
            </button>
        </div>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div class="rounded-xl border border-[#222222] bg-[#111111] p-4 space-y-2">
                <span class="text-[10px] font-heading font-bold uppercase text-[#A1A1AA]">Platform Users</span>
                <p class="text-2xl font-heading font-extrabold text-white">{{ number_format($stats['total_users'] ?? 0) }}</p>
                <p class="text-[11px] text-[#32D583] font-medium">Registered Accounts</p>
            </div>

            <div class="rounded-xl border border-[#222222] bg-[#111111] p-4 space-y-2">
                <span class="text-[10px] font-heading font-bold uppercase text-[#A1A1AA]">Saved Vehicles</span>
                <p class="text-2xl font-heading font-extrabold text-white">{{ number_format($stats['total_vehicles'] ?? 0) }}</p>
                <p class="text-[11px] text-[#32D583] font-medium">{{ number_format($stats['active_vehicles']) }} active · {{ number_format($stats['archived_vehicles']) }} archived</p>
            </div>

            <div class="rounded-xl border border-[#222222] bg-[#111111] p-4 space-y-2">
                <span class="text-[10px] font-heading font-bold uppercase text-[#A1A1AA]">Diagnostic Records</span>
                <p class="text-2xl font-heading font-extrabold text-white">{{ number_format($stats['diagnostics']) }}</p>
                <p class="text-[11px] text-[#A1A1AA] font-medium">Persisted diagnostics, not all consultations</p>
            </div>

            <div class="rounded-xl border border-[#222222] bg-[#111111] p-4 space-y-2">
                <span class="text-[10px] font-heading font-bold uppercase text-[#A1A1AA]">AI Requests</span>
                <p class="text-2xl font-heading font-extrabold text-white">{{ number_format($stats['ai_successful'] + $stats['ai_failed']) }}</p>
                <p class="text-[11px] text-[#A1A1AA] font-medium">{{ number_format($stats['ai_successful']) }} successful · {{ number_format($stats['ai_failed']) }} failed</p>
            </div>

            <div class="rounded-xl border border-[#222222] bg-[#111111] p-4 space-y-2">
                <span class="text-[10px] font-heading font-bold uppercase text-[#A1A1AA]">Payments</span>
                <p class="text-2xl font-heading font-extrabold text-white">{{ number_format($stats['pending_payments']) }}</p>
                <p class="text-[11px] text-[#A1A1AA] font-medium">Pending verification · {{ number_format($stats['approved_payments']) }} approved</p>
            </div>

            <div class="rounded-xl border border-[#222222] bg-[#111111] p-4 space-y-2">
                <span class="text-[10px] font-heading font-bold uppercase text-[#A1A1AA]">Repair Directory</span>
                <p class="text-2xl font-heading font-extrabold text-white">{{ number_format($stats['active_repair_shops']) }}</p>
                <p class="text-[11px] text-[#A1A1AA] font-medium">Active shops available to discovery</p>
            </div>

            <div class="rounded-xl border border-[#222222] bg-[#111111] p-4 space-y-2">
                <span class="text-[10px] font-heading font-bold uppercase text-[#A1A1AA]">Service Referral History</span>
                <p class="text-2xl font-heading font-extrabold text-white">{{ number_format($stats['service_referrals']) }}</p>
                <p class="text-[11px] text-[#A1A1AA] font-medium">Retained user-selected shop records</p>
            </div>

            <div class="rounded-xl border border-[#222222] bg-[#111111] p-4 space-y-2">
                <span class="text-[10px] font-heading font-bold uppercase text-[#A1A1AA]">Maintenance History</span>
                <p class="text-2xl font-heading font-extrabold text-white">{{ number_format($stats['maintenance_records']) }}</p>
                <p class="text-[11px] text-[#A1A1AA] font-medium">User-owned records retained</p>
            </div>
        </div>

    </div>
</x-admin-layout>
