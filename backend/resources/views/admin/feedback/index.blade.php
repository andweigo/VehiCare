<x-admin-layout>
    <x-slot name="header">User Feedback</x-slot>
    <x-slot name="description">Review feedback received from VehiCare users</x-slot>

    <div class="space-y-4">
        <form method="GET" class="flex flex-wrap gap-2">
            <select name="status" class="rounded-lg border border-[#222222] bg-[#181818] px-3 py-2 text-xs text-white">
                <option value="">All statuses</option>
                @foreach(['new', 'reviewing', 'resolved', 'dismissed'] as $status)
                    <option value="{{ $status }}" @selected(request('status') === $status)>{{ ucfirst($status) }}</option>
                @endforeach
            </select>
            <select name="category" class="rounded-lg border border-[#222222] bg-[#181818] px-3 py-2 text-xs text-white">
                <option value="">All categories</option>
                @foreach(['general', 'feature', 'accuracy', 'usability', 'performance', 'other'] as $category)
                    <option value="{{ $category }}" @selected(request('category') === $category)>{{ ucfirst($category) }}</option>
                @endforeach
            </select>
            <button class="rounded-lg border border-[#333333] px-3 py-2 text-xs text-white">Filter</button>
        </form>

        <div class="space-y-4">
            @forelse($feedback as $item)
                <article class="rounded-xl border border-[#222222] bg-[#111111] p-4">
                    <div class="flex flex-wrap justify-between gap-2">
                        <div>
                            <h2 class="font-heading font-bold text-white">{{ $item->subject }}</h2>
                            <p class="mt-1 text-[11px] text-[#A1A1AA]">
                                {{ ucfirst($item->category) }} · {{ $item->rating ? "{$item->rating}/5" : 'No rating' }}
                                · {{ $item->user?->name ?? 'Guest' }}
                                @if($item->contact_email) · {{ $item->contact_email }} @endif
                                · {{ $item->created_at?->format('M d, Y h:i A') }}
                            </p>
                        </div>
                        <span class="text-xs font-semibold text-[#F63B05]">{{ ucfirst($item->status) }}</span>
                    </div>
                    <p class="mt-3 whitespace-pre-wrap text-sm text-[#D4D4D8]">{{ $item->message }}</p>
                    <form method="POST" action="{{ route('admin.feedback.update', $item) }}" class="mt-4 grid gap-3 sm:grid-cols-[180px_1fr_auto]">
                        @csrf
                        @method('PUT')
                        <select name="status" required class="rounded-lg border border-[#222222] bg-[#181818] px-3 py-2 text-xs text-white">
                            @foreach(['new', 'reviewing', 'resolved', 'dismissed'] as $status)
                                <option value="{{ $status }}" @selected($item->status === $status)>{{ ucfirst($status) }}</option>
                            @endforeach
                        </select>
                        <input name="admin_notes" value="{{ $item->admin_notes }}" maxlength="5000" placeholder="Internal review note"
                            class="rounded-lg border border-[#222222] bg-[#181818] px-3 py-2 text-xs text-white">
                        <button class="rounded-lg bg-[#F63B05] px-3 py-2 text-xs font-bold text-white">Save review</button>
                    </form>
                </article>
            @empty
                <div class="rounded-xl border border-[#222222] bg-[#111111] p-8 text-center text-sm text-[#A1A1AA]">No feedback submissions found.</div>
            @endforelse
        </div>
        {{ $feedback->links() }}
    </div>
</x-admin-layout>
