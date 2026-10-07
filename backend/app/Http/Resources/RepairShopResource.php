<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RepairShopResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $data = is_array($this->resource) ? $this->resource : $this->resource->toArray();

        return [
            'id' => $data['id'] ?? 'shop_1',
            'name' => $data['name'] ?? 'Repair Shop',
            'latitude' => (float) ($data['latitude'] ?? 0),
            'longitude' => (float) ($data['longitude'] ?? 0),
            'address' => $data['address'] ?? 'Nearby Location',
            'vehicle_category' => $data['vehicle_category'] ?? 'car',
            'type' => $data['type'] ?? ($data['vehicle_category'] ?? 'car_repair'),
            'relevance' => $data['relevance'] ?? 'high',
            'distance_meters' => (int) ($data['distance_meters'] ?? 0),
            'distance_formatted' => $data['distance_formatted'] ?? ($data['distance_km'] ? $data['distance_km'] . ' km' : '1.2 km'),
            'distance_km' => (float) ($data['distance_km'] ?? 1.2),
            'phone' => $data['phone'] ?? null,
            'website' => $data['website'] ?? null,
            'opening_hours' => $data['opening_hours'] ?? null,
            'rating' => isset($data['rating']) ? (float) $data['rating'] : null,
            'verified' => (bool) ($data['verified'] ?? false),
            'source' => $data['source'] ?? 'openstreetmap',
        ];
    }
}
