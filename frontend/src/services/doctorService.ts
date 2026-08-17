import { apiClient } from "./apiClient"
import type { Doctor, DoctorSchedule, DoctorFilter } from "@/types/doctor"
import type { PaginatedResponse } from "@/types/hospital"

export const doctorService = {
  getDoctors: async (params?: DoctorFilter): Promise<PaginatedResponse<Doctor>> => {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          query.append(key, String(value))
        }
      })
    }
    const queryString = query.toString() ? `?${query.toString()}` : ""
    return apiClient<PaginatedResponse<Doctor>>(`/doctors${queryString}`)
  },

  getDoctor: async (id: number | string): Promise<Doctor> => {
    return apiClient<Doctor>(`/doctors/${id}`)
  },

  createDoctor: async (data: Partial<Doctor> & { password?: string }): Promise<Doctor> => {
    return apiClient<Doctor>("/doctors", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  updateDoctor: async (
    id: number | string,
    data: Partial<Doctor> & { password?: string }
  ): Promise<Doctor> => {
    return apiClient<Doctor>(`/doctors/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },

  deleteDoctor: async (id: number | string): Promise<void> => {
    return apiClient<void>(`/doctors/${id}`, {
      method: "DELETE",
    })
  },

  updateSchedule: async (
    id: number | string,
    schedules: DoctorSchedule[]
  ): Promise<void> => {
    return apiClient<void>(`/doctors/${id}/schedule`, {
      method: "PUT",
      body: JSON.stringify({ schedules }),
    })
  },
}
