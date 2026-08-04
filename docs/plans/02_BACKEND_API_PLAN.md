# Plan 02 — Backend API (Complete Laravel Architecture)

> सभी Controllers, Services, Routes, Requests का detailed plan।
> Doctor management + Department management + Reception workflow सब कुछ।

---

## Architecture Overview

```
HTTP Request
    │
    ▼
Route (routes/api.php)
    │
    ▼
Middleware (auth:sanctum + TenantContext)
    │
    ▼
Controller (thin — sirf request/response)
    │
    ▼
FormRequest (validation)
    │
    ▼
Service (business logic)
    │
    ▼
Model / DB (data)
    │
    ▼
API Resource (response format)
```

---

## Module 1: Auth (पहले से बना है)

**Controller:** `Api/V1/AuthController` ✅  
**Service:** `AuthService` ✅  

| Method | Route | Description |
|---|---|---|
| POST | `/api/v1/login` | Login (email + password) |
| POST | `/api/v1/logout` | Logout (sanctum token delete) |
| GET | `/api/v1/user` | Current user profile |

---

## Module 2: Department Management (NEW — Admin ke liye)

**Controller:** `Api/V1/DepartmentController` [NEW]  
**Service:** `DepartmentService` [NEW]  
**Resource:** `DepartmentResource` [NEW]  

### Routes:
```php
Route::prefix('departments')->middleware('auth:sanctum')->group(function () {
    Route::get('/',       [DepartmentController::class, 'index']);   // List all
    Route::post('/',      [DepartmentController::class, 'store']);   // Create
    Route::get('/{id}',   [DepartmentController::class, 'show']);    // Detail
    Route::put('/{id}',   [DepartmentController::class, 'update']);  // Update
    Route::delete('/{id}',[DepartmentController::class, 'destroy']); // Delete
    // Nested — ek dept ke doctors:
    Route::get('/{id}/doctors', [DepartmentController::class, 'doctors']); 
});
```

### Response Format (DepartmentResource):
```json
{
  "id": 1,
  "name": "Cardiology",
  "code": "CARD",
  "description": "Heart related treatments",
  "is_active": true,
  "doctors_count": 3,
  "doctors": [
    { "id": 1, "name": "Dr. Amit Sharma", "is_available_today": true }
  ]
}
```

### Service Methods:
```php
interface DepartmentServiceInterface {
    public function list(int $hospitalId): Collection;
    public function create(array $data, int $hospitalId): Department;
    public function update(int $id, array $data): Department;
    public function delete(int $id): void;
    public function getDoctors(int $deptId, bool $availableTodayOnly = false): Collection;
}
```

---

## Module 3: Doctor Management (NEW — Admin ke liye)

**Controller:** `Api/V1/DoctorController` [NEW]  
**Service:** `DoctorService` [NEW]  
**Resource:** `DoctorResource` [NEW]  

### Routes:
```php
Route::prefix('doctors')->middleware('auth:sanctum')->group(function () {
    Route::get('/',                   [DoctorController::class, 'index']);
    Route::post('/',                  [DoctorController::class, 'store']);
    Route::get('/{id}',               [DoctorController::class, 'show']);
    Route::put('/{id}',               [DoctorController::class, 'update']);
    Route::delete('/{id}',            [DoctorController::class, 'destroy']);
    // Schedule management:
    Route::get('/{id}/schedule',      [DoctorController::class, 'getSchedule']);
    Route::put('/{id}/schedule',      [DoctorController::class, 'updateSchedule']);
    // Today availability:
    Route::get('/available-today',    [DoctorController::class, 'availableToday']);
});
```

### DoctorController::store() Request body:
```json
{
  "name": "Dr. Amit Sharma",
  "department_id": 1,
  "specialization": "Cardiologist",
  "qualification": "MBBS, MD Cardiology",
  "phone": "9876543210",
  "email": "dr.amit@hospital.com",
  "hpr_id": "HPR-12345",
  "opd_fee": 500.00,
  "consultation_time": 15,
  "schedule": [
    { "day_of_week": 1, "start_time": "09:00", "end_time": "13:00", "max_patients": 30 },
    { "day_of_week": 3, "start_time": "09:00", "end_time": "13:00", "max_patients": 30 },
    { "day_of_week": 5, "start_time": "09:00", "end_time": "13:00", "max_patients": 30 }
  ]
}
```

