export type UserRole =
  | "SUPER_ADMIN"
  | "HOSPITAL_ADMIN"
  | "DOCTOR"
  | "RECEPTIONIST"
  | "PATIENT"
  | string

export interface User {
  id: string | number
  name: string
  email: string
  username?: string
  role?: UserRole
  roles?: string[]
  hospital_id?: string | number | null
  hospitalId?: string | number | null
  hospitalName?: string
  hospital_name?: string
  hospital?: { id: string | number; name: string; code: string } | null
  avatarUrl?: string
  department?: string
}

export interface LoginCredentials {
  login_id?: string
  email?: string
  username?: string
  userId?: string
  password: string
  role?: UserRole
  rememberMe?: boolean
}

export interface AuthResponse {
  token: string
  user: User
}

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

