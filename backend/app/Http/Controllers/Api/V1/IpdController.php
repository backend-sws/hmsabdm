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
}
