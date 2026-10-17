import React from "react"
import { createPortal } from "react-dom"
import { Printer, X, ShieldCheck, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  preauth: any
  onClose: () => void
}

export const PrintPreauthSanctionModal: React.FC<Props> = ({ preauth, onClose }) => {
  if (!preauth) return null

  const patient = preauth.admission?.patient || preauth.patientInsurance?.patient || {}
  const payer = preauth.payer || {}
  const policy = preauth.patientInsurance || {}
  const admission = preauth.admission || {}

  const handlePrint = () => {
    window.print()
  }

  // Format currency
  const formatInr = (amount: number | string | undefined | null) => {
    if (amount === undefined || amount === null || isNaN(Number(amount))) return "₹0"
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(amount))
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-3xl max-h-[94vh] flex flex-col border border-border animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Controls Header (Hidden in Print) */}
        <div className="flex items-center justify-between border-b border-border px-6 py-3.5 print:hidden bg-muted/40 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <div>
              <h3 className="font-semibold text-sm">Cashless Pre-Authorization Sanction Letter</h3>
              <p className="text-[11px] text-muted-foreground">IRDAI compliant cashless approval voucher & admission pass</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handlePrint} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-8 text-xs">
              <Printer className="h-3.5 w-3.5" /> Print / Save PDF
            </Button>
            <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Printable Voucher Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 text-foreground bg-white text-black print:p-0 print:overflow-visible print:text-black">
          
          {/* Hospital Letterhead */}
          <div className="border-b-2 border-emerald-700 pb-4 flex justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-xl">
                  +
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-emerald-950">DEMO CARE MULTISPECIALITY HOSPITAL</h1>
                  <p className="text-[11px] text-gray-600">NABH Accredited · ROHINI ID: 89001245 · Ayushman Bharat Empanelled</p>
                </div>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">
                Plot 42, Health City, Ring Road · 24x7 Emergency: +91 11 4500 0000 · TPA Desk: insurance@hospital.demo
              </p>
            </div>

            <div className="text-right shrink-0">
              <div className="inline-block border border-emerald-600 bg-emerald-50 px-3 py-1 rounded text-right">
                <span className="block text-[9px] font-bold text-emerald-800 uppercase tracking-wider">CASHLESS SANCTION VOUCHER</span>
                <span className="text-xs font-mono font-bold text-emerald-950">PA Ref: {preauth.preauth_number}</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">Date: {new Date(preauth.approved_at || Date.now()).toLocaleDateString("en-IN")}</p>
            </div>
          </div>

          {/* Sanction Highlight Banner */}
          <div className="rounded-xl border-2 border-emerald-600 bg-emerald-50/70 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-emerald-600 p-2 text-white">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-800 tracking-wider">TPA CASHLESS AUTHORIZATION APPROVED</span>
                <div className="text-2xl font-black text-emerald-950 font-mono">
                  {formatInr(preauth.approved_amount || preauth.estimated_amount)}
                </div>
                <p className="text-[11px] text-emerald-800">
                  Insurer / TPA: <strong>{payer.name || "Designated TPA"}</strong> ({payer.code || "TPA"})
                </p>
              </div>
            </div>

            <div className="text-right border-t sm:border-t-0 sm:border-l border-emerald-300 pt-2 sm:pt-0 sm:pl-4 space-y-0.5 text-xs">
              <p className="text-gray-600 text-[11px]">TPA Auth Reference #:</p>
              <p className="font-mono font-bold text-gray-900">{preauth.tpa_preauth_number || preauth.preauth_number}</p>
              <p className="text-gray-600 text-[11px] pt-1">Approval Valid Till:</p>
              <p className="font-bold text-emerald-900">
                {preauth.valid_till ? new Date(preauth.valid_till).toLocaleDateString("en-IN") : "Valid for Current Stay"}
              </p>
            </div>
          </div>

          {/* Patient Particulars & Admission Grid */}
          <div className="grid grid-cols-2 gap-4 border rounded-xl p-4 text-xs bg-gray-50/50">
            <div className="space-y-1.5">
              <h4 className="font-bold text-gray-700 uppercase text-[10px] tracking-wider border-b pb-1">Patient Particulars</h4>
              <div className="grid grid-cols-3 gap-1">
                <span className="text-gray-500">Patient Name:</span>
                <span className="col-span-2 font-bold text-gray-900">{patient.name || "Patient #2"}</span>
                <span className="text-gray-500">UHID:</span>
                <span className="col-span-2 font-mono">{patient.uhid || "UHID-2026-0002"}</span>
                <span className="text-gray-500">Age / Gender:</span>
                <span className="col-span-2">{patient.age ? `${patient.age} Yrs` : "42 Yrs"} / {patient.gender || "Female"}</span>
                <span className="text-gray-500">IPD Admission:</span>
                <span className="col-span-2 font-mono font-semibold text-emerald-800">
                  {admission.ipd_number || admission.admission_number || "IPD-2026-0003"}
                </span>
                <span className="text-gray-500">Admit Date:</span>
                <span className="col-span-2">{admission.admission_date ? new Date(admission.admission_date).toLocaleDateString("en-IN") : "15/10/2026"}</span>
              </div>
            </div>

            <div className="space-y-1.5 border-l pl-4">
              <h4 className="font-bold text-gray-700 uppercase text-[10px] tracking-wider border-b pb-1">Insurance / Policy Particulars</h4>
              <div className="grid grid-cols-3 gap-1">
                <span className="text-gray-500">Insurance TPA:</span>
                <span className="col-span-2 font-semibold text-gray-900">{payer.name || "Star Health"}</span>
                <span className="text-gray-500">Policy / Card #:</span>
                <span className="col-span-2 font-mono">{policy.policy_number || policy.member_id || "STAR_POL_987654"}</span>
                <span className="text-gray-500">Insured Name:</span>
                <span className="col-span-2">{policy.insured_name || patient.name || "Self"}</span>
                <span className="text-gray-500">Room Category:</span>
                <span className="col-span-2 font-semibold text-blue-900">
                  {preauth.approved_room_rent_cap ? `Capped at ₹${preauth.approved_room_rent_cap}/day` : "Twin Sharing / Semi-Private"}
                </span>
                <span className="text-gray-500">ICU Allowed:</span>
                <span className="col-span-2 font-semibold text-blue-900">
                  {preauth.approved_icu_cap ? `Capped at ₹${preauth.approved_icu_cap}/day` : "As per Doctor Advice"}
                </span>
              </div>
            </div>
          </div>

          {/* Clinical Justification & Diagnosis */}
          <div className="border rounded-xl p-4 text-xs space-y-2">
            <h4 className="font-bold text-gray-700 uppercase text-[10px] tracking-wider border-b pb-1">Clinical Details Authorized</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-gray-500 block text-[11px]">Primary Provisional Diagnosis:</span>
                <p className="font-medium text-gray-900 mt-0.5">
                  {preauth.primary_diagnosis || "Calculus of gallbladder with acute cholecystitis (ICD-10: K80.0)"}
                </p>
              </div>
              <div>
                <span className="text-gray-500 block text-[11px]">Proposed / Approved Procedure:</span>
                <p className="font-medium text-gray-900 mt-0.5">
                  {preauth.proposed_treatment || "Laparoscopic Cholecystectomy with standard pre-op workup & post-op care"}
                </p>
              </div>
            </div>
            {preauth.approval_remarks && (
              <div className="mt-2 pt-2 border-t text-[11px] text-gray-700">
                <span className="font-semibold text-gray-800">TPA Remarks: </span>
                {preauth.approval_remarks}
              </div>
            )}
          </div>

          {/* IRDAI Statutory Terms & Instructions */}
          <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-3.5 text-[11px] text-amber-950 space-y-1">
            <h5 className="font-bold text-amber-900 flex items-center gap-1.5">
              <span>⚠️ Important Guidelines for Patient / Attendant (IRDAI Compliance)</span>
            </h5>
            <ol className="list-decimal pl-4 space-y-1 text-gray-700">
              <li>
                <strong>Initial Pre-Authorization:</strong> This voucher is an initial cashless approval. Final bill settlement requires TPA final discharge approval at the time of discharge.
              </li>
              <li>
                <strong>Non-Payable Items:</strong> Consumables, toiletries, administrative charges, gloves, and items listed in IRDAI List I, II, III are strictly non-payable by the insurer and must be settled by the patient in cash.
              </li>
              <li>
                <strong>Enhancements:</strong> If clinical condition requires extended stay or additional procedures, treating doctor will submit an Enhancement Request before discharge.
              </li>
            </ol>
          </div>

          {/* Signature & Seal Block */}
          <div className="pt-8 grid grid-cols-3 gap-6 text-center text-xs">
            <div className="border-t border-gray-400 pt-2">
              <p className="font-bold text-gray-900">Hospital TPA Desk</p>
              <p className="text-[10px] text-gray-500">Authorized Signatory & Seal</p>
            </div>
            <div className="border-t border-gray-400 pt-2">
              <p className="font-bold text-gray-900">Treating Consultant Doctor</p>
              <p className="text-[10px] text-gray-500">Regn. No. & Signature</p>
            </div>
            <div className="border-t border-gray-400 pt-2">
              <p className="font-bold text-gray-900">Patient / Attendant Signature</p>
              <p className="text-[10px] text-gray-500">Accepted Terms of Co-pay</p>
            </div>
          </div>

          <div className="text-center pt-2 text-[9px] text-gray-400 print:block">
            System Generated Cashless Approval Voucher · Demo Care Hospital HMIS · IRDAI Master Circular Compliant
          </div>
        </div>

      </div>
    </div>,
    document.body
  )
}
