<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            AdminUserSeeder::class,
            VehicleSeeder::class,
            VehicleYearSeeder::class,
            RepairShopSeeder::class,
        ]);
    }
}
