<?php

namespace App\Services\External;

use App\Contracts\RepairShopProviderInterface;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OverpassClient implements RepairShopProviderInterface
{
    /**
     * Overpass API Endpoint mirrors.
     */
    protected array $endpoints = [
        'https://overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter',
    ];

    /**
     * Find nearby repair shops from OpenStreetMap via Overpass API.
     *
     * @param float $latitude
     * @param float $longitude
     * @param int $radius Distance in meters
     * @param string|null $vehicleType
     * @return array
     */
    public function findNearby(float $latitude, float $longitude, int $radius = 5000, ?string $vehicleType = null): array
    {
        @set_time_limit(60);
        $normalizedCategory = $this->normalizeCategory($vehicleType);

        try {
            // Try primary search radius
            $shops = $this->queryOverpass($latitude, $longitude, $radius, $normalizedCategory);
            if (!empty($shops)) {
                return $shops;
            }

            // Expanded fallback (20km)
            if ($radius < 20000) {
                $shops = $this->queryOverpass($latitude, $longitude, 20000, $normalizedCategory);
                if (!empty($shops)) {
                    return $shops;
                }
            }

            // Wider provincial fallback (40km)
            if ($radius < 40000) {
                $shops = $this->queryOverpass($latitude, $longitude, 40000, $normalizedCategory);
                if (!empty($shops)) {
                    return $shops;
                }
            }
        } catch (\Throwable $e) {
            Log::warning('Overpass GIS lookup error: ' . $e->getMessage());
        }

        return [];
    }

    /**
     * Execute Overpass query across endpoints.
     */
    protected function queryOverpass(float $latitude, float $longitude, int $radius, string $category): array
    {
        $qlQuery = $this->buildQuery($latitude, $longitude, $radius, $category);

        foreach ($this->endpoints as $endpoint) {
            try {
                $response = Http::asForm()
                    ->connectTimeout(2)
                    ->timeout(3)
                    ->post($endpoint, [
                        'data' => $qlQuery,
                    ]);

                if ($response->successful()) {
                    $json = $response->json();
                    $elements = $json['elements'] ?? [];
                    if (!empty($elements)) {
                        return $this->parseElements($elements, $category);
                    }
                }
            } catch (\Throwable $e) {
                Log::warning('Overpass API mirror failed (' . $endpoint . '): ' . $e->getMessage());
            }
        }

        return [];
    }

    /**
     * Normalize vehicle type to shop category.
     */
    protected function normalizeCategory(?string $vehicleType): string
    {
        $type = strtolower((string) $vehicleType);

        if (str_contains($type, 'moto') || str_contains($type, 'scooter')) {
            return 'motorcycle';
        }

        if (str_contains($type, 'bike') || str_contains($type, 'bicycle')) {
            return 'bicycle';
        }

        return 'car';
    }

    /**
     * Build Overpass QL query string based on coordinates and radius for broad candidate collection.
     */
    protected function buildQuery(float $lat, float $lng, int $radius, string $category): string
    {
        $around = "around:{$radius},{$lat},{$lng}";

        $tagConditions = [
            '["shop"="car_repair"]',
            '["shop"="auto_repair"]',
            '["amenity"="car_repair"]',
            '["shop"="car_service"]',
            '["shop"="car"]',
            '["shop"="motorcycle"]',
            '["shop"="motorcycle_repair"]',
            '["shop"="bicycle"]',
            '["shop"="bicycle_repair"]',
            '["shop"="tyres"]',
            '["shop"="parts"]',
            '["craft"="car_repair"]',
            '["craft"="vehicle_repair"]',
            '["amenity"="fuel"]',
        ];

        $lines = [];
        foreach ($tagConditions as $cond) {
            $lines[] = "node{$cond}({$around});";
            $lines[] = "way{$cond}({$around});";
        }

        $queryBlock = implode("\n  ", $lines);

        return "[out:json][timeout:15];
(
  {$queryBlock}
);
out center tags 50;";
    }

    /**
     * Parse elements returned by Overpass API into normalized shop array.
     */
    protected function parseElements(array $elements, string $category): array
    {
        $shops = [];

        foreach ($elements as $element) {
            $tags = $element['tags'] ?? [];
            
            // Extract coordinates
            $lat = null;
            $lng = null;

            if (isset($element['lat']) && isset($element['lon'])) {
                $lat = (float) $element['lat'];
                $lng = (float) $element['lon'];
            } elseif (isset($element['center']['lat']) && isset($element['center']['lon'])) {
                $lat = (float) $element['center']['lat'];
                $lng = (float) $element['center']['lon'];
            }

            if (!$lat || !$lng) {
                continue;
            }

            // Derive shop name
            $name = $tags['name'] ?? $tags['brand'] ?? $tags['operator'] ?? null;
            if (!$name) {
                $shopType = $tags['shop'] ?? $tags['amenity'] ?? $category;
                $name = ucwords(str_replace('_', ' ', $shopType)) . ' Service Center';
            }

            // Derive address
            $street = $tags['addr:street'] ?? null;
            $housenumber = $tags['addr:housenumber'] ?? null;
            $city = $tags['addr:city'] ?? $tags['addr:suburb'] ?? null;

            $addressParts = array_filter([$housenumber, $street, $city]);
            $address = !empty($addressParts) ? implode(', ', $addressParts) : ($tags['addr:full'] ?? 'OpenStreetMap Area');

            $shops[] = [
                'osm_id' => $element['id'] ?? null,
                'name' => $name,
                'latitude' => $lat,
                'longitude' => $lng,
                'address' => $address,
                'vehicle_category' => $category,
                'phone' => $tags['phone'] ?? $tags['contact:phone'] ?? null,
                'website' => $tags['website'] ?? $tags['contact:website'] ?? null,
                'opening_hours' => $tags['opening_hours'] ?? null,
                'source' => 'openstreetmap',
            ];
        }

        return $shops;
    }
}
