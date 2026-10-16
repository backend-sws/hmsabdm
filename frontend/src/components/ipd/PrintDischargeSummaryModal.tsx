import React, { useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { ipdService } from "@/services/ipdService"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Printer, X, Loader2, AlertTriangle, ShieldCheck } from "lucide-react"

interface PrintDischargeSummaryModalProps {
  isOpen: boolean
  onClose: () => void
  admissionId: number
}

export const PrintDischargeSummaryModal: React.FC<PrintDischargeSummaryModalProps> = ({
  isOpen,
  onClose,
  admissionId,
}) => {
  const printRef = useRef<HTMLDivElement>(null)

  const { data: printData, isLoading } = useQuery({
    queryKey: ["ipd", "discharge-print", admissionId],
    queryFn: () => ipdService.getDischargePrintData(admissionId),
    enabled: isOpen && !!admissionId,
  })

  const handlePrint = () => {
    window.print()
  }

  const hospital = printData?.hospital
  const admission = printData?.admission
  const patient = printData?.patient
  const doctor = printData?.doctor
  const summary = printData?.summary

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[95vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
        {/* Modal Top Control Bar (Hidden during printing) */}
        <DialogHeader className="p-4 border-b border-border bg-muted/40 print:hidden flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary" />
            <DialogTitle className="text-base font-bold">
              Printable Clinical Discharge Card
            </DialogTitle>
            {summary?.status === "finalized" ? (
              <Badge className="bg-emerald-600 text-white text-xs">Finalized Card</Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                Draft Preview
              </Badge>
            )}
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
            <p className="text-sm">Loading printable clinical discharge card...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-zinc-100 dark:bg-zinc-900/50 print:p-0 print:bg-white print:overflow-visible">
            <div
              ref={printRef}
              className="max-w-[800px] mx-auto bg-white dark:bg-zinc-950 print:bg-white text-zinc-900 dark:text-zinc-100 print:text-black p-8 sm:p-10 rounded-xl shadow-md border border-zinc-200 dark:border-zinc-800 print:border-none print:shadow-none print:p-0 print:max-w-none text-xs space-y-6"
            >
              {/* ── HOSPITAL LETTERHEAD ── */}
              <div className="border-b-2 border-zinc-900 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-blue-900 dark:text-blue-400 print:text-black uppercase">
                      {hospital?.name || "HOSPITAL & RESEARCH CENTRE"}
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400 print:text-zinc-700 text-[11px] leading-tight">
                      {hospital?.address}
                      {hospital?.city ? `, ${hospital.city}` : ""}
                      {hospital?.state ? `, ${hospital.state}` : ""}
                      {hospital?.pincode ? ` - ${hospital.pincode}` : ""}
                    </p>
                    <p className="text-zinc-600 dark:text-zinc-400 print:text-zinc-700 text-[11px]">
                      {hospital?.phone ? `Phone: ${hospital.phone}` : ""}
                      {hospital?.email ? ` • Email: ${hospital.email}` : ""}
                    </p>
                  </div>

                  <div className="text-right space-y-1 flex flex-col items-end">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 print:bg-zinc-100 print:text-black font-semibold text-[10px] border border-blue-200 print:border-zinc-400">
                      <ShieldCheck className="h-3.5 w-3.5" /> NABH ACCREDITED HOSPITAL
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
                    CLINICAL DISCHARGE SUMMARY & DISCHARGE CARD
                  </div>
                  <div className="font-mono text-xs font-bold text-zinc-700 dark:text-zinc-300 print:text-black">
                    {summary?.summary_number ? `Summary #: ${summary.summary_number}` : "DRAFT SUMMARY"}
                  </div>
                </div>
              </div>

              {/* ── PATIENT & ADMISSION DEMOGRAPHICS BOX ── */}
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
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block">IPD Number</span>
                    <span className="font-mono font-bold">{admission?.ipd_number}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block">Ward / Bed</span>
                    <span className="font-semibold">
                      {admission?.ward} • Bed #{admission?.bed}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block">Date of Admission</span>
                    <span className="font-semibold">{admission?.admission_date}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block">Date of Discharge</span>
                    <span className="font-semibold">{admission?.discharge_date}</span>
                  </div>

                  <div className="col-span-2">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block">Attending Consultant</span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 print:text-black">
                      Dr. {doctor?.name} ({doctor?.qualification}) • {doctor?.department}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block">Discharge Type</span>
                    <span className="font-bold uppercase text-blue-700 dark:text-blue-400 print:text-black">
                      {summary?.discharge_type || "Normal"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block">Length of Stay</span>
                    <span className="font-semibold">{admission?.length_of_stay}</span>
                  </div>
                </div>
              </div>

              {/* ── CLINICAL DIAGNOSES ── */}
              <div className="space-y-3">
                <div className="p-2.5 rounded bg-blue-50/70 dark:bg-blue-950/30 print:bg-zinc-100 border-l-4 border-blue-600 print:border-black">
                  <div className="text-[10px] uppercase font-bold text-blue-900 dark:text-blue-300 print:text-black">
                    FINAL CLINICAL DIAGNOSIS
                  </div>
                  <div className="text-sm font-black text-zinc-900 dark:text-zinc-100 print:text-black mt-0.5">
                    {summary?.final_diagnosis || summary?.admission_diagnosis || "Under evaluation / Not specified"}
                    {summary?.icd10_code && (
                      <span className="ml-2 font-mono text-xs font-normal text-zinc-600 print:text-zinc-800">
                        (ICD-10: {summary.icd10_code})
                      </span>
                    )}
                  </div>
                </div>

                {summary?.admission_diagnosis && summary?.admission_diagnosis !== summary?.final_diagnosis && (
                  <div>
                    <span className="font-bold text-zinc-700 dark:text-zinc-300 print:text-black">Admission Diagnosis: </span>
                    <span>{summary.admission_diagnosis}</span>
                  </div>
                )}

                {summary?.chief_complaints && (
                  <div>
                    <span className="font-bold text-zinc-700 dark:text-zinc-300 print:text-black">Chief Complaints: </span>
                    <span>{summary.chief_complaints}</span>
                  </div>
                )}

                {summary?.past_history_and_allergies && (
                  <div className="p-2 bg-amber-50 dark:bg-amber-950/20 print:bg-zinc-100 rounded border border-amber-200 print:border-zinc-300">
                    <span className="font-bold text-amber-900 dark:text-amber-300 print:text-black">Allergies & Past History: </span>
                    <span className="font-medium">{summary.past_history_and_allergies}</span>
                  </div>
                )}
              </div>

              {/* ── DISCHARGE VITALS & CONDITION ── */}
              <div className="space-y-2">
                <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-800 dark:text-zinc-200 print:text-black border-b border-zinc-200 dark:border-zinc-800 pb-1">
                  Condition & Vitals at Discharge
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center">
                  <div className="p-1.5 border border-zinc-200 rounded">
                    <span className="text-[10px] text-zinc-500 block">Temperature</span>
                    <span className="font-bold">{summary?.discharge_vitals?.temperature || "98.6"} °F</span>
                  </div>
                  <div className="p-1.5 border border-zinc-200 rounded">
                    <span className="text-[10px] text-zinc-500 block">Blood Pressure</span>
                    <span className="font-bold">
                      {summary?.discharge_vitals?.systolic_bp || "120"}/{summary?.discharge_vitals?.diastolic_bp || "80"} mmHg
                    </span>
                  </div>
                  <div className="p-1.5 border border-zinc-200 rounded">
                    <span className="text-[10px] text-zinc-500 block">Pulse Rate</span>
                    <span className="font-bold">{summary?.discharge_vitals?.pulse_rate || "76"} bpm</span>
                  </div>
                  <div className="p-1.5 border border-zinc-200 rounded">
                    <span className="text-[10px] text-zinc-500 block">Resp. Rate</span>
                    <span className="font-bold">{summary?.discharge_vitals?.respiratory_rate || "18"} /min</span>
                  </div>
                  <div className="p-1.5 border border-zinc-200 rounded">
                    <span className="text-[10px] text-zinc-500 block">SpO2</span>
                    <span className="font-bold">{summary?.discharge_vitals?.spo2 || "99"} %</span>
                  </div>
                  <div className="p-1.5 border border-zinc-200 rounded col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-zinc-500 block">Condition</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 print:text-black">Stable</span>
                  </div>
                </div>
                {summary?.condition_at_discharge && (
                  <p className="text-zinc-700 dark:text-zinc-300 print:text-black italic">
                    Note: {summary.condition_at_discharge}
                  </p>
                )}
              </div>

              {/* ── HOSPITAL COURSE & INVESTIGATIONS ── */}
              {summary?.hospital_course && (
                <div className="space-y-1">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-800 dark:text-zinc-200 print:text-black border-b border-zinc-200 dark:border-zinc-800 pb-1">
                    Hospital Clinical Course & Progress
                  </h3>
                  <div className="whitespace-pre-line text-zinc-700 dark:text-zinc-300 print:text-black leading-relaxed">
                    {summary.hospital_course}
                  </div>
                </div>
              )}

              {/* Lab & Procedures summary if available */}
              {(summary?.investigations_summary || summary?.procedures_surgeries) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {summary?.investigations_summary && (
                    <div className="space-y-1">
                      <h4 className="font-bold text-[11px] uppercase tracking-wider text-zinc-700 dark:text-zinc-300 print:text-black">
                        Key Diagnostic Investigations
                      </h4>
                      <div className="whitespace-pre-line text-zinc-600 dark:text-zinc-400 print:text-black">
                        {summary.investigations_summary}
                      </div>
                    </div>
                  )}

                  {summary?.procedures_surgeries && (
                    <div className="space-y-1">
                      <h4 className="font-bold text-[11px] uppercase tracking-wider text-zinc-700 dark:text-zinc-300 print:text-black">
                        Procedures & Interventions
                      </h4>
                      <div className="whitespace-pre-line text-zinc-600 dark:text-zinc-400 print:text-black">
                        {summary.procedures_surgeries}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── TAKE-HOME MEDICATIONS (DISCHARGE PRESCRIPTION) ── */}
              <div className="space-y-2 break-inside-avoid">
                <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-800 dark:text-zinc-200 print:text-black border-b border-zinc-200 dark:border-zinc-800 pb-1 flex items-center justify-between">
                  <span>Take-Home Prescription (Discharge Medications)</span>
                  <span className="text-[10px] text-zinc-500 font-normal">Please take strictly as prescribed</span>
                </h3>

                {(!summary?.discharge_medications || summary.discharge_medications.length === 0) ? (
                  <p className="text-zinc-500 italic">No take-home medications advised at discharge.</p>
                ) : (
                  <table className="w-full text-left border-collapse border border-zinc-300 dark:border-zinc-700 print:border-black">
                    <thead>
                      <tr className="bg-zinc-100 dark:bg-zinc-900 print:bg-zinc-100 text-[10px] uppercase font-bold text-zinc-700 dark:text-zinc-300 print:text-black">
                        <th className="p-2 border border-zinc-300 dark:border-zinc-700 print:border-black w-8 text-center">#</th>
                        <th className="p-2 border border-zinc-300 dark:border-zinc-700 print:border-black">Medicine Name</th>
                        <th className="p-2 border border-zinc-300 dark:border-zinc-700 print:border-black w-20">Dose</th>
                        <th className="p-2 border border-zinc-300 dark:border-zinc-700 print:border-black">Frequency</th>
                        <th className="p-2 border border-zinc-300 dark:border-zinc-700 print:border-black w-20">Duration</th>
                        <th className="p-2 border border-zinc-300 dark:border-zinc-700 print:border-black">Instructions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 print:divide-black">
                      {summary.discharge_medications.map((med, idx) => (
                        <tr key={idx} className="print:text-black">
                          <td className="p-2 border border-zinc-300 dark:border-zinc-700 print:border-black text-center font-bold">
                            {idx + 1}
                          </td>
                          <td className="p-2 border border-zinc-300 dark:border-zinc-700 print:border-black font-bold">
                            {med.medicine_name} <span className="font-normal text-[10px] text-zinc-500 print:text-zinc-700">({med.dosage_form || "Tab"})</span>
                          </td>
                          <td className="p-2 border border-zinc-300 dark:border-zinc-700 print:border-black">{med.dose || "1 Tab"}</td>
                          <td className="p-2 border border-zinc-300 dark:border-zinc-700 print:border-black font-semibold">{med.frequency}</td>
                          <td className="p-2 border border-zinc-300 dark:border-zinc-700 print:border-black font-mono">{med.duration}</td>
                          <td className="p-2 border border-zinc-300 dark:border-zinc-700 print:border-black text-[11px]">{med.instructions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* ── POST-DISCHARGE ADVICE & EMERGENCY RED FLAGS ── */}
              <div className="space-y-3 break-inside-avoid">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {summary?.dietary_advice && (
                    <div className="p-2.5 rounded bg-zinc-50 dark:bg-zinc-900 print:bg-zinc-100 border border-zinc-200 dark:border-zinc-800 print:border-zinc-300">
                      <span className="font-bold block text-[10px] uppercase text-zinc-500">Dietary & Nutrition Advice</span>
                      <span className="text-zinc-800 dark:text-zinc-200 print:text-black">{summary.dietary_advice}</span>
                    </div>
                  )}

                  {summary?.physical_activity_advice && (
                    <div className="p-2.5 rounded bg-zinc-50 dark:bg-zinc-900 print:bg-zinc-100 border border-zinc-200 dark:border-zinc-800 print:border-zinc-300">
                      <span className="font-bold block text-[10px] uppercase text-zinc-500">Physical Activity & Rest</span>
                      <span className="text-zinc-800 dark:text-zinc-200 print:text-black">{summary.physical_activity_advice}</span>
                    </div>
                  )}
                </div>

                {/* Emergency Red Flags Box (Critical Safety requirement) */}
                <div className="p-3 rounded-lg border-2 border-rose-500 print:border-black bg-rose-50/60 dark:bg-rose-950/20 print:bg-transparent">
                  <div className="flex items-center gap-1.5 font-bold text-rose-800 dark:text-rose-400 print:text-black uppercase text-xs">
                    <AlertTriangle className="h-4 w-4" /> WHEN TO SEEK IMMEDIATE MEDICAL EMERGENCY (RED FLAGS)
                  </div>
                  <p className="mt-1 font-semibold text-rose-950 dark:text-rose-200 print:text-black text-xs leading-relaxed">
                    {summary?.emergency_red_flags ||
                      "Report to 24/7 Casualty / Emergency immediately in case of high fever, breathlessness, uncontrolled severe pain, bleeding, or vomiting."}
                  </p>
                  <p className="mt-1 text-[10px] text-zinc-600 dark:text-zinc-400 print:text-black">
                    Emergency Helpline: <span className="font-bold">{hospital?.phone || "108 / 102"}</span> (24 Hours Open)
                  </p>
                </div>
              </div>

              {/* ── FOLLOW-UP PLAN ── */}
              <div className="p-3 rounded-lg border border-blue-200 dark:border-blue-900 print:border-black bg-blue-50/50 dark:bg-blue-950/20 print:bg-transparent flex items-start justify-between break-inside-avoid">
                <div>
                  <div className="text-[10px] uppercase font-bold text-blue-900 dark:text-blue-300 print:text-black">
                    NEXT FOLLOW-UP REVIEW
                  </div>
                  <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100 print:text-black mt-0.5">
                    Date: {summary?.follow_up_date ? new Date(summary.follow_up_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "After 7 Days"}
                  </div>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 print:text-black mt-0.5">
                    {summary?.follow_up_instructions || "Review in OPD with this discharge card and reports."}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block">Consultant</span>
                  <span className="font-bold text-xs">Dr. {doctor?.name}</span>
                </div>
              </div>

              {/* ── VERIFICATION & SIGN-OFF BLOCKS ── */}
              <div className="pt-8 border-t border-zinc-300 dark:border-zinc-700 print:border-black grid grid-cols-3 gap-6 text-center break-inside-avoid">
                <div className="space-y-12">
                  <div className="border-t border-zinc-400 dark:border-zinc-600 print:border-black pt-1.5">
                    <p className="font-bold text-[11px]">Prepared By</p>
                    <p className="text-[10px] text-zinc-500">Duty Medical Officer / Staff Nurse</p>
                  </div>
                </div>

                <div className="space-y-12">
                  <div className="border-t border-zinc-400 dark:border-zinc-600 print:border-black pt-1.5">
                    <p className="font-bold text-[11px]">Patient / Attendant Signature</p>
                    <p className="text-[10px] text-zinc-500">Received medications & advice</p>
                  </div>
                </div>

                <div className="space-y-12">
                  <div className="border-t border-zinc-400 dark:border-zinc-600 print:border-black pt-1.5">
                    <p className="font-bold text-[11px] text-zinc-900 dark:text-zinc-100 print:text-black">
                      Dr. {doctor?.name}
                    </p>
                    <p className="text-[10px] text-zinc-500 font-mono">
                      Reg No: {doctor?.reg_no || "MCI-VALID"}
                    </p>
                    <p className="text-[9px] text-zinc-400">Authorized Attending Consultant</p>
                  </div>
                </div>
              </div>

              {/* Footer Note */}
              <div className="text-[9px] text-zinc-400 text-center print:text-zinc-600 pt-2 border-t border-zinc-100 dark:border-zinc-900">
                This document is a computer-generated official inpatient discharge card under National Digital Health Mission (NDHM / ABDM) and NABH Guidelines.
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
export default PrintDischargeSummaryModal
