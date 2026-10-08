<x-admin-layout>
    <x-slot name="header">Overview</x-slot>
    <x-slot name="description">VehiCare Platform Control Center & Real-time Metrics</x-slot>

    <link href="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css" rel="stylesheet" />
    <script src="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js"></script>

    <div class="space-y-6">

        <!-- ========================================== -->
        <!-- 1. TOP STATISTIC CARDS (4 PRIMARY METRICS) -->
        <!-- ========================================== -->
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            
            <!-- TOTAL USERS -->
            <div class="rounded-xl border border-[#222222] bg-[#111111] p-4 flex flex-col justify-between hover:border-[#333333] transition-all">
                <div class="flex items-center justify-between">
                    <span class="text-[11px] font-heading font-bold uppercase tracking-wider text-[#A1A1AA]">Total Users</span>
                    <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-[#181818] text-[#F63B05]">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
                        </svg>
                    </div>
                </div>
                <div class="mt-3">
                    <p class="text-2xl font-heading font-extrabold text-white">{{ number_format($totalUsers) }}</p>
                    <p class="mt-1 text-[11px] text-[#666666]">Registered platform accounts</p>
                </div>
            </div>

            <!-- TOTAL VEHICLES -->
            <div class="rounded-xl border border-[#222222] bg-[#111111] p-4 flex flex-col justify-between hover:border-[#333333] transition-all">
                <div class="flex items-center justify-between">
                    <span class="text-[11px] font-heading font-bold uppercase tracking-wider text-[#A1A1AA]">Total Vehicles</span>
                    <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-[#181818] text-[#32D583]">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"/>
                        </svg>
                    </div>
                </div>
                <div class="mt-3">
                    <p class="text-2xl font-heading font-extrabold text-white">{{ number_format($totalVehicles) }}</p>
                    <p class="mt-1 text-[11px] text-[#666666]">Connected fleet vehicles</p>
                </div>
            </div>

            <!-- TOTAL DIAGNOSES -->
            <div class="rounded-xl border border-[#222222] bg-[#111111] p-4 flex flex-col justify-between hover:border-[#333333] transition-all">
                <div class="flex items-center justify-between">
                    <span class="text-[11px] font-heading font-bold uppercase tracking-wider text-[#A1A1AA]">Total Diagnoses</span>
                    <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-[#181818] text-[#F63B05]">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                        </svg>
                    </div>
                </div>
                <div class="mt-3">
                    <p class="text-2xl font-heading font-extrabold text-white">{{ number_format($diagnosticsPerformed) }}</p>
                    <p class="mt-1 text-[11px] text-[#666666]">AI symptom diagnoses</p>
                </div>
            </div>

            <!-- ACTIVE USERS -->
            <div class="rounded-xl border border-[#222222] bg-[#111111] p-4 flex flex-col justify-between hover:border-[#333333] transition-all">
                <div class="flex items-center justify-between">
                    <span class="text-[11px] font-heading font-bold uppercase tracking-wider text-[#A1A1AA]">Active Users</span>
                    <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-[#181818] text-[#32D583]">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    </div>
                </div>
                <div class="mt-3">
                    <p class="text-2xl font-heading font-extrabold text-white">{{ number_format($activeUsers) }}</p>
                    <p class="mt-1 text-[11px] text-[#666666]">Active account status</p>
                </div>
            </div>
        </div>

        <!-- AI Activity Usage By Day Chart (Overview) -->
        <div class="rounded-xl border border-[#222222] bg-[#111111] p-5 space-y-4">
            <div class="flex items-center justify-between">
                <div>
                    <h2 class="text-sm font-heading font-bold text-white uppercase tracking-wider">AI Activity Usage (Last 30 Days)</h2>
                    <p class="text-[11px] text-[#A1A1AA]">Daily diagnostic inferences performed across all user vehicles</p>
                </div>
                <a href="{{ route('admin.ai-activity.index') }}" class="rounded-lg border border-[#333333] px-3 py-1.5 text-[11px] font-heading font-semibold text-white transition hover:border-[#F63B05]">
                    Full Telemetry
                </a>
            </div>

            <div class="relative w-full" style="height: 280px;">
                <canvas id="overviewAiChart"></canvas>
            </div>
        </div>

        <!-- Repair shop locations -->
        <section class="overflow-hidden rounded-xl border border-[#222222] bg-[#111111]">
            <div class="flex flex-col gap-3 border-b border-[#222222] p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 class="text-sm font-heading font-bold uppercase tracking-wider text-white">Repair Shop Locations</h2>
                    <p class="mt-1 text-[11px] text-[#A1A1AA]">
                        {{ $repairShops->count() }} {{ \Illuminate\Support\Str::plural('shop', $repairShops->count()) }} with mapped coordinates
                    </p>
                </div>
                <div class="flex items-center gap-3">
                    <div class="flex items-center gap-2 text-[10px] text-[#A1A1AA]">
                        <span class="h-2.5 w-2.5 rounded-full bg-[#32D583]"></span> Active
                        <span class="ml-2 h-2.5 w-2.5 rounded-full bg-[#71717A]"></span> Inactive
                    </div>
                    <a href="{{ route('admin.repair-shops.index') }}" class="rounded-lg border border-[#333333] px-3 py-2 text-[11px] font-heading font-semibold text-white transition hover:border-[#F63B05]">
                        Manage Shops
                    </a>
                </div>
            </div>

            @if($repairShops->isNotEmpty())
                <div id="admin-repair-shops-map" class="h-[360px] w-full bg-[#181818] sm:h-[440px]" role="application" aria-label="Map of repair shop locations"></div>
            @else
                <div class="flex min-h-[240px] flex-col items-center justify-center gap-2 px-6 text-center">
                    <p class="text-sm font-heading font-semibold text-white">No mapped repair shops yet</p>
                    <p class="max-w-md text-xs text-[#A1A1AA]">Add a repair shop with valid latitude and longitude to see it on the admin dashboard map.</p>
                    <a href="{{ route('admin.repair-shops.create') }}" class="mt-2 rounded-lg bg-[#F63B05] px-4 py-2 text-xs font-heading font-semibold text-white transition hover:bg-[#D83000]">Add Repair Shop</a>
                </div>
            @endif
        </section>

        <!-- ========================================== -->
        <!-- 2. ANALYTICS & SUBSCRIPTION DISTRIBUTIONS   -->
        <!-- ========================================== -->
        <div class="grid gap-6 xl:grid-cols-3">
            
            <!-- User Registration Growth Chart / Activity -->
            <div class="xl:col-span-2 rounded-xl border border-[#222222] bg-[#111111] p-5 space-y-4">
                <div class="flex items-center justify-between">
                    <div>
                        <h2 class="text-sm font-heading font-bold text-white uppercase tracking-wider">Platform Analytics</h2>
                        <p class="text-[11px] text-[#A1A1AA]">User registration and subscription plan distribution</p>
                    </div>
                    <span class="rounded bg-[#181818] border border-[#222222] px-2.5 py-1 text-[10px] font-heading font-bold text-[#A1A1AA]">VehiCare Real Analytics</span>
                </div>

                <!-- Custom Bar Representation for User Plans -->
                <div class="space-y-3 pt-2">
                    <div>
                        <div class="flex justify-between text-xs mb-1">
                            <span class="text-white font-medium">Free Subscription Tier</span>
                            <span class="text-[#A1A1AA] font-bold">{{ $freeUsers }} Users ({{ $totalUsers ? round(($freeUsers / $totalUsers) * 100) : 0 }}%)</span>
                        </div>
                        <div class="h-2.5 w-full rounded-full bg-[#181818] overflow-hidden">
                            <div class="h-full rounded-full bg-[#A1A1AA]" style="width: {{ $totalUsers ? round(($freeUsers / $totalUsers) * 100) : 0 }}%"></div>
                        </div>
                    </div>

                    <div>
                        <div class="flex justify-between text-xs mb-1">
                            <span class="text-[#F63B05] font-medium">Premium Subscription Tier</span>
                            <span class="text-[#F63B05] font-bold">{{ $premiumUsers }} Users ({{ $totalUsers ? round(($premiumUsers / $totalUsers) * 100) : 0 }}%)</span>
                        </div>
                        <div class="h-2.5 w-full rounded-full bg-[#181818] overflow-hidden">
                            <div class="h-full rounded-full bg-[#F63B05]" style="width: {{ $totalUsers ? round(($premiumUsers / $totalUsers) * 100) : 0 }}%"></div>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-3 gap-3 pt-3 border-t border-[#222222] text-center">
                    <div class="rounded-lg bg-[#181818] p-3 border border-[#222222]">
                        <p class="text-[10px] text-[#A1A1AA] font-heading font-bold uppercase">Pending Corrections</p>
                        <p class="mt-1 text-lg font-heading font-extrabold text-[#F59E0B]">{{ $pendingCorrectionRequests }}</p>
                    </div>
                    <div class="rounded-lg bg-[#181818] p-3 border border-[#222222]">
                        <p class="text-[10px] text-[#A1A1AA] font-heading font-bold uppercase">Administrators</p>
                        <p class="mt-1 text-lg font-heading font-extrabold text-white">{{ $totalAdmins }}</p>
                    </div>
                    <div class="rounded-lg bg-[#181818] p-3 border border-[#222222]">
                        <p class="text-[10px] text-[#A1A1AA] font-heading font-bold uppercase">Connected Fleet</p>
                        <p class="mt-1 text-lg font-heading font-extrabold text-[#32D583]">{{ $totalVehicles }}</p>
                    </div>
                </div>
            </div>

            <!-- AI Engine Indicator & Quick System Operations -->
            <div class="rounded-xl border border-[#222222] bg-[#111111] p-5 space-y-4 flex flex-col justify-between">
                <div>
                    <div class="flex items-center gap-2 mb-3">
                        <span class="h-2 w-2 rounded-full bg-[#F63B05] animate-pulse"></span>
                        <h2 class="text-sm font-heading font-bold text-white uppercase tracking-wider">AI Diagnostics Engine</h2>
                    </div>
                    <p class="text-xs text-[#A1A1AA] leading-relaxed">VehiCare AI inference handles vehicle symptom analysis, fault localization, and maintenance predictions.</p>
                </div>

                <div class="rounded-xl border border-[#222222] bg-[#181818] p-3.5 space-y-2">
                    <div class="flex justify-between text-xs">
                        <span class="text-[#A1A1AA]">AI Model Status</span>
                        <span class="text-[#32D583] font-bold">ONLINE</span>
                    </div>
                    <div class="flex justify-between text-xs">
                        <span class="text-[#A1A1AA]">Symptom Recognizer</span>
                        <span class="text-white font-medium">Multi-modal Text & Audio</span>
                    </div>
                </div>

                <a href="{{ route('admin.correction-requests.index') }}" class="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#F63B05] px-4 py-2.5 text-xs font-heading font-semibold text-white shadow-md hover:bg-[#D83000] transition">
                    Review Pending Correction Requests ({{ $pendingCorrectionRequests }})
                </a>
            </div>

        </div>

        <!-- ========================================== -->
        <!-- 3. RECENT AI DIAGNOSTICS & USER REGISTRATIONS-->
        <!-- ========================================== -->
        <div class="rounded-xl border border-[#222222] bg-[#111111] overflow-hidden space-y-4 p-5">
            <div class="flex items-center justify-between">
                <div>
                    <h2 class="text-sm font-heading font-bold text-white uppercase tracking-wider">Recent Users & Vehicles</h2>
                    <p class="text-[11px] text-[#A1A1AA]">Latest registered members and their primary connected vehicle type</p>
                </div>
                <a href="{{ route('admin.users.index') }}" class="text-xs font-heading font-semibold text-[#F63B05] hover:underline">View All Users &rarr;</a>
            </div>

            <div class="overflow-x-auto rounded-xl border border-[#222222]">
                <table class="w-full text-left text-xs text-[#A1A1AA]">
                    <thead class="bg-[#181818] text-[10px] font-heading font-bold uppercase tracking-wider text-[#666666] border-b border-[#222222]">
                        <tr>
                            <th class="px-4 py-3">User</th>
                            <th class="px-4 py-3">Email</th>
                            <th class="px-4 py-3">Plan</th>
                            <th class="px-4 py-3">Vehicles</th>
                            <th class="px-4 py-3">Status</th>
                            <th class="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-[#222222] bg-[#111111]">
                        @forelse($recentUsers as $user)
                            <tr class="hover:bg-[#181818]/60 transition">
                                <td class="px-4 py-3">
                                    <div class="flex items-center gap-2.5">
                                        <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-[#181818] border border-[#222222] font-heading font-bold text-white text-[11px]">
                                            {{ strtoupper(substr($user->name, 0, 1)) }}
                                        </div>
                                        <span class="font-heading font-semibold text-white">{{ $user->name }}</span>
                                    </div>
                                </td>
                                <td class="px-4 py-3 text-[#A1A1AA]">{{ $user->email }}</td>
                                <td class="px-4 py-3">
                                    @if($user->subscription_plan === 'premium')
                                        <span class="inline-flex rounded-md bg-[#F63B05]/15 border border-[#F63B05]/30 px-2 py-0.5 text-[10px] font-heading font-bold text-[#F63B05]">
                                            PREMIUM
                                        </span>
                                    @else
                                        <span class="inline-flex rounded-md bg-[#181818] border border-[#222222] px-2 py-0.5 text-[10px] font-heading font-bold text-[#666666]">
                                            FREE
                                        </span>
                                    @endif
                                </td>
                                <td class="px-4 py-3 text-white font-medium">
                                    {{ $user->vehicles_count ?? 0 }}
                                </td>
                                <td class="px-4 py-3">
                                    @if($user->is_active)
                                        <span class="inline-flex items-center gap-1 rounded-full bg-[#32D583]/10 px-2 py-0.5 text-[10px] font-heading font-bold text-[#32D583]">
                                            Active
                                        </span>
                                    @else
                                        <span class="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-heading font-bold text-rose-400">
                                            Disabled
                                        </span>
                                    @endif
                                </td>
                                <td class="px-4 py-3 text-right">
                                    <a href="{{ route('admin.users.show', $user->id) }}" class="rounded bg-[#181818] border border-[#222222] hover:border-[#F63B05] px-2.5 py-1 text-[11px] font-heading font-semibold text-white transition">
                                        View Profile
                                    </a>
                                </td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="6" class="px-4 py-8 text-center text-xs text-[#666666]">
                                    No recent users found.
                                </td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        </div>

    </div>

    @if($repairShops->isNotEmpty())
        <script>
            document.addEventListener('DOMContentLoaded', function () {
                const shops = @json($repairShopMapData);
                const bounds = new maplibregl.LngLatBounds();
                const map = new maplibregl.Map({
                    container: 'admin-repair-shops-map',
                    style: {
                        version: 8,
                        sources: {
                            'street-tiles': {
                                type: 'raster',
                                tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'],
                                tileSize: 256,
                                attribution: '© Esri, OpenStreetMap'
                            }
                        },
                        layers: [{
                            id: 'street-tiles-layer',
                            type: 'raster',
                            source: 'street-tiles',
                            minzoom: 0,
                            maxzoom: 19
                        }]
                    },
                    center: [121.0315, 14.6507],
                    zoom: 5
                });

                shops.forEach(function (shop) {
                    const longitude = Number(shop.longitude);
                    const latitude = Number(shop.latitude);
                    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return;

                    const markerElement = document.createElement('button');
                    markerElement.type = 'button';
                    markerElement.setAttribute('aria-label', shop.name);
                    markerElement.style.width = '16px';
                    markerElement.style.height = '16px';
                    markerElement.style.borderRadius = '50%';
                    markerElement.style.border = '2px solid #FFFFFF';
                    markerElement.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.45)';
                    markerElement.style.backgroundColor = shop.active ? '#32D583' : '#71717A';

                    const popupContent = document.createElement('div');
                    popupContent.className = 'space-y-1 text-sm';
                    const shopName = document.createElement('strong');
                    shopName.textContent = shop.name || 'Repair Shop';
                    const shopAddress = document.createElement('p');
                    shopAddress.textContent = shop.address || 'Address not provided';
                    const shopCategory = document.createElement('p');
                    shopCategory.textContent = `Category: ${shop.category}`;
                    const shopStatus = document.createElement('p');
                    shopStatus.textContent = shop.active ? 'Active' : 'Inactive';
                    popupContent.append(shopName, shopAddress, shopCategory, shopStatus);
                    if (shop.contact) {
                        const shopContact = document.createElement('p');
                        shopContact.textContent = `Contact: ${shop.contact}`;
                        popupContent.appendChild(shopContact);
                    }
                    const directions = document.createElement('a');
                    directions.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`;
                    directions.target = '_blank';
                    directions.rel = 'noopener noreferrer';
                    directions.textContent = 'Open directions';
                    directions.className = 'mt-2 inline-block font-semibold text-orange-600';
                    popupContent.appendChild(directions);

                    new maplibregl.Marker({ element: markerElement })
                        .setLngLat([longitude, latitude])
                        .setPopup(new maplibregl.Popup({ offset: 16 }).setDOMContent(popupContent))
                        .addTo(map);
                    bounds.extend([longitude, latitude]);
                });

                map.addControl(new maplibregl.NavigationControl(), 'top-right');
                if (shops.length === 1) {
                    map.setCenter([Number(shops[0].longitude), Number(shops[0].latitude)]);
                    map.setZoom(13);
                } else if (!bounds.isEmpty()) {
                    map.fitBounds(bounds, { padding: 56, maxZoom: 13 });
                }
            });
        </script>
    @endif

    <!-- AI Activity Overview Chart Script -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', function () {
            const overviewCtx = document.getElementById('overviewAiChart');
            if (!overviewCtx) return;

            const labels = @json($aiChartLabels);
            const dataValues = @json($aiChartData);

            new Chart(overviewCtx.getContext('2d'), {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'AI Diagnostic Runs',
                            data: dataValues,
                            borderColor: '#F63B05',
                            backgroundColor: 'rgba(246, 59, 5, 0.12)',
                            borderWidth: 2.5,
                            pointBackgroundColor: '#F63B05',
                            pointBorderColor: '#FFFFFF',
                            pointRadius: 3.5,
                            fill: true,
                            tension: 0.35
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: '#181818',
                            titleColor: '#FFFFFF',
                            bodyColor: '#A1A1AA',
                            borderColor: '#222222',
                            borderWidth: 1,
                            padding: 10
                        }
                    },
                    scales: {
                        x: {
                            grid: { color: 'rgba(255, 255, 255, 0.05)' },
                            ticks: { color: '#71717A', font: { size: 10 } }
                        },
                        y: {
                            beginAtZero: true,
                            ticks: { precision: 0, color: '#71717A', font: { size: 10 } },
                            grid: { color: 'rgba(255, 255, 255, 0.05)' }
                        }
                    }
                }
            });
        });
    </script>
</x-admin-layout>
