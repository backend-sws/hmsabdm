import React from "react"
import { createPortal } from "react-dom"
import {
  X,
  Calendar,
  Clock,
  Stethoscope,
  Activity,
  Pill,
  FlaskConical,
  FileText,
  Printer,
  Copy,
  AlertTriangle,
  Building,
  CheckCircle2,
  Heart,
  Thermometer,
  Wind,
  Bed,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface PastVisitDetailModalProps {
  open: boolean
  onClose: () => void
  visit: any | null
  prescription?: any | null
  patient?: any | null
  onCopyMedicines?: (medicines: any[]) => void
  onPrintPrescription?: (visit: any, prescription: any) => void
}

export const PastVisitDetailModal: React.FC<PastVisitDetailModalProps> = ({
  open,
  onClose,
  visit,
  prescription,
  patient,
  onCopyMedicines,
  onPrintPrescription,
}) => {
  if (!open || !visit) return null

  // Resolve active prescription object
  const rx = prescription || visit.prescription || null

  // Resolve Doctor & Dept
  const doctorName =
    visit.doctor?.name ||
    visit.doctor_name ||
    rx?.doctor?.name ||
    "Consulting Doctor"
  const doctorSpecialization =
    visit.doctor?.specialization ||
    visit.department?.name ||
    rx?.doctor?.specialization ||
    "General Medicine"

  // Resolve Vitals
  const vital =
    visit.latestVital ||
    visit.latest_vital ||
    (Array.isArray(visit.vitals) && visit.vitals.length > 0 ? visit.vitals[0] : null)

  // Resolve Complaints
  const complaints: string[] = []
  if (Array.isArray(rx?.chief_complaints)) {
    complaints.push(...rx.chief_complaints.filter(Boolean))
  } else if (typeof rx?.chief_complaints === "string" && rx.chief_complaints.trim()) {
    complaints.push(
      ...rx.chief_complaints
        .split(/[;,]/)
        .map((s: string) => s.trim())
        .filter(Boolean)
    )
  } else if (visit.chief_complaint) {
    complaints.push(
      ...visit.chief_complaint
        .split(/[;,]/)
        .map((s: string) => s.trim())
        .filter(Boolean)
    )
  }

  // Resolve Diagnoses (Structured ICD-10 or visit text)
  const diagnosesList: Array<{ code?: string; name: string; is_primary?: boolean }> = []
  if (Array.isArray(rx?.diagnoses) && rx.diagnoses.length > 0) {
    rx.diagnoses.forEach((d: any) => {
      diagnosesList.push({
        code: d.icd_code,
        name: d.diagnosis_name || d.name || "Diagnosis",
        is_primary: Boolean(d.is_primary),
      })
    })
  } else if (visit.diagnosis) {
    diagnosesList.push({
      name: visit.diagnosis,
      is_primary: true,
    })
  }

  // Resolve Medicines (Prescription items)
  const medicinesList: any[] = Array.isArray(rx?.items)
    ? rx.items
    : Array.isArray(rx?.medicines)
    ? rx.medicines
    : Array.isArray(visit.medicines)
    ? visit.medicines
    : []

  // Resolve Investigations
  const investigationsList: any[] = Array.isArray(rx?.investigations)
    ? rx.investigations
    : Array.isArray(visit.investigations)
    ? visit.investigations
    : []

  // Resolve Advice & Disposition
  const clinicalNotes = rx?.clinical_notes || visit.notes || ""
  const generalAdvice = rx?.general_advice || rx?.advice || visit.advice || ""
  const dietAdvice = rx?.diet_advice || ""
  const followUpDate = rx?.follow_up_date || visit.follow_up_date || ""
  const disposition = rx?.disposition || visit.disposition || "home"
  const dispositionNotes = rx?.disposition_notes || visit.disposition_notes || ""
  const admitPriority = rx?.admit_priority || visit.admit_priority || "routine"
  const recommendedWard = rx?.recommended_ward || visit.recommended_ward || ""

  const formattedDate = visit.visit_date
    ? new Date(visit.visit_date).toLocaleDateString("en-IN", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Past Visit"

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl z-10">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border p-4 sm:p-5 bg-muted/30">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold text-base sm:text-lg text-primary flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {formattedDate}
              </span>
              <Badge variant="outline" className="text-xs font-mono font-semibold">
                Token #{visit.queue_token || visit.token_no || visit.id}
              </Badge>
              {visit.opd_number && (
                <Badge variant="secondary" className="text-xs font-mono">
                  {visit.opd_number}
                </Badge>
              )}
              {rx?.prescription_number && (
                <Badge variant="outline" className="text-xs font-mono border-primary/40 text-primary">
                  {rx.prescription_number}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1 font-medium text-foreground">
                <Stethoscope className="h-3.5 w-3.5 text-primary" />
                Dr. {doctorName}
              </span>
              <span>•</span>
              <span>{doctorSpecialization}</span>
              {visit.visit_type && (
                <>
                  <span>•</span>
                  <span className="capitalize">{visit.visit_type} Consultation</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onPrintPrescription && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPrintPrescription(visit, rx)}
                className="gap-1.5 text-xs h-8 font-semibold"
              >
                <Printer className="h-3.5 w-3.5" />
                Print Rx Slip
              </Button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Patient Mini Summary Bar */}
        {(patient || visit.patient) && (
          <div className="px-5 py-2.5 bg-accent/20 border-b border-border/60 flex items-center justify-between text-xs flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span className="font-bold text-foreground">
                {patient?.name || visit.patient?.name || visit.patient_name || "Patient"}
              </span>
              <span className="font-mono text-muted-foreground">
                UHID: {patient?.uhid || visit.patient?.uhid || visit.uhid || "—"}
              </span>
              <span className="text-muted-foreground">
                {(patient?.gender || visit.patient?.gender || visit.gender) === "M"
                  ? "Male"
                  : (patient?.gender || visit.patient?.gender || visit.gender) === "F"
                  ? "Female"
                  : "Other"}{" "}
                • Age: {patient?.age || visit.patient?.age || visit.age || "—"}y
              </span>
            </div>
            {(patient?.mobile || visit.patient?.mobile || visit.patient_mobile) && (
              <span className="font-mono text-muted-foreground">
                📞 +91 {patient?.mobile || visit.patient?.mobile || visit.patient_mobile}
              </span>
            )}
          </div>
        )}

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* 1. VITALS RECORDED AT THIS VISIT */}
          {vital && (
            <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-rose-500" />
                  Recorded Clinical Vitals
                </span>
                {vital.recorded_at && (
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Time: {new Date(vital.recorded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 pt-1">
                {/* BP */}
                <div className="rounded-lg bg-card p-2 border border-border/60 text-center">
                  <span className="text-[10px] text-muted-foreground block">Blood Pressure</span>
                  <span className="text-xs font-bold font-mono text-foreground">
                    {vital.blood_pressure_sys && vital.blood_pressure_dia
                      ? `${vital.blood_pressure_sys}/${vital.blood_pressure_dia}`
                      : "—"}{" "}
                    <span className="text-[9px] font-normal text-muted-foreground">mmHg</span>
                  </span>
                </div>

                {/* Pulse */}
                <div className="rounded-lg bg-card p-2 border border-border/60 text-center">
                  <span className="text-[10px] text-muted-foreground block flex items-center justify-center gap-1">
                    <Heart className="h-2.5 w-2.5 text-rose-500" /> Pulse
                  </span>
                  <span className="text-xs font-bold font-mono text-foreground">
                    {vital.pulse || "—"}{" "}
                    <span className="text-[9px] font-normal text-muted-foreground">bpm</span>
                  </span>
                </div>

                {/* SpO2 */}
                <div className="rounded-lg bg-card p-2 border border-border/60 text-center">
                  <span className="text-[10px] text-muted-foreground block flex items-center justify-center gap-1">
                    <Wind className="h-2.5 w-2.5 text-blue-500" /> SpO2
                  </span>
                  <span className="text-xs font-bold font-mono text-foreground">
                    {vital.spo2 ? `${vital.spo2}%` : "—"}
                  </span>
                </div>

                {/* Temp */}
                <div className="rounded-lg bg-card p-2 border border-border/60 text-center">
                  <span className="text-[10px] text-muted-foreground block flex items-center justify-center gap-1">
                    <Thermometer className="h-2.5 w-2.5 text-amber-500" /> Temp
                  </span>
                  <span className="text-xs font-bold font-mono text-foreground">
                    {vital.temperature ? `${vital.temperature}°F` : "—"}
                  </span>
                </div>

                {/* Weight */}
                <div className="rounded-lg bg-card p-2 border border-border/60 text-center">
                  <span className="text-[10px] text-muted-foreground block">Weight</span>
                  <span className="text-xs font-bold font-mono text-foreground">
                    {vital.weight ? `${vital.weight} kg` : "—"}
                  </span>
                </div>

                {/* BMI */}
                <div className="rounded-lg bg-card p-2 border border-border/60 text-center">
                  <span className="text-[10px] text-muted-foreground block">BMI</span>
                  <span className="text-xs font-bold font-mono text-foreground">
                    {vital.bmi || "—"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 2. CHIEF COMPLAINTS & CLINICAL NOTES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Chief Complaints */}
            <div className="rounded-xl border border-border/80 bg-card p-4 space-y-2">
              <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-primary" />
                Chief Complaints & Symptoms
              </span>
              {complaints.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No specific complaint recorded.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {complaints.map((c, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="text-xs font-semibold px-2 py-0.5 bg-primary/10 text-primary border-primary/20"
                    >
                      {c}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Doctor Clinical Notes / Treatment Notes */}
            <div className="rounded-xl border border-border/80 bg-card p-4 space-y-2">
              <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                <Stethoscope className="h-3.5 w-3.5 text-primary" />
                Clinical Examination & Treatment Notes
              </span>
              {clinicalNotes ? (
                <p className="text-xs text-foreground whitespace-pre-line leading-relaxed font-sans bg-muted/20 p-2.5 rounded-lg border border-border/50">
                  {clinicalNotes}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground italic">No examination notes logged.</p>
              )}
            </div>
          </div>

          {/* 3. DIAGNOSIS (ICD-10 OR CLINICAL) */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Doctor Diagnosis & WHO ICD-10 Classification
              </span>
              <Badge variant="outline" className="text-[10px] font-mono border-emerald-300 text-emerald-700 dark:text-emerald-300">
                {diagnosesList.length} Diagnosis Recorded
              </Badge>
            </div>

            {diagnosesList.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No formal diagnosis entered for this visit.</p>
            ) : (
              <div className="space-y-1.5 pt-1">
                {diagnosesList.map((d, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-card border border-emerald-500/20 text-xs shadow-2xs"
                  >
                    <div className="flex items-center gap-2">
                      {d.code && (
                        <span className="font-mono font-bold text-[11px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                          {d.code}
                        </span>
                      )}
                      <span className="font-semibold text-foreground">{d.name}</span>
                    </div>
                    {d.is_primary && (
                      <Badge className="bg-emerald-600 text-white text-[9px] uppercase font-bold">
                        Primary
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. PRESCRIBED MEDICATIONS TABLE */}
          <div className="rounded-xl border border-border/80 bg-card p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <Pill className="h-4 w-4 text-primary" />
                <span className="font-bold text-xs text-foreground">
                  Prescribed Medications ({medicinesList.length})
                </span>
              </div>
              {onCopyMedicines && medicinesList.length > 0 && (
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => onCopyMedicines(medicinesList)}
                  className="gap-1.5 text-xs h-7 text-primary border-primary/30 hover:bg-primary/10 font-semibold"
                >
                  <Copy className="h-3 w-3" />
                  Copy Medicines to Current Rx
                </Button>
              )}
            </div>

            {medicinesList.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-3 text-center">
                No medications were prescribed in this consultation.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase">
                    <tr>
                      <th className="p-2.5 w-8 text-center">#</th>
                      <th className="p-2.5">Medicine Name</th>
                      <th className="p-2.5">Dosage</th>
                      <th className="p-2.5">Frequency</th>
                      <th className="p-2.5">Duration</th>
                      <th className="p-2.5">Route</th>
                      <th className="p-2.5">Timing & Instructions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-sans">
                    {medicinesList.map((m: any, idx: number) => (
                      <tr key={idx} className="hover:bg-muted/20">
                        <td className="p-2.5 text-center text-muted-foreground font-mono">{idx + 1}</td>
                        <td className="p-2.5">
                          <span className="font-bold text-foreground">
                            {m.medicine_name || m.name || "Medicine"}
                          </span>
                        </td>
                        <td className="p-2.5 font-medium">{m.dosage || "1 tab"}</td>
                        <td className="p-2.5">
                          <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-primary/10 text-primary">
                            {m.frequency || "BD"}
                          </span>
                        </td>
                        <td className="p-2.5 font-medium">{m.duration || "5 days"}</td>
                        <td className="p-2.5 text-muted-foreground">{m.route || "Oral"}</td>
                        <td className="p-2.5 text-muted-foreground italic">
                          {m.instructions || "After meals"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 5. DIAGNOSTIC INVESTIGATIONS ORDERED */}
          {investigationsList.length > 0 && (
            <div className="rounded-xl border border-border/80 bg-card p-4 space-y-2.5">
              <div className="flex items-center justify-between pb-1 border-b border-border">
                <div className="flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-primary" />
                  <span className="font-bold text-xs text-foreground">
                    Advised Diagnostic Investigations ({investigationsList.length})
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                {investigationsList.map((inv: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg border border-border bg-background flex flex-col justify-between text-xs space-y-1.5 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-semibold text-foreground leading-tight">
                        {inv.test_name || inv.name}
                      </span>
                      {inv.urgency && inv.urgency.toLowerCase() !== "routine" && (
                        <span className="text-[9px] font-bold uppercase text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-1 py-0.2 rounded border border-rose-300">
                          {inv.urgency}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono pt-1 border-t border-border/40">
                      <span>{inv.category || "Pathology"}</span>
                      {inv.status && (
                        <span className="capitalize font-semibold text-primary">
                          {inv.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. ADVICE, DIET, FOLLOW-UP & DISPOSITION */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Advice & Follow-up */}
            <div className="rounded-xl border border-border/80 bg-card p-4 space-y-2">
              <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" />
                Doctor Advice & Next Follow-Up
              </span>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                {generalAdvice && (
                  <p className="text-foreground">
                    <strong className="text-muted-foreground block text-[10px] uppercase">General Advice:</strong>
                    {generalAdvice}
                  </p>
                )}
                {dietAdvice && (
                  <p className="text-foreground">
                    <strong className="text-muted-foreground block text-[10px] uppercase">Dietary Instructions:</strong>
                    {dietAdvice}
                  </p>
                )}
                {followUpDate ? (
                  <div className="pt-1 flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-foreground">Next Follow-Up Revisit:</span>
                    <Badge variant="outline" className="font-mono text-primary font-bold">
                      {new Date(followUpDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </Badge>
                  </div>
                ) : (
                  <p className="italic text-[11px]">No formal follow-up date specified.</p>
                )}
              </div>
            </div>

            {/* Patient Disposition */}
            <div className="rounded-xl border border-border/80 bg-card p-4 space-y-2">
              <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                <Bed className="h-3.5 w-3.5 text-primary" />
                Patient Disposition Decision
              </span>
              <div className="space-y-2 text-xs">
                {disposition === "admit_ipd" ? (
                  <div className="p-2.5 rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 text-rose-600" />
                        Advised IPD Inpatient Admission
                      </span>
                      <span className="uppercase text-[9px] px-1.5 py-0.5 rounded bg-rose-600 text-white font-mono">
                        {admitPriority}
                      </span>
                    </div>
                    {recommendedWard && (
                      <p className="text-[11px]">
                        <strong>Recommended Ward:</strong> {recommendedWard}
                      </p>
                    )}
                    {dispositionNotes && (
                      <p className="italic text-[11px]">"{dispositionNotes}"</p>
                    )}
                  </div>
                ) : disposition === "day_care" ? (
                  <div className="p-2.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 space-y-1">
                    <span className="font-bold flex items-center gap-1.5">
                      <Building className="h-4 w-4 text-amber-600" />
                      Day Care Short-Stay Observation Advised
                    </span>
                    {dispositionNotes && (
                      <p className="italic text-[11px]">"{dispositionNotes}"</p>
                    )}
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200">
                    <span className="font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Routine Home Discharge (Routine Prescription)
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3.5 bg-muted/30 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {onCopyMedicines && medicinesList.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCopyMedicines(medicinesList)}
                className="gap-1.5 text-xs font-semibold h-8"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy {medicinesList.length} Medicines to Active Rx
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {onPrintPrescription && (
              <Button
                variant="default"
                size="sm"
                onClick={() => onPrintPrescription(visit, rx)}
                className="gap-1.5 text-xs font-semibold h-8"
              >
                <Printer className="h-3.5 w-3.5" />
                Print Past Rx Slip
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs h-8"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
