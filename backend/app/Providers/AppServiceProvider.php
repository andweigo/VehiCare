<?php

namespace App\Providers;

use App\Contracts\RepairShopProviderInterface;
use App\Services\External\OverpassClient;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(RepairShopProviderInterface::class, OverpassClient::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
