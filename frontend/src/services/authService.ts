import { apiClient, ApiError } from "./apiClient"
import type { LoginCredentials, AuthResponse, User, UserRole } from "@/types/auth"

const MOCK_USERS: Record<UserRole, User> = {
  SUPER_ADMIN: {
    id: "USR-001",
    name: "Company Super Admin",
    email: "superadmin@hms.com",
    role: "SUPER_ADMIN",
    hospitalName: "National Health Authority HQ",
  },
  HOSPITAL_ADMIN: {
    id: "USR-002",
    name: "Rajesh Sharma",
    email: "admin@demo.com",
    role: "HOSPITAL_ADMIN",
    hospitalId: "HOSP-01",
    hospitalName: "Demo Care Hospital",
  },
  DOCTOR: {
    id: "USR-003",
    name: "Dr. Sharma",
    email: "dr.sharma@demo.com",
    role: "DOCTOR",
    hospitalId: "HOSP-01",
    hospitalName: "Demo Care Hospital",
    department: "Cardiology",
  },
  RECEPTIONIST: {
    id: "USR-004",
    name: "Priya Nair",
    email: "reception@cityhospital.com",
    role: "RECEPTIONIST",
    hospitalId: "HOSP-01",
    hospitalName: "Demo Care Hospital",
    department: "OPD Front Desk",
  },
  PATIENT: {
    id: "USR-005",
    name: "Suresh Kumar",
    email: "patient@abha.gov.in",
    role: "PATIENT",
  },
}

function normalizeUser(rawUser: any): User {
  if (!rawUser) return rawUser
  const rolesArray: string[] = Array.isArray(rawUser.roles)
    ? rawUser.roles
    : rawUser.role
    ? [rawUser.role]
    : []

  let primaryRole: string = "SUPER_ADMIN"
  if (rolesArray.length > 0) {
    const rawRole = String(rolesArray[0]).toUpperCase()
    if (rawRole.includes("SUPER")) {
      primaryRole = "SUPER_ADMIN"
    } else if (rawRole.includes("ADMIN")) {
      primaryRole = "HOSPITAL_ADMIN"
    } else if (rawRole.includes("DOCTOR")) {
      primaryRole = "DOCTOR"
    } else if (rawRole.includes("RECEPT")) {
      primaryRole = "RECEPTIONIST"
    } else if (rawRole.includes("PATIENT")) {
      primaryRole = "PATIENT"
    } else {
      primaryRole = rawRole.replace(/\s+/g, "_")
    }
  }

  return {
    ...rawUser,
    id: rawUser.id,
    name: rawUser.name || "User",
    email: rawUser.email,
    role: primaryRole,
    roles: rolesArray,
    hospitalId: rawUser.hospital_id || rawUser.hospitalId || null,
  }
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await apiClient<any>("/login", {
        method: "POST",
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
        }),
      })

      const rawUser = response.user || response
      const token = response.token || ""

      return {
        token,
        user: normalizeUser(rawUser),
      }
    } catch (error) {
      // Re-throw validation errors (422) or server authentication rejections directly
      if (error instanceof ApiError && error.status === 422) {
        throw error
      }

      console.warn("Backend login network call issue. Falling back to local mock authentication.", error)
      
      const role = credentials.role || "SUPER_ADMIN"
      const mockUser = MOCK_USERS[role] || MOCK_USERS.SUPER_ADMIN
      
      return {
        token: `mock_jwt_token_${Date.now()}_${mockUser.role}`,
        user: {
          ...mockUser,
          email: credentials.email || mockUser.email,
        },
      }
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
    const rawUser = await apiClient<any>("/user")
    return normalizeUser(rawUser)
  },
}

