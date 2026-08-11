export type UserRole = "SUPER_ADMIN" | "HOSPITAL_ADMIN" | "DOCTOR" | "RECEPTIONIST" | "PATIENT"

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  hospitalId?: string
  hospitalName?: string
  avatarUrl?: string
  department?: string
}

export interface LoginCredentials {
  email: string
  password: string
  role?: UserRole
  rememberMe?: boolean
}

export interface AuthResponse {
  token: string
  user: User
}
