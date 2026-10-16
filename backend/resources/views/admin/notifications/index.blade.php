<x-admin-layout>
    <x-slot name="header">Admin Activity</x-slot>
    <x-slot name="description">Recent operational events requiring administrator awareness</x-slot>

    <div class="space-y-3">
        @forelse($notifications as $notification)
            @php($data = $notification->data)
            <article class="rounded-xl border border-[#222222] {{ $notification->read_at ? 'bg-[#111111]' : 'bg-[#181818]' }} p-4">
                <div class="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h2 class="font-heading font-bold text-white">{{ $data['title'] ?? 'Admin activity' }}</h2>
                        <p class="mt-1 text-sm text-[#A1A1AA]">{{ $data['message'] ?? '' }}</p>
                        <p class="mt-2 text-[11px] text-[#666666]">{{ $notification->created_at?->format('M d, Y h:i A') }}</p>
                    </div>
                    @unless($notification->read_at)
                        <form method="POST" action="{{ route('admin.notifications.read', $notification->id) }}">
                            @csrf
                            <button class="rounded-lg border border-[#333333] px-3 py-2 text-xs text-white">Mark read</button>
                        </form>
                    @endunless
                </div>
            </article>
        @empty
            <div class="rounded-xl border border-[#222222] bg-[#111111] p-8 text-center text-sm text-[#A1A1AA]">No admin activity notifications.</div>
        @endforelse
        {{ $notifications->links() }}
    </div>
</x-admin-layout>
