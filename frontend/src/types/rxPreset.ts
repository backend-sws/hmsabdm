export interface RxPresetMedicine {
  medicine_name: string
  dosage: string
  frequency: string
  duration: string
  route?: string
  instructions?: string
}

export type RxPresetScope = "doctor" | "department" | "hospital"

export interface RxPreset {
  id: string
  name: string
  icon?: string
  scope: RxPresetScope
  doctor_id?: number | null
  doctor_name?: string | null
  department_id?: number | null
  department_name?: string | null
  meds: RxPresetMedicine[]
  is_default?: boolean
  created_at?: string
  updated_at?: string
}
