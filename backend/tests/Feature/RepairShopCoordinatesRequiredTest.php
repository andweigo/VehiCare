<?php

namespace Tests\Feature;

use App\Services\RepairShopService;
use Tests\TestCase;

class RepairShopCoordinatesRequiredTest extends TestCase
{
    public function test_nearby_search_requires_explicit_coordinates_instead_of_using_a_default_location(): void
    {
        $service = \Mockery::mock(RepairShopService::class);
        $service->shouldNotReceive('findNearby');
        $this->app->instance(RepairShopService::class, $service);

        $this->getJson('/api/repair-shops/nearby')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['latitude', 'longitude']);
    }

    public function test_zero_coordinates_are_valid_and_forwarded_without_substitution(): void
    {
        $service = \Mockery::mock(RepairShopService::class);
        $service->shouldReceive('findNearby')
            ->once()
            ->with(0.0, 0.0, 10.0, null)
            ->andReturn([]);
        $this->app->instance(RepairShopService::class, $service);

        $response = $this->getJson('/api/repair-shops/nearby?latitude=0&longitude=0');

        $this->assertSame(200, $response->status(), $response->getContent());
        $response
            ->assertJsonPath('status', 'success');
    }
}
