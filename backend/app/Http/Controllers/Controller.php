<?php

namespace App\Http\Controllers;

use OpenApi\Attributes as OA;

#[OA\Info(
    version: "1.0.0",
    title: "HMS ABDM Integration API",
    description: <<<EOT
# HMS & ABDM Integration Guide

Welcome to the API Documentation! This guide provides a complete end-to-end lifecycle of the system, starting from the Super Admin down to the Doctor's consultation. 

## Phase 1: Onboarding & Setup (Super Admin & Admin)

### Step 1.1: Super Admin Login & Hospital Creation
1. **`POST /api/v1/login`**: Login using Super Admin credentials (e.g., `superadmin@hms.com`).
2. **`POST /api/v1/hospitals`**: Register a new Hospital in the system. Note the returned Hospital ID.
3. **`POST /api/v1/logout`**: Logout from the Super Admin account.

### Step 1.2: Hospital Admin Setup
1. **`POST /api/v1/login`**: Login using the newly created Hospital Admin credentials. (Pass `Authorization: Bearer <token>` in all next requests).
2. **`POST /api/v1/departments`**: Create medical departments (e.g., Cardiology, Orthopedics).
3. **`POST /api/v1/doctors`**: Register doctors and assign them to departments.
4. **`PUT /api/v1/doctors/{id}/schedule`**: Setup weekly working hours and patient limits for doctors.

---

## Phase 2: Patient Registration (Front Desk / Reception)

When a patient arrives at the hospital, they must be registered before an OPD visit can be created. There are 3 ways to register a patient:

### Option A: Standard Walk-in (No ABHA / Normal Patient)
If the patient does not have an ABHA ID or prefers not to use it:
1. **`POST /api/v1/reception/register`**: Register the patient manually using their basic details (Name, Mobile, DOB, Gender). This is the simplest API for normal patients.

### Option B: Patient already has ABHA (Mobile OTP Login)
1. **`POST /api/v1/abha/generate-otp`**: Send the patient's mobile number.
2. **`POST /api/v1/abha/verify-otp`**: Verify the OTP using `txnId`.
3. **`GET /api/v1/abha/profile`**: Fetch patient's verified ABHA profile.
4. **`POST /api/v1/reception/register`**: Save the patient in the hospital DB using the fetched details.

### Option C: Create New ABHA (Aadhaar Enrolment)
1. **`POST /api/v1/abha/enrol/aadhaar-otp`** → **`verify-aadhaar`**
2. **`POST /api/v1/abha/enrol/mobile-otp`** → **`verify-mobile`**
3. **`GET /api/v1/abha/enrol/suggest-address`** → **`create-address`**
4. Follow up with **`POST /api/v1/reception/register`** to save to DB.

---

## Phase 3: Creating an OPD Visit (Appointment)

Once the patient is registered (via Option A, B, or C):
1. **`GET /api/v1/reception/departments`**: Fetch active departments & available doctors.
2. **`POST /api/v1/reception/visit`**: Create a direct OPD visit. This assigns a token number to the patient for that doctor's queue.

### Alternative: Scan & Share (ABDM Fast-track)
If the patient bypasses the reception line and scans the Hospital's QR code using an ABHA App:
1. A webhook (**`/webhook/abdm/v1/scan-and-share`**) automatically receives their data.
2. **`GET /api/v1/reception/scan-and-share/queues`**: Receptionist views the incoming queue on their dashboard.
3. **`POST /api/v1/reception/scan-and-share/token`**: (Optional) Search specific token.
4. **`POST /api/v1/reception/scan-and-share/confirm`**: Receptionist maps the patient to a department/doctor, confirming the OPD visit in one click.

---

## Phase 4: Doctor's Panel (Consultation)

1. **`GET /api/v1/opd/queue`**: Doctor views their patient queue for today.
2. **`POST /api/v1/opd/visit/{visitId}/call`**: Doctor calls the next patient in line.
3. **`POST /api/v1/opd/visit/{visitId}/complete`**: Doctor finishes the consultation, entering the diagnosis and notes.
EOT
)]
#[OA\Server(
    url: L5_SWAGGER_CONST_HOST,
    description: "Main API Server"
)]
#[OA\SecurityScheme(
    securityScheme: "bearerAuth",
    type: "http",
    scheme: "bearer"
)]
#[OA\OpenApi(
    security: [["bearerAuth" => []]]
)]

// ---- Tag ordering defines display order in Swagger UI ----
#[OA\Tag(name: "1. Auth", description: "Step 0 — Login & Logout")]
#[OA\Tag(name: "2. ABHA — Mobile Login", description: "Flow A — मरीज़ के पास ABHA पहले से है (Mobile OTP से verify)")]
#[OA\Tag(name: "3. ABHA — Aadhaar Enrolment", description: "Flow B — नया ABHA बनाना (Aadhaar OTP से enrolment)")]
#[OA\Tag(name: "4. Reception", description: "Flow C & D — Walk-in Registration, Departments, OPD Visit, Scan & Share Queue")]
#[OA\Tag(name: "5. OPD (Doctor)", description: "Doctor Panel — Today's OPD Queue Management")]
#[OA\Tag(name: "6. Hospitals & Admin", description: "Super Admin — Hospital Management")]
#[OA\Tag(name: "7. Departments & Doctors", description: "Admin — Department & Doctor Setup")]
#[OA\Tag(name: "8. Patients", description: "Patient Records Management")]
#[OA\Tag(name: "9. ABDM Webhooks", description: "Incoming Webhooks from ABDM (Scan & Share)")]
#[OA\Tag(name: "10. Storage", description: "File Upload/Download via R2/S3")]

abstract class Controller
{
    /**
     * Get the hospital ID from the authenticated user or request parameters.
     * Required for Company Super Admins who don't have a direct hospital_id.
     */
    protected function getHospitalId(\Illuminate\Http\Request $request): int
    {
        $hospitalId = $request->user()->hospital_id ?? $request->query('hospital_id') ?? $request->input('hospital_id');
        
        if (!$hospitalId) {
            throw new \Illuminate\Http\Exceptions\HttpResponseException(
                response()->json([
                    'success' => false,
                    'message' => 'Hospital ID is required. Super Admins must provide ?hospital_id= in the query parameters.'
                ], 400)
            );
        }

        return (int) $hospitalId;
    }
}
