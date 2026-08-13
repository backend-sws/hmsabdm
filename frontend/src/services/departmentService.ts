import { apiClient } from "./apiClient"
import type {
  Department,
  CreateDepartmentDto,
  UpdateDepartmentDto,
  DepartmentFilter,
  PaginatedResponse,
} from "@/types/department"

export const departmentService = {
  getDepartments: async (params?: DepartmentFilter): Promise<PaginatedResponse<Department>> => {
    const query = new URLSearchParams()
    if (params?.search) query.append("search", params.search)
    if (params?.status) query.append("status", params.status)
    if (params?.page) query.append("page", String(params.page))
    if (params?.limit) query.append("limit", String(params.limit))

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
