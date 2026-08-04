# Plan 07 — Backend Architecture Standards

> Interfaces, Traits, Swagger/OpenAPI docs, Response format — सब standards यहाँ define हैं।
> हर नई file बनाते वक्त यह plan follow करो।

---

## 1. Interface Pattern (Service Layer)

### Rules:
1. हर Service का एक Interface होगा — `{Name}ServiceInterface`
2. Interface namespace: `App\Services\{Module}\{Name}ServiceInterface`
3. Implementation: `App\Services\{Module}\{Name}Service`
4. Binding: `ServiceBindingProvider` में register करो

### Template — Interface:
```php
<?php

namespace App\Services\Abdm;

interface AbdmServiceInterface
{
    /**
     * Generate OTP for ABHA creation/verification via mobile.
     *
     * @param  string  $mobile  10-digit mobile number
     * @param  string  $scope   'abha-enrol' | 'abha-login'
     * @return array{txnId: string, message: string}
     *
     * @throws \App\Exceptions\AbdmApiException
     */
    public function generateOtp(string $mobile, string $scope = 'abha-enrol'): array;

    /**
     * Verify OTP and return ABHA profile or token.
     *
     * @param  string  $txnId  Transaction ID from generateOtp
     * @param  string  $otp    6-digit OTP
     * @return array{success: bool, profile?: array, accounts?: array, error?: string}
     */
    public function verifyOtp(string $txnId, string $otp): array;

    /**
     * Fetch ABHA address suggestions for new ABHA.
     *
     * @param  string  $txnId  Transaction ID from successful OTP verification
     * @return array<string>   List of suggested ABHA addresses
     */
    public function getAbhaAddressSuggestions(string $txnId): array;

    /**
     * Set/confirm the ABHA address after suggestion selection.
     *
     * @param  string  $txnId
     * @param  string  $abhaAddress  User-chosen address (8-18 chars, alphanumeric)
     * @return array{ABHANumber: string, abhaAddress: string, name: string}
     */
    public function setAbhaAddress(string $txnId, string $abhaAddress): array;

    /**
     * Fetch full ABHA profile using X-Token.
     *
     * @param  string  $xToken  Token from successful login/verify
     * @return array            Full profile (name, dob, gender, mobile, address, etc.)
     */
    public function getProfile(string $xToken): array;

    /**
     * Process incoming Scan & Share webhook payload.
     * No API call — local processing only.
     *
     * @param  array  $payload  Raw webhook body from ABDM
     * @return array{patient: array, token: string}
     *
     * @throws \InvalidArgumentException  If payload is invalid
     */
    public function processScanAndShare(array $payload): array;
}
```

---

## 2. Traits

### Trait 1: BelongsToHospital (already exists)
```php
// app/Http/Traits/BelongsToHospital.php
namespace App\Http\Traits;

trait BelongsToHospital
{
    /**
     * Boot trait — auto-inject hospital_id on create.
     */
    protected static function bootBelongsToHospital(): void
    {
        static::creating(function ($model) {
            if (auth()->check() && empty($model->hospital_id)) {
                $model->hospital_id = auth()->user()->hospital_id;
            }
        });
    }

    /**
     * Auto-scope all queries to current user's hospital.
     */
    public function scopeForCurrentHospital($query)
    {
        return $query->where('hospital_id', auth()->user()->hospital_id ?? null);
    }

    public function hospital()
    {
        return $this->belongsTo(\App\Models\Hospital::class);
    }
}
```

### Trait 2: HasApiResponse (NEW — Controllers ke liye)
```php
// app/Http/Traits/HasApiResponse.php
namespace App\Http\Traits;

use Illuminate\Http\JsonResponse;

trait HasApiResponse
{
    protected function successResponse(
        mixed $data,
        string $message = 'Success',
        int $status = 200
    ): JsonResponse {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data'    => $data,
        ], $status);
    }

    protected function errorResponse(
        string $message,
        mixed $errors = null,
        int $status = 422
    ): JsonResponse {
        $response = [
            'success' => false,
            'message' => $message,
        ];
        if ($errors !== null) {
            $response['errors'] = $errors;
        }
        return response()->json($response, $status);
    }

    protected function notFoundResponse(string $message = 'Resource not found'): JsonResponse
    {
        return $this->errorResponse($message, null, 404);
    }

    protected function createdResponse(mixed $data, string $message = 'Created successfully'): JsonResponse
    {
        return $this->successResponse($data, $message, 201);
    }
}
```

