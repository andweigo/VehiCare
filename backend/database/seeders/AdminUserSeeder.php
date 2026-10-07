<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@vehicare.local'],
            [
                'name' => 'VehiCare Admin',
                'role' => User::ROLE_ADMIN,
                'subscription_plan' => User::SUBSCRIPTION_FREE,
                'vehicle_limit' => User::VEHICLE_LIMIT_FREE,
                'is_active' => true,
                'password' => Hash::make('admin123'),
            ]
        );
    }
}
