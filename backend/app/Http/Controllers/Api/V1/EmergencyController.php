<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Traits\HasApiResponse;
use App\Services\Emergency\EmergencyServiceInterface;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(
    name: "12. Emergency & Triage Desk",
    description: "Fast-track 5-second casualty admissions, ESI triage (Red/Yellow/Green), unknown patient handling, MLC intimation, and post-stabilization identity linking"
)]
class EmergencyController extends Controller
{
    use HasApiResponse;

    public function __construct(
        protected EmergencyServiceInterface $emergencyService
    ) {}

    #[OA\Post(
        path: "/api/v1/emergency/triage",
        summary: "Fast-track 5-second ER Triage Admission",
        description: "Instantly admits emergency patient without reception queues. Supports unknown patients, ESI triage priority tagging (Red/Yellow/Green), MLC police details, instant bed allocation, and auto-generates Temporary UHID (EMG-2026-XXXXX).",
        security: [["bearerAuth" => []]],
        tags: ["12. Emergency & Triage Desk"]
    )]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: "patient_id", type: "integer", nullable: true, description: "Existing patient ID if known"),
                new OA\Property(property: "uhid", type: "string", nullable: true, description: "Existing UHID if known"),
                new OA\Property(property: "patient_name", type: "string", nullable: true, example: "Unknown Male (Accident victim)"),
                new OA\Property(property: "is_unknown_patient", type: "boolean", example: false),
                new OA\Property(property: "gender", type: "string", enum: ["M", "F", "O"], example: "M"),
                new OA\Property(property: "approximate_age", type: "integer", example: 35),
                new OA\Property(property: "brought_by", type: "string", example: "Ambulance", description: "Ambulance, Police, Relative, Self, Good Samaritan"),
                new OA\Property(property: "brought_by_contact", type: "string", example: "9876543210"),
                new OA\Property(property: "priority_level", type: "string", enum: ["red", "yellow", "green"], example: "red", description: "Red = Resuscitation/Immediate, Yellow = Emergent/Urgent, Green = Stable"),
                new OA\Property(property: "triage_category", type: "string", example: "Trauma"),
                new OA\Property(property: "chief_complaint", type: "string", example: "Head injury following road traffic accident, active bleeding"),
                new OA\Property(property: "consciousness_level", type: "string", enum: ["alert", "voice", "pain", "unresponsive"], example: "pain"),
                new OA\Property(property: "gcs_score", type: "integer", example: 9, description: "Glasgow Coma Scale (3-15)"),
                new OA\Property(
                    property: "initial_vitals",
                    type: "object",
                    properties: [
                        new OA\Property(property: "bp_systolic", type: "number", example: 90),
                        new OA\Property(property: "bp_diastolic", type: "number", example: 60),
                        new OA\Property(property: "pulse", type: "number", example: 120),
                        new OA\Property(property: "spo2", type: "number", example: 92),
                        new OA\Property(property: "temperature", type: "number", example: 98.2),
                        new OA\Property(property: "respiratory_rate", type: "number", example: 26)
                    ]
                ),
                new OA\Property(property: "is_mlc", type: "boolean", example: true, description: "Medico-Legal Case flag"),
                new OA\Property(property: "police_station", type: "string", example: "Connaught Place Police Station"),
                new OA\Property(property: "police_officer_name", type: "string", example: "SI Kuldeep Singh"),
                new OA\Property(property: "police_buckle_number", type: "string", example: "CP-4421"),
                new OA\Property(property: "incident_place", type: "string", example: "Outer Ring Road near Flyover"),
                new OA\Property(property: "mlc_injuries_details", type: "string", example: "Laceration over frontal scalp 5cm x 2cm, multiple abrasions"),
                new OA\Property(property: "doctor_id", type: "integer", nullable: true, example: 3),
                new OA\Property(property: "ward_id", type: "integer", nullable: true, example: 2),
                new OA\Property(property: "bed_id", type: "integer", nullable: true, example: 5),
                new OA\Property(property: "advance_deposit", type: "number", example: 0.00),
                new OA\Property(property: "clinical_notes", type: "string", example: "IV fluids initiated, CT Brain ordered")
            ]
        )
    )]
    #[OA\Response(response: 201, description: "Emergency Triage Created Successfully")]
    #[OA\Response(response: 422, description: "Validation Error")]
    public function admit(Request $request)
    {
        $validated = $request->validate([
            'patient_id'           => 'nullable|integer|exists:patients,id',
            'uhid'                 => 'nullable|string',
            'patient_name'         => 'nullable|string|max:255',
            'is_unknown_patient'   => 'nullable|boolean',
            'gender'               => 'nullable|string|in:M,F,O',
            'approximate_age'      => 'nullable|integer|min:0|max:130',
            'brought_by'           => 'nullable|string|max:100',
            'brought_by_contact'   => 'nullable|string|max:50',
            'priority_level'       => 'nullable|string|in:red,yellow,green',
            'triage_category'      => 'nullable|string|max:100',
            'chief_complaint'      => 'nullable|string',
            'consciousness_level'  => 'nullable|string|in:alert,voice,pain,unresponsive',
            'gcs_score'            => 'nullable|integer|min:3|max:15',
            'initial_vitals'       => 'nullable|array',
            'is_mlc'               => 'nullable|boolean',
            'police_station'       => 'nullable|string|max:150',
            'police_officer_name'  => 'nullable|string|max:150',
            'police_buckle_number' => 'nullable|string|max:50',
            'incident_place'       => 'nullable|string|max:255',
            'mlc_injuries_details' => 'nullable|string',
            'doctor_id'            => 'nullable|integer|exists:doctors,id',
            'ward_id'              => 'nullable|integer|exists:wards,id',
            'bed_id'               => 'nullable|integer|exists:beds,id',
            'advance_deposit'      => 'nullable|numeric|min:0',
            'clinical_notes'       => 'nullable|string',
        ]);

        $hospitalId = $this->getHospitalId($request);
        $userId = $request->user()?->id ?? 0;

        try {
            $triage = $this->emergencyService->admitTriage($hospitalId, $validated, $userId);
            return $this->createdResponse($triage, 'Emergency triage admission successful');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), null, 400);
        }
    }

    #[OA\Get(
        path: "/api/v1/emergency/triages",
        summary: "Live Emergency & Triage Desk List with Priority Counters",
        description: "Retrieves active casualty cases with live counters for Red (Resuscitation), Yellow (Urgent), Green (Stable), and MLC cases.",
        security: [["bearerAuth" => []]],
        tags: ["12. Emergency & Triage Desk"]
    )]
    #[OA\Parameter(name: "priority_level", in: "query", schema: new OA\Schema(type: "string", enum: ["red", "yellow", "green"]))]
    #[OA\Parameter(name: "status", in: "query", schema: new OA\Schema(type: "string"))]
    #[OA\Parameter(name: "is_mlc", in: "query", schema: new OA\Schema(type: "boolean"))]
    #[OA\Parameter(name: "search", in: "query", schema: new OA\Schema(type: "string"))]
    #[OA\Response(response: 200, description: "Live triage desk list retrieved")]
    public function index(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $result = $this->emergencyService->getTriagesList($hospitalId, $request);
        return $this->successResponse($result, 'Emergency triage list retrieved');
    }

    #[OA\Get(
        path: "/api/v1/emergency/triages/{id}",
        summary: "Get specific Emergency Triage details",
        security: [["bearerAuth" => []]],
        tags: ["12. Emergency & Triage Desk"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Emergency triage details")]
    public function show(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $triage = \App\Models\EmergencyTriage::where('hospital_id', $hospitalId)
            ->with(['patient', 'doctor', 'ward', 'bed', 'ipdAdmission'])
            ->findOrFail($id);

        return $this->successResponse($triage, 'Emergency triage retrieved');
    }

    #[OA\Put(
        path: "/api/v1/emergency/triages/{id}/link-patient",
        summary: "Post-stabilization KYC / ABHA patient identity linking",
        description: "Links emergency admission and all associated vitals, prescriptions, and charges to a verified patient profile once stabilized or relatives arrive.",
        security: [["bearerAuth" => []]],
        tags: ["12. Emergency & Triage Desk"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: "target_patient_id", type: "integer", nullable: true, description: "Merge/link to an existing registered patient ID"),
                new OA\Property(property: "name", type: "string", example: "Ramesh Sharma", description: "Verified patient name"),
                new OA\Property(property: "mobile", type: "string", example: "9876543210"),
                new OA\Property(property: "dob", type: "string", format: "date", example: "1988-06-15"),
                new OA\Property(property: "gender", type: "string", enum: ["M", "F", "O"], example: "M"),
                new OA\Property(property: "blood_group", type: "string", example: "B+"),
                new OA\Property(property: "abha_number", type: "string", example: "14-1234-5678-9012"),
                new OA\Property(property: "abha_address", type: "string", example: "ramesh@abdm"),
                new OA\Property(property: "address", type: "string", example: "Flat 402, Green Park"),
                new OA\Property(property: "id_proof_type", type: "string", enum: ["aadhaar", "pan", "voter_id", "driving_license"], example: "aadhaar"),
                new OA\Property(property: "id_proof_number", type: "string", example: "123456789012")
            ]
        )
    )]
    #[OA\Response(response: 200, description: "Patient identity linked successfully")]
    public function linkPatient(Request $request, $id)
    {
        $validated = $request->validate([
            'target_patient_id' => 'nullable|integer|exists:patients,id',
            'uhid'              => 'nullable|string',
            'name'              => 'nullable|string|max:255',
            'mobile'            => 'nullable|string|max:15',
            'dob'               => 'nullable|date',
            'gender'            => 'nullable|string|in:M,F,O',
            'blood_group'       => 'nullable|string|max:5',
            'abha_number'       => 'nullable|string|max:50',
            'abha_address'      => 'nullable|string|max:100',
            'address'           => 'nullable|string',
            'id_proof_type'     => 'nullable|string',
            'id_proof_number'   => 'nullable|string|max:100',
        ]);

        $hospitalId = $this->getHospitalId($request);

        try {
            $result = $this->emergencyService->linkPatient($hospitalId, (int) $id, $validated);
            return $this->successResponse($result, 'Patient identity linked successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), null, 400);
        }
    }

    #[OA\Get(
        path: "/api/v1/emergency/triages/{id}/mlc-slip",
        summary: "Generate official Police Intimation Memo (MLC Slip)",
        description: "Generates formatted police intimation memo with patient condition, nature of injuries, examining doctor info, and legal declaration.",
        security: [["bearerAuth" => []]],
        tags: ["12. Emergency & Triage Desk"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Police Intimation Memo generated")]
    public function mlcSlip(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);

        try {
            $slip = $this->emergencyService->getMlcSlip($hospitalId, (int) $id);
            return $this->successResponse($slip, 'Police intimation memo generated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), null, 400);
        }
    }

    #[OA\Put(
        path: "/api/v1/emergency/triages/{id}/status",
        summary: "Update emergency triage clinical status",
        description: "Updates casualty patient status (stabilized, discharged, transferred, admitted_to_ipd).",
        security: [["bearerAuth" => []]],
        tags: ["12. Emergency & Triage Desk"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ["status"],
            properties: [
                new OA\Property(property: "status", type: "string", enum: ["under_treatment", "stabilized", "admitted_to_ipd", "transferred_external", "discharged", "brought_dead", "expired"], example: "stabilized"),
                new OA\Property(property: "notes", type: "string", example: "Patient vitals stabilized, bleeding controlled.")
            ]
        )
    )]
    #[OA\Response(response: 200, description: "Triage status updated")]
    public function updateStatus(Request $request, $id)
    {
        $validated = $request->validate([
            'status' => 'required|string|in:under_treatment,stabilized,admitted_to_ipd,transferred_external,discharged,brought_dead,expired',
            'notes'  => 'nullable|string',
        ]);

        $hospitalId = $this->getHospitalId($request);

        try {
            $result = $this->emergencyService->updateTriageStatus($hospitalId, (int) $id, $validated['status'], $validated['notes'] ?? null);
            return $this->successResponse($result, 'Emergency triage status updated');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), null, 400);
        }
    }
}
