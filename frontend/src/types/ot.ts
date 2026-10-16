import type { Patient } from "./patient"
import type { Doctor } from "./doctor"
import type { Department } from "./department"

export type OtTheatreStatus = "available" | "in_use" | "cleaning" | "maintenance"

export type OtScheduleStatus =
  | "booked"
  | "pre_op_ready"
  | "in_theatre"
  | "recovery"
  | "completed"
  | "postponed"
  | "cancelled"

export type OtPriority = "elective" | "urgent" | "emergency"

export interface OperationTheatre {
  id: number
  hospital_id?: number
  name: string
  code?: string
  floor?: string
  status: OtTheatreStatus
  equipment_notes?: string
  is_active: boolean
  today_surgeries_count?: number
  active_surgeries_count?: number
  created_at?: string
  updated_at?: string
}

export interface WhoSignInChecks {
  patient_identity_confirmed: boolean
  site_marked: boolean
  anesthesia_safety_check: boolean
  pulse_oximeter_functioning: boolean
  known_allergy: boolean
  allergy_details?: string
  difficult_airway_risk: boolean
  blood_loss_risk_over_500ml: boolean
  [key: string]: any
}

export interface WhoTimeOutChecks {
  team_members_introduced: boolean
  surgeon_anesthetist_nurse_confirm_patient_site: boolean
  antibiotic_prophylaxis_given_60min: boolean
  antibiotic_name?: string
  anticipated_critical_events_reviewed: boolean
  sterility_indicators_confirmed: boolean
  essential_imaging_displayed: boolean
  [key: string]: any
}

export interface WhoSignOutChecks {
  procedure_name_recorded: boolean
  instrument_swab_needle_count_correct: boolean
  specimen_labelled_correctly: boolean
  equipment_problems_addressed: boolean
  recovery_concerns_reviewed: boolean
  [key: string]: any
}

export interface OtChecklistRecord {
  id: number
  hospital_id?: number
  ot_schedule_id: number
  sign_in_completed: boolean
  sign_in_completed_at?: string | null
  sign_in_nurse_name?: string | null
  sign_in_anesthetist_name?: string | null
  sign_in_checks?: WhoSignInChecks | null
  time_out_completed: boolean
  time_out_completed_at?: string | null
  time_out_checks?: WhoTimeOutChecks | null
  sign_out_completed: boolean
  sign_out_completed_at?: string | null
  sign_out_nurse_name?: string | null
  sign_out_checks?: WhoSignOutChecks | null
  created_at?: string
  updated_at?: string
}

export interface OtSchedule {
  id: number
  hospital_id?: number
  booking_number: string
  operation_theatre_id?: number | null
  ipd_admission_id?: number | null
  patient_id: number
  primary_surgeon_id: number
  assistant_surgeon_id?: number | null
  anesthetist_id?: number | null
  surgical_department_id?: number | null
  procedure_name: string
  procedure_code?: string | null
  surgery_date: string
  scheduled_start_time?: string | null
  scheduled_end_time?: string | null
  actual_start_time?: string | null
  actual_end_time?: string | null
  anesthesia_type: string
  priority: OtPriority
  status: OtScheduleStatus
  pre_op_diagnosis?: string | null
  post_op_diagnosis?: string | null
  scrub_nurse_name?: string | null
  circulating_nurse_name?: string | null
  blood_required_units?: number
  special_instruments?: string | null
  surgeon_notes?: string | null
  recovery_notes?: string | null
  pacu_discharge_time?: string | null
  created_by_user_id?: number | null
  operation_theatre?: OperationTheatre | null
  patient?: Patient | null
  primary_surgeon?: Doctor | null
  assistant_surgeon?: Doctor | null
  anesthetist?: Doctor | null
  department?: Department | null
  ipd_admission?: {
    id: number
    ipd_number: string
    ward?: { id: number; name: string }
    bed?: { id: number; bed_number: string }
  } | null
  checklist_record?: OtChecklistRecord | null
  created_at?: string
  updated_at?: string
}

export interface CreateOtSchedulePayload {
  patient_id: number
  primary_surgeon_id: number
  procedure_name: string
  procedure_code?: string
  operation_theatre_id?: number | null
  ipd_admission_id?: number | null
  assistant_surgeon_id?: number | null
  anesthetist_id?: number | null
  surgical_department_id?: number | null
  surgery_date: string
  scheduled_start_time?: string
  scheduled_end_time?: string
  anesthesia_type?: string
  priority?: OtPriority
  status?: OtScheduleStatus
  pre_op_diagnosis?: string
  post_op_diagnosis?: string
  scrub_nurse_name?: string
  circulating_nurse_name?: string
  blood_required_units?: number
  special_instruments?: string
}

export interface UpdateOtSchedulePayload {
  operation_theatre_id?: number | null
  assistant_surgeon_id?: number | null
  anesthetist_id?: number | null
  procedure_name?: string
  procedure_code?: string
  surgery_date?: string
  scheduled_start_time?: string
  scheduled_end_time?: string
  actual_start_time?: string
  actual_end_time?: string
  anesthesia_type?: string
  priority?: OtPriority
  status?: OtScheduleStatus
  pre_op_diagnosis?: string
  post_op_diagnosis?: string
  scrub_nurse_name?: string
  circulating_nurse_name?: string
  blood_required_units?: number
  special_instruments?: string
  surgeon_notes?: string
  recovery_notes?: string
  pacu_discharge_time?: string
}

export interface SaveOtChecklistPayload {
  sign_in_completed?: boolean
  sign_in_nurse_name?: string
  sign_in_anesthetist_name?: string
  sign_in_checks?: Partial<WhoSignInChecks>
  time_out_completed?: boolean
  time_out_checks?: Partial<WhoTimeOutChecks>
  sign_out_completed?: boolean
  sign_out_nurse_name?: string
  sign_out_checks?: Partial<WhoSignOutChecks>
}

export interface OtPrintData {
  hospital: {
    name: string
    address?: string
    city?: string
    phone?: string
    email?: string
    abdm_hip_id?: string
    nabh_accredited?: boolean
  }
  schedule: OtSchedule
}
