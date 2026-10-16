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

                <div class="pt-3 border-t border-[#222222] flex justify-end">
                    <button type="submit" class="rounded-xl bg-[#F63B05] px-4 py-2.5 text-xs font-heading font-semibold text-white shadow hover:bg-[#D83000] transition">
                        Save Account Changes
                    </button>
                </div>
            </form>
        </div>

        <div class="rounded-xl border border-[#222222] bg-[#111111] p-5 space-y-4">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 class="text-sm font-heading font-bold text-white uppercase tracking-wider">Subscription & Vehicle Allowance</h2>
                    <p class="mt-1 text-xs text-[#A1A1AA]">
                        {{ ucfirst($user->subscription_plan) }} ·
                        {{ match($user->subscription_source ?? 'legacy') {
                            'manual' => 'Manual administrator grant',
                            'payment' => 'Payment verified',
                            'none' => 'No active subscription',
                            default => 'Existing subscription (source not recorded)',
                        } }}
                        @if($user->subscription_expires_at)
                            · Expires {{ $user->subscription_expires_at->format('M d, Y') }}
                        @endif
                    </p>
                    <p class="mt-1 text-xs {{ $isOverVehicleAllowance ? 'text-amber-400' : 'text-[#A1A1AA]' }}">
                        {{ $activeVehicleCount }} active vehicle(s); allowance {{ $vehicleAllowance }}.
                        @if($isOverVehicleAllowance)
                            Existing vehicles are retained. The account cannot add or unarchive vehicles until within its allowance.
                        @endif
                    </p>
                </div>

                @if($user->subscription_plan !== App\Models\User::SUBSCRIPTION_PREMIUM)
                    <form action="{{ route('admin.users.premium.grant', $user->id) }}" method="POST" class="w-full space-y-2 sm:max-w-sm">
                        @csrf
                        <label class="block text-[11px] font-heading font-semibold text-[#A1A1AA] uppercase">Grant Premium access</label>
                        <select name="billing_cycle" required class="w-full rounded-xl border border-[#222222] bg-[#181818] px-3 py-2 text-xs text-white">
                            <option value="monthly">One month</option>
                            <option value="yearly">One year</option>
                        </select>
                        <textarea name="reason" rows="2" required minlength="3" maxlength="2000" placeholder="Required reason for the grant" class="w-full rounded-xl border border-[#222222] bg-[#181818] p-3 text-xs text-white"></textarea>
                        <button type="submit" class="rounded-xl bg-[#F63B05] px-4 py-2 text-xs font-heading font-semibold text-white" onclick="return confirm('Grant Premium access with the selected duration?');">
                            Grant Premium
                        </button>
                    </form>
                @elseif(in_array($user->subscription_source, ['manual', 'payment'], true))
                    <form action="{{ route('admin.users.premium.revoke', $user->id) }}" method="POST" class="w-full space-y-2 sm:max-w-sm" onsubmit="return confirm('Revoke Premium access? Existing vehicles and records will be preserved. This does not issue a refund.');">
                        @csrf
                        <label class="block text-[11px] font-heading font-semibold text-[#A1A1AA] uppercase">Reason for revocation</label>
                        <textarea name="reason" rows="2" required minlength="3" maxlength="2000" placeholder="Required reason for revocation" class="w-full rounded-xl border border-[#222222] bg-[#181818] p-3 text-xs text-white"></textarea>
                        <button type="submit" class="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-heading font-semibold text-rose-300">
                            Revoke Premium Access
                        </button>
                    </form>
                @elseif($user->subscription_plan === App\Models\User::SUBSCRIPTION_PREMIUM)
                    <p class="max-w-sm text-xs text-amber-300">
                        This is a legacy Premium subscription without a recorded payment or manual-grant source. It cannot be revoked through this control and will expire on its recorded date.
                    </p>
                @endif
            </div>

            @if($user->manualPremiumGrants->isNotEmpty())
                <div class="overflow-x-auto rounded-xl border border-[#222222]">
                    <table class="w-full text-left text-xs text-[#A1A1AA]">
                        <thead class="bg-[#181818] text-[10px] font-heading font-bold uppercase tracking-wider text-[#666666]">
                            <tr>
                                <th class="px-3 py-2">Granted by</th>
                                <th class="px-3 py-2">Reason</th>
                                <th class="px-3 py-2">Period</th>
                                <th class="px-3 py-2">Status</th>
                                <th class="px-3 py-2">Revocation</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-[#222222]">
                            @foreach($user->manualPremiumGrants as $grant)
                                <tr>
                                    <td class="px-3 py-2">{{ $grant->admin?->name ?? 'Former administrator' }}</td>
                                    <td class="px-3 py-2">{{ $grant->reason }}</td>
                                    <td class="px-3 py-2">{{ $grant->granted_at?->format('M d, Y') }} – {{ $grant->expires_at?->format('M d, Y') }}</td>
                                    <td class="px-3 py-2">{{ ucfirst($grant->status) }}</td>
                                    <td class="px-3 py-2">
                                        @if($grant->status === 'revoked')
                                            {{ $grant->revokedBy?->name ?? 'Former administrator' }}: {{ $grant->revocation_reason }}
                                        @else
                                            —
                                        @endif
                                    </td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>
            @endif
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
