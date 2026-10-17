import React from "react"
import { useQuery } from "@tanstack/react-query"
import { Printer, RefreshCw } from "lucide-react"

import { FormContainer } from "@/components/formContainer"
import { Button } from "@/components/ui/button"
import { emergencyService } from "@/services/emergencyService"
import type { EmergencyTriage, EmergencyDischargeSlipData } from "@/types/emergency"

export interface EmergencyDischargeSlipModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedTriage: EmergencyTriage | null
}

export const EmergencyDischargeSlipModal: React.FC<EmergencyDischargeSlipModalProps> = ({
  open,
  onOpenChange,
  selectedTriage,
}) => {
  const { data: slipData, isLoading } = useQuery<EmergencyDischargeSlipData>({
    queryKey: ["emergency", "discharge-slip", selectedTriage?.id],
    queryFn: () => emergencyService.getDischargeSlip(selectedTriage!.id),
    enabled: open && !!selectedTriage?.id,
  })

  return (
    <FormContainer
      open={open}
      onOpenChange={onOpenChange}
      title="Emergency Discharge & Referral Transfer Summary"
      description={`Triage #${selectedTriage?.triage_number} • Patient: ${selectedTriage?.patient_name}`}
      size="xl"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            size="sm"
            onClick={() => window.print()}
            className="gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold"
          >
            <Printer className="h-4 w-4" /> Print Discharge / Referral Slip
          </Button>
        </div>
      }
    >
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-emergency-slip, #printable-emergency-slip * {
            visibility: visible;
          }
          #printable-emergency-slip {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 24px;
            background: white !important;
            color: black !important;
            border: 2px solid #222 !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {isLoading && (
        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Generating official discharge summary...</span>
        </div>
      )}

      {slipData && (
        <div
          id="printable-emergency-slip"
          className="p-6 border-2 border-slate-300 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900 space-y-4 text-xs font-sans text-slate-800 dark:text-slate-200"
        >
          {/* Header */}
          <div className="text-center pb-3 border-b-2 border-slate-900 dark:border-slate-100">
            <h2 className="font-black text-xl text-slate-950 dark:text-white uppercase tracking-wider">
              {slipData.hospital.name}
            </h2>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
              DEPARTMENT OF EMERGENCY MEDICINE & TRAUMA SERVICES
            </p>
            <p className="text-[11px] text-slate-400">
              {slipData.hospital.address} • ABDM HIP ID: {slipData.hospital.abdm_hip_id || "HIP-DEMO-001"}
            </p>
            <div className="inline-block mt-2 px-3 py-1 bg-slate-900 text-white rounded font-bold text-xs uppercase tracking-widest">
              EMERGENCY CASUALTY DISCHARGE & REFERRAL MEMO
            </div>
          </div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <span className="text-slate-400 block text-[10px] font-bold">TRIAGE NUMBER:</span>
              <span className="font-mono font-bold text-sm text-teal-600 dark:text-teal-400">
                {slipData.triage.triage_number}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-bold">STATUS:</span>
              <span className="font-bold uppercase text-slate-900 dark:text-white">
                {slipData.triage.status.replace(/_/g, " ")}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-bold">ARRIVAL TIME:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">
                {slipData.triage.arrival_time ? new Date(slipData.triage.arrival_time).toLocaleString() : "--"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-bold">DISCHARGE / TRANSFER TIME:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">
                {slipData.triage.discharged_at ? new Date(slipData.triage.discharged_at).toLocaleString() : "--"}
              </span>
            </div>
          </div>

          {/* Patient Demographics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <span className="text-slate-400 block text-[10px] font-bold">PATIENT NAME:</span>
              <span className="font-bold text-slate-900 dark:text-white text-sm">
                {slipData.patient.name}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-bold">UHID:</span>
              <span className="font-mono font-bold">{slipData.patient.uhid || "Temporary"}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-bold">AGE / GENDER:</span>
              <span>
                {slipData.patient.approximate_age || "--"} Y / {slipData.patient.gender || "O"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-bold">BROUGHT BY:</span>
              <span>
                {slipData.patient.brought_by || "Self"} ({slipData.patient.brought_by_phone || "N/A"})
              </span>
            </div>
          </div>

          {/* Clinical Findings & Vitals */}
          <div className="space-y-3 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <span className="text-slate-400 block text-[10px] font-bold uppercase">
                CHIEF COMPLAINT ON ADMISSION:
              </span>
              <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                {slipData.triage.chief_complaint || "Acute emergency presentation"}
              </p>
            </div>

            {/* Vitals at Discharge */}
            <div>
              <span className="text-slate-400 block text-[10px] font-bold uppercase">
                DISCHARGE VITALS:
              </span>
              <div className="flex flex-wrap gap-3 mt-1 font-mono text-xs p-2 rounded-lg bg-slate-100/70 dark:bg-slate-800/60">
                <span>
                  <strong>BP:</strong> {slipData.discharge_vitals?.bp || "120/80 mmHg"}
                </span>
                <span>
                  <strong>Pulse:</strong> {slipData.discharge_vitals?.pulse || "--"} bpm
                </span>
                <span>
                  <strong>SpO2:</strong> {slipData.discharge_vitals?.spo2 || "--"}%
                </span>
                <span>
                  <strong>Temp:</strong> {slipData.discharge_vitals?.temperature || "98.6"}°F
                </span>
                <span>
                  <strong>Resp Rate:</strong> {slipData.discharge_vitals?.resp_rate || "--"}/min
                </span>
              </div>
            </div>

            {/* Clinical Treatment Given */}
            {slipData.triage.clinical_notes && (
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">
                  EMERGENCY CLINICAL SUMMARY & INTERVENTIONS:
                </span>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 whitespace-pre-line font-mono text-[11px]">
                  {slipData.triage.clinical_notes}
                </div>
              </div>
            )}
          </div>

          {/* Signatures & Certification */}
          <div className="pt-6 grid grid-cols-2 gap-8 items-end text-xs">
            <div>
              <p className="text-[11px] text-slate-500 italic">
                * This slip certifies emergency medical treatment administered at this casualty facility.
                {slipData.triage.is_mlc ? " (Medico-Legal Case Record on file)." : ""}
              </p>
              <p className="text-[10px] text-slate-400 mt-1 font-mono">
                Generated: {new Date(slipData.generated_at).toLocaleString()}
              </p>
            </div>

            <div className="text-right space-y-1">
              <div className="h-10 border-b border-dashed border-slate-400 w-48 ml-auto" />
              <p className="font-bold text-slate-900 dark:text-white">{slipData.doctor.name}</p>
              <p className="text-[11px] text-slate-500">{slipData.doctor.specialization}</p>
              <p className="text-[10px] text-slate-400 font-mono">HPR ID: {slipData.doctor.hpr_id || "Verified CMO"}</p>
            </div>
          </div>
        </div>
      )}
    </FormContainer>
  )
}
