import { apiClient } from "./apiClient"
import type { LoginCredentials, AuthResponse, User } from "@/types/auth"

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
  },

  async logout(): Promise<void> {
    try {
      await apiClient("/logout", { method: "POST" })
    } catch {
      // Silent ignore on mock/network error
    }
  },

  async getCurrentUser(): Promise<User> {
    const rawUser = await apiClient<any>("/me")
    return normalizeUser(rawUser)
  },
}

