export interface LabReferenceRange {
  id: number
  parameter_id: number
  gender: "Both" | "Male" | "Female"
  age_min: number
  age_max: number
  age_unit: string
  min_val?: number | null
  max_val?: number | null
  panic_min?: number | null
  panic_max?: number | null
  normal_value?: string | null
  display_range?: string | null
  interpretation_notes?: string | null
}

export interface LabParameter {
  id: number
  test_template_id: number
  name: string
  short_code?: string | null
  unit?: string | null
  input_type: "numeric" | "calculated" | "selection" | "text" | "textarea" | "heading"
  method?: string | null
  options?: string[] | null
  is_calculated: boolean
  formula?: string | null
  range_type: string
  display_order: number
  is_mandatory: boolean
  is_active: boolean
  reference_ranges?: LabReferenceRange[]
}

export interface LabTestTemplate {
  id: number
  hospital_id?: number | null
  department_id?: number | null
  category: string
  test_code: string
  test_name: string
  description?: string | null
  interpretation?: string | null
  sample_type?: string | null
  container_color?: string | null
  method?: string | null
  tat_hours: number
  standard_price: number
  b2b_cost?: number
  reagent_cost?: number
  fulfillment_type?: "in_house" | "outsourced" | "hybrid"
  default_vendor_id?: number | null
  loinc_code?: string | null
  is_panel: boolean
  is_active: boolean
  sort_order: number
  parameters?: LabParameter[]
  department?: {
    id: number
    name: string
    code?: string
  }
  default_vendor?: LabExternalVendor
}

export interface LabTestResult {
  id: number
  order_item_id: number
  parameter_id?: number | null
  parameter_name: string
  short_code?: string | null
  unit?: string | null
  method?: string | null
  observed_value?: string | null
  numeric_value?: number | null
  flag: "normal" | "low" | "high" | "panic_low" | "panic_high" | "abnormal"
  reference_range_text?: string | null
  is_calculated: boolean
  formula_used?: string | null
  display_order: number
}

export interface LabExternalVendor {
  id: number
  hospital_id?: number | null
  vendor_code: string
  name: string
  contact_person?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  pickup_schedule?: string | null
  default_courier?: string | null
  account_number?: string | null
  is_active: boolean
  total_samples_sent?: number
  pending_results?: number
}

export interface LabOutsourceManifest {
  id: number
  hospital_id?: number | null
  vendor_id: number
  manifest_number: string
  status: "draft" | "dispatched" | "in_transit" | "delivered" | "completed"
  temperature_condition: "ambient" | "cold_chain" | "frozen" | "formalin"
  courier_name?: string | null
  courier_phone?: string | null
  courier_tracking_no?: string | null
  total_samples: number
  dispatched_at?: string | null
  dispatched_by_user_id?: number | null
  received_at_vendor_at?: string | null
  notes?: string | null
  vendor?: LabExternalVendor
  dispatched_by?: {
    id: number
    name: string
  }
  order_items?: LabOrderItem[]
  received_count?: number
}

export interface LabOrderItem {
  id: number
  order_id: number
  prescription_investigation_id?: number | null
  test_template_id?: number | null
  test_name: string
  test_code?: string | null
  category?: string | null
  rate: number
  b2b_cost?: number
  fulfillment_type?: "in_house" | "outsourced" | "hybrid"
  outsource_status?: "pending_dispatch" | "dispatched" | "in_transit" | "received" | "verified" | null
  external_vendor_id?: number | null
  outsource_manifest_id?: number | null
  external_accession_no?: string | null
  external_report_file?: string | null
  outsourced_at?: string | null
  outsource_received_at?: string | null
  status: "pending_sample" | "sample_collected" | "in_progress" | "result_entered" | "completed" | "authorized" | "cancelled"
  technician_remarks?: string | null
  pathologist_remarks?: string | null
  test_template?: LabTestTemplate
  testTemplate?: LabTestTemplate
  external_vendor?: LabExternalVendor
  manifest?: LabOutsourceManifest
  results?: LabTestResult[]
  order?: LabOrder
}

export interface LabRateListMatrixItem {
  id: number
  test_code: string
  test_name: string
  category: string
  sample_type?: string | null
  container_color?: string | null
  tat_hours: number
  standard_price: number
  b2b_cost: number
  reagent_cost: number
  fulfillment_type: "in_house" | "outsourced" | "hybrid"
  default_vendor_id?: number | null
  default_vendor_name?: string | null
  gross_profit: number
  margin_percentage: number
  is_active: boolean
}

export interface LabProfitabilityAnalytics {
  total_tests_billed: number
  total_revenue: number
  total_cost: number
  outsource_b2b_payable: number
  internal_reagent_expense: number
  net_gross_profit: number
  gross_margin_percent: number
  top_profitable_tests: Array<{
    test_code: string
    test_name: string
    category: string
    is_outsource: boolean
    count: number
    total_revenue: number
    total_cost: number
    total_profit: number
    margin_percent: number
  }>
  make_vs_buy_advisor: Array<{
    test_code: string
    test_name: string
    category: string
    count: number
    monthly_outsource_cost: number
    estimated_inhouse_cost: number
    potential_monthly_savings: number
    recommendation: string
  }>
}

