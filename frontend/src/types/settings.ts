export interface HospitalProfile {
  id: number
  name: string
  code: string
  abdm_hip_id?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  pincode?: string | null
  logo_url?: string | null
  is_active: boolean
  settings?: Record<string, any>
  created_at?: string
  updated_at?: string
}

export interface NumberingConfig {
  prefix?: string
  format: string
  padding?: number
  sequence_reset?: string
  next_sequence?: number
  current_sequence?: number
  sample_preview?: string
  format_tokens?: Record<string, string>
}

export interface UnifiedNumberingOverview {
  uhid: NumberingConfig & { uhid_prefix?: string; uhid_format?: string; uhid_padding?: number }
  opd_number: NumberingConfig & { opd_prefix?: string; opd_format?: string; opd_padding?: number }
  opd: NumberingConfig & { opd_prefix?: string; opd_format?: string; opd_padding?: number }   // backend alias
  ipd_number: NumberingConfig & { ipd_prefix?: string; ipd_format?: string; ipd_padding?: number }
  ipd: NumberingConfig & { ipd_prefix?: string; ipd_format?: string; ipd_padding?: number }   // backend alias
}

export interface VitalFieldConfig {
  id: number
  hospital_id?: number
  field_key: string
  label: string
  category?: string | null
  unit?: string | null
  input_type: "number" | "text" | "select" | "boolean"
  options?: string[] | null
  min_value?: number | null
  max_value?: number | null
  is_required: boolean
  is_active: boolean
  sort_order?: number
}

export interface PatientFieldConfig {
  id: number
  hospital_id?: number
  field_key: string     // backend field (was field_name)
  field_name?: string   // frontend alias kept for compat
  label: string
  field_type?: "text" | "number" | "select" | "date" | "checkbox"  // frontend compat
  input_type?: "text" | "number" | "select" | "date" | "checkbox" | "boolean"  // backend field
  category?: string | null
  placeholder?: string | null
  options?: string[] | null
  is_required: boolean
  is_active: boolean
  sort_order?: number
}
