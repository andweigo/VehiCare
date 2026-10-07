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
                <span class="text-[10px] font-heading font-bold uppercase text-[#A1A1AA]">Connected Vehicles</span>
                <p class="text-2xl font-heading font-extrabold text-white">{{ number_format($stats['total_vehicles'] ?? 0) }}</p>
                <p class="text-[11px] text-[#32D583] font-medium">Fleet Size</p>
            </div>

            <div class="rounded-xl border border-[#222222] bg-[#111111] p-4 space-y-2">
                <span class="text-[10px] font-heading font-bold uppercase text-[#A1A1AA]">Correction Submissions</span>
                <p class="text-2xl font-heading font-extrabold text-white">{{ number_format($stats['correction_requests'] ?? 0) }}</p>
                <p class="text-[11px] text-[#F59E0B] font-medium">{{ $stats['pending_requests'] ?? 0 }} Pending Review</p>
            </div>

            <div class="rounded-xl border border-[#222222] bg-[#111111] p-4 space-y-2">
                <span class="text-[10px] font-heading font-bold uppercase text-[#A1A1AA]">Data Integrity</span>
                <p class="text-base font-heading font-bold text-[#32D583] flex items-center gap-1.5">
                    <span class="h-2 w-2 rounded-full bg-[#32D583] animate-pulse"></span> Verified Real-time
                </p>
                <p class="text-[11px] text-[#666666]">Live DB Connections</p>
            </div>
        </div>

    </div>
</x-admin-layout>