### Trait 3: HasTimestampScopes (NEW — Models ke liye)
```php
// app/Models/Traits/HasTimestampScopes.php
namespace App\Models\Traits;

trait HasTimestampScopes
{
    public function scopeToday($query)
    {
        return $query->whereDate('created_at', today());
    }

    public function scopeThisMonth($query)
    {
        return $query->whereMonth('created_at', now()->month)
                     ->whereYear('created_at', now()->year);
    }

    public function scopeRecent($query, int $days = 7)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }
}
```

### Trait 4: AbdmValidatable (NEW — ABDM-specific validation)
```php
// app/Http/Traits/AbdmValidatable.php
namespace App\Http\Traits;

trait AbdmValidatable
{
    /**
     * Validate ABHA number format: 14 digits (91-XXXX-XXXX-XXXX)
     */
    protected function isValidAbhaNumber(string $abha): bool
    {
        return (bool) preg_match('/^91-\d{4}-\d{4}-\d{4}$/', $abha);
    }

    /**
     * Validate ABHA address:
     * - 8-18 chars
     * - Alphanumeric + optional 1 dot + 1 underscore (not at start/end)
     */
    protected function isValidAbhaAddress(string $address): bool
    {
        if (strlen($address) < 8 || strlen($address) > 18) return false;
        return (bool) preg_match('/^[a-zA-Z0-9]+([._]?[a-zA-Z0-9]+)*$/', $address);
    }

    /**
     * Mask mobile number: 9876543210 → *******210
     */
    protected function maskMobile(string $mobile): string
    {
        return str_repeat('*', strlen($mobile) - 3) . substr($mobile, -3);
    }
}
```

---

## 3. Custom Exceptions

```php
// app/Exceptions/AbdmApiException.php
namespace App\Exceptions;

use RuntimeException;

class AbdmApiException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly string $abdmCode = '',
        public readonly array $context = [],
        int $code = 0,
        ?\Throwable $previous = null
    ) {
        parent::__construct($message, $code, $previous);
    }

    public static function fromResponse(array $response): self
    {
        return new self(
            message:  $response['message'] ?? 'ABDM API error',
            abdmCode: $response['code'] ?? '',
            context:  $response,
        );
    }
}

// Usage in RealAbdmService:
// throw AbdmApiException::fromResponse($result);
```

```php
// app/Exceptions/Handler.php — add AbdmApiException handling
public function render($request, Throwable $exception)
{
    if ($exception instanceof AbdmApiException) {
        return response()->json([
            'success' => false,
            'message' => $exception->getMessage(),
            'error'   => 'abdm_api_error',
            'code'    => $exception->abdmCode,
        ], 503);
    }
    return parent::render($request, $exception);
}
```

---

## 4. Standardized API Response Format

**Every API response must follow this format:**

```json
// Success (200/201):
{
  "success": true,
  "message": "Patient found successfully",
  "data": { ... }
}

// Validation Error (422):
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "mobile": ["Mobile number is required", "Must be 10 digits"]
  }
}

// Not Found (404):
{
  "success": false,
  "message": "Token not found or expired"
}

// ABDM Error (503):
{
  "success": false,
  "message": "OTP expire ho gaya",
  "error": "abdm_api_error",
  "code": "ABDM-1003"
}

// Paginated List (200):
{
  "success": true,
  "message": "Success",
  "data": {
    "items": [...],
    "pagination": {
      "current_page": 1,
      "per_page": 15,
      "total": 150,
      "last_page": 10
    }
  }
}
```

---

## 5. Swagger / OpenAPI Documentation

**Package:** `darkaonline/l5-swagger`

### Install:
```bash
composer require darkaonline/l5-swagger
php artisan vendor:publish --provider "L5Swagger\L5SwaggerServiceProvider"
php artisan l5-swagger:generate
```

### Config (config/l5-swagger.php — key settings):
```php
'documentations' => [
    'default' => [
        'api' => [
            'title' => 'HMS Backend API',
            'version' => '1.0.0',
        ],
        'routes' => [
            'api' => 'api/documentation',  // URL: /api/documentation
        ],
        'paths' => [
            'docs_json' => 'api-docs.json',
            'annotations' => [
                base_path('app'),           // Scan app/ folder
            ],
        ],
    ],
],
```

