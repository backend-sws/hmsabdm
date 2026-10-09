export type BillingType = "fixed" | "per_day" | "per_hour" | "per_unit"

export type LedgerStatus = "unbilled" | "billed" | "cancelled"

export type EncounterType = "ipd" | "opd" | "emergency"

export interface ChargeCategory {
  id: number
  hospital_id: number
  name: string
  display_name: string
  description?: string | null
  charges_count?: number
  created_at?: string
  updated_at?: string
}

export interface ChargeItem {
  id: number
  hospital_id: number
  category_id: number
  code: string
  name: string
  description?: string | null
  billing_type: BillingType
  standard_rate: number
  tax_percentage: number
  is_active: boolean
  ward_id?: number | null
  doctor_id?: number | null
  department_id?: number | null
  category?: ChargeCategory
  ward?: {
    id: number
    name: string
    code: string
  }
  doctor?: {
    id: number
    name: string
  }
  department?: {
    id: number
    name: string
  }
  created_at?: string
  updated_at?: string
}

export interface BillingLedgerItem {
  id: number
  hospital_id: number
  patient_id: number
  encounter_type: EncounterType
  encounter_id: number
  charge_id?: number | null
  category: string
  item_name: string
  unit_price: number
  quantity: number
  tax_amount: number
  discount_amount: number
  total_amount: number
  charged_at: string
  charged_by_user_id?: number
  auto_generated: boolean
  notes?: string | null
  status: LedgerStatus
  created_at?: string
  charge?: ChargeItem
}

export interface CategoryBreakdown {
  count: number
  total: number
}

export interface PatientLedgerSummary {
  patient_id: number
  gross_total: number
  tax_total: number
  discount_total: number
  net_total: number
  by_category: Record<string, CategoryBreakdown>
  item_count: number
  items: BillingLedgerItem[]
}

export interface BedBillingConfig {
  bed_billing_cycle: "admission_24h" | "midnight" | "custom_cutoff" | "hourly"
  bed_cutoff_time: string
  bed_grace_period_minutes: number
  same_day_discharge_rule: "full_day" | "half_day" | "hourly" | "free_if_under_grace"
  auto_apply_nursing_with_bed: boolean
}

export interface InvoiceItem {
  id: number
  item_name: string
  category?: string
  unit_price: number
  quantity: number
  tax_amount: number
  total_amount: number
}

export interface Invoice {
  id: number
  hospital_id: number
  patient_id: number
  ipd_admission_id?: number | null
  invoice_number: string
  total_amount: number
  discount_amount: number
  net_amount: number
  advance_adjusted: number
  insurance_amount: number
  patient_payable: number
  amount_paid: number
  balance_due: number
  payment_status: "paid" | "partial" | "unpaid"
  payment_method: string
  issued_at: string
  discharge_summary?: string
  discharge_advice?: string
  final_diagnosis?: string
  items?: InvoiceItem[]
  patient?: {
    id: number
    uhid: string
    name: string
    gender?: string
    mobile?: string
    address?: string
  }
}

// ─── Payloads ────────────────────────────────────────────────────────
export interface CreateChargePayload {
  category_id: number
  code: string
  name: string
  description?: string
  billing_type?: BillingType
  standard_rate: number
  tax_percentage?: number
  department_id?: number
  doctor_id?: number
  ward_id?: number
}

export interface UpdateChargePayload {
  name?: string
  description?: string
  billing_type?: BillingType
  standard_rate?: number
  tax_percentage?: number
  department_id?: number
  doctor_id?: number
  ward_id?: number
  is_active?: boolean
}

export interface CreateCategoryPayload {
  name: string
  display_name: string
  description?: string
}

export interface PostLedgerPayload {
  patient_id: number
  encounter_type: EncounterType
  encounter_id: number
  charge_id?: number
  category?: string
  item_name: string
  unit_price: number
  quantity?: number
  tax_amount?: number
  discount_amount?: number
  notes?: string
}

// ─── OPD Quick Billing & Orders ───────────────────────────────────────
export interface OpdPendingOrder {
  visit_id: number
  opd_number: string
  queue_token?: number | string
  token_no: string
  visit_date: string
  visit_status: string
  patient: {
    id: number
    name: string
    uhid: string
    mobile?: string
    gender?: string
    age?: number | null
  }
  doctor: {
    id?: number
    name?: string
    department?: string
  }
  consultation_fee: number
  consultation_amount_paid: number
  unpaid_consultation_fee: number
  consultation_payment_status: string
  prescription?: {
    id: number
    prescription_number: string
    disposition?: string
    disposition_notes?: string
    admit_priority?: string
    recommended_ward?: string
    diagnoses?: Array<{ code?: string; name?: string }>
  } | null
  unbilled_investigations: Array<{
    id?: number
    test_name: string
    test_code?: string
    category?: string
    urgency?: string
    standard_rate?: number
    clinical_indication?: string
    status?: string
    billed_invoice_id?: number | null
  }>
  billed_investigations: Array<{
    id?: number
    test_name: string
    test_code?: string
    category?: string
    urgency?: string
    standard_rate?: number
    status?: string
    billed_invoice_id?: number | null
  }>
  has_pending_items: boolean
  total_pending_amount: number
}

export interface CreateOpdBillPayload {
  opd_visit_id: number
  patient_id: number
  bill_consultation_fee?: boolean
  consultation_fee_amount?: number
  investigations?: Array<{
    id?: number
    test_name: string
    test_code?: string
    category?: string
    rate: number
  }>
  custom_items?: Array<{
    item_name: string
    category?: string
    unit_price: number
    quantity?: number
  }>
  discount_amount?: number
  discount_reason?: string
  tax_amount?: number
  payment_method: string
  payment_breakdown?: Array<{ method: string; amount: number; ref?: string }>
  notes?: string
}

export interface OpdReceiptData {
  invoice_id: number
  invoice_number: string
  invoice_date: string
  encounter_type: string
  token_no: string
  opd_number: string
  patient: {
    id: number
    name: string
    uhid: string
    mobile?: string
    gender?: string
    age?: number | null
  }
  doctor: {
    name?: string
    department?: string
  }
  items: Array<{
    item_name: string
    category?: string
    quantity: number
    unit_price: number
    total_amount: number
  }>
  gross_amount: number
  discount_amount: number
  discount_reason?: string
  tax_amount: number
  net_amount: number
  amount_paid: number
  balance_due: number
  payment_method: string
  payment_breakdown?: any
  billed_by?: string
}

export interface OpdAdmissionReferral {
  id: number
  prescription_id: number
  prescription_number: string
  opd_visit_id: number
  token_no: string
  opd_number: string
  patient_id: number
  patient: {
    id: number
    name: string
    uhid: string
    mobile?: string
    gender?: string
    age?: number | null
    dob?: string
  }
  doctor_id: number
  doctor?: {
    id: number
    name: string
    qualification?: string
    department?: { id: number; name: string }
  }
  admit_priority: "routine" | "urgent" | "emergency" | string
  recommended_ward?: string
  disposition_notes?: string
  diagnoses: Array<{ code?: string; name?: string }>
  referred_at: string
}

