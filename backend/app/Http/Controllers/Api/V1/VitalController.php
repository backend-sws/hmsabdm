<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Traits\HasApiResponse;
use App\Services\Vital\VitalServiceInterface;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(
    name: "5. Triage & Vitals (Nurse)",
    description: "Triage Station — Recording patient vitals & dynamic hospital vital field configurations"
)]
class VitalController extends Controller
{
    use HasApiResponse;

    public function __construct(
        protected VitalServiceInterface $vitalService
    ) {}

    // ==========================================
    // 🩺 1. PATIENT VITALS RECORDING & FETCHING
    // ==========================================

    #[OA\Post(
        path: "/api/v1/vitals",
        summary: "Record Patient Vitals (Nurse Station)",
        description: "Records standard vitals (BP, Pulse, Temperature, SpO2, Height, Weight, Blood Sugar) and optional dynamic custom vitals defined by the hospital. BMI is auto-calculated.",
        security: [["bearerAuth" => []]],
        tags: ["5. Triage & Vitals (Nurse)"]
    )]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ["patient_id"],
            properties: [
                new OA\Property(property: "patient_id", type: "integer", example: 1, description: "Patient ID"),
                new OA\Property(property: "opd_visit_id", type: "integer", example: 1, description: "Optional ID of OPD Visit / Token"),
                new OA\Property(property: "ipd_admission_id", type: "integer", example: 1, description: "Optional ID of IPD Inpatient Admission"),
                new OA\Property(property: "encounter_type", type: "string", enum: ["opd", "ipd", "emergency"], example: "opd", description: "Encounter context"),
                new OA\Property(property: "temperature", type: "number", format: "float", example: 98.6, description: "Body temperature"),
                new OA\Property(property: "temperature_unit", type: "string", enum: ["F", "C"], example: "F", description: "Temperature unit (F or C)"),
                new OA\Property(property: "blood_pressure_sys", type: "integer", example: 120, description: "Systolic BP (mmHg)"),
                new OA\Property(property: "blood_pressure_dia", type: "integer", example: 80, description: "Diastolic BP (mmHg)"),
                new OA\Property(property: "pulse_rate", type: "integer", example: 72, description: "Pulse / Heart rate (bpm)"),
                new OA\Property(property: "respiratory_rate", type: "integer", example: 16, description: "Respiratory rate (breaths/min)"),
                new OA\Property(property: "oxygen_saturation", type: "number", format: "float", example: 98.5, description: "SpO2 percentage (%)"),
                new OA\Property(property: "weight", type: "number", format: "float", example: 65.5, description: "Weight in kg"),
                new OA\Property(property: "height", type: "number", format: "float", example: 170.0, description: "Height in cm"),
                new OA\Property(property: "blood_glucose", type: "number", format: "float", example: 110.0, description: "Blood glucose in mg/dL"),
                new OA\Property(property: "glucose_type", type: "string", enum: ["fasting", "random", "post_meal"], example: "random"),
                new OA\Property(
                    property: "custom_vitals",
                    type: "object",
                    description: "Dynamic custom vitals configured by the hospital (Key-Value pairs)",
                    example: ["pain_score" => 4, "waist_circumference" => 85.0]
                ),
                new OA\Property(property: "recorded_at", type: "string", format: "date-time", example: "2026-08-17T10:30:00Z")
            ]
        )
    )]
    #[OA\Response(response: 201, description: "Vitals recorded successfully")]
    public function store(Request $request)
    {
        $validated = $request->validate([
            'patient_id'         => 'required|integer|exists:patients,id',
            'opd_visit_id'       => 'nullable|integer|exists:opd_visits,id',
            'ipd_admission_id'   => 'nullable|integer|exists:ipd_admissions,id',
            'encounter_type'     => 'nullable|string|in:opd,ipd,emergency',
            'temperature'        => 'nullable|numeric|between:50,120',
            'temperature_unit'   => 'nullable|in:F,C',
            'blood_pressure_sys' => 'nullable|integer|between:40,300',
            'blood_pressure_dia' => 'nullable|integer|between:20,200',
            'pulse_rate'         => 'nullable|integer|between:30,250',
            'respiratory_rate'   => 'nullable|integer|between:5,100',
            'oxygen_saturation'  => 'nullable|numeric|between:40,100',
            'weight'             => 'nullable|numeric|between:0.5,500',
            'height'             => 'nullable|numeric|between:20,300',
            'blood_glucose'      => 'nullable|numeric|between:10,1000',
            'glucose_type'       => 'nullable|in:fasting,random,post_meal',
            'custom_vitals'      => 'nullable|array',
            'recorded_at'        => 'nullable|date',
        ]);

        $hospitalId = $this->getHospitalId($request);
        $userId = $request->user()->id;

        $vital = $this->vitalService->recordVitals($hospitalId, $userId, $validated);

        return $this->createdResponse($vital, 'Patient vitals recorded successfully');
    }

    #[OA\Get(
        path: "/api/v1/vitals",
        summary: "Get list of recorded vitals",
        description: "Fetches recorded vitals filtered by patient_id, opd_visit_id, ipd_admission_id, encounter_type, date, or patient search.",
        security: [["bearerAuth" => []]],
        tags: ["5. Triage & Vitals (Nurse)"]
    )]
    #[OA\Parameter(name: "patient_id", in: "query", description: "Filter by patient ID", required: false, schema: new OA\Schema(type: "integer"))]
    #[OA\Parameter(name: "opd_visit_id", in: "query", description: "Filter by OPD Visit ID", required: false, schema: new OA\Schema(type: "integer"))]
    #[OA\Parameter(name: "ipd_admission_id", in: "query", description: "Filter by IPD Admission ID", required: false, schema: new OA\Schema(type: "integer"))]
    #[OA\Parameter(name: "encounter_type", in: "query", description: "Filter by encounter type (opd, ipd, emergency)", required: false, schema: new OA\Schema(type: "string", enum: ["opd", "ipd", "emergency"]))]
    #[OA\Parameter(name: "date", in: "query", description: "Filter by record date (YYYY-MM-DD)", required: false, schema: new OA\Schema(type: "string", format: "date"))]
    #[OA\Parameter(name: "search", in: "query", description: "Search by patient name, mobile, or ABHA", required: false, schema: new OA\Schema(type: "string"))]
    #[OA\Parameter(name: "all", in: "query", description: "Fetch all without pagination (true/false)", required: false, schema: new OA\Schema(type: "boolean", example: false))]
    #[OA\Parameter(name: "per_page", in: "query", description: "Records per page (default: 15)", required: false, schema: new OA\Schema(type: "integer", example: 15))]
    #[OA\Parameter(name: "page", in: "query", description: "Page number", required: false, schema: new OA\Schema(type: "integer", example: 1))]
    #[OA\Response(response: 200, description: "List of vitals")]
    public function index(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $vitals = $this->vitalService->getVitals($hospitalId, $request);

        return $this->successResponse($vitals, 'Vitals retrieved successfully');
    }

    #[OA\Get(
        path: "/api/v1/vitals/{id}",
        summary: "Get single vital record details",
        security: [["bearerAuth" => []]],
        tags: ["5. Triage & Vitals (Nurse)"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Vital details")]
    public function show(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $vital = $this->vitalService->getVitalById($hospitalId, (int) $id);

        return $this->successResponse($vital, 'Vital details retrieved successfully');
    }

    #[OA\Get(
        path: "/api/v1/patients/{patientId}/vitals",
        summary: "Get patient vitals history",
        description: "Fetches full vitals history recorded for a given patient.",
        security: [["bearerAuth" => []]],
        tags: ["5. Triage & Vitals (Nurse)"]
    )]
    #[OA\Parameter(name: "patientId", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Patient vitals history")]
    public function patientVitals(Request $request, $patientId)
    {
        $hospitalId = $this->getHospitalId($request);
        $vitals = $this->vitalService->getPatientVitals($hospitalId, (int) $patientId);

        return $this->successResponse($vitals, 'Patient vitals history');
    }

    #[OA\Get(
        path: "/api/v1/opd/visit/{visitId}/vitals",
        summary: "Get vitals for an OPD visit",
        description: "Fetches vitals recorded specifically for an OPD visit token.",
        security: [["bearerAuth" => []]],
        tags: ["5. Triage & Vitals (Nurse)"]
    )]
    #[OA\Parameter(name: "visitId", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Visit vitals")]
    public function visitVitals(Request $request, $visitId)
    {
        $hospitalId = $this->getHospitalId($request);
        $vitals = $this->vitalService->getVisitVitals($hospitalId, (int) $visitId);

        return $this->successResponse($vitals, 'OPD Visit vitals');
    }

    #[OA\Get(
        path: "/api/v1/vitals/ipd/{admissionId}",
        summary: "Get vitals history for an IPD Admission",
        description: "Fetches chronological vitals history (rounding chart / flowsheet) for an admitted IPD inpatient.",
        security: [["bearerAuth" => []]],
        tags: ["5. Triage & Vitals (Nurse)"]
    )]
    #[OA\Parameter(name: "admissionId", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "IPD Admission vitals chart")]
    public function ipdAdmissionVitals(Request $request, $admissionId)
    {
        $hospitalId = $this->getHospitalId($request);
        $vitals = $this->vitalService->getIpdAdmissionVitals($hospitalId, (int) $admissionId);

        return $this->successResponse($vitals, 'IPD Admission vitals chart');
    }

    #[OA\Delete(
        path: "/api/v1/vitals/{id}",
        summary: "Delete vital record",
        description: "Deletes an incorrect vital entry.",
        security: [["bearerAuth" => []]],
        tags: ["5. Triage & Vitals (Nurse)"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Vital deleted successfully")]
    public function destroy(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $this->vitalService->deleteVital($hospitalId, (int) $id);

        return $this->successResponse(null, 'Vital entry deleted successfully');
    }

    // ========================================================
    // ⚙️ 2. DYNAMIC CUSTOM VITAL FIELDS CONFIGURATION (ADMIN)
    // ========================================================

    #[OA\Get(
        path: "/api/v1/vitals/configs",
        summary: "Get hospital's configured vital fields",
        description: "Returns the list of vital fields enabled for the hospital. Frontend uses this to render dynamic vital forms.",
        security: [["bearerAuth" => []]],
        tags: ["5. Triage & Vitals (Nurse)"]
    )]
    #[OA\Parameter(name: "active_only", in: "query", description: "Filter only active fields (default: true)", required: false, schema: new OA\Schema(type: "boolean", example: true))]
    #[OA\Response(response: 200, description: "List of configured vital fields")]
    public function getConfigs(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $activeOnly = $request->boolean('active_only', true);
        $configs = $this->vitalService->getFieldConfigs($hospitalId, $activeOnly);

        return $this->successResponse($configs, 'Vital field configurations retrieved successfully');
    }

    #[OA\Post(
        path: "/api/v1/vitals/configs",
        summary: "Add a custom vital field for hospital",
        description: "Hospital Admin creates a new custom vital field that nurses should record (e.g., Pain Score, Waist Size, Left/Right Eye Vision).",
        security: [["bearerAuth" => []]],
        tags: ["5. Triage & Vitals (Nurse)"]
    )]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ["field_key", "label"],
            properties: [
                new OA\Property(property: "field_key", type: "string", example: "pain_score", description: "Unique key identifier"),
                new OA\Property(property: "label", type: "string", example: "Pain Scale (1 - 10)", description: "Display name on UI"),
                new OA\Property(property: "category", type: "string", example: "General", description: "General, Cardio, Diabetic, Pediatric, etc."),
                new OA\Property(property: "unit", type: "string", example: "scale", description: "e.g. mmHg, bpm, cm, mg/dL, scale"),
                new OA\Property(property: "input_type", type: "string", enum: ["number", "text", "select", "boolean"], example: "number"),
                new OA\Property(property: "options", type: "array", items: new OA\Items(type: "string"), example: ["Mild", "Moderate", "Severe"]),
                new OA\Property(property: "min_value", type: "number", format: "float", example: 1.0),
                new OA\Property(property: "max_value", type: "number", format: "float", example: 10.0),
                new OA\Property(property: "is_required", type: "boolean", example: false),
                new OA\Property(property: "is_active", type: "boolean", example: true),
                new OA\Property(property: "sort_order", type: "integer", example: 1)
            ]
        )
    )]
    #[OA\Response(response: 201, description: "Custom vital field created successfully")]
    public function createConfig(Request $request)
    {
        $validated = $request->validate([
            'field_key'   => 'required|string|max:50',
            'label'       => 'required|string|max:100',
            'category'    => 'nullable|string|max:50',
            'unit'        => 'nullable|string|max:20',
            'input_type'  => 'required|in:number,text,select,boolean',
            'options'     => 'nullable|array',
            'min_value'   => 'nullable|numeric',
            'max_value'   => 'nullable|numeric',
            'is_required' => 'nullable|boolean',
            'is_active'   => 'nullable|boolean',
            'sort_order'  => 'nullable|integer',
        ]);

        $hospitalId = $this->getHospitalId($request);
        $config = $this->vitalService->createFieldConfig($hospitalId, $validated);

        return $this->createdResponse($config, 'Custom vital field created successfully');
    }

    #[OA\Put(
        path: "/api/v1/vitals/configs/{id}",
        summary: "Update custom vital field configuration",
        description: "Updates label, unit, min/max range, active status, or sort order for a vital field.",
        security: [["bearerAuth" => []]],
        tags: ["5. Triage & Vitals (Nurse)"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: "label", type: "string", example: "Pain Scale"),
                new OA\Property(property: "category", type: "string", example: "General"),
                new OA\Property(property: "unit", type: "string", example: "scale"),
                new OA\Property(property: "input_type", type: "string", enum: ["number", "text", "select", "boolean"]),
                new OA\Property(property: "options", type: "array", items: new OA\Items(type: "string")),
                new OA\Property(property: "min_value", type: "number", format: "float"),
                new OA\Property(property: "max_value", type: "number", format: "float"),
                new OA\Property(property: "is_required", type: "boolean"),
                new OA\Property(property: "is_active", type: "boolean"),
                new OA\Property(property: "sort_order", type: "integer")
            ]
        )
    )]
    #[OA\Response(response: 200, description: "Configuration updated successfully")]
    public function updateConfig(Request $request, $id)
    {
        $validated = $request->validate([
            'label'       => 'sometimes|string|max:100',
            'category'    => 'nullable|string|max:50',
            'unit'        => 'nullable|string|max:20',
            'input_type'  => 'sometimes|in:number,text,select,boolean',
            'options'     => 'nullable|array',
            'min_value'   => 'nullable|numeric',
            'max_value'   => 'nullable|numeric',
            'is_required' => 'nullable|boolean',
            'is_active'   => 'nullable|boolean',
            'sort_order'  => 'nullable|integer',
        ]);

        $hospitalId = $this->getHospitalId($request);
        $config = $this->vitalService->updateFieldConfig($hospitalId, (int) $id, $validated);

        return $this->successResponse($config, 'Vital field configuration updated successfully');
    }

    #[OA\Delete(
        path: "/api/v1/vitals/configs/{id}",
        summary: "Delete custom vital field configuration",
        description: "Removes a custom vital field from the hospital's vital form.",
        security: [["bearerAuth" => []]],
        tags: ["5. Triage & Vitals (Nurse)"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Configuration deleted successfully")]
    public function deleteConfig(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $this->vitalService->deleteFieldConfig($hospitalId, (int) $id);

        return $this->successResponse(null, 'Vital field configuration deleted successfully');
    }
}
