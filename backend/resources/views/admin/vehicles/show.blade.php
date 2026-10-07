<x-admin-layout>
    <x-slot name="header">Vehicle Profile #{{ $vehicle->id }}</x-slot>
    <x-slot name="description">Inspect vehicle specifications, active status, and database taxonomy credentials</x-slot>

    @php
        $isCustom = !empty($vehicle->custom_brand) || !empty($vehicle->custom_model) || !empty($vehicle->custom_year);
        $typeName = $vehicle->vehicleType?->name ?? 'Vehicle';
        $brandName = $vehicle->vehicleBrand?->name ?? $vehicle->custom_brand ?? 'Unspecified';
        $modelName = $vehicle->vehicleModel?->name ?? $vehicle->custom_model ?? $vehicle->model_number ?? '';
        $yearName = $vehicle->vehicleYear?->year ?? $vehicle->custom_year ?? '—';
    @endphp

    <div class="space-y-6 max-w-5xl">
        
        <!-- Back Link -->
        <div>
            <a href="{{ route('admin.vehicles.index') }}" class="inline-flex items-center gap-1.5 text-xs font-heading font-semibold text-[#A1A1AA] hover:text-white transition">
                &larr; Back to Vehicles Fleet
            </a>
        </div>

        <!-- Vehicle Profile Card Header -->
        <div class="rounded-xl border border-[#222222] bg-[#111111] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="flex items-center gap-4">
                <div class="flex h-14 w-14 items-center justify-center rounded-xl bg-[#181818] border border-[#222222] text-[#F63B05]">
                    <x-vehicle-type-icon :type="$typeName" class="h-8 w-8" />
                </div>
                <div>
                    <div class="flex items-center gap-2">
                        <h1 class="text-xl font-heading font-bold text-white">{{ $brandName }} {{ $modelName }}</h1>
                        @if($isCustom)
                            <span class="rounded bg-[#F59E0B]/15 border border-[#F59E0B]/30 px-2 py-0.5 text-[10px] font-heading font-bold text-[#F59E0B]">CUSTOM USER ADDED</span>
                        @else
                            <span class="rounded bg-[#10B981]/15 border border-[#10B981]/30 px-2 py-0.5 text-[10px] font-heading font-bold text-[#10B981]">PRESET DATABASE</span>
                        @endif
                    </div>
                    <p class="text-xs text-[#A1A1AA] mt-0.5">Type: <span class="text-white font-medium">{{ $typeName }}</span> | Year: <span class="text-white font-medium">{{ $yearName }}</span></p>
                </div>
            </div>

            <div class="flex items-center gap-3">
                @if($vehicle->archived_at)
                    <span class="rounded-full bg-rose-500/10 px-3 py-1 text-xs font-heading font-bold text-rose-400 border border-rose-500/20">Archived</span>
                @else
                    <span class="rounded-full bg-[#32D583]/10 px-3 py-1 text-xs font-heading font-bold text-[#32D583] border border-[#32D583]/20">Registered</span>
                @endif

                <form action="{{ route('admin.vehicles.destroy', $vehicle->id) }}" method="POST" onsubmit="return confirm('Are you sure you want to archive this vehicle?');">
                    @csrf
                    @method('DELETE')
                    <button type="submit" class="rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500 hover:text-white px-3.5 py-2 text-xs font-heading font-semibold text-rose-400 transition">
                        Archive Vehicle
                    </button>
                </form>
            </div>
        </div>

        <!-- Vehicle Details Card -->
        <div class="rounded-xl border border-[#222222] bg-[#111111] p-5 space-y-4">
            <h2 class="text-xs font-heading font-bold text-[#A1A1AA] uppercase tracking-wider">Specifications & Catalog</h2>
            <div class="space-y-3 text-xs">
                <div class="flex justify-between pb-2 border-b border-[#222222]">
                    <span class="text-[#666666]">Data Origin</span>
                    <span class="font-heading font-semibold {{ $isCustom ? 'text-[#F59E0B]' : 'text-[#10B981]' }}">
                        {{ $isCustom ? 'Custom Entry (Added by User)' : 'Preset Database Catalog' }}
                    </span>
                </div>
                <div class="flex justify-between pb-2 border-b border-[#222222]">
                    <span class="text-[#666666]">Vehicle Type</span>
                    <span class="font-heading font-semibold text-white">{{ $typeName }}</span>
                </div>
                <div class="flex justify-between pb-2 border-b border-[#222222]">
                    <span class="text-[#666666]">Brand / Make</span>
                    <span class="font-heading font-semibold text-white">{{ $brandName }}</span>
                </div>
                <div class="flex justify-between pb-2 border-b border-[#222222]">
                    <span class="text-[#666666]">Model</span>
                    <span class="font-heading font-semibold text-white">{{ $modelName ?: '—' }}</span>
                </div>
                <div class="flex justify-between pb-2 border-b border-[#222222]">
                    <span class="text-[#666666]">Production Year</span>
                    <span class="font-heading font-semibold text-white">{{ $yearName }}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-[#666666]">Model Number / VIN</span>
                    <span class="font-mono text-white">{{ $vehicle->model_number ?: 'N/A' }}</span>
                </div>
            </div>
        </div>

    </div>
</x-admin-layout>
