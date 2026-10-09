<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\PatientController;
use App\Http\Controllers\Api\V1\StorageController;
use App\Http\Controllers\Api\V1\AbdmWebhookController;
use App\Http\Controllers\Api\V1\AbhaController;
use App\Http\Controllers\Api\V1\HospitalController;
use App\Http\Controllers\Api\V1\HospitalSettingController;
use App\Http\Controllers\Api\V1\ReceptionController;
use App\Http\Controllers\Api\V1\DepartmentController;
use App\Http\Controllers\Api\V1\DoctorController;
use App\Http\Controllers\Api\V1\OpdController;
use App\Http\Controllers\Api\V1\VitalController;

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
    Route::post('/webhook/abdm/v1/scan-and-share', [AbdmWebhookController::class, 'handleScanAndShare']);

    // Protected Routes
    Route::middleware('auth:sanctum')->group(function () {
        
        // Super Admin (Platform) - Hospital Management
        Route::get('/hospitals', [HospitalController::class, 'index']);
        Route::post('/hospitals', [HospitalController::class, 'store']);
        Route::get('/hospitals/{hospital}', [HospitalController::class, 'show']);
        Route::put('/hospitals/{hospital}', [HospitalController::class, 'update']);
        Route::delete('/hospitals/{hospital}', [HospitalController::class, 'destroy']);

        // Hospital Admin - Hospital-level Configuration & Key-Value Settings
        Route::prefix('hospital/settings')->group(function () {
            Route::get('/', [HospitalSettingController::class, 'getSettings']);
            Route::post('/', [HospitalSettingController::class, 'saveSettings']);
            Route::get('/uhid', [HospitalSettingController::class, 'getUhidConfig']);
            Route::put('/uhid', [HospitalSettingController::class, 'updateUhidConfig']);
            Route::get('/opd-number', [HospitalSettingController::class, 'getOpdConfig']);
            Route::put('/opd-number', [HospitalSettingController::class, 'updateOpdConfig']);
            Route::get('/ipd-number', [HospitalSettingController::class, 'getIpdConfig']);
            Route::put('/ipd-number', [HospitalSettingController::class, 'updateIpdConfig']);
            Route::get('/numbering', [HospitalSettingController::class, 'getNumberingOverview']);
            Route::get('/bed-billing', [\App\Http\Controllers\Api\V1\ChargeController::class, 'getBedBillingConfig']);
            Route::put('/bed-billing', [\App\Http\Controllers\Api\V1\ChargeController::class, 'updateBedBillingConfig']);
        });

        // Hospital Admin - Dynamic Custom Patient Registration Fields
        Route::prefix('patient-fields')->group(function () {
            Route::get('/configs', [\App\Http\Controllers\Api\V1\PatientFieldConfigController::class, 'getConfigs']);
            Route::post('/configs', [\App\Http\Controllers\Api\V1\PatientFieldConfigController::class, 'createConfig']);
            Route::put('/configs/{id}', [\App\Http\Controllers\Api\V1\PatientFieldConfigController::class, 'updateConfig']);
            Route::delete('/configs/{id}', [\App\Http\Controllers\Api\V1\PatientFieldConfigController::class, 'deleteConfig']);
        });

        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/user', [AuthController::class, 'me']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::get('/profile', [AuthController::class, 'me']);
        
        // Patients (CRUD, 360 History & Official ABHA Card)
        Route::get('patients/stats', [PatientController::class, 'stats']);
        Route::get('patients/{id}/history', [PatientController::class, 'history']);
        Route::get('patients/{id}/abha-card', [PatientController::class, 'getAbhaCard']);
        Route::post('patients/{id}/abha-card', [PatientController::class, 'saveAbhaCard']);
        Route::post('patients/{id}/link-abha', [PatientController::class, 'linkAbha']);
        Route::apiResource('patients', PatientController::class);
        
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
            Route::post('/verify-user', [AbhaController::class, 'verifyUser']);
            
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
            Route::post('/quick-visit', [ReceptionController::class, 'quickVisit']);
            Route::post('/quick-revisit', [ReceptionController::class, 'quickRevisit']);
            Route::get('/revisit/check', [ReceptionController::class, 'checkRevisitEligibility']);
            Route::get('/visits', [ReceptionController::class, 'getVisits']);
            Route::get('/visits/stats', [ReceptionController::class, 'getVisitStats']);
            Route::post('/admit-ipd', [\App\Http\Controllers\Api\V1\IpdController::class, 'admit']);
        });


        // Wards & Beds Master Setup & Pricing Configuration
        Route::post('/beds/batch', [\App\Http\Controllers\Api\V1\BedController::class, 'batchStore']);
        Route::apiResource('wards', \App\Http\Controllers\Api\V1\WardController::class);
        Route::apiResource('beds', \App\Http\Controllers\Api\V1\BedController::class);

        // IPD (Inpatient Admissions, Wards, Beds & Visual Bed Matrix)
        Route::prefix('ipd')->group(function () {
            Route::get('/wards', [\App\Http\Controllers\Api\V1\IpdController::class, 'wards']);
            Route::get('/beds/available', [\App\Http\Controllers\Api\V1\IpdController::class, 'availableBeds']);
            Route::get('/bed-matrix', [\App\Http\Controllers\Api\V1\IpdController::class, 'bedMatrix']);
            Route::post('/admit', [\App\Http\Controllers\Api\V1\IpdController::class, 'admit']);
            Route::get('/admissions', [\App\Http\Controllers\Api\V1\IpdController::class, 'admissions']);
            Route::get('/admissions/{id}', [\App\Http\Controllers\Api\V1\IpdController::class, 'show']);
            Route::get('/admissions/{id}/chart', [\App\Http\Controllers\Api\V1\IpdController::class, 'chart']);
            Route::post('/admissions/{id}/transfer-bed', [\App\Http\Controllers\Api\V1\IpdController::class, 'transferBed']);
            Route::post('/admissions/{id}/discharge', [\App\Http\Controllers\Api\V1\IpdController::class, 'discharge']);

            // Doctor Inpatient Daily Rounds (SOAP Notes)
            Route::post('/admissions/{id}/rounds', [\App\Http\Controllers\Api\V1\IpdController::class, 'recordRound']);
            Route::get('/admissions/{id}/rounds', [\App\Http\Controllers\Api\V1\IpdController::class, 'getRounds']);

            // Bedside Nursing Procedures
            Route::post('/admissions/{id}/procedures', [\App\Http\Controllers\Api\V1\IpdController::class, 'recordProcedure']);
            Route::get('/admissions/{id}/procedures', [\App\Http\Controllers\Api\V1\IpdController::class, 'getProcedures']);

            // Nursing Fluid Balance (Intake / Output Register)
            Route::post('/admissions/{id}/intake-output', [\App\Http\Controllers\Api\V1\IpdController::class, 'recordIntakeOutput']);
            Route::get('/admissions/{id}/intake-output', [\App\Http\Controllers\Api\V1\IpdController::class, 'getIntakeOutput']);

            // Nursing MAR (Medication Administration Record / Drug Chart)
            Route::post('/admissions/{id}/mar', [\App\Http\Controllers\Api\V1\IpdController::class, 'recordMar']);
            Route::get('/admissions/{id}/mar', [\App\Http\Controllers\Api\V1\IpdController::class, 'getMar']);

            // Nursing Shift Handover Register
            Route::post('/admissions/{id}/shift-handover', [\App\Http\Controllers\Api\V1\IpdController::class, 'recordShiftHandover']);
            Route::get('/admissions/{id}/shift-handover', [\App\Http\Controllers\Api\V1\IpdController::class, 'getShiftHandovers']);
            Route::put('/shift-handover/{id}/acknowledge', [\App\Http\Controllers\Api\V1\IpdController::class, 'acknowledgeShiftHandover']);

            // Final Discharge Billing Settlement & Gate Pass
            Route::get('/admissions/{id}/discharge-estimate', [\App\Http\Controllers\Api\V1\InvoiceController::class, 'getEstimate']);
            Route::post('/admissions/{id}/settle-discharge', [\App\Http\Controllers\Api\V1\InvoiceController::class, 'settleAndDischarge']);
            Route::get('/admissions/{id}/gate-pass', [\App\Http\Controllers\Api\V1\InvoiceController::class, 'gatePass']);

            // Pending OPD Admission Referrals
            Route::get('/opd-referrals', [\App\Http\Controllers\Api\V1\IpdController::class, 'opdReferrals']);
        });


        // Triage / Nurse Station — Patient Vitals & Hospital Dynamic Field Configs
        Route::prefix('vitals')->group(function () {
            // Dynamic Vital Field Configurations (Hospital Admin)
            Route::get('/configs', [VitalController::class, 'getConfigs']);
            Route::post('/configs', [VitalController::class, 'createConfig']);
            Route::put('/configs/{id}', [VitalController::class, 'updateConfig']);
            Route::delete('/configs/{id}', [VitalController::class, 'deleteConfig']);

            // Patient Vitals Recording & History (Nurse / Doctor)
            Route::get('/', [VitalController::class, 'index']);
            Route::post('/', [VitalController::class, 'store']);
            Route::get('/{id}', [VitalController::class, 'show']);
            Route::put('/{id}', [VitalController::class, 'update']);
            Route::delete('/{id}', [VitalController::class, 'destroy']);
            Route::get('/patient/{patientId}', [VitalController::class, 'patientVitals']);
            Route::get('/visit/{visitId}', [VitalController::class, 'visitVitals']);
            Route::get('/ipd/{admissionId}', [VitalController::class, 'ipdAdmissionVitals']);
        });
        Route::get('/patients/{patientId}/vitals', [VitalController::class, 'patientVitals']);
        Route::get('/opd/visit/{visitId}/vitals', [VitalController::class, 'visitVitals']);
        Route::get('/ipd/admissions/{admissionId}/vitals', [VitalController::class, 'ipdAdmissionVitals']);

        // OPD / Doctor's Panel
        Route::prefix('opd')->group(function () {
            Route::get('/queue', [OpdController::class, 'todayQueue']);
            Route::post('/visit/{visitId}/call', [OpdController::class, 'callPatient']);
            Route::post('/visit/{visitId}/complete', [OpdController::class, 'completeConsultation']);
            Route::post('/visit/{visitId}/prescribe', [\App\Http\Controllers\Api\V1\PrescriptionController::class, 'prescribeVisit']);
        });

        // Fast Autocomplete Search for Medicines, WHO ICD-10 Diagnoses & Diagnostic Investigations
        Route::get('/medicines/search', [\App\Http\Controllers\Api\V1\PrescriptionController::class, 'searchMedicines']);
        Route::get('/diagnosis/search', [\App\Http\Controllers\Api\V1\PrescriptionController::class, 'searchDiagnoses']);
        Route::get('/investigations/search', [\App\Http\Controllers\Api\V1\PrescriptionController::class, 'searchInvestigations']);

        // Structured E-Prescriptions
        Route::prefix('prescriptions')->group(function () {
            Route::post('/', [\App\Http\Controllers\Api\V1\PrescriptionController::class, 'store']);
            Route::put('/{id}', [\App\Http\Controllers\Api\V1\PrescriptionController::class, 'update']);
            Route::get('/{id}', [\App\Http\Controllers\Api\V1\PrescriptionController::class, 'show']);
            Route::get('/patient/{patientId}', [\App\Http\Controllers\Api\V1\PrescriptionController::class, 'patientPrescriptions']);
            Route::get('/visit/{visitId}', [\App\Http\Controllers\Api\V1\PrescriptionController::class, 'visitPrescription']);
        });

        // Hospital Charges Master, Tariff Engine & Patient Running Ledger
        Route::prefix('billing')->group(function () {
            // OPD Quick Bill Counter
            Route::get('/opd-pending-orders', [\App\Http\Controllers\Api\V1\OpdBillingController::class, 'getPendingOrders']);
            Route::post('/opd-bill', [\App\Http\Controllers\Api\V1\OpdBillingController::class, 'createOpdBill']);

            Route::get('/charges/categories', [\App\Http\Controllers\Api\V1\ChargeController::class, 'getCategories']);
            Route::post('/charges/categories', [\App\Http\Controllers\Api\V1\ChargeController::class, 'createCategory']);
            Route::get('/charges', [\App\Http\Controllers\Api\V1\ChargeController::class, 'index']);
            Route::post('/charges', [\App\Http\Controllers\Api\V1\ChargeController::class, 'store']);
            Route::put('/charges/{id}', [\App\Http\Controllers\Api\V1\ChargeController::class, 'update']);
            Route::delete('/charges/{id}', [\App\Http\Controllers\Api\V1\ChargeController::class, 'destroy']);
            Route::post('/charges/apply-bed-charges', [\App\Http\Controllers\Api\V1\ChargeController::class, 'triggerBedCharges']);

            Route::post('/ledger/charge', [\App\Http\Controllers\Api\V1\ChargeController::class, 'postLedger']);
            Route::get('/ledger/patient/{patientId}', [\App\Http\Controllers\Api\V1\ChargeController::class, 'getPatientLedger']);
            Route::post('/ledger/{id}/cancel', [\App\Http\Controllers\Api\V1\ChargeController::class, 'cancelLedgerItem']);
        });

        // Emergency & Triage Desk (Casualty Fast-Track)
        Route::prefix('emergency')->group(function () {
            Route::post('/triage', [\App\Http\Controllers\Api\V1\EmergencyController::class, 'admit']);
            Route::get('/triages', [\App\Http\Controllers\Api\V1\EmergencyController::class, 'index']);
            Route::get('/triages/{id}', [\App\Http\Controllers\Api\V1\EmergencyController::class, 'show']);
            Route::put('/triages/{id}/link-patient', [\App\Http\Controllers\Api\V1\EmergencyController::class, 'linkPatient']);
            Route::get('/triages/{id}/mlc-slip', [\App\Http\Controllers\Api\V1\EmergencyController::class, 'mlcSlip']);
            Route::put('/triages/{id}/status', [\App\Http\Controllers\Api\V1\EmergencyController::class, 'updateStatus']);
        });

        // Final Tax Invoices
        Route::prefix('invoices')->group(function () {
            Route::get('/{id}', [\App\Http\Controllers\Api\V1\InvoiceController::class, 'show']);
            Route::get('/patient/{patientId}', [\App\Http\Controllers\Api\V1\InvoiceController::class, 'patientInvoices']);
        });
    });

});
