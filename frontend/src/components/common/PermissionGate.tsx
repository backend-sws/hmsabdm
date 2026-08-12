import React from "react"

export interface PermissionGateProps {
  resource: string
  action: "create" | "read" | "update" | "delete"
  children: React.ReactNode
}

export function PermissionGate({ children }: PermissionGateProps) {
  return <>{children}</>
}

export default PermissionGate
