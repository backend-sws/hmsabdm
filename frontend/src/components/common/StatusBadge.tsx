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

    case "WAITING":
      return <Badge variant="warning">Waiting</Badge>

    case "IN_CONSULTATION":
      return <Badge variant="default" className="bg-blue-600 text-white hover:bg-blue-700">In Consultation</Badge>

    case "PENDING":
    case "LINKED":
    case "IN_PROGRESS":
      return <Badge variant="warning">{status}</Badge>

    case "CANCELLED":
    case "INACTIVE":
    case "FAILED":
    case "REJECTED":
    case "EXPIRED":
    case "SKIPPED":
      return <Badge variant="destructive">{status}</Badge>

    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export default StatusBadge
