import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import type { User, LoginCredentials } from "@/types/auth"
import { authService } from "@/services/authService"

interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const TOKEN_KEY = "hms_auth_token"
const USER_KEY = "hms_auth_user"

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem(USER_KEY)
    return savedUser ? JSON.parse(savedUser) : null
  })
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY)
  })
  const [isLoading, setIsLoading] = useState<boolean>(false)

  useEffect(() => {
    if (token && !user) {
      setIsLoading(true)
      authService
        .getCurrentUser()
        .then((fetchedUser) => {
          setUser(fetchedUser)
          localStorage.setItem(USER_KEY, JSON.stringify(fetchedUser))
        })
        .catch(() => {
          // If token invalid, clear session
          localStorage.removeItem(TOKEN_KEY)
          localStorage.removeItem(USER_KEY)
          setToken(null)
          setUser(null)
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
  }, [token, user])

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true)
    try {
      const response = await authService.login(credentials)
      setToken(response.token)
      setUser(response.user)
      localStorage.setItem(TOKEN_KEY, response.token)
      localStorage.setItem(USER_KEY, JSON.stringify(response.user))
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    setIsLoading(true)
    try {
      await authService.logout()
    } finally {
      setToken(null)
      setUser(null)
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      setIsLoading(false)
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
