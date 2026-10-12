import React from "react"
import { Printer } from "lucide-react"

import { FormContainer } from "@/components/formContainer"
import { Button } from "@/components/ui/button"
import type { MlcSlipData } from "@/types/emergency"

export interface EmergencyMlcModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mlcSlipData: MlcSlipData | null
}

export const EmergencyMlcModal: React.FC<EmergencyMlcModalProps> = ({
  open,
  onOpenChange,
  mlcSlipData,
}) => {
  return (
    <FormContainer
      open={open}
      onOpenChange={onOpenChange}
      title="Official Medico-Legal Case (MLC) Police Intimation Memo"
      description="Statutory Police Notification under CrPC for Casualty & Trauma Cases"
      size="xl"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => window.print()} className="gap-2 bg-purple-700 hover:bg-purple-800 text-white">
            <Printer className="h-4 w-4" /> Print Police Memo
          </Button>
        </div>
      }
    >
      {mlcSlipData && (
        <div className="p-6 border-2 border-dashed border-purple-500/40 rounded-2xl bg-purple-500/5 space-y-4 text-xs font-mono">
          {/* Header */}
          <div className="text-center pb-3 border-b border-border/80">
            <h2 className="font-bold text-lg text-foreground uppercase tracking-widest">
              {mlcSlipData.hospital.name}
            </h2>
            <p className="text-[11px] text-muted-foreground uppercase">
              Department of Emergency Medicine & Casualty Services
            </p>
            <div className="inline-block mt-2 px-3 py-1 bg-purple-600 text-white rounded font-bold text-xs uppercase tracking-wider">
              POLICE INTIMATION MEMO (MLC)
            </div>
          </div>

          {/* Memo & Police Info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs border-b border-border/80 pb-3">
            <div>
              <span className="text-muted-foreground block text-[10px]">MLC NUMBER:</span>
              <span className="font-bold text-purple-700 dark:text-purple-300">
                {mlcSlipData.mlc_details.mlc_number}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px]">TRIAGE NUMBER:</span>
              <span className="font-bold">{mlcSlipData.mlc_details.triage_number}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px]">POLICE STATION:</span>
              <span className="font-bold">{mlcSlipData.mlc_details.police_station}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px]">OFFICER / BUCKLE:</span>
              <span className="font-bold">
                {mlcSlipData.mlc_details.police_officer_name || "--"} /{" "}
                {mlcSlipData.mlc_details.police_buckle_number || "--"}
              </span>
            </div>
          </div>

          {/* Patient Demographics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs border-b border-border/80 pb-3">
            <div>
              <span className="text-muted-foreground block text-[10px]">PATIENT NAME:</span>
              <span className="font-bold">{mlcSlipData.patient.name}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px]">UHID / GENDER / AGE:</span>
              <span className="font-bold">
                {mlcSlipData.patient.uhid || "EMG-TEMP"} • {mlcSlipData.patient.gender} •{" "}
                {mlcSlipData.patient.approximate_age} Y
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px]">BROUGHT BY:</span>
              <span className="font-bold">
                {mlcSlipData.patient.brought_by} ({mlcSlipData.patient.brought_by_phone || "--"})
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px]">INCIDENT SPOT:</span>
              <span className="font-bold">{mlcSlipData.mlc_details.incident_place || "--"}</span>
            </div>
          </div>

          {/* Medical Findings */}
          <div className="space-y-2 border-b border-border/80 pb-3">
            <span className="text-muted-foreground block text-[10px]">
              NATURE & LOCATION OF INJURIES:
            </span>
            <p className="p-2.5 rounded bg-background border border-border text-foreground font-sans text-xs">
              {mlcSlipData.mlc_details.injuries_description}
            </p>
            <div className="flex gap-4 text-[11px] pt-1">
              <span>
                <strong>GCS Score:</strong> {mlcSlipData.clinical_assessment.gcs_score ?? "--"}/15
              </span>
              <span>
                <strong>Consciousness:</strong> {mlcSlipData.clinical_assessment.consciousness_level ?? "--"}
              </span>
              <span>
                <strong>Priority:</strong> {mlcSlipData.clinical_assessment.priority_level?.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Legal Declaration & Doctor Sign */}
          <div className="pt-2 space-y-4">
            <p className="text-[11px] text-muted-foreground italic leading-relaxed">
              "{mlcSlipData.declaration}"
            </p>

            <div className="flex justify-between items-end pt-4 border-t border-dashed border-border/80">
              <div>
                <span className="text-[10px] text-muted-foreground block">INTIMATION TIME:</span>
                <span className="font-bold">
                  {new Date(mlcSlipData.generated_at).toLocaleString()}
                </span>
              </div>
              <div className="text-right">
                <div className="h-10 border-b border-muted-foreground/40 w-44 mb-1"></div>
                <span className="font-bold block">{mlcSlipData.clinical_assessment.examining_doctor}</span>
                <span className="text-[10px] text-muted-foreground block">
                  Reg / HPR ID: {mlcSlipData.clinical_assessment.doctor_reg_no || "Verified"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </FormContainer>
  )
}
