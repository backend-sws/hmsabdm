<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Traits\HasApiResponse;
use App\Services\BloodBank\BloodBankServiceInterface;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(
    name: "20. Blood Bank & Transfusion Medicine",
    description: "Enterprise Blood Bank Management: Voluntary & Replacement Donors, Pre-Donation Screening & Consent, TTI Clearances, Cold Storage Inventory, Cross-Matching, Bedside Transfusion & HvPI Hemovigilance"
)]
class BloodBankController extends Controller
{
    use HasApiResponse;

    public function __construct(
        protected BloodBankServiceInterface $bloodBankService
    ) {}

    #[OA\Get(
        path: "/api/v1/blood-bank/dashboard",
        summary: "Live Blood Matrix & Inventory Dashboard",
        description: "Returns 8 blood groups matrix (A+, A-, B+, B-, AB+, AB-, O+, O-) broken down by PRBC, FFP, Platelets, Whole Blood, Cryo, expiring units in 48 hours, and critical shortage alerts.",
        security: [["bearerAuth" => []]],
        tags: ["20. Blood Bank & Transfusion Medicine"]
    )]
    public function dashboard(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $kpis = $this->bloodBankService->getDashboardKpis($hospitalId);
        return $this->successResponse($kpis, 'Blood bank live dashboard retrieved successfully');
    }

    #[OA\Get(
        path: "/api/v1/blood-bank/donors",
        summary: "List Donors with Search & Deferral Filters",
        security: [["bearerAuth" => []]],
        tags: ["20. Blood Bank & Transfusion Medicine"]
    )]
    public function getDonors(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $donors = $this->bloodBankService->getDonors($hospitalId, $request->all());
        return $this->paginatedResponse($donors, 'Blood donors retrieved successfully');
    }

    #[OA\Post(
        path: "/api/v1/blood-bank/donors",
        summary: "Register a New Blood Donor",
        description: "Enrolls voluntary or replacement donor, links ABHA/Aadhaar, and issues Donor ID (DN-YYYY-XXXXX).",
        security: [["bearerAuth" => []]],
        tags: ["20. Blood Bank & Transfusion Medicine"]
    )]
    public function registerDonor(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);

        $validated = $request->validate([
            'name'            => 'required|string|max:150',
            'mobile'          => 'required|string|max:20',
            'email'           => 'nullable|email|max:100',
            'gender'          => 'required|string|in:M,F,O',
            'dob'             => 'nullable|date',
            'age'             => 'required|integer|min:18|max:65',
            'blood_group'     => 'required|string|in:A+,A-,B+,B-,AB+,AB-,O+,O-',
            'donor_type'      => 'required|string|in:voluntary,replacement',
            'patient_id'      => 'nullable|integer',
            'patient_uhid'    => 'nullable|string|max:50',
            'abha_number'     => 'nullable|string|max:50',
            'abha_address'    => 'nullable|string|max:100',
            'id_proof_type'   => 'nullable|string|max:50',
            'id_proof_number' => 'nullable|string|max:100',
            'occupation'      => 'nullable|string|max:100',
            'address'         => 'nullable|string',
            'city'            => 'nullable|string|max:100',
        ]);

        $donor = $this->bloodBankService->registerDonor($hospitalId, $validated);
        return $this->createdResponse($donor, 'Donor registered successfully');
    }

    #[OA\Post(
        path: "/api/v1/blood-bank/donors/{id}/screen",
        summary: "Pre-Donation Medical Screening, Vitals & Phlebotomy",
        description: "Validates minimum Hb >= 12.5 g/dL, weight >= 45 kg, BP, and past medical history declaration. On passing, generates blood unit in quarantine (BAG-YYYY-XXXXX).",
        security: [["bearerAuth" => []]],
        tags: ["20. Blood Bank & Transfusion Medicine"]
    )]
    public function screenDonor(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $userId = $request->user()?->id;

        $validated = $request->validate([
            'weight_kg'               => 'required|numeric|min:30',
            'hemoglobin_g_dl'         => 'required|numeric|min:5|max:25',
            'bp_systolic'             => 'nullable|integer',
            'bp_diastolic'            => 'nullable|integer',
            'pulse'                   => 'nullable|integer',
            'temperature'             => 'nullable|numeric',
            'medical_history_answers' => 'nullable|array',
            'donor_signature_data'    => 'nullable|string',
            'component_type'          => 'nullable|string|in:whole_blood,sdp,platelets',
            'volume_ml'               => 'nullable|integer',
            'bag_type'                => 'nullable|string|in:single,double,triple,quadruple,apheresis',
            'storage_location'        => 'nullable|string',
            'camp_id'                 => 'nullable|integer',
        ]);

        $result = $this->bloodBankService->screenDonor($hospitalId, (int) $id, $validated, $userId);

        if (!$result['eligible']) {
            return $this->errorResponse(
                'Donor is temporarily deferred from donating blood: ' . $result['rejection_reason'],
                $result,
                422
            );
        }

        return $this->createdResponse($result, 'Donor screened and blood bag collected in quarantine successfully');
    }

    #[OA\Get(
        path: "/api/v1/blood-bank/units",
        summary: "List Blood Units in Cold Storage Inventory",
        security: [["bearerAuth" => []]],
        tags: ["20. Blood Bank & Transfusion Medicine"]
    )]
    public function getBloodUnits(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $units = $this->bloodBankService->getBloodUnits($hospitalId, $request->all());
        return $this->paginatedResponse($units, 'Blood units retrieved successfully');
    }

    #[OA\Post(
        path: "/api/v1/blood-bank/units/{id}/tti-test",
        summary: "Record TTI Testing (HIV, HBV, HCV, Syphilis, Malaria)",
        description: "Pathologist signs off 5 mandatory TTI tests. If passed, moves unit to Available inventory. If reactive, flags Biohazard Discard.",
        security: [["bearerAuth" => []]],
        tags: ["20. Blood Bank & Transfusion Medicine"]
    )]
    public function recordTtiTest(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $userId = $request->user()?->id;

        $validated = $request->validate([
            'hiv_result'                  => 'required|string|in:non_reactive,reactive',
            'hbv_result'                  => 'required|string|in:non_reactive,reactive',
            'hcv_result'                  => 'required|string|in:non_reactive,reactive',
            'syphilis_result'             => 'required|string|in:non_reactive,reactive',
            'malaria_result'              => 'required|string|in:non_reactive,reactive',
            'blood_group_confirmed'       => 'nullable|string|in:A+,A-,B+,B-,AB+,AB-,O+,O-',
            'remarks'                     => 'nullable|string|max:255',
            'storage_location'            => 'nullable|string|max:100',
            'authorized_by_pathologist_id'=> 'nullable|integer',
        ]);

        $tti = $this->bloodBankService->recordTtiTest($hospitalId, (int) $id, $validated, $userId);
        return $this->successResponse($tti, 'TTI screening recorded and unit stock status updated successfully');
    }

    #[OA\Post(
        path: "/api/v1/blood-bank/units/{id}/separate",
        summary: "Component Separation (Whole Blood -> PRBC + FFP + Platelets)",
        description: "Centrifuges whole blood unit into therapeutic components with separate shelf-lives (PRBC 42d, FFP 1y, Platelets 5d).",
        security: [["bearerAuth" => []]],
        tags: ["20. Blood Bank & Transfusion Medicine"]
    )]
    public function separateComponents(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $userId = $request->user()?->id;

        $validated = $request->validate([
            'prbc'             => 'nullable|boolean',
            'prbc_volume'      => 'nullable|integer',
            'is_leukodepleted' => 'nullable|boolean',
            'ffp'              => 'nullable|boolean',
            'ffp_volume'       => 'nullable|integer',
            'platelets'        => 'nullable|boolean',
            'platelet_volume'  => 'nullable|integer',
        ]);

        try {
            $result = $this->bloodBankService->separateComponents($hospitalId, (int) $id, $validated, $userId);
            return $this->createdResponse($result, 'Components separated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), null, 400);
        }
    }

    #[OA\Post(
        path: "/api/v1/blood-bank/requisitions",
        summary: "Create Inpatient / OT / Emergency Blood Requisition",
        security: [["bearerAuth" => []]],
        tags: ["20. Blood Bank & Transfusion Medicine"]
    )]
    public function createRequisition(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);

        $validated = $request->validate([
            'patient_id'                         => 'required|integer',
            'admission_id'                       => 'nullable|integer',
            'doctor_id'                          => 'required|integer',
            'department_id'                      => 'nullable|integer',
            'blood_group_needed'                 => 'required|string|in:A+,A-,B+,B-,AB+,AB-,O+,O-',
            'component_needed'                   => 'required|string|in:prbc,ffp,platelets,whole_blood,cryo,sdp',
            'units_requested'                    => 'required|integer|min:1|max:20',
            'urgency'                            => 'required|string|in:routine,urgent,emergency_un_crossmatched,mtp',
            'clinical_indication'                => 'nullable|string',
            'hb_level'                           => 'nullable|numeric',
            'date_needed'                        => 'nullable|date',
            'emergency_consultant_waiver_signed' => 'nullable|boolean',
        ]);

        $req = $this->bloodBankService->createRequisition($hospitalId, $validated);
        return $this->createdResponse($req, 'Blood requisition submitted successfully');
    }

    #[OA\Get(
        path: "/api/v1/blood-bank/requisitions",
        summary: "List Blood Requisitions",
        security: [["bearerAuth" => []]],
        tags: ["20. Blood Bank & Transfusion Medicine"]
    )]
    public function getRequisitions(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $requisitions = $this->bloodBankService->getRequisitions($hospitalId, $request->all());
        return $this->paginatedResponse($requisitions, 'Blood requisitions retrieved successfully');
    }

    #[OA\Post(
        path: "/api/v1/blood-bank/requisitions/{id}/crossmatch",
        summary: "Perform Major/Minor Cross-Match & Reserve Unit",
        security: [["bearerAuth" => []]],
        tags: ["20. Blood Bank & Transfusion Medicine"]
    )]
    public function performCrossmatch(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $userId = $request->user()?->id;

        $validated = $request->validate([
            'blood_unit_id'     => 'required|integer',
            'method'            => 'nullable|string|in:gel_card,tube_ahg,emergency_uncrossmatched',
            'compatibility'     => 'required|string|in:compatible,incompatible,pending',
            'reservation_hours' => 'nullable|integer|min:1|max:72',
            'service_charge'    => 'nullable|numeric',
        ]);

        try {
            $crossmatch = $this->bloodBankService->performCrossmatch($hospitalId, (int) $id, $validated, $userId);
            return $this->createdResponse($crossmatch, 'Cross-match completed and blood unit reserved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), null, 400);
        }
    }

    #[OA\Post(
        path: "/api/v1/blood-bank/crossmatches/{id}/issue",
        summary: "Issue Blood Unit with Cold Box Tally & Transfusion Tag",
        security: [["bearerAuth" => []]],
        tags: ["20. Blood Bank & Transfusion Medicine"]
    )]
    public function issueBlood(Request $request, $id)
    {
        $hospitalId = $this->getHospitalId($request);
        $userId = $request->user()?->id;

        $validated = $request->validate([
            'issued_to_staff_name' => 'required|string|max:100',
            'cold_box_temperature' => 'nullable|numeric',
        ]);

        try {
            $issue = $this->bloodBankService->issueBlood($hospitalId, (int) $id, $validated, $userId);
            return $this->successResponse($issue, 'Blood unit issued and Transfusion Compatibility Tag generated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), null, 400);
        }
    }

    #[OA\Post(
        path: "/api/v1/blood-bank/reactions",
        summary: "Report HvPI Adverse Transfusion Reaction",
        description: "Logs clinical reaction (TRALI, TACO, FNHTR, Anaphylaxis) and auto-quarantines companion components from same donor.",
        security: [["bearerAuth" => []]],
        tags: ["20. Blood Bank & Transfusion Medicine"]
    )]
    public function recordReaction(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $userId = $request->user()?->id;

        $validated = $request->validate([
            'blood_unit_id'          => 'required|integer',
            'patient_id'             => 'required|integer',
            'admission_id'           => 'nullable|integer',
            'requisition_id'         => 'nullable|integer',
            'transfusion_started_at' => 'nullable|date',
            'reaction_occurred_at'   => 'nullable|date',
            'volume_transfused_ml'   => 'nullable|integer',
            'reaction_type'          => 'required|string|in:acute_hemolytic,febrile_non_hemolytic,allergic,anaphylactic,trali,taco,sepsis,other',
            'severity'               => 'required|string|in:mild,moderate,severe,life_threatening,fatal',
            'clinical_symptoms'      => 'required|string',
            'action_taken'           => 'required|string',
            'remnant_bag_returned'   => 'nullable|boolean',
        ]);

        try {
            $reaction = $this->bloodBankService->recordReaction($hospitalId, $validated, $userId);
            return $this->createdResponse($reaction, 'Adverse transfusion reaction recorded and companion units quarantined successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), null, 400);
        }
    }

    #[OA\Get(
        path: "/api/v1/blood-bank/camps",
        summary: "List Outdoor Blood Donation Camps",
        security: [["bearerAuth" => []]],
        tags: ["20. Blood Bank & Transfusion Medicine"]
    )]
    public function getCamps(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $camps = $this->bloodBankService->getCamps($hospitalId, $request->all());
        return $this->paginatedResponse($camps, 'Blood donation camps retrieved successfully');
    }

    #[OA\Post(
        path: "/api/v1/blood-bank/camps",
        summary: "Create Outdoor Blood Donation Camp",
        security: [["bearerAuth" => []]],
        tags: ["20. Blood Bank & Transfusion Medicine"]
    )]
    public function createCamp(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);

        $validated = $request->validate([
            'camp_name'           => 'required|string|max:150',
            'organizer_name'      => 'required|string|max:150',
            'location'            => 'required|string|max:255',
            'camp_date'           => 'required|date',
            'target_units'        => 'nullable|integer|min:10',
            'coordinator_contact' => 'nullable|string|max:50',
            'status'              => 'nullable|string|in:scheduled,in_progress,completed,cancelled',
        ]);

        $camp = $this->bloodBankService->createCamp($hospitalId, $validated);
        return $this->createdResponse($camp, 'Blood camp created successfully');
    }

    #[OA\Get(
        path: "/api/v1/blood-bank/screening-config",
        summary: "Get Customizable Donor Screening Questions & Vital Thresholds",
        description: "Returns hospital's customizable past medical history questionnaire, deferral rules, and mandatory physiological vital thresholds.",
        security: [["bearerAuth" => []]],
        tags: ["20. Blood Bank & Transfusion Medicine"]
    )]
    public function getScreeningConfig(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $config = $this->bloodBankService->getScreeningConfig($hospitalId);
        return $this->successResponse($config, 'Donor screening configuration retrieved successfully');
    }

    #[OA\Put(
        path: "/api/v1/blood-bank/screening-config",
        summary: "Update Donor Screening Questions & Vital Thresholds",
        description: "Enables hospital admins to add custom screening questions, toggle active questions, customize deferral durations, and configure vital limits.",
        security: [["bearerAuth" => []]],
        tags: ["20. Blood Bank & Transfusion Medicine"]
    )]
    public function updateScreeningConfig(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);

        $validated = $request->validate([
            'vital_rules'                    => 'nullable|array',
            'vital_rules.min_weight_kg'       => 'nullable|numeric|min:30',
            'vital_rules.min_hemoglobin_g_dl' => 'nullable|numeric|min:8',
            'vital_rules.min_bp_systolic'     => 'nullable|integer',
            'vital_rules.max_bp_systolic'     => 'nullable|integer',
            'vital_rules.min_bp_diastolic'    => 'nullable|integer',
            'vital_rules.max_bp_diastolic'    => 'nullable|integer',
            'vital_rules.min_pulse'           => 'nullable|integer',
            'vital_rules.max_pulse'           => 'nullable|integer',
            'vital_rules.max_temperature'     => 'nullable|numeric',
            'questions'                      => 'nullable|array',
            'questions.*.id'                 => 'required|string',
            'questions.*.label'              => 'required|string',
            'questions.*.category'           => 'nullable|string',
            'questions.*.deferral_type'      => 'nullable|string|in:temporary,permanent',
            'questions.*.deferral_days'      => 'nullable|integer',
            'questions.*.is_active'          => 'nullable|boolean',
            'questions.*.is_custom'          => 'nullable|boolean',
            'questions.*.display_order'      => 'nullable|integer',
        ]);

        $updated = $this->bloodBankService->updateScreeningConfig($hospitalId, $validated);
        return $this->successResponse($updated, 'Donor screening configuration updated successfully');
    }

    #[OA\Post(
        path: "/api/v1/blood-bank/screening-config/reset",
        summary: "Reset Screening Protocol to Statutory Defaults",
        security: [["bearerAuth" => []]],
        tags: ["20. Blood Bank & Transfusion Medicine"]
    )]
    public function resetScreeningConfig(Request $request)
    {
        $hospitalId = $this->getHospitalId($request);
        $defaults = $this->bloodBankService->resetScreeningConfig($hospitalId);
        return $this->successResponse($defaults, 'Donor screening configuration reset to national defaults');
    }
}
