<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

use App\Services\Storage\StorageServiceInterface;
use App\Services\Storage\StorageService;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Bindings moved to ServiceBindingProvider
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
