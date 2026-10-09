import React, { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { useQuery } from "@tanstack/react-query"
import {
  X,
  User,
  Phone,
  Calendar,
  MapPin,
  Activity,
  Clock,
  ShieldCheck,
  Stethoscope,
  PhoneCall,
  History,
  Loader2,
  ChevronRight,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/common/StatusBadge"
import { patientService } from "@/services/patientService"
import { opdService } from "@/services/opdService"
import { queryKeys } from "@/constants/queryKeys"
import { formatPatientAge, formatPatientGender, formatPatientDob } from "@/utils/patientUtils"
import { VitalAuditModal } from "./VitalAuditModal"
import type { OpdVisit } from "@/types/opd"

interface PatientInfoSlideOverProps {
  open: boolean
  onClose: () => void
  visit: OpdVisit | null
  onOpenWorkstation?: (visit: OpdVisit) => void
  onRecordVitals?: (visit: OpdVisit) => void
  onCallPatient?: (visitId: number) => void
}

export const PatientInfoSlideOver: React.FC<PatientInfoSlideOverProps> = ({
  open,
  onClose,
  visit,
  onOpenWorkstation,
  onRecordVitals,
  onCallPatient,
}) => {
  const patientId = Number(visit?.patient_id || visit?.patient?.id || 0)
  const patient = visit?.patient || ({} as any)
  const [auditModalOpen, setAuditModalOpen] = useState(false)

  // 1. Fetch 360-degree patient history (Unconditional hook call)
  const { data: historyData, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["patient", patientId, "history"],
    queryFn: () => patientService.getPatientHistory(patientId),
    enabled: Boolean(open && patientId > 0),
  })

  // 2. Fetch latest visit vitals directly (Unconditional hook call)
  const visitId = Number(visit?.id || visit?.visit_id || 0)
  const { data: visitVitalsList = [] } = useQuery({
    queryKey: queryKeys.opd.visitVitals(visitId),
    queryFn: () => opdService.getVisitVitals(visitId),
    enabled: Boolean(open && visitId > 0),
    staleTime: 0,
    refetchOnMount: true,
  })

  // 3. Listen for Escape key & lock background body scrolling (Unconditional hook call)
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [open, onClose])

  // Early return strictly AFTER all hooks
  if (!open || !visit) return null

  const history = historyData?.data || historyData || {}
  const pastOpdVisits = Array.isArray(history.opd_visits)
    ? history.opd_visits.filter((v: any) => v.id !== visit.id)
    : []

  const ageDisplay = formatPatientAge(
    visit.age || patient.age,
    visit.dob || patient.dob
  )
  const genderDisplay = formatPatientGender(visit.gender || patient.gender)
  const dobDisplay = formatPatientDob(visit.dob || patient.dob)

  // Vitals record with live fallback
  const vitalsRecord =
    visitVitalsList?.[0] ||
    visit.latest_vital ||
    visit.latestVital ||
    patient.latestVital
  const v = vitalsRecord?.vitals || vitalsRecord

  const isWaiting = String(visit.status).toLowerCase() === "waiting"

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="slideover-title"
    >
      {/* Full-screen Blurred & Dimmed Backdrop (covers header & entire page) */}
      <div
        className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm transition-all duration-300 animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Content Container */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-6 sm:pl-10 pointer-events-none">
        <div
          className="pointer-events-auto w-screen max-w-md sm:max-w-lg bg-background border-l border-border shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300 ease-out"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with Prominent Close Cross Button */}
          <div className="sticky top-0 z-20 px-5 py-3.5 border-b border-border bg-card/95 backdrop-blur-md flex items-center justify-between shrink-0 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <User className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 id="slideover-title" className="text-sm font-bold text-foreground truncate">
                    Patient 360° Profile
                  </h3>
                  <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-mono py-0">
                    Live
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                  Demographics, Triage Vitals & Medical History
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="hidden sm:inline-flex items-center text-[10px] text-muted-foreground font-mono bg-muted/70 px-1.5 py-0.5 rounded border border-border/60">
                Esc
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 rounded-full hover:bg-destructive/15 hover:text-destructive text-muted-foreground transition-colors"
                title="Close drawer (Esc)"
                aria-label="Close patient drawer"
              >
                <X className="h-4.5 w-4.5" />
              </Button>
            </div>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
            {/* 1. Patient Profile Card */}
            <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-primary/2 to-transparent p-4 space-y-3 shadow-2xs">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary font-bold text-base shadow-xs">
                  {(visit.patient_name || patient.name || "P").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-bold text-foreground truncate">
                      {visit.patient_name || patient.name || "Patient"}
                    </span>
                    <Badge variant="outline" className="font-mono text-[10px] text-primary border-primary/30">
                      Token #{visit.token_no || visit.queue_token}
                    </Badge>
                  </div>

                  <p className="font-mono text-[11px] text-muted-foreground mt-0.5">
                    UHID: <strong className="text-foreground">{visit.uhid || patient.uhid || "—"}</strong>
                  </p>

                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1 flex-wrap">
                    <span className="font-semibold text-foreground">{ageDisplay}</span>
                    <span>•</span>
                    <span className="font-medium text-foreground">{genderDisplay}</span>
                    {patient.blood_group && (
                      <>
                        <span>•</span>
                        <span className="font-semibold text-rose-600 dark:text-rose-400">
                          Blood: {patient.blood_group}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Demographic Details Grid */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-[11px]">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                  <span>DOB:</span>
                  <span className="font-medium text-foreground">{dobDisplay}</span>
                </div>

                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                  <span>Mobile:</span>
                  <span className="font-medium text-foreground font-mono">
                    {visit.patient_mobile || patient.mobile || "—"}
                  </span>
                </div>

                {(patient.guardian_name || patient.guardian_relation) && (
                  <div className="col-span-2 flex items-center gap-1.5 text-muted-foreground">
                    <User className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                    <span>Guardian:</span>
                    <span className="font-medium text-foreground">
                      {patient.guardian_name} {patient.guardian_relation ? `(${patient.guardian_relation})` : ""}
                    </span>
                  </div>
                )}

                {(patient.address || patient.city) && (
                  <div className="col-span-2 flex items-start gap-1.5 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0 mt-0.5" />
                    <span className="leading-tight">
                      {[patient.address, patient.city, patient.district, patient.state, patient.pincode]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </div>
                )}

                {patient.abha_number && (
                  <div className="col-span-2 flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-1 text-emerald-800 dark:text-emerald-300">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span className="font-mono text-[10px]">
                      ABHA: {patient.abha_number} {patient.abha_address ? `(${patient.abha_address})` : ""}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Today's Active Visit Card */}
            <div className="rounded-xl border border-border p-3.5 bg-card space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-border/50">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  Today's Active OPD Visit
                </span>
                <StatusBadge status={visit.status} />
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Department</span>
                  <span className="font-semibold text-foreground">
                    {visit.department_name || visit.department?.name || "General"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Assigned Doctor</span>
                  <span className="font-semibold text-foreground">
                    {visit.doctor_name || visit.doctor?.name || "OPD Cabin"}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground block text-[10px]">Chief Complaint / Reason</span>
                  <span className="font-medium text-foreground">
                    {visit.chief_complaint || visit.visit_reason || "Routine Consultation"}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Pre-Consultation Triage Vitals & Clinical Assessment */}
            <div className="rounded-xl border border-border p-3.5 bg-card space-y-2.5">
              <div className="flex items-center justify-between pb-1.5 border-b border-border/50">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-teal-600" />
                  Pre-Consultation Triage Vitals
                </span>
                <div className="flex items-center gap-1.5">
                  {v ? (
                    <>
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                        ✓ Triaged
                      </Badge>
                      <button
                        type="button"
                        onClick={() => setAuditModalOpen(true)}
                        className="text-[10px] text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-0.5"
                      >
                        <History className="h-2.5 w-2.5" /> Audit
                      </button>
                    </>
                  ) : (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]">
                      ⚠️ Pending Triage
                    </Badge>
                  )}
                </div>
              </div>

              {v ? (
                <>
                  {/* Staff Attribution Banner */}
                  {(v.recordedByUser || v.custom_vitals?.recorded_staff_name) && (
                    <div className="text-[10px] text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-md flex items-center justify-between">
                      <span>
                        Triaged by:{" "}
                        <strong className="text-foreground">
                          {v.recordedByUser?.name || v.custom_vitals?.recorded_staff_name}
                        </strong>{" "}
                        ({v.recordedByUser?.roles?.[0]?.name || v.custom_vitals?.recorded_staff_role || "Staff Nurse"})
                      </span>
                      <span className="font-mono text-[9px]">
                        {v.recorded_at ? new Date(v.recorded_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) : ""}
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <div className="rounded-lg bg-muted/40 p-2">
                      <span className="text-[10px] text-muted-foreground block">BP</span>
                      <span className="font-bold text-foreground">
                        {v.blood_pressure_sys && v.blood_pressure_dia ? `${v.blood_pressure_sys}/${v.blood_pressure_dia}` : "—"}
                      </span>
                      <span className="text-[9px] text-muted-foreground">mmHg</span>
                    </div>

                    <div className="rounded-lg bg-muted/40 p-2">
                      <span className="text-[10px] text-muted-foreground block">Pulse</span>
                      <span className="font-bold text-foreground">{(v as any).pulse_rate || (v as any).heart_rate || "—"}</span>
                      <span className="text-[9px] text-muted-foreground">bpm</span>
                    </div>

                    <div className="rounded-lg bg-muted/40 p-2">
                      <span className="text-[10px] text-muted-foreground block">SpO2</span>
                      <span className="font-bold text-foreground">{(v as any).oxygen_saturation || (v as any).spo2 || "—"}%</span>
                      <span className="text-[9px] text-muted-foreground">oxygen</span>
                    </div>

                    <div className="rounded-lg bg-muted/40 p-2">
                      <span className="text-[10px] text-muted-foreground block">Temp</span>
                      <span className="font-bold text-foreground">{v.temperature ? `${v.temperature}°${v.temperature_unit || "F"}` : "—"}</span>
                      <span className="text-[9px] text-muted-foreground">°F</span>
                    </div>

                    <div className="rounded-lg bg-muted/40 p-2">
                      <span className="text-[10px] text-muted-foreground block">Weight / Ht</span>
                      <span className="font-bold text-foreground">
                        {(v as any).weight || (v as any).weight_kg ? `${(v as any).weight || (v as any).weight_kg}kg` : "—"}
                      </span>
                      <span className="text-[9px] text-muted-foreground">
                        {(v as any).height || (v as any).height_cm ? `${(v as any).height || (v as any).height_cm}cm` : ""}
                      </span>
                    </div>

                    <div className="rounded-lg bg-muted/40 p-2">
                      <span className="text-[10px] text-muted-foreground block">BMI</span>
                      <span className="font-bold text-foreground">{v.bmi || "—"}</span>
                      <span className="text-[9px] text-muted-foreground">kg/m²</span>
                    </div>
                  </div>

                  {/* Pre-Consultation Assessment Details */}
                  {v.custom_vitals && (
                    <div className="space-y-1.5 pt-2 border-t border-border/50 text-[11px]">
                      {v.custom_vitals.symptoms && (
                        <div>
                          <span className="text-[10px] text-muted-foreground font-semibold block">Triaged Symptoms:</span>
                          <span className="font-mono text-foreground">{String(v.custom_vitals.symptoms)}</span>
                        </div>
                      )}

                      {Array.isArray(v.custom_vitals.past_medical_history) && v.custom_vitals.past_medical_history.length > 0 && (
                        <div>
                          <span className="text-[10px] text-muted-foreground font-semibold block">Past Medical:</span>
                          <span className="text-foreground">
                            {v.custom_vitals.past_medical_history.map((m: any) => `${m.disease} (${m.duration})`).join(", ")}
                          </span>
                        </div>
                      )}

                      {Array.isArray(v.custom_vitals.addictions) && v.custom_vitals.addictions.length > 0 && (
                        <div>
                          <span className="text-[10px] text-muted-foreground font-semibold block">Habits / Addictions:</span>
                          <span className="text-amber-700 dark:text-amber-300">
                            {v.custom_vitals.addictions.map((a: any) => `${a.type} - ${a.frequency}`).join(", ")}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-2 text-muted-foreground text-[11px]">
                  <p>Patient vitals have not been measured at the triage station yet.</p>
                  {onRecordVitals && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onRecordVitals(visit)}
                      className="mt-2 text-xs text-teal-700 dark:text-teal-400 border-teal-500/30 hover:bg-teal-500/10"
                    >
                      + Record Pre-Consultation Vitals
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* 4. Previous Visits & Medical History */}
            <div className="rounded-xl border border-border p-3.5 bg-card space-y-2.5">
              <div className="flex items-center justify-between pb-1.5 border-b border-border/50">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5 text-primary" />
                  Past Medical History & Visits
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {pastOpdVisits.length} previous {pastOpdVisits.length === 1 ? "visit" : "visits"}
                </span>
              </div>

              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-4 text-muted-foreground gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span>Loading patient history timeline...</span>
                </div>
              ) : pastOpdVisits.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {pastOpdVisits.map((past: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg border border-border/60 bg-muted/20 space-y-1.5 text-[11px]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">
                          {past.visit_date ? new Date(past.visit_date).toLocaleDateString("en-IN") : "Past Visit"}
                        </span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0 font-normal">
                          {past.department?.name || past.department_name || "OPD"}
                        </Badge>
                      </div>

                      <p className="text-muted-foreground text-[10px]">
                        Consultant: <strong>Dr. {past.doctor?.name || past.doctor_name || "Doctor"}</strong>
                      </p>

                      {past.chief_complaint && (
                        <p className="text-foreground/90">
                          <span className="text-muted-foreground">Complaint: </span>
                          {past.chief_complaint}
                        </p>
                      )}

                      {past.diagnosis && (
                        <p className="text-foreground/90">
                          <span className="text-muted-foreground">Diagnosis: </span>
                          <span className="font-medium text-emerald-700 dark:text-emerald-400">
                            {past.diagnosis}
                          </span>
                        </p>
                      )}

                      {past.notes && (
                        <p className="text-muted-foreground text-[10px] italic">
                          Notes: {past.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground text-[11px]">
                  <p>No previous hospital visits found for this patient.</p>
                  <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                    This is their first registered visit.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sticky Bottom Action Bar with Close Button */}
          <div className="sticky bottom-0 z-20 px-4 py-3 border-t border-border bg-card/95 backdrop-blur-md flex items-center justify-between gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Close
            </Button>

            <div className="flex items-center gap-2 ml-auto">
              {isWaiting && onCallPatient && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCallPatient(visit.id || visit.visit_id || 0)}
                  className="gap-1.5 text-xs text-primary border-primary/30"
                >
                  <PhoneCall className="h-3.5 w-3.5" />
                  Call Patient
                </Button>
              )}

              {onRecordVitals && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRecordVitals(visit)}
                  className="gap-1.5 text-xs"
                >
                  <Activity className="h-3.5 w-3.5 text-teal-600" />
                  Record Vitals
                </Button>
              )}

              {onOpenWorkstation && (
                <Button
                  size="sm"
                  onClick={() => onOpenWorkstation(visit)}
                  className="gap-1.5 text-xs font-semibold bg-primary text-primary-foreground shadow-sm"
                >
                  <Stethoscope className="h-3.5 w-3.5" />
                  Open Workstation
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {v && (
        <VitalAuditModal
          open={auditModalOpen}
          onClose={() => setAuditModalOpen(false)}
          vital={v as any}
          patientName={visit.patient_name || patient.name}
        />
      )}
    </div>,
    document.body
  )
}