### DoctorResource Response:
```json
{
  "id": 1,
  "name": "Dr. Amit Sharma",
  "department": { "id": 1, "name": "Cardiology" },
  "specialization": "Cardiologist",
  "qualification": "MBBS, MD Cardiology",
  "opd_fee": 500,
  "consultation_time": 15,
  "hpr_id": "HPR-12345",
  "is_active": true,
  "is_available_today": true,
  "schedule": [
    { "day_of_week": 1, "day_name": "Monday", "start_time": "09:00", "end_time": "13:00", "max_patients": 30 }
  ],
  "today_visit_count": 12
}
```

### Service Methods:
```php
interface DoctorServiceInterface {
    public function list(int $hospitalId, array $filters = []): Collection;
    public function create(array $data): Doctor;
    public function update(int $id, array $data): Doctor;
    public function updateSchedule(int $doctorId, array $schedule): void;
    public function getAvailableToday(int $hospitalId, ?int $departmentId = null): Collection;
    public function getTodayVisitCount(int $doctorId): int;
}
```

---

## Module 4: ABDM Service (UPDATE NEEDED)

**Interface:** `AbdmServiceInterface` ✅ (already created)  
**Mock:** `MockAbdmService` ✅ (already created)  
**Real:** `RealAbdmService` ❌ [NEW]  

### RealAbdmService Methods:

```php
class RealAbdmService implements AbdmServiceInterface {

    // Gateway token — 100 min cache
    protected function getAccessToken(): string;

    // Mobile OTP ke liye (Flow B — naya ABHA)
    public function generateOtp(string $mobile): array;
    // Returns: { txnId: "xxx", message: "OTP sent" }

    // OTP verify (Flow B)
    public function verifyOtp(string $txnId, string $otp): array;
    // Returns: { ABHAProfile: { ABHANumber, abhaAddress, name, gender, mobile } }

    // Webhook data process (Flow A — Scan & Share)
    public function processScanAndShare(array $payload): array;
    // Local processing, no API call

    // ABHA by Aadhaar (optional, Phase 7)
    public function createAbha(array $data): array;
}
```

### Config (services.php):
```php
'abdm' => [
    'mock_mode'     => env('ABDM_MOCK_MODE', true),
    'gateway_url'   => env('ABDM_GATEWAY_URL', 'https://dev.abdm.gov.in'),
    'abha_url'      => env('ABDM_ABHA_URL', 'https://abhasbx.abdm.gov.in/abha/api'),
    'client_id'     => env('ABDM_CLIENT_ID'),
    'client_secret' => env('ABDM_CLIENT_SECRET'),
],
```

---

## Module 5: Webhook Controller (NEW)

**Controller:** `Api/V1/AbdmWebhookController` [NEW]  

### Route (PUBLIC — no auth):
```php
Route::post('/abdm/callback/share-profile', [AbdmWebhookController::class, 'handleShareProfile']);
```

### Logic Flow:
```
1. Payload receive karo
2. Validate: profile.patient exist kare
3. Log karo (debugging ke liye)
4. Patient::firstOrCreate by abha_number
5. CounterQueue::firstOrCreate by link_token (idempotency)
6. expires_at = now() + 15 minutes
7. return 200 immediately (ABDM ko wait nahi karna chahiye)
```

### Sample Webhook Payload (ABDM se aata hai):
```json
{
  "token": "482",
  "hipId": "HOSPITAL-HIP-ID",
  "profile": {
    "hipCode": "COUNTER-1",
    "patient": {
      "healthId": "patient@sbx",
      "healthIdNumber": "91-1234-5678-9012",
      "name": "Rajesh Kumar",
      "gender": "M",
      "yearOfBirth": "1985",
      "mobile": "9876543210",
      "address": {
        "line": "123 Main Street",
        "district": "Delhi",
        "state": "Delhi",
        "pincode": "110001"
      }
    }
  }
}
```

---

## Module 6: Reception Controller (NEW — Core M1 Flow)

**Controller:** `Api/V1/ReceptionController` [NEW]  
**Service:** `ReceptionService` [NEW] (AbdmService inject होगा)  

