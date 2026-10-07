<x-admin-layout>
    <x-slot name="header">Maintenance Analytics</x-slot>
    <x-slot name="description">Preventative Maintenance Intervals & Fleet Service Schedules</x-slot>

    <div class="space-y-6">

        <!-- Stat Cards Grid -->
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div class="rounded-xl border border-[#222222] bg-[#111111] p-4">
                <p class="text-[10px] font-heading font-bold uppercase tracking-wider text-[#A1A1AA]">Upcoming Maintenance</p>
                <p class="mt-2 text-2xl font-heading font-extrabold text-white">0</p>
                <p class="text-[10px] text-[#666666] mt-1">Scheduled for next 30 days</p>
            </div>

            <div class="rounded-xl border border-[#222222] bg-[#111111] p-4">
                <p class="text-[10px] font-heading font-bold uppercase tracking-wider text-[#A1A1AA]">Overdue Services</p>
                <p class="mt-2 text-2xl font-heading font-extrabold text-[#F63B05]">0</p>
                <p class="text-[10px] text-[#666666] mt-1">Requires immediate attention</p>
            </div>

            <div class="rounded-xl border border-[#222222] bg-[#111111] p-4">
                <p class="text-[10px] font-heading font-bold uppercase tracking-wider text-[#A1A1AA]">Completed Items</p>
                <p class="mt-2 text-2xl font-heading font-extrabold text-[#32D583]">0</p>
                <p class="text-[10px] text-[#666666] mt-1">Services logged this month</p>
            </div>

            <div class="rounded-xl border border-[#222222] bg-[#111111] p-4">
                <p class="text-[10px] font-heading font-bold uppercase tracking-wider text-[#A1A1AA]">Common Task</p>
                <p class="mt-2 text-sm font-heading font-bold text-white">Engine Oil & Filter</p>
                <p class="text-[10px] text-[#666666] mt-1">Top recurring service item</p>
            </div>
        </div>

        <!-- Most Common Maintenance Categories -->
        <div class="rounded-xl border border-[#222222] bg-[#111111] p-5 space-y-4">
            <h2 class="text-sm font-heading font-bold text-white uppercase tracking-wider">Maintenance Category Distribution</h2>
            <div class="space-y-3">
                <div>
                    <div class="flex justify-between text-xs mb-1">
                        <span class="text-white font-medium">Engine Oil & Filter Replacement</span>
                        <span class="text-[#A1A1AA]">Standard Interval</span>
                    </div>
                    <div class="h-2 w-full rounded-full bg-[#181818] overflow-hidden">
                        <div class="h-full rounded-full bg-[#F63B05]" style="width: 45%"></div>
                    </div>
                </div>

                <div>
                    <div class="flex justify-between text-xs mb-1">
                        <span class="text-white font-medium">Brake System Inspection & Pads</span>
                        <span class="text-[#A1A1AA]">Safety Check</span>
                    </div>
                    <div class="h-2 w-full rounded-full bg-[#181818] overflow-hidden">
                        <div class="h-full rounded-full bg-[#F59E0B]" style="width: 30%"></div>
                    </div>
                </div>

                <div>
                    <div class="flex justify-between text-xs mb-1">
                        <span class="text-white font-medium">Tire Pressure & Tread Wear</span>
                        <span class="text-[#A1A1AA]">Routine Check</span>
                    </div>
                    <div class="h-2 w-full rounded-full bg-[#181818] overflow-hidden">
                        <div class="h-full rounded-full bg-[#32D583]" style="width: 25%"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Empty Schedule List -->
        <div class="rounded-xl border border-[#222222] bg-[#111111] p-5 text-center space-y-3">
            <div class="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#181818] text-[#F63B05]">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
            </div>
            <div>
                <h3 class="text-sm font-heading font-bold text-white">No maintenance schedules recorded yet</h3>
                <p class="text-xs text-[#A1A1AA] mt-1">Vehicle maintenance records logged by app members will populate here in real-time.</p>
            </div>
        </div>

    </div>
</x-admin-layout>
