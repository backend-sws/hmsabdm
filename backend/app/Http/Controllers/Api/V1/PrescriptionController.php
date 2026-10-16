<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Traits\HasApiResponse;
use App\Services\Prescription\PrescriptionServiceInterface;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(
    name: "13. E-Prescription & Master Catalogs",
    description: "Doctor E-Prescriptions with WHO ICD-10 Diagnosis Codes and 200,000 Indian Medicines Autocomplete"
)]
class PrescriptionController extends Controller
{
    use HasApiResponse;

    public function __construct(
        protected PrescriptionServiceInterface $prescriptionService
    ) {}

    // ====================================================
    // 🔍 1. AUTOCOMPLETE SEARCH APIS
    // ====================================================

    #[OA\Get(
        path: "/api/v1/medicines/search",
        summary: "Search Indian Medicines Master (200,000 medicines)",
        description: "Instant autocomplete search by Brand Name, Generic Name, or Salt Composition. Returns dosage forms, strengths, and MRP.",
        security: [["bearerAuth" => []]],
        tags: ["13. E-Prescription & Master Catalogs"]
    )]
    #[OA\Parameter(name: "q", in: "query", description: "Search query (e.g. Augmentin, Paracetamol, Azithral)", required: true, schema: new OA\Schema(type: "string", example: "Augmentin"))]
    #[OA\Parameter(name: "limit", in: "query", description: "Max results (default: 20)", required: false, schema: new OA\Schema(type: "integer", example: 20))]
    #[OA\Response(response: 200, description: "List of matching medicines with salt composition and MRP")]
    public function searchMedicines(Request $request)
    {
        $query = $request->query('q', '');
        $limit = (int) $request->query('limit', 20);

        $results = $this->prescriptionService->searchMedicines($query, $limit);

        return $this->successResponse($results, 'Medicines search results');
    }

    #[OA\Get(
        path: "/api/v1/diagnosis/search",
        summary: "Search WHO ICD-10 Diagnosis Codes (94,765 codes)",
        description: "Instant autocomplete search by ICD-10 code (e.g. A00, E11.9, I10) or disease description (e.g. Cholera, Diabetes, Hypertension).",
        security: [["bearerAuth" => []]],
        tags: ["13. E-Prescription & Master Catalogs"]
    )]
    #[OA\Parameter(name: "q", in: "query", description: "Search query (e.g. Fever, Malaria, E11)", required: true, schema: new OA\Schema(type: "string", example: "Malaria"))]
    #[OA\Parameter(name: "limit", in: "query", description: "Max results (default: 20)", required: false, schema: new OA\Schema(type: "integer", example: 20))]
    #[OA\Response(response: 200, description: "List of matching ICD-10 codes")]
    public function searchDiagnoses(Request $request)
    {
        $query = $request->query('q', '');
        $limit = (int) $request->query('limit', 20);

        $results = $this->prescriptionService->searchDiagnoses($query, $limit);

        return $this->successResponse($results, 'ICD-10 search results');
    }

    #[OA\Get(
        path: "/api/v1/investigations/search",
        summary: "Search Diagnostic Investigations (Lab, Radiology & Cardiology)",
        description: "Autocomplete search across hospital charges master and clinical diagnostic catalog.",
        security: [["bearerAuth" => []]],
        tags: ["13. E-Prescription & Master Catalogs"]
    )]
    #[OA\Parameter(name: "q", in: "query", description: "Search query (e.g. CBC, X-Ray, ECG, USG)", required: false, schema: new OA\Schema(type: "string", example: "CBC"))]
    #[OA\Parameter(name: "category", in: "query", description: "Optional filter: Pathology, Radiology, Cardiology", required: false, schema: new OA\Schema(type: "string", example: "Pathology"))]
    #[OA\Parameter(name: "limit", in: "query", description: "Max results (default: 25)", required: false, schema: new OA\Schema(type: "integer", example: 25))]
    #[OA\Response(response: 200, description: "List of matching diagnostic investigations")]
    public function searchInvestigations(Request $request)
    {
        $query = $request->query('q', '');
        $category = $request->query('category');
        $limit = (int) $request->query('limit', 25);

        $results = $this->prescriptionService->searchInvestigations($query, $category, $limit);

        return $this->successResponse($results, 'Diagnostic investigations search results');
    }

    // ====================================================
    // 📝 2. CREATE PRESCRIPTION
    // ====================================================

    #[OA\Post(
        path: "/api/v1/prescriptions",
        summary: "Create a complete structured E-Prescription",
        description: "Creates an official prescription with chief complaints, clinical notes, structured medicines, and ICD-10 diagnoses. If opd_visit_id is provided, automatically completes the OPD consultation.",
        security: [["bearerAuth" => []]],
        tags: ["13. E-Prescription & Master Catalogs"]
    )]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ["patient_id"],
            properties: [
                new OA\Property(property: "patient_id", type: "integer", example: 1),
                new OA\Property(property: "doctor_id", type: "integer", example: 1, description: "Doctor ID (optional, defaults to auth user's doctor profile)"),
                new OA\Property(property: "opd_visit_id", type: "integer", nullable: true, example: 5),
                new OA\Property(property: "ipd_admission_id", type: "integer", nullable: true, example: null),
                new OA\Property(property: "encounter_type", type: "string", enum: ["opd", "ipd", "emergency"], example: "opd"),
                new OA\Property(
                    property: "chief_complaints",
                    type: "array",
                    items: new OA\Items(type: "string"),
                    example: ["Fever for 3 days", "Productive cough"]
                ),
                new OA\Property(property: "clinical_notes", type: "string", example: "Bilateral chest wheezing, throat congested"),
                new OA\Property(property: "diet_advice", type: "string", example: "Drink warm fluids, light semi-solid diet"),
                new OA\Property(property: "general_advice", type: "string", example: "Strict bed rest for 3 days"),
                new OA\Property(property: "follow_up_date", type: "string", format: "date", example: "2026-09-20"),
                new OA\Property(
                    property: "diagnoses",
                    type: "array",
                    items: new OA\Items(
                        properties: [
                            new OA\Property(property: "icd10_id", type: "integer", nullable: true, example: 52),
                            new OA\Property(property: "icd_code", type: "string", example: "A00.0"),
                            new OA\Property(property: "diagnosis_name", type: "string", example: "Cholera due to Vibrio cholerae 01"),
                            new OA\Property(property: "diagnosis_type", type: "string", enum: ["provisional", "confirmed", "differential"], example: "confirmed"),
                            new OA\Property(property: "notes", type: "string", example: "Acute onset")
                        ]
                    )
                ),
                new OA\Property(
                    property: "items",
                    type: "array",
                    items: new OA\Items(
                        properties: [
                            new OA\Property(property: "medicine_id", type: "integer", nullable: true, example: 1),
                            new OA\Property(property: "medicine_name", type: "string", example: "Augmentin 625 Duo Tablet"),
                            new OA\Property(property: "generic_name", type: "string", example: "Amoxycillin + Clavulanic Acid"),
                            new OA\Property(property: "dosage_form", type: "string", example: "Tablet"),
                            new OA\Property(property: "dosage", type: "string", example: "625mg"),
                            new OA\Property(property: "frequency", type: "string", example: "1-0-1"),
                            new OA\Property(property: "duration_days", type: "integer", example: 5),
                            new OA\Property(property: "timing", type: "string", example: "After Food"),
                            new OA\Property(property: "instructions", type: "string", example: "Complete 5-day course")
                        ]
                    )
                )
            ]
        )
    )]
    #[OA\Response(response: 201, description: "Prescription created successfully")]
    public function store(Request $request)
    {
        // 1. Normalize chief_complaints to ensure it is always an array
        if ($request->has('chief_complaints')) {
            $cc = $request->input('chief_complaints');
            if (is_string($cc)) {
                $raw = trim($cc);
                if ($raw === '') {
                    $request->merge(['chief_complaints' => []]);
                } else {
                    $split = preg_split('/[\r\n,;]+/', $raw, -1, PREG_SPLIT_NO_EMPTY);
                    $request->merge(['chief_complaints' => array_values(array_map('trim', $split ?: [$raw]))]);
                }
            } elseif ($cc === null) {
                $request->merge(['chief_complaints' => []]);
            }
        }

        // 2. Normalize opd_visit_id from visit_id alias if provided
        if (!$request->has('opd_visit_id') && $request->has('visit_id')) {
            $request->merge(['opd_visit_id' => $request->input('visit_id')]);
        }

        // 3. Normalize items from medicines array alias if provided
        if (!$request->has('items') && $request->has('medicines') && is_array($request->input('medicines'))) {
            $items = array_map(function ($med) {
                return [
                    'medicine_id'   => $med['medicine_id'] ?? null,
                    'medicine_name' => $med['medicine_name'] ?? $med['name'] ?? '',
                    'dosage'        => $med['dosage'] ?? null,
                    'dosage_form'   => $med['dosage_form'] ?? $med['form'] ?? 'Tablet',
                    'frequency'     => $med['frequency'] ?? 'OD',
                    'duration_days' => isset($med['duration_days']) ? (int) $med['duration_days'] : (isset($med['duration']) ? (int) filter_var($med['duration'], FILTER_SANITIZE_NUMBER_INT) : 5),
                    'timing'        => $med['instructions'] ?? $med['timing'] ?? null,
                    'instructions'  => $med['instructions'] ?? null,
                ];
            }, $request->input('medicines'));
            $request->merge(['items' => $items]);
        }

        // 4. Normalize diagnoses from diagnosis_codes array alias if provided
        if (!$request->has('diagnoses') && $request->has('diagnosis_codes') && is_array($request->input('diagnosis_codes'))) {
            $diagnoses = array_map(function ($diag) {
                return [
                    'icd_code'       => $diag['code'] ?? $diag['icd_code'] ?? null,
                    'diagnosis_name' => $diag['name'] ?? $diag['diagnosis_name'] ?? ($diag['code'] ?? 'Diagnosis'),
                    'diagnosis_type' => $diag['type'] ?? 'provisional',
                ];
            }, $request->input('diagnosis_codes'));
            $request->merge(['diagnoses' => $diagnoses]);
        }

        $validated = $request->validate([
            'patient_id'         => 'required|integer|exists:patients,id',
            'doctor_id'          => 'nullable|integer|exists:doctors,id',
            'opd_visit_id'       => 'nullable|integer|exists:opd_visits,id',
            'ipd_admission_id'   => 'nullable|integer|exists:ipd_admissions,id',
            'encounter_type'     => 'nullable|string|in:opd,ipd,emergency',
            'chief_complaints'   => 'nullable|array',
            'chief_complaints.*' => 'string',
            'clinical_notes'     => 'nullable|string',
            'diet_advice'        => 'nullable|string',
            'general_advice'     => 'nullable|string',
            'follow_up_date'     => 'nullable|date',
            'disposition'        => 'nullable|string|in:home,day_care,admit_ipd',
            'disposition_notes'  => 'nullable|string',
            'admit_priority'     => 'nullable|string|in:routine,urgent,emergency',
            'recommended_ward'   => 'nullable|string|max:100',
            'status'             => 'nullable|string|in:draft,active',

            'items'                 => 'nullable|array',
            'items.*.medicine_id'   => 'nullable|integer|exists:medicines_master,id',
            'items.*.medicine_name' => 'required_with:items|string|max:255',
            'items.*.generic_name'  => 'nullable|string|max:255',
            'items.*.dosage_form'   => 'nullable|string|max:100',
            'items.*.dosage'        => 'nullable|string|max:100',
            'items.*.frequency'     => 'nullable|string|max:50',
            'items.*.duration_days' => 'nullable|integer|min:1',
            'items.*.timing'        => 'nullable|string|max:100',
            'items.*.instructions'  => 'nullable|string|max:255',

            'diagnoses'                  => 'nullable|array',
            'diagnoses.*.icd10_id'       => 'nullable|integer|exists:icd10_codes,id',
            'diagnoses.*.icd_code'       => 'nullable|string|max:20',
            'diagnoses.*.diagnosis_name' => 'required_with:diagnoses|string|max:500',
            'diagnoses.*.diagnosis_type' => 'nullable|string|in:provisional,confirmed,differential',
            'diagnoses.*.notes'          => 'nullable|string',

            'investigations'                       => 'nullable|array',
            'investigations.*.test_name'           => 'required_with:investigations|string|max:255',
            'investigations.*.name'                => 'nullable|string|max:255',
            'investigations.*.test_code'           => 'nullable|string|max:100',
            'investigations.*.code'                => 'nullable|string|max:100',
            'investigations.*.category'            => 'nullable|string|max:100',
            'investigations.*.urgency'             => 'nullable|string|in:routine,urgent,stat,Routine,Urgent,STAT',
            'investigations.*.standard_rate'       => 'nullable|numeric|min:0',
            'investigations.*.clinical_indication' => 'nullable|string|max:500',
        ]);

        $hospitalId = $this->getHospitalId($request);

        // Resolve doctor_id reliably:
        $doctorId = $validated['doctor_id'] ?? null;

        // 1. If not provided or invalid, resolve from the assigned OPD visit
        if (!$doctorId && !empty($validated['opd_visit_id'])) {
            $visit = \App\Models\OpdVisit::where('hospital_id', $hospitalId)->find($validated['opd_visit_id']);
            if ($visit && !empty($visit->doctor_id)) {
                $doctorId = $visit->doctor_id;
            }
        }

        // 2. If not provided, resolve from the IPD admission
        if (!$doctorId && !empty($validated['ipd_admission_id'])) {
            $admission = \App\Models\IpdAdmission::where('hospital_id', $hospitalId)->find($validated['ipd_admission_id']);
            if ($admission && !empty($admission->doctor_id)) {
                $doctorId = $admission->doctor_id;
            }
        }

        // 3. If authenticated user is a doctor, use their profile
        if (!$doctorId) {
            $user = $request->user();
            $doc = \App\Models\Doctor::where('hospital_id', $hospitalId)->where('user_id', $user->id)->first();
            if ($doc) {
                $doctorId = $doc->id;
            }
        }

        // 4. Verify that doctorId actually exists for this hospital
        if ($doctorId && !\App\Models\Doctor::where('hospital_id', $hospitalId)->where('id', $doctorId)->exists()) {
            $doctorId = null;
        }

        // 5. Fallback: find any active doctor belonging to this hospital
        if (!$doctorId) {
            $doctorId = \App\Models\Doctor::where('hospital_id', $hospitalId)->where('is_active', true)->value('id')
                     ?? \App\Models\Doctor::where('hospital_id', $hospitalId)->value('id');
        }

        // 6. Extreme fallback: if hospital has 0 doctors registered, auto-create a default doctor
        if (!$doctorId) {
            $user = $request->user();
            $defaultDept = \App\Models\Department::firstOrCreate(
                ['hospital_id' => $hospitalId, 'name' => 'General Medicine'],
                ['code' => 'GEN-MED', 'is_active' => true]
            );
            $defaultDoc = \App\Models\Doctor::create([
                'hospital_id'   => $hospitalId,
                'user_id'       => $user->id,
                'department_id' => $defaultDept->id,
                'name'          => $user->name ?: 'Duty Medical Officer',
                'qualification' => 'MBBS',
                'is_active'     => true,
            ]);
            $doctorId = $defaultDoc->id;
        }

        $prescription = $this->prescriptionService->createPrescription($hospitalId, $doctorId, $validated);

        return $this->createdResponse($prescription, 'E-Prescription created successfully');
    }

    #[OA\Put(
        path: "/api/v1/prescriptions/{id}",
        summary: "Update existing E-Prescription (Draft or Signed)",
        description: "Updates prescription medicines, diagnoses, complaints, and advice. Allows saving drafts or updating finalized prescriptions.",
        security: [["bearerAuth" => []]],
        tags: ["13. E-Prescription & Master Catalogs"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Prescription updated successfully")]
    public function update(Request $request, $id)
    {
        // 1. Normalize chief_complaints
        if ($request->has('chief_complaints')) {
            $cc = $request->input('chief_complaints');
            if (is_string($cc)) {
                $raw = trim($cc);
                if ($raw === '') {
                    $request->merge(['chief_complaints' => []]);
                } else {
                    $split = preg_split('/[\r\n,;]+/', $raw, -1, PREG_SPLIT_NO_EMPTY);
                    $request->merge(['chief_complaints' => array_values(array_map('trim', $split ?: [$raw]))]);
                }
            } elseif ($cc === null) {
                $request->merge(['chief_complaints' => []]);
            }
        }

        // 2. Normalize items from medicines
        if (!$request->has('items') && $request->has('medicines') && is_array($request->input('medicines'))) {
            $items = array_map(function ($med) {
                return [
                    'medicine_id'   => $med['medicine_id'] ?? null,
                    'medicine_name' => $med['medicine_name'] ?? $med['name'] ?? '',
                    'dosage'        => $med['dosage'] ?? null,
                    'dosage_form'   => $med['dosage_form'] ?? $med['form'] ?? 'Tablet',
                    'frequency'     => $med['frequency'] ?? 'OD',
                    'duration_days' => isset($med['duration_days']) ? (int) $med['duration_days'] : (isset($med['duration']) ? (int) filter_var($med['duration'], FILTER_SANITIZE_NUMBER_INT) : 5),
                    'timing'        => $med['instructions'] ?? $med['timing'] ?? null,
                    'instructions'  => $med['instructions'] ?? null,
                ];
            }, $request->input('medicines'));
            $request->merge(['items' => $items]);
        }

        // 3. Normalize diagnoses from diagnosis_codes
        if (!$request->has('diagnoses') && $request->has('diagnosis_codes') && is_array($request->input('diagnosis_codes'))) {
            $diagnoses = array_map(function ($diag) {
                return [
                    'icd_code'       => $diag['code'] ?? $diag['icd_code'] ?? null,
                    'diagnosis_name' => $diag['name'] ?? $diag['diagnosis_name'] ?? ($diag['code'] ?? 'Diagnosis'),
                    'diagnosis_type' => $diag['type'] ?? 'provisional',
                ];
            }, $request->input('diagnosis_codes'));
            $request->merge(['diagnoses' => $diagnoses]);
        }

        $validated = $request->validate([
            'chief_complaints'   => 'nullable|array',
            'chief_complaints.*' => 'string',
            'clinical_notes'     => 'nullable|string',
            'diet_advice'        => 'nullable|string',
            'general_advice'     => 'nullable|string',
            'follow_up_date'     => 'nullable|date',
            'disposition'        => 'nullable|string|in:home,day_care,admit_ipd',
            'disposition_notes'  => 'nullable|string',
            'admit_priority'     => 'nullable|string|in:routine,urgent,emergency',
            'recommended_ward'   => 'nullable|string|max:100',
            'status'             => 'nullable|string|in:draft,active',

            'items'                 => 'nullable|array',
            'items.*.medicine_id'   => 'nullable|integer|exists:medicines_master,id',
            'items.*.medicine_name' => 'required_with:items|string|max:255',
            'items.*.generic_name'  => 'nullable|string|max:255',
            'items.*.dosage_form'   => 'nullable|string|max:100',
            'items.*.dosage'        => 'nullable|string|max:100',
            'items.*.frequency'     => 'nullable|string|max:50',
            'items.*.duration_days' => 'nullable|integer|min:1',
            'items.*.timing'        => 'nullable|string|max:100',
            'items.*.instructions'  => 'nullable|string|max:255',

            'diagnoses'                  => 'nullable|array',
            'diagnoses.*.icd10_id'       => 'nullable|integer|exists:icd10_codes,id',
            'diagnoses.*.icd_code'       => 'nullable|string|max:20',
            'diagnoses.*.diagnosis_name' => 'required_with:diagnoses|string|max:500',
            'diagnoses.*.diagnosis_type' => 'nullable|string|in:provisional,confirmed,differential',
            'diagnoses.*.notes'          => 'nullable|string',

            'investigations'                       => 'nullable|array',
            'investigations.*.test_name'           => 'required_with:investigations|string|max:255',
            'investigations.*.name'                => 'nullable|string|max:255',
            'investigations.*.test_code'           => 'nullable|string|max:100',
            'investigations.*.code'                => 'nullable|string|max:100',
            'investigations.*.category'            => 'nullable|string|max:100',
            'investigations.*.urgency'             => 'nullable|string|in:routine,urgent,stat,Routine,Urgent,STAT',
            'investigations.*.standard_rate'       => 'nullable|numeric|min:0',
            'investigations.*.clinical_indication' => 'nullable|string|max:500',
        ]);

        $hospitalId = $this->getHospitalId($request);
        $prescription = $this->prescriptionService->updatePrescription($hospitalId, (int) $id, $validated);

        return $this->successResponse($prescription, 'E-Prescription updated successfully');
    }

    #[OA\Post(
        path: "/api/v1/opd/visit/{visitId}/prescribe",
        summary: "Prescribe medicines and complete OPD visit in 1-click",
        description: "Convenience endpoint for Doctor OPD Panel to submit prescription directly on the visit, auto-marking the visit as 'done'.",
        security: [["bearerAuth" => []]],
        tags: ["13. E-Prescription & Master Catalogs"]
    )]
    #[OA\Parameter(name: "visitId", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 201, description: "Visit prescribed and completed")]
    public function prescribeVisit(Request $request, $visitId)
    {
        $visit = \App\Models\OpdVisit::where('hospital_id', $this->getHospitalId($request))->findOrFail($visitId);

        $request->merge([
            'opd_visit_id'   => $visit->id,
            'patient_id'     => $visit->patient_id,
            'doctor_id'      => $visit->doctor_id,
            'encounter_type' => 'opd',
        ]);

        return $this->store($request);
    }

    // ====================================================
    // 📄 3. VIEW & PRINT PRESCRIPTIONS
    // ====================================================

    #[OA\Get(
        path: "/api/v1/prescriptions/{id}",
        summary: "Get complete printable E-Prescription by ID",
        description: "Returns the full prescription slip data including patient details, doctor credentials, items, and ICD-10 diagnoses.",
        security: [["bearerAuth" => []]],
        tags: ["13. E-Prescription & Master Catalogs"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Complete printable prescription")]
    public function show(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $rx = $this->prescriptionService->getPrescription($hospitalId, (int) $id);

        return $this->successResponse($rx, 'Prescription details retrieved successfully');
    }

    #[OA\Get(
        path: "/api/v1/prescriptions/patient/{patientId}",
        summary: "Get all prescriptions history for a patient",
        description: "Returns all past prescriptions for the patient across all doctors and visits.",
        security: [["bearerAuth" => []]],
        tags: ["13. E-Prescription & Master Catalogs"]
    )]
    #[OA\Parameter(name: "patientId", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Patient prescription history")]
    public function patientPrescriptions(Request $request, $patientId)
    {
        $hospitalId = $this->getHospitalId($request);
        $list = $this->prescriptionService->getPatientPrescriptions($hospitalId, (int) $patientId);

        return $this->successResponse($list, 'Patient prescriptions history');
    }

    #[OA\Get(
        path: "/api/v1/prescriptions/visit/{visitId}",
        summary: "Get prescription for a specific OPD visit",
        security: [["bearerAuth" => []]],
        tags: ["13. E-Prescription & Master Catalogs"]
    )]
    #[OA\Parameter(name: "visitId", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "OPD visit prescription")]
    public function visitPrescription(Request $request, $visitId)
    {
        $hospitalId = $this->getHospitalId($request);
        $rx = $this->prescriptionService->getVisitPrescription($hospitalId, (int) $visitId);

        return $this->successResponse($rx, 'Visit prescription retrieved successfully');
    }
}
