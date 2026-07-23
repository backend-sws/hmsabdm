<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class ServiceBindingProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        $this->app->bind(
            \App\Services\Auth\AuthServiceInterface::class,
            \App\Services\Auth\AuthService::class
        );

        $this->app->bind(
            \App\Services\Patient\PatientServiceInterface::class,
            \App\Services\Patient\PatientService::class
        );
        
        $this->app->bind(
            \App\Services\Storage\StorageServiceInterface::class,
            \App\Services\Storage\StorageService::class
        );
        
        // Future bindings (e.g. OpdServiceInterface) will go here
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        //
    }
}
