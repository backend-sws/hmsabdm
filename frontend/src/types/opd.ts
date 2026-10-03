// ─── OPD Visit (Queue Item) ───────────────────────────────────────────
export interface OpdVisit {
  id: number
  visit_id: number
  opd_number: string
  token_no: string
  patient_id: number
  patient_name: string
  uhid: string
  age: number | null
  gender: string
  abha_address?: string
  abha_number?: string
  department_id: number
  department_name: string
  doctor_id?: number
  doctor_name?: string
  visit_reason?: string
  status: "WAITING" | "IN_CONSULTATION" | "COMPLETED" | "SKIPPED" | "CANCELLED"
  check_in_time: string
  created_at: string
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

export interface VitalRecord {
  id: number
  patient_id: number
  visit_id?: number
  vitals: Record<string, string | number>
  notes?: string
  recorded_by?: string
  recorded_at: string
}

// ─── Diagnosis (ICD-10 Search) ────────────────────────────────────────
export interface DiagnosisResult {
  code: string         // e.g. "J06.9"
  name: string         // e.g. "Acute upper respiratory tract infection"
  category?: string
}

// ─── Medicine Search ──────────────────────────────────────────────────
export interface MedicineResult {
  id: number
  name: string         // e.g. "Paracetamol 500mg"
  generic_name?: string
  manufacturer?: string
  dosage_form?: string // Tablet, Syrup, Injection
  strength?: string    // 500mg, 250mg/5ml
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

export interface SavePrescriptionPayload {
  visit_id: number
  patient_id: number
  diagnosis_codes: DiagnosisResult[]   // ICD-10 for ABDM compliance
  chief_complaints: string
  clinical_notes?: string
  medicines: PrescriptionItem[]
  follow_up_date?: string
  advice?: string
}

export interface SavedPrescription {
  id: number
  visit_id: number
  patient_id: number
  opd_number: string
  diagnosis_codes: DiagnosisResult[]
  chief_complaints: string
  clinical_notes?: string
  medicines: PrescriptionItem[]
  follow_up_date?: string
  advice?: string
  prescribed_by: string
  prescribed_at: string
}

// ─── Complete Consultation ────────────────────────────────────────────
export interface CompleteConsultationPayload {
  notes?: string
  refer_to_ipd?: boolean
}
