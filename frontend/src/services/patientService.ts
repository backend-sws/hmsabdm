import { apiClient } from "./apiClient"
import type {
  Patient,
  PatientFilter,
  CreatePatientDto,
  RegisterPatientWithoutAbhaDto,
  UpdatePatientDto,
} from "@/types/patient"
import type { PaginatedResponse } from "@/types/hospital"

export const patientService = {
  getPatients: async (params?: PatientFilter): Promise<PaginatedResponse<Patient>> => {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          // If the key is 'limit', map it to 'per_page' for the Laravel backend
          const paramKey = key === "limit" ? "per_page" : key
          query.append(paramKey, String(value))
        }
      })
    }
    const queryString = query.toString() ? `?${query.toString()}` : ""
    return apiClient<PaginatedResponse<Patient>>(`/patients${queryString}`)
  },

  getPatient: async (id: number | string): Promise<Patient> => {
    return apiClient<Patient>(`/patients/${id}`)
  },

  createPatient: async (data: CreatePatientDto): Promise<Patient> => {
    return apiClient<Patient>("/patients", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  registerPatientWithoutAbha: async (data: RegisterPatientWithoutAbhaDto): Promise<Patient> => {
    return apiClient<Patient>("/reception/register", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  getStats: async (): Promise<{
    total: number
    male: number
    female: number
    other: number
    abha_linked: number
    abha_unlinked: number
  }> => {
    const res = await apiClient<any>("/patients/stats")
    return res?.data || res
  },

  /**
   * Save ABHA Card base64 PDF to DB for a patient
   */
  saveAbhaCard: async (
    patientId: number | string,
    cardBase64: string,
    extra?: { abha_number?: string; mobile?: string }
  ): Promise<{ stored_in_db: boolean }> => {
    return apiClient<{ stored_in_db: boolean }>(`/patients/${patientId}/abha-card`, {
      method: "POST",
      body: JSON.stringify({ card_base64: cardBase64, ...extra }),
    })
  },

  /**
   * Get stored ABHA Card base64 PDF from DB for a patient.
   * Returns base64 string from the `data` field.
   */
  getAbhaCard: async (
    patientId: number | string,
    opts?: { format?: "base64"; token?: string }
  ): Promise<{ data: string }> => {
    const params = new URLSearchParams({ format: "base64" })
    if (opts?.token) params.set("token", opts.token)
    return apiClient<{ data: string }>(`/patients/${patientId}/abha-card?${params.toString()}`)
  },

  /**
   * Link an existing hospital patient with an ABHA account
   */
  linkAbha: async (
    patientId: number | string,
    data: {
      abha_number: string
      abha_address?: string
      token?: string
      txnId?: string
      abha_card_base64?: string
      photo?: string
      address?: string
      city?: string
      district?: string
      state?: string
      pincode?: string
    }
  ): Promise<Patient> => {
    return apiClient<Patient>(`/patients/${patientId}/link-abha`, {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  updatePatient: async (
    patientId: number | string,
    data: UpdatePatientDto
  ): Promise<Patient> => {
    return apiClient<Patient>(`/patients/${patientId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },

  getPatientHistory: async (patientId: number | string): Promise<any> => {
    return apiClient<any>(`/patients/${patientId}/history`)
  },
}