### Controller Annotation Template:
```php
/**
 * @OA\Info(
 *     title="HMS API",
 *     version="1.0.0",
 *     description="Hospital Management System — ABDM M1 Integration"
 * )
 *
 * @OA\SecurityScheme(
 *     securityScheme="sanctum",
 *     type="http",
 *     scheme="bearer",
 *     bearerFormat="JWT"
 * )
 *
 * @OA\Server(
 *     url=L5_SWAGGER_CONST_HOST,
 *     description="API Server"
 * )
 */
class Controller extends BaseController
{
    use HasApiResponse;
}
```

### Route Annotation Example (AuthController):
```php
/**
 * @OA\Post(
 *     path="/api/v1/login",
 *     summary="Login user",
 *     tags={"Auth"},
 *
 *     @OA\RequestBody(
 *         required=true,
 *         @OA\JsonContent(
 *             required={"email","password"},
 *             @OA\Property(property="email",    type="string", example="admin@hospital.com"),
 *             @OA\Property(property="password", type="string", example="password123")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Login successful",
 *         @OA\JsonContent(
 *             @OA\Property(property="success", type="boolean", example=true),
 *             @OA\Property(property="message", type="string",  example="Login successful"),
 *             @OA\Property(property="data", type="object",
 *                 @OA\Property(property="token", type="string", example="1|abc123..."),
 *                 @OA\Property(property="user",  type="object",
 *                     @OA\Property(property="id",    type="integer"),
 *                     @OA\Property(property="name",  type="string"),
 *                     @OA\Property(property="email", type="string")
 *                 )
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(response=422, description="Validation error"),
 *     @OA\Response(response=401, description="Invalid credentials")
 * )
 */
public function login(LoginRequest $request): JsonResponse
```

### Reception Controller Swagger Example:
```php
/**
 * @OA\Post(
 *     path="/api/v1/reception/find-by-token",
 *     summary="Find patient by Scan & Share token",
 *     tags={"Reception"},
 *     security={{"sanctum":{}}},
 *
 *     @OA\RequestBody(
 *         required=true,
 *         @OA\JsonContent(
 *             required={"token"},
 *             @OA\Property(property="token", type="string", example="482",
 *                          description="Token shown on patient ABHA app after QR scan")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Patient found",
 *         @OA\JsonContent(
 *             @OA\Property(property="success", type="boolean", example=true),
 *             @OA\Property(property="data", type="object",
 *                 @OA\Property(property="patient", type="object",
 *                     @OA\Property(property="id",          type="integer"),
 *                     @OA\Property(property="name",        type="string"),
 *                     @OA\Property(property="abha_number", type="string"),
 *                     @OA\Property(property="gender",      type="string"),
 *                     @OA\Property(property="mobile",      type="string")
 *                 ),
 *                 @OA\Property(property="departments", type="array",
 *                     @OA\Items(type="object")
 *                 )
 *             )
 *         )
 *     ),
 *     @OA\Response(response=404, description="Token not found or expired")
 * )
 */
```

---

## 6. Form Request Validation Classes

### Template — Form Request:
```php
// app/Http/Requests/Reception/FindByTokenRequest.php
namespace App\Http\Requests\Reception;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class FindByTokenRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Auth already handled by middleware
    }

    public function rules(): array
    {
        return [
            'token' => ['required', 'string', 'min:1', 'max:10'],
        ];
    }

    public function messages(): array
    {
        return [
            'token.required' => 'Token required hai.',
        ];
    }

    /**
     * Override to return JSON error (not HTML redirect)
     */
    protected function failedValidation(Validator $validator): void
    {
        throw new HttpResponseException(
            response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors'  => $validator->errors(),
            ], 422)
        );
    }
}
```

### Template — ABDM OTP Request:
```php
// app/Http/Requests/Reception/GenerateOtpRequest.php
public function rules(): array
{
    return [
        'mobile' => ['required', 'digits:10', 'regex:/^[6-9]\d{9}$/'],
    ];
}

public function messages(): array
{
    return [
        'mobile.required' => 'Mobile number required hai.',
        'mobile.digits'   => 'Mobile number 10 digits ka hona chahiye.',
        'mobile.regex'    => 'Valid Indian mobile number enter karein (6-9 se start hona chahiye).',
    ];
}
```

