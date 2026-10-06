import type { PaginatedResponse, PaginationMeta } from "./hospital"

export interface Patient {
  id: number | string
  hospital_id?: number | string
  uhid: string
  name: string
  guardian_name?: string
  guardian_relation?: string
  guardian_phone?: string
  mobile?: string
  id_proof_type?: string
  id_proof_number?: string
  abha_number?: string
  abha_address?: string
  email?: string
  dob?: string
  gender?: "M" | "F" | "O"
  blood_group?: string
  address?: string
  city?: string
  district?: string
  state?: string
  pincode?: string
  photo?: string
  custom_fields?: Record<string, any>
  kyc_verified?: boolean
  last_visit_date?: string | null
  last_visit_type?: string | null
  last_department?: string | null
  last_doctor?: string | null
  created_at?: string
  updated_at?: string
}

export interface CreatePatientDto {
  name: string
  mobile?: string
  id_proof_type?: string
  id_proof_number?: string
  abha_number?: string
  abha_address?: string
  email?: string
  dob?: string
  gender?: "M" | "F" | "O"
  blood_group?: string
  address?: string
  city?: string
  pincode?: string
}

export interface RegisterPatientWithoutAbhaDto {
  name: string
  guardian_name?: string
  guardian_relation?: string
  guardian_phone?: string
  mobile?: string
  email?: string
  id_proof_type?: string
  id_proof_number?: string
  gender?: "M" | "F" | "O"
  dob?: string
  blood_group?: string
  address?: string
  city?: string
  district?: string
  state?: string
  pincode?: string
  custom_fields?: Record<string, any>
}

export type UpdatePatientDto = Partial<CreatePatientDto> & {
  guardian_name?: string
  guardian_relation?: string
  guardian_phone?: string
  id_proof_type?: string
  id_proof_number?: string
  district?: string
  state?: string
  custom_fields?: Record<string, any>
}

export interface PatientFilter {
  search?: string
  gender?: string
  abha_status?: string
  page?: number
  limit?: number
  per_page?: number
}

export type { PaginatedResponse, PaginationMeta }
