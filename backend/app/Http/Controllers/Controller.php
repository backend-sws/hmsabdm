<?php

namespace App\Http\Controllers;

use OpenApi\Attributes as OA;

#[OA\Info(
    version: "1.0.0",
    title: "HMS ABDM Integration API",
    description: <<<EOT
# HMS & ABDM Integration Guide

Welcome to the API Documentation! This guide provides a complete end-to-end lifecycle of the system, starting from Hospital Admin setup to Reception OPD Slip generation and Doctor consultation.

---

## 🏥 Phase 1: Onboarding & Setup (Hospital Admin)

1. **`POST /api/v1/login`**: Login using Admin credentials (e.g., `admin@hms.com`). Note the `access_token` and pass `Authorization: Bearer <token>` in subsequent requests.
2. **`POST /api/v1/departments`**: Create medical departments (e.g., General Medicine, Cardiology, Orthopedics).
3. **`POST /api/v1/doctors`**: Register doctors and assign them to departments.
4. **`PUT /api/v1/doctors/{id}/schedule`**: Setup working schedule and patient limits for doctors.

---

## 📋 Phase 2: Patient Registration (Reception / Front Desk)

When a patient arrives at the hospital, there are **3 ways** to verify/register them:

### Option A: Standard Walk-in (No ABHA / Normal Patient)
* **`POST /api/v1/reception/register`**: Register patient manually with Name, Mobile, DOB, and Gender. Returns `patient.id`.

### Option B: Patient Already Has ABHA (Mobile OTP Login)
1. **`POST /api/v1/abha/search`**: (Optional) Search ABHA records by mobile number.
2. **`POST /api/v1/abha/generate-otp`**: Send OTP to patient's mobile (`{ "mobile": "7049711475" }`). Returns `txnId`.
3. **`POST /api/v1/abha/verify-otp`**: Verify OTP (`{ "txnId": "...", "otp": "..." }`).
   * **Note:** The response contains full verified KYC details (Name, DOB, Gender, ABHA Number, Photo) in the `accounts` array.
4. **`POST /api/v1/reception/register`**: Auto-fill and save patient to hospital DB with the returned `abha_number` & `abha_address`. Returns `patient.id`.

### Option C: Create New ABHA (Aadhaar Enrolment)
1. **`POST /api/v1/abha/enrol/aadhaar-otp`**: Send OTP to Aadhaar-linked mobile. Returns `txnId`.
2. **`POST /api/v1/abha/enrol/verify-aadhaar`**: Verify Aadhaar OTP. Returns `token` (X-Token) & `hasExistingAbha`.
3. *(If Aadhaar mobile is different)*: **`enrol/mobile-otp`** → **`enrol/verify-mobile`**
4. *(If fresh enrolment)*: **`GET enrol/suggest-address`** → **`POST enrol/create-address`**
5. **`GET /api/v1/abha/profile`**: Fetch full Aadhaar profile using `token`.
6. **`GET /api/v1/abha/card`**: (Optional) Download official Govt ABHA Card (PDF/Image).
7. **`POST /api/v1/reception/register`**: Save patient to hospital DB. Returns `patient.id`.

---

## 🎟️ Phase 3: OPD Slip Generation (Creating Appointment Visit)

OPD Slips can be generated using either of the following two methods:

### Method 1: Standard OPD Visit (For Option A, B, and C)
Once the patient is registered and you have `patient_id`:
1. **`GET /api/v1/reception/departments`**: Fetch active departments and available doctors.
2. **`POST /api/v1/reception/visit`**: **Generate OPD Slip!**
   * Body: `{ "patient_id": 1, "doctor_id": 2, "department_id": 1 }`
   * **Result:** Assigns Queue Token (e.g. `OPD-042`), creates Visit in Doctor's queue, and generates printable OPD Slip.

### Method 2: Scan & Share (ABDM QR Code Fast-Track)
When a patient scans the Hospital Counter QR code using their ABHA App:
1. ABDM Webhook (**`POST /api/webhook/abdm/v1/scan-and-share`**) automatically receives demographic data and queues the token (valid for 30 min).
2. **`GET /api/v1/reception/scan-and-share/queues`**: Receptionist views waiting scanned patients.
3. **`POST /api/v1/reception/scan-and-share/token`**: (Optional) Look up specific 3-digit token (e.g. `TK-482`).
4. **`POST /api/v1/reception/scan-and-share/confirm`**: **Generate OPD Slip!**
   * Body: `{ "queue_id": 5, "doctor_id": 2, "department_id": 1 }`
   * **Result:** Confirms the queue, links doctor/department, and generates printable OPD Slip.