### Template — Create Visit Request:
```php
// app/Http/Requests/Reception/CreateVisitRequest.php
public function rules(): array
{
    return [
        'patient_id'      => ['required', 'exists:patients,id'],
        'department_id'   => ['required', 'exists:departments,id'],
        'doctor_id'       => ['required', 'exists:doctors,id'],
        'chief_complaint' => ['nullable', 'string', 'max:500'],
    ];
}
```

---

## 7. API Resource Templates

### Patient Resource:
```php
// app/Http/Resources/PatientResource.php
public function toArray(Request $request): array
{
    return [
        'id'           => $this->id,
        'name'         => $this->name,
        'mobile'       => $this->mobile,
        'email'        => $this->email,
        'dob'          => $this->dob?->format('d-m-Y'),
        'gender'       => $this->gender,
        'blood_group'  => $this->blood_group,
        'abha_number'  => $this->abha_number,
        'abha_address' => $this->abha_address,
        'address'      => $this->address,
        'hospital_id'  => $this->hospital_id,
        'created_at'   => $this->created_at?->format('d-m-Y H:i'),

        // Conditional relationships (only when loaded):
        'visits'       => OpdVisitResource::collection($this->whenLoaded('opdVisits')),
        'latest_vitals'=> new VitalsResource($this->whenLoaded('latestVitals')),
    ];
}
```

### OPD Visit Resource:
```php
public function toArray(Request $request): array
{
    return [
        'id'             => $this->id,
        'queue_token'    => $this->queue_token,
        'visit_date'     => $this->visit_date?->format('d-m-Y'),
        'status'         => $this->status,
        'chief_complaint'=> $this->chief_complaint,
        'fee_charged'    => $this->fee_charged,
        'payment_status' => $this->payment_status,
        'called_at'      => $this->called_at?->format('H:i'),
        'doctor'         => new DoctorResource($this->whenLoaded('doctor')),
        'department'     => new DepartmentResource($this->whenLoaded('department')),
        'vitals'         => VitalsResource::collection($this->whenLoaded('vitals')),
    ];
}
```

### Vitals Resource:
```php
public function toArray(Request $request): array
{
    return [
        'id'               => $this->id,
        'recorded_at'      => $this->recorded_at?->format('d-m-Y H:i'),
        'temperature'      => $this->temperature ? "{$this->temperature} °{$this->temperature_unit}" : null,
        'blood_pressure'   => ($this->blood_pressure_sys && $this->blood_pressure_dia)
                              ? "{$this->blood_pressure_sys}/{$this->blood_pressure_dia} mmHg" : null,
        'pulse_rate'       => $this->pulse_rate ? "{$this->pulse_rate} bpm" : null,
        'oxygen_saturation'=> $this->oxygen_saturation ? "{$this->oxygen_saturation}%" : null,
        'weight'           => $this->weight ? "{$this->weight} kg" : null,
        'height'           => $this->height ? "{$this->height} cm" : null,
        'bmi'              => $this->bmi,
        'blood_glucose'    => $this->blood_glucose
                              ? "{$this->blood_glucose} mg/dL ({$this->glucose_type})" : null,
        'recorded_by'      => $this->whenLoaded('recordedBy', fn() => $this->recordedBy->name),
    ];
}
```

---

## 8. File/Folder Structure (Final)

