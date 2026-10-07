<?php

namespace App\Contracts;

interface RepairShopProviderInterface
{
    /**
     * Find nearby repair shops from external GIS/provider.
     *
     * @param float $latitude
     * @param float $longitude
     * @param int $radius Distance in meters
     * @param string|null $vehicleType
     * @return array Array of raw shop data structures
     */
    public function findNearby(float $latitude, float $longitude, int $radius = 5000, ?string $vehicleType = null): array;
}
