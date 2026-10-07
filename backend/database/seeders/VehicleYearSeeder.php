<?php

namespace Database\Seeders;

use App\Models\VehicleModel;
use App\Models\VehicleYear;
use Illuminate\Database\Seeder;

class VehicleYearSeeder extends Seeder
{
    public function run(): void
    {
        /*
        |--------------------------------------------------------------------------
        | VehiCare Initial Vehicle Years
        |--------------------------------------------------------------------------
        |
        | Initial supported range:
        | 2015 - 2026
        |
        | This is a broad starter dataset for the capstone.
        | Specific model-year availability can be refined later.
        |
        */

        $startYear = 2015;
        $endYear = 2026;

        $models = VehicleModel::all();

        $count = 0;

        foreach ($models as $model) {

            for ($year = $startYear; $year <= $endYear; $year++) {

                $vehicleYear = VehicleYear::firstOrCreate([
                    'vehicle_model_id' => $model->id,
                    'year' => $year,
                ]);

                if ($vehicleYear->wasRecentlyCreated) {
                    $count++;
                }
            }
        }

        $this->command?->info(
            "Vehicle years seeded successfully. {$count} new records created."
        );
    }
}

