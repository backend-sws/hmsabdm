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

export interface LabOrderItem {
  id: number
  order_id: number
  prescription_investigation_id?: number | null
  test_template_id?: number | null
  test_name: string
  test_code?: string | null
  category?: string | null
  rate: number
  status: "pending_sample" | "sample_collected" | "in_progress" | "result_entered" | "completed" | "authorized" | "cancelled"
  technician_remarks?: string | null
  pathologist_remarks?: string | null
  test_template?: LabTestTemplate
  results?: LabTestResult[]
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
  prescription_id?: number | null
  doctor_id?: number | null
  invoice_id?: number | null
  order_number: string
  sample_accession_number?: string | null
  urgency: "Routine" | "Urgent" | "STAT"
  order_type: "OPD" | "IPD" | "Emergency" | "External"
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
