import React from "react"
import { Navigate, useLocation } from "react-router"
import { useAuth } from "@/context/AuthContext"

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: string[]
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground">Authenticating ABDM Session...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const rawRole = (user?.role || user?.roles?.[0] || "").toUpperCase().replace(/[\s_-]+/g, "")
    const isSuperAdmin = rawRole.includes("SUPER")

    const isAllowed = allowedRoles.some((r) => {
      const nr = r.toUpperCase().replace(/[\s_-]+/g, "")
      if (isSuperAdmin) {
        return nr === "SUPERADMIN"
      }
      return (
        nr === rawRole ||
        (nr === "HOSPITALADMIN" && (rawRole === "ADMIN" || rawRole === "HOSPITALADMIN")) ||
        (nr === "ADMIN" && (rawRole === "ADMIN" || rawRole === "HOSPITALADMIN"))
      )
    })

    if (!isAllowed) {
      return <Navigate to="/" replace />
    }
  }

  return <>{children}</>
}
