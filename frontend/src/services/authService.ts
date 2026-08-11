import { apiClient } from "./apiClient"
import type { LoginCredentials, AuthResponse, User, UserRole } from "@/types/auth"

const MOCK_USERS: Record<UserRole, User> = {
  SUPER_ADMIN: {
    id: "USR-001",
    name: "Dr. Vikram Sethi",
    email: "admin@hmsabdm.gov.in",
    role: "SUPER_ADMIN",
    hospitalName: "National Health Authority HQ",
  },
  HOSPITAL_ADMIN: {
    id: "USR-002",
    name: "Rajesh Sharma",
    email: "admin@cityhospital.com",
    role: "HOSPITAL_ADMIN",
    hospitalId: "HOSP-01",
    hospitalName: "Apollo City Hospital",
  },
  DOCTOR: {
    id: "USR-003",
    name: "Dr. Ananya Roy",
    email: "doctor@cityhospital.com",
    role: "DOCTOR",
    hospitalId: "HOSP-01",
    hospitalName: "Apollo City Hospital",
    department: "Cardiology",
  },
  RECEPTIONIST: {
    id: "USR-004",
    name: "Priya Nair",
    email: "reception@cityhospital.com",
    role: "RECEPTIONIST",
    hospitalId: "HOSP-01",
    hospitalName: "Apollo City Hospital",
    department: "OPD Front Desk",
  },
  PATIENT: {
    id: "USR-005",
    name: "Suresh Kumar",
    email: "patient@abha.gov.in",
    role: "PATIENT",
  },
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // Attempt backend login
      return await apiClient<AuthResponse>("/login", {
        method: "POST",
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
        }),
      })
    } catch (error) {
      // Demo/Fallback handling if backend server is not running or returning initial dev state
      console.warn("Backend login failed or unreachable. Falling back to local mock authentication.", error)
      
      const role = credentials.role || "DOCTOR"
      const mockUser = MOCK_USERS[role] || MOCK_USERS.DOCTOR
      
      const response: AuthResponse = {
        token: `mock_jwt_token_${Date.now()}_${mockUser.role}`,
        user: {
          ...mockUser,
          email: credentials.email || mockUser.email,
        },
      }
      return response
    }
  },

  async logout(): Promise<void> {
    try {
      await apiClient("/logout", { method: "POST" })
    } catch {
      // Silent ignore on mock/network error
    }
  },

  async getCurrentUser(): Promise<User> {
    return await apiClient<User>("/user")
  },
}
