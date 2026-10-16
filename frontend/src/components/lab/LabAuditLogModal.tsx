import React from "react"
import { useQuery } from "@tanstack/react-query"
import {
  History,
  X,
  Clock,
  User,
  ShieldCheck,
  FileEdit,
  RotateCcw,
  Receipt,
  CheckCircle2,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { labService } from "@/services/labService"
import type { LabAuditLog, LabOrder } from "@/types/lab"

interface LabAuditLogModalProps {
  order: LabOrder | null
  isOpen: boolean
  onClose: () => void
}

export const LabAuditLogModal: React.FC<LabAuditLogModalProps> = ({
  order,
  isOpen,
  onClose,
}) => {
  const orderId = order?.id || 0

  const {
    data: logs,
    isLoading,
    refetch,
    isFetching,
  } = useQuery<LabAuditLog[]>({
    queryKey: ["lab", "auditLogs", orderId],
    queryFn: () => labService.getAuditLogs(orderId),
    enabled: isOpen && Boolean(orderId),
  })

  if (!isOpen || !order) return null

  const getActionBadge = (action: string) => {
    switch (action) {
      case "result_modified":
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1 text-[11px]">
            <FileEdit className="h-3 w-3" />
            Result Modified
          </Badge>
        )
      case "result_entered":
        return (
          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 gap-1 text-[11px]">
            <Clock className="h-3 w-3" />
            Result Entered
          </Badge>
        )
      case "test_approved":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1 text-[11px]">
            <CheckCircle2 className="h-3 w-3" />
            Test Approved
          </Badge>
        )
      case "report_authorized":
        return (
          <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30 gap-1 text-[11px]">
            <ShieldCheck className="h-3 w-3" />
            Report Authorized
          </Badge>
        )
      case "test_revoked":
      case "authorization_revoked":
        return (
          <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30 gap-1 text-[11px]">
            <RotateCcw className="h-3 w-3" />
            Sign-off Revoked
          </Badge>
        )
      case "bill_updated":
        return (
          <Badge className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30 gap-1 text-[11px]">
            <Receipt className="h-3 w-3" />
            Bill & Tests Updated
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-[11px]">
            {action}
          </Badge>
        )
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[88vh] flex flex-col bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <History className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">
                  Diagnostic Result Audit Trail
                </h2>
                <Badge variant="secondary" className="font-mono text-xs">
                  {order.order_number}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Patient: <span className="font-semibold text-foreground">{order.patient?.name}</span>
                {order.patient?.uhid && ` (UHID: ${order.patient.uhid})`} • Track who edited and authorized results
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => refetch()}
              disabled={isFetching}
              title="Refresh Audit History"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="py-16 text-center">
              <LoadingSpinner label="Loading audit history records..." />
            </div>
          ) : !logs || logs.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="h-12 w-12 mx-auto rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <History className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">No Audit Logs Found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No result modifications or sign-offs have been recorded yet for this order. Any future edits will be tracked automatically here.
              </p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:bottom-2 before:top-2 before:left-[11px] before:w-0.5 before:bg-border">
              {logs.map((log) => {
                const dateStr = new Date(log.created_at).toLocaleString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: true,
                })

                return (
                  <div key={log.id} className="relative group">
                    {/* Dot on timeline */}
                    <div className="absolute -left-[29px] top-1 h-3.5 w-3.5 rounded-full border-2 border-background bg-primary shadow-xs" />

                    <div className="p-4 rounded-xl border border-border bg-background shadow-xs hover:border-primary/40 transition-all space-y-2.5">
                      {/* Top meta row */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {getActionBadge(log.action)}
                          {log.order_item?.test_name && (
                            <span className="text-xs font-bold text-foreground">
                              {log.order_item.test_name}
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {dateStr}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-foreground font-medium leading-relaxed">
                        {log.description}
                      </p>

                      {/* User & IP Footer */}
                      <div className="flex items-center justify-between pt-2 border-t border-border/60 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <User className="h-3.5 w-3.5 text-primary" />
                          <span>{log.user?.name || "System Operator"}</span>
                        </div>

                        {log.ip_address && (
                          <span className="text-[10px] font-mono text-muted-foreground">
                            IP: {log.ip_address}
                          </span>
                        )}
                      </div>

                      {/* Parameter Diff Table (if previous or new values recorded) */}
                      {log.previous_values && Object.keys(log.previous_values).length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border/40">
                          <span className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">
                            Values Comparison:
                          </span>
                          <div className="rounded-lg border border-border overflow-hidden text-xs">
                            <table className="w-full text-left">
                              <thead className="bg-muted/50 text-[10px] uppercase font-bold text-muted-foreground border-b border-border">
                                <tr>
                                  <th className="px-2.5 py-1">Parameter</th>
                                  <th className="px-2.5 py-1 text-red-600 dark:text-red-400">Previous Value</th>
                                  <th className="px-2.5 py-1 text-emerald-600 dark:text-emerald-400">New Value</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/60 font-mono text-[11px]">
                                {Object.keys(log.previous_values).map((pKey) => (
                                  <tr key={pKey}>
                                    <td className="px-2.5 py-1 font-sans font-semibold text-foreground">{pKey}</td>
                                    <td className="px-2.5 py-1 text-red-600 dark:text-red-400 bg-red-500/5">
                                      {String(log.previous_values?.[pKey] ?? "-")}
                                    </td>
                                    <td className="px-2.5 py-1 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 font-bold">
                                      {String(log.new_values?.[pKey] ?? "-")}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-muted/20">
          <span className="text-[11px] text-muted-foreground">
            {logs?.length || 0} audit record(s) indexed for this order.
          </span>
          <Button variant="default" size="sm" onClick={onClose} className="text-xs h-8">
            Done
          </Button>
        </div>
      </div>
    </div>
  )
}
