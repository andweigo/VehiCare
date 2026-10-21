<!DOCTYPE html>
<html lang="en" class="h-full bg-[#000000]">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $header ?? 'VehiCare Admin Control Center' }}</title>

    <!-- Google Fonts: Outfit & Inter -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@500;600;700;800&display=swap" rel="stylesheet">

    <!-- Tailwind CSS CDN Fallback + Vite -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    fontFamily: {
                        heading: ['Outfit', 'sans-serif'],
                        sans: ['Inter', 'sans-serif'],
                    },
                    colors: {
                        brand: {
                            DEFAULT: '#F63B05',
                            50: '#FFF2EE',
                            100: '#FFE1D7',
                            500: '#F63B05',
                            600: '#D83000',
                            700: '#B02600',
                        },
                        bgDark: '#000000',
                        surfacePrimary: '#111111',
                        surfaceSecondary: '#181818',
                        surfaceBorder: '#222222',
                        textPrimary: '#FFFFFF',
                        textSecondary: '#A1A1AA',
                        textMuted: '#666666',
                        successGreen: '#32D583',
                    }
                }
            }
        }
    </script>
    @if (file_exists(public_path('build/manifest.json')) || file_exists(public_path('hot')))
        @vite(['resources/css/app.css'])
    @endif

    <style>
        body {
            font-family: 'Inter', sans-serif;
            background-color: #000000;
            color: #FFFFFF;
        }
        [x-cloak] {
            display: none !important;
        }
        h1, h2, h3, h4, h5, h6, .font-heading {
            font-family: 'Outfit', sans-serif;
        }
        /* Custom scrollbar matching VehiCare dark surfaces */
        ::-webkit-scrollbar {
            width: 5px;
            height: 5px;
        }
        ::-webkit-scrollbar-track {
            background: #000000;
        }
        ::-webkit-scrollbar-thumb {
            background: #222222;
            border-radius: 9999px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: #333333;
        }
    </style>
    <!-- AlpineJS for Interactive Drawers and Dropdowns -->
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
</head>
<body class="h-full bg-[#000000] text-[#FFFFFF] antialiased selection:bg-[#F63B05] selection:text-white">

    <div class="min-h-full flex flex-col lg:flex-row" x-data="{ mobileMenuOpen: false }">

        <!-- ========================================== -->
        <!-- DESKTOP FIXED SIDEBAR                      -->
        <!-- ========================================== -->
        <aside class="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-[#222222] bg-[#111111] z-30 flex-between">
            <div class="flex flex-col h-full">

                <!-- Sidebar Top Header -->
                <div class="flex h-16 items-center gap-3 px-5 border-b border-[#222222]">
                    <img src="{{ route('admin.logo') }}" alt="VehiCare logo" class="h-9 w-9 rounded-xl object-contain" />
                    <div>
                        <div class="flex items-center gap-1.5">
                            <span class="rounded bg-[#F63B05]/10 px-1.5 py-0.5 text-[9px] font-heading font-extrabold text-[#F63B05]">ADMIN</span>
                        </div>
                        <p class="text-[10px] text-[#666666] font-medium tracking-wide">Desktop Control Center</p>
                    </div>
                </div>

                <!-- Navigation Sections -->
                <nav class="flex-1 space-y-5 px-3 py-4 overflow-y-auto">
                    
                    <!-- MAIN GROUP -->
                    <div>
                        <p class="px-3 text-[10px] font-heading font-bold tracking-wider text-[#666666] uppercase mb-1.5">Main</p>
                        
                        <!-- Overview -->
                        <a href="{{ route('admin.dashboard') }}" class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-heading font-semibold transition-all duration-150 {{ request()->routeIs('admin.dashboard') ? 'bg-[#F63B05]/15 text-[#F63B05] border border-[#F63B05]/20' : 'text-[#A1A1AA] hover:bg-[#181818] hover:text-white' }}">
                            <svg class="h-4 w-4 {{ request()->routeIs('admin.dashboard') ? 'text-[#F63B05]' : 'text-[#A1A1AA] group-hover:text-white' }}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
                            </svg>
                            <span>Overview</span>
                        </a>

                        <!-- Users -->
                        <a href="{{ route('admin.users.index') }}" class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-heading font-semibold transition-all duration-150 {{ request()->routeIs('admin.users.*') ? 'bg-[#F63B05]/15 text-[#F63B05] border border-[#F63B05]/20' : 'text-[#A1A1AA] hover:bg-[#181818] hover:text-white' }}">
                            <svg class="h-4 w-4 {{ request()->routeIs('admin.users.*') ? 'text-[#F63B05]' : 'text-[#A1A1AA] group-hover:text-white' }}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
                            </svg>
                            <span>Users</span>
                        </a>

                        <!-- Vehicles -->
                        <a href="{{ route('admin.vehicles.index') }}" class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-heading font-semibold transition-all duration-150 {{ request()->routeIs('admin.vehicles.*') ? 'bg-[#F63B05]/15 text-[#F63B05] border border-[#F63B05]/20' : 'text-[#A1A1AA] hover:bg-[#181818] hover:text-white' }}">
                            <svg class="h-4 w-4 {{ request()->routeIs('admin.vehicles.*') ? 'text-[#F63B05]' : 'text-[#A1A1AA] group-hover:text-white' }}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"/>
                            </svg>
                            <span>Vehicles</span>
                        </a>

                        <!-- Diagnostics -->
                        <a href="{{ route('admin.diagnostics.index') }}" class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-heading font-semibold transition-all duration-150 {{ request()->routeIs('admin.diagnostics.*') ? 'bg-[#F63B05]/15 text-[#F63B05] border border-[#F63B05]/20' : 'text-[#A1A1AA] hover:bg-[#181818] hover:text-white' }}">
                            <svg class="h-4 w-4 {{ request()->routeIs('admin.diagnostics.*') ? 'text-[#F63B05]' : 'text-[#A1A1AA] group-hover:text-white' }}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                            </svg>
                            <span>Diagnostics</span>
                        </a>
                    </div>

                    <!-- SERVICES GROUP -->
                    <div>
                        <p class="px-3 text-[10px] font-heading font-bold tracking-wider text-[#666666] uppercase mb-1.5">Services</p>

                        <!-- Repair Shops Directory -->
                        <a href="{{ route('admin.repair-shops.index') }}" class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-heading font-semibold transition-all duration-150 {{ request()->routeIs('admin.repair-shops.*') ? 'bg-[#F63B05]/15 text-[#F63B05] border border-[#F63B05]/20' : 'text-[#A1A1AA] hover:bg-[#181818] hover:text-white' }}">
                            <svg class="h-4 w-4 {{ request()->routeIs('admin.repair-shops.*') ? 'text-[#F63B05]' : 'text-[#A1A1AA] group-hover:text-white' }}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0v-4m0 4h4m-4-4l-3-3m3 3l3-3"/>
                            </svg>
                            <span>Repair Shops</span>
                        </a>

                        <!-- Repair Assistance -->
                        <a href="{{ route('admin.repair-assistance.index') }}" class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-heading font-semibold transition-all duration-150 {{ request()->routeIs('admin.repair-assistance.*') ? 'bg-[#F63B05]/15 text-[#F63B05] border border-[#F63B05]/20' : 'text-[#A1A1AA] hover:bg-[#181818] hover:text-white' }}">
                            <svg class="h-4 w-4 {{ request()->routeIs('admin.repair-assistance.*') ? 'text-[#F63B05]' : 'text-[#A1A1AA] group-hover:text-white' }}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                            </svg>
                            <span>Repair Assistance</span>
                        </a>

                        <!-- Service Referrals -->
                        <a href="{{ route('admin.service-referrals.index') }}" class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-heading font-semibold transition-all duration-150 {{ request()->routeIs('admin.service-referrals.*') ? 'bg-[#F63B05]/15 text-[#F63B05] border border-[#F63B05]/20' : 'text-[#A1A1AA] hover:bg-[#181818] hover:text-white' }}">
                            <svg class="h-4 w-4 {{ request()->routeIs('admin.service-referrals.*') ? 'text-[#F63B05]' : 'text-[#A1A1AA] group-hover:text-white' }}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0v-4m0 4h4m-4-4l-3-3m3 3l3-3"/>
                            </svg>
                            <span>Service Referrals</span>
                        </a>

                        <a href="{{ route('admin.feedback.index') }}" class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-heading font-semibold transition-all duration-150 {{ request()->routeIs('admin.feedback.*') ? 'bg-[#F63B05]/15 text-[#F63B05] border border-[#F63B05]/20' : 'text-[#A1A1AA] hover:bg-[#181818] hover:text-white' }}">
                            <span>Feedback</span>
                        </a>

                        <!-- Maintenance -->
                        <a href="{{ route('admin.maintenance.index') }}" class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-heading font-semibold transition-all duration-150 {{ request()->routeIs('admin.maintenance.*') ? 'bg-[#F63B05]/15 text-[#F63B05] border border-[#F63B05]/20' : 'text-[#A1A1AA] hover:bg-[#181818] hover:text-white' }}">
                            <svg class="h-4 w-4 {{ request()->routeIs('admin.maintenance.*') ? 'text-[#F63B05]' : 'text-[#A1A1AA] group-hover:text-white' }}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                            </svg>
                            <span>Maintenance</span>
                        </a>
                    </div>

                    <!-- AI GROUP -->
                    <div>
                        <p class="px-3 text-[10px] font-heading font-bold tracking-wider text-[#666666] uppercase mb-1.5">AI Engine</p>

                        <!-- AI Activity -->
                        <a href="{{ route('admin.ai-activity.index') }}" class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-heading font-semibold transition-all duration-150 {{ request()->routeIs('admin.ai-activity.*') ? 'bg-[#F63B05]/15 text-[#F63B05] border border-[#F63B05]/20' : 'text-[#A1A1AA] hover:bg-[#181818] hover:text-white' }}">
                            <svg class="h-4 w-4 {{ request()->routeIs('admin.ai-activity.*') ? 'text-[#F63B05]' : 'text-[#A1A1AA] group-hover:text-white' }}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                            </svg>
                            <span>AI Activity</span>
                        </a>

                        <!-- Reports -->
                        <a href="{{ route('admin.reports.index') }}" class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-heading font-semibold transition-all duration-150 {{ request()->routeIs('admin.reports.*') ? 'bg-[#F63B05]/15 text-[#F63B05] border border-[#F63B05]/20' : 'text-[#A1A1AA] hover:bg-[#181818] hover:text-white' }}">
                            <svg class="h-4 w-4 {{ request()->routeIs('admin.reports.*') ? 'text-[#F63B05]' : 'text-[#A1A1AA] group-hover:text-white' }}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                            </svg>
                            <span>Reports</span>
                        </a>
                    </div>

                    <!-- SYSTEM GROUP -->
                    <div>
                        <p class="px-3 text-[10px] font-heading font-bold tracking-wider text-[#666666] uppercase mb-1.5">System</p>

                        <a href="{{ route('admin.notifications.index') }}" class="group flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-xs font-heading font-semibold transition-all duration-150 {{ request()->routeIs('admin.notifications.*') ? 'bg-[#F63B05]/15 text-[#F63B05] border border-[#F63B05]/20' : 'text-[#A1A1AA] hover:bg-[#181818] hover:text-white' }}">
                            <span>Admin Activity</span>
                            <span data-admin-notification-badge class="hidden min-w-5 rounded-full bg-[#F63B05] px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white" aria-live="polite"></span>
                        </a>

                        <a href="{{ route('admin.announcements.index') }}" class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-heading font-semibold transition-all duration-150 {{ request()->routeIs('admin.announcements.*') ? 'bg-[#F63B05]/15 text-[#F63B05] border border-[#F63B05]/20' : 'text-[#A1A1AA] hover:bg-[#181818] hover:text-white' }}">
                            <span>Announcements</span>
                        </a>

                        <a href="{{ route('admin.health.index') }}" class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-heading font-semibold transition-all duration-150 {{ request()->routeIs('admin.health.*') ? 'bg-[#F63B05]/15 text-[#F63B05] border border-[#F63B05]/20' : 'text-[#A1A1AA] hover:bg-[#181818] hover:text-white' }}">
                            <span>System Health</span>
                        </a>

                        <a href="{{ route('admin.audit.index') }}" class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-heading font-semibold transition-all duration-150 {{ request()->routeIs('admin.audit.*') ? 'bg-[#F63B05]/15 text-[#F63B05] border border-[#F63B05]/20' : 'text-[#A1A1AA] hover:bg-[#181818] hover:text-white' }}">
                            <span>Admin Audit</span>
                        </a>

                        <!-- Settings -->
                        <a href="{{ route('admin.settings.index') }}" class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-heading font-semibold transition-all duration-150 {{ request()->routeIs('admin.settings.*') ? 'bg-[#F63B05]/15 text-[#F63B05] border border-[#F63B05]/20' : 'text-[#A1A1AA] hover:bg-[#181818] hover:text-white' }}">
                            <svg class="h-4 w-4 {{ request()->routeIs('admin.settings.*') ? 'text-[#F63B05]' : 'text-[#A1A1AA] group-hover:text-white' }}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                            </svg>
                            <span>Settings</span>
                        </a>

                        <!-- Correction Requests -->
                        <a href="{{ route('admin.correction-requests.index') }}" class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-heading font-semibold transition-all duration-150 {{ request()->routeIs('admin.correction-requests.*') ? 'bg-[#F63B05]/15 text-[#F63B05] border border-[#F63B05]/20' : 'text-[#A1A1AA] hover:bg-[#181818] hover:text-white' }}">
                            <svg class="h-4 w-4 {{ request()->routeIs('admin.correction-requests.*') ? 'text-[#F63B05]' : 'text-[#A1A1AA] group-hover:text-white' }}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                            <span>Correction Requests</span>
                        </a>

                        <!-- Subscriptions -->
                        <a href="{{ route('admin.subscriptions.index') }}" class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-heading font-semibold transition-all duration-150 {{ request()->routeIs('admin.subscriptions.*') ? 'bg-[#F63B05]/15 text-[#F63B05] border border-[#F63B05]/20' : 'text-[#A1A1AA] hover:bg-[#181818] hover:text-white' }}">
                            <svg class="h-4 w-4 {{ request()->routeIs('admin.subscriptions.*') ? 'text-[#F63B05]' : 'text-[#A1A1AA] group-hover:text-white' }}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                            </svg>
                            <span>Subscriptions</span>
                        </a>

                        <!-- Admins -->
                        <a href="{{ route('admin.admins.index') }}" class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-heading font-semibold transition-all duration-150 {{ request()->routeIs('admin.admins.*') ? 'bg-[#F63B05]/15 text-[#F63B05] border border-[#F63B05]/20' : 'text-[#A1A1AA] hover:bg-[#181818] hover:text-white' }}">
                            <svg class="h-4 w-4 {{ request()->routeIs('admin.admins.*') ? 'text-[#F63B05]' : 'text-[#A1A1AA] group-hover:text-white' }}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                            </svg>
                            <span>Admin Accounts</span>
                        </a>
                    </div>
                </nav>

                <!-- Bottom Admin Profile Card -->
                <div class="p-3 border-t border-[#222222] bg-[#181818]/60">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2.5 min-w-0">
                            <img src="{{ route('admin.logo') }}" alt="VehiCare logo" class="h-9 w-9 shrink-0 rounded-xl object-contain" />
                            <div class="min-w-0">
                                <p class="text-xs font-heading font-bold text-white truncate">{{ auth()->user()->name ?? 'Administrator' }}</p>
                                <p class="text-[10px] text-[#A1A1AA] truncate capitalize">{{ auth()->user()->role ?? 'Admin' }}</p>
                            </div>
                        </div>
                        <form action="{{ route('admin.logout') }}" method="POST" class="inline">
                            @csrf
                            <button type="submit" title="Logout" class="p-2 text-[#A1A1AA] hover:text-[#F63B05] transition-colors">
                                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                                </svg>
                            </button>
                        </form>
                    </div>
                </div>

            </div>
        </aside>

        <!-- ========================================== -->
        <!-- MOBILE HEADER & DRAWER                    -->
        <!-- ========================================== -->
        <header class="lg:hidden sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[#222222] bg-[#111111] px-4">
            <div class="flex items-center gap-3">
                <button id="admin-mobile-menu-btn" @click="mobileMenuOpen = !mobileMenuOpen" class="p-1 text-[#A1A1AA] hover:text-white" aria-label="Open navigation menu">
                    <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                    </svg>
                </button>
                <div class="flex items-center gap-2">
                    <img src="{{ route('admin.logo') }}" alt="VehiCare logo" class="h-7 w-7 rounded-lg object-contain" />
                    <span class="font-heading font-bold text-sm text-white">VehiCare Admin</span>
                </div>
            </div>
            <form action="{{ route('admin.logout') }}" method="POST" class="inline">
                @csrf
                <button type="submit" class="text-xs font-heading font-semibold text-rose-400">Logout</button>
            </form>
        </header>

        <!-- Mobile Drawer Backdrop -->
        <div 
            id="admin-mobile-drawer-backdrop"
            x-show="mobileMenuOpen" 
            x-cloak
            x-transition:enter="transition-opacity ease-linear duration-200"
            x-transition:enter-start="opacity-0"
            x-transition:enter-end="opacity-100"
            x-transition:leave="transition-opacity ease-linear duration-200"
            x-transition:leave-start="opacity-100"
            x-transition:leave-end="opacity-0"
            @click="mobileMenuOpen = false" 
            class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm lg:hidden hidden"
        ></div>

        <!-- Mobile Drawer Sidebar -->
        <aside 
            id="admin-mobile-drawer"
            x-show="mobileMenuOpen" 
            x-cloak
            x-transition:enter="transition ease-in-out duration-300 transform"
            x-transition:enter-start="-translate-x-full"
            x-transition:enter-end="translate-x-0"
            x-transition:leave="transition ease-in-out duration-300 transform"
            x-transition:leave-start="translate-x-0"
            x-transition:leave-end="-translate-x-full"
            class="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-[#111111] border-r border-[#222222] shadow-2xl lg:hidden -translate-x-full"
        >
            <!-- Drawer Top Header -->
            <div class="flex h-16 items-center justify-between px-5 border-b border-[#222222]">
                <div class="flex items-center gap-3">
                    <img src="{{ route('admin.logo') }}" alt="VehiCare logo" class="h-8 w-8 rounded-xl object-contain" />
                    <div>
                        <div class="flex items-center gap-1.5">
                            <span class="font-heading font-bold text-sm text-white">VehiCare</span>
                            <span class="rounded bg-[#F63B05]/10 px-1.5 py-0.5 text-[9px] font-heading font-extrabold text-[#F63B05]">ADMIN</span>
                        </div>
                        <p class="text-[10px] text-[#666666] font-medium">Control Center</p>
                    </div>
                </div>
                <button 
                    id="admin-mobile-drawer-close"
                    @click="mobileMenuOpen = false" 
                    class="p-2 rounded-lg text-[#A1A1AA] hover:text-white hover:bg-[#181818] transition"
                    aria-label="Close menu"
                >
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>

            <!-- Drawer Navigation Sections -->
            <nav class="flex-1 space-y-5 px-3 py-4 overflow-y-auto">
                <!-- MAIN GROUP -->
                <div>
                    <p class="px-3 text-[10px] font-heading font-bold tracking-wider text-[#666666] uppercase mb-1.5">Main</p>
                    <a href="{{ route('admin.dashboard') }}" class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-heading font-semibold transition-all duration-150 {{ request()->routeIs('admin.dashboard') ? 'bg-[#F63B05]/15 text-[#F63B05] border border-[#F63B05]/20' : 'text-[#A1A1AA] hover:bg-[#181818] hover:text-white' }}">
                        <svg class="h-4 w-4 {{ request()->routeIs('admin.dashboard') ? 'text-[#F63B05]' : 'text-[#A1A1AA] group-hover:text-white' }}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
                        </svg>
                        <span>Overview</span>
                    </a>
                    <a href="{{ route('admin.users.index') }}" class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-heading font-semibold transition-all duration-150 {{ request()->routeIs('admin.users.*') ? 'bg-[#F63B05]/15 text-[#F63B05] border border-[#F63B05]/20' : 'text-[#A1A1AA] hover:bg-[#181818] hover:text-white' }}">
                        <svg class="h-4 w-4 {{ request()->routeIs('admin.users.*') ? 'text-[#F63B05]' : 'text-[#A1A1AA] group-hover:text-white' }}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
                        </svg>
                        <span>Users</span>
                    </a>
                    <a href="{{ route('admin.vehicles.index') }}" class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-heading font-semibold transition-all duration-150 {{ request()->routeIs('admin.vehicles.*') ? 'bg-[#F63B05]/15 text-[#F63B05] border border-[#F63B05]/20' : 'text-[#A1A1AA] hover:bg-[#181818] hover:text-white' }}">
                        <svg class="h-4 w-4 {{ request()->routeIs('admin.vehicles.*') ? 'text-[#F63B05]' : 'text-[#A1A1AA] group-hover:text-white' }}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"/>
                        </svg>
                        <span>Vehicles</span>
                    </a>
                    <a href="{{ route('admin.diagnostics.index') }}" class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-heading font-semibold transition-all duration-150 {{ request()->routeIs('admin.diagnostics.*') ? 'bg-[#F63B05]/15 text-[#F63B05] border border-[#F63B05]/20' : 'text-[#A1A1AA] hover:bg-[#181818] hover:text-white' }}">
                        <svg class="h-4 w-4 {{ request()->routeIs('admin.diagnostics.*') ? 'text-[#F63B05]' : 'text-[#A1A1AA] group-hover:text-white' }}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                        </svg>
                        <span>Diagnostics</span>
                    </a>
                </div>

                <!-- SERVICES GROUP -->
                <div>
                    <p class="px-3 text-[10px] font-heading font-bold tracking-wider text-[#666666] uppercase mb-1.5">Services</p>
                    <a href="{{ route('admin.repair-shops.index') }}" class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-heading font-semibold transition-all duration-150 {{ request()->routeIs('admin.repair-shops.*') ? 'bg-[#F63B05]/15 text-[#F63B05] border border-[#F63B05]/20' : 'text-[#A1A1AA] hover:bg-[#181818] hover:text-white' }}">
                        <svg class="h-4 w-4 {{ request()->routeIs('admin.repair-shops.*') ? 'text-[#F63B05]' : 'text-[#A1A1AA] group-hover:text-white' }}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0v-4m0 4h4m-4-4l-3-3m3 3l3-3"/>
                        </svg>
                        <span>Repair Shops</span>
                    </a>
                    <a href="{{ route('admin.repair-assistance.index') }}" class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-heading font-semibold transition-all duration-150 {{ request()->routeIs('admin.repair-assistance.*') ? 'bg-[#F63B05]/15 text-[#F63B05] border border-[#F63B05]/20' : 'text-[#A1A1AA] hover:bg-[#181818] hover:text-white' }}">
                        <svg class="h-4 w-4 {{ request()->routeIs('admin.repair-assistance.*') ? 'text-[#F63B05]' : 'text-[#A1A1AA] group-hover:text-white' }}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                        </svg>
                        <span>Repair Assistance</span>
                    </a>
                    <a href="{{ route('admin.service-referrals.index') }}" class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-heading font-semibold transition-all duration-150 {{ request()->routeIs('admin.service-referrals.*') ? 'bg-[#F63B05]/15 text-[#F63B05] border border-[#F63B05]/20' : 'text-[#A1A1AA] hover:bg-[#181818] hover:text-white' }}">
                        <svg class="h-4 w-4 {{ request()->routeIs('admin.service-referrals.*') ? 'text-[#F63B05]' : 'text-[#A1A1AA] group-hover:text-white' }}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0v-4m0 4h4m-4-4l-3-3m3 3l3-3"/>
                        </svg>
                        <span>Service Referrals</span>
                    </a>
                    <a href="{{ route('admin.feedback.index') }}" class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-heading font-semibold transition-all duration-150 {{ request()->routeIs('admin.feedback.*') ? 'bg-[#F63B05]/15 text-[#F63B05] border border-[#F63B05]/20' : 'text-[#A1A1AA] hover:bg-[#181818] hover:text-white' }}">
                        <svg class="h-4 w-4 {{ request()->routeIs('admin.feedback.*') ? 'text-[#F63B05]' : 'text-[#A1A1AA] group-hover:text-white' }}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
                        </svg>
                        <span>Feedback</span>
                    </a>
                    <a href="{{ route('admin.maintenance.index') }}" class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-heading font-semibold transition-all duration-150 {{ request()->routeIs('admin.maintenance.*') ? 'bg-[#F63B05]/15 text-[#F63B05] border border-[#F63B05]/20' : 'text-[#A1A1AA] hover:bg-[#181818] hover:text-white' }}">
                        <svg class="h-4 w-4 {{ request()->routeIs('admin.maintenance.*') ? 'text-[#F63B05]' : 'text-[#A1A1AA] group-hover:text-white' }}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                        <span>Maintenance</span>
                    </a>
                </div>

                <!-- AI GROUP -->
                <div>
                    <p class="px-3 text-[10px] font-heading font-bold tracking-wider text-[#666666] uppercase mb-1.5">AI Engine</p>
                    <a href="{{ route('admin.ai-activity.index') }}" class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-heading font-semibold transition-all duration-150 {{ request()->routeIs('admin.ai-activity.*') ? 'bg-[#F63B05]/15 text-[#F63B05] border border-[#F63B05]/20' : 'text-[#A1A1AA] hover:bg-[#181818] hover:text-white' }}">
                        <svg class="h-4 w-4 {{ request()->routeIs('admin.ai-activity.*') ? 'text-[#F63B05]' : 'text-[#A1A1AA] group-hover:text-white' }}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                        </svg>
                        <span>AI Activity</span>
                    </a>
                    <a href="{{ route('admin.reports.index') }}" class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-heading font-semibold transition-all duration-150 {{ request()->routeIs('admin.reports.*') ? 'bg-[#F63B05]/15 text-[#F63B05] border border-[#F63B05]/20' : 'text-[#A1A1AA] hover:bg-[#181818] hover:text-white' }}">
                        <svg class="h-4 w-4 {{ request()->routeIs('admin.reports.*') ? 'text-[#F63B05]' : 'text-[#A1A1AA] group-hover:text-white' }}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                        <span>Reports</span>
                    </a>
                </div>

                <!-- SYSTEM GROUP -->
                <div>
                    <p class="px-3 text-[10px] font-heading font-bold tracking-wider text-[#666666] uppercase mb-1.5">System</p>
                    <a href="{{ route('admin.notifications.index') }}" class="group flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-xs font-heading font-semibold transition-all duration-150 {{ request()->routeIs('admin.notifications.*') ? 'bg-[#F63B05]/15 text-[#F63B05] border border-[#F63B05]/20' : 'text-[#A1A1AA] hover:bg-[#181818] hover:text-white' }}">
                        <span>Admin Activity</span>
                        <span data-admin-notification-badge class="hidden min-w-5 rounded-full bg-[#F63B05] px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white" aria-live="polite"></span>
                    </a>
                    <a href="{{ route('admin.announcements.index') }}" class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-heading font-semibold transition-all duration-150 {{ request()->routeIs('admin.announcements.*') ? 'bg-[#F63B05]/15 text-[#F63B05] border border-[#F63B05]/20' : 'text-[#A1A1AA] hover:bg-[#181818] hover:text-white' }}">
                        <span>Announcements</span>
                    </a>
                    <a href="{{ route('admin.health.index') }}" class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-heading font-semibold transition-all duration-150 {{ request()->routeIs('admin.health.*') ? 'bg-[#F63B05]/15 text-[#F63B05] border border-[#F63B05]/20' : 'text-[#A1A1AA] hover:bg-[#181818] hover:text-white' }}">
                        <span>System Health</span>
                    </a>
                    <a href="{{ route('admin.audit.index') }}" class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-heading font-semibold transition-all duration-150 {{ request()->routeIs('admin.audit.*') ? 'bg-[#F63B05]/15 text-[#F63B05] border border-[#F63B05]/20' : 'text-[#A1A1AA] hover:bg-[#181818] hover:text-white' }}">
                        <span>Admin Audit</span>
                    </a>
                    <a href="{{ route('admin.settings.index') }}" class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-heading font-semibold transition-all duration-150 {{ request()->routeIs('admin.settings.*') ? 'bg-[#F63B05]/15 text-[#F63B05] border border-[#F63B05]/20' : 'text-[#A1A1AA] hover:bg-[#181818] hover:text-white' }}">
                        <svg class="h-4 w-4 {{ request()->routeIs('admin.settings.*') ? 'text-[#F63B05]' : 'text-[#A1A1AA] group-hover:text-white' }}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                        </svg>
                        <span>Settings</span>
                    </a>
                    <a href="{{ route('admin.correction-requests.index') }}" class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-heading font-semibold transition-all duration-150 {{ request()->routeIs('admin.correction-requests.*') ? 'bg-[#F63B05]/15 text-[#F63B05] border border-[#F63B05]/20' : 'text-[#A1A1AA] hover:bg-[#181818] hover:text-white' }}">
                        <svg class="h-4 w-4 {{ request()->routeIs('admin.correction-requests.*') ? 'text-[#F63B05]' : 'text-[#A1A1AA] group-hover:text-white' }}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                        <span>Correction Requests</span>
                    </a>
                    <a href="{{ route('admin.subscriptions.index') }}" class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-heading font-semibold transition-all duration-150 {{ request()->routeIs('admin.subscriptions.*') ? 'bg-[#F63B05]/15 text-[#F63B05] border border-[#F63B05]/20' : 'text-[#A1A1AA] hover:bg-[#181818] hover:text-white' }}">
                        <svg class="h-4 w-4 {{ request()->routeIs('admin.subscriptions.*') ? 'text-[#F63B05]' : 'text-[#A1A1AA] group-hover:text-white' }}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                        </svg>
                        <span>Subscriptions</span>
                    </a>
                    <a href="{{ route('admin.admins.index') }}" class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-heading font-semibold transition-all duration-150 {{ request()->routeIs('admin.admins.*') ? 'bg-[#F63B05]/15 text-[#F63B05] border border-[#F63B05]/20' : 'text-[#A1A1AA] hover:bg-[#181818] hover:text-white' }}">
                        <svg class="h-4 w-4 {{ request()->routeIs('admin.admins.*') ? 'text-[#F63B05]' : 'text-[#A1A1AA] group-hover:text-white' }}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                        </svg>
                        <span>Admin Accounts</span>
                    </a>
                </div>
            </nav>

            <!-- Bottom Profile & Logout -->
            <div class="p-3 border-t border-[#222222] bg-[#181818]/60">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2.5 min-w-0">
                        <img src="{{ route('admin.logo') }}" alt="VehiCare logo" class="h-8 w-8 shrink-0 rounded-xl object-contain" />
                        <div class="min-w-0">
                            <p class="text-xs font-heading font-bold text-white truncate">{{ auth()->user()->name ?? 'Administrator' }}</p>
                            <p class="text-[10px] text-[#A1A1AA] truncate capitalize">{{ auth()->user()->role ?? 'Admin' }}</p>
                        </div>
                    </div>
                    <form action="{{ route('admin.logout') }}" method="POST" class="inline">
                        @csrf
                        <button type="submit" title="Logout" class="p-2 text-[#A1A1AA] hover:text-[#F63B05] transition-colors">
                            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                            </svg>
                        </button>
                    </form>
                </div>
            </div>
        </aside>

        <!-- ========================================== -->
        <!-- MAIN DESKTOP / CONTENT AREA                -->
        <!-- ========================================== -->
        <div class="flex-1 lg:pl-64 flex flex-col min-h-screen">

            <!-- Compact Top Header Bar -->
            <header class="hidden lg:flex h-16 items-center justify-between border-b border-[#222222] bg-[#111111] px-6 sticky top-0 z-20">
                <div>
                    <h1 class="text-base font-heading font-bold text-white tracking-tight">{{ $title ?? 'Dashboard' }}</h1>
                    <p class="text-[11px] text-[#A1A1AA]">{{ $description ?? 'VehiCare Intelligent Vehicle Diagnostics & Fleet Management' }}</p>
                </div>
                <div class="flex items-center gap-4">
                    <!-- Search Input -->
                    <div class="relative">
                        <input type="search" placeholder="Search system..." class="w-56 rounded-xl border border-[#222222] bg-[#181818] px-3.5 py-1.5 pl-9 text-xs text-white placeholder-[#666666] outline-none focus:border-[#F63B05]" />
                        <svg class="h-4 w-4 text-[#666666] absolute left-3 top-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                        </svg>
                    </div>

                    <!-- Notifications Bell Badge -->
                    <div class="relative">
                        <a href="{{ route('admin.notifications.index') }}" data-admin-notification-link class="block p-2 text-[#A1A1AA] hover:text-white transition-colors relative" aria-label="Admin activity notifications" title="Admin activity notifications">
                            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                            </svg>
                            <span data-admin-notification-badge class="hidden absolute -right-1 -top-1 min-w-5 rounded-full bg-[#F63B05] px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white shadow" aria-live="polite"></span>
                        </a>
                    </div>

                    <!-- Admin Profile Badge -->
                    <div class="flex items-center gap-2 rounded-xl bg-[#181818] border border-[#222222] px-3 py-1.5">
                        <img src="{{ route('admin.logo') }}" alt="VehiCare logo" class="h-6 w-6 rounded-lg object-contain" />
                        <span class="text-xs font-heading font-semibold text-white">{{ auth()->user()->name ?? 'Admin' }}</span>
                    </div>
                </div>
            </header>

            <!-- Main Body Slot -->
            <main class="flex-1 p-4 sm:p-6 lg:p-6">
                <div class="mx-auto max-w-7xl space-y-6">

                    <!-- Flash Status Alerts -->
                    @if(session('status'))
                        <div class="flex items-center gap-3 rounded-xl border border-[#32D583]/30 bg-[#32D583]/10 px-4 py-3 text-xs font-medium text-[#32D583]">
                            <svg class="h-4 w-4 shrink-0 text-[#32D583]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            <span>{{ session('status') }}</span>
                        </div>
                    @endif

                    @if($errors->any())
                        <div class="rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 px-4 py-3 text-xs text-[#EF4444]">
                            <p class="font-heading font-bold mb-1">Please address the issues below:</p>
                            <ul class="list-disc list-inside space-y-1 text-[11px]">
                                @foreach($errors->all() as $error)
                                    <li>{{ $error }}</li>
                                @endforeach
                            </ul>
                        </div>
                    @endif

                    {{ $slot }}
                </div>
            </main>

            <!-- Footer -->
            <footer class="border-t border-[#222222] bg-[#111111] px-6 py-4 text-center text-[11px] text-[#666666]">
                <p>&copy; {{ date('Y') }} VehiCare Automotive Diagnostics Platform. All rights reserved.</p>
            </footer>

        </div>
    </div>

    <script>
        (() => {
            const badges = document.querySelectorAll('[data-admin-notification-badge]');
            const notificationLinks = document.querySelectorAll('[data-admin-notification-link]');
            const unreadCountUrl = @json(route('admin.notifications.unread-count'));

            const refreshUnreadCount = async () => {
                try {
                    const response = await fetch(unreadCountUrl, {
                        credentials: 'same-origin',
                        headers: { Accept: 'application/json' },
                        cache: 'no-store',
                    });

                    if (!response.ok) {
                        throw new Error(`Unread count request failed (${response.status}).`);
                    }

                    const result = await response.json();
                    const count = Number(result.unread_count);

                    if (!Number.isInteger(count) || count < 0) {
                        throw new Error('Unread count response was invalid.');
                    }

                    badges.forEach(badge => {
                        badge.textContent = count > 99 ? '99+' : String(count);
                        badge.classList.toggle('hidden', count === 0);
                    });
                    notificationLinks.forEach(link => {
                        const label = count > 0
                            ? `Admin activity notifications, ${count} unread`
                            : 'Admin activity notifications';
                        link.setAttribute('aria-label', label);
                        link.title = label;
                    });
                } catch (error) {
                    console.warn('[AdminNotifications] Unable to refresh unread count:', error);
                }
            };

            refreshUnreadCount();
            window.setInterval(refreshUnreadCount, 10000);
            window.addEventListener('focus', refreshUnreadCount);
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                    refreshUnreadCount();
                }
            });
        })();

        // Mobile Drawer Controller (Vanilla JS fallback for immediate responsiveness)
        (() => {
            const menuBtn = document.getElementById('admin-mobile-menu-btn');
            const closeBtn = document.getElementById('admin-mobile-drawer-close');
            const backdrop = document.getElementById('admin-mobile-drawer-backdrop');
            const drawer = document.getElementById('admin-mobile-drawer');

            const openDrawer = () => {
                if (drawer && backdrop) {
                    backdrop.classList.remove('hidden');
                    drawer.classList.remove('-translate-x-full');
                    drawer.classList.add('translate-x-0');
                    document.body.classList.add('overflow-hidden');
                }
            };

            const closeDrawer = () => {
                if (drawer && backdrop) {
                    drawer.classList.remove('translate-x-0');
                    drawer.classList.add('-translate-x-full');
                    backdrop.classList.add('hidden');
                    document.body.classList.remove('overflow-hidden');
                }
            };

            menuBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                openDrawer();
            });
            closeBtn?.addEventListener('click', closeDrawer);
            backdrop?.addEventListener('click', closeDrawer);

            window.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') closeDrawer();
            });
        })();
    </script>
</body>
</html>
