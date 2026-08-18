import { apiClient } from "./apiClient"
import type { Patient, PatientFilter, CreatePatientDto, RegisterPatientWithoutAbhaDto } from "@/types/patient"
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
}
