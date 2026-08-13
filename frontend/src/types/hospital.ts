export interface HospitalAdminCredentials {
  id: number | string
  name: string
  email: string
  password?: string
}

export interface Hospital {
  id: number | string
  name: string
  code?: string
  abdm_hip_id?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  admin_credentials?: HospitalAdminCredentials
  created_at?: string
  updated_at?: string
}

export interface CreateHospitalDto {
  name: string
  code?: string
  abdm_hip_id?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  admin_name?: string
  admin_email?: string
  admin_password?: string
}

export interface UpdateHospitalDto extends Partial<CreateHospitalDto> {}

export interface HospitalFilter {
  search?: string
  page?: number
  limit?: number
}

export interface PaginationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface PaginatedResponse<T> {
  success: boolean
  message: string
  data: T[]
  meta: PaginationMeta
}
