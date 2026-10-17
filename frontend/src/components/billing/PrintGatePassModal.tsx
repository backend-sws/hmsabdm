import React from "react"
import { useQuery } from "@tanstack/react-query"
import { Printer, CheckCircle2, RefreshCw } from "lucide-react"

import { FormContainer } from "@/components/formContainer"
import { Button } from "@/components/ui/button"

import { ipdService } from "@/services/ipdService"
import { queryKeys } from "@/constants/queryKeys"

interface PrintGatePassModalProps {
  isOpen: boolean
  onClose: () => void
  admissionId: number | null
}

export const PrintGatePassModal: React.FC<PrintGatePassModalProps> = ({
  isOpen,
  onClose,
  admissionId,
}) => {
  const { data: gatePassData, isLoading } = useQuery({
    queryKey: queryKeys.ipd.gatePass(admissionId || 0),
    queryFn: () => ipdService.getGatePass(admissionId!),
    enabled: isOpen && !!admissionId,
  })

  return (
    <FormContainer
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title="Hospital Security Clearance Gate Pass"
      description={`Official exit authorization slip #${gatePassData?.gate_pass_number || "..."}`}
      size="md"
      footer={
        <div className="flex justify-between items-center w-full">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button
            size="sm"
            className="gap-2 bg-slate-900 hover:bg-slate-800 text-white"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" /> Print Security Gate Pass
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-xs font-sans">
        {isLoading ? (
          <div className="py-16 text-center text-muted-foreground space-y-2">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-primary" />
            <p>Fetching security gate pass clearance status...</p>
          </div>
        ) : gatePassData && gatePassData.patient && gatePassData.admission && gatePassData.financial_summary ? (
          <div className="p-5 border-2 border-slate-900 rounded-2xl bg-white text-slate-900 space-y-4 print:p-0 print:border-none">
            {/* Header */}
            <div className="text-center border-b pb-3 space-y-1">
              <div className="font-black text-base uppercase tracking-wider text-slate-950">
                METRO CARE MULTISPECIALITY HOSPITAL
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                CENTRAL SECURITY & FINANCIAL CLEARANCE DESK
              </div>
              <div className="mt-1 inline-block px-3 py-0.5 bg-slate-900 text-white rounded font-bold text-[11px] tracking-widest uppercase">
                SECURITY EXIT GATE PASS
              </div>
            </div>

            {/* Gate Pass Number & Issued At */}
            <div className="flex justify-between items-center bg-slate-100 p-2.5 rounded-lg border font-mono">
              <div>
                <span className="text-[9px] text-slate-500 block uppercase">GATE PASS NUMBER</span>
                <span className="font-bold text-sm text-slate-950">{gatePassData.gate_pass_number}</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-slate-500 block uppercase">CLEARED AT</span>
                <span className="text-xs font-medium text-slate-800">
                  {new Date(gatePassData.issued_at).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Patient & Admission Details */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border text-xs">
              <div>
                <span className="text-[9px] text-slate-500 block uppercase font-bold">PATIENT NAME</span>
                <span className="font-bold text-sm text-slate-950">{gatePassData.patient.name}</span>
                <span className="text-[10px] text-slate-600 font-mono block">UHID: {gatePassData.patient.uhid}</span>
              </div>

              <div>
                <span className="text-[9px] text-slate-500 block uppercase font-bold">ADMISSION CONTEXT</span>
                <span className="font-mono font-bold text-slate-900">{gatePassData.admission.ipd_number}</span>
                <span className="text-[10px] text-slate-600 block">
                  Ward: {gatePassData.admission.ward_name} • Bed: {gatePassData.admission.bed_number}
                </span>
              </div>
            </div>

            {/* Big Financial Clearance Stamp Box */}
            <div className="border-2 border-dashed border-emerald-600 bg-emerald-50 rounded-xl p-3 text-center space-y-1">
              <div className="flex items-center justify-center gap-1.5 text-emerald-800 font-black text-sm tracking-wider uppercase">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ACCOUNTS & BILLING STATUS: FULLY CLEARED
              </div>
              <div className="text-[10px] text-emerald-700">
                Invoice #{gatePassData.financial_summary.invoice_number} • Amount Paid: ₹{Number(gatePassData.financial_summary.amount_paid).toLocaleString("en-IN")}
              </div>
              <div className="text-[9px] text-slate-500">
                Bed allocated to patient is marked vacant & cleared for housekeeping.
              </div>
            </div>

            {/* Guard Verification Stub */}
            <div className="pt-6 border-t flex justify-between items-end text-xs text-slate-600">
              <div>
                <div className="border-t border-slate-400 w-36 pt-1 text-center text-[10px]">
                  Hospital Cashier Stamp
                </div>
              </div>
              <div className="text-right">
                <div className="border-t border-slate-400 w-36 pt-1 text-center text-[10px]">
                  Security Guard Signature
                </div>
                <div className="text-[9px] text-slate-400 mt-0.5">Verified at Hospital Exit Gate</div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </FormContainer>
  )
}
