import React from "react"
import { Navigate, useLocation } from "react-router"
import { useAuth } from "@/context/AuthContext"
import { AppLoadingSkeleton } from "@/components/ui/AppLoadingSkeleton"

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: string[]
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <AppLoadingSkeleton />
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