---

## 🩺 Phase 4: Triage & Nurse Station (Vitals Recording)

Once the OPD token slip is generated, the Nurse / Triage Station notes the patient's vitals before doctor consultation:
1. **`POST /api/v1/vitals`**: **Record Patient Vitals** (BP, Pulse, Temperature, SpO2, Height, Weight, Blood Glucose).
   * Body: `{ "patient_id": 1, "opd_visit_id": 1, "temperature": 98.6, "blood_pressure_sys": 120, "blood_pressure_dia": 80, "pulse_rate": 72, "weight": 68.5, "height": 172.0 }`
   * **Result:** Saves vitals, auto-calculates BMI ($23.15$), and links to visit/patient.
2. **`GET /api/v1/vitals/visit/{visitId}`**: View vitals recorded for this specific visit.
3. **`GET /api/v1/patients/{patientId}/vitals`**: View entire vitals history for a patient.

---

## 👨‍⚕️ Phase 5: Doctor's Panel (Consultation)

1. **`GET /api/v1/opd/queue`**: Doctor views their live OPD queue for today (includes patient details & latest recorded vitals).
2. **`POST /api/v1/opd/visit/{visitId}/call`**: Doctor calls the next patient into the consultation room.
3. **`POST /api/v1/opd/visit/{visitId}/complete`**: Doctor finishes consultation, adding diagnosis, notes, and prescription.
EOT
)]
#[OA\Server(
    url: "/",
    description: "Current Host / Relative Server (Recommended - Prevents CORS Errors)"
)]
#[OA\Server(
    url: "http://localhost:8000",
    description: "Direct Localhost Port 8000"
)]
#[OA\Server(
    url: "http://localhost",
    description: "Docker Nginx Port 80"
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
#[OA\Tag(name: "2. ABHA — Mobile Login", description: "Flow A — Patient has existing ABHA (Verify via Mobile OTP)")]
#[OA\Tag(name: "3. ABHA — Aadhaar Enrolment", description: "Flow B — Create New ABHA (Enrolment via Aadhaar OTP)")]
#[OA\Tag(name: "4. Reception", description: "Flow C & D — Walk-in Registration, Departments, OPD Visit, Scan & Share Queue")]
#[OA\Tag(name: "5. Triage & Vitals (Nurse)", description: "Nurse Station — Recording and managing patient vitals before doctor consultation")]
#[OA\Tag(name: "6. OPD (Doctor)", description: "Doctor Panel — Today's OPD Queue Management & Consultation")]
#[OA\Tag(name: "7. Hospital Settings (Hospital Admin)", description: "Hospital Admin Panel — Manage Hospital-level Settings (UHID Format, General, Billing, Notifications)")]
#[OA\Tag(name: "8. Super Admin (Platform)", description: "Super Admin Platform Management — Hospital Onboarding & Platform Controls")]
#[OA\Tag(name: "8. Departments & Doctors", description: "Hospital Admin — Department & Doctor Setup")]
#[OA\Tag(name: "9. Patients", description: "Patient Records Management")]
#[OA\Tag(name: "11. ABDM Webhooks", description: "Incoming Webhooks from ABDM (Scan & Share)")]
#[OA\Tag(name: "12. Storage", description: "File Upload/Download via R2/S3")]
#[OA\Tag(name: "13. Lab — Orders & Billing", description: "Laboratory Worklist, Direct Walk-In Booking & Invoicing")]
#[OA\Tag(name: "14. Lab — Phlebotomy & Queue", description: "Sample Collection, Accessioning Barcodes, Booth Calling & Rejection")]
#[OA\Tag(name: "15. Lab — Results & Pathology", description: "Result Entry, Delta Checks, Approvals & Authorization")]
#[OA\Tag(name: "16. Lab — Test Catalog Master", description: "281+ Pathology Tests Master, Parameters & Reference Intervals")]
#[OA\Tag(name: "17. Lab — Diagnostic Reports", description: "Printable Diagnostic Reports & Public QR Verification")]
#[OA\Tag(name: "18. Inpatient Department (IPD) & Wards", description: "Wards, Beds, Admissions, Transfers & Nursing Station")]
#[OA\Tag(name: "19. Hospital Billing & Tariff", description: "Charge Masters, Ledger & Billing Operations")]

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
