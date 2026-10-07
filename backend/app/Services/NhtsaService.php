<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class NhtsaService
{
    private string $baseUrl = 'https://vpic.nhtsa.dot.gov/api/vehicles';

    public function getMakes(string $vehicleType = 'car'): array
    {
        $response = Http::timeout(15)->get(
            "{$this->baseUrl}/GetMakesForVehicleType/{$vehicleType}?format=json"
        );

        if ($response->failed()) {
            throw new \Exception('Unable to connect to NHTSA API.');
        }

        return $response->json('Results', []);
    }

    public function getModelsForMake(string $make): array
    {
        $response = Http::timeout(15)->get(
            "{$this->baseUrl}/GetModelsForMake/{$make}?format=json"
        );

        if ($response->failed()) {
            throw new \Exception('Unable to retrieve NHTSA models.');
        }

        return $response->json('Results', []);
    }

    public function decodeVin(string $vin): array
    {
        $response = Http::timeout(15)->get(
            "{$this->baseUrl}/DecodeVin/{$vin}?format=json"
        );

        if ($response->failed()) {
            throw new \Exception('Unable to decode VIN.');
        }

        return $response->json('Results', []);
    }
}