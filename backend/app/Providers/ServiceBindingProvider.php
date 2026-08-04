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

        $this->app->bind(
            \App\Services\Abdm\AbdmServiceInterface::class,
            function ($app) {
                if (config('services.abdm.mock_mode')) {
                    return new \App\Services\Abdm\MockAbdmService();
                }
                return new \App\Services\Abdm\RealAbdmService();
            }
        );

        $this->app->bind(
            \App\Services\Reception\ReceptionServiceInterface::class,
            \App\Services\Reception\ReceptionService::class
        );

        $this->app->bind(
            \App\Services\Department\DepartmentServiceInterface::class,
            \App\Services\Department\DepartmentService::class
        );

        $this->app->bind(
            \App\Services\Doctor\DoctorServiceInterface::class,
            \App\Services\Doctor\DoctorService::class
        );

        $this->app->bind(
            \App\Services\Opd\OpdServiceInterface::class,
            \App\Services\Opd\OpdService::class
        );
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        //
    }
}
