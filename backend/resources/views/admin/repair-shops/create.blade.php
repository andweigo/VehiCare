<x-admin-layout>
    <x-slot name="header">Add Repair Shop</x-slot>
    <x-slot name="description">Add a new establishment to the administrator-managed repair-shop directory</x-slot>

    <!-- MapLibre GL JS Assets -->
    <link href="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css" rel="stylesheet" />
    <script src="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js"></script>

    <div class="max-w-4xl mx-auto space-y-6">

        <div class="flex items-center justify-between">
            <a href="{{ route('admin.repair-shops.index') }}" class="inline-flex items-center gap-2 text-xs font-heading font-semibold text-[#A1A1AA] hover:text-white transition">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
                </svg>
                <span>Back to Directory</span>
            </a>
        </div>

        <form action="{{ route('admin.repair-shops.store') }}" method="POST" class="space-y-6">
            @csrf

            <!-- General Details Card -->
            <div class="rounded-xl border border-[#222222] bg-[#111111] p-6 space-y-4">
                <h3 class="text-sm font-heading font-bold text-white uppercase tracking-wider border-b border-[#222222] pb-3">Basic Information</h3>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <!-- Shop Name -->
                    <div class="sm:col-span-2">
                        <label class="block text-xs font-heading font-bold text-white mb-1.5">Shop Name <span class="text-[#F63B05]">*</span></label>
                        <input type="text" name="name" value="{{ old('name') }}" required placeholder="e.g. SpeedyAuto Service Center" class="w-full rounded-xl border border-[#222222] bg-[#181818] px-3.5 py-2 text-xs text-white placeholder-[#666666] outline-none focus:border-[#F63B05]">
                    </div>

                    <!-- Category / Type -->
                    <div>
                        <label class="block text-xs font-heading font-bold text-white mb-1.5">Vehicle Category</label>
                        <select name="vehicle_category" class="w-full rounded-xl border border-[#222222] bg-[#181818] px-3.5 py-2 text-xs text-white outline-none focus:border-[#F63B05]">
                            <option value="car" {{ old('vehicle_category') == 'car' ? 'selected' : '' }}>Car / Automotive Repair</option>
                            <option value="motorcycle" {{ old('vehicle_category') == 'motorcycle' ? 'selected' : '' }}>Motorcycle / Scooter Repair</option>
                            <option value="bicycle" {{ old('vehicle_category') == 'bicycle' ? 'selected' : '' }}>Bicycle / Cycle Tuning</option>
                            <option value="all" {{ old('vehicle_category') == 'all' ? 'selected' : '' }}>All Vehicle Types</option>
                        </select>
                    </div>

                    <!-- Contact Number -->
                    <div>
                        <label class="block text-xs font-heading font-bold text-white mb-1.5">Contact Number</label>
                        <input type="text" name="contact_number" value="{{ old('contact_number') }}" placeholder="e.g. +63 917 123 4567" class="w-full rounded-xl border border-[#222222] bg-[#181818] px-3.5 py-2 text-xs text-white placeholder-[#666666] outline-none focus:border-[#F63B05]">
                    </div>

                    <!-- Address -->
                    <div class="sm:col-span-2">
                        <label class="block text-xs font-heading font-bold text-white mb-1.5">Address <span class="text-[#F63B05]">*</span></label>
                        <textarea name="address" rows="2" required placeholder="Full street address of the repair shop..." class="w-full rounded-xl border border-[#222222] bg-[#181818] px-3.5 py-2 text-xs text-white placeholder-[#666666] outline-none focus:border-[#F63B05]">{{ old('address') }}</textarea>
                    </div>

                    <!-- Operating Hours -->
                    <div class="sm:col-span-2">
                        <label class="block text-xs font-heading font-bold text-white mb-1.5">Operating Hours</label>
                        <input type="text" name="operating_hours" value="{{ old('operating_hours', '8:00 AM - 6:00 PM') }}" placeholder="e.g. 8:00 AM - 6:00 PM (Mon-Sat)" class="w-full rounded-xl border border-[#222222] bg-[#181818] px-3.5 py-2 text-xs text-white placeholder-[#666666] outline-none focus:border-[#F63B05]">
                    </div>
                </div>
            </div>

            <!-- Location Selection Card (Method A + Method B Two-Way Sync) -->
            <div class="rounded-xl border border-[#222222] bg-[#111111] p-6 space-y-4">
                <div class="flex items-center justify-between border-b border-[#222222] pb-3">
                    <div>
                        <h3 class="text-sm font-heading font-bold text-white uppercase tracking-wider">Location Selection</h3>
                        <p class="text-[11px] text-[#A1A1AA]">Specify coordinates manually or pin/drag the MapLibre map marker.</p>
                    </div>
                    <span class="rounded bg-[#F63B05]/10 px-2 py-1 text-[10px] font-heading font-bold text-[#F63B05]">MapLibre Pinning</span>
                </div>

                <!-- Method A: Manual Latitude & Longitude Inputs -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-heading font-bold text-white mb-1.5">Latitude (-90 to 90) <span class="text-[#F63B05]">*</span></label>
                        <input type="number" step="any" min="-90" max="90" id="latitude" name="latitude" value="{{ old('latitude', '14.6507000') }}" required placeholder="14.6507000" class="w-full rounded-xl border border-[#222222] bg-[#181818] px-3.5 py-2 text-xs text-white font-mono placeholder-[#666666] outline-none focus:border-[#F63B05]">
                    </div>
                    <div>
                        <label class="block text-xs font-heading font-bold text-white mb-1.5">Longitude (-180 to 180) <span class="text-[#F63B05]">*</span></label>
                        <input type="number" step="any" min="-180" max="180" id="longitude" name="longitude" value="{{ old('longitude', '121.0315000') }}" required placeholder="121.0315000" class="w-full rounded-xl border border-[#222222] bg-[#181818] px-3.5 py-2 text-xs text-white font-mono placeholder-[#666666] outline-none focus:border-[#F63B05]">
                    </div>
                </div>

                <!-- Method B: MapLibre Interactive Map -->
                <div>
                    <div class="flex items-center justify-between mb-2">
                        <label class="text-xs font-heading font-bold text-white">Map Marker Pinning</label>
                        <span class="text-[10px] text-[#A1A1AA]">Tap map or drag marker to set coordinates</span>
                    </div>
                    <div id="admin-map" class="w-full h-80 rounded-xl border border-[#222222] overflow-hidden bg-[#181818]"></div>
                </div>
            </div>

            <!-- Active Status & Submission Card -->
            <div class="rounded-xl border border-[#222222] bg-[#111111] p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <label class="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" name="is_active" value="1" {{ old('is_active', '1') == '1' ? 'checked' : '' }} class="h-4 w-4 rounded border-[#222222] bg-[#181818] text-[#F63B05] focus:ring-[#F63B05]">
                    <div>
                        <span class="text-xs font-heading font-bold text-white">Active in Directory</span>
                        <p class="text-[10px] text-[#A1A1AA]">Inactive shops will not appear in mobile user search results.</p>
                    </div>
                </label>

                <div class="flex items-center gap-3 w-full sm:w-auto">
                    <a href="{{ route('admin.repair-shops.index') }}" class="w-1/2 sm:w-auto text-center rounded-xl border border-[#222222] px-4 py-2.5 text-xs font-heading font-semibold text-[#A1A1AA] hover:text-white transition">Cancel</a>
                    <button type="submit" class="w-1/2 sm:w-auto rounded-xl bg-[#F63B05] px-6 py-2.5 text-xs font-heading font-bold text-white shadow-md hover:bg-[#D83000] transition">Save Repair Shop</button>
                </div>
            </div>
        </form>

    </div>

    <!-- Two-Way Synchronization Script (MapLibre [lng, lat] <-> Form Inputs) -->
    <script>
        document.addEventListener('DOMContentLoaded', function () {
            const latInput = document.getElementById('latitude');
            const lngInput = document.getElementById('longitude');

            let initialLat = parseFloat(latInput.value) || 14.6507;
            let initialLng = parseFloat(lngInput.value) || 121.0315;

            // MapLibre uses [longitude, latitude]
            const map = new maplibregl.Map({
                container: 'admin-map',
                style: {
                    version: 8,
                    sources: {
                        'osm-tiles': {
                            type: 'raster',
                            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'],
                            tileSize: 256,
                            attribution: '© Esri, OpenStreetMap'
                        }
                    },
                    layers: [{
                        id: 'osm-tiles-layer',
                        type: 'raster',
                        source: 'osm-tiles',
                        minzoom: 0,
                        maxzoom: 19
                    }]
                },
                center: [initialLng, initialLat],
                zoom: 14
            });

            // Create Draggable Marker
            const marker = new maplibregl.Marker({
                draggable: true,
                color: '#F63B05'
            })
            .setLngLat([initialLng, initialLat])
            .addTo(map);

            // Update inputs from marker coordinates [lng, lat]
            function updateInputs(lng, lat) {
                latInput.value = lat.toFixed(7);
                lngInput.value = lng.toFixed(7);
            }

            // METHOD B -> METHOD A: Marker Drag End
            marker.on('dragend', function () {
                const lngLat = marker.getLngLat();
                updateInputs(lngLat.lng, lngLat.lat);
            });

            // METHOD B -> METHOD A: Map Tap / Click
            map.on('click', function (e) {
                const lng = e.lngLat.lng;
                const lat = e.lngLat.lat;
                marker.setLngLat([lng, lat]);
                updateInputs(lng, lat);
            });

            // METHOD A -> METHOD B: Manual Coordinate Field Typing
            function syncMapFromInputs() {
                const lat = parseFloat(latInput.value);
                const lng = parseFloat(lngInput.value);

                if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                    marker.setLngLat([lng, lat]);
                    map.flyTo({ center: [lng, lat] });
                }
            }

            latInput.addEventListener('input', syncMapFromInputs);
            lngInput.addEventListener('input', syncMapFromInputs);
        });
    </script>
</x-admin-layout>
