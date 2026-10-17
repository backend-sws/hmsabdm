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
  encounter_type?: EncounterType | string
  invoice_number: string
  invoice_date?: string
  total_amount: number
  gross_amount?: number
  discount_amount: number
  discount_reason?: string
  net_amount: number
  advance_adjusted: number
  insurance_amount?: number
  insurance_approved_amount?: number
  tpa_claim_number?: string
  insurance_company_name?: string
  patient_payable: number
  amount_paid: number
  balance_due: number
  payment_status: "paid" | "partial" | "unpaid"
  payment_method: string
  gate_pass_number?: string
  gate_pass_issued_at?: string
  issued_at: string
  discharge_summary?: string
  discharge_advice?: string
  final_diagnosis?: string
  items?: InvoiceItem[]
  ledger_items?: BillingLedgerItem[]
  hospital?: {
    id: number
    name: string
    address?: string
    phone?: string
    abdm_hip_id?: string
  }
  patient?: {
    id: number
    uhid: string
    name: string
    gender?: string
    mobile?: string
    address?: string
    abha_number?: string
    abha_address?: string
  }
  admission?: {
    id: number
    ipd_number: string
    admission_date?: string
    discharge_date?: string
    ward?: {
      id: number
      name: string
    }
    bed?: {
      id: number
      bed_number: string
    }
    doctor?: {
      id: number
      name: string
    }
  }
  created_by_user?: {
    id: number
    name: string
    email?: string
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

// ─── Global Invoices Register & Audit ────────────────────────────────
export interface InvoiceFilterParams {
  search?: string
  payment_status?: "all" | "paid" | "partially_paid" | "pending"
  encounter_type?: "all" | "ipd" | "opd" | "emergency" | "lab" | "pharmacy"
  date_from?: string
  date_to?: string
  page?: number
  per_page?: number
}

export interface InvoiceSummaryKpis {
  total_invoices_count: number
  total_gross_amount: number
  total_discount_amount: number
  total_net_amount: number
  total_advance_adjusted: number
  total_insurance_approved: number
  total_amount_paid: number
  total_balance_due: number
}

export interface InvoicesResponse {
  data: Array<Invoice & {
    invoice_date?: string
    gross_amount?: number
    gate_pass_number?: string
    encounter_type?: string
    created_by_user?: { id: number; name: string }
    admission?: {
      id: number
      ipd_number: string
      ward?: { name: string }
      bed?: { bed_number: string }
      doctor?: { name: string }
    }
  }>
  summary: InvoiceSummaryKpis
  pagination: {
    current_page: number
    per_page: number
    total: number
    last_page: number
  }
}

// ─── Cashier Day-End Closing & Shift Handover ────────────────────────
export interface DayEndSummaryData {
  date: string
  hospital: {
    name: string
    code: string
    abdm_hip_id: string
    address?: string
    city?: string
    state?: string
    pincode?: string
  }
  financial_totals: {
    total_invoices: number
    gross_billed: number
    discounts_given: number
    tax_total: number
    net_billed: number
    advance_adjusted: number
    insurance_credit: number
    total_collections: number
    balance_outstanding: number
    advance_deposits_day: number
    grand_total_cash_drawer: number
    grand_total_digital: number
  }
  payment_mode_breakdown: {
    cash: number
    upi: number
    card: number
    bank_transfer: number
    insurance: number
    other: number
  }
  department_breakdown: Array<{
    encounter_type: string
    count: number
    net_amount: number
    amount_paid: number
  }>
  cashier_breakdown: Array<{
    user_id: number
    user_name: string
    invoices: number
    net_billed: number
    amount_paid: number
  }>
  recent_deposits: Array<{
    id: number
    patient_name: string
    uhid: string
    amount: number
    voucher_title: string
    charged_at: string
    collected_by: string
  }>
  generated_at: string
}

// ─── Advance Deposit Collection ──────────────────────────────────────
export interface AdvanceDepositPayload {
  patient_id: number
  amount: number
  encounter_type?: "ipd" | "emergency" | "opd"
  encounter_id?: number
  payment_method: "cash" | "upi" | "card" | "cheque" | "bank_transfer"
  transaction_reference?: string
  notes?: string
}

export interface AdvanceDepositReceiptData {
  voucher_number: string
  ledger_item_id: number
  receipt_date: string
  amount: number
  amount_in_words: string
  payment_method: string
  transaction_reference?: string
  encounter_type: string
  encounter_id?: number
  ipd_number?: string
  ward_name?: string
  bed_number?: string
  total_advance_balance: number
  notes?: string
  patient: {
    id: number
    name: string
    uhid: string
    mobile?: string
    gender?: string
    age?: string | number
    abha_number?: string
    abha_address?: string
  }
  hospital: {
    name: string
    code: string
    abdm_hip_id: string
    address?: string
    phone?: string
  }
  cashier: {
    id: number
    name: string
  }
}

// ─── Pending Inpatient Discharge Settlement Queue ────────────────────
export interface PendingDischargeItem {
  id: number
  ipd_number: string
  status: string
  admission_date: string
  days_admitted: number
  patient: {
    id: number
    name: string
    uhid: string
    mobile?: string
    gender?: string
    blood_group?: string
    abha_number?: string
    abha_address?: string
  }
  ward?: { id: number; name: string }
  bed?: { id: number; bed_number: string }
  doctor?: { id: number; name: string; specialization?: string }
  unbilled_items_count: number
  gross_amount: number
  tax_amount: number
  advance_deposit_paid: number
  estimated_due: number
  discharge_ready: boolean
}

// ─── Patient Refund / Credit Note ────────────────────────────────────
export interface RefundPayload {
  patient_id: number
  amount: number
  reason?: string
  refund_method: "cash" | "upi" | "bank_transfer"
  transaction_reference?: string
  encounter_type?: "ipd" | "opd" | "emergency"
  encounter_id?: number
}

export interface CreditNoteReceiptData {
  credit_note_number: string
  refund_date: string
  amount_refunded: number
  amount_in_words: string
  reason: string
  refund_method: string
  transaction_reference?: string
  patient: {
    name: string
    uhid: string
    mobile?: string
    abha_number?: string
    abha_address?: string
  }
  hospital: {
    name: string
    abdm_hip_id: string
  }
  authorized_by: string
}

