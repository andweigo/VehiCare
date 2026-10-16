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

        <div class="rounded-xl border border-[#222222] bg-[#111111] p-5 space-y-4">
            <div>
                <h2 class="text-sm font-heading font-bold text-white uppercase tracking-wider">AI Usage and Media Limits</h2>
                <p class="mt-1 text-[11px] text-[#A1A1AA]">Limits are bounded to protect service capacity and match the API upload ceilings.</p>
            </div>
            <form method="POST" action="{{ route('admin.settings.ai-limits.update') }}" class="space-y-5">
                @csrf
                @method('PUT')
                @foreach(['guest' => 'Guest', 'free' => 'Free', 'premium' => 'Premium'] as $plan => $label)
                    <fieldset class="grid gap-3 border-b border-[#222222] pb-4 sm:grid-cols-2 lg:grid-cols-3">
                        <legend class="pb-2 text-xs font-heading font-bold uppercase tracking-wider text-white">{{ $label }}</legend>
                        @foreach([
                            'limit' => ['Consultation limit', $plan === 'guest' ? 1 : 1, $plan === 'guest' ? 20 : ($plan === 'free' ? 100 : 500)],
                            'max_image_mb' => ['Max image size (MB)', 1, 15],
                            'max_video_mb' => ['Max video size (MB)', 1, 30],
                            'max_audio_mb' => ['Max audio size (MB)', 1, 10],
                            'max_video_sec' => ['Max video duration (seconds)', 1, 120],
                            'max_audio_sec' => ['Max audio duration (seconds)', 1, 300],
                        ] as $field => [$fieldLabel, $min, $max])
                            <label class="block text-[11px] text-[#A1A1AA]">
                                {{ $fieldLabel }}
                                <input type="number" name="limits[{{ $plan }}][{{ $field }}]" min="{{ $min }}" max="{{ $max }}" required
                                    value="{{ old("limits.{$plan}.{$field}", $settings[$plan][$field] ?? '') }}"
                                    class="mt-1 w-full rounded-lg border border-[#222222] bg-[#181818] px-3 py-2 text-white focus:border-[#F63B05] focus:outline-none">
                            </label>
                        @endforeach
                    </fieldset>
                @endforeach
                <button type="submit" class="rounded-lg bg-[#F63B05] px-4 py-2 text-xs font-heading font-bold text-white hover:bg-[#d93404]">
                    Save AI Limits
                </button>
            </form>
        </div>

    </div>
</x-admin-layout>
