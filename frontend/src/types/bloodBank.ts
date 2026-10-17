export type BloodGroup = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-"

export type BloodComponentType =
  | "whole_blood"
  | "prbc"
  | "ffp"
  | "platelets"
  | "cryo"
  | "sdp"

export type BloodUnitStatus =
  | "quarantine"
  | "available"
  | "reserved"
  | "issued"
  | "discarded"
  | "expired"

export type TtiStatus = "quarantine" | "tested_safe" | "reactive_discarded"

export type RequisitionUrgency =
  | "routine"
  | "urgent"
  | "emergency_un_crossmatched"
  | "mtp"

export type ReactionType =
  | "acute_hemolytic"
  | "febrile_non_hemolytic"
  | "allergic"
  | "anaphylactic"
  | "trali"
  | "taco"
  | "sepsis"
  | "other"

export interface BloodGroupMatrixItem {
  blood_group: BloodGroup
  total_available: number
  prbc_units: number
  ffp_units: number
  platelet_units: number
  whole_blood: number
  cryo_units: number
  quarantine_units: number
  reserved_units: number
  is_critical_low: boolean
}

export interface BloodBankDashboardData {
  matrix: BloodGroupMatrixItem[]
  summary: {
    total_available: number
    total_quarantine: number
    total_reserved: number
    expiring_soon_48h: number
    collections_today: number
    issues_today: number
    pending_requisitions: number
    active_reactions: number
    generated_at: string
  }
}

export interface BloodDonor {
  id: number
  hospital_id?: number
  donor_number: string
  name: string
  mobile: string
  email?: string | null
  gender: "M" | "F" | "O"
  dob?: string | null
  age: number
  blood_group: BloodGroup
  donor_type: "voluntary" | "replacement"
  patient_id?: number | null
  patient_uhid?: string | null
  patient?: {
    id: number
    name: string
    uhid: string
  }
  abha_number?: string | null
  abha_address?: string | null
  id_proof_type?: string | null
  id_proof_number?: string | null
  occupation?: string | null
  address?: string | null
  city?: string | null
  total_donations: number
  last_donated_at?: string | null
  deferral_status: "eligible" | "temporary_deferred" | "permanent_deferred"
  deferral_reason?: string | null
  deferred_until?: string | null
  created_at?: string
  updated_at?: string
}

export interface DonorScreening {
  id: number
  donor_id: number
  weight_kg: number
  hemoglobin_g_dl: number
  bp_systolic: number
  bp_diastolic: number
  pulse: number
  temperature: number
  medical_history_answers?: Record<string, boolean | string>
  is_eligible: boolean
  rejection_reason?: string | null
  donor_signature_data?: string | null
  examined_by_user_id?: number | null
  created_at?: string
}

export interface BloodUnit {
  id: number
  hospital_id?: number
  donor_id?: number | null
  donor?: BloodDonor | null
  screening_id?: number | null
  camp_id?: number | null
  parent_unit_id?: number | null
  unit_barcode: string
  blood_group: BloodGroup
  component_type: BloodComponentType
  volume_ml: number
  bag_type: string
  collection_date: string
  expiry_date: string
  storage_equipment: "refrigerator" | "deep_freezer" | "platelet_agitator"
  storage_location?: string | null
  tti_status: TtiStatus
  is_leukodepleted: boolean
  is_irradiated: boolean
  status: BloodUnitStatus
  discard_reason?: string | null
  discard_date?: string | null
  tti_test?: BloodTtiTest | null
  created_at?: string
}

export interface BloodTtiTest {
  id: number
  blood_unit_id: number
  hiv_result: "non_reactive" | "reactive"
  hbv_result: "non_reactive" | "reactive"
  hcv_result: "non_reactive" | "reactive"
  syphilis_result: "non_reactive" | "reactive"
  malaria_result: "non_reactive" | "reactive"
  blood_group_confirmed: BloodGroup
  overall_status: "passed" | "failed"
  remarks?: string | null
  tested_by_user_id?: number | null
  authorized_by_pathologist_id?: number | null
  tested_at?: string | null
}

