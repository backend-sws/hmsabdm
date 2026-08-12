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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    localStorage.removeItem("hms_auth_user")
    return localStorage.getItem(TOKEN_KEY)
  })
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    return !!localStorage.getItem(TOKEN_KEY)
  })

  useEffect(() => {
    if (!token) {
      setUser(null)
      setIsLoading(false)
      return
    }

    let isMounted = true
    setIsLoading(true)

    authService
      .getCurrentUser()
      .then((fetchedUser) => {
        if (isMounted) {
          setUser(fetchedUser)
        }
      })
      .catch(() => {
        if (isMounted) {
          localStorage.removeItem(TOKEN_KEY)
          setToken(null)
          setUser(null)
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [token])

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true)
    try {
      const response = await authService.login(credentials)
      const newToken = response.token

      localStorage.setItem(TOKEN_KEY, newToken)
      setToken(newToken)

      const fetchedUser = await authService.getCurrentUser()
      setUser(fetchedUser)
    } catch (error) {
      localStorage.removeItem(TOKEN_KEY)
      setToken(null)
      setUser(null)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    setIsLoading(true)
    try {
      await authService.logout()
    } finally {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem("hms_auth_user")
      setToken(null)
      setUser(null)
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
