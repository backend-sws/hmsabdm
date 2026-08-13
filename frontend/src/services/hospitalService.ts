import { apiClient } from "./apiClient"
import type {
  Hospital,
  CreateHospitalDto,
  UpdateHospitalDto,
  HospitalFilter,
  PaginatedResponse,
} from "@/types/hospital"

export const hospitalService = {
  getHospitals: async (params?: HospitalFilter): Promise<PaginatedResponse<Hospital>> => {
    const query = new URLSearchParams()
    if (params?.search) query.append("search", params.search)
    if (params?.page) query.append("page", String(params.page))
    if (params?.limit) query.append("limit", String(params.limit))

    const queryString = query.toString() ? `?${query.toString()}` : ""
    return apiClient<PaginatedResponse<Hospital>>(`/hospitals${queryString}`)
  },

  getHospital: async (id: number | string): Promise<Hospital> => {
    return apiClient<Hospital>(`/hospitals/${id}`)
  },

  createHospital: async (data: CreateHospitalDto): Promise<Hospital> => {
    return apiClient<Hospital>("/hospitals", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  updateHospital: async (
    id: number | string,
    data: UpdateHospitalDto
  ): Promise<Hospital> => {
    return apiClient<Hospital>(`/hospitals/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },

  deleteHospital: async (id: number | string): Promise<void> => {
    return apiClient<void>(`/hospitals/${id}`, {
      method: "DELETE",
    })
  },
}
