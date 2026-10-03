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
