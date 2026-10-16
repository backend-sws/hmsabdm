<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;

use Illuminate\Http\Request;
use App\Services\Patient\PatientServiceInterface;
use App\Http\Traits\HasApiResponse;
use App\Http\Resources\PatientResource;
use OpenApi\Attributes as OA;

class PatientController extends Controller
{
    use HasApiResponse;

    protected PatientServiceInterface $patientService;

    public function __construct(PatientServiceInterface $patientService)
    {
        $this->patientService = $patientService;
    }

    #[OA\Get(
        path: "/api/v1/patients",
        summary: "Get all patients",
        description: "Retrieves a list of all patients registered in the hospital. Supports search by name, mobile, ABHA number/address, and pagination.",
        tags: ["9. Patients"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Parameter(name: "search", in: "query", description: "Search by patient name, mobile, email, ABHA number, or ABHA address", required: false, schema: new OA\Schema(type: "string"))]
    #[OA\Parameter(name: "per_page", in: "query", description: "Number of items per page (default: 15)", required: false, schema: new OA\Schema(type: "integer", example: 15))]
    #[OA\Parameter(name: "page", in: "query", description: "Page number", required: false, schema: new OA\Schema(type: "integer", example: 1))]
    #[OA\Parameter(name: "sort", in: "query", description: "Sort by field (e.g., name, created_at, -created_at)", required: false, schema: new OA\Schema(type: "string", example: "-created_at"))]
    #[OA\Response(response: 200, description: "List of patients retrieved successfully")]
    public function index(Request $request)
    {
        $patients = $this->patientService->getAllPatients($request);
        $resource = PatientResource::collection($patients)->response()->getData(true);
        return $this->successResponse($resource, 'Patients retrieved successfully');
    }

    #[OA\Get(
        path: "/api/v1/patients/stats",
        summary: "Get aggregate patient statistics",
        description: "Retrieves aggregate counts for total registered, male, female, other, and ABHA linked patients across the hospital.",
        tags: ["9. Patients"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Response(response: 200, description: "Patient statistics retrieved successfully")]
    public function stats(Request $request)
    {
        $stats = $this->patientService->getPatientStats($request);
        return $this->successResponse($stats, 'Patient statistics retrieved successfully');
    }


