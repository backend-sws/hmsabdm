export type PayerType =
  | "tpa"
  | "insurance_company"
  | "corporate"
  | "cghs"
  | "esic"
  | "pmjay"
  | "other"

export type PreauthStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "queried"
  | "query_responded"
  | "denied"
  | "cancelled"
  | "expired"

export type ClaimStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "additional_docs_needed"
  | "approved"
  | "partially_approved"
  | "settled"
  | "rejected"
  | "grievance_raised"
  | "resubmitted"
  | "written_off"

export interface InsurancePayer {
  id: number
  hospital_id: number
  name: string
  payer_type: PayerType
  code?: string | null
  short_code?: string | null
  empanelment_number?: string | null
  empanelment_valid_till?: string | null
  gst_number?: string | null
  pan_number?: string | null
  default_deductible?: number | null
  claim_settlement_days?: number | null
  portal_url?: string | null
  contact_person?: string | null
  contact_phone?: string | null
  contact_email?: string | null
  default_copay_percent: number
  preauth_tat_hours: number
  claims_tat_days: number
  is_active: boolean
  created_at?: string
  updated_at?: string
  [key: string]: any
}

export interface AgingBreakdownItem {
  count: number
  amount: number
}

export interface LiveCashlessAdmission {
  admission_id: number
  admission_number: string
  patient?: {
    id?: number
    name?: string
    uhid?: string
  }
  preauth?: {
    id?: number
    tpa_preauth_number?: string | null
    payer?: {
      id?: number
      name?: string
    }
  }
  admitted_at?: string
}

export interface PayerWiseOutstanding {
  payer?: {
    id: number
    name: string
    payer_type: PayerType
  }
  count: number
  outstanding: number
}

export interface InsuranceDashboardStats {
  active_preauths: number
  pending_claims: number
  ar_outstanding: number
  monthly_settled: number
  expiring_preauths_alert: number
  pending_queries: number
  aging_breakdown: Record<string, AgingBreakdownItem>
  payer_wise_outstanding: PayerWiseOutstanding[]
  live_cashless_admissions: LiveCashlessAdmission[]
}

export interface InsurancePreauth {
  id: number
  preauth_number: string
  admission_id?: number | null
  opd_visit_id?: number | null
  payer_id: number
  patient_insurance_id?: number | null
  hospital_id: number
  preauth_type: string
  status: PreauthStatus
  icd10_codes?: string[] | null
  hbp_code?: string | null
  cghs_package_code?: string | null
  primary_diagnosis?: string | null
  proposed_treatment?: string | null
  estimated_los_days?: number | null
  estimated_amount?: number | null
  room_rent_per_day?: number | null
  tpa_preauth_number?: string | null
  approved_amount?: number | null
  approved_room_rent_cap?: number | null
  approved_icu_cap?: number | null
  approved_los_days?: number | null
  valid_till?: string | null
  sanction_letter_path?: string | null
  approval_remarks?: string | null
  denial_reason?: string | null
  tpa_query?: string | null
  query_raised_at?: string | null
  query_response?: string | null
  query_responded_at?: string | null
  query_documents?: any[] | null
  followup_notes?: any[] | null
  submitted_at?: string | null
  approved_at?: string | null
  denied_at?: string | null
  parent_preauth_id?: number | null
  payer?: InsurancePayer
  patient_insurance?: any
  admission?: any
  created_at?: string
  updated_at?: string
}

export interface InsuranceClaim {
  id: number
  claim_number: string
  preauth_id?: number | null
  admission_id?: number | null
  opd_visit_id?: number | null
  payer_id: number
  patient_insurance_id?: number | null
  hospital_id: number
  claim_type: string
  status: ClaimStatus
  total_bill_amount: number
  claimed_amount: number
  non_payable_amount: number
  copay_amount: number
  deducted_amount: number
  approved_amount?: number | null
  settled_amount?: number | null
  secondary_claim_id?: number | null
  secondary_approved_amount?: number | null
  tpa_claim_number?: string | null
  nhcx_claim_id?: string | null
  tms_transaction_id?: string | null
  submission_date?: string | null
  approval_date?: string | null
  settled_at?: string | null
  settlement_utr?: string | null
  rejection_reason?: string | null
  resubmission_count?: number
  resubmission_notes?: string | null
  grievance_raised_at?: string | null
  grievance_notes?: string | null
  grievance_resolved_at?: string | null
  documents?: any[] | null
  followup_notes?: any[] | null
  payer?: InsurancePayer
  preauth?: InsurancePreauth
  admission?: any
  outstanding_amount?: number
  aging_days?: number
  created_at?: string
  updated_at?: string
}

export interface InsuranceTariffPackage {
  id: number
  payer_id: number
  hospital_id: number
  category: string
  package_code: string
  package_name: string
  description?: string | null
  standard_rate: number
  preauth_required: boolean
  is_active: boolean
}

export interface InsuranceImplantApproval {
  id: number
  hospital_id: number
  payer_id: number
  admission_id: number
  preauth_id?: number | null
  device_name: string
  brand_model?: string | null
  barcode_serial?: string | null
  manufacturer?: string | null
  device_cost: number
  approved_amount?: number | null
  status: "pending" | "approved" | "rejected"
  approval_number?: string | null
  remarks?: string | null
  created_at?: string
  updated_at?: string
}

export interface InsuranceNonpayableItem {
  id: number
  hospital_id: number
  item_code: string
  item_name: string
  category: string
  irdai_list_number?: string | null
  is_standard_exclusion: boolean
}

export interface InsuranceArLedgerItem {
  id: number
  hospital_id: number
  claim_id: number
  payer_id: number
  entry_type: "claim_submitted" | "payment_received" | "deduction" | "tds" | "write_off"
  amount: number
  balance_after: number
  reference_number?: string | null
  notes?: string | null
  entry_date: string
  payer?: InsurancePayer
  claim?: InsuranceClaim
}
