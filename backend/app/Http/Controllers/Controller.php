<?php

namespace App\Http\Controllers;

use OpenApi\Attributes as OA;

#[OA\Info(
    version: "1.0.0",
    title: "HMS ABDM Integration API",
    description: <<<EOT
# HMS & ABDM Integration Guide

Welcome to the API Documentation! This guide will help frontend developers understand exactly how to integrate the different workflows.

### 1. Authentication (Step 0)
- Call **`POST /api/v1/login`** with your credentials to get a Bearer Token.
- Pass this token in the `Authorization: Bearer <token>` header for all subsequent API requests.

### 2. ABHA Creation & Login (Patient Registration)
There are two main flows for handling ABHA (Ayushman Bharat Health Account):

#### Flow A: Patient already has ABHA (Mobile OTP Login)
1. **`POST /api/v1/abha/generate-otp`**: Send patient's mobile number.
2. **`POST /api/v1/abha/verify-otp`**: Verify the OTP using `txnId` received in the first step.
3. **`GET /api/v1/abha/profile`**: Fetch patient's ABHA profile details using the token.
4. Finally, use **`POST /api/v1/reception/register`** to save the patient in our hospital database.

#### Flow B: Create New ABHA (Aadhaar Enrolment)
1. **`POST /api/v1/abha/enrol/aadhaar-otp`**: Send Aadhaar number.
2. **`POST /api/v1/abha/enrol/verify-aadhaar`**: Verify Aadhaar OTP + Mobile Number.
3. **`POST /api/v1/abha/enrol/mobile-otp`**: Send Mobile OTP for linking.
4. **`POST /api/v1/abha/enrol/verify-mobile`**: Verify the Mobile OTP.
5. **`GET /api/v1/abha/enrol/suggest-address`**: Get ABHA address (username) suggestions.
6. **`POST /api/v1/abha/enrol/create-address`**: Finalize the ABHA address.

### 3. Walk-in & OPD Visit (Reception)
Once a patient is registered in the system:
1. **`GET /api/v1/reception/departments`**: Fetch active departments & doctors.
2. **`POST /api/v1/reception/visit`**: Create an OPD visit (appointment) for the patient and assign them to a doctor.

### 4. Scan & Share (ABDM Fast-track)
If a patient scans the hospital's QR code using an ABDM app (like ABHA App):
1. A webhook (`/webhook/abdm/v1/scan-and-share`) automatically receives patient details and adds them to a queue.
2. **`GET /api/v1/reception/scan-and-share/queues`**: Receptionist views the waiting queue.
3. **`POST /api/v1/reception/scan-and-share/token`**: Receptionist can search a specific token.
4. **`POST /api/v1/reception/scan-and-share/confirm`**: Receptionist confirms the patient and creates an OPD Visit.

### 5. Doctor's Panel (OPD)
1. **`GET /api/v1/opd/queue`**: Doctor views their patient queue for today.
2. **`POST /api/v1/opd/visit/{visitId}/call`**: Doctor calls the patient in.
3. **`POST /api/v1/opd/visit/{visitId}/complete`**: Doctor finishes the consultation and saves diagnosis/notes.
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
