import type { Patient } from "./patient"
import type { Doctor } from "./doctor"
import type { Department } from "./department"

export type BedStatus = "available" | "occupied" | "cleaning" | "maintenance"
export type AdmissionStatus = "admitted" | "discharged" | "transferred" | "cancelled"
export type AdmissionType = "planned" | "emergency" | "day_care" | "maternity" | "transfer"

export interface IpdWard {
  id: number
  hospital_id?: number
  name: string
  code: string
  floor?: string
  daily_charge: number
  gender_type?: "all" | "male" | "female"
  description?: string
  is_active: boolean
  total_beds?: number
  available_beds?: number
  occupied_beds?: number
  maintenance_beds?: number
  beds?: IpdBed[]
  created_at?: string
  updated_at?: string
}

export interface IpdBed {
  id: number
  hospital_id?: number
  ward_id: number
  bed_number: string
  status: BedStatus
  daily_charge?: number
  current_admission_id?: number | null
  currentAdmission?: any | null
  ward?: IpdWard | null
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface CreateWardPayload {
  name: string
  code?: string
  floor?: string
  gender_type?: "all" | "male" | "female"
  daily_charge: number
  is_active?: boolean
  initial_beds_count?: number
  bed_prefix?: string
}

export interface UpdateWardPayload {
  name?: string
  code?: string
  floor?: string
  gender_type?: "all" | "male" | "female"
  daily_charge?: number
  is_active?: boolean
  sync_bed_charges?: boolean
}

export interface CreateBedPayload {
  ward_id: number
  bed_number: string
  daily_charge?: number
  status?: BedStatus
  is_active?: boolean
}

export interface BatchCreateBedsPayload {
  ward_id: number
  prefix?: string
  start_number: number
  end_number: number
  daily_charge?: number
}

export interface UpdateBedPayload {
  bed_number?: string
  daily_charge?: number
  status?: BedStatus
  is_active?: boolean
}

export interface BedMatrixAdmission {
  id: number
  ipd_number: string
  admission_type: AdmissionType
  admission_date?: string
  elapsed_days: number
  elapsed_hours: number
  is_mlc: boolean
  patient?: {
    id: number
    name: string
    uhid: string
    gender?: string
    age?: number | null
    mobile?: string
  } | null
  doctor?: {
    id: number
    name: string
    specialization?: string
  } | null
  latest_vital?: any
  running_bill: number
}

export interface BedMatrixBed {
  id: number
  bed_number: string
  status: BedStatus
  daily_charge: number
  admission?: BedMatrixAdmission | null
}

export interface BedMatrixWard {
  id: number
  name: string
  code: string
  floor?: string
  daily_charge: number
  total_beds: number
  available_beds: number
  occupied_beds: number
  beds: BedMatrixBed[]
}

export interface BedMatrixSummary {
  total_beds: number
  available_beds: number
  occupied_beds: number
  cleaning_beds?: number
  maintenance_beds: number
  occupancy_rate: number
}

export interface BedMatrixResponse {
  summary: BedMatrixSummary
  wards: BedMatrixWard[]
}

export interface IpdAdmission {
  id: number
  ipd_number: string
  admission_type: AdmissionType
  admission_reason?: string
  is_mlc: boolean
  mlc_details?: string
  status: AdmissionStatus
  admission_date?: string
  discharge_date?: string
  patient?: Patient | null
  doctor?: Doctor | null
  department?: Department | null
  ward?: IpdWard | null
  bed?: IpdBed | null
  bed_id?: number
  attendant_name?: string
  attendant?: {
    name?: string
    relation?: string
    phone?: string
    address?: string
  }
  financials?: {
    advance_deposit: number
    payment_status?: string
    payment_method?: string
    payment_ref?: string
    payment_breakdown?: Array<{ method: string; amount: number; ref?: string }>
  }
  latest_vital?: any
  elapsed_days?: number
  elapsed_hours?: number
  created_at?: string
}

// Request Payloads
export interface AdmitPatientPayload {
  patient_id?: number
  token?: string
  name?: string
  mobile?: string
  gender?: "M" | "F" | "O"
  dob?: string
  id_proof_type?: string
  id_proof_number?: string
  address?: string
  city?: string
  district?: string
  state?: string
  pincode?: string
  abha_number?: string
  abha_address?: string
  doctor_id: number
  department_id?: number
  ward_id?: number
  bed_id: number
  admission_type?: AdmissionType
  admission_reason?: string
  is_mlc?: boolean
  mlc_details?: string
  admission_date?: string
  advance_deposit?: number
  payment_method?: string
  payment_ref?: string
  attendant_name?: string
  attendant_relation?: string
  attendant_phone?: string
  attendant_address?: string
}

export interface TransferBedPayload {
  new_bed_id: number
}

export interface DischargePayload {
  discharge_date?: string
  mark_bed_cleaning?: boolean
  bed_status_after_discharge?: "cleaning" | "available"
}

// Doctor SOAP Rounds
export type RoundType = "routine" | "specialist_call" | "emergency" | "night_round"
export type ClinicalCondition = "improving" | "stable" | "deteriorating" | "critical"

export interface DoctorRoundPayload {
  doctor_id?: number
  round_date?: string
  round_time?: string
  round_type?: RoundType
  subjective?: string
  objective?: string
  assessment?: string
  plan?: string
  diet_advice?: string
  clinical_condition?: ClinicalCondition
  is_discharge_planned?: boolean
  planned_discharge_date?: string
  fee_charged?: number
}

export interface DoctorRoundItem {
  id: number
  doctor_id?: number
  round_date: string
  round_time?: string
  round_type: RoundType
  subjective?: string
  objective?: string
  assessment?: string
  plan?: string
  diet_advice?: string
  clinical_condition?: ClinicalCondition
  is_discharge_planned?: boolean
  planned_discharge_date?: string
  fee_charged: number
  doctor?: {
    id: number
    name: string
    specialization?: string
  } | null
  created_at?: string
}

// Nursing Procedures
export interface NursingProcedurePayload {
  procedure_name: string
  procedure_code?: string
  performed_at?: string
  performed_by_name?: string
  notes?: string
  charge_amount?: number
}

export interface NursingProcedureItem {
  id: number
  procedure_name: string
  procedure_code?: string
  performed_at: string
  performed_by_name?: string
  notes?: string
  charge_amount: number
  created_at?: string
}

// Intake / Output (Fluid Balance)
export interface IntakeOutputPayload {
  entry_type: "intake" | "output"
  category: string
  item_name: string
  quantity_ml: number
  route?: string
  recorded_at?: string
  recorded_by_name?: string
  remarks?: string
}

export interface IntakeOutputItem {
  id: number
  entry_type: "intake" | "output"
  category: string
  item_name: string
  quantity_ml: number
  route?: string
  recorded_at: string
  recorded_by_name?: string
  remarks?: string
}

export interface FluidBalanceSummary {
  total_intake_ml: number
  total_output_ml: number
  net_balance_ml: number
  balance_status: "positive" | "negative" | "neutral"
}

// MAR (Medication Administration Record)
export type MarStatus = "given" | "omitted" | "refused" | "held" | "vomited"

export interface MarRecordPayload {
  medicine_name: string
  dosage: string
  route?: string
  scheduled_at?: string
  administered_at?: string
  administered_by_name?: string
  status?: MarStatus
  omission_reason?: string
  batch_number?: string
  notes?: string
  charge_amount?: number
}

export interface MarRecordItem {
  id: number
  medicine_name: string
  dosage: string
  route?: string
  scheduled_at?: string
  administered_at?: string
  administered_by_name?: string
  status: MarStatus
  omission_reason?: string
  batch_number?: string
  notes?: string
  charge_amount: number
}

// Shift Handover
export interface ShiftHandoverPayload {
  shift_name: "morning" | "evening" | "night"
  shift_date?: string
  outgoing_nurse_name: string
  incoming_nurse_name?: string
  patient_condition?: "stable" | "critical" | "deteriorating" | "post_op" | "ventilated"
  handover_notes: string
  critical_alerts?: string
  pending_tasks?: string
}

export interface ShiftHandoverItem {
  id: number
  shift_name: "morning" | "evening" | "night"
  shift_date: string
  outgoing_nurse_name: string
  incoming_nurse_name?: string
  patient_condition?: string
  handover_notes: string
  critical_alerts?: string
  pending_tasks?: string
  acknowledged_at?: string
  created_at?: string
}

// Discharge Billing & Gate Pass
export interface DischargeEstimate {
  admission_id?: number
  ipd_number?: string
  status?: string
  patient?: {
    id: number
    name: string
    uhid: string
    gender?: string
    mobile?: string
    blood_group?: string
  }
  doctor?: { id: number; name: string }
  ward?: { id: number; name: string }
  bed?: { id: number; bed_number: string }
  financials?: {
    gross_amount: number
    tax_amount: number
    advance_deposit_paid: number
    estimated_balance_due: number
  }
  category_breakdown?: Array<{
    category: string
    count: number
    total_amount: number
  }>
  total_charges?: number
  advance_deposit_paid?: number
  net_balance_due?: number
  unbilled_items_count?: number
  unbilled_charges?: Array<{
    id: number
    category: string
    item_name: string
    quantity: number
    unit_price: number
    total_amount: number
    charged_at: string
  }>
}

export interface SettleDischargePayload {
  discharge_type?: "normal" | "lama" | "transfer" | "referred" | "absconded" | "death"
  discharge_summary?: string
  discharge_advice?: string
  final_diagnosis?: string
  discount_amount?: number
  discount_reason?: string
  insurance_approved_amount?: number
  tpa_claim_number?: string
  insurance_company_name?: string
  amount_paid?: number
  payment_method?: string
  discharge_date?: string
  mark_bed_cleaning?: boolean
  bed_status_after_discharge?: "cleaning" | "available"
  notes?: string
}

export interface GatePass {
  gate_pass_number: string
  issued_at: string
  patient_name?: string
  uhid?: string
  ipd_number?: string
  ward_name?: string
  bed_number?: string
  doctor_name?: string
  admission_date?: string
  discharge_date?: string
  total_bill_amount?: number
  advance_deposit?: number
  discount_amount?: number
  net_paid?: number
  balance_due?: number
  clearance_status?: string
  issued_by?: string
  patient?: {
    name: string
    uhid: string
    mobile?: string
    gender?: string
    blood_group?: string
  }
  admission?: {
    ipd_number: string
    admission_date?: string
    discharge_date?: string
    discharge_type?: string
    doctor_name?: string
    ward_name?: string
    bed_number?: string
  }
  financial_summary?: {
    invoice_number: string
    gross_amount?: number
    discount?: number
    advance?: number
    insurance?: number
    net_amount?: number
    amount_paid: number
    advance_adjusted?: number
    balance_due?: number
    payment_status?: string
    payment_method?: string
  }
  security_clearance?: {
    status: string
    verified_by: string
    gate_pass_status: string
  }
}


export interface InpatientChart {
  admission: {
    id: number
    ipd_number: string
    status: AdmissionStatus
    admission_type: AdmissionType
    admission_reason?: string
    admission_date?: string
    discharge_date?: string
    elapsed_days: number
    elapsed_hours?: number
    is_mlc: boolean
    ward?: IpdWard | null
    bed?: IpdBed | null
    doctor?: Doctor | null
    department?: Department | null
    attendant?: {
      name?: string
      relation?: string
      phone?: string
      address?: string
    }
  }
  patient: Patient
  doctor_rounds: DoctorRoundItem[]
  nursing_procedures: NursingProcedureItem[]
  vitals_history: any[]
  fluid_balance_summary: FluidBalanceSummary
  intake_outputs: IntakeOutputItem[]
  mar_administrations: MarRecordItem[]
  shift_handovers: ShiftHandoverItem[]
  prescriptions: any[]
  financial_summary: {
    total_charged: number
    advance_deposit: number
    net_balance_due: number
    category_breakdown: Array<{ category: string; count: number; total_amount: number }>
    ledger_items: Array<any>
  }
}

export interface DischargeMedicationItem {
  medicine_name: string
  dosage_form?: string
  dose?: string
  route?: string
  frequency?: string
  duration?: string
  instructions?: string
}

export interface DischargeVitals {
  temperature?: string | number
  systolic_bp?: string | number
  diastolic_bp?: string | number
  pulse_rate?: string | number
  respiratory_rate?: string | number
  spo2?: string | number
  [key: string]: any
}

export interface DischargeSummary {
  id: number | null
  hospital_id?: number
  ipd_admission_id: number
  patient_id: number
  doctor_id?: number | null
  prepared_by_user_id?: number | null
  finalized_by_user_id?: number | null
  summary_number?: string | null
  status: 'draft' | 'finalized'
  discharge_type: 'normal' | 'dama' | 'lama' | 'absconded' | 'referred' | 'expired'
  admission_date?: string
  discharge_date?: string
  admission_diagnosis?: string
  final_diagnosis?: string
  icd10_code?: string
  chief_complaints?: string
  history_of_present_illness?: string
  past_history_and_allergies?: string
  condition_at_discharge?: string
  discharge_vitals?: DischargeVitals
  hospital_course?: string
  procedures_surgeries?: string
  investigations_summary?: string
  treatment_given?: string
  discharge_medications: DischargeMedicationItem[]
  dietary_advice?: string
  physical_activity_advice?: string
  wound_care_instructions?: string
  emergency_red_flags?: string
  follow_up_date?: string
  follow_up_doctor_id?: number | null
  follow_up_instructions?: string
  finalized_at?: string | null
  patient?: Patient
  doctor?: Doctor
  follow_up_doctor?: Doctor
  prepared_by_user?: { id: number; name: string }
  finalized_by_user?: { id: number; name: string }
  ipd_admission?: {
    id: number
    ipd_number: string
    admission_date?: string
    ward?: string
    bed?: string
    status?: string
  }
}

export interface DischargePrintData {
  hospital: {
    name: string
    code?: string
    address?: string
    city?: string
    state?: string
    pincode?: string
    phone?: string
    email?: string
    logo_url?: string
    tagline?: string
    nabh_accredited?: boolean
    abdm_hip_id?: string
  }
  admission: {
    id: number
    ipd_number: string
    admission_date: string
    discharge_date: string
    length_of_stay: string
    ward: string
    bed: string
    status: string
  }
  patient: {
    id?: number
    name: string
    uhid: string
    age: string | number
    gender: string
    phone?: string
    blood_group?: string
    address?: string
  }
  doctor: {
    name: string
    qualification?: string
    department?: string
    reg_no?: string
  }
  follow_up_doctor: {
    name: string
    qualification?: string
  }
  summary: DischargeSummary | null
}

