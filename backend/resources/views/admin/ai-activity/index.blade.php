<x-admin-layout>
    <x-slot name="header">AI Activity & Telemetry</x-slot>
    <x-slot name="description">Daily AI Usage Tracking & Engine Diagnostic Request Telemetry</x-slot>

    <div class="space-y-6">

        <!-- Top Metrics Cards -->
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div class="rounded-xl border border-[#222222] bg-[#111111] p-4">
                <p class="text-[10px] font-heading font-bold uppercase tracking-wider text-[#A1A1AA]">AI Usage (Selected Period)</p>
                <p class="mt-2 text-2xl font-heading font-extrabold text-white">{{ number_format($totalAiUsagePeriod) }}</p>
                <p class="text-[10px] text-[#666666] mt-1">Total diagnostic inferences</p>
            </div>

            <div class="rounded-xl border border-[#222222] bg-[#111111] p-4">
                <p class="text-[10px] font-heading font-bold uppercase tracking-wider text-[#A1A1AA]">Average Daily AI Usage</p>
                <p class="mt-2 text-2xl font-heading font-extrabold text-[#F63B05]">{{ $avgDailyUsage }}</p>
                <p class="text-[10px] text-[#666666] mt-1">Diagnostic runs per day</p>
            </div>

            <div class="rounded-xl border border-[#222222] bg-[#111111] p-4">
                <p class="text-[10px] font-heading font-bold uppercase tracking-wider text-[#A1A1AA]">All-Time AI Diagnostics</p>
                <p class="mt-2 text-2xl font-heading font-extrabold text-[#32D583]">{{ number_format($totalDiagnostics) }}</p>
                <p class="text-[10px] text-[#666666] mt-1">Lifetime system diagnoses</p>
            </div>

            <div class="rounded-xl border border-[#222222] bg-[#111111] p-4">
                <p class="text-[10px] font-heading font-bold uppercase tracking-wider text-[#A1A1AA]">Engine Status</p>
                <p class="mt-2 text-base font-heading font-bold text-[#32D583] flex items-center gap-2">
                    <span class="h-2.5 w-2.5 rounded-full bg-[#32D583] animate-pulse"></span> Active & Operational
                </p>
                <p class="text-[10px] text-[#666666] mt-1">Multi-modal AI Engine</p>
            </div>
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
                            pointRadius: 4,
                            pointHoverRadius: 6,
                            fill: true,
                            tension: 0.35
                        },
                        {
                            label: 'Unique Active Users',
                            data: userValues,
                            borderColor: '#38BDF8',
                            backgroundColor: 'rgba(56, 189, 248, 0.08)',
                            borderWidth: 2,
                            borderDash: [5, 5],
                            pointBackgroundColor: '#38BDF8',
                            pointRadius: 3,
                            fill: false,
                            tension: 0.35
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
                            usePointStyle: true
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                color: 'rgba(255, 255, 255, 0.05)',
                                drawBorder: false
                            },
                            ticks: {
                                color: '#71717A',
                                font: {
                                    size: 10
                                }
                            }
                        },
                        y: {
                            beginAtZero: true,
                            ticks: {
                                precision: 0,
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
