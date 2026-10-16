import React from "react"
import { Badge } from "./badge"
import { cn } from "@/lib/utils"

export type CommonStatus =
  // Workflow / Generic
  | "pending"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "draft"
  | "active"
  | "inactive"
  // Lab
  | "ordered"
  | "sample_collected"
  | "sample_received"
  | "sample_rejected"
  | "tested"
  | "result_entered"
  | "authorized"
  | "dispatched"
  // Emergency Triage
  | "red"
  | "yellow"
  | "green"
  | "black"
  | "resuscitation"
  | "emergent"
  | "urgent"
  | "non_urgent"
  // IPD / Admission
  | "admitted"
  | "discharged"
  | "transferred"
  | "planned_discharge"
  // Billing
  | "paid"
  | "unpaid"
  | "partial"
  | "refunded"
  | (string & {})

export interface StatusBadgeProps {
  status: CommonStatus
  label?: string
  className?: string
  size?: "sm" | "md"
}

const statusConfig: Record<string, { label: string; className: string }> = {
  // Positive / Done / Authorized
  completed: { label: "Completed", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  authorized: { label: "Authorized", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  paid: { label: "Paid", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  active: { label: "Active", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  discharged: { label: "Discharged", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },

  // Warnings / In progress / Sample collected
  in_progress: { label: "In Progress", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  sample_collected: { label: "Sample Collected", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  sample_received: { label: "Sample Received", className: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20" },
  tested: { label: "Tested", className: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" },
  result_entered: { label: "Result Entered", className: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" },
  admitted: { label: "Admitted", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  partial: { label: "Partially Paid", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },

  // Pendings / Awaiting
  pending: { label: "Pending", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  ordered: { label: "Ordered", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  unpaid: { label: "Unpaid", className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" },
  draft: { label: "Draft", className: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" },

  // Insurance / Pre-Auth / Claims
  submitted: { label: "Submitted", className: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25" },
  approved: { label: "Approved", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25" },
  settled: { label: "Settled", className: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/30" },
  under_review: { label: "Under Review", className: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25" },
  queried: { label: "Queried (Shortfall)", className: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30" },
  denied: { label: "Denied", className: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25" },
  rejected: { label: "Rejected", className: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25" },
  enhancement_requested: { label: "Enhancement Pending", className: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/25" },

  // Red / Critical / Cancelled / Rejected
  cancelled: { label: "Cancelled", className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" },
  sample_rejected: { label: "Rejected", className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" },
  red: { label: "P1 (Red - Critical)", className: "bg-rose-600 text-white border-rose-700 animate-pulse font-bold" },
  yellow: { label: "P2 (Yellow - Urgent)", className: "bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30 font-semibold" },
  green: { label: "P3 (Green - Non-urgent)", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  black: { label: "P4 (Deceased/Expectant)", className: "bg-slate-900 text-slate-200 border-slate-700" },
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  className,
  size = "md",
}) => {
  const normalized = String(status).toLowerCase().replace(/[\s-]/g, "_")
  const config = statusConfig[normalized] || {
    label: label || status.replace(/_/g, " "),
    className: "bg-muted text-muted-foreground border-border",
  }

  const displayText = label || config.label

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1.5 font-medium transition-colors border",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs",
        config.className,
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
      <span className="capitalize">{displayText}</span>
    </Badge>
  )
}
