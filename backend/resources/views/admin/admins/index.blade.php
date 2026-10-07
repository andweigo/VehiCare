<x-admin-layout>
    <x-slot name="header">Admin Accounts</x-slot>
    <x-slot name="description">Manage Administrator Users, Access Privileges & System Status</x-slot>

    <div class="space-y-6">

        <div class="rounded-xl border border-[#222222] bg-[#111111] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <h2 class="text-sm font-heading font-bold text-white uppercase tracking-wider">System Administrators</h2>
                <p class="text-[11px] text-[#A1A1AA]">Manage accounts authorized to access this desktop control center</p>
            </div>
            <a href="{{ route('admin.admins.create') }}" class="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#F63B05] px-3.5 py-2 text-xs font-heading font-semibold text-white shadow hover:bg-[#D83000] transition">
                + Create Admin Account
            </a>
        </div>

        <div class="overflow-hidden rounded-xl border border-[#222222] bg-[#111111]">
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs text-[#A1A1AA]">
                    <thead class="bg-[#181818] text-[10px] font-heading font-bold uppercase tracking-wider text-[#666666] border-b border-[#222222]">
                        <tr>
                            <th class="px-4 py-3">Administrator</th>
                            <th class="px-4 py-3">Email</th>
                            <th class="px-4 py-3">Role</th>
                            <th class="px-4 py-3">Status</th>
                            <th class="px-4 py-3">Created</th>
                            <th class="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-[#222222] bg-[#111111]">
                        @foreach($admins as $admin)
                            <tr class="hover:bg-[#181818]/60 transition">
                                <td class="px-4 py-3">
                                    <div class="flex items-center gap-2.5">
                                        <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-[#181818] border border-[#222222] font-heading font-bold text-[#F63B05] text-[11px]">
                                            {{ strtoupper(substr($admin->name, 0, 1)) }}
                                        </div>
                                        <span class="font-heading font-semibold text-white">{{ $admin->name }}</span>
                                    </div>
                                </td>
                                <td class="px-4 py-3 text-[#A1A1AA]">{{ $admin->email }}</td>
                                <td class="px-4 py-3 text-white font-heading font-semibold text-[10px] uppercase">{{ ucfirst($admin->role) }}</td>
                                <td class="px-4 py-3">
                                    @if($admin->is_active)
                                        <span class="inline-flex items-center gap-1 rounded-full bg-[#32D583]/10 px-2 py-0.5 text-[10px] font-heading font-bold text-[#32D583]">
                                            Active
                                        </span>
                                    @else
                                        <span class="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-heading font-bold text-rose-400">
                                            Disabled
                                        </span>
                                    @endif
                                </td>
                                <td class="px-4 py-3 text-[#666666]">{{ optional($admin->created_at)->format('M d, Y') ?? '—' }}</td>
                                <td class="px-4 py-3 text-right space-x-2">
                                    <form action="{{ route('admin.admins.toggle', $admin->id) }}" method="POST" class="inline">
                                        @csrf
                                        <button type="submit" class="rounded bg-[#181818] border border-[#222222] hover:border-white px-2.5 py-1 text-[11px] font-heading font-semibold text-white transition">
                                            {{ $admin->is_active ? 'Disable' : 'Enable' }}
                                        </button>
                                    </form>
                                    <form action="{{ route('admin.admins.destroy', $admin->id) }}" method="POST" class="inline" onsubmit="return confirm('Delete administrator {{ $admin->name }}?');">
                                        @csrf
                                        @method('DELETE')
                                        <button type="submit" class="rounded bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500 hover:text-white px-2.5 py-1 text-[11px] font-heading font-semibold text-rose-400 transition">
                                            Delete
                                        </button>
                                    </form>
                                </td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
        </div>

    </div>
</x-admin-layout>
