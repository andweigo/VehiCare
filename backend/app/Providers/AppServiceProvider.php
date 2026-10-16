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
        $this->app->singleton(\App\Services\FirebaseService::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if ($this->app->environment('production') || str_starts_with((string) config('app.url'), 'https://')) {
            \Illuminate\Support\Facades\URL::forceScheme('https');
        }
    }
}
