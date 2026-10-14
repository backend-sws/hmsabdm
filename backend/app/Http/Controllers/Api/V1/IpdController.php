<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\IpdAdmissionResource;
use App\Http\Traits\HasApiResponse;
use App\Services\Ipd\IpdServiceInterface;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(
    name: "11. IPD (Inpatient Admissions)",
    description: "Inpatient Management — Wards, Beds, IPD Parcha (Admission Slip), Transfers & Discharges"
)]
class IpdController extends Controller
{
    use HasApiResponse;

    public function __construct(
        protected IpdServiceInterface $ipdService
    ) {}

    #[OA\Get(
        path: "/api/v1/ipd/wards",
        summary: "Get list of all Wards and Bed availability stats",
        description: "Returns all active hospital wards with total beds, available beds, and occupied beds count.",
        security: [["bearerAuth" => []]],
        tags: ["11. IPD (Inpatient Admissions)"]
    )]
    #[OA\Parameter(name: "search", in: "query", required: false, schema: new OA\Schema(type: "string"))]
    #[OA\Response(response: 200, description: "Wards and Bed statistics list")]
    public function wards(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $wards = $this->ipdService->getWards($hospitalId, $request);
        return $this->paginatedOrSuccessResponse($wards, 'Wards list retrieved successfully');
    }

    #[OA\Get(
        path: "/api/v1/ipd/beds/available",
        summary: "Get all Available (Vacant) Beds",
        description: "Returns all vacant beds ready for admission. Can be filtered by ward_id.",
        security: [["bearerAuth" => []]],
        tags: ["11. IPD (Inpatient Admissions)"]
    )]
    #[OA\Parameter(name: "ward_id", in: "query", required: false, schema: new OA\Schema(type: "integer", example: 1))]
    #[OA\Response(response: 200, description: "Available beds list")]
    public function availableBeds(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $beds = $this->ipdService->getAvailableBeds($hospitalId, $request->query('ward_id'));
        return $this->successResponse($beds, 'Available beds retrieved successfully');
    }

    #[OA\Post(
        path: "/api/v1/ipd/admit",
        summary: "Direct IPD Admission & Issue IPD Parcha (Admission Slip)",
        description: "Admits a patient into IPD, allocates a bed, records advance payment, and returns complete printable IPD Admission Slip data. Accepts existing patient_id, ABHA Scan & Share token, or direct walk-in patient registration details.",
        security: [["bearerAuth" => []]],
        tags: ["11. IPD (Inpatient Admissions)"]
    )]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: "patient_id", type: "integer", example: 1, description: "Existing Patient ID (optional if name/mobile or token is passed)"),
                new OA\Property(property: "token", type: "string", example: "123", description: "Scan and Share Queue token (optional)"),
                new OA\Property(property: "name", type: "string", example: "Suresh Kumar", description: "Patient name (for direct walk-in admission)"),
                new OA\Property(property: "mobile", type: "string", example: "9876543210"),
                new OA\Property(property: "gender", type: "string", example: "M"),
                new OA\Property(property: "dob", type: "string", format: "date", example: "1988-06-15"),
                new OA\Property(property: "doctor_id", type: "integer", example: 1, description: "Admitting Doctor ID"),
                new OA\Property(property: "department_id", type: "integer", example: 1, description: "Department ID"),
                new OA\Property(property: "ward_id", type: "integer", example: 1, description: "Ward ID"),
                new OA\Property(property: "bed_id", type: "integer", example: 3, description: "Bed ID"),
                new OA\Property(property: "admission_type", type: "string", enum: ["planned", "emergency", "day_care", "maternity", "transfer"], example: "planned"),
                new OA\Property(property: "admission_reason", type: "string", example: "Acute Appendicitis - Emergency Laparoscopy"),
                new OA\Property(property: "is_mlc", type: "boolean", example: false, description: "Medico-Legal Case flag"),
                new OA\Property(property: "mlc_details", type: "string", example: "RTA Case FIR No 123"),
                new OA\Property(property: "advance_deposit", type: "number", format: "float", example: 5000.00, description: "Advance deposit amount paid at admission"),
                new OA\Property(property: "payment_method", type: "string", enum: ["cash", "card", "upi", "insurance", "split", "other"], example: "upi"),
                new OA\Property(property: "payment_ref", type: "string", example: "UPI1234567890"),
                new OA\Property(
                    property: "payment_breakdown",
                    type: "array",
                    items: new OA\Items(
                        properties: [
                            new OA\Property(property: "method", type: "string", example: "cash"),
                            new OA\Property(property: "amount", type: "number", format: "float", example: 2500.00),
                            new OA\Property(property: "ref", type: "string", example: "TXN123")
                        ]
                    )
                ),
                new OA\Property(property: "attendant_name", type: "string", example: "Ramesh Kumar"),
                new OA\Property(property: "attendant_relation", type: "string", example: "Brother"),
                new OA\Property(property: "attendant_phone", type: "string", example: "9876500000"),
                new OA\Property(property: "attendant_address", type: "string", example: "123 MG Road, Delhi")
            ]
        )
    )]
    #[OA\Response(response: 201, description: "IPD Admission created and IPD Parcha issued")]
    public function admit(Request $request)
    {
        $validated = $request->validate([
            'patient_id'         => 'nullable|integer|exists:patients,id',
            'token'              => 'nullable|string',
            'name'               => 'nullable|string|max:255',
            'mobile'             => 'nullable|string|max:15',
            'gender'             => 'nullable|string|in:M,F,O',
            'dob'                => 'nullable|date',
            'id_proof_type'      => 'nullable|string',
            'id_proof_number'    => 'nullable|string',
            'address'            => 'nullable|string',
            'city'               => 'nullable|string|max:100',
            'district'           => 'nullable|string|max:100',
            'state'              => 'nullable|string|max:100',
            'pincode'            => 'nullable|string|max:20',
            'photo'              => 'nullable|string',
            'kyc_verified'       => 'nullable|boolean',
            'abha_number'        => 'nullable|string|max:50',
            'abha_address'       => 'nullable|string|max:100',
            'doctor_id'          => 'required|integer|exists:doctors,id',
            'department_id'      => 'nullable|integer|exists:departments,id',
            'ward_id'            => 'nullable|integer|exists:wards,id',
            'bed_id'             => 'required|integer|exists:beds,id',
            'admission_type'     => 'nullable|string|in:planned,emergency,day_care,maternity,transfer',
            'admission_reason'   => 'nullable|string',
            'is_mlc'             => 'nullable|boolean',
            'mlc_details'        => 'nullable|string',
            'admission_date'     => 'nullable|date',
            'advance_deposit'    => 'nullable|numeric|min:0',
            'payment_method'     => 'nullable|string|max:50',
            'payment_ref'        => 'nullable|string|max:100',
            'payment_breakdown'  => 'nullable|array',
            'attendant_name'     => 'nullable|string|max:255',
            'attendant_relation' => 'nullable|string|max:50',
            'attendant_phone'    => 'nullable|string|max:20',
            'attendant_address'  => 'nullable|string',
        ]);

        $hospitalId = $this->getHospitalId($request);

        try {
            $admission = $this->ipdService->admitPatient($hospitalId, $validated);
            return $this->createdResponse(new IpdAdmissionResource($admission), 'Patient admitted to IPD successfully. IPD Parcha generated.');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), null, 400);
        }
    }

    #[OA\Get(
        path: "/api/v1/ipd/admissions",
        summary: "Get currently admitted Inpatients list",
        description: "Fetches active inpatients with bed, ward, doctor, and patient details. Supports status, ward, doctor, and patient search filtering.",
        security: [["bearerAuth" => []]],
        tags: ["11. IPD (Inpatient Admissions)"]
    )]
    #[OA\Parameter(name: "status", in: "query", required: false, schema: new OA\Schema(type: "string", example: "admitted"))]
    #[OA\Parameter(name: "ward_id", in: "query", required: false, schema: new OA\Schema(type: "integer"))]
    #[OA\Parameter(name: "doctor_id", in: "query", required: false, schema: new OA\Schema(type: "integer"))]
    #[OA\Parameter(name: "search", in: "query", required: false, schema: new OA\Schema(type: "string"))]
    #[OA\Response(response: 200, description: "Active admissions list")]
    public function admissions(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $admissions = $this->ipdService->getActiveAdmissions($hospitalId, $request);
        return $this->paginatedOrSuccessResponse($admissions, 'Inpatients list retrieved successfully');
    }

    #[OA\Get(
        path: "/api/v1/ipd/admissions/{id}",
        summary: "Get specific IPD Admission Slip (Parcha) Data",
        description: "Retrieves complete IPD Admission details including patient info, bed, ward, doctor, advance deposit, and attendant details.",
        security: [["bearerAuth" => []]],
        tags: ["11. IPD (Inpatient Admissions)"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "IPD Admission Slip data")]
    public function show(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $admission = $this->ipdService->getAdmissionById($hospitalId, $id);
        return $this->successResponse(new IpdAdmissionResource($admission), 'IPD Admission slip retrieved successfully');
    }

    #[OA\Post(
        path: "/api/v1/ipd/admissions/{id}/transfer-bed",
        summary: "Transfer Patient to a different Ward / Bed",
        description: "Frees the patient's existing bed and assigns a new vacant bed.",
        security: [["bearerAuth" => []]],
        tags: ["11. IPD (Inpatient Admissions)"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ["new_bed_id"],
            properties: [
                new OA\Property(property: "new_bed_id", type: "integer", example: 8)
            ]
        )
    )]
    #[OA\Response(response: 200, description: "Patient transferred successfully")]
    public function transferBed(Request $request, $id)
    {
        $request->validate([
            'new_bed_id' => 'required|integer|exists:beds,id',
        ]);

        $hospitalId = $this->getHospitalId($request);

        try {
            $admission = $this->ipdService->transferBed($hospitalId, $id, $request->new_bed_id);
            return $this->successResponse(new IpdAdmissionResource($admission), 'Patient transferred to new bed successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), null, 400);
        }
    }

    #[OA\Post(
        path: "/api/v1/ipd/admissions/{id}/discharge",
        summary: "Discharge Patient and Free Bed",
        description: "Marks the IPD admission as discharged, records discharge date, and marks the bed as available.",
        security: [["bearerAuth" => []]],
        tags: ["11. IPD (Inpatient Admissions)"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\RequestBody(
        required: false,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: "discharge_date", type: "string", format: "date-time", example: "2026-08-20 11:30:00")
            ]
        )
    )]
    #[OA\Response(response: 200, description: "Patient discharged successfully")]
    public function discharge(Request $request, $id)
    {
        $validated = $request->validate([
            'discharge_date' => 'nullable|date',
        ]);

        $hospitalId = $this->getHospitalId($request);

        try {
            $admission = $this->ipdService->dischargePatient($hospitalId, $id, $validated);
            return $this->successResponse(new IpdAdmissionResource($admission), 'Patient discharged successfully. Bed is now available.');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), null, 400);
        }
    }

    #[OA\Get(
        path: "/api/v1/ipd/bed-matrix",
        summary: "Live Visual Bed Matrix (All Wards & Beds)",
        description: "Returns a visual 2D matrix of all hospital wards, their beds (Available, Occupied, Maintenance), patient demographics, attending doctor, elapsed admission time, and live running bills.",
        security: [["bearerAuth" => []]],
        tags: ["11. IPD (Inpatient Admissions)"]
    )]
    #[OA\Response(response: 200, description: "Bed matrix retrieved successfully")]
    public function bedMatrix(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $matrix = $this->ipdService->getBedMatrix($hospitalId);
        return $this->successResponse($matrix, 'Bed matrix retrieved successfully');
    }

    #[OA\Post(
        path: "/api/v1/ipd/admissions/{id}/rounds",
        summary: "Record Doctor Inpatient Daily Round (SOAP Note)",
        description: "Records attending doctor's bedside clinical round with Subjective, Objective, Assessment, and Plan (SOAP) notes. Automatically triggers and posts doctor round consultation fee to the patient's running bill ledger.",
        security: [["bearerAuth" => []]],
        tags: ["11. IPD (Inpatient Admissions)"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: "doctor_id", type: "integer", nullable: true, example: 1),
                new OA\Property(property: "round_date", type: "string", format: "date", example: "2026-09-15"),
                new OA\Property(property: "round_type", type: "string", enum: ["routine", "specialist_call", "emergency", "night_round"], example: "routine"),
                new OA\Property(property: "subjective", type: "string", example: "Patient feeling better, mild abdominal discomfort after meal"),
                new OA\Property(property: "objective", type: "string", example: "Abdomen soft, non-tender. Bowel sounds present. Surgical dressing dry."),
                new OA\Property(property: "assessment", type: "string", example: "Post-op Day 2 status post Lap Appendectomy, recovery satisfactory"),
                new OA\Property(property: "plan", type: "string", example: "Step down IV antibiotics to oral, start soft diet, ambulate"),
                new OA\Property(property: "diet_advice", type: "string", example: "soft"),
                new OA\Property(property: "clinical_condition", type: "string", enum: ["improving", "stable", "deteriorating", "critical"], example: "improving"),
                new OA\Property(property: "is_discharge_planned", type: "boolean", example: true),
                new OA\Property(property: "planned_discharge_date", type: "string", format: "date", example: "2026-09-17"),
                new OA\Property(property: "fee_charged", type: "number", format: "float", example: 500.00)
            ]
        )
    )]
    #[OA\Response(response: 201, description: "Doctor round recorded and fee posted")]
    public function recordRound(Request $request, $id)
    {
        $validated = $request->validate([
            'doctor_id'              => 'nullable|integer|exists:doctors,id',
            'round_date'             => 'nullable|date',
            'round_time'             => 'nullable|string',
            'round_type'             => 'nullable|string|in:routine,specialist_call,emergency,night_round',
            'subjective'             => 'nullable|string',
            'objective'              => 'nullable|string',
            'assessment'             => 'nullable|string',
            'plan'                   => 'nullable|string',
            'diet_advice'            => 'nullable|string|max:100',
            'clinical_condition'     => 'nullable|string|in:improving,stable,deteriorating,critical',
            'is_discharge_planned'   => 'nullable|boolean',
            'planned_discharge_date' => 'nullable|date',
            'fee_charged'            => 'nullable|numeric|min:0',
        ]);

        $hospitalId = $this->getHospitalId($request);
        $userId = $request->user()?->id ?? 0;

        try {
            $round = $this->ipdService->recordDoctorRound($hospitalId, (int) $id, $validated, $userId);
            return $this->createdResponse($round, 'Doctor round recorded successfully and tariff added to running bill');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), null, 400);
        }
    }

    #[OA\Get(
        path: "/api/v1/ipd/admissions/{id}/rounds",
        summary: "Get Doctor Daily Rounds History",
        security: [["bearerAuth" => []]],
        tags: ["11. IPD (Inpatient Admissions)"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Doctor rounds history retrieved")]
    public function getRounds(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $rounds = $this->ipdService->getDoctorRounds($hospitalId, (int) $id);
        return $this->successResponse($rounds, 'Doctor rounds history retrieved');
    }

    #[OA\Post(
        path: "/api/v1/ipd/admissions/{id}/procedures",
        summary: "Record Bedside Nursing Procedure & Charge",
        description: "Nurse logs a bedside procedure (e.g. Dressing, Nebulization, Catheterization, IV Cannulation, ECG). Automatically posts the procedure charge to patient running ledger.",
        security: [["bearerAuth" => []]],
        tags: ["11. IPD (Inpatient Admissions)"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ["procedure_name"],
            properties: [
                new OA\Property(property: "procedure_name", type: "string", example: "Wound Dressing (Minor)"),
                new OA\Property(property: "procedure_code", type: "string", example: "NURS-DRESS-MIN"),
                new OA\Property(property: "performed_at", type: "string", format: "date-time", example: "2026-09-15 11:30:00"),
                new OA\Property(property: "performed_by_name", type: "string", example: "Nurse Sunita"),
                new OA\Property(property: "notes", type: "string", example: "Surgical wound cleaned with betadine, sterile gauze dressing applied"),
                new OA\Property(property: "charge_amount", type: "number", format: "float", example: 200.00)
            ]
        )
    )]
    #[OA\Response(response: 201, description: "Bedside procedure recorded and charge posted")]
    public function recordProcedure(Request $request, $id)
    {
        $validated = $request->validate([
            'procedure_name'    => 'required|string|max:150',
            'procedure_code'    => 'nullable|string|max:50',
            'performed_at'      => 'nullable|date',
            'performed_by_name' => 'nullable|string|max:150',
            'notes'             => 'nullable|string',
            'charge_amount'     => 'nullable|numeric|min:0',
        ]);

        $hospitalId = $this->getHospitalId($request);
        $userId = $request->user()?->id ?? 0;
        $nurseName = $request->user()?->name ?? ($validated['performed_by_name'] ?? 'Staff Nurse');

        try {
            $procedure = $this->ipdService->recordNursingProcedure($hospitalId, (int) $id, $validated, $userId, $nurseName);
            return $this->createdResponse($procedure, 'Bedside nursing procedure recorded and charged successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), null, 400);
        }
    }

    #[OA\Get(
        path: "/api/v1/ipd/admissions/{id}/procedures",
        summary: "Get Bedside Nursing Procedures Log",
        security: [["bearerAuth" => []]],
        tags: ["11. IPD (Inpatient Admissions)"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Nursing procedures list retrieved")]
    public function getProcedures(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $procedures = $this->ipdService->getNursingProcedures($hospitalId, (int) $id);
        return $this->successResponse($procedures, 'Nursing procedures log retrieved');
    }

    #[OA\Get(
        path: "/api/v1/ipd/admissions/{id}/chart",
        summary: "Get Inpatient 360 Comprehensive Medical & Financial Chart",
        description: "Retrieves complete inpatient clinical profile: admission info, doctor SOAP rounds, vital charts, fluid balance summary, MAR drug chart, bedside procedures, shift handovers, and live running financial bill summary.",
        security: [["bearerAuth" => []]],
        tags: ["11. IPD (Inpatient Admissions)"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Inpatient 360 chart retrieved successfully")]
    public function chart(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $chart = $this->ipdService->getInpatientChart($hospitalId, (int) $id);
        return $this->successResponse($chart, 'Inpatient chart retrieved successfully');
    }

    #[OA\Post(
        path: "/api/v1/ipd/admissions/{id}/intake-output",
        summary: "Record Fluid Intake or Output Entry",
        description: "Logs fluid intake (IV fluid, oral, RT feed, blood) or output (urine, RT aspirate, drain, vomitus, stool) in ml.",
        security: [["bearerAuth" => []]],
        tags: ["11. IPD (Inpatient Admissions)"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 201, description: "Fluid balance entry recorded")]
    public function recordIntakeOutput(Request $request, $id)
    {
        $validated = $request->validate([
            'entry_type'       => 'required|string|in:intake,output',
            'category'         => 'required|string|max:50',
            'item_name'        => 'required|string|max:150',
            'quantity_ml'      => 'required|numeric|min:0.01',
            'route'            => 'nullable|string|max:50',
            'recorded_at'      => 'nullable|date',
            'recorded_by_name' => 'nullable|string|max:100',
            'remarks'          => 'nullable|string',
        ]);

        $hospitalId = $this->getHospitalId($request);
        $userId = $request->user()?->id;

        try {
            $entry = $this->ipdService->recordIntakeOutput($hospitalId, (int) $id, $validated, $userId);
            return $this->createdResponse($entry, 'Fluid balance entry recorded successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), null, 400);
        }
    }

    #[OA\Get(
        path: "/api/v1/ipd/admissions/{id}/intake-output",
        summary: "Get Fluid Balance Summary & I/O Logs",
        description: "Returns total intake, total output, net fluid balance, category breakdowns, and chronological logs.",
        security: [["bearerAuth" => []]],
        tags: ["11. IPD (Inpatient Admissions)"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Parameter(name: "date", in: "query", required: false, schema: new OA\Schema(type: "string", format: "date", example: "2026-09-30"))]
    #[OA\Response(response: 200, description: "Fluid balance summary retrieved")]
    public function getIntakeOutput(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $date = $request->query('date');
        $summary = $this->ipdService->getIntakeOutputSummary($hospitalId, (int) $id, $date);
        return $this->successResponse($summary, 'Fluid balance summary retrieved successfully');
    }

    #[OA\Post(
        path: "/api/v1/ipd/admissions/{id}/mar",
        summary: "Record Medication Administration Record (MAR / Drug Chart)",
        description: "Logs drug administration status (given, omitted, refused, held, vomited) with nurse signature and optional auto-billing.",
        security: [["bearerAuth" => []]],
        tags: ["11. IPD (Inpatient Admissions)"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 201, description: "MAR administration recorded")]
    public function recordMar(Request $request, $id)
    {
        $validated = $request->validate([
            'prescription_item_id' => 'nullable|integer',
            'medicine_name'        => 'required|string|max:200',
            'dosage'               => 'required|string|max:100',
            'route'                => 'nullable|string|max:50',
            'scheduled_at'         => 'nullable|date',
            'administered_at'      => 'nullable|date',
            'administered_by_name' => 'nullable|string|max:100',
            'status'               => 'nullable|string|in:given,omitted,refused,held,vomited',
            'omission_reason'      => 'nullable|string|max:255',
            'batch_number'         => 'nullable|string|max:100',
            'notes'                => 'nullable|string',
            'charge_amount'        => 'nullable|numeric|min:0',
            'auto_charge'          => 'nullable|boolean',
            'unit_rate'            => 'nullable|numeric|min:0',
            'quantity'             => 'nullable|integer|min:1',
        ]);

        $hospitalId = $this->getHospitalId($request);
        $userId = $request->user()?->id;

        try {
            $admin = $this->ipdService->recordMarAdministration($hospitalId, (int) $id, $validated, $userId);
            return $this->createdResponse($admin, 'Medication administration recorded successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), null, 400);
        }
    }

    #[OA\Get(
        path: "/api/v1/ipd/admissions/{id}/mar",
        summary: "Get MAR Drug Chart & Administration Progress",
        description: "Returns prescribed medications alongside nurse administration events.",
        security: [["bearerAuth" => []]],
        tags: ["11. IPD (Inpatient Admissions)"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Parameter(name: "date", in: "query", required: false, schema: new OA\Schema(type: "string", format: "date"))]
    #[OA\Response(response: 200, description: "MAR drug chart retrieved")]
    public function getMar(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $date = $request->query('date');
        $chart = $this->ipdService->getMarDrugChart($hospitalId, (int) $id, $date);
        return $this->successResponse($chart, 'MAR drug chart retrieved successfully');
    }

    #[OA\Post(
        path: "/api/v1/ipd/admissions/{id}/shift-handover",
        summary: "Record Nursing Shift Handover Note",
        description: "Creates a bed-by-bed shift transition note with patient condition, critical alerts, and pending tasks.",
        security: [["bearerAuth" => []]],
        tags: ["11. IPD (Inpatient Admissions)"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 201, description: "Shift handover note created")]
    public function recordShiftHandover(Request $request, $id)
    {
        $validated = $request->validate([
            'shift_name'          => 'required|string|in:morning,evening,night',
            'shift_date'          => 'nullable|date',
            'outgoing_nurse_name' => 'required|string|max:100',
            'incoming_nurse_name' => 'nullable|string|max:100',
            'patient_condition'   => 'nullable|string|in:stable,critical,deteriorating,post_op,ventilated',
            'handover_notes'      => 'required|string',
            'critical_alerts'     => 'nullable|string',
            'pending_tasks'       => 'nullable|string',
        ]);

        $hospitalId = $this->getHospitalId($request);

        try {
            $handover = $this->ipdService->recordShiftHandover($hospitalId, (int) $id, $validated);
            return $this->createdResponse($handover, 'Shift handover recorded successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), null, 400);
        }
    }

    #[OA\Get(
        path: "/api/v1/ipd/admissions/{id}/shift-handover",
        summary: "Get Nursing Shift Handovers History",
        security: [["bearerAuth" => []]],
        tags: ["11. IPD (Inpatient Admissions)"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Shift handovers list retrieved")]
    public function getShiftHandovers(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $handovers = $this->ipdService->getShiftHandovers($hospitalId, (int) $id);
        return $this->successResponse($handovers, 'Shift handovers retrieved successfully');
    }

    #[OA\Put(
        path: "/api/v1/ipd/shift-handover/{id}/acknowledge",
        summary: "Acknowledge Shift Handover by Incoming Nurse",
        security: [["bearerAuth" => []]],
        tags: ["11. IPD (Inpatient Admissions)"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Shift handover acknowledged")]
    public function acknowledgeShiftHandover(Request $request, $id)
    {
        $validated = $request->validate([
            'incoming_nurse_name' => 'required|string|max:100',
        ]);

        $hospitalId = $this->getHospitalId($request);

        try {
            $handover = $this->ipdService->acknowledgeShiftHandover($hospitalId, (int) $id, $validated['incoming_nurse_name']);
            return $this->successResponse($handover, 'Shift handover acknowledged successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), null, 400);
        }
    }

    #[OA\Get(
        path: "/api/v1/ipd/opd-referrals",
        summary: "Get pending OPD doctor admission referrals",
        description: "Returns patients where the OPD Doctor set disposition to 'admit_ipd' who are not yet admitted.",
        security: [["bearerAuth" => []]],
        tags: ["11. IPD (Inpatient Admissions)"]
    )]
    #[OA\Response(response: 200, description: "OPD admission referrals retrieved")]
    public function opdReferrals(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);

        $referrals = \App\Models\Prescription::where('hospital_id', $hospitalId)
            ->where('disposition', 'admit_ipd')
            ->whereDoesntHave('patient.ipdAdmissions', function ($q) {
                $q->where('status', 'admitted');
            })
            ->with([
                'patient:id,name,uhid,mobile,gender,dob',
                'doctor:id,name,qualification,department_id',
                'doctor.department:id,name',
                'opdVisit:id,queue_token,opd_number,visit_date',
                'diagnoses',
            ])
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get();

        $data = $referrals->map(function ($rx) {
            return [
                'id'                  => $rx->id,
                'prescription_id'     => $rx->id,
                'prescription_number' => $rx->prescription_number,
                'opd_visit_id'        => $rx->opd_visit_id,
                'token_no'            => (string) ($rx->opdVisit?->queue_token ?? $rx->opdVisit?->opd_number ?? ''),
                'opd_number'          => $rx->opdVisit?->opd_number,
                'patient_id'          => $rx->patient_id,
                'patient'             => $rx->patient,
                'doctor_id'           => $rx->doctor_id,
                'doctor'              => $rx->doctor,
                'admit_priority'      => $rx->admit_priority ?? 'routine',
                'recommended_ward'    => $rx->recommended_ward,
                'disposition_notes'   => $rx->disposition_notes,
                'diagnoses'           => $rx->diagnoses->map(fn($d) => [
                    'code' => $d->icd_code,
                    'name' => $d->diagnosis_name,
                ]),
                'referred_at'         => $rx->created_at->toISOString(),
            ];
        });

        return $this->successResponse($data, 'OPD admission referrals retrieved successfully');
    }

    #[OA\Get(
        path: "/api/v1/ipd/admissions/{id}/discharge-summary",
        summary: "Get or auto-prefill Clinical Discharge Summary",
        description: "Returns existing discharge summary or generates a prefilled draft from admission SOAP rounds, lab investigations, and vitals.",
        security: [["bearerAuth" => []]],
        tags: ["11. IPD (Inpatient Admissions)"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Discharge summary retrieved")]
    public function getDischargeSummary(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        try {
            $data = $this->ipdService->getDischargeSummary($hospitalId, (int) $id);
            return $this->successResponse($data, 'Discharge summary retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), null, 400);
        }
    }

    #[OA\Post(
        path: "/api/v1/ipd/admissions/{id}/discharge-summary",
        summary: "Create or update Clinical Discharge Summary (Draft or Finalize)",
        description: "Saves clinical narrative, diagnoses, take-home Rx medication list, follow-up plan, and optionally finalizes & discharges patient.",
        security: [["bearerAuth" => []]],
        tags: ["11. IPD (Inpatient Admissions)"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Discharge summary saved")]
    public function saveDischargeSummary(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $userId = $request->user()?->id ?? 1;

        $validated = $request->validate([
            'status'                     => 'nullable|string|in:draft,finalized',
            'discharge_type'             => 'nullable|string|in:normal,dama,lama,absconded,referred,expired',
            'admission_date'             => 'nullable|date',
            'discharge_date'             => 'nullable|date',
            'admission_diagnosis'        => 'nullable|string',
            'final_diagnosis'            => 'nullable|string',
            'icd10_code'                 => 'nullable|string',
            'chief_complaints'           => 'nullable|string',
            'history_of_present_illness' => 'nullable|string',
            'past_history_and_allergies' => 'nullable|string',
            'condition_at_discharge'     => 'nullable|string',
            'discharge_vitals'           => 'nullable|array',
            'hospital_course'            => 'nullable|string',
            'procedures_surgeries'       => 'nullable|string',
            'investigations_summary'     => 'nullable|string',
            'treatment_given'            => 'nullable|string',
            'discharge_medications'      => 'nullable|array',
            'dietary_advice'             => 'nullable|string',
            'physical_activity_advice'   => 'nullable|string',
            'wound_care_instructions'    => 'nullable|string',
            'emergency_red_flags'        => 'nullable|string',
            'follow_up_date'             => 'nullable|date',
            'follow_up_doctor_id'        => 'nullable|integer',
            'follow_up_instructions'     => 'nullable|string',
            'mark_as_discharged'         => 'nullable|boolean',
        ]);

        try {
            $saved = $this->ipdService->saveDischargeSummary($hospitalId, (int) $id, $validated, $userId);
            return $this->successResponse($saved, 'Discharge summary saved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), null, 400);
        }
    }

    #[OA\Get(
        path: "/api/v1/ipd/admissions/{id}/discharge-summary/print",
        summary: "Get complete printable NABH Discharge Card Data",
        description: "Returns hospital letterhead details, patient demographic info, summary, medications, and digital sign-off blocks.",
        security: [["bearerAuth" => []]],
        tags: ["11. IPD (Inpatient Admissions)"]
    )]
    #[OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))]
    #[OA\Response(response: 200, description: "Discharge print data retrieved")]
    public function getDischargePrintData(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        try {
            $printData = $this->ipdService->getDischargePrintData($hospitalId, (int) $id);
            return $this->successResponse($printData, 'Discharge card print data retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), null, 400);
        }
    }
}

