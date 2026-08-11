import { Badge } from "@/components/ui/badge"

export interface StatusBadgeProps {
  status: string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = (status || "").toUpperCase()

  switch (normalized) {
    case "CONFIRMED":
    case "VERIFIED":
    case "ACTIVE":
    case "PAID":
    case "COMPLETED":
      return <Badge variant="success">{status}</Badge>

    case "PENDING":
    case "LINKED":
    case "IN_PROGRESS":
      return <Badge variant="warning">{status}</Badge>

    case "CANCELLED":
    case "INACTIVE":
    case "FAILED":
    case "REJECTED":
      return <Badge variant="destructive">{status}</Badge>

    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export default StatusBadge
