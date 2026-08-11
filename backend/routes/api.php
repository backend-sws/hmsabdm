<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\PatientController;
use App\Http\Controllers\Api\V1\StorageController;
use App\Http\Controllers\Api\V1\AbdmWebhookController;
use App\Http\Controllers\Api\V1\AbhaController;
use App\Http\Controllers\Api\V1\HospitalController;
use App\Http\Controllers\Api\V1\ReceptionController;
use App\Http\Controllers\Api\V1\DepartmentController;
use App\Http\Controllers\Api\V1\DoctorController;
use App\Http\Controllers\Api\V1\OpdController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Authentication
Route::post('/v1/login', [AuthController::class, 'login']);

// ABDM Public Webhooks
Route::post('/webhook/abdm/v1/scan-and-share', [AbdmWebhookController::class, 'handleScanAndShare']);

Route::prefix('v1')->group(function () {
    // Public Routes
    Route::post('/login', [AuthController::class, 'login'])->name('login');

    // Protected Routes
    Route::middleware('auth:sanctum')->group(function () {
        
        // Super Admin - Hospital Management
        Route::post('/hospitals', [HospitalController::class, 'store']);
        Route::get('/hospitals', [HospitalController::class, 'index']);

        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/user', [AuthController::class, 'me']);
        
        // Patients
        Route::get('/patients', [PatientController::class, 'index']);
        Route::post('/patients', [PatientController::class, 'store']);
        
        // Storage (R2 / S3 Presigned URLs)
        Route::post('/storage/upload-url', [StorageController::class, 'generateUploadUrl']);
        Route::get('/storage/view-url', [StorageController::class, 'generateViewUrl']);

        // Departments & Doctors (Admin / Core)
        Route::apiResource('departments', DepartmentController::class);
        
        Route::get('doctors/available-today', [DoctorController::class, 'availableToday']);
        Route::put('doctors/{doctor}/schedule', [DoctorController::class, 'updateSchedule']);
        Route::apiResource('doctors', DoctorController::class);

        // ABHA Endpoints
        Route::prefix('abha')->group(function () {
            Route::post('/generate-otp', [AbhaController::class, 'generateOtp']);
            Route::post('/verify-otp', [AbhaController::class, 'verifyOtp']);
            
            // Aadhaar Enrollment
            Route::post('/enrol/aadhaar-otp', [AbhaController::class, 'generateAadhaarOtp']);
            Route::post('/enrol/verify-aadhaar', [AbhaController::class, 'verifyAadhaarOtp']);
            Route::post('/enrol/mobile-otp', [AbhaController::class, 'generateMobileOtpForLinking']);
            Route::post('/enrol/verify-mobile', [AbhaController::class, 'verifyMobileOtpForLinking']);
            Route::get('/enrol/suggest-address', [AbhaController::class, 'suggestAbhaAddress']);
            Route::post('/enrol/create-address', [AbhaController::class, 'createAbhaAddress']);
            
            // Profile & Search
            Route::get('/profile', [AbhaController::class, 'getProfile']);
            Route::post('/search', [AbhaController::class, 'searchAbha']);
            Route::get('/card', [AbhaController::class, 'downloadCard']);
            Route::get('/qr-code', [AbhaController::class, 'downloadQrCode']);
        });

        // Reception Walk-in / Scan & Share Endpoints
        Route::prefix('reception')->group(function () {
            Route::get('/scan-and-share/queues', [ReceptionController::class, 'getWaitingQueues']);
            Route::post('/scan-and-share/token', [ReceptionController::class, 'getByToken']);
            Route::post('/scan-and-share/confirm', [ReceptionController::class, 'confirmQueue']);
            Route::get('/departments', [ReceptionController::class, 'getDepartments']);
            Route::post('/register', [ReceptionController::class, 'registerWithoutAbha']);
            Route::post('/visit', [ReceptionController::class, 'createVisit']);
        });

        // OPD / Doctor's Panel
        Route::prefix('opd')->group(function () {
            Route::get('/queue', [OpdController::class, 'todayQueue']);
            Route::post('/visit/{visitId}/call', [OpdController::class, 'callPatient']);
            Route::post('/visit/{visitId}/complete', [OpdController::class, 'completeConsultation']);
        });
    });
});
