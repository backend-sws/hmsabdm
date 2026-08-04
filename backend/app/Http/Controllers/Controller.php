<?php

namespace App\Http\Controllers;

use OpenApi\Attributes as OA;

#[OA\Info(
    version: "1.0.0",
    title: "HMS ABDM Integration API",
    description: "API Documentation for the Hospital Management System with ABDM M1 Integration"
)]
#[OA\Server(
    url: "http://localhost:8000",
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
