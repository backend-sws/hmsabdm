import React from "react"
import { createPortal } from "react-dom"
import { useQuery } from "@tanstack/react-query"
import {
  Printer,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { settingsService } from "@/services/settingsService"
import { opdService } from "@/services/opdService"
import { formatPatientAge, formatPatientGender } from "@/utils/patientUtils"
import {
  DEFAULT_PRESCRIPTION_CONFIG,
  type PrescriptionPrintConfig,
} from "@/components/settings/PrescriptionPrintSettingsCard"
import type { OpdVisit, VitalRecord, PrescriptionItem, DiagnosisResult } from "@/types/opd"

interface PrescriptionPrintModalProps {
  open: boolean
  onClose: () => void
  visit: OpdVisit | null
  vital?: VitalRecord | null
  prescriptionData?: {
    chief_complaints?: string[] | string
    clinical_notes?: string
    diagnosis_codes?: DiagnosisResult[]
    medicines?: PrescriptionItem[]
    investigations?: Array<{ name?: string; test_name?: string; category?: string; urgency?: string }>
    advice?: string
    follow_up_date?: string
    doctor_name?: string
    disposition?: "home" | "day_care" | "admit_ipd" | string
    disposition_notes?: string
    admit_priority?: string
    recommended_ward?: string
  }
}

export const PrescriptionPrintModal: React.FC<PrescriptionPrintModalProps> = ({
  open,
  onClose,
  visit,
  vital,
  prescriptionData,
}) => {
  // Query Hospital Print Settings for Prescription
  const { data: savedSettings } = useQuery({
    queryKey: ["hospital", "settings", "print_prescription"],
    queryFn: () => settingsService.getSettings("print_prescription"),
    enabled: open,
    staleTime: 30000,
  })

  const visitId = Number(visit?.id || (visit as any)?.visit_id || 0)

  // Query Visit Prescription if not provided in props (e.g. from Doctor Queue "Print Rx")
  const { data: fetchedRxData } = useQuery({
    queryKey: ["opd", "visit-prescription", visitId],
    queryFn: () => opdService.getVisitPrescription(visitId),
    enabled: open && Boolean(visitId > 0) && !prescriptionData,
    staleTime: 5000,
  })
  const fetchedRx = fetchedRxData as any

  if (!open || !visit) return null

  const config: PrescriptionPrintConfig = {
    ...DEFAULT_PRESCRIPTION_CONFIG,
    ...((savedSettings?.value || savedSettings) as Partial<PrescriptionPrintConfig>),
    med_cols: {
      ...DEFAULT_PRESCRIPTION_CONFIG.med_cols,
      ...((savedSettings?.value || savedSettings)?.med_cols || {}),
    },
  }

  const patient = visit.patient || ({} as any)
  const patientName = visit.patient_name || patient.name || "Patient"
  const uhid = visit.uhid || patient.uhid || "—"
  const token = visit.token_no || visit.queue_token || visit.opd_number || "—"
  const doctorName =
    prescriptionData?.doctor_name ||
    fetchedRx?.doctor?.name ||
    visit.doctor_name ||
    visit.doctor?.name ||
    "Consulting Doctor"
  const departmentName =
    fetchedRx?.doctor?.department?.name ||
    visit.department_name ||
    visit.department?.name ||
    "General Medicine"
  const visitDate = visit.created_at || (visit as any).visit_date ? new Date(visit.created_at || (visit as any).visit_date || "").toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }) : new Date().toLocaleDateString("en-IN")

  const currentVital = vital || (visit as any)?.latestVital || (visit as any)?.latest_vital
  const customVitals = currentVital?.custom_vitals || {}

  // Merge Prescription Data with fallbacks
  const complaints =
    prescriptionData?.chief_complaints ||
    fetchedRx?.chief_complaints ||
    customVitals.symptoms ||
    visit.chief_complaint ||
    visit.visit_reason ||
    ""

  const clinicalNotes =
    prescriptionData?.clinical_notes ||
    fetchedRx?.clinical_notes ||
    visit.notes ||
    ""

  const diagnoses: DiagnosisResult[] =
    prescriptionData?.diagnosis_codes ||
    (Array.isArray(fetchedRx?.diagnoses)
      ? fetchedRx.diagnoses.map((d: any) => ({
          code: d.icd_code || d.code,
          name: d.diagnosis_name || d.name,
        }))
      : null) ||
    (visit as any)?.diagnosis_codes ||
    (visit as any)?.diagnoses ||
    []

  const medicines: PrescriptionItem[] =
    prescriptionData?.medicines ||
    (Array.isArray(fetchedRx?.items)
      ? fetchedRx.items.map((item: any) => ({
          medicine_name: item.medicine_name,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration_days ? `${item.duration_days} days` : item.duration,
          instructions: item.instructions || item.timing,
        }))
      : null) ||
    (visit as any)?.medicines ||
    (visit as any)?.prescription?.items ||
    []

  const rawInvestigations =
    prescriptionData?.investigations ||
    (Array.isArray(fetchedRx?.investigations) ? fetchedRx.investigations : null) ||
    (visit as any)?.investigations ||
    []

  const investigations: Array<{ name: string; category: string; urgency: string }> = rawInvestigations.map((inv: any) => ({
    name: inv.test_name || inv.name || "",
    category: inv.category || "Pathology",
    urgency: inv.urgency || "Routine",
  })).filter((inv: { name: string }) => Boolean(inv.name))

  const disposition = prescriptionData?.disposition || fetchedRx?.disposition || (visit as any)?.disposition || "home"
  const dispositionNotes = prescriptionData?.disposition_notes || fetchedRx?.disposition_notes || (visit as any)?.disposition_notes || ""
  const admitPriority = prescriptionData?.admit_priority || fetchedRx?.admit_priority || (visit as any)?.admit_priority || "routine"
  const recommendedWard = prescriptionData?.recommended_ward || fetchedRx?.recommended_ward || (visit as any)?.recommended_ward || ""

  const advice =
    prescriptionData?.advice ||
    fetchedRx?.diet_advice ||
    fetchedRx?.general_advice ||
    (visit as any)?.advice ||
    ""
  const followUpDate =
    prescriptionData?.follow_up_date ||
    fetchedRx?.follow_up_date ||
    (visit as any)?.follow_up_date ||
    ""

  const handlePrint = () => {
    window.print()
  }

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      {/* ────────────────────────────────────────────────────────────────
          PRINT MEDIA SPECIFIC CSS RULES
         ──────────────────────────────────────────────────────────────── */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #rx-print-modal-container, #rx-print-modal-container * {
            visibility: visible !important;
          }
          #rx-print-modal-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            margin: ${config.header_mode === "preprinted" ? `${config.top_margin_mm}mm` : "8mm"} 10mm ${config.bottom_margin_mm}mm 10mm;
          }
        }
      `}</style>

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-4xl rounded-2xl border border-border bg-background shadow-2xl z-10 flex flex-col max-h-[95vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Toolbar (Screen only) */}
        <div className="no-print flex items-center justify-between border-b border-border px-5 py-3.5 bg-muted/30 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Printer className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Official OPD Prescription (Rx Slip)
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Configured via Hospital Print Settings • Patient: <strong>{patientName}</strong> (Token #{token})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handlePrint}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 text-xs shadow-xs"
            >
              <Printer className="h-4 w-4" /> Print Rx (Ctrl+P)
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ────────────────────────────────────────────────────────────
            PRINTABLE PRESCRIPTION CANVAS
           ──────────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100 dark:bg-slate-900/50">
          <div
            id="rx-print-modal-container"
            className="mx-auto max-w-3xl bg-white dark:bg-slate-950 text-foreground p-6 sm:p-8 rounded-xl shadow-lg border border-border/80 font-sans space-y-4"
          >
            {/* 1. HEADER SECTION */}
            {config.header_mode === "preprinted" ? (
              <div
                style={{ height: `${config.top_margin_mm * 3.7}px` }}
                className="no-print border-b border-dashed border-amber-500/40 flex items-center justify-center text-amber-700 dark:text-amber-400 text-xs italic"
              >
                [Pre-Printed Stationery Pad Space — Header suppressed for {config.top_margin_mm}mm top pad clearance]
              </div>
            ) : config.header_mode === "custom_banner" && config.banner_image_url ? (
              <div className="border-b pb-3">
                <img src={config.banner_image_url} alt="Hospital Banner" className="w-full object-contain max-h-28" />
              </div>
            ) : (
              <div className="border-b pb-3.5 flex items-start justify-between gap-4">
                {config.logo_url && config.logo_position === "left" && (
                  <img
                    src={config.logo_url}
                    alt="Logo"
                    style={{ height: `${config.logo_size_px}px` }}
                    className="object-contain"
                  />
                )}
                <div className={`flex-1 ${config.logo_position === "center" ? "text-center" : "text-left"}`}>
                  <h1 className="text-lg font-black tracking-tight text-primary uppercase">
                    {config.hospital_name}
                  </h1>
                  {config.hospital_tagline && (
                    <p className="text-[11px] font-semibold text-muted-foreground">{config.hospital_tagline}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {config.address} • Ph: {config.phone}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {config.reg_no} {config.abdm_hip_id ? `• ABDM HIP: ${config.abdm_hip_id}` : ""}
                  </p>
                </div>
                {config.logo_url && config.logo_position === "right" && (
                  <img
                    src={config.logo_url}
                    alt="Logo"
                    style={{ height: `${config.logo_size_px}px` }}
                    className="object-contain"
                  />
                )}
              </div>
            )}

            {/* 2. PATIENT DEMOGRAPHICS & APPOINTMENT BANNER */}
            {config.show_patient_demographics && (
              <div className="rounded-lg bg-muted/30 border border-border/80 p-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Patient Name</span>
                  <strong className="text-foreground text-sm font-bold">{patientName}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Age / Gender</span>
                  <span className="font-medium">
                    {formatPatientAge(visit.age || patient.age, visit.dob || patient.dob)} /{" "}
                    {formatPatientGender(visit.gender || patient.gender)}
                    {patient.blood_group ? ` (${patient.blood_group})` : ""}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">UHID & Token</span>
                  <span className="font-mono font-bold text-primary">
                    {uhid} • Token #{token}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Consultant & Dept</span>
                  <span className="font-bold text-foreground">
                    Dr. {doctorName} <span className="text-[10px] text-muted-foreground font-normal">({departmentName})</span>
                  </span>
                </div>
              </div>
            )}

            {/* Date line & Mobile */}
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5 border-b border-border/50 pb-2">
              <span>Visit Date: <strong className="text-foreground font-mono">{visitDate}</strong></span>
              {patient.phone && <span>Mobile: <strong className="text-foreground font-mono">{patient.phone}</strong></span>}
              {visit.opd_number && <span>OPD No: <strong className="text-foreground font-mono">{visit.opd_number}</strong></span>}
            </div>

            {/* 3. VITALS BASELINE STRIP */}
            {config.show_vitals_summary && currentVital && (
              <div className="rounded-lg border border-border/80 bg-muted/15 p-2 flex flex-wrap items-center justify-between text-xs font-mono">
                {currentVital.blood_pressure_sys && currentVital.blood_pressure_dia && (
                  <span>
                    <strong className="font-sans text-muted-foreground">BP:</strong> {currentVital.blood_pressure_sys}/{currentVital.blood_pressure_dia} mmHg
                  </span>
                )}
                {currentVital.pulse_rate && (
                  <span>
                    <strong className="font-sans text-muted-foreground">Pulse:</strong> {currentVital.pulse_rate} bpm
                  </span>
                )}
                {currentVital.temperature && (
                  <span>
                    <strong className="font-sans text-muted-foreground">Temp:</strong> {currentVital.temperature}°{currentVital.temperature_unit || "F"}
                  </span>
                )}
                {currentVital.oxygen_saturation && (
                  <span>
                    <strong className="font-sans text-muted-foreground">SpO2:</strong> {currentVital.oxygen_saturation}%
                  </span>
                )}
                {currentVital.respiratory_rate && (
                  <span>
                    <strong className="font-sans text-muted-foreground">RR:</strong> {currentVital.respiratory_rate} bpm
                  </span>
                )}
                {currentVital.weight && (
                  <span>
                    <strong className="font-sans text-muted-foreground">Wt:</strong> {currentVital.weight} kg
                  </span>
                )}
                {currentVital.bmi && (
                  <span>
                    <strong className="font-sans text-muted-foreground">BMI:</strong> {currentVital.bmi}
                  </span>
                )}
              </div>
            )}

            {/* 4. CHIEF COMPLAINTS & DIAGNOSIS */}
            <div className="space-y-2 text-xs">
              {config.show_chief_complaints && (Array.isArray(complaints) ? complaints.length > 0 : Boolean(complaints)) && (
                <div>
                  <strong className="text-foreground">Chief Complaints & Presenting Symptoms:</strong>{" "}
                  <span className="text-foreground">
                    {Array.isArray(complaints) ? complaints.join(", ") : complaints}
                  </span>
                </div>
              )}

              {config.show_clinical_findings && clinicalNotes && (
                <div>
                  <strong className="text-foreground">Clinical Examination & Systemic Findings:</strong>
                  <p className="text-muted-foreground whitespace-pre-line text-[11px] mt-0.5">
                    {clinicalNotes}
                  </p>
                </div>
              )}

              {config.show_diagnoses && diagnoses.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <strong className="text-foreground">Diagnosis:</strong>
                  {diagnoses.map((d, dIdx) => (
                    <Badge
                      key={dIdx}
                      variant="outline"
                      className="font-mono text-[10px] bg-primary/10 text-primary border-primary/20 py-0"
                    >
                      {d.code} - {d.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* 5. RX MEDICATIONS TABLE */}
            {config.show_medications_table && medicines.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center gap-1.5 font-bold text-sm text-foreground">
                  <span className="text-2xl font-serif text-primary">℞</span>
                  <span>Prescribed Medications</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border border-collapse text-xs">
                    <thead className="bg-muted/40 text-[10px] uppercase font-bold border-b border-border">
                      <tr>
                        <th className="p-2 border-r border-border w-8">#</th>
                        <th className="p-2 border-r border-border">Medicine Name</th>
                        {config.med_cols.dosage && <th className="p-2 border-r border-border">Dosage</th>}
                        {config.med_cols.frequency && <th className="p-2 border-r border-border">Frequency</th>}
                        {config.med_cols.duration && <th className="p-2 border-r border-border">Duration</th>}
                        {config.med_cols.route && <th className="p-2 border-r border-border">Route</th>}
                        {config.med_cols.instructions && <th className="p-2">Instructions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {medicines.map((m, mIdx) => (
                        <tr key={mIdx}>
                          <td className="p-2 border-r border-border font-mono text-muted-foreground">{mIdx + 1}</td>
                          <td className="p-2 border-r border-border font-bold text-foreground">
                            {m.medicine_name}
                          </td>
                          {config.med_cols.dosage && (
                            <td className="p-2 border-r border-border">{m.dosage || "1 tab"}</td>
                          )}
                          {config.med_cols.frequency && (
                            <td className="p-2 border-r border-border font-mono font-semibold">{m.frequency || "BD"}</td>
                          )}
                          {config.med_cols.duration && (
                            <td className="p-2 border-r border-border">{m.duration || "5 days"}</td>
                          )}
                          {config.med_cols.route && (
                            <td className="p-2 border-r border-border">{m.route || "Oral"}</td>
                          )}
                          {config.med_cols.instructions && (
                            <td className="p-2 text-muted-foreground text-[11px]">{m.instructions || "After food"}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 6. INVESTIGATIONS, PATIENT DISPOSITION & DOCTOR ADVICE */}
            {(config.show_investigations && investigations.length > 0) || (config.show_doctor_advice && advice) || (config.show_follow_up_date && followUpDate) || (disposition && disposition !== "home") ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                {/* Diagnostic Investigations Section */}
                {config.show_investigations && investigations.length > 0 && (
                  <div className="p-2.5 rounded-lg border border-border/80 bg-muted/10 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <strong className="text-foreground text-xs">Diagnostic Investigations Advised:</strong>
                      <span className="text-[10px] text-muted-foreground font-mono">{investigations.length} test(s)</span>
                    </div>
                    <div className="divide-y divide-border/50">
                      {investigations.map((i, iIdx) => (
                        <div key={iIdx} className="py-1 flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground">{i.name}</span>
                            <span className="text-[9px] px-1 py-0.2 rounded font-mono bg-muted text-muted-foreground border border-border/60">
                              {i.category}
                            </span>
                          </div>
                          {i.urgency && i.urgency.toLowerCase() !== "routine" && (
                            <span className="text-[9px] font-bold uppercase text-rose-600 bg-rose-50 px-1 py-0.2 rounded border border-rose-200">
                              {i.urgency}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dietary & Clinical Advice */}
                {config.show_doctor_advice && advice && (
                  <div className="p-2.5 rounded-lg border border-border/80 bg-muted/10 space-y-1">
                    <strong className="text-foreground">Dietary & Clinical Advice:</strong>
                    <p className="text-muted-foreground text-[11px] whitespace-pre-line">{advice}</p>
                  </div>
                )}

                {/* Patient Disposition Alert (Day Care / IPD) */}
                {disposition && disposition !== "home" && (
                  <div
                    className={`col-span-full p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                      disposition === "admit_ipd"
                        ? "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-200"
                        : "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200"
                    }`}
                  >
                    <div>
                      <strong className="block text-xs">
                        {disposition === "admit_ipd" ? "🚨 Recommended Inpatient (IPD) Admission" : "⏱️ Day Care Observation Advised"}
                      </strong>
                      {recommendedWard && (
                        <span className="text-[11px] font-bold text-primary block mt-0.5">
                          Recommended Ward: {recommendedWard}
                        </span>
                      )}
                      {dispositionNotes && (
                        <p className="text-[11px] opacity-90 mt-0.5 whitespace-pre-line">{dispositionNotes}</p>
                      )}
                    </div>
                    {disposition === "admit_ipd" && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-600 text-white px-2 py-0.5 rounded-md shrink-0">
                        Priority: {admitPriority}
                      </span>
                    )}
                  </div>
                )}

                {config.show_follow_up_date && followUpDate && (
                  <div className="col-span-full p-2.5 rounded-lg border border-primary/20 bg-primary/5 flex items-center justify-between">
                    <div>
                      <strong className="text-primary block">Next Follow-Up Revisit:</strong>
                      <span className="text-foreground font-mono font-bold text-sm">
                        {new Date(followUpDate).toLocaleDateString("en-IN", {
                          weekday: "short",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">SOS in emergency if symptoms persist</span>
                  </div>
                )}
              </div>
            ) : null}

            {/* 7. DOCTOR SIGNATURE BLOCK */}
            {config.show_doctor_signature && (
              <div
                className={`pt-8 flex items-end ${
                  config.signature_alignment === "right" ? "justify-end" : "justify-start"
                }`}
              >
                <div className="text-center space-y-1 min-w-[220px]">
                  {config.show_doctor_stamp_box && (
                    <div className="h-16 w-16 mx-auto rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-[9px] text-muted-foreground/50 mb-2">
                      [Doctor Stamp]
                    </div>
                  )}
                  <div className="border-t border-foreground/40 pt-1">
                    <strong className="block text-foreground text-sm font-bold">Dr. {doctorName}</strong>
                    <span className="text-[10px] text-muted-foreground block">{departmentName}</span>
                    <span className="text-[10px] font-semibold text-primary block">
                      {config.doctor_signature_title}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 8. FOOTER LEGAL DISCLAIMER & EMERGENCY HELPLINE */}
            <div className="border-t border-border/60 pt-3 text-[10px] text-muted-foreground text-center space-y-0.5">
              <p>{config.footer_disclaimer}</p>
              {config.emergency_helpline && (
                <p className="font-semibold text-foreground">{config.emergency_helpline}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