```
app/
├── Contracts/              # Alias for interfaces (if needed)
├── Exceptions/
│   ├── AbdmApiException.php
│   └── Handler.php
├── Http/
│   ├── Controllers/
│   │   └── Api/V1/
│   │       ├── AuthController.php
│   │       ├── AbdmWebhookController.php   ← EC: receives Scan & Share
│   │       ├── ReceptionController.php     ← M1 core flows
│   │       ├── DepartmentController.php
│   │       ├── DoctorController.php
│   │       ├── OpdController.php
│   │       ├── VitalsController.php        ← NEW
│   │       ├── PatientController.php
│   │       └── StorageController.php
│   ├── Middleware/
│   │   └── TenantContextMiddleware.php
│   ├── Requests/
│   │   ├── Auth/
│   │   │   └── LoginRequest.php
│   │   ├── Reception/
│   │   │   ├── FindByTokenRequest.php
│   │   │   ├── GenerateOtpRequest.php
│   │   │   ├── VerifyOtpRequest.php
│   │   │   ├── RegisterWithoutAbhaRequest.php
│   │   │   └── CreateVisitRequest.php
│   │   ├── Doctor/
│   │   │   ├── StoreDoctorRequest.php
│   │   │   └── UpdateDoctorScheduleRequest.php
│   │   ├── Vitals/
│   │   │   └── StoreVitalsRequest.php
│   │   └── Department/
│   │       └── StoreDepartmentRequest.php
│   ├── Resources/
│   │   ├── UserResource.php
│   │   ├── PatientResource.php
│   │   ├── DoctorResource.php
│   │   ├── DepartmentResource.php
│   │   ├── OpdVisitResource.php
│   │   ├── VitalsResource.php              ← NEW
│   │   └── InvoiceResource.php             ← NEW
│   └── Traits/
│       ├── BelongsToHospital.php
│       ├── HasApiResponse.php              ← NEW
│       └── AbdmValidatable.php             ← NEW
├── Models/
│   ├── Hospital.php
│   ├── User.php
│   ├── Patient.php
│   ├── Department.php
│   ├── Doctor.php
│   ├── DoctorSchedule.php                  ← NEW
│   ├── CounterQueue.php
│   ├── OpdVisit.php
│   ├── Vitals.php                          ← NEW
│   ├── AppointmentType.php                 ← NEW
│   ├── Invoice.php
│   └── InvoiceItem.php                     ← NEW
├── Providers/
│   ├── AppServiceProvider.php
│   └── ServiceBindingProvider.php
└── Services/
    ├── Auth/
    │   ├── AuthServiceInterface.php
    │   └── AuthService.php
    ├── Abdm/
    │   ├── AbdmServiceInterface.php         ← update with full interface
    │   ├── MockAbdmService.php
    │   └── RealAbdmService.php             ← NEW
    ├── Patient/
    │   ├── PatientServiceInterface.php
    │   └── PatientService.php
    ├── Reception/
    │   ├── ReceptionServiceInterface.php   ← NEW
    │   └── ReceptionService.php            ← NEW
    ├── Department/
    │   ├── DepartmentServiceInterface.php  ← NEW
    │   └── DepartmentService.php           ← NEW
    ├── Doctor/
    │   ├── DoctorServiceInterface.php      ← NEW
    │   └── DoctorService.php              ← NEW
    └── Storage/
        ├── StorageServiceInterface.php
        └── StorageService.php
```

---

## 9. ServiceBindingProvider — Final Complete Version

```php
public function register(): void
{
    // Auth
    $this->app->bind(
        \App\Services\Auth\AuthServiceInterface::class,
        \App\Services\Auth\AuthService::class
    );

    // Patient
    $this->app->bind(
        \App\Services\Patient\PatientServiceInterface::class,
        \App\Services\Patient\PatientService::class
    );

    // Storage
    $this->app->bind(
        \App\Services\Storage\StorageServiceInterface::class,
        \App\Services\Storage\StorageService::class
    );

    // ABDM — Mock/Real switch
    $this->app->bind(
        \App\Services\Abdm\AbdmServiceInterface::class,
        function ($app) {
            return config('services.abdm.mock_mode')
                ? new \App\Services\Abdm\MockAbdmService()
                : new \App\Services\Abdm\RealAbdmService();
        }
    );

    // Department
    $this->app->bind(
        \App\Services\Department\DepartmentServiceInterface::class,
        \App\Services\Department\DepartmentService::class
    );

    // Doctor
    $this->app->bind(
        \App\Services\Doctor\DoctorServiceInterface::class,
        \App\Services\Doctor\DoctorService::class
    );

    // Reception
    $this->app->bind(
        \App\Services\Reception\ReceptionServiceInterface::class,
        \App\Services\Reception\ReceptionService::class
    );
}
```

---

## 10. Controller Base Class

```php
// app/Http/Controllers/Controller.php
namespace App\Http\Controllers;

use App\Http\Traits\HasApiResponse;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Routing\Controller as BaseController;

/**
 * @OA\Info(
 *     title="HMS API",
 *     version="1.0.0",
 *     description="Hospital Management System — ABDM M1 Integration API"
 * )
 * @OA\SecurityScheme(
 *     securityScheme="sanctum",
 *     type="http",
 *     scheme="bearer"
 * )
 */
class Controller extends BaseController
{
    use AuthorizesRequests;
    use ValidatesRequests;
    use HasApiResponse;
}
```
