<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Traits\HasApiResponse;
use App\Services\Ot\OtServiceInterface;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(
    name: "12. Operation Theatre & Surgeries",
    description: "OT Management — Theatre Status, Surgical Scheduling, and WHO/NABH Surgical Safety Checklist"
)]
class OtController extends Controller
{
    use HasApiResponse;

    public function __construct(
        protected OtServiceInterface $otService
    ) {}

    #[OA\Get(
        path: "/api/v1/ot/theatres",
        summary: "Get list of Operation Theatres and status",
        tags: ["12. Operation Theatre & Surgeries"]
    )]
    public function theatres(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $theatres = $this->otService->getTheatres($hospitalId);
        return $this->successResponse($theatres, 'Operation Theatres retrieved successfully');
    }

    #[OA\Get(
        path: "/api/v1/ot/schedules",
        summary: "Get list of scheduled surgeries",
        tags: ["12. Operation Theatre & Surgeries"]
    )]
    public function schedules(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $filters = $request->only(['date', 'theatre_id', 'surgeon_id', 'patient_id', 'ipd_admission_id', 'status']);
        $schedules = $this->otService->getSchedules($hospitalId, $filters);
        return $this->successResponse($schedules, 'OT Schedules retrieved successfully');
    }

    #[OA\Get(
        path: "/api/v1/ot/schedules/{id}",
        summary: "Get single OT schedule details",
        tags: ["12. Operation Theatre & Surgeries"]
    )]
    public function show(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        try {
            $schedule = $this->otService->getSchedule($hospitalId, (int) $id);
            return $this->successResponse($schedule, 'OT Schedule retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), null, 404);
        }
    }

    #[OA\Post(
        path: "/api/v1/ot/schedules",
        summary: "Book a new surgery schedule",
        tags: ["12. Operation Theatre & Surgeries"]
    )]
    public function store(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $userId = $request->user()?->id;

        $validated = $request->validate([
            'patient_id'             => 'required|integer|exists:patients,id',
            'primary_surgeon_id'     => 'required|integer|exists:doctors,id',
            'procedure_name'         => 'required|string|max:255',
            'procedure_code'         => 'nullable|string|max:50',
            'operation_theatre_id'   => 'nullable|integer|exists:operation_theatres,id',
            'ipd_admission_id'       => 'nullable|integer|exists:ipd_admissions,id',
            'assistant_surgeon_id'   => 'nullable|integer|exists:doctors,id',
            'anesthetist_id'         => 'nullable|integer|exists:doctors,id',
            'surgical_department_id' => 'nullable|integer|exists:departments,id',
            'surgery_date'           => 'required|date',
            'scheduled_start_time'   => 'nullable|string|max:20',
            'scheduled_end_time'     => 'nullable|string|max:20',
            'anesthesia_type'        => 'nullable|string|max:50',
            'priority'               => 'nullable|string|in:elective,urgent,emergency',
            'status'                 => 'nullable|string|in:booked,pre_op_ready,in_theatre,recovery,completed,postponed,cancelled',
            'pre_op_diagnosis'       => 'nullable|string',
            'post_op_diagnosis'      => 'nullable|string',
            'scrub_nurse_name'       => 'nullable|string|max:100',
            'circulating_nurse_name' => 'nullable|string|max:100',
            'blood_required_units'   => 'nullable|integer|min:0',
            'special_instruments'    => 'nullable|string',
        ]);

        try {
            $schedule = $this->otService->createSchedule($hospitalId, $validated, $userId);
            return $this->createdResponse($schedule, 'Surgery scheduled successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), null, 400);
        }
    }

    #[OA\Put(
        path: "/api/v1/ot/schedules/{id}",
        summary: "Update OT schedule details or status",
        tags: ["12. Operation Theatre & Surgeries"]
    )]
    public function update(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);

        $validated = $request->validate([
            'operation_theatre_id'   => 'nullable|integer|exists:operation_theatres,id',
            'assistant_surgeon_id'   => 'nullable|integer|exists:doctors,id',
            'anesthetist_id'         => 'nullable|integer|exists:doctors,id',
            'procedure_name'         => 'nullable|string|max:255',
            'procedure_code'         => 'nullable|string|max:50',
            'surgery_date'           => 'nullable|date',
            'scheduled_start_time'   => 'nullable|string|max:20',
            'scheduled_end_time'     => 'nullable|string|max:20',
            'actual_start_time'      => 'nullable|date',
            'actual_end_time'        => 'nullable|date',
            'anesthesia_type'        => 'nullable|string|max:50',
            'priority'               => 'nullable|string|in:elective,urgent,emergency',
            'status'                 => 'nullable|string|in:booked,pre_op_ready,in_theatre,recovery,completed,postponed,cancelled',
            'pre_op_diagnosis'       => 'nullable|string',
            'post_op_diagnosis'      => 'nullable|string',
            'scrub_nurse_name'       => 'nullable|string|max:100',
            'circulating_nurse_name' => 'nullable|string|max:100',
            'blood_required_units'   => 'nullable|integer|min:0',
            'special_instruments'    => 'nullable|string',
            'surgeon_notes'          => 'nullable|string',
            'recovery_notes'         => 'nullable|string',
            'pacu_discharge_time'    => 'nullable|date',
        ]);

        try {
            $updated = $this->otService->updateSchedule($hospitalId, (int) $id, $validated);
            return $this->successResponse($updated, 'Surgery schedule updated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), null, 400);
        }
    }

    #[OA\Get(
        path: "/api/v1/ot/schedules/{id}/checklist",
        summary: "Get WHO Surgical Safety Checklist for schedule",
        tags: ["12. Operation Theatre & Surgeries"]
    )]
    public function getChecklist(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        try {
            $checklist = $this->otService->getChecklist($hospitalId, (int) $id);
            return $this->successResponse($checklist, 'WHO Checklist retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), null, 400);
        }
    }

    #[OA\Post(
        path: "/api/v1/ot/schedules/{id}/checklist",
        summary: "Save WHO Surgical Safety Checklist (Sign In, Time Out, Sign Out)",
        tags: ["12. Operation Theatre & Surgeries"]
    )]
    public function saveChecklist(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);

        $validated = $request->validate([
            'sign_in_completed'        => 'nullable|boolean',
            'sign_in_nurse_name'       => 'nullable|string|max:100',
            'sign_in_anesthetist_name' => 'nullable|string|max:100',
            'sign_in_checks'           => 'nullable|array',
            'time_out_completed'       => 'nullable|boolean',
            'time_out_checks'          => 'nullable|array',
            'sign_out_completed'       => 'nullable|boolean',
            'sign_out_nurse_name'      => 'nullable|string|max:100',
            'sign_out_checks'          => 'nullable|array',
        ]);

        try {
            $saved = $this->otService->saveChecklist($hospitalId, (int) $id, $validated);
            return $this->successResponse($saved, 'WHO Surgical Safety Checklist saved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), null, 400);
        }
    }

    #[OA\Get(
        path: "/api/v1/ot/schedules/{id}/print",
        summary: "Get complete printable WHO Surgical Safety Checklist Dossier",
        tags: ["12. Operation Theatre & Surgeries"]
    )]
    public function getPrintData(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        try {
            $printData = $this->otService->getPrintData($hospitalId, (int) $id);
            return $this->successResponse($printData, 'Surgical checklist print data retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), null, 400);
        }
    }
}
