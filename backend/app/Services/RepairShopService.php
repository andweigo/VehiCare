<?php

namespace App\Services;

use App\Models\RepairShop;
use Illuminate\Support\Facades\Log;

class RepairShopService
{
    /**
     * Find nearby active repair shops from the administrator-managed directory.
     * Computes Haversine geographic distance in meters and kilometers.
     *
     * @param float $latitude User latitude
     * @param float $longitude User longitude
     * @param float|int $radius Radius in km or meters (if > 100, treated as meters)
     * @param string|null $vehicleType
     * @return array
     */
    public function findNearby(float $latitude, float $longitude, float|int $radius = 10, ?string $vehicleType = null): array
    {
        // Normalize radius: if passed in meters (e.g. 5000), convert to kilometers
        $radiusKm = $radius > 100 ? ($radius / 1000) : (float) $radius;
        if ($radiusKm <= 0) {
            $radiusKm = 10.0;
        }

        $category = $this->normalizeCategory($vehicleType);

        Log::info('[RepairShopService] Processing nearby shop request', [
            'latitude' => $latitude,
            'longitude' => $longitude,
            'radius_km' => $radiusKm,
            'vehicle_type' => $vehicleType,
            'category' => $category,
        ]);

        // Query only active administrator-managed repair shops
        $shops = RepairShop::query()
            ->where('is_active', true)
            ->get()
            ->filter(function ($shop) use ($category) {
                if (empty($category) || $category === 'all') {
                    return true;
                }
                $shopCategories = array_filter(
                    [$shop->vehicle_category, $shop->type],
                    fn ($shopCategory) => trim((string) $shopCategory) !== ''
                );

                if (empty($shopCategories)) {
                    return true;
                }

                foreach ($shopCategories as $shopCategory) {
                    $normalizedShopCategory = $this->normalizeCategory((string) $shopCategory);
                    if ($normalizedShopCategory === 'all' || $normalizedShopCategory === $category) {
                        return true;
                    }
                }

                return false;
            })
            ->map(function ($shop) use ($latitude, $longitude) {
                $shopLat = (float) $shop->latitude;
                $shopLng = (float) $shop->longitude;

                $distanceMeters = $this->calculateHaversineDistance($latitude, $longitude, $shopLat, $shopLng);
                $distanceKm = round($distanceMeters / 1000, 2);
                $distanceFormatted = $distanceKm < 1 ? round($distanceMeters) . ' m' : $distanceKm . ' km';

                return [
                    'id' => $shop->id,
                    'name' => $shop->name,
                    'type' => $shop->type ?? $shop->vehicle_category ?? 'car',
                    'vehicle_category' => $shop->vehicle_category ?? $shop->type ?? 'car',
                    'address' => $shop->address,
                    'latitude' => $shopLat,
                    'longitude' => $shopLng,
                    'contact_number' => $shop->contact_number ?? $shop->phone_number,
                    'phone_number' => $shop->phone_number ?? $shop->contact_number,
                    'phone' => $shop->phone_number ?? $shop->contact_number,
                    'operating_hours' => $shop->operating_hours,
                    'opening_hours' => $shop->operating_hours,
                    'source' => $shop->source ?? 'admin',
                    'is_active' => (bool) $shop->is_active,
                    'rating' => (float) ($shop->rating ?? 4.8),
                    'verified' => (bool) ($shop->is_certified ?? true),
                    'is_certified' => (bool) ($shop->is_certified ?? true),
                    'distance' => $distanceKm,
                    'distance_km' => $distanceKm,
                    'distance_meters' => round($distanceMeters),
                    'distance_formatted' => $distanceFormatted,
                    'relevance' => 'high',
                ];
            })
            ->filter(function ($shop) use ($radiusKm) {
                return $shop['distance_km'] <= $radiusKm;
            })
            ->values()
            ->toArray();

        // Sort by distance ascending (nearest to farthest)
        usort($shops, function ($a, $b) {
            return $a['distance_meters'] <=> $b['distance_meters'];
        });

        Log::info('[RepairShopService] Nearby search results ready', ['count' => count($shops)]);

        return $shops;
    }

    /**
     * Normalize vehicle category string.
     */
    protected function normalizeCategory(?string $vehicleType): string
    {
        $type = strtolower(trim((string) $vehicleType));

        if ($type === '') {
            return 'car';
        }

        if (in_array($type, ['all', 'any', 'general', 'all vehicle types', 'all_vehicles', 'all_vehicle_types'], true)) {
            return 'all';
        }

        if (str_contains($type, 'moto') || str_contains($type, 'scooter')) {
            return 'motorcycle';
        }

        if (str_contains($type, 'bike') || str_contains($type, 'bicycle')) {
            return 'bicycle';
        }

        return 'car';
    }

    /**
     * Compute Haversine distance between two lat/lng points in meters.
     */
    public function calculateHaversineDistance(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earthRadius = 6371000; // Earth radius in meters

        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) * sin($dLat / 2) +
            cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
            sin($dLon / 2) * sin($dLon / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }
}
