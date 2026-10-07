<x-admin-layout>
    <x-slot name="header">AI Activity</x-slot>
    <x-slot name="description">VehiCare Neural Engine Telemetry & Diagnostic Requests Stream</x-slot>

    <div class="space-y-6">

        <!-- Top Metrics Cards -->
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div class="rounded-xl border border-[#222222] bg-[#111111] p-4">
                <p class="text-[10px] font-heading font-bold uppercase tracking-wider text-[#A1A1AA]">Connected Users</p>
                <p class="mt-2 text-2xl font-heading font-extrabold text-white">{{ $totalUsers }}</p>
            </div>
            <div class="rounded-xl border border-[#222222] bg-[#111111] p-4">
                <p class="text-[10px] font-heading font-bold uppercase tracking-wider text-[#A1A1AA]">Registered Fleet</p>
                <p class="mt-2 text-2xl font-heading font-extrabold text-[#32D583]">{{ $totalVehicles }}</p>
            </div>
            <div class="rounded-xl border border-[#222222] bg-[#111111] p-4">
                <p class="text-[10px] font-heading font-bold uppercase tracking-wider text-[#A1A1AA]">AI Engine Status</p>
                <p class="mt-2 text-base font-heading font-bold text-[#32D583] flex items-center gap-2">
                    <span class="h-2 w-2 rounded-full bg-[#32D583] animate-pulse"></span> Active & Ready
                </p>
            </div>
            <div class="rounded-xl border border-[#222222] bg-[#111111] p-4">
                <p class="text-[10px] font-heading font-bold uppercase tracking-wider text-[#A1A1AA]">Symptom Recognizer</p>
                <p class="mt-2 text-sm font-heading font-bold text-white">Multi-modal Text & Audio</p>
            </div>
        </div>

        <!-- Activity Stream Card / Empty State -->
        <div class="rounded-xl border border-[#222222] bg-[#111111] p-5 space-y-4">
            <div class="flex items-center justify-between">
                <div>
                    <h2 class="text-sm font-heading font-bold text-white uppercase tracking-wider">AI Activity Timeline</h2>
                    <p class="text-[11px] text-[#A1A1AA]">Real-time inference logs and diagnostic events</p>
                </div>
                <span class="rounded bg-[#181818] border border-[#222222] px-2.5 py-1 text-[10px] font-heading font-bold text-[#F63B05]">
                    Live Telemetry
                </span>
            </div>

            @if(count($timelineEvents) > 0)
                <div class="space-y-3">
                    @foreach($timelineEvents as $event)
                        <div class="flex items-start gap-3 p-3 rounded-lg bg-[#181818] border border-[#222222]">
                            <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F63B05]/10 text-[#F63B05]">
                                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                                </svg>
                            </div>
                            <div class="flex-1 text-xs">
                                <p class="font-heading font-semibold text-white">{{ $event['title'] }}</p>
                                <p class="text-[#A1A1AA] text-[11px] mt-0.5">{{ $event['detail'] }}</p>
                            </div>
                            <span class="text-[10px] text-[#666666]">{{ $event['time'] }}</span>
                        </div>
                    @endforeach
                </div>
            @else
                <!-- Polished Empty State -->
                <div class="rounded-xl border border-[#222222] bg-[#181818]/40 p-10 text-center space-y-3">
                    <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#181818] border border-[#222222] text-[#F63B05]">
                        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                        </svg>
                    </div>
                    <div>
                        <h3 class="text-sm font-heading font-bold text-white">No AI activity recorded yet</h3>
                        <p class="text-xs text-[#A1A1AA] mt-1 max-w-sm mx-auto">AI diagnostic events will stream here automatically when users perform symptom checks on the mobile app.</p>
                    </div>
                </div>
            @endif
        </div>

    </div>
</x-admin-layout>
