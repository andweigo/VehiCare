<x-admin-layout>
    <x-slot name="header">Settings</x-slot>
    <x-slot name="description">Platform Administration & AI Engine Parameters</x-slot>

    <div class="space-y-6 max-w-4xl">

        <!-- Admin Preferences -->
        <div class="rounded-xl border border-[#222222] bg-[#111111] p-5 space-y-4">
            <h2 class="text-sm font-heading font-bold text-white uppercase tracking-wider">Admin Preferences</h2>
            <div class="space-y-4 text-xs">
                <div class="flex items-center justify-between pb-3 border-b border-[#222222]">
                    <div>
                        <p class="font-heading font-semibold text-white">Dark-First Ecosystem Theme</p>
                        <p class="text-[11px] text-[#A1A1AA]">Matches VehiCare mobile app dark-first design system (#000000 & #111111)</p>
                    </div>
                    <span class="rounded bg-[#F63B05]/15 border border-[#F63B05]/30 px-2.5 py-1 text-[10px] font-heading font-bold text-[#F63B05]">SYSTEM DARK</span>
                </div>

                <div class="flex items-center justify-between">
                    <div>
                        <p class="font-heading font-semibold text-white">Live Data Synchronization</p>
                        <p class="text-[11px] text-[#A1A1AA]">Automatically query backend models for metrics without mock values</p>
                    </div>
                    <span class="rounded bg-[#32D583]/15 border border-[#32D583]/30 px-2.5 py-1 text-[10px] font-heading font-bold text-[#32D583]">ENABLED</span>
                </div>
            </div>
        </div>

        <!-- AI Engine Parameters -->
        <div class="rounded-xl border border-[#222222] bg-[#111111] p-5 space-y-4">
            <h2 class="text-sm font-heading font-bold text-white uppercase tracking-wider">AI Diagnostics Parameters</h2>
            <div class="space-y-4 text-xs">
                <div class="flex justify-between items-center pb-3 border-b border-[#222222]">
                    <div>
                        <p class="font-heading font-semibold text-white">Supported Symptom Inputs</p>
                        <p class="text-[11px] text-[#A1A1AA]">Text descriptions & audio knocking/engine noise recordings</p>
                    </div>
                    <span class="text-white font-mono">NitroSound / Audio ML</span>
                </div>
                <div class="flex justify-between items-center">
                    <div>
                        <p class="font-heading font-semibold text-white">Guest Usage Limit</p>
                        <p class="text-[11px] text-[#A1A1AA]">Free diagnostic checks before prompting sign in / sign up modal</p>
                    </div>
                    <span class="font-heading font-bold text-white">3 Diagnoses</span>
                </div>
            </div>
        </div>

    </div>
</x-admin-layout>