### Routes (auth:sanctum):
```php
Route::prefix('reception')->middleware('auth:sanctum')->group(function () {
    // Flow A: Scan & Share token
    Route::post('/find-by-token',         [ReceptionController::class, 'findByToken']);
    // Flow B: Naya ABHA (mobile OTP)
    Route::post('/generate-otp',          [ReceptionController::class, 'generateOtp']);
    Route::post('/verify-otp',            [ReceptionController::class, 'verifyOtp']);
    // Flow C: Bina ABHA
    Route::post('/register-without-abha', [ReceptionController::class, 'registerWithoutAbha']);
    // Final Step: Visit create
    Route::post('/create-visit',          [ReceptionController::class, 'createVisit']);
    // Helper: Available departments + doctors for today
    Route::get('/departments-with-doctors', [ReceptionController::class, 'getDepartmentsWithDoctors']);
});
```

### findByToken Response:
```json
{
  "patient": {
    "id": 5,
    "name": "Rajesh Kumar",
    "abha_number": "91-1234-5678-9012",
    "gender": "M",
    "dob": "1985-01-01",
    "phone": "9876543210"
  },
  "departments": [
    {
      "id": 1,
      "name": "Cardiology",
      "doctors": [
        {
          "id": 1,
          "name": "Dr. Amit Sharma",
          "specialization": "Cardiologist",
          "opd_fee": 500,
          "today_queue_count": 12,
          "consultation_time": 15
        }
      ]
    }
  ]
}
```

### createVisit Request + Response:
```json
// Request:
{
  "patient_id": 5,
  "department_id": 1,
  "doctor_id": 1,
  "chief_complaint": "Chest pain since 2 days"
}

// Response (Receipt data):
{
  "visit_id": 101,
  "queue_token": 13,
  "patient_name": "Rajesh Kumar",
  "abha_number": "91-1234-5678-9012",
  "department": "Cardiology",
  "doctor": "Dr. Amit Sharma",
  "opd_fee": 500,
  "visit_date": "04-08-2026",
  "estimated_time": "~3 hours 15 mins"
}
```

### Queue Token Logic (race condition safe):
```php
$nextToken = DB::transaction(function () use ($request) {
    // Lock karo taaki 2 simultaneous requests same token na dein
    $last = OpdVisit::whereDate('visit_date', today())
        ->where('doctor_id', $request->doctor_id)
        ->lockForUpdate()
        ->max('queue_token');
    return ($last ?? 0) + 1;
});
```

---

## Module 7: OPD Visit Management (Doctor Panel ke liye)

**Controller:** `Api/V1/OpdController` [NEW]  

### Routes:
```php
Route::prefix('opd')->middleware('auth:sanctum')->group(function () {
    Route::get('/queue',              [OpdController::class, 'todayQueue']);    // Today's queue
    Route::put('/{id}/call',          [OpdController::class, 'callPatient']);   // Status: called
    Route::put('/{id}/start',         [OpdController::class, 'startConsult']);  // Status: in_consultation
    Route::put('/{id}/complete',      [OpdController::class, 'complete']);      // Status: done
    Route::put('/{id}/cancel',        [OpdController::class, 'cancel']);        // Status: cancelled
});
```

---

## Module 8: Patient Management (UPDATE NEEDED)

**Controller:** `Api/V1/PatientController` ✅ (partial)  
**Service:** `PatientService` ✅ (partial)  

### Additional Routes needed:
```php
Route::get('/patients/{id}',              [PatientController::class, 'show']);
Route::put('/patients/{id}',              [PatientController::class, 'update']);
Route::get('/patients/{id}/visits',       [PatientController::class, 'visitHistory']);
Route::get('/patients/search',            [PatientController::class, 'search']); // by name/phone/abha
```

---

## ServiceBindingProvider — Final State

```php
public function register(): void {
    // Auth (already done)
    $this->app->bind(AuthServiceInterface::class, AuthService::class);

    // Patient (already done)
    $this->app->bind(PatientServiceInterface::class, PatientService::class);

    // Storage (already done)
    $this->app->bind(StorageServiceInterface::class, StorageService::class);

    // ABDM — mock/real switch
    $this->app->bind(AbdmServiceInterface::class, function ($app) {
        return config('services.abdm.mock_mode')
            ? new MockAbdmService()
            : new RealAbdmService();
    });

    // NEW bindings:
    $this->app->bind(DepartmentServiceInterface::class, DepartmentService::class);
    $this->app->bind(DoctorServiceInterface::class, DoctorService::class);
    $this->app->bind(ReceptionServiceInterface::class, ReceptionService::class);
}
```

---

## Final routes/api.php Structure