    #[OA\Post(
        path: "/api/v1/patients",
        summary: "Register a new patient",
        description: "Manually registers a new patient with their ABHA number. Useful for manual data entry.",
        tags: ["9. Patients"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ["name"],
            properties: [
                new OA\Property(property: "name", type: "string", example: "John Doe"),
                new OA\Property(property: "guardian_name", type: "string", example: "Robert Doe", description: "Father / Mother / Spouse / Guardian Name"),
                new OA\Property(property: "guardian_relation", type: "string", example: "Father", description: "Relation (Father, Mother, Spouse, etc.)"),
                new OA\Property(property: "guardian_phone", type: "string", example: "9876500000"),
                new OA\Property(property: "id_proof_type", type: "string", enum: ["aadhaar", "pan", "voter_id", "driving_license", "passport", "ration_card", "other"], example: "pan", description: "Identity Proof Type"),
                new OA\Property(property: "id_proof_number", type: "string", example: "ABCDE1234F", description: "Identity Card / Proof Number"),
                new OA\Property(property: "mobile", type: "string", example: "9876543210"),
                new OA\Property(property: "abha_number", type: "string", example: "12-3456-7890-1234"),
                new OA\Property(property: "email", type: "string", format: "email", example: "john@example.com"),
                new OA\Property(property: "abha_address", type: "string", example: "johndoe@abdm"),
                new OA\Property(property: "dob", type: "string", format: "date", example: "1990-05-25"),
                new OA\Property(property: "gender", type: "string", example: "M"),
                new OA\Property(property: "blood_group", type: "string", example: "O+"),
                new OA\Property(property: "address", type: "string", example: "123 Main St, Appt 4B"),
                new OA\Property(property: "city", type: "string", example: "New Delhi"),
                new OA\Property(property: "district", type: "string", example: "Central Delhi"),
                new OA\Property(property: "state", type: "string", example: "Delhi"),
                new OA\Property(property: "pincode", type: "string", example: "110001"),
                new OA\Property(property: "photo", type: "string", example: "data:image/jpeg;base64,..."),
                new OA\Property(
                    property: "custom_fields",
                    type: "object",
                    description: "Dynamic custom fields configured by the hospital",
                    example: ["marital_status" => "Married", "occupation" => "Engineer", "emergency_contact_name" => "Jane Doe"]
                )
            ]
        )
    )]
    #[OA\Response(response: 201, description: "Patient registered successfully")]
    #[OA\Response(response: 422, description: "Validation Error")]
    public function store(Request $request)
    {
        $data = $request->validate([
            'name'              => 'required|string|max:255',
            'guardian_name'     => 'nullable|string|max:255',
            'guardian_relation' => 'nullable|string|max:50',
            'guardian_phone'    => 'nullable|string|max:20',
            'id_proof_type'     => 'nullable|string|in:aadhaar,pan,voter_id,driving_license,passport,ration_card,other',
            'id_proof_number'   => 'nullable|string|max:100',
            'mobile'            => 'nullable|string|max:15',
            'abha_number'       => 'nullable|string|unique:patients,abha_number',
            'email'             => 'nullable|email|unique:patients,email',
            'abha_address'      => 'nullable|string|max:255',
            'dob'               => 'nullable|date',
            'gender'            => 'nullable|string|in:M,F,O',
            'blood_group'       => 'nullable|string|max:5',
            'address'           => 'nullable|string',
            'city'              => 'nullable|string|max:100',
            'district'          => 'nullable|string|max:100',
            'state'             => 'nullable|string|max:100',
            'pincode'           => 'nullable|string|max:20',
            'photo'             => 'nullable|string',
            'kyc_verified'      => 'nullable|boolean',
            'custom_fields'     => 'nullable|array',
            'abha_card_pdf'     => 'nullable|string',
            'abha_card_base64'  => 'nullable|string',
        ]);

        if (!empty($data['abha_card_base64'])) {
            $data['abha_card_pdf'] = $data['abha_card_base64'];
            unset($data['abha_card_base64']);
        }

        $data['hospital_id'] = $this->getHospitalId($request);

        $patient = $this->patientService->registerPatient($data);

        return $this->createdResponse(new PatientResource($patient), 'Patient registered successfully');
    }

    #[OA\Get(
        path: "/api/v1/patients/{id}",
        summary: "Get specific Patient details by ID",
        description: "Retrieves complete demographic and latest vitals details of a patient.",
        tags: ["9. Patients"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Patient details retrieved successfully")]
    #[OA\Response(response: 404, description: "Patient not found")]
    public function show($id)
    {
        $patient = $this->patientService->getPatientById($id);
        return $this->successResponse(new PatientResource($patient->load('latestVital')), 'Patient details retrieved successfully');
    }

    #[OA\Put(
        path: "/api/v1/patients/{id}",
        summary: "Update patient demographic information",
        description: "Updates an existing patient's details such as name, guardian, ID proof, contact, address, DOB, gender, blood group, ABHA, or custom fields.",
        tags: ["9. Patients"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: "name", type: "string", example: "John Doe Updated"),
                new OA\Property(property: "guardian_name", type: "string", example: "Robert Doe"),
                new OA\Property(property: "guardian_relation", type: "string", example: "Father"),
                new OA\Property(property: "guardian_phone", type: "string", example: "9876500000"),
                new OA\Property(property: "id_proof_type", type: "string", enum: ["aadhaar", "pan", "voter_id", "driving_license", "passport", "ration_card", "other"], example: "pan"),
                new OA\Property(property: "id_proof_number", type: "string", example: "ABCDE1234F"),
                new OA\Property(property: "mobile", type: "string", example: "9876543210"),
                new OA\Property(property: "abha_number", type: "string", example: "12-3456-7890-1234"),
                new OA\Property(property: "email", type: "string", format: "email", example: "john@example.com"),
                new OA\Property(property: "abha_address", type: "string", example: "johndoe@abdm"),
                new OA\Property(property: "dob", type: "string", format: "date", example: "1990-05-25"),
                new OA\Property(property: "gender", type: "string", example: "M"),
                new OA\Property(property: "blood_group", type: "string", example: "O+"),
                new OA\Property(property: "address", type: "string", example: "123 Main St, Appt 4B"),
                new OA\Property(property: "city", type: "string", example: "New Delhi"),
                new OA\Property(property: "district", type: "string", example: "Central Delhi"),
                new OA\Property(property: "state", type: "string", example: "Delhi"),
                new OA\Property(property: "pincode", type: "string", example: "110001"),
                new OA\Property(property: "photo", type: "string", example: "data:image/jpeg;base64,..."),
                new OA\Property(
                    property: "custom_fields",
                    type: "object",
                    description: "Dynamic custom fields configured by the hospital",
                    example: ["marital_status" => "Married", "occupation" => "Engineer"]
                )
            ]
        )
    )]
    #[OA\Response(response: 200, description: "Patient updated successfully")]
    #[OA\Response(response: 422, description: "Validation Error")]
    #[OA\Response(response: 404, description: "Patient not found")]
    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'name'              => 'sometimes|required|string|max:255',
            'guardian_name'     => 'nullable|string|max:255',
            'guardian_relation' => 'nullable|string|max:50',
            'guardian_phone'    => 'nullable|string|max:20',
            'id_proof_type'     => 'nullable|string|in:aadhaar,pan,voter_id,driving_license,passport,ration_card,other',
            'id_proof_number'   => 'nullable|string|max:100',
            'mobile'            => 'nullable|string|max:15',
            'abha_number'       => 'nullable|string|unique:patients,abha_number,' . $id,
            'email'             => 'nullable|email|unique:patients,email,' . $id,
            'abha_address'      => 'nullable|string|max:255',
            'dob'               => 'nullable|date',
            'gender'            => 'nullable|string|in:M,F,O',
            'blood_group'       => 'nullable|string|max:5',
            'address'           => 'nullable|string',
            'city'              => 'nullable|string|max:100',
            'district'          => 'nullable|string|max:100',
            'state'             => 'nullable|string|max:100',
            'pincode'           => 'nullable|string|max:20',
            'photo'             => 'nullable|string',
            'kyc_verified'      => 'nullable|boolean',
            'custom_fields'     => 'nullable|array',
            'abha_card_pdf'     => 'nullable|string',
            'abha_card_base64'  => 'nullable|string',
        ]);

        if (!empty($validated['abha_card_base64'])) {
            $validated['abha_card_pdf'] = $validated['abha_card_base64'];
            unset($validated['abha_card_base64']);
        }

        $patient = $this->patientService->updatePatient((int) $id, $validated);

        return $this->successResponse(new PatientResource($patient), 'Patient updated successfully');
    }

    #[OA\Delete(
        path: "/api/v1/patients/{id}",
        summary: "Delete a Patient record",
        tags: ["9. Patients"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Patient deleted successfully")]
    #[OA\Response(response: 404, description: "Patient not found")]
    public function destroy($id)
    {
        $this->patientService->deletePatient((int) $id);
        return $this->successResponse(null, 'Patient deleted successfully');
    }

    #[OA\Get(
        path: "/api/v1/patients/{id}/history",
        summary: "Get 360-degree patient medical history and chronological timeline",
        description: "Fetches unified chronological timeline across OPD visits, IPD admissions, e-prescriptions, vitals recordings, and billing summary.",
        tags: ["9. Patients"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Patient 360 history retrieved successfully")]
    #[OA\Response(response: 404, description: "Patient not found")]
    public function history(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $history = $this->patientService->getPatientHistory((int) $id, $hospitalId);
        return $this->successResponse($history, 'Patient 360 history retrieved successfully');
    }

    #[OA\Get(
        path: "/api/v1/patients/{id}/abha-card",
        summary: "Get Official ABHA Card PDF for Patient from Database",
        description: "Returns the stored official NHA ABHA Card PDF for this patient directly from PostgreSQL DB. Card is only stored when downloaded from ABDM API.",
        tags: ["9. Patients"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Response(response: 200, description: "Official ABHA card retrieved")]
    public function getAbhaCard(Request $request, $id)
    {
        $patient = null;
        if (!empty($id) && $id !== '0' && $id !== 'lookup') {
            $patient = \App\Models\Patient::where('id', is_numeric($id) ? (int)$id : 0)
                ->orWhere('uhid', $id)
                ->orWhere('abha_number', $id)
                ->orWhere('mobile', $id)
                ->first();
        }

        if (!$patient) {
            if ($request->filled('abha_number')) {
                $patient = \App\Models\Patient::where('abha_number', $request->query('abha_number'))->first();
            } elseif ($request->filled('mobile')) {
                $patient = \App\Models\Patient::where('mobile', $request->query('mobile'))->first();
            } elseif ($request->filled('uhid')) {
                $patient = \App\Models\Patient::where('uhid', $request->query('uhid'))->first();
            }
        }

        if (!$patient) {
            return $this->errorResponse('Patient record not found in database.', null, 404);
        }

        // 1. Direct from PostgreSQL DB column (only official ABDM-issued card)
        $base64 = $patient->abha_card_pdf;

        // Discard any stale custom Dompdf output
        if (!empty($base64)) {
            $decoded = base64_decode($base64, true);
            if ($decoded !== false) {
                $clean = str_replace("\0", "", $decoded);
                if (stripos($clean, 'dompdf') !== false || stripos($clean, 'CPDF') !== false) {
                    $patient->update(['abha_card_pdf' => null]);
                    $base64 = null;
                }
            }
        }

        // 2. If token was passed and DB doesn't have it, try downloading from NHA and saving to DB
        if (empty($base64) && $request->filled('token')) {
            try {
                $token = $request->query('token');
                $abdmService = app(\App\Services\Abdm\AbdmServiceInterface::class);
                $rawToken = trim(str_replace('Bearer ', '', $token));
                $jwtParts = explode('.', $rawToken);
                if (count($jwtParts) === 3) {
                    $jwtPayload = json_decode(base64_decode(strtr($jwtParts[1], '-_', '+/')), true);
                    if (($jwtPayload['typ'] ?? '') === 'Transfer' && $request->filled('txnId') && !empty($patient->abha_number)) {
                        $verifyRes = $abdmService->verifyUser($rawToken, $request->query('txnId'), $patient->abha_number);
                        if (!empty($verifyRes['token'])) {
                            $token = $verifyRes['token'];
                        }
                    }
                }
                $cardRes = $abdmService->downloadAbhaCard($token);
                if (!empty($cardRes['data'])) {
                    $base64 = $cardRes['data'];
                    $patient->update(['abha_card_pdf' => $base64]);
                }
            } catch (\Exception $e) {
                \Log::warning("Could not fetch NHA card via token for patient {$patient->id}: " . $e->getMessage());
            }
        }

        // NOTE: No custom PDF generation — only official ABDM-issued card is served.
        // If card not in DB, patient must download it from ABDM first via /api/v1/abha/card
        if (empty($base64)) {
            return $this->errorResponse(
                'Official ABHA Card not yet downloaded from ABDM. Please use the Download Card button first.',
                null,
                404
            );
        }

        // Normalise: unwrap accidental double-encoding
        $binary = base64_decode($base64);
        if (str_starts_with($binary, 'JVBER') || str_starts_with($binary, '"JVBER') || str_starts_with($binary, 'iVBOR')) {
            $binary = base64_decode(trim($binary, '"'));
            $base64 = base64_encode($binary);
            $patient->update(['abha_card_pdf' => $base64]);
        }

        if ($request->query('format') === 'base64' || $request->header('Accept') === 'application/json') {
            return $this->successResponse(['data' => $base64], 'Official ABHA Card retrieved from database');
        }

        if (str_starts_with($binary, '%PDF')) {
            return response($binary, 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'inline; filename="official_abha_card.pdf"',
            ]);
        }

        // If binary is an authentic government image (PNG/JPEG), convert to 1-page PDF preserving the exact image
        $mime = str_starts_with($binary, "\x89PNG") ? 'image/png' : 'image/jpeg';
        $b64Img = base64_encode($binary);
        $html = '<!DOCTYPE html><html><head><style>@page { margin: 0; size: 500pt 315pt; } body { margin: 0; padding: 0; background: #ffffff; text-align: center; } img { width: 100%; height: auto; display: block; }</style></head><body><img src="data:' . $mime . ';base64,' . $b64Img . '" /></body></html>';

        $options = new \Dompdf\Options();
        $options->set('isRemoteEnabled', true);
        $dompdf = new \Dompdf\Dompdf($options);
        $dompdf->loadHtml($html);
        $dompdf->setPaper([0, 0, 500, 315], 'portrait');
        $dompdf->render();

        return response($dompdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="official_abha_card.pdf"',
        ]);
    }

    #[OA\Post(
        path: "/api/v1/patients/{id}/abha-card",
        summary: "Store Official ABHA Card PDF in PostgreSQL DB",
        description: "Saves official Base64 PDF card for patient directly into database column.",
        tags: ["9. Patients"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Response(response: 200, description: "Official ABHA card saved")]
    public function saveAbhaCard(Request $request, $id)
    {
        $request->validate([
            'card_base64' => 'required|string',
        ]);

        $patient = null;
        if (!empty($id) && $id !== '0') {
            $patient = \App\Models\Patient::where('id', is_numeric($id) ? (int)$id : 0)
                ->orWhere('uhid', $id)
                ->orWhere('abha_number', $id)
                ->orWhere('mobile', $id)
                ->first();
        }

        if (!$patient && $request->filled('abha_number')) {
            $patient = \App\Models\Patient::where('abha_number', $request->input('abha_number'))->first();
        }
        if (!$patient && $request->filled('mobile')) {
            $patient = \App\Models\Patient::where('mobile', $request->input('mobile'))->first();
        }

        if (!$patient) {
            return $this->errorResponse('Patient not found', null, 404);
        }

        $raw = trim($request->input('card_base64'));

        // Ensure $raw is safe base64 string for PostgreSQL
        if (!preg_match('~^[a-zA-Z0-9+/=\s]+$~', $raw)) {
            $raw = base64_encode($raw);
        }

        $binary = base64_decode($raw, true);
        if ($binary !== false && (str_starts_with($binary, 'JVBER') || str_starts_with($binary, '"JVBER') || str_starts_with($binary, 'iVBOR'))) {
            $raw = trim($binary, '"');
        }

        // Store directly in PostgreSQL DB
        $patient->update(['abha_card_pdf' => $raw]);

        return $this->successResponse(['stored_in_db' => true], 'Official ABHA Card saved in database');
    }

    #[OA\Post(
        path: "/api/v1/patients/{id}/link-abha",
        summary: "Link existing patient with ABHA account",
        description: "Links an existing hospital patient to their official ABHA Number / Address, downloads their authentic card if token is passed, and marks kyc_verified.",
        tags: ["9. Patients"],
        security: [["bearerAuth" => []]]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ["abha_number"],
            properties: [
                new OA\Property(property: "abha_number", type: "string", example: "91-1234-5678-9012"),
                new OA\Property(property: "abha_address", type: "string", example: "ramesh@sbx"),
                new OA\Property(property: "token", type: "string", description: "Optional: ABDM transaction token to auto-fetch card"),
                new OA\Property(property: "txnId", type: "string", description: "Optional: ABDM txnId"),
                new OA\Property(property: "abha_card_base64", type: "string", description: "Optional: Pre-fetched base64 card"),
                new OA\Property(property: "photo", type: "string"),
                new OA\Property(property: "address", type: "string"),
                new OA\Property(property: "city", type: "string"),
                new OA\Property(property: "district", type: "string"),
                new OA\Property(property: "state", type: "string"),
                new OA\Property(property: "pincode", type: "string")
            ]
        )
    )]
    #[OA\Response(response: 200, description: "Patient linked to ABHA successfully")]
    #[OA\Response(response: 422, description: "Validation error or ABHA conflict")]
    #[OA\Response(response: 404, description: "Patient not found")]
    public function linkAbha(Request $request, $id)
    {
        $validated = $request->validate([
            'abha_number'      => 'required|string',
            'abha_address'     => 'nullable|string',
            'token'            => 'nullable|string',
            'txnId'            => 'nullable|string',
            'abha_card_base64' => 'nullable|string',
            'photo'            => 'nullable|string',
            'address'          => 'nullable|string',
            'city'             => 'nullable|string',
            'district'         => 'nullable|string',
            'state'            => 'nullable|string',
            'pincode'          => 'nullable|string',
        ]);

        // Auto-fetch authentic card from ABDM if token is provided and card not sent
        if (empty($validated['abha_card_base64']) && !empty($validated['token'])) {
            try {
                $token = $validated['token'];
                $abdmService = app(\App\Services\Abdm\AbdmServiceInterface::class);
                $rawToken = trim(str_replace('Bearer ', '', $token));
                $jwtParts = explode('.', $rawToken);
                if (count($jwtParts) === 3) {
                    $jwtPayload = json_decode(base64_decode(strtr($jwtParts[1], '-_', '+/')), true);
                    if (($jwtPayload['typ'] ?? '') === 'Transfer' && !empty($validated['txnId'])) {
                        $verifyRes = $abdmService->verifyUser($rawToken, $validated['txnId'], $validated['abha_number']);
                        if (!empty($verifyRes['token'])) {
                            $token = $verifyRes['token'];
                        }
                    }
                }
                $cardRes = $abdmService->downloadAbhaCard($token);
                if (!empty($cardRes['data'])) {
                    $validated['abha_card_base64'] = $cardRes['data'];
                }
            } catch (\Exception $e) {
                \Log::warning("linkAbha: auto-card download note: " . $e->getMessage());
            }
        }

        try {
            $patient = $this->patientService->linkAbha((int) $id, $validated);
            return $this->successResponse(new PatientResource($patient), 'Patient successfully linked to ABHA');
        } catch (\InvalidArgumentException $e) {
            return $this->errorResponse($e->getMessage(), null, 422);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), null, 500);
        }
    }
}

