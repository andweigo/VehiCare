<?php

namespace Database\Seeders;

use App\Models\VehicleBrand;
use App\Models\VehicleModel;
use App\Models\VehicleType;
use Illuminate\Database\Seeder;

class VehicleSeeder extends Seeder
{
    public function run(): void
    {
        /*
        |--------------------------------------------------------------------------
        | VEHICLE DATA
        |--------------------------------------------------------------------------
        |
        | Philippine-focused starter dataset.
        |
        | NHTSA is treated as a supplementary source.
        | These entries are maintained by VehiCare so the
        | mobile application does not depend on NHTSA.
        |
        */

        $data = [

            /*
            |--------------------------------------------------------------------------
            | CARS
            |--------------------------------------------------------------------------
            */

            'Car' => [

                'Toyota' => [
                    'Wigo',
                    'Vios',
                    'ATIV',
                    'Camry',
                    'Corolla Altis',
                    'Corolla Cross',
                    'Raize',
                    'Rush',
                    'Veloz',
                    'Avanza',
                    'Innova',
                    'Zenix',
                    'Fortuner',
                    'Hilux',
                    'Hiace',
                    'Land Cruiser',
                    'Land Cruiser Prado',
                    'RAV4',
                    'Yaris Cross',
                    'GR 86',
                    'GR Supra',
                    'GR Yaris',
                ],

                'Honda' => [
                    'Brio',
                    'City',
                    'Civic',
                    'CR-V',
                    'HR-V',
                    'BR-V',
                    'Odyssey',
                ],

                'Mitsubishi' => [
                    'Mirage',
                    'Mirage G4',
                    'Xpander',
                    'Xpander Cross',
                    'Montero Sport',
                    'Triton',
                    'Lancer',
                    'ASX',
                    'Outlander',
                ],

                'Nissan' => [
                    'Almera',
                    'Navara',
                    'Terra',
                    'Kicks',
                    'Patrol',
                    'Urvan',
                    'Leaf',
                ],

                'Suzuki' => [
                    'Celerio',
                    'Dzire',
                    'Swift',
                    'S-Presso',
                    'Ertiga',
                    'XL7',
                    'Jimny',
                    'Vitara',
                ],

                'Isuzu' => [
                    'D-Max',
                    'mu-X',
                    'Traviz',
                    'Crosswind',
                ],

                'Ford' => [
                    'Ranger',
                    'Everest',
                    'Territory',
                    'Mustang',
                    'Explorer',
                    'Expedition',
                ],

                'Hyundai' => [
                    'Accent',
                    'Elantra',
                    'Tucson',
                    'Santa Fe',
                    'Stargazer',
                    'Creta',
                    'Kona',
                    'Ioniq 5',
                    'Ioniq 6',
                ],

                'Kia' => [
                    'Picanto',
                    'Soluto',
                    'Seltos',
                    'Sportage',
                    'Sorento',
                    'Carnival',
                ],

                'Mazda' => [
                    'Mazda2',
                    'Mazda3',
                    'CX-3',
                    'CX-5',
                    'CX-8',
                    'CX-9',
                    'BT-50',
                ],

                'MG' => [
                    '3',
                    '5',
                    'GT',
                    'ZS',
                    'HS',
                    'RX5',
                    'RX8',
                    'G50',
                    'Marvel R',
                ],

                'Geely' => [
                    'Coolray',
                    'Emgrand',
                    'Azkarra',
                    'Okavango',
                    'Starray',
                ],

                'Chevrolet' => [
                    'Spark',
                    'Sail',
                    'Trax',
                    'Trailblazer',
                    'Captiva',
                    'Colorado',
                    'Suburban',
                ],

                'Subaru' => [
                    'Impreza',
                    'WRX',
                    'BRZ',
                    'Forester',
                    'XV',
                    'Outback',
                ],

                'Changan' => [
                    'Alsvin',
                    'CS35 Plus',
                    'CS75 Plus',
                    'CS95',
                    'Hunter',
                ],

                'GAC' => [
                    'Empow',
                    'GS3',
                    'GS4',
                    'GS8',
                    'M8',
                ],

                'BYD' => [
                    'Dolphin',
                    'Atto 3',
                    'Seal',
                    'Han',
                    'Tang',
                ],
            ],

            /*
            |--------------------------------------------------------------------------
            | MOTORCYCLES
            |--------------------------------------------------------------------------
            */

            'Motorcycle' => [

                'Honda' => [
                    'Click 125i',
                    'Click 160',
                    'PCX 160',
                    'ADV 160',
                    'TMX 125 Alpha',
                    'TMX Supremo',
                    'CB150R',
                    'CBR150R',
                    'CRF300L',
                    'Rebel 500',
                    'ADV 350',
                ],

                'Yamaha' => [
                    'Sniper 150',
                    'Sniper 155',
                    'NMAX',
                    'NMAX Tech MAX',
                    'Aerox',
                    'Mio Sporty',
                    'Mio i125',
                    'Mio Gear',
                    'Mio Gear S',
                    'Mio Gravis',
                    'Mio Fazzio',
                    'PG-1',
                    'MT-15',
                    'XMAX',
                    'WR155R',
                    'YZF-R15',
                ],

                'Suzuki' => [
                    'Raider R150',
                    'Raider J Crossover',
                    'Skydrive Sport',
                    'Burgman Street',
                    'Burgman 15',
                    'Avenis',
                    'Gixxer 155',
                    'Gixxer SF 155',
                    'Gixxer 250',
                    'DR160',
                    'V-Strom 160',
                    'V-Strom 250 SX',
                ],

                'Kawasaki' => [
                    'Ninja 400',
                    'Ninja 500',
                    'Z400',
                    'Z500',
                    'Barako II',
                    'Rouser NS200',
                    'Rouser NS160',
                    'W175',
                    'KLX 150',
                    'KLX 230',
                ],

                'KTM' => [
                    'Duke 200',
                    'Duke 390',
                    'RC 200',
                    'RC 390',
                    '390 Adventure',
                ],

                'Royal Enfield' => [
                    'Classic 350',
                    'Hunter 350',
                    'Meteor 350',
                    'Bullet 350',
                    'Himalayan 450',
                    'Interceptor 650',
                    'Continental GT 650',
                ],

                'Vespa' => [
                    'S 125',
                    'Primavera 150',
                    'Sprint 150',
                    'GTS 300',
                    'GTV 300',
                ],

                'CFMoto' => [
                    '300NK',
                    '300SR',
                    '450NK',
                    '450SR',
                    '650MT',
                    '800MT',
                ],
            ],

            /*
            |--------------------------------------------------------------------------
            | BICYCLES
            |--------------------------------------------------------------------------
            */

            'Bicycle' => [

                'Trek' => [
                    'Marlin 5',
                    'Marlin 7',
                    'X-Caliber 8',
                    'Domane AL 2',
                    'Emonda ALR',
                    'FX 1',
                    'FX 2',
                    'Roscoe 7',
                ],

                'Giant' => [
                    'Talon',
                    'Talon 1',
                    'Escape 3',
                    'Escape 2',
                    'Contend',
                    'Contend AR',
                    'Defy',
                    'Trance',
                ],

                'Specialized' => [
                    'Rockhopper',
                    'Rockhopper Sport',
                    'Sirrus',
                    'Sirrus X',
                    'Allez',
                    'Tarmac',
                    'Stumpjumper',
                ],

                'Cannondale' => [
                    'Trail',
                    'Quick',
                    'Topstone',
                    'Synapse',
                    'CAAD Optimo',
                ],

                'Merida' => [
                    'Big Nine',
                    'Big Seven',
                    'Scultura',
                    'Reacto',
                    'Silex',
                ],

                'Scott' => [
                    'Aspect',
                    'Scale',
                    'Speedster',
                    'Addict',
                    'Spark',
                ],
            ],
        ];

        /*
        |--------------------------------------------------------------------------
        | INSERT DATA
        |--------------------------------------------------------------------------
        */

        foreach ($data as $typeName => $brands) {

            $vehicleType = VehicleType::firstOrCreate([
                'name' => $typeName,
            ]);

            foreach ($brands as $brandName => $models) {

                $brand = VehicleBrand::firstOrCreate([
                    'vehicle_type_id' => $vehicleType->id,
                    'name' => $brandName,
                ]);

                foreach ($models as $modelName) {

                    VehicleModel::firstOrCreate([
                        'vehicle_brand_id' => $brand->id,
                        'name' => $modelName,
                    ]);
                }
            }
        }

        $this->command?->info(
            'Philippine-focused vehicle data seeded successfully.'
        );
    }
}