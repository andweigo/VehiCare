<x-admin-layout>
    <x-slot name="header">AI Activity & Telemetry</x-slot>
    <x-slot name="description">Daily AI Usage Tracking & Engine Diagnostic Request Telemetry</x-slot>

    <div class="space-y-6">

        <!-- Top Metrics Cards -->
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div class="rounded-xl border border-[#222222] bg-[#111111] p-4">
                <p class="text-[10px] font-heading font-bold uppercase tracking-wider text-[#A1A1AA]">AI Requests (Selected Period)</p>
                <p class="mt-2 text-2xl font-heading font-extrabold text-white">{{ number_format($totalAiUsagePeriod) }}</p>
                <p class="text-[10px] text-[#666666] mt-1">Consultation attempts across outcomes</p>
            </div>

            <div class="rounded-xl border border-[#222222] bg-[#111111] p-4">
                <p class="text-[10px] font-heading font-bold uppercase tracking-wider text-[#A1A1AA]">Average Daily AI Usage</p>
                <p class="mt-2 text-2xl font-heading font-extrabold text-[#F63B05]">{{ $avgDailyUsage }}</p>
                <p class="text-[10px] text-[#666666] mt-1">Request attempts per day</p>
            </div>

            <div class="rounded-xl border border-[#222222] bg-[#111111] p-4">
                <p class="text-[10px] font-heading font-bold uppercase tracking-wider text-[#A1A1AA]">All-Time AI Diagnostics</p>
                <p class="mt-2 text-2xl font-heading font-extrabold text-[#32D583]">{{ number_format($totalDiagnostics) }}</p>
                <p class="text-[10px] text-[#666666] mt-1">Lifetime system diagnoses</p>
            </div>

            <div class="rounded-xl border border-[#222222] bg-[#111111] p-4">
                <p class="text-[10px] font-heading font-bold uppercase tracking-wider text-[#A1A1AA]">Failed Requests (Selected Period)</p>
                <p class="mt-2 text-2xl font-heading font-extrabold text-rose-400">{{ number_format($failedRequests) }}</p>
                <p class="text-[10px] text-[#666666] mt-1">{{ number_format($successfulRequests) }} completed usage records</p>
            </div>
        </div>

        <div class="overflow-hidden rounded-xl border border-[#222222] bg-[#111111]">
            <div class="border-b border-[#222222] p-4">
                <h2 class="text-sm font-heading font-bold text-white uppercase tracking-wider">Recent Failed AI Requests</h2>
                <p class="mt-1 text-[11px] text-[#A1A1AA]">Request metadata only; prompts, media, user contact details, credentials, and raw exception messages are not shown.</p>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs text-[#A1A1AA]">
                    <thead class="bg-[#181818] text-[10px] font-heading font-bold uppercase tracking-wider text-[#666666]">
                        <tr>
                            <th class="px-4 py-3">Request</th>
                            <th class="px-4 py-3">Plan</th>
                            <th class="px-4 py-3">Input Type</th>
                            <th class="px-4 py-3">Error Code</th>
                            <th class="px-4 py-3">Duration</th>
                            <th class="px-4 py-3">Recorded</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-[#222222]">
                        @forelse($recentFailures as $failure)
                            <tr>
                                <td class="px-4 py-3 font-mono text-white">#{{ $failure->id }}</td>
                                <td class="px-4 py-3">{{ ucfirst($failure->plan) }}</td>
                                <td class="px-4 py-3">{{ ucfirst($failure->input_type) }}</td>
                                <td class="px-4 py-3 font-mono">{{ $failure->error_code ?: '—' }}</td>
                                <td class="px-4 py-3">{{ $failure->duration_ms !== null ? number_format($failure->duration_ms) . ' ms' : '—' }}</td>
                                <td class="px-4 py-3">{{ $failure->created_at?->timezone(config('app.admin_timezone'))->format('M d, Y h:i A') ?? '—' }}</td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="6" class="px-4 py-6 text-center text-[#666666]">No failed requests recorded.</td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>

            @if(method_exists($recentFailures, 'hasPages') && $recentFailures->hasPages())
                <div class="p-4 border-t border-[#222222]">
                    {{ $recentFailures->links() }}
                </div>
            @endif
        </div>

        <!-- AI Usage By Day Chart Card -->
        <div class="rounded-xl border border-[#222222] bg-[#111111] p-5 space-y-4">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 class="text-sm font-heading font-bold text-white uppercase tracking-wider">AI Usage By Day</h2>
                    <p class="text-[11px] text-[#A1A1AA]">Track daily AI diagnostic runs and user engagements over time</p>
                </div>
                <form method="GET" action="{{ route('admin.ai-activity.index') }}" class="flex items-center gap-2">
                    <select name="days" onchange="this.form.submit()" class="rounded-lg border border-[#222222] bg-[#181818] px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#F63B05]">
                        <option value="7" {{ $days == 7 ? 'selected' : '' }}>Last 7 Days</option>
                        <option value="30" {{ $days == 30 ? 'selected' : '' }}>Last 30 Days</option>
                        <option value="60" {{ $days == 60 ? 'selected' : '' }}>Last 60 Days</option>
                        <option value="90" {{ $days == 90 ? 'selected' : '' }}>Last 90 Days</option>
                    </select>
                </form>
            </div>

            <div class="relative w-full" style="height: 340px;">
                <canvas id="aiDailyChart"></canvas>
            </div>
        </div>

    </div>

    <!-- Chart.js Integration -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', function () {
            const ctx = document.getElementById('aiDailyChart').getContext('2d');

            const labels = @json($chartLabels);
            const dataValues = @json($chartData);
            const userValues = @json($uniqueUserData);

            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            type: 'bar',
                            label: 'AI Diagnostic Runs',
                            data: dataValues,
                            backgroundColor: '#F63B05',
                            hoverBackgroundColor: '#FF5722',
                            borderRadius: 4,
                            borderSkipped: false,
                            maxBarThickness: 32,
                            order: 2,
                        },
                        {
                            type: 'line',
                            label: 'Unique Active Users',
                            data: userValues,
                            borderColor: '#38BDF8',
                            backgroundColor: 'rgba(56, 189, 248, 0.10)',
                            borderWidth: 2,
                            borderDash: [4, 4],
                            pointBackgroundColor: '#38BDF8',
                            pointBorderColor: '#FFFFFF',
                            pointRadius: 3,
                            pointHoverRadius: 5,
                            fill: false,
                            tension: 0.25,
                            order: 1,
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                color: '#A1A1AA',
                                font: {
                                    family: 'Inter, sans-serif',
                                    size: 11,
                                    weight: '600'
                                },
                                usePointStyle: true,
                                padding: 20
                            }
                        },
                        tooltip: {
                            backgroundColor: '#181818',
                            titleColor: '#FFFFFF',
                            bodyColor: '#A1A1AA',
                            borderColor: '#222222',
                            borderWidth: 1,
                            padding: 12,
                            boxPadding: 6,
                            usePointStyle: true,
                            callbacks: {
                                label: function(context) {
                                    const label = context.dataset.label || '';
                                    const val = context.parsed.y;
                                    return ` ${label}: ${val}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                display: false,
                            },
                            ticks: {
                                color: '#71717A',
                                font: {
                                    size: 10
                                },
                                maxRotation: 45,
                                autoSkip: true,
                                maxTicksLimit: 15
                            }
                        },
                        y: {
                            beginAtZero: true,
                            ticks: {
                                precision: 0,
                                stepSize: 1,
                                color: '#71717A',
                                font: {
                                    size: 10
                                }
                            },
                            grid: {
                                color: 'rgba(255, 255, 255, 0.05)',
                                drawBorder: false
                            }
                        }
                    }
                }
            });
        });
    </script>
</x-admin-layout>
