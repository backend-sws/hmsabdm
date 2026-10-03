import type { Patient } from "./patient"

// ─── Scan & Share Queue ───────────────────────────────────────────────
export interface ScanShareQueueItem {
  id: number
  token_no: string
  patient_name: string
  gender: string
  age: number | null
  abha_address: string
  abha_number?: string
  preferred_department?: string
  department_name?: string
  status: "WAITING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "EXPIRED"
  created_at: string
  expires_at?: string
}

export interface ScanShareQueueResponse {
  data: ScanShareQueueItem[]
  total: number
}

export interface TokenLookupResponse {
  id: number
  token_no: string
  patient_name: string
  abha_address: string
  abha_number?: string
  gender: string
  age: number | null
  status: string
  preferred_department?: string
  expires_at?: string
}

export interface ConfirmQueuePayload {
  queue_id: number
  department_id: number
  doctor_id?: number
  slot_time?: string
  visit_reason?: string
  fee_charged?: number
  amount_paid?: number
  payment_method?: string
  payment_status?: string
}

export interface ConfirmQueueResponse {
  queue_id: number
  visit_id: number
  patient_id: number
  uhid: string
  opd_number: string
  token_no: string
  queue_token?: number | string
  patient_name: string
  department_name: string
  doctor_name?: string
  slot_time?: string
  visit_time: string
  fee_charged?: number
  amount_paid?: number
  payment_method?: string
  payment_status?: string
}

// ─── Walk-in Registration ─────────────────────────────────────────────
export interface WalkInRegisterPayload {
  name: string
  mobile?: string
  gender?: "M" | "F" | "O"
  dob?: string
  age?: number
  guardian_name?: string
  guardian_relation?: string
  guardian_phone?: string
  address?: string
  city?: string
  district?: string
  state?: string
  pincode?: string
  blood_group?: string
  photo?: string
  kyc_verified?: boolean
}

export interface WalkInRegisterResponse {
  patient: Patient
  uhid: string
}

// ─── Create OPD Visit ─────────────────────────────────────────────────
export interface CreateVisitPayload {
  patient_id: number | string
  department_id: number
  doctor_id?: number
  slot_time?: string
  visit_reason?: string
  visit_type?: "OPD" | "EMERGENCY"
  referred_by?: string
  fee_charged?: number
  amount_paid?: number
  payment_method?: string
  payment_status?: string
}

export interface CreateVisitResponse {
  id?: number
  visit_id: number
  opd_number: string
  queue_token?: number | string
  patient_id: number
  patient_name: string
  uhid: string
  department_name: string
  doctor_name?: string
  slot_time?: string
  visit_time?: string
  fee_charged?: number
  amount_paid?: number
  payment_method?: string
  payment_status?: string
}

// ─── Quick Visit (Register + Visit in one step) ───────────────────────
export interface QuickVisitPayload extends WalkInRegisterPayload {
  department_id: number
  doctor_id?: number
  slot_time?: string
  visit_reason?: string
  chief_complaint?: string
  abha_number?: string | null
  abha_address?: string | null
  fee_charged?: number
  amount_paid?: number
  payment_method?: string
  payment_status?: string
}

// ─── Reception Department dropdown ───────────────────────────────────
export interface ReceptionDoctorSchedule {
  id?: number
  day_of_week?: string | number
  start_time?: string
  end_time?: string
  max_patients?: number
  opd_fee?: number
}

export interface ReceptionDoctor {
  id: number
  name: string
  specialization?: string
  qualification?: string
  consultation_time?: string
  schedules?: ReceptionDoctorSchedule[]
}

export interface ReceptionDepartment {
  id: number
  name: string
  code?: string
  doctors?: ReceptionDoctor[]
  available_doctors?: ReceptionDoctor[]
}

// ─── OPD Visit / Issued Token History ────────────────────────────────
export interface OpdVisitPatient {
  id: number
  uhid: string
  name: string
  gender?: string
  dob?: string
  age?: number | string
  mobile?: string
  city?: string
  address?: string
  district?: string
  state?: string
  pincode?: string
  photo?: string | null
  kyc_verified?: boolean
  abha_number?: string | null
  abha_address?: string | null
}

export interface OpdVisitDoctor {
  id: number
  name: string
  specialization?: string
  qualification?: string
}

export interface OpdVisitDepartment {
  id: number
  name: string
  code?: string
}

export interface OpdVisitItem {
  id: number
  opd_number: string
  queue_token: number
  visit_date: string
  status: "waiting" | "called" | "in_consultation" | "done" | "cancelled"
  chief_complaint?: string | null
  diagnosis?: string | null
  notes?: string | null
  fee_charged: number
  discount: number
  amount_paid: number
  payment_status?: string | null
  payment_method?: string | null
  payment_ref?: string | null
  called_at?: string | null
  completed_at?: string | null
  created_at: string
  patient: OpdVisitPatient
  doctor?: OpdVisitDoctor | null
  department?: OpdVisitDepartment | null
}

export interface VisitStats {
  total_issued: number
  waiting: number
  in_consultation: number
  completed: number
  cancelled: number
  total_fees: number
  date: string
}

export interface VisitQueryParams {
  date?: string
  doctor_id?: number | string
  department_id?: number | string
  status?: string
  search?: string
  all?: boolean
  page?: number
  per_page?: number
}