```php
Route::prefix('v1')->group(function () {

    // === PUBLIC ===
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/abdm/callback/share-profile', [AbdmWebhookController::class, 'handleShareProfile']);

    // === AUTHENTICATED ===
    Route::middleware('auth:sanctum')->group(function () {

        // Auth
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/user',    [AuthController::class, 'me']);

        // Departments
        Route::apiResource('departments', DepartmentController::class);
        Route::get('departments/{id}/doctors', [DepartmentController::class, 'doctors']);

        // Doctors
        Route::apiResource('doctors', DoctorController::class);
        Route::get('doctors/{id}/schedule',  [DoctorController::class, 'getSchedule']);
        Route::put('doctors/{id}/schedule',  [DoctorController::class, 'updateSchedule']);
        Route::get('doctors/available-today', [DoctorController::class, 'availableToday']);

        // Patients
        Route::apiResource('patients', PatientController::class);
        Route::get('patients/search',         [PatientController::class, 'search']);
        Route::get('patients/{id}/visits',    [PatientController::class, 'visitHistory']);

        // Reception (M1 Core)
        Route::prefix('reception')->group(function () {
            Route::post('/find-by-token',          [ReceptionController::class, 'findByToken']);
            Route::post('/generate-otp',           [ReceptionController::class, 'generateOtp']);
            Route::post('/verify-otp',             [ReceptionController::class, 'verifyOtp']);
            Route::post('/register-without-abha',  [ReceptionController::class, 'registerWithoutAbha']);
            Route::post('/create-visit',           [ReceptionController::class, 'createVisit']);
            Route::get('/departments-with-doctors',[ReceptionController::class, 'getDepartmentsWithDoctors']);
        });

        // OPD Queue (Doctor Panel)
        Route::prefix('opd')->group(function () {
            Route::get('/queue',          [OpdController::class, 'todayQueue']);
            Route::put('/{id}/call',      [OpdController::class, 'callPatient']);
            Route::put('/{id}/complete',  [OpdController::class, 'complete']);
            Route::put('/{id}/cancel',    [OpdController::class, 'cancel']);
        });

        // Storage
        Route::post('/storage/upload-url', [StorageController::class, 'generateUploadUrl']);
        Route::get('/storage/view-url',    [StorageController::class, 'generateViewUrl']);
    });
});
```

---

## Files to Create (Checklist)

### Services:
- [ ] `app/Services/Abdm/RealAbdmService.php`
- [ ] `app/Services/Department/DepartmentServiceInterface.php`
- [ ] `app/Services/Department/DepartmentService.php`
- [ ] `app/Services/Doctor/DoctorServiceInterface.php`
- [ ] `app/Services/Doctor/DoctorService.php`
- [ ] `app/Services/Reception/ReceptionServiceInterface.php`
- [ ] `app/Services/Reception/ReceptionService.php`

### Controllers:
- [ ] `app/Http/Controllers/Api/V1/AbdmWebhookController.php`
- [ ] `app/Http/Controllers/Api/V1/ReceptionController.php`
- [ ] `app/Http/Controllers/Api/V1/DepartmentController.php`
- [ ] `app/Http/Controllers/Api/V1/DoctorController.php`
- [ ] `app/Http/Controllers/Api/V1/OpdController.php`

### Form Requests:
- [ ] `app/Http/Requests/StoreDepartmentRequest.php`
- [ ] `app/Http/Requests/StoreDoctorRequest.php`
- [ ] `app/Http/Requests/UpdateDoctorScheduleRequest.php`
- [ ] `app/Http/Requests/ReceptionFindTokenRequest.php`
- [ ] `app/Http/Requests/ReceptionVerifyOtpRequest.php`
- [ ] `app/Http/Requests/ReceptionCreateVisitRequest.php`

### Resources:
- [ ] `app/Http/Resources/DepartmentResource.php`
- [ ] `app/Http/Resources/DoctorResource.php`
- [ ] `app/Http/Resources/OpdVisitResource.php`

### Models:
- [ ] `app/Models/DoctorSchedule.php` [NEW]

### Update existing:
- [ ] `app/Models/Doctor.php` — relationships
- [ ] `app/Models/Department.php` — relationships
- [ ] `app/Models/Patient.php` — fillable + relationships
- [ ] `app/Models/CounterQueue.php` — fillable + relationships
- [ ] `app/Models/OpdVisit.php` — fillable + relationships
- [ ] `app/Providers/ServiceBindingProvider.php` — new bindings
- [ ] `routes/api.php` — all new routes