export interface BloodRequisition {
  id: number
  hospital_id?: number
  requisition_number: string
  patient_id: number
  patient?: {
    id: number
    name: string
    uhid: string
    gender?: string
    age?: number
  }
  admission_id?: number | null
  admission?: {
    id: number
    ipd_number: string
    ward?: {
      id: number
      name: string
    }
  }
  doctor_id: number
  doctor?: {
    id: number
    name: string
  }
  department_id?: number | null
  blood_group_needed: BloodGroup
  component_needed: BloodComponentType
  units_requested: number
  units_crossmatched: number
  units_issued: number
  urgency: RequisitionUrgency
  clinical_indication?: string | null
  hb_level?: number | null
  date_needed?: string | null
  emergency_consultant_waiver_signed: boolean
  status: "pending" | "sample_received" | "crossmatched" | "partially_issued" | "issued" | "cancelled"
  crossmatches?: BloodCrossmatch[]
  created_at?: string
}

export interface BloodCrossmatch {
  id: number
  requisition_id: number
  requisition?: BloodRequisition
  blood_unit_id: number
  blood_unit?: BloodUnit
  patient_id: number
  patient?: {
    id: number
    name: string
    uhid: string
  }
  method: "gel_card" | "tube_ahg" | "emergency_uncrossmatched"
  compatibility: "compatible" | "incompatible" | "pending"
  crossmatched_by_user_id?: number | null
  crossmatched_at?: string | null
  reservation_valid_until?: string | null
  is_issued: boolean
  issued_at?: string | null
  issued_to_staff_name?: string | null
  cold_box_temperature?: number | null
  service_charge: number
  invoice_id?: number | null
}

export interface BloodTransfusionReaction {
  id: number
  blood_unit_id: number
  blood_unit?: BloodUnit
  patient_id: number
  patient?: {
    id: number
    name: string
    uhid: string
  }
  admission_id?: number | null
  requisition_id?: number | null
  transfusion_started_at?: string | null
  reaction_occurred_at?: string | null
  volume_transfused_ml?: number | null
  reaction_type: ReactionType
  severity: "mild" | "moderate" | "severe" | "life_threatening" | "fatal"
  clinical_symptoms: string
  action_taken: string
  remnant_bag_returned: boolean
  investigation_findings?: string | null
  investigation_status: "reported" | "under_investigation" | "resolved"
  reported_by_user_id?: number | null
  created_at?: string
}

export interface BloodCamp {
  id: number
  camp_name: string
  organizer_name: string
  location: string
  camp_date: string
  target_units: number
  units_collected: number
  coordinator_contact?: string | null
  status: "scheduled" | "in_progress" | "completed" | "cancelled"
}

export interface IssueBloodResponse {
  crossmatch_id: number
  unit_barcode: string
  blood_group: BloodGroup
  component_type: string
  volume_ml: number
  patient_name: string
  uhid: string
  requisition_number: string
  compatibility: string
  method: string
  issued_at: string
  issued_to_staff: string
  cold_box_temperature: number
  service_charge: number
}

export interface ScreeningVitalRules {
  min_weight_kg: number
  min_hemoglobin_g_dl: number
  min_bp_systolic: number
  max_bp_systolic: number
  min_bp_diastolic: number
  max_bp_diastolic: number
  min_pulse: number
  max_pulse: number
  max_temperature: number
}

export interface ScreeningQuestionItem {
  id: string
  label: string
  category: string
  deferral_type: "temporary" | "permanent"
  deferral_days?: number | null
  is_active: boolean
  is_custom: boolean
  display_order?: number
}

export interface ScreeningConfigData {
  vital_rules: ScreeningVitalRules
  questions: ScreeningQuestionItem[]
}
