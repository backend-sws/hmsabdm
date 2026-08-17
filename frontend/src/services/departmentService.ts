import { apiClient } from "./apiClient"
import type {
  Department,
  CreateDepartmentDto,
  UpdateDepartmentDto,
  PaginatedResponse,
} from "@/types/department"

export const departmentService = {
  getDepartments: async (params?: Record<string, any>): Promise<PaginatedResponse<Department>> => {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          query.append(key, String(value))
        }
      })
    }

    const queryString = query.toString() ? `?${query.toString()}` : ""
    return apiClient<PaginatedResponse<Department>>(`/departments${queryString}`)
  },

  getDepartment: async (id: number | string): Promise<Department> => {
    return apiClient<Department>(`/departments/${id}`)
  },

  createDepartment: async (data: CreateDepartmentDto): Promise<Department> => {
    return apiClient<Department>("/departments", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  updateDepartment: async (
    id: number | string,
    data: UpdateDepartmentDto
  ): Promise<Department> => {
    return apiClient<Department>(`/departments/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },

  deleteDepartment: async (id: number | string): Promise<void> => {
    return apiClient<void>(`/departments/${id}`, {
      method: "DELETE",
    })
  },
}
