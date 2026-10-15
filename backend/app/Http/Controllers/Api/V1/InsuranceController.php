<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Traits\HasApiResponse;
use App\Services\Insurance\InsuranceServiceInterface;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(
    name: "13. Insurance, TPA & Ayushman Bharat",
    description: "Enterprise Insurance Desk: Multi-payer management (Private TPA, CGHS, ESIC, AB-PMJAY, Corporate), Pre-Authorization lifecycle, Cashless Claims, COB Dual Insurance, AR Aging Ledger, IRDAI Non-payable detection, Implant Prior Approvals"
)]
class InsuranceController extends Controller
{
    use HasApiResponse;

    public function __construct(
        protected InsuranceServiceInterface $insuranceService
    ) {}

    // ─────────────────────────────────────────────────────────────────────
    // DASHBOARD
    // ─────────────────────────────────────────────────────────────────────

    #[OA\Get(
        path: "/api/v1/insurance/dashboard",
        summary: "Insurance Desk KPI Dashboard",
        description: "Returns active pre-auths, pending claims, AR outstanding by aging bucket, expiring pre-auth alerts, pending TPA queries, and live cashless IPD admissions.",
        security: [["bearerAuth" => []]],
        tags: ["13. Insurance, TPA & Ayushman Bharat"]
    )]
    #[OA\Response(response: 200, description: "Dashboard data")]
    public function dashboard(Request $request)
    {
        $hospitalId = $request->user()->hospital_id;
        $data = $this->insuranceService->getDashboardStats($hospitalId);
        return $this->successResponse($data, 'Insurance dashboard stats');
    }

    // ─────────────────────────────────────────────────────────────────────
    // PAYERS
    // ─────────────────────────────────────────────────────────────────────

    #[OA\Get(path: "/api/v1/insurance/payers", summary: "List all insurance payers/TPAs", security: [["bearerAuth" => []]], tags: ["13. Insurance, TPA & Ayushman Bharat"])]
    public function getPayers(Request $request)
    {
        $hospitalId = $request->user()->hospital_id;
        $data = $this->insuranceService->getPayers($hospitalId, $request->all());
        return $this->successResponse($data, 'Payers retrieved');
    }

    #[OA\Post(path: "/api/v1/insurance/payers", summary: "Create insurance payer/TPA", security: [["bearerAuth" => []]], tags: ["13. Insurance, TPA & Ayushman Bharat"])]
    public function createPayer(Request $request)
    {
        $validated = $request->validate([
            'name'                   => 'required|string|max:200',
            'payer_type'             => 'required|in:tpa,insurance_company,corporate,cghs,esic,pmjay,other',
            'code'                   => 'nullable|string|max:50',
            'contact_person'         => 'nullable|string|max:100',
            'contact_phone'          => 'nullable|string|max:20',
            'contact_email'          => 'nullable|email',
            'portal_url'             => 'nullable|url',
            'api_endpoint'           => 'nullable|string',
            'empanelment_number'     => 'nullable|string|max:100',
            'empanelment_valid_till' => 'nullable|date',
            'gst_number'             => 'nullable|string|max:20',
            'pan_number'             => 'nullable|string|max:20',
            'address'                => 'nullable|string',
            'default_copay_percent'  => 'nullable|numeric|min:0|max:100',
            'default_deductible'     => 'nullable|numeric|min:0',
            'preauth_tat_hours'      => 'nullable|integer|min:1',
            'claim_settlement_days'  => 'nullable|integer|min:1',
            'metadata'               => 'nullable|array',
            'is_active'              => 'nullable|boolean',
        ]);

        $result = $this->insuranceService->createPayer($request->user()->hospital_id, $validated, $request->user()->id);
        return $this->successResponse($result, 'Payer created', 201);
    }

    #[OA\Put(path: "/api/v1/insurance/payers/{id}", summary: "Update insurance payer", security: [["bearerAuth" => []]], tags: ["13. Insurance, TPA & Ayushman Bharat"])]
    public function updatePayer(Request $request, int $id)
    {
        $validated = $request->validate([
            'name'                   => 'sometimes|string|max:200',
            'payer_type'             => 'sometimes|in:tpa,insurance_company,corporate,cghs,esic,pmjay,other',
            'contact_person'         => 'nullable|string|max:100',
            'contact_phone'          => 'nullable|string|max:20',
            'contact_email'          => 'nullable|email',
            'portal_url'             => 'nullable|url',
            'empanelment_number'     => 'nullable|string|max:100',
            'empanelment_valid_till' => 'nullable|date',
            'default_copay_percent'  => 'nullable|numeric|min:0|max:100',
            'default_deductible'     => 'nullable|numeric|min:0',
            'is_active'              => 'nullable|boolean',
        ]);

        $result = $this->insuranceService->updatePayer($request->user()->hospital_id, $id, $validated);
        return $this->successResponse($result, 'Payer updated');
    }

    #[OA\Delete(path: "/api/v1/insurance/payers/{id}", summary: "Deactivate payer", security: [["bearerAuth" => []]], tags: ["13. Insurance, TPA & Ayushman Bharat"])]
    public function deletePayer(Request $request, int $id)
    {
        $result = $this->insuranceService->deletePayer($request->user()->hospital_id, $id);
        return $this->successResponse($result, 'Payer deactivated');
    }

    #[OA\Get(path: "/api/v1/insurance/payers/{id}/tariffs", summary: "Get payer tariff packages", security: [["bearerAuth" => []]], tags: ["13. Insurance, TPA & Ayushman Bharat"])]
    public function getPayerTariffs(Request $request, int $id)
    {
        $data = $this->insuranceService->getPayerTariffs($request->user()->hospital_id, $id);
        return $this->successResponse($data, 'Tariff packages retrieved');
    }

    #[OA\Post(path: "/api/v1/insurance/payers/{id}/tariffs", summary: "Save tariff package for payer", security: [["bearerAuth" => []]], tags: ["13. Insurance, TPA & Ayushman Bharat"])]
    public function saveTariffPackage(Request $request, int $id)
    {
        $validated = $request->validate([
            'id'                    => 'nullable|integer',
            'charge_master_id'      => 'nullable|integer|exists:charges_master,id',
            'procedure_name'        => 'required|string|max:200',
            'hbp_code'              => 'nullable|string|max:50',
            'cghs_code'             => 'nullable|string|max:50',
            'category'              => 'required|in:consultation,procedure,surgery,room,icu,lab,pharmacy,implant,other',
            'approved_rate'         => 'required|numeric|min:0',
            'room_rent_cap_per_day' => 'nullable|numeric|min:0',
            'icu_cap_per_day'       => 'nullable|numeric|min:0',
            'max_los_days'          => 'nullable|integer|min:1',
            'requires_prior_approval' => 'nullable|boolean',
            'effective_from'        => 'nullable|date',
            'effective_to'          => 'nullable|date',
            'is_active'             => 'nullable|boolean',
        ]);

        $result = $this->insuranceService->saveTariffPackage($request->user()->hospital_id, $id, $validated);
        return $this->successResponse($result, 'Tariff package saved');
    }

    #[OA\Delete(path: "/api/v1/insurance/payers/{id}/tariffs/{tariffId}", summary: "Delete tariff package", security: [["bearerAuth" => []]], tags: ["13. Insurance, TPA & Ayushman Bharat"])]
    public function deleteTariffPackage(Request $request, int $id, int $tariffId)
    {
        $result = $this->insuranceService->deleteTariffPackage($request->user()->hospital_id, $id, $tariffId);
        return $this->successResponse($result, 'Tariff deleted');
    }

    // ─────────────────────────────────────────────────────────────────────
    // PATIENT INSURANCE
    // ─────────────────────────────────────────────────────────────────────

    #[OA\Get(path: "/api/v1/insurance/patients/{patientId}/policies", summary: "Get patient insurance policies", security: [["bearerAuth" => []]], tags: ["13. Insurance, TPA & Ayushman Bharat"])]
    public function getPatientInsurances(Request $request, int $patientId)
    {
        $data = $this->insuranceService->getPatientInsurances($request->user()->hospital_id, $patientId);
        return $this->successResponse($data, 'Patient insurance policies');
    }

    #[OA\Post(path: "/api/v1/insurance/patients/{patientId}/policies", summary: "Add insurance policy to patient", security: [["bearerAuth" => []]], tags: ["13. Insurance, TPA & Ayushman Bharat"])]
    public function addPatientInsurance(Request $request, int $patientId)
    {
        $validated = $request->validate([
            'payer_id'                  => 'required|integer|exists:insurance_payers,id',
            'policy_number'             => 'nullable|string|max:100',
            'member_id'                 => 'nullable|string|max:100',
            'group_number'              => 'nullable|string|max:100',
            'ayushman_id'               => 'nullable|string|max:100',
            'abha_id'                   => 'nullable|string|max:50',
            'esic_ip_number'            => 'nullable|string|max:50',
            'cghs_beneficiary_number'   => 'nullable|string|max:50',
            'insured_name'              => 'nullable|string|max:200',
            'relation_to_patient'       => 'nullable|in:self,spouse,child,parent,sibling,other',
            'sum_insured'               => 'nullable|numeric|min:0',
            'sum_insured_remaining'     => 'nullable|numeric|min:0',
            'copay_percent'             => 'nullable|numeric|min:0|max:100',
            'deductible'                => 'nullable|numeric|min:0',
            'policy_start'              => 'nullable|date',
            'policy_end'                => 'nullable|date',
            'is_primary'                => 'nullable|boolean',
        ]);

        $result = $this->insuranceService->addPatientInsurance(
            $request->user()->hospital_id, $patientId, $validated, $request->user()->id
        );
        return $this->successResponse($result, 'Insurance policy added', 201);
    }

    #[OA\Put(path: "/api/v1/insurance/policies/{id}", summary: "Update patient insurance policy", security: [["bearerAuth" => []]], tags: ["13. Insurance, TPA & Ayushman Bharat"])]
    public function updatePatientInsurance(Request $request, int $id)
    {
        $validated = $request->validate([
            'sum_insured_remaining' => 'nullable|numeric|min:0',
            'copay_percent'         => 'nullable|numeric|min:0|max:100',
            'deductible'            => 'nullable|numeric|min:0',
            'policy_end'            => 'nullable|date',
            'is_primary'            => 'nullable|boolean',
            'is_active'             => 'nullable|boolean',
        ]);

        $result = $this->insuranceService->updatePatientInsurance($request->user()->hospital_id, $id, $validated);
        return $this->successResponse($result, 'Policy updated');
    }

    #[OA\Post(path: "/api/v1/insurance/policies/{id}/verify", summary: "Verify patient insurance eligibility", security: [["bearerAuth" => []]], tags: ["13. Insurance, TPA & Ayushman Bharat"])]
    public function verifyEligibility(Request $request, int $id)
    {
        $validated = $request->validate([
            'status'                => 'required|in:verified,failed,expired',
            'notes'                 => 'nullable|string',
            'sum_insured_remaining' => 'nullable|numeric|min:0',
        ]);

        $result = $this->insuranceService->verifyEligibility($request->user()->hospital_id, $id, $validated);
        return $this->successResponse($result, 'Eligibility updated');
    }

    // ─────────────────────────────────────────────────────────────────────
    // PRE-AUTHORIZATION
    // ─────────────────────────────────────────────────────────────────────

    #[OA\Get(path: "/api/v1/insurance/preauth", summary: "List all pre-authorizations", security: [["bearerAuth" => []]], tags: ["13. Insurance, TPA & Ayushman Bharat"])]
    public function getPreauths(Request $request)
    {
        $data = $this->insuranceService->getPreauths($request->user()->hospital_id, $request->all());
        return $this->successResponse($data, 'Pre-authorizations retrieved');
    }

    #[OA\Get(path: "/api/v1/insurance/preauth/{id}", summary: "Get pre-auth details", security: [["bearerAuth" => []]], tags: ["13. Insurance, TPA & Ayushman Bharat"])]
    public function getPreauth(Request $request, int $id)
    {
        $data = $this->insuranceService->getPreauth($request->user()->hospital_id, $id);
        return $this->successResponse($data, 'Pre-auth retrieved');
    }

    #[OA\Post(path: "/api/v1/insurance/preauth", summary: "Create pre-authorization request", security: [["bearerAuth" => []]], tags: ["13. Insurance, TPA & Ayushman Bharat"])]
    public function createPreauth(Request $request)
    {
        $validated = $request->validate([
            'admission_id'          => 'nullable|integer|exists:ipd_admissions,id',
            'opd_visit_id'          => 'nullable|integer',
            'payer_id'              => 'required|integer|exists:insurance_payers,id',
            'patient_insurance_id'  => 'required|integer|exists:patient_insurance_details,id',
            'preauth_type'          => 'required|in:initial,enhancement,emergency',
            'icd10_codes'           => 'nullable|array',
            'hbp_code'              => 'nullable|string|max:50',
            'cghs_package_code'     => 'nullable|string|max:50',
            'primary_diagnosis'     => 'required|string|max:500',
            'proposed_treatment'    => 'required|string',
            'estimated_los_days'    => 'nullable|integer|min:0',
            'estimated_amount'      => 'required|numeric|min:0',
            'room_rent_per_day'     => 'nullable|numeric|min:0',
            'auto_submit'           => 'nullable|boolean',
        ]);

        $result = $this->insuranceService->createPreauth(
            $request->user()->hospital_id, $validated, $request->user()->id
        );
        return $this->successResponse($result, 'Pre-auth created', 201);
    }

    #[OA\Put(path: "/api/v1/insurance/preauth/{id}/status", summary: "Update pre-auth status (Approved/Denied/Queried)", security: [["bearerAuth" => []]], tags: ["13. Insurance, TPA & Ayushman Bharat"])]
    public function updatePreauthStatus(Request $request, int $id)
    {
        $validated = $request->validate([
            'status'                    => 'required|in:submitted,approved,queried,query_responded,denied,cancelled,expired',
            'tpa_preauth_number'        => 'nullable|string|max:100',
            'approved_amount'           => 'nullable|numeric|min:0',
            'approved_room_rent_cap'    => 'nullable|numeric|min:0',
            'approved_icu_cap'          => 'nullable|numeric|min:0',
            'approved_los_days'         => 'nullable|integer|min:0',
            'valid_till'                => 'nullable|date',
            'approval_remarks'          => 'nullable|string',
            'denial_reason'             => 'nullable|string',
            'tpa_query'                 => 'nullable|string',
        ]);

        $result = $this->insuranceService->updatePreauthStatus(
            $request->user()->hospital_id, $id, $validated['status'], $validated
        );
        return $this->successResponse($result, 'Pre-auth status updated');
    }

    #[OA\Post(path: "/api/v1/insurance/preauth/{id}/respond-query", summary: "Respond to TPA shortfall query", security: [["bearerAuth" => []]], tags: ["13. Insurance, TPA & Ayushman Bharat"])]
    public function respondToQuery(Request $request, int $id)
    {
        $validated = $request->validate([
            'response'  => 'required|string',
            'documents' => 'nullable|array',
        ]);
        $result = $this->insuranceService->respondToQuery($request->user()->hospital_id, $id, $validated);
        return $this->successResponse($result, 'Query response submitted');
    }

    #[OA\Post(path: "/api/v1/insurance/preauth/{id}/enhancement", summary: "Raise enhancement request", security: [["bearerAuth" => []]], tags: ["13. Insurance, TPA & Ayushman Bharat"])]
    public function createEnhancement(Request $request, int $id)
    {
        $validated = $request->validate([
            'primary_diagnosis'     => 'required|string|max:500',
            'proposed_treatment'    => 'required|string',
            'estimated_amount'      => 'required|numeric|min:0',
            'estimated_los_days'    => 'nullable|integer|min:0',
            'reason_for_enhancement' => 'required|string',
        ]);

        $result = $this->insuranceService->createEnhancement(
            $request->user()->hospital_id, $id, $validated, $request->user()->id
        );
        return $this->successResponse($result, 'Enhancement request created', 201);
    }

    #[OA\Get(path: "/api/v1/insurance/preauth/expiring", summary: "Get pre-auths expiring soon", security: [["bearerAuth" => []]], tags: ["13. Insurance, TPA & Ayushman Bharat"])]
    public function expiringPreauths(Request $request)
    {
        $days = $request->integer('days', 2);
        $data = $this->insuranceService->getExpiringPreauths($request->user()->hospital_id, $days);
        return $this->successResponse($data, 'Expiring pre-authorizations');
    }

    #[OA\Post(path: "/api/v1/insurance/preauth/{id}/followup", summary: "Log call/followup communication for pre-auth", security: [["bearerAuth" => []]], tags: ["13. Insurance, TPA & Ayushman Bharat"])]
    public function addPreauthFollowup(Request $request, int $id)
    {
        $validated = $request->validate([
            'contact_person'     => 'nullable|string|max:200',
            'channel'            => 'nullable|string|max:50',
            'status_discussed'   => 'nullable|string|max:200',
            'notes'              => 'required|string',
            'next_followup_date' => 'nullable|date',
        ]);
        $userName = $request->user()->name ?? 'TPA Desk Staff';
        $result = $this->insuranceService->addPreauthFollowup(
            $request->user()->hospital_id, $id, $validated, $userName
        );
        return $this->successResponse($result, 'Follow-up communication logged');
    }

    // ─────────────────────────────────────────────────────────────────────
    // CLAIMS
    // ─────────────────────────────────────────────────────────────────────

    #[OA\Get(path: "/api/v1/insurance/claims", summary: "List all insurance claims", security: [["bearerAuth" => []]], tags: ["13. Insurance, TPA & Ayushman Bharat"])]
    public function getClaims(Request $request)
    {
        $data = $this->insuranceService->getClaims($request->user()->hospital_id, $request->all());
        return $this->successResponse($data, 'Claims retrieved');
    }

    #[OA\Get(path: "/api/v1/insurance/claims/{id}", summary: "Get claim details with AR ledger", security: [["bearerAuth" => []]], tags: ["13. Insurance, TPA & Ayushman Bharat"])]
    public function getClaim(Request $request, int $id)
    {
        $data = $this->insuranceService->getClaim($request->user()->hospital_id, $id);
        return $this->successResponse($data, 'Claim retrieved');
    }

    #[OA\Post(path: "/api/v1/insurance/claims", summary: "Create insurance claim", security: [["bearerAuth" => []]], tags: ["13. Insurance, TPA & Ayushman Bharat"])]
    public function createClaim(Request $request)
    {
        $validated = $request->validate([
            'preauth_id'            => 'nullable|integer|exists:insurance_preauths,id',
            'admission_id'          => 'nullable|integer|exists:ipd_admissions,id',
            'opd_visit_id'          => 'nullable|integer',
            'payer_id'              => 'required|integer|exists:insurance_payers,id',
            'patient_insurance_id'  => 'required|integer|exists:patient_insurance_details,id',
            'claim_type'            => 'required|in:cashless,reimbursement,corporate_billing',
            'total_bill_amount'     => 'required|numeric|min:0',
            'non_payable_amount'    => 'nullable|numeric|min:0',
            'tpa_claim_number'      => 'nullable|string|max:100',
            'nhcx_claim_id'         => 'nullable|string|max:200',
            'tms_transaction_id'    => 'nullable|string|max:200',
            'auto_submit'           => 'nullable|boolean',
            // Dual insurance (COB)
            'secondary_claim_id'    => 'nullable|integer|exists:insurance_claims,id',
        ]);

        $result = $this->insuranceService->createClaim(
            $request->user()->hospital_id, $validated, $request->user()->id
        );
        return $this->successResponse($result, 'Claim created', 201);
    }

    #[OA\Put(path: "/api/v1/insurance/claims/{id}/status", summary: "Update claim status", security: [["bearerAuth" => []]], tags: ["13. Insurance, TPA & Ayushman Bharat"])]
    public function updateClaimStatus(Request $request, int $id)
    {
        $validated = $request->validate([
            'status'            => 'required|in:submitted,under_review,additional_docs_needed,approved,partially_approved,rejected',
            'approved_amount'   => 'nullable|numeric|min:0',
            'rejection_reason'  => 'nullable|string',
            'tpa_claim_number'  => 'nullable|string|max:100',
        ]);

        $result = $this->insuranceService->updateClaimStatus(
            $request->user()->hospital_id, $id, $validated['status'], $validated
        );
        return $this->successResponse($result, 'Claim status updated');
    }

    #[OA\Post(path: "/api/v1/insurance/claims/{id}/settle", summary: "Record claim settlement", security: [["bearerAuth" => []]], tags: ["13. Insurance, TPA & Ayushman Bharat"])]
    public function settleClaim(Request $request, int $id)
    {
        $validated = $request->validate([
            'settled_amount'   => 'required|numeric|min:0',
            'settlement_utr'   => 'nullable|string|max:200',
            'notes'            => 'nullable|string',
        ]);

        $result = $this->insuranceService->settleClaim(
            $request->user()->hospital_id, $id, $validated, $request->user()->id
        );
        return $this->successResponse($result, 'Claim settled');
    }

    #[OA\Post(path: "/api/v1/insurance/claims/{id}/resubmit", summary: "Resubmit rejected claim", security: [["bearerAuth" => []]], tags: ["13. Insurance, TPA & Ayushman Bharat"])]
    public function resubmitClaim(Request $request, int $id)
    {
        $validated = $request->validate(['notes' => 'nullable|string']);
        $result = $this->insuranceService->resubmitClaim(
            $request->user()->hospital_id, $id, $validated, $request->user()->id
        );
        return $this->successResponse($result, 'Claim resubmitted');
    }

    #[OA\Post(path: "/api/v1/insurance/claims/{id}/grievance", summary: "Raise grievance on claim", security: [["bearerAuth" => []]], tags: ["13. Insurance, TPA & Ayushman Bharat"])]
    public function raiseGrievance(Request $request, int $id)
    {
        $validated = $request->validate(['notes' => 'required|string']);
        $result = $this->insuranceService->raiseGrievance(
            $request->user()->hospital_id, $id, $validated, $request->user()->id
        );
        return $this->successResponse($result, 'Grievance raised');
    }

    #[OA\Get(path: "/api/v1/insurance/claims/{id}/dossier", summary: "Get claim dossier completeness", security: [["bearerAuth" => []]], tags: ["13. Insurance, TPA & Ayushman Bharat"])]
    public function getClaimDossier(Request $request, int $id)
    {
        $data = $this->insuranceService->getClaimDossier($request->user()->hospital_id, $id);
        return $this->successResponse($data, 'Claim dossier');
    }

    #[OA\Post(path: "/api/v1/insurance/claims/{id}/followup", summary: "Log call/followup communication for claim", security: [["bearerAuth" => []]], tags: ["13. Insurance, TPA & Ayushman Bharat"])]
    public function addClaimFollowup(Request $request, int $id)
    {
        $validated = $request->validate([
            'contact_person'     => 'nullable|string|max:200',
            'channel'            => 'nullable|string|max:50',
            'status_discussed'   => 'nullable|string|max:200',
            'notes'              => 'required|string',
            'next_followup_date' => 'nullable|date',
        ]);
        $userName = $request->user()->name ?? 'TPA Desk Staff';
        $result = $this->insuranceService->addClaimFollowup(
            $request->user()->hospital_id, $id, $validated, $userName
        );
        return $this->successResponse($result, 'Follow-up communication logged');
    }

    // ─────────────────────────────────────────────────────────────────────
    // NON-PAYABLE ITEMS
    // ─────────────────────────────────────────────────────────────────────

    #[OA\Get(path: "/api/v1/insurance/non-payables", summary: "Get IRDAI non-payable items", security: [["bearerAuth" => []]], tags: ["13. Insurance, TPA & Ayushman Bharat"])]
    public function getNonPayableItems(Request $request)
    {
        $data = $this->insuranceService->getNonPayableItems(
            $request->user()->hospital_id,
            $request->integer('payer_id', 0) ?: null
        );
        return $this->successResponse($data, 'Non-payable items');
    }

    #[OA\Post(path: "/api/v1/insurance/non-payables", summary: "Save non-payable item", security: [["bearerAuth" => []]], tags: ["13. Insurance, TPA & Ayushman Bharat"])]
    public function saveNonPayableItem(Request $request)
    {
        $validated = $request->validate([
            'id'               => 'nullable|integer',
            'payer_id'         => 'nullable|integer|exists:insurance_payers,id',
            'charge_master_id' => 'nullable|integer|exists:charges_master,id',
            'item_name'        => 'required|string|max:200',
            'item_code'        => 'nullable|string|max:50',
            'category'         => 'required|in:consumable,toiletry,diet,administrative,cosmetic,other',
            'reason'           => 'nullable|string',
            'irdai_circular'   => 'nullable|string|max:100',
            'is_active'        => 'nullable|boolean',
        ]);

        $result = $this->insuranceService->saveNonPayableItem($request->user()->hospital_id, $validated);
        return $this->successResponse($result, 'Non-payable item saved');
    }

    #[OA\Delete(path: "/api/v1/insurance/non-payables/{id}", summary: "Delete non-payable item", security: [["bearerAuth" => []]], tags: ["13. Insurance, TPA & Ayushman Bharat"])]
    public function deleteNonPayableItem(Request $request, int $id)
    {
        $result = $this->insuranceService->deleteNonPayableItem($request->user()->hospital_id, $id);
        return $this->successResponse($result, 'Item removed');
    }

    #[OA\Get(path: "/api/v1/insurance/detect-non-payables/{admissionId}", summary: "Auto-detect non-payable items in admission bill", security: [["bearerAuth" => []]], tags: ["13. Insurance, TPA & Ayushman Bharat"])]
    public function detectNonPayables(Request $request, int $admissionId)
    {
        $data = $this->insuranceService->detectNonPayables(
            $request->user()->hospital_id,
            $admissionId,
            $request->integer('payer_id', 0) ?: null
        );
        return $this->successResponse($data, 'Non-payable detection result');
    }

    // ─────────────────────────────────────────────────────────────────────
    // AR AGING LEDGER
    // ─────────────────────────────────────────────────────────────────────

    #[OA\Get(path: "/api/v1/insurance/ar-ledger", summary: "AR Aging Ledger", security: [["bearerAuth" => []]], tags: ["13. Insurance, TPA & Ayushman Bharat"])]
    public function getArLedger(Request $request)
    {
        $data = $this->insuranceService->getArLedger($request->user()->hospital_id, $request->all());
        return $this->successResponse($data, 'AR aging ledger');
    }

    #[OA\Get(path: "/api/v1/insurance/ar-summary", summary: "AR Aging Summary by bucket", security: [["bearerAuth" => []]], tags: ["13. Insurance, TPA & Ayushman Bharat"])]
    public function getArSummary(Request $request)
    {
        $data = $this->insuranceService->getArAgingSummary($request->user()->hospital_id);
        return $this->successResponse($data, 'AR aging summary');
    }

    // ─────────────────────────────────────────────────────────────────────
    // IMPLANT APPROVALS
    // ─────────────────────────────────────────────────────────────────────

    #[OA\Get(path: "/api/v1/insurance/implants", summary: "List implant/device prior approvals", security: [["bearerAuth" => []]], tags: ["13. Insurance, TPA & Ayushman Bharat"])]
    public function getImplantApprovals(Request $request)
    {
        $data = $this->insuranceService->getImplantApprovals($request->user()->hospital_id, $request->all());
        return $this->successResponse($data, 'Implant approvals');
    }

    #[OA\Post(path: "/api/v1/insurance/implants", summary: "Create implant prior approval request", security: [["bearerAuth" => []]], tags: ["13. Insurance, TPA & Ayushman Bharat"])]
    public function createImplantApproval(Request $request)
    {
        $validated = $request->validate([
            'preauth_id'    => 'nullable|integer|exists:insurance_preauths,id',
            'admission_id'  => 'nullable|integer|exists:ipd_admissions,id',
            'payer_id'      => 'required|integer|exists:insurance_payers,id',
            'device_name'   => 'required|string|max:200',
            'brand_model'   => 'nullable|string|max:200',
            'barcode_serial' => 'nullable|string|max:100',
            'manufacturer'  => 'nullable|string|max:200',
            'device_cost'   => 'required|numeric|min:0',
        ]);

        $result = $this->insuranceService->createImplantApproval(
            $request->user()->hospital_id, $validated, $request->user()->id
        );
        return $this->successResponse($result, 'Implant approval request created', 201);
    }

    #[OA\Put(path: "/api/v1/insurance/implants/{id}", summary: "Update implant approval status", security: [["bearerAuth" => []]], tags: ["13. Insurance, TPA & Ayushman Bharat"])]
    public function updateImplantApproval(Request $request, int $id)
    {
        $validated = $request->validate([
            'status'             => 'required|in:pending,approved,denied,not_required',
            'approval_reference' => 'nullable|string|max:100',
            'denial_reason'      => 'nullable|string',
        ]);

        $result = $this->insuranceService->updateImplantApproval(
            $request->user()->hospital_id, $id, $validated
        );
        return $this->successResponse($result, 'Implant approval updated');
    }
}
