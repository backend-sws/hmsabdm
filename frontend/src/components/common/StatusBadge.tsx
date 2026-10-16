import {
  CheckCircle2,
  Clock,
  Stethoscope,
  XCircle,
  AlertCircle,
  FileText,
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface StatusBadgeProps {
  status: string
  className?: string
  showIcon?: boolean
}

export function StatusBadge({ status, className, showIcon = true }: StatusBadgeProps) {
  const normalized = (status || "").toUpperCase().trim()

  switch (normalized) {
    case "DONE":
    case "COMPLETED":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide",
            "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 shadow-xs",
            className
          )}
        >
          {showIcon && <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" />}
          <span>{normalized === "DONE" ? "Done" : "Completed"}</span>
        </span>
      )

    case "CALLED":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide",
            "bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30 shadow-xs",
            className
          )}
        >
          {showIcon && (
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600 dark:bg-blue-400"></span>
            </span>
          )}
          <span>Called</span>
        </span>
      )

    case "IN_CONSULTATION":
    case "CONSULTING":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide",
            "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30 shadow-xs",
            className
          )}
        >
          {showIcon && <Stethoscope className="h-3 w-3 shrink-0 text-indigo-600 dark:text-indigo-400" />}
          <span>In Consultation</span>
        </span>
      )

    case "WAITING":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide",
            "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 shadow-xs",
            className
          )}
        >
          {showIcon && <Clock className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />}
          <span>Waiting</span>
        </span>
      )

    case "CONFIRMED":
    case "VERIFIED":
    case "ACTIVE":
    case "PAID":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide",
            "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 shadow-xs",
            className
          )}
        >
          {showIcon && <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" />}
          <span className="capitalize">{status.toLowerCase()}</span>
        </span>
      )

    case "PENDING":
    case "LINKED":
    case "IN_PROGRESS":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide",
            "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 shadow-xs",
            className
          )}
        >
          {showIcon && <AlertCircle className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />}
          <span className="capitalize">{status.toLowerCase().replace("_", " ")}</span>
        </span>
      )

    case "DRAFT":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide",
            "bg-slate-500/15 text-slate-700 dark:text-slate-400 border border-slate-500/30 shadow-xs",
            className
          )}
        >
          {showIcon && <FileText className="h-3 w-3 shrink-0 text-slate-500" />}
          <span>Draft</span>
        </span>
      )

    case "CANCELLED":
    case "INACTIVE":
    case "FAILED":
    case "REJECTED":
    case "EXPIRED":
    case "SKIPPED":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide",
            "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 shadow-xs",
            className
          )}
        >
          {showIcon && <XCircle className="h-3 w-3 shrink-0 text-rose-600 dark:text-rose-400" />}
          <span className="capitalize">{status.toLowerCase().replace("_", " ")}</span>
        </span>
      )

    default:
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border border-border bg-muted/60 text-muted-foreground",
            className
          )}
        >
          <span className="capitalize">{status || "—"}</span>
        </span>
      )
  }
}

export default StatusBadge
