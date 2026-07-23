<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\PatientController;
use App\Http\Controllers\Api\V1\StorageController;

Route::prefix('v1')->group(function () {
    // Public Routes
    Route::post('/login', [AuthController::class, 'login'])->name('login');

    // Protected Routes
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/user', [AuthController::class, 'me']);
        
        // Patients
        Route::get('/patients', [PatientController::class, 'index']);
        Route::post('/patients', [PatientController::class, 'store']);
        
        // Storage (R2 / S3 Presigned URLs)
        Route::post('/storage/upload-url', [StorageController::class, 'generateUploadUrl']);
        Route::get('/storage/view-url', [StorageController::class, 'generateViewUrl']);
    });
});