export interface LabReconciliationVendorSummary {
  vendor_id: number
  vendor_code: string
  vendor_name: string
  account_number?: string | null
  phone?: string | null
  total_dispatched: number
  received_count: number
  pending_count: number
  cancelled_count: number
  total_b2b_payable: number
  patient_revenue: number
  gross_profit: number
  margin_percent: number
}

export interface LabAuditLog {
  id: number
  hospital_id: number
  order_id: number
  order_item_id?: number | null
  user_id?: number | null
  action: string
  description: string
  previous_values?: Record<string, any> | null
  new_values?: Record<string, any> | null
  ip_address?: string | null
  created_at: string
  user?: {
    id: number
    name: string
  }
  order_item?: {
    id: number
    test_name: string
  }
}

export interface LabOrder {
  id: number
  hospital_id: number
  patient_id: number
  ipd_admission_id?: number | null
  prescription_id?: number | null
  doctor_id?: number | null
  invoice_id?: number | null
  order_number: string
  sample_accession_number?: string | null
  urgency: "Routine" | "Urgent" | "STAT"
  order_type: "OPD" | "IPD" | "Emergency" | "External"
  is_bedside_collection?: boolean
  status: "pending_sample" | "sample_collected" | "sample_rejected" | "in_progress" | "result_entered" | "completed" | "partially_authorized" | "authorized" | "cancelled"
  token_number?: string | null
  token_called_at?: string | null
  booth_number?: string | null
  is_called?: boolean
  rejection_reason?: string | null
  rejection_notes?: string | null
  rejected_at?: string | null
  is_recollected?: boolean
  sample_collected_at?: string | null
  sample_collected_by_user_id?: number | null
  sample_notes?: string | null
  result_entered_at?: string | null
  result_entered_by_user_id?: number | null
  authorized_at?: string | null
  authorized_by_doctor_id?: number | null
  authorization_notes?: string | null
  clinical_notes?: string | null
  created_at: string
  updated_at: string
  patient?: {
    id: number
    uhid: string
    name: string
    age?: number | string
    dob?: string
    gender?: string
    mobile?: string
  }
  doctor?: {
    id: number
    name: string
    specialization?: string
  }
  sample_collector?: {
    id: number
    name: string
  }
  authorizing_doctor?: {
    id: number
    name: string
    qualification?: string
    registration_number?: string
  }
  items?: LabOrderItem[]
  ipd_admission?: {
    id: number
    admission_number: string
    ward?: {
      id: number
      name: string
      code?: string
    }
    bed?: {
      id: number
      bed_number: string
    }
  }
  invoice?: {
    id: number
    invoice_number: string
    gross_amount?: number
    discount_amount?: number
    discount_reason?: string | null
    net_amount?: number
    amount_paid?: number
    balance_due?: number
    total_amount?: number
    paid_amount?: number
    payment_status?: "paid" | "partial" | "pending"
    payment_method?: string
    payment_breakdown?: Array<{ method: string; amount: number; ref?: string }>
    status?: string
    created_at?: string
  }
}

export interface DiagnosticReportPayload {
  hospital: {
    name: string
    address?: string
    phone?: string
    email?: string
    logo?: string | null
  }
  order: {
    id: number
    order_number: string
    sample_accession_number?: string | null
    urgency: string
    status: string
    order_date: string
    sample_collected_at?: string | null
    result_entered_at?: string | null
    authorized_at?: string | null
    authorization_notes?: string | null
    clinical_notes?: string | null
  }
  patient: {
    id: number
    uhid: string
    name: string
    age: string
    gender: string
    mobile?: string
  }
  doctor: {
    id?: number
    name: string
    specialization?: string
  }
  authorized_by: {
    name: string
    qualification?: string
    reg_no?: string
  }
  sections: Array<{
    item_id: number
    test_name: string
    test_code?: string | null
    category?: string | null
    status?: string
    sample_type?: string | null
    container_color?: string | null
    method?: string | null
    interpretation?: string | null
    remarks?: string | null
    results: Array<{
      id: number
      name: string
      short_code?: string | null
      observed_value?: string | null
      unit?: string | null
      flag: string
      range_text?: string | null
      is_calculated: boolean
      method?: string | null
    }>
  }>
}

export interface DeltaHistoryItem {
  parameter_id: number
  short_code?: string | null
  parameter_name: string
  unit?: string | null
  value: number | string
  flag?: string
  order_number?: string
  test_date: string
}

export interface QueueDisplayResponse {
  calling: LabOrder[]
  currently_calling?: LabOrder | null
  waiting: LabOrder[]
  upcoming_waiting?: LabOrder[]
  recent_called?: LabOrder[]
  recent_collected: LabOrder[]
  total_today: number
  pending_count: number
  collected_count: number
}
