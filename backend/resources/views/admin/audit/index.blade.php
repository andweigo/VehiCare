<x-admin-layout>
    <x-slot name="header">Admin Audit History</x-slot>
    <x-slot name="description">Read-only record of selected administrator actions</x-slot>

    <div class="space-y-4">
        <form method="GET" class="flex flex-wrap gap-2">
            <select name="action" class="rounded-lg border border-[#222222] bg-[#181818] px-3 py-2 text-xs text-white">
                <option value="">All actions</option>
                @foreach($actions as $action)
                    <option value="{{ $action }}" @selected(request('action') === $action)>{{ str_replace('_', ' ', ucfirst($action)) }}</option>
                @endforeach
            </select>
            <select name="subject_type" class="rounded-lg border border-[#222222] bg-[#181818] px-3 py-2 text-xs text-white">
                <option value="">All subjects</option>
                @foreach(['user', 'admin', 'payment', 'subscription', 'vehicle', 'repair_shop'] as $type)
                    <option value="{{ $type }}" @selected(request('subject_type') === $type)>{{ ucfirst(str_replace('_', ' ', $type)) }}</option>
                @endforeach
            </select>
            <button class="rounded-lg border border-[#333333] px-3 py-2 text-xs text-white">Filter</button>
        </form>
        <div class="overflow-x-auto rounded-xl border border-[#222222] bg-[#111111]">
            <table class="w-full text-left text-xs text-[#A1A1AA]">
                <thead class="bg-[#181818] text-[10px] uppercase tracking-wider text-[#666666]">
                    <tr><th class="px-4 py-3">When</th><th class="px-4 py-3">Administrator</th><th class="px-4 py-3">Action</th><th class="px-4 py-3">Subject</th><th class="px-4 py-3">Details</th></tr>
                </thead>
                <tbody class="divide-y divide-[#222222]">
                    @forelse($audits as $audit)
                        <tr>
                            <td class="px-4 py-3">{{ $audit->created_at?->format('M d, Y h:i:s A') }}</td>
                            <td class="px-4 py-3 text-white">{{ $audit->admin_name }}</td>
                            <td class="px-4 py-3">{{ str_replace('_', ' ', ucfirst($audit->action)) }}</td>
                            <td class="px-4 py-3">{{ ucfirst(str_replace('_', ' ', $audit->subject_type)) }} #{{ $audit->subject_id }}</td>
                            <td class="px-4 py-3">{{ collect($audit->metadata ?? [])->map(fn ($value, $key) => "{$key}: {$value}")->implode(' · ') ?: '—' }}</td>
                        </tr>
                    @empty
                        <tr><td colspan="5" class="px-4 py-8 text-center">No administrator actions recorded.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        {{ $audits->links() }}
    </div>
</x-admin-layout>
