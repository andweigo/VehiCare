<x-admin-layout>
    <x-slot name="header">Create Admin Account</x-slot>
    <x-slot name="description">Grant Desktop Control Center Privileges to Team Members</x-slot>

    <div class="space-y-6 max-w-3xl">
        <!-- Back Link -->
        <div>
            <a href="{{ route('admin.admins.index') }}" class="inline-flex items-center gap-1.5 text-xs font-heading font-semibold text-[#A1A1AA] hover:text-white transition">
                &larr; Back to Admin Accounts List
            </a>
        </div>

        <div class="rounded-xl border border-[#222222] bg-[#111111] p-5 space-y-4">
            <h2 class="text-sm font-heading font-bold text-white uppercase tracking-wider">New Administrator Details</h2>

            <form action="{{ route('admin.admins.store') }}" method="POST" class="space-y-4">
                @csrf

                <div class="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label class="block text-[11px] font-heading font-semibold text-[#A1A1AA] mb-1.5 uppercase">Full Name</label>
                        <input type="text" name="name" value="{{ old('name') }}" required placeholder="John Doe"
                            class="w-full rounded-xl border border-[#222222] bg-[#181818] px-3.5 py-2.5 text-xs text-white placeholder-[#666666] outline-none focus:border-[#F63B05]" />
                    </div>
                    <div>
                        <label class="block text-[11px] font-heading font-semibold text-[#A1A1AA] mb-1.5 uppercase">Email Address</label>
                        <input type="email" name="email" value="{{ old('email') }}" required placeholder="admin@vehicare.com"
                            class="w-full rounded-xl border border-[#222222] bg-[#181818] px-3.5 py-2.5 text-xs text-white placeholder-[#666666] outline-none focus:border-[#F63B05]" />
                    </div>
                </div>

                <div class="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label class="block text-[11px] font-heading font-semibold text-[#A1A1AA] mb-1.5 uppercase">Password</label>
                        <input type="password" name="password" required placeholder="••••••••••••"
                            class="w-full rounded-xl border border-[#222222] bg-[#181818] px-3.5 py-2.5 text-xs text-white placeholder-[#666666] outline-none focus:border-[#F63B05]" />
                    </div>
                    <div>
                        <label class="block text-[11px] font-heading font-semibold text-[#A1A1AA] mb-1.5 uppercase">Confirm Password</label>
                        <input type="password" name="password_confirmation" required placeholder="••••••••••••"
                            class="w-full rounded-xl border border-[#222222] bg-[#181818] px-3.5 py-2.5 text-xs text-white placeholder-[#666666] outline-none focus:border-[#F63B05]" />
                    </div>
                </div>

                <div class="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label class="block text-[11px] font-heading font-semibold text-[#A1A1AA] mb-1.5 uppercase">Initial Account Status</label>
                        <select name="is_active" class="w-full rounded-xl border border-[#222222] bg-[#181818] px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#F63B05]">
                            <option value="1">Active Account</option>
                            <option value="0">Disabled Account</option>
                        </select>
                    </div>
                </div>

                <div class="pt-3 border-t border-[#222222] flex justify-end">
                    <button type="submit" class="rounded-xl bg-[#F63B05] px-4 py-2.5 text-xs font-heading font-semibold text-white shadow hover:bg-[#D83000] transition">
                        Create Administrator Account &rarr;
                    </button>
                </div>
            </form>
        </div>
    </div>
</x-admin-layout>
