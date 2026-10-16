// ─── OPD Visit (Queue Item) ───────────────────────────────────────────
export interface OpdVisit {
  id: number
  visit_id?: number
  opd_number: string
  queue_token?: number | string
  token_no?: string
  patient_id: number
  patient_name?: string
  patient_mobile?: string
  uhid?: string
  dob?: string
  age?: number | null
  gender?: string
  blood_group?: string
  abha_address?: string
  abha_number?: string
  department_id?: number
  department_name?: string
  doctor_id?: number
  doctor_name?: string
  chief_complaint?: string | string[]
  visit_reason?: string
  visit_date?: string
  notes?: string
  diagnosis?: string
  status: "WAITING" | "IN_CONSULTATION" | "COMPLETED" | "SKIPPED" | "CANCELLED" | "waiting" | "called" | "in_consultation" | "done" | "cancelled" | string
  check_in_time?: string
  created_at: string
  called_at?: string
  completed_at?: string
  has_vitals?: boolean
  patient?: any
  department?: any
  doctor?: any
  latest_vital?: any
  latestVital?: any
}

// ─── Vitals ───────────────────────────────────────────────────────────
export interface VitalConfig {
  id: number
  key: string          // e.g. "blood_pressure", "temperature"
  label: string        // e.g. "Blood Pressure", "Temperature (°F)"
  unit?: string        // e.g. "mmHg", "°F", "bpm"
  input_type: "text" | "number" | "select"
  options?: string[]   // for select type
  is_required: boolean
  sort_order: number
}

export interface RecordVitalPayload {
  patient_id: number
  visit_id?: number
  ipd_admission_id?: number
  vitals: Record<string, string | number>  // { blood_pressure: "120/80", temperature: 98.6 }
  recorded_at?: string
  notes?: string
}

// ─── Pre-Consultation Triage Assessment Types ─────────────────────────
export interface PastMedicalHistoryItem {
  disease: string
  duration: string
  medication: string
}

export interface PastSurgicalHistoryItem {
  name: string
  date: string
  surgeon: string
  hospital: string
}

export interface AddictionItem {
  type: string
  duration: string
  units: string
  frequency: string
  action: string
}

export interface PersonalHistory {
  diet: string
  appetite: string
  sleep: string
  bladder: string
  bowel: string
  current_treatment?: string
  comments?: string
}

export interface TriageAssessmentData {
  symptoms: string[] | string
  past_medical_history: PastMedicalHistoryItem[]
  past_surgical_history: PastSurgicalHistoryItem[]
  addictions: AddictionItem[]
  personal_history: PersonalHistory
  pain_score?: number
  map?: number
  bsa?: number
  creatinine?: number
  egfr?: number
  custom_sections?: Record<string, any>
  _audit_trail?: Array<{
    updated_by: number | string
    updated_at: string
    previous_snapshot: any
  }>
}

export interface VitalRecord {
  id: number
  hospital_id?: number
  patient_id: number
  opd_visit_id?: number
  ipd_admission_id?: number
  encounter_type?: string
  temperature?: number
  temperature_unit?: string
  blood_pressure_sys?: number
  blood_pressure_dia?: number
  pulse_rate?: number
  respiratory_rate?: number
  oxygen_saturation?: number
  weight?: number
  height?: number
  bmi?: number
  blood_glucose?: number
  glucose_type?: string
  custom_vitals?: Record<string, any>
  recorded_by?: number | string
  recordedByUser?: {
    id: number
    name: string
    username?: string
    email?: string
    roles?: Array<{ id: number; name: string }>
  }
  recorded_at: string
  created_at?: string
  updated_at?: string
  vitals?: Record<string, any>
  notes?: string
}

// ─── Diagnosis (ICD-10 Search) ────────────────────────────────────────
export interface DiagnosisResult {
  code: string         // e.g. "J06.9"
  name?: string        // e.g. "Acute upper respiratory tract infection"
  description?: string
  category?: string
}

// ─── Medicine Search ──────────────────────────────────────────────────
export interface MedicineResult {
  id: number
  name: string         // e.g. "Paracetamol 500mg" or brand_name
  brand_name?: string
  generic_name?: string
  salt_composition?: string
  manufacturer?: string
  dosage_form?: string // Tablet, Syrup, Injection, Capsule, etc.
  strength?: string    // 500mg, 250mg/5ml
  mrp?: number | string
  is_generic?: boolean
  prescription_type?: string
}

// ─── Diagnostic Investigation Search ──────────────────────────────────
export interface InvestigationResult {
  id?: number | string
  code?: string
  name: string
  category: "Pathology" | "Radiology" | "Cardiology" | string
  standard_rate?: number
  type?: string
}

// ─── Prescription ─────────────────────────────────────────────────────
export interface PrescriptionItem {
  medicine_name: string
  medicine_id?: number
  dosage: string           // e.g. "500mg"
  frequency: string        // e.g. "TID" | "BID" | "OD" | "SOS"
  duration: string         // e.g. "5 days"
  route?: string           // Oral, IV, IM
  instructions?: string    // e.g. "After food", "Empty stomach"
}

export interface PrescriptionInvestigationItem {
  id?: number
  test_name: string
  name?: string
  test_code?: string
  code?: string
  category?: "Pathology" | "Radiology" | "Cardiology" | string
  urgency?: "Routine" | "Urgent" | "STAT" | "routine" | "urgent" | "stat" | string
  standard_rate?: number
  clinical_indication?: string
  status?: "ordered" | "billed" | "completed" | string
  billed_invoice_id?: number | null
}

export interface SavePrescriptionPayload {
  id?: number
  visit_id?: number
  opd_visit_id?: number
  patient_id: number
  doctor_id?: number
  encounter_type?: "opd" | "ipd" | "emergency"
  status?: "draft" | "active"
  diagnosis_codes?: any[]   // ICD-10 for ABDM compliance
  diagnoses?: any[]
  chief_complaints: string[]
  clinical_notes?: string
  medicines?: PrescriptionItem[]
  items?: any[]
  investigations?: PrescriptionInvestigationItem[]
  disposition?: "home" | "day_care" | "admit_ipd"
  disposition_notes?: string
  admit_priority?: "routine" | "urgent" | "emergency"
  recommended_ward?: string
  follow_up_date?: string
  advice?: string
  diet_advice?: string
  general_advice?: string
}

export interface SavedPrescription {
  id: number
  visit_id?: number
  opd_visit_id?: number
  patient_id: number
  opd_number?: string
  prescription_number?: string
  status?: "draft" | "active" | string
  diagnosis_codes?: DiagnosisResult[]
  diagnoses?: any[]
  chief_complaints: string[] | string
  clinical_notes?: string
  medicines?: PrescriptionItem[]
  items?: any[]
  investigations?: PrescriptionInvestigationItem[]
  disposition?: "home" | "day_care" | "admit_ipd"
  disposition_notes?: string
  admit_priority?: "routine" | "urgent" | "emergency"
  recommended_ward?: string
  follow_up_date?: string
  advice?: string
  diet_advice?: string
  general_advice?: string
  prescribed_by?: string
  prescribed_at?: string
  created_at?: string
  updated_at?: string
}

// ─── Complete Consultation ────────────────────────────────────────────
export interface CompleteConsultationPayload {
  notes?: string
  refer_to_ipd?: boolean
}
