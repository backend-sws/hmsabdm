import React from "react"
import { createPortal } from "react-dom"
import { X, Clock, ShieldCheck, User, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { VitalRecord } from "@/types/opd"

interface VitalAuditModalProps {
  open: boolean
  onClose: () => void
  vital: VitalRecord | null
  patientName?: string
}

export const VitalAuditModal: React.FC<VitalAuditModalProps> = ({
  open,
  onClose,
  vital,
  patientName,
}) => {
  if (!open || !vital) return null

  const staffUser = vital.recordedByUser
  const staffName = staffUser?.name || "Staff Nurse"
  const staffUsername = staffUser?.username ? `@${staffUser.username}` : `ID: #${vital.recorded_by || "—"}`
  const staffRole = staffUser?.roles?.[0]?.name || "Staff Nurse / Triage Operator"

  const custom = vital.custom_vitals || {}
  const auditTrail: Array<{
    updated_by: number | string
    updated_at: string
    previous_snapshot: any
  }> = Array.isArray(custom._audit_trail) ? custom._audit_trail : []

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Clinical Vitals Audit Trail</h3>
              <p className="text-[11px] text-muted-foreground">
                Staff Attribution & Entry Revisions {patientName ? `• ${patientName}` : ""}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Active Entry Attribution */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 text-xs">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Current Active Record
              </span>
              <Badge className="bg-emerald-600 text-white text-[10px]">Active</Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div>
                <span className="text-muted-foreground block text-[10px]">Recorded By Staff</span>
                <span className="font-bold text-foreground flex items-center gap-1">
                  <User className="h-3 w-3 text-muted-foreground" />
                  {staffName}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {staffUsername} • {staffRole}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[10px]">Recorded Timestamp</span>
                <span className="font-bold text-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  {vital.recorded_at ? new Date(vital.recorded_at).toLocaleString("en-IN") : "Just now"}
                </span>
                <span className="text-[10px] text-muted-foreground">Encounter: {vital.encounter_type || "OPD"}</span>
              </div>
            </div>

            {/* Current Values Quick View */}
            <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-emerald-500/20 text-center font-mono text-[11px]">
              <div className="p-1.5 bg-background rounded-md border border-border">
                <span className="text-[9px] text-muted-foreground block font-sans">BP</span>
                <span className="font-bold">{vital.blood_pressure_sys ? `${vital.blood_pressure_sys}/${vital.blood_pressure_dia}` : "—"}</span>
              </div>
              <div className="p-1.5 bg-background rounded-md border border-border">
                <span className="text-[9px] text-muted-foreground block font-sans">Pulse</span>
                <span className="font-bold">{vital.pulse_rate ? `${vital.pulse_rate} bpm` : "—"}</span>
              </div>
              <div className="p-1.5 bg-background rounded-md border border-border">
                <span className="text-[9px] text-muted-foreground block font-sans">Temp</span>
                <span className="font-bold">{vital.temperature ? `${vital.temperature}°${vital.temperature_unit || "F"}` : "—"}</span>
              </div>
              <div className="p-1.5 bg-background rounded-md border border-border">
                <span className="text-[9px] text-muted-foreground block font-sans">SpO2</span>
                <span className="font-bold">{vital.oxygen_saturation ? `${vital.oxygen_saturation}%` : "—"}</span>
              </div>
            </div>
          </div>

          {/* Audit Revisions Timeline */}
          <div className="space-y-2">
            <h4 className="font-bold text-foreground text-xs flex items-center gap-1.5">
              <History className="h-3.5 w-3.5 text-primary" />
              Modification History & Revisions ({auditTrail.length})
            </h4>

            {auditTrail.length === 0 ? (
              <p className="text-muted-foreground text-[11px] italic bg-muted/20 p-3 rounded-lg border border-border text-center">
                Original record created at triage. No subsequent modifications have been made.
              </p>
            ) : (
              <div className="space-y-2">
                {auditTrail.map((entry, idx) => (
                  <div key={idx} className="rounded-xl border border-border p-3 bg-muted/15 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-foreground">
                        Revision #{auditTrail.length - idx}
                      </span>
                      <span className="text-muted-foreground font-mono text-[10px]">
                        {new Date(entry.updated_at).toLocaleString("en-IN")}
                      </span>
                    </div>

                    <p className="text-[11px] text-muted-foreground">
                      Updated by Staff User ID: <strong className="text-foreground">#{entry.updated_by}</strong>
                    </p>

                    {entry.previous_snapshot && (
                      <div className="p-2 bg-background rounded-lg border border-border text-[10px] font-mono space-y-1">
                        <span className="text-[9px] text-muted-foreground block font-sans">Prior Snapshot Before Edit:</span>
                        <div className="grid grid-cols-3 gap-1">
                          {entry.previous_snapshot.bp_sys && (
                            <span>BP: {entry.previous_snapshot.bp_sys}/{entry.previous_snapshot.bp_dia}</span>
                          )}
                          {entry.previous_snapshot.pulse && <span>Pulse: {entry.previous_snapshot.pulse}</span>}
                          {entry.previous_snapshot.temp && <span>Temp: {entry.previous_snapshot.temp}°F</span>}
                          {entry.previous_snapshot.spo2 && <span>SpO2: {entry.previous_snapshot.spo2}%</span>}
                          {entry.previous_snapshot.weight && <span>Weight: {entry.previous_snapshot.weight}kg</span>}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-3 border-t border-border bg-muted/30">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Close
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
