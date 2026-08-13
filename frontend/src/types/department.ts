import type { PaginatedResponse, PaginationMeta } from "./hospital"

export interface Department {
  id: number | string
  hospital_id?: number | string
  name: string
  code: string
  description?: string
  is_active: boolean
  doctors_count?: number
  created_at?: string
  updated_at?: string
}

export interface CreateDepartmentDto {
  name: string
  code: string
  description?: string
  is_active?: boolean
}

export interface UpdateDepartmentDto extends Partial<CreateDepartmentDto> {}

export interface DepartmentFilter {
  search?: string
  status?: string
  page?: number
  limit?: number
}

export type { PaginatedResponse, PaginationMeta }
