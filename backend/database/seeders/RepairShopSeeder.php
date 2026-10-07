<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\RepairShop;

class RepairShopSeeder extends Seeder
{
    public function run(): void
    {
        $shops = [
            // Automotive / Car Repair Shops
            [
                'name' => 'SpeedyAuto Service Center',
                'type' => 'car',
                'vehicle_category' => 'car',
                'address' => '124 EDSA Ave, Quezon City, Metro Manila',
                'latitude' => 14.6507,
                'longitude' => 121.0315,
                'contact_number' => '+63 917 123 4567',
                'phone_number' => '+63 917 123 4567',
                'operating_hours' => '8:00 AM - 6:00 PM',
                'source' => 'admin',
                'rating' => 4.8,
                'is_certified' => true,
                'is_active' => true,
            ],
            [
                'name' => 'Metro Motors Brake & Engine Specialist',
                'type' => 'car',
                'vehicle_category' => 'car',
                'address' => '45 Commonwealth Ave, Quezon City',
                'latitude' => 14.6650,
                'longitude' => 121.0700,
                'contact_number' => '+63 920 987 6543',
                'phone_number' => '+63 920 987 6543',
                'operating_hours' => '7:30 AM - 5:30 PM',
                'source' => 'admin',
                'rating' => 4.7,
                'is_certified' => true,
                'is_active' => true,
            ],
            [
                'name' => 'Precision Auto Care & Tune-Up',
                'type' => 'car',
                'vehicle_category' => 'car',
                'address' => '88 Shaw Blvd, Mandaluyong, Metro Manila',
                'latitude' => 14.5880,
                'longitude' => 121.0540,
                'contact_number' => '+63 918 555 1212',
                'phone_number' => '+63 918 555 1212',
                'operating_hours' => '8:00 AM - 6:00 PM',
                'source' => 'admin',
                'rating' => 4.9,
                'is_certified' => true,
                'is_active' => true,
            ],

            // Motorcycle Repair Shops
            [
                'name' => 'MotoFix Pro Performance Workshop',
                'type' => 'motorcycle',
                'vehicle_category' => 'motorcycle',
                'address' => '210 Aurora Blvd, Cubao, Quezon City',
                'latitude' => 14.6200,
                'longitude' => 121.0550,
                'contact_number' => '+63 999 444 3322',
                'phone_number' => '+63 999 444 3322',
                'operating_hours' => '8:30 AM - 7:00 PM',
                'source' => 'admin',
                'rating' => 4.9,
                'is_certified' => true,
                'is_active' => true,
            ],
            [
                'name' => 'HighTorque Scooter & Bike Clinic',
                'type' => 'motorcycle',
                'vehicle_category' => 'motorcycle',
                'address' => '15 Taft Avenue, Malate, Manila',
                'latitude' => 14.5700,
                'longitude' => 120.9900,
                'contact_number' => '+63 917 888 7766',
                'phone_number' => '+63 917 888 7766',
                'operating_hours' => '8:00 AM - 6:00 PM',
                'source' => 'admin',
                'rating' => 4.6,
                'is_certified' => true,
                'is_active' => true,
            ],

            // Bicycle Repair Shops
            [
                'name' => 'Velocity Cycle Works & Tuning',
                'type' => 'bicycle',
                'vehicle_category' => 'bicycle',
                'address' => '78 Katipunan Ave, Loyola Heights, Quezon City',
                'latitude' => 14.6400,
                'longitude' => 121.0750,
                'contact_number' => '+63 915 222 1100',
                'phone_number' => '+63 915 222 1100',
                'operating_hours' => '9:00 AM - 6:00 PM',
                'source' => 'admin',
                'rating' => 4.9,
                'is_certified' => true,
                'is_active' => true,
            ],
            [
                'name' => 'PedalCraft Bike Doctor',
                'type' => 'bicycle',
                'vehicle_category' => 'bicycle',
                'address' => '32 BGC High Street, Taguig, Metro Manila',
                'latitude' => 14.5515,
                'longitude' => 121.0505,
                'contact_number' => '+63 917 333 9988',
                'phone_number' => '+63 917 333 9988',
                'operating_hours' => '10:00 AM - 7:00 PM',
                'source' => 'admin',
                'rating' => 4.8,
                'is_certified' => true,
                'is_active' => true,
            ],

            // Mindoro Demonstration Locations
            [
                'name' => 'Mindoro AutoCare Specialist',
                'type' => 'car',
                'vehicle_category' => 'car',
                'address' => 'Strong Republic Nautical Highway, Socorro, Oriental Mindoro',
                'latitude' => 13.0642,
                'longitude' => 121.4089,
                'contact_number' => '+63 917 888 1234',
                'phone_number' => '+63 917 888 1234',
                'operating_hours' => '8:00 AM - 6:00 PM',
                'source' => 'admin',
                'rating' => 4.8,
                'is_certified' => true,
                'is_active' => true,
            ],
            [
                'name' => 'Calapan SpeedAuto Service Center',
                'type' => 'car',
                'vehicle_category' => 'car',
                'address' => 'JP Rizal St, Calapan City, Oriental Mindoro',
                'latitude' => 13.4117,
                'longitude' => 121.1803,
                'contact_number' => '+63 920 777 5678',
                'phone_number' => '+63 920 777 5678',
                'operating_hours' => '8:00 AM - 5:00 PM',
                'source' => 'admin',
                'rating' => 4.9,
                'is_certified' => true,
                'is_active' => true,
            ],
            [
                'name' => 'Socorro MotoParts & Vulcanizing Shop',
                'type' => 'motorcycle',
                'vehicle_category' => 'motorcycle',
                'address' => 'Poblacion Zone 2, Socorro, Oriental Mindoro',
                'latitude' => 13.0610,
                'longitude' => 121.4050,
                'contact_number' => '+63 918 333 4455',
                'phone_number' => '+63 918 333 4455',
                'operating_hours' => '7:00 AM - 6:00 PM',
                'source' => 'admin',
                'rating' => 4.7,
                'is_certified' => true,
                'is_active' => true,
            ],

            // Inactive Shop for Testing Deactivation Filtering
            [
                'name' => 'Legacy Garage (Inactive)',
                'type' => 'car',
                'vehicle_category' => 'car',
                'address' => '12 Old Railroad St, Socorro, Oriental Mindoro',
                'latitude' => 13.0680,
                'longitude' => 121.4120,
                'contact_number' => '+63 900 000 0000',
                'phone_number' => '+63 900 000 0000',
                'operating_hours' => 'Closed',
                'source' => 'admin',
                'rating' => 3.5,
                'is_certified' => false,
                'is_active' => false,
            ],
        ];

        foreach ($shops as $shop) {
            RepairShop::updateOrCreate(['name' => $shop['name']], $shop);
        }
    }
}
