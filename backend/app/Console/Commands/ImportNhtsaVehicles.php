<?php

namespace App\Console\Commands;

use App\Models\VehicleBrand;
use App\Models\VehicleModel;
use App\Models\VehicleType;
use App\Services\NhtsaService;
use Illuminate\Console\Command;

class ImportNhtsaVehicles extends Command
{
    protected $signature = 'nhtsa:import';

    protected $description = 'Import vehicle makes and models from NHTSA';

    public function __construct(
        private NhtsaService $nhtsaService
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $this->info('Starting NHTSA vehicle import...');

        /*
         * We currently import CAR data only.
         *
         * Motorcycle data will remain based on
         * our Philippine-focused database.
         */
        $vehicleType = VehicleType::where('name', 'Car')->first();

        if (!$vehicleType) {
            $this->error('Vehicle type "Car" was not found.');

            return self::FAILURE;
        }

        try {
            $makes = $this->nhtsaService->getMakes('car');

            $brandCount = 0;
            $modelCount = 0;

            foreach ($makes as $make) {
                $makeName = trim($make['Make_Name'] ?? '');

                if ($makeName === '') {
                    continue;
                }

                /*
                 * Find existing brand first.
                 * If it doesn't exist, create it.
                 */
                $brand = VehicleBrand::firstOrCreate(
                    [
                        'vehicle_type_id' => $vehicleType->id,
                        'name' => $makeName,
                    ]
                );

                if ($brand->wasRecentlyCreated) {
                    $brandCount++;
                }

                $this->line("Processing: {$makeName}");

                /*
                 * Get models for this make.
                 */
                try {
                    $models = $this->nhtsaService
                        ->getModelsForMake($makeName);
                } catch (\Exception $e) {
                    $this->warn(
                        "Could not retrieve models for {$makeName}."
                    );

                    continue;
                }

                foreach ($models as $modelData) {
                    $modelName = trim(
                        $modelData['Model_Name'] ?? ''
                    );

                    if ($modelName === '') {
                        continue;
                    }

                    $model = VehicleModel::firstOrCreate(
                        [
                            'vehicle_brand_id' => $brand->id,
                            'name' => $modelName,
                        ]
                    );

                    if ($model->wasRecentlyCreated) {
                        $modelCount++;
                    }
                }
            }

            $this->newLine();

            $this->info('NHTSA import completed successfully.');

            $this->table(
                ['Type', 'Count'],
                [
                    ['New brands', $brandCount],
                    ['New models', $modelCount],
                ]
            );

            return self::SUCCESS;

        } catch (\Exception $e) {

            $this->error(
                'NHTSA import failed: ' . $e->getMessage()
            );

            return self::FAILURE;
        }
    }
}