import React, { useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { otService } from "@/services/otService"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Printer, X, Loader2, ShieldCheck, CheckCircle2, XCircle } from "lucide-react"

interface PrintOtChecklistModalProps {
  isOpen: boolean
  onClose: () => void
  scheduleId: number
}

export const PrintOtChecklistModal: React.FC<PrintOtChecklistModalProps> = ({
  isOpen,
  onClose,
  scheduleId,
}) => {
  const printRef = useRef<HTMLDivElement>(null)

  const { data: printData, isLoading } = useQuery({
    queryKey: ["ot", "print", scheduleId],
    queryFn: () => otService.getPrintData(scheduleId),
    enabled: isOpen && !!scheduleId,
  })

  const handlePrint = () => {
    window.print()
  }

  const hospital = printData?.hospital
  const schedule = printData?.schedule
  const checklist = schedule?.checklist_record
  const patient = schedule?.patient

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[95vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
        {/* Modal Top Control Bar (Hidden during printing) */}
        <DialogHeader className="p-4 border-b border-border bg-muted/40 print:hidden flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary" />
            <DialogTitle className="text-base font-bold">
              Printable WHO Surgical Safety Checklist & OT Dossier
            </DialogTitle>
            <Badge className="bg-purple-600 text-white text-xs">NABH Accredited</Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handlePrint} className="gap-1.5 text-xs bg-primary font-semibold">
              <Printer className="h-4 w-4" /> Print / Save as PDF
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Printable Paper Canvas */}
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-muted-foreground gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm">Loading surgical safety dossier...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-zinc-100 dark:bg-zinc-900/50 print:p-0 print:bg-white print:overflow-visible">
            <div
              ref={printRef}
              className="max-w-[820px] mx-auto bg-white dark:bg-zinc-950 print:bg-white text-zinc-900 dark:text-zinc-100 print:text-black p-8 sm:p-10 rounded-xl shadow-md border border-zinc-200 dark:border-zinc-800 print:border-none print:shadow-none print:p-0 print:max-w-none text-xs space-y-6"
            >
              {/* ── HOSPITAL LETTERHEAD ── */}
              <div className="border-b-2 border-zinc-900 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-blue-900 dark:text-blue-400 print:text-black uppercase">
                      {hospital?.name || "HOSPITAL & SURGICAL CENTRE"}
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400 print:text-zinc-700 text-[11px] leading-tight">
                      {hospital?.address}
                      {hospital?.city ? `, ${hospital.city}` : ""}
                    </p>
                    <p className="text-zinc-600 dark:text-zinc-400 print:text-zinc-700 text-[11px]">
                      {hospital?.phone ? `Phone: ${hospital.phone}` : ""}
                      {hospital?.email ? ` • Email: ${hospital.email}` : ""}
                    </p>
                  </div>

                  <div className="text-right space-y-1 flex flex-col items-end">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 print:bg-zinc-100 print:text-black font-semibold text-[10px] border border-blue-200 print:border-zinc-400">
                      <ShieldCheck className="h-3.5 w-3.5" /> NABH SURGICAL SAFETY PROTOCOL
                    </div>
                    {hospital?.abdm_hip_id && (
                      <span className="text-[10px] font-mono text-zinc-500">
                        ABDM HIP ID: {hospital.abdm_hip_id}
                      </span>
                    )}
                  </div>
                </div>

                {/* Banner Title */}
                <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                  <div className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-100 print:text-black">
                    WHO SURGICAL SAFETY CHECKLIST & OPERATIVE RECORD
                  </div>
                  <div className="font-mono text-xs font-bold text-zinc-700 dark:text-zinc-300 print:text-black">
                    Booking #: {schedule?.booking_number}
                  </div>
                </div>
              </div>

              {/* ── PATIENT & SURGERY DEMOGRAPHICS ── */}
              <div className="border border-zinc-300 dark:border-zinc-700 print:border-black rounded-lg p-3 bg-zinc-50/50 dark:bg-zinc-900/30 print:bg-transparent">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-2 gap-x-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block">Patient Name</span>
                    <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 print:text-black">
                      {patient?.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block">UHID</span>
                    <span className="font-mono font-bold text-xs">{patient?.uhid}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block">Age / Gender</span>
                    <span className="font-semibold">
                      {patient?.age || "-"} Yrs / {patient?.gender === "M" ? "Male" : patient?.gender === "F" ? "Female" : patient?.gender}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block">Blood Group</span>
                    <span className="font-semibold">{patient?.blood_group || "-"}</span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block">Operation Theatre</span>
                    <span className="font-bold text-purple-700 dark:text-purple-400 print:text-black">
                      {schedule?.operation_theatre?.name || "Main OT"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block">Surgery Date</span>
                    <span className="font-semibold">
                      {schedule?.surgery_date ? new Date(schedule.surgery_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block">Scheduled Time</span>
                    <span className="font-semibold">{schedule?.scheduled_start_time || "09:00"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block">Anesthesia Type</span>
                    <span className="font-bold uppercase">{schedule?.anesthesia_type || "GA"}</span>
                  </div>

                  <div className="col-span-2">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block">Procedure Performed</span>
                    <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 print:text-black">
                      {schedule?.procedure_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block">Priority</span>
                    <span className="font-bold uppercase text-blue-700 dark:text-blue-400 print:text-black">
                      {schedule?.priority || "Elective"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block">Status</span>
                    <span className="font-bold uppercase text-emerald-700 dark:text-emerald-400 print:text-black">
                      {schedule?.status || "Completed"}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── SURGICAL TEAM ── */}
              <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/20">
                <div className="text-[10px] uppercase font-bold text-zinc-500 mb-2">Surgical Team</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Primary Surgeon</span>
                    <span className="font-bold">Dr. {schedule?.primary_surgeon?.name || "-"}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Assistant Surgeon</span>
                    <span className="font-semibold">Dr. {schedule?.assistant_surgeon?.name || "None"}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Anesthesiologist</span>
                    <span className="font-bold">Dr. {schedule?.anesthetist?.name || "-"}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Scrub Nurse</span>
                    <span className="font-semibold">{schedule?.scrub_nurse_name || "Duty Nurse"}</span>
                  </div>
                </div>
              </div>

              {/* ── 3-COLUMN WHO SURGICAL SAFETY CHECKLIST ── */}
              <div className="space-y-2">
                <div className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-100 print:text-black border-b-2 border-zinc-900 pb-1 flex justify-between items-center">
                  <span>WHO SURGICAL SAFETY CHECKLIST VERIFICATION AUDIT</span>
                  <span className="text-[10px] font-normal text-zinc-600">World Health Organization Guidelines</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 print:grid-cols-3">
                  {/* BOX 1: SIGN IN */}
                  <div className="border border-zinc-300 dark:border-zinc-700 print:border-black rounded-lg p-3 space-y-2.5 bg-blue-50/20 dark:bg-blue-950/10">
                    <div className="border-b border-zinc-200 dark:border-zinc-800 pb-1">
                      <div className="text-[11px] font-black uppercase text-blue-900 dark:text-blue-300 print:text-black flex items-center justify-between">
                        <span>1. SIGN IN</span>
                        {checklist?.sign_in_completed ? (
                          <span className="text-emerald-700 text-[10px] font-bold">VERIFIED ✓</span>
                        ) : (
                          <span className="text-zinc-400 text-[10px]">Pending</span>
                        )}
                      </div>
                      <span className="text-[9px] text-zinc-500 block">Before Induction of Anesthesia</span>
                    </div>

                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        {checklist?.sign_in_checks?.patient_identity_confirmed ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                        )}
                        <span>Patient identity, site, procedure & consent confirmed</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {checklist?.sign_in_checks?.site_marked ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                        )}
                        <span>Operative site marked</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {checklist?.sign_in_checks?.anesthesia_safety_check ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                        )}
                        <span>Anesthesia machine & medication check complete</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {checklist?.sign_in_checks?.pulse_oximeter_functioning ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                        )}
                        <span>Pulse oximeter placed & functioning</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold">Allergy:</span>
                        <span>{checklist?.sign_in_checks?.known_allergy ? checklist.sign_in_checks.allergy_details || "Yes (Documented)" : "No known allergy"}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold">Airway / Aspiration Risk:</span>
                        <span>{checklist?.sign_in_checks?.difficult_airway_risk ? "Yes (Equipment ready)" : "No"}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold">Blood Loss Risk (&gt;500ml):</span>
                        <span>{checklist?.sign_in_checks?.blood_loss_risk_over_500ml ? "Yes (Access ready)" : "No"}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 text-[9px] text-zinc-500">
                      Verified by: {checklist?.sign_in_nurse_name || "Nurse"} & {checklist?.sign_in_anesthetist_name || "Anesthetist"}
                    </div>
                  </div>

                  {/* BOX 2: TIME OUT */}
                  <div className="border border-zinc-300 dark:border-zinc-700 print:border-black rounded-lg p-3 space-y-2.5 bg-amber-50/20 dark:bg-amber-950/10">
                    <div className="border-b border-zinc-200 dark:border-zinc-800 pb-1">
                      <div className="text-[11px] font-black uppercase text-amber-900 dark:text-amber-300 print:text-black flex items-center justify-between">
                        <span>2. TIME OUT</span>
                        {checklist?.time_out_completed ? (
                          <span className="text-emerald-700 text-[10px] font-bold">VERIFIED ✓</span>
                        ) : (
                          <span className="text-zinc-400 text-[10px]">Pending</span>
                        )}
                      </div>
                      <span className="text-[9px] text-zinc-500 block">Before Skin Incision</span>
                    </div>

                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        {checklist?.time_out_checks?.team_members_introduced ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                        )}
                        <span>Team members introduced by name & role</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {checklist?.time_out_checks?.surgeon_anesthetist_nurse_confirm_patient_site ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                        )}
                        <span>Surgeon, Anesthetist & Nurse confirm patient, site & procedure</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {checklist?.time_out_checks?.antibiotic_prophylaxis_given_60min ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                        )}
                        <span>
                          Antibiotic prophylaxis given &lt; 60m ({checklist?.time_out_checks?.antibiotic_name || "Given"})
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {checklist?.time_out_checks?.anticipated_critical_events_reviewed ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                        )}
                        <span>Anticipated critical steps & blood loss reviewed</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {checklist?.time_out_checks?.sterility_indicators_confirmed ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                        )}
                        <span>Sterility indicators & equipment confirmed</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {checklist?.time_out_checks?.essential_imaging_displayed ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                        )}
                        <span>Essential imaging displayed</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 text-[9px] text-zinc-500">
                      Authorized by: Entire Surgical Team
                    </div>
                  </div>

                  {/* BOX 3: SIGN OUT */}
                  <div className="border border-zinc-300 dark:border-zinc-700 print:border-black rounded-lg p-3 space-y-2.5 bg-purple-50/20 dark:bg-purple-950/10">
                    <div className="border-b border-zinc-200 dark:border-zinc-800 pb-1">
                      <div className="text-[11px] font-black uppercase text-purple-900 dark:text-purple-300 print:text-black flex items-center justify-between">
                        <span>3. SIGN OUT</span>
                        {checklist?.sign_out_completed ? (
                          <span className="text-emerald-700 text-[10px] font-bold">VERIFIED ✓</span>
                        ) : (
                          <span className="text-zinc-400 text-[10px]">Pending</span>
                        )}
                      </div>
                      <span className="text-[9px] text-zinc-500 block">Before Leaving Operating Room</span>
                    </div>

                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        {checklist?.sign_out_checks?.procedure_name_recorded ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                        )}
                        <span>Name of procedure recorded</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {checklist?.sign_out_checks?.instrument_swab_needle_count_correct ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                        )}
                        <span>Instrument, sponge & needle count correct</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {checklist?.sign_out_checks?.specimen_labelled_correctly ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                        )}
                        <span>Specimen labelled (patient name, UHID, tissue)</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {checklist?.sign_out_checks?.equipment_problems_addressed ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                        )}
                        <span>Equipment problems / malfunctions addressed</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {checklist?.sign_out_checks?.recovery_concerns_reviewed ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                        )}
                        <span>Key concerns for PACU recovery & ward care reviewed</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 text-[9px] text-zinc-500">
                      Verified by: {checklist?.sign_out_nurse_name || "Scrub Nurse"}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── OPERATIVE & RECOVERY NOTES ── */}
              {(schedule?.surgeon_notes || schedule?.recovery_notes) && (
                <div className="space-y-3 break-inside-avoid">
                  {schedule?.surgeon_notes && (
                    <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/30">
                      <span className="font-bold block text-[10px] uppercase text-zinc-500">Surgeon Operative Findings & Notes</span>
                      <p className="text-zinc-800 dark:text-zinc-200 print:text-black whitespace-pre-line leading-relaxed">
                        {schedule.surgeon_notes}
                      </p>
                    </div>
                  )}

                  {schedule?.recovery_notes && (
                    <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/30">
                      <span className="font-bold block text-[10px] uppercase text-zinc-500">PACU / Recovery Room Handover Notes</span>
                      <p className="text-zinc-800 dark:text-zinc-200 print:text-black whitespace-pre-line leading-relaxed">
                        {schedule.recovery_notes}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ── SIGN-OFF & VERIFICATION ── */}
              <div className="pt-8 border-t border-zinc-300 dark:border-zinc-700 print:border-black grid grid-cols-3 gap-6 text-center break-inside-avoid">
                <div className="space-y-12">
                  <div className="border-t border-zinc-400 dark:border-zinc-600 print:border-black pt-1.5">
                    <p className="font-bold text-[11px] text-zinc-900 dark:text-zinc-100 print:text-black">
                      {schedule?.scrub_nurse_name || "Scrub Nurse"}
                    </p>
                    <p className="text-[10px] text-zinc-500">OT In-Charge / Scrub Nurse</p>
                  </div>
                </div>

                <div className="space-y-12">
                  <div className="border-t border-zinc-400 dark:border-zinc-600 print:border-black pt-1.5">
                    <p className="font-bold text-[11px] text-zinc-900 dark:text-zinc-100 print:text-black">
                      Dr. {schedule?.anesthetist?.name || "Consultant Anesthesiologist"}
                    </p>
                    <p className="text-[10px] text-zinc-500">Consultant Anesthesiologist</p>
                  </div>
                </div>

                <div className="space-y-12">
                  <div className="border-t border-zinc-400 dark:border-zinc-600 print:border-black pt-1.5">
                    <p className="font-bold text-[11px] text-zinc-900 dark:text-zinc-100 print:text-black">
                      Dr. {schedule?.primary_surgeon?.name || "Primary Surgeon"}
                    </p>
                    <p className="text-[10px] text-zinc-500">Operating Consultant Surgeon</p>
                  </div>
                </div>
              </div>

              {/* Footer Note */}
              <div className="text-[9px] text-zinc-400 text-center print:text-zinc-600 pt-2 border-t border-zinc-100 dark:border-zinc-900">
                Official Clinical Surgical Record adhering to WHO Guidelines for Safe Surgery & NABH Inpatient Accreditation Standards.
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
export default PrintOtChecklistModal
