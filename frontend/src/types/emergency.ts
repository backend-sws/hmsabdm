export type PriorityLevel = "red" | "yellow" | "green"

export type ConsciousnessLevel = "alert" | "voice" | "pain" | "unresponsive"

export type EmergencyStatus =
  | "under_treatment"
  | "stabilized"
  | "admitted_to_ipd"
  | "transferred_external"
  | "discharged"
  | "brought_dead"
  | "expired"

export interface InitialVitals {
  bp_systolic?: number
  bp_diastolic?: number
  pulse?: number
  spo2?: number
  temperature?: number
  respiratory_rate?: number
}

export interface EmergencyTriage {
  id: number
  hospital_id: number
  triage_number: string
  mlc_number?: string | null
  patient_id?: number | null
  uhid?: string | null
  patient_name: string
  is_unknown_patient: boolean
  gender?: "M" | "F" | "O"
  approximate_age?: number | null
  brought_by?: string
  brought_by_contact?: string
  priority_level: PriorityLevel
  triage_category?: string
  chief_complaint?: string
  consciousness_level?: ConsciousnessLevel
  gcs_score?: number
  initial_vitals?: InitialVitals
  is_mlc: boolean
  police_station?: string | null
  police_officer_name?: string | null
  police_buckle_number?: string | null
  incident_place?: string | null
  mlc_injuries_details?: string | null
  doctor_id?: number | null
  ward_id?: number | null
  bed_id?: number | null
  ipd_admission_id?: number | null
  advance_deposit?: number
  status: EmergencyStatus
  clinical_notes?: string | null
  arrival_time: string
  stabilized_at?: string | null
  discharged_at?: string | null
  created_at?: string
  updated_at?: string
  patient?: {
    id: number
    uhid: string
    name: string
    gender?: string
    dob?: string
    mobile?: string
    address?: string
    abha_number?: string
    abha_address?: string
  }
  doctor?: {
    id: number
    name: string
    hpr_id?: string
    specialization?: string
  }
  ward?: {
    id: number
    name: string
    code: string
  }
  bed?: {
    id: number
    bed_number: string
  }
  ipd_admission?: {
    id: number
    admission_number?: string
    status: string
  }
}

export interface EmergencyCounters {
  total_today: number
  red_priority: number
  yellow_priority: number
  green_priority: number
  active_in_er: number
  mlc_cases: number
}

export interface TriageAdmissionPayload {
  patient_id?: number | null
  uhid?: string
  patient_name?: string
  is_unknown_patient?: boolean
  gender?: "M" | "F" | "O"
  approximate_age?: number
  brought_by?: string
  brought_by_contact?: string
  priority_level: PriorityLevel
  triage_category?: string
  chief_complaint?: string
  consciousness_level?: ConsciousnessLevel
  gcs_score?: number
  initial_vitals?: InitialVitals
  is_mlc?: boolean
  police_station?: string
  police_officer_name?: string
  police_buckle_number?: string
  incident_place?: string
  mlc_injuries_details?: string
  doctor_id?: number
  ward_id?: number
  bed_id?: number
  advance_deposit?: number
  clinical_notes?: string
}

export interface LinkPatientPayload {
  target_patient_id?: number
  uhid?: string
  name?: string
  mobile?: string
  dob?: string
  gender?: "M" | "F" | "O"
  blood_group?: string
  abha_number?: string
  abha_address?: string
  address?: string
  id_proof_type?: string
  id_proof_number?: string
}

export interface MlcSlipData {
  hospital: {
    name: string
    code?: string
    abdm_hip_id?: string
  }
  mlc_details: {
    mlc_number: string
    triage_number: string
    arrival_time: string
    police_station: string
    police_officer_name?: string
    police_buckle_number?: string
    incident_place?: string
    injuries_description?: string
  }
  patient: {
    uhid?: string
    name: string
    gender?: string
    approximate_age?: number
    address?: string
    brought_by?: string
    brought_by_phone?: string
  }
  clinical_assessment: {
    consciousness_level?: string
    gcs_score?: number
    initial_vitals?: InitialVitals
    priority_level: PriorityLevel
    examining_doctor: string
    doctor_reg_no?: string
  }
  declaration: string
  generated_at: string
}

export interface TriageStatusUpdatePayload {
  status: EmergencyStatus
  notes?: string
}

export interface EmergencyQueryParams {
  priority_level?: PriorityLevel
  status?: string
  is_mlc?: boolean
  search?: string
  page?: number
  per_page?: number
}
