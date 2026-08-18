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
  custom_fields?: {
    marital_status?: string
    occupation?: string
  }
  created_at?: string
  updated_at?: string
}

export interface CreatePatientDto {
  name: string
  mobile?: string
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
  gender?: "M" | "F" | "O"
  dob?: string
  blood_group?: string
  address?: string
  city?: string
  district?: string
  state?: string
  pincode?: string
  custom_fields?: {
    marital_status?: string
    occupation?: string
  }
}

export type UpdatePatientDto = Partial<CreatePatientDto>

export interface PatientFilter {
  search?: string
  page?: number
  limit?: number
  per_page?: number
}

export type { PaginatedResponse, PaginationMeta }
