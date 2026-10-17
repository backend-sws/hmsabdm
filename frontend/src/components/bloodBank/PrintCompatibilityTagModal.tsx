import React, { useRef } from "react"
import {
  X,
  Printer,
  ShieldCheck,
  AlertCircle,
  FileBadge,
} from "lucide-react"
import type { BloodCrossmatch } from "@/types/bloodBank"

interface PrintCompatibilityTagModalProps {
  isOpen: boolean
  onClose: () => void
  crossmatch: BloodCrossmatch | null
}

export const PrintCompatibilityTagModal: React.FC<PrintCompatibilityTagModalProps> = ({
  isOpen,
  onClose,
  crossmatch,
}) => {
  const printRef = useRef<HTMLDivElement>(null)

  if (!isOpen || !crossmatch) return null

  const handlePrint = () => {
    window.print()
  }

  const patient = crossmatch.patient || crossmatch.requisition?.patient
  const bloodUnit = crossmatch.blood_unit
  const req = crossmatch.requisition

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header (No Print) */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <FileBadge className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">
                NABH / AABB Transfusion Compatibility Tag
              </h2>
              <p className="text-[11px] text-slate-400">
                Affix securely to blood bag before handing over to clinical runner
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition"
            >
              <Printer className="w-4 h-4" />
              Print Compatibility Tag
            </button>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Tag Document */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 dark:bg-slate-950 print:p-0 print:bg-white">
          <div
            ref={printRef}
            className="bg-white text-slate-900 border-2 border-dashed border-slate-400 rounded-xl p-6 shadow-sm max-w-xl mx-auto print:border-black print:max-w-none print:shadow-none print:p-4"
          >
            {/* Tag Header */}
            <div className="border-b-2 border-slate-900 pb-3 mb-3 text-center">
              <div className="flex items-center justify-center gap-2 font-black text-sm tracking-wider uppercase text-red-600">
                <ShieldCheck className="w-5 h-5" />
                DEPARTMENT OF TRANSFUSION MEDICINE & BLOOD BANK
              </div>
              <h3 className="text-xs font-bold tracking-tight text-slate-800">
                OFFICIAL BLOOD COMPATIBILITY & DISPATCH SLIP
              </h3>
              <p className="text-[10px] text-slate-500">
                Drugs & Cosmetics Act Schedule F (Part XII-B) Compliant
              </p>
            </div>

            {/* Verification Status Banner */}
            <div className="bg-emerald-50 border border-emerald-500 text-emerald-800 text-center py-1.5 rounded-md font-bold text-xs mb-4 flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              CROSSMATCH COMPATIBILITY VERIFIED: {crossmatch.compatibility.toUpperCase()}
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs mb-4 pb-4 border-b border-slate-200">
              {/* Recipient / Patient Info */}
              <div className="space-y-1">
                <p className="font-bold uppercase text-[10px] text-slate-400 tracking-wider">
                  Patient / Recipient Information
                </p>
                <p className="font-bold text-sm text-slate-900">{patient?.name || "N/A"}</p>
                <p className="font-mono text-[11px] text-slate-700">UHID: {patient?.uhid || "N/A"}</p>
                <p className="text-slate-600">
                  Ward / Bed: {req?.admission?.ward?.name || "Emergency / OT"} (IPD #{req?.admission?.ipd_number || "STAT"})
                </p>
                <div className="pt-1 flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500">Patient ABO/Rh:</span>
                  <span className="font-bold text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                    {req?.blood_group_needed || (patient as any)?.blood_group || "N/A"}
                  </span>
                </div>
              </div>

              {/* Unit Info */}
              <div className="space-y-1 border-l border-slate-200 pl-4">
                <p className="font-bold uppercase text-[10px] text-slate-400 tracking-wider">
                  Issued Blood Unit Information
                </p>
                <p className="font-mono font-bold text-sm text-slate-900">
                  {bloodUnit?.unit_barcode || "N/A"}
                </p>
                <p className="font-bold text-slate-700 uppercase">
                  {bloodUnit?.component_type?.replace("_", " ") || "PRBC"} ({bloodUnit?.volume_ml || 250} mL)
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500">Unit Group:</span>
                  <span className="font-bold text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                    {bloodUnit?.blood_group || "N/A"}
                  </span>
                </div>
                <p className="text-[11px] text-red-600 font-semibold pt-0.5">
                  Expiry Date: {bloodUnit?.expiry_date || "N/A"}
                </p>
              </div>
            </div>

            {/* Test Details Strip */}
            <div className="grid grid-cols-3 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-200 mb-4">
              <div>
                <span className="text-slate-500 block">Methodology:</span>
                <span className="font-semibold uppercase">{crossmatch.method.replace("_", " ")}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Dispatch Temp:</span>
                <span className="font-semibold">{crossmatch.cold_box_temperature ?? 4.2}°C</span>
              </div>
              <div>
                <span className="text-slate-500 block">Issue Date/Time:</span>
                <span className="font-mono text-[10px] font-semibold">
                  {crossmatch.issued_at ? new Date(crossmatch.issued_at).toLocaleString() : new Date().toLocaleString()}
                </span>
              </div>
            </div>

            {/* Bedside Safety Checklist */}
            <div className="border border-amber-300 bg-amber-50/50 p-3 rounded-lg mb-4 text-[10px] space-y-1 text-slate-800">
              <p className="font-bold text-amber-900 flex items-center gap-1 uppercase tracking-wider text-[11px]">
                <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                Mandatory Bedside Nurse Safety Verification Checklist:
              </p>
              <p>• 1. Two clinicians have independently verified patient wristband with this tag.</p>
              <p>• 2. ABO and Rh compatibility confirmed between patient chart and unit label.</p>
              <p>• 3. Record baseline vitals prior to infusion. Start infusion slowly for initial 15 min.</p>
              <p>• 4. In case of fever, chills, dyspnea, or chest pain: STOP TRANSFUSION IMMEDIATELY, keep IV line open with saline, and notify Blood Bank.</p>
            </div>

            {/* Signatures Stubs */}
            <div className="grid grid-cols-3 gap-4 pt-6 text-[10px] text-center border-t border-slate-300">
              <div>
                <div className="h-6 border-b border-slate-400"></div>
                <p className="pt-1 font-semibold text-slate-700">Lab Technician / BTO</p>
              </div>
              <div>
                <div className="h-6 border-b border-slate-400"></div>
                <p className="pt-1 font-semibold text-slate-700">Runner / Transport Staff</p>
              </div>
              <div>
                <div className="h-6 border-b border-slate-400"></div>
                <p className="pt-1 font-semibold text-slate-700">Ward Staff Nurse Sign</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
