<x-admin-layout>
    <x-slot name="header">User Profile #{{ $user->id }}</x-slot>
    <x-slot name="description">Inspect member account, vehicles owned, subscription plan, and permissions</x-slot>

    <div class="space-y-6 max-w-4xl">
        <!-- Back Link -->
        <div>
            <a href="{{ route('admin.users.index') }}" class="inline-flex items-center gap-1.5 text-xs font-heading font-semibold text-[#A1A1AA] hover:text-white transition">
                &larr; Back to Users List
            </a>
        </div>

        <!-- Profile Overview Card -->
        <div class="rounded-xl border border-[#222222] bg-[#111111] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="flex items-center gap-4">
                <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-[#181818] border border-[#222222] text-[#F63B05] font-heading font-bold text-lg">
                    {{ strtoupper(substr($user->name, 0, 1)) }}
                </div>
                <div>
                    <h1 class="text-lg font-heading font-bold text-white">{{ $user->name }}</h1>
                    <p class="text-xs text-[#A1A1AA]">{{ $user->email }}</p>
                    <p class="text-[10px] text-[#666666] mt-0.5">Joined: {{ optional($user->created_at)->format('M d, Y') }}</p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                @if($user->subscription_plan === App\Models\User::SUBSCRIPTION_PREMIUM)
                    <span class="rounded-full bg-[#F63B05]/15 border border-[#F63B05]/30 px-3 py-1 text-xs font-heading font-bold text-[#F63B05]">PREMIUM</span>
                @else
                    <span class="rounded-full bg-[#181818] border border-[#222222] px-3 py-1 text-xs font-heading font-bold text-[#666666]">FREE</span>
                @endif

                @if($user->is_active)
                    <span class="rounded-full bg-[#32D583]/10 border border-[#32D583]/20 px-3 py-1 text-xs font-heading font-bold text-[#32D583]">Active</span>
                @else
                    <span class="rounded-full bg-rose-500/10 border border-rose-500/20 px-3 py-1 text-xs font-heading font-bold text-rose-400">Disabled</span>
                @endif
            </div>
        </div>

        <!-- User Configuration Form -->
        <div class="rounded-xl border border-[#222222] bg-[#111111] p-5 space-y-4">
            <h2 class="text-sm font-heading font-bold text-white uppercase tracking-wider">Account Configuration</h2>

            <form action="{{ route('admin.users.update', $user->id) }}" method="POST" class="space-y-4">
                @csrf

                <div class="grid gap-4 sm:grid-cols-3">
                    <div>
                        <label class="block text-[11px] font-heading font-semibold text-[#A1A1AA] mb-1.5 uppercase">Subscription Plan</label>
                        <select name="subscription_plan" class="w-full rounded-xl border border-[#222222] bg-[#181818] px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#F63B05]">
                            <option value="{{ App\Models\User::SUBSCRIPTION_FREE }}" {{ $user->subscription_plan === App\Models\User::SUBSCRIPTION_FREE ? 'selected' : '' }}>Free Plan</option>
                            <option value="{{ App\Models\User::SUBSCRIPTION_PREMIUM }}" {{ $user->subscription_plan === App\Models\User::SUBSCRIPTION_PREMIUM ? 'selected' : '' }}>Premium Plan</option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-[11px] font-heading font-semibold text-[#A1A1AA] mb-1.5 uppercase">Vehicle Slots Limit</label>
                        <input type="number" name="vehicle_limit" value="{{ old('vehicle_limit', $user->vehicle_limit) }}" min="1" required
                            class="w-full rounded-xl border border-[#222222] bg-[#181818] px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#F63B05]" />
                    </div>

                    <div>
                        <label class="block text-[11px] font-heading font-semibold text-[#A1A1AA] mb-1.5 uppercase">Account Status</label>
                        <div class="flex items-center gap-2 pt-2.5">
                            <input type="hidden" name="is_active" value="0" />
                            <label class="inline-flex items-center gap-2 cursor-pointer select-none text-xs text-white font-medium">
                                <input type="checkbox" name="is_active" value="1" {{ $user->is_active ? 'checked' : '' }} class="h-4 w-4 rounded border-[#222222] bg-[#181818] text-[#F63B05] focus:ring-[#F63B05]" />
                                Active Account Status
                            </label>
                        </div>
                    </div>
                </div>

                <div class="pt-3 border-t border-[#222222] flex justify-end">
                    <button type="submit" class="rounded-xl bg-[#F63B05] px-4 py-2.5 text-xs font-heading font-semibold text-white shadow hover:bg-[#D83000] transition">
                        Save Account Changes
                    </button>
                </div>
            </form>
        </div>

        <!-- Owned Vehicles Section -->
        <div class="rounded-xl border border-[#222222] bg-[#111111] p-5 space-y-4">
            <h2 class="text-sm font-heading font-bold text-white uppercase tracking-wider">Registered Vehicles ({{ $user->vehicles->count() }})</h2>
            
            <div class="overflow-x-auto rounded-xl border border-[#222222]">
                <table class="w-full text-left text-xs text-[#A1A1AA]">
                    <thead class="bg-[#181818] text-[10px] font-heading font-bold uppercase tracking-wider text-[#666666] border-b border-[#222222]">
                        <tr>
                            <th class="px-4 py-3">Vehicle</th>
                            <th class="px-4 py-3">Type</th>
                            <th class="px-4 py-3">Year</th>
                            <th class="px-4 py-3">Active Status</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-[#222222] bg-[#111111]">
                        @forelse($user->vehicles as $v)
                            @php
                                $typeName = $v->vehicleType?->name ?? 'Vehicle';
                                $brandName = $v->vehicleBrand?->name ?? $v->custom_brand ?? 'Unspecified';
                                $modelName = $v->vehicleModel?->name ?? $v->custom_model ?? $v->model_number ?? '';
                                $yearName = $v->vehicleYear?->year ?? $v->custom_year ?? '—';
                                $isActiveSelection = (string)$user->active_vehicle_id === (string)$v->id;
                            @endphp
                            <tr class="hover:bg-[#181818]/60 transition">
                                <td class="px-4 py-3">
                                    <div class="flex items-center gap-2.5">
                                        <x-vehicle-type-icon :type="$typeName" class="h-4 w-4 text-[#F63B05]" />
                                        <span class="font-heading font-bold text-white">{{ $brandName }} {{ $modelName }}</span>
                                    </div>
                                </td>
                                <td class="px-4 py-3 text-white font-medium">{{ $typeName }}</td>
                                <td class="px-4 py-3 text-[#A1A1AA]">{{ $yearName }}</td>
                                <td class="px-4 py-3">
                                    @if($isActiveSelection)
                                        <span class="rounded bg-[#F63B05]/15 border border-[#F63B05]/30 px-2 py-0.5 text-[9px] font-heading font-bold text-[#F63B05]">ACTIVE SELECTION</span>
                                    @else
                                        <span class="text-[#666666] text-[10px]">Standard</span>
                                    @endif
                                </td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="4" class="px-4 py-6 text-center text-xs text-[#666666]">
                                    No registered vehicles for this user account.
                                </td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        </div>

    </div>
</x-admin-layout>
