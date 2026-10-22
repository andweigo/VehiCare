<x-admin-layout>
    <x-slot name="header">Announcements</x-slot>
    <x-slot name="description">Schedule audience-targeted notices; published records are retained as history</x-slot>

    <div class="space-y-6">
        <form method="POST" action="{{ route('admin.announcements.store') }}" class="space-y-4 rounded-xl border border-[#222222] bg-[#111111] p-5" x-data="{ audience: @js(old('audience', 'all')) }">
            @csrf
            <h2 class="font-heading text-sm font-bold uppercase tracking-wider text-white">Schedule announcement</h2>
            <div class="grid gap-3 sm:grid-cols-2">
                <label class="text-xs text-[#A1A1AA]">Title
                    <input name="title" required maxlength="160" value="{{ old('title') }}" class="mt-1 w-full rounded-lg border border-[#222222] bg-[#181818] px-3 py-2 text-white">
                </label>
                <label class="text-xs text-[#A1A1AA]">Audience
                    <select name="audience" required x-model="audience" class="mt-1 w-full rounded-lg border border-[#222222] bg-[#181818] px-3 py-2 text-white">
                        <option value="all">All active accounts</option>
                        <option value="free">Free accounts</option>
                        <option value="premium">Active Premium accounts</option>
                        <option value="selected">Selected accounts</option>
                    </select>
                </label>
                <label x-cloak x-show="audience === 'selected'" class="text-xs text-[#A1A1AA] sm:col-span-2">
                    Select active users
                    <select name="recipient_user_ids[]" multiple size="8" x-bind:required="audience === 'selected'" class="mt-1 w-full rounded-lg border border-[#222222] bg-[#181818] px-3 py-2 text-white">
                        @foreach($activeUsers as $activeUser)
                            <option value="{{ $activeUser->id }}" @selected(in_array($activeUser->id, (array) old('recipient_user_ids', [])))>{{ $activeUser->name }} ({{ $activeUser->email }})</option>
                        @endforeach
                    </select>
                    <span class="mt-1 block text-[11px] text-[#666666]">Only selected users who are active and have in-app notifications enabled at delivery time will receive this notice.</span>
                </label>
                <label class="text-xs text-[#A1A1AA]">Schedule time
                    <input type="datetime-local" name="scheduled_at" required value="{{ old('scheduled_at') }}" class="mt-1 w-full rounded-lg border border-[#222222] bg-[#181818] px-3 py-2 text-white">
                </label>
                <label class="text-xs text-[#A1A1AA]">Expiry time (optional)
                    <input type="datetime-local" name="expires_at" value="{{ old('expires_at') }}" class="mt-1 w-full rounded-lg border border-[#222222] bg-[#181818] px-3 py-2 text-white">
                </label>
            </div>
            <label class="block text-xs text-[#A1A1AA]">Message
                <textarea name="body" required maxlength="5000" rows="4" class="mt-1 w-full rounded-lg border border-[#222222] bg-[#181818] px-3 py-2 text-white">{{ old('body') }}</textarea>
            </label>
            <button class="rounded-lg bg-[#F63B05] px-4 py-2 text-xs font-bold text-white">Save schedule</button>
        </form>

        <div class="space-y-3">
            @forelse($announcements as $announcement)
                <article class="rounded-xl border border-[#222222] bg-[#111111] p-4">
                    <div class="flex flex-wrap justify-between gap-2">
                        <h3 class="font-heading font-bold text-white">{{ $announcement->title }}</h3>
                        <span class="text-xs font-semibold text-[#F63B05]">{{ ucfirst($announcement->status) }}</span>
                    </div>
                    <p class="mt-2 whitespace-pre-wrap text-sm text-[#A1A1AA]">{{ $announcement->body }}</p>
                    <p class="mt-3 text-[11px] text-[#666666]">
                        Audience: {{ $announcement->audience === 'selected' ? 'Selected users (' . $announcement->recipients_count . ')' : ucfirst($announcement->audience) }} · Starts {{ $announcement->scheduled_at?->timezone(config('app.admin_timezone'))->format('M d, Y h:i A') }}
                        @if($announcement->expires_at) · Expires {{ $announcement->expires_at->timezone(config('app.admin_timezone'))->format('M d, Y h:i A') }} @endif
                        · Created by {{ $announcement->createdBy?->name ?? 'Unknown' }}
                    </p>
                </article>
            @empty
                <div class="rounded-xl border border-[#222222] bg-[#111111] p-6 text-sm text-[#A1A1AA]">No announcements scheduled.</div>
            @endforelse
            @if($announcements->hasPages())
                <div class="pt-2">
                    {{ $announcements->links() }}
                </div>
            @endif
        </div>
    </div>
</x-admin-layout>
