<x-admin-layout>
    <x-slot name="header">System Health</x-slot>
    <x-slot name="description">Dependency reachability only; secrets and provider credentials are never shown</x-slot>

    <div class="grid gap-4 sm:grid-cols-2">
        @foreach(['Laravel database' => $database, 'AI service' => $aiService] as $label => $status)
            <div class="rounded-xl border border-[#222222] bg-[#111111] p-5">
                <p class="text-xs font-heading font-bold uppercase tracking-wider text-[#A1A1AA]">{{ $label }}</p>
                <p class="mt-2 text-lg font-heading font-extrabold {{ $status === 'healthy' ? 'text-[#32D583]' : 'text-rose-400' }}">{{ ucfirst($status) }}</p>
            </div>
        @endforeach
        <div class="rounded-xl border border-[#222222] bg-[#111111] p-5">
            <p class="text-xs font-heading font-bold uppercase tracking-wider text-[#A1A1AA]">Broadcast connection</p>
            <p class="mt-2 text-lg font-heading font-extrabold text-white">{{ $broadcast }}</p>
            <p class="mt-1 text-xs {{ $reverbConfigured ? 'text-[#32D583]' : 'text-amber-400' }}">
                {{ $reverbConfigured ? 'Reverb credentials configured' : 'Reverb not active or still using development defaults' }}
            </p>
        </div>
    </div>
    <p class="mt-4 text-[11px] text-[#666666]">This page does not verify external Gemini availability or guarantee end-to-end request success.</p>
</x-admin-layout>
