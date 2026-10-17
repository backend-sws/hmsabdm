import React, { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  FileText,
  Stethoscope,
  Syringe,
  RefreshCw,
} from "lucide-react"

import { FormContainer } from "@/components/formContainer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { doctorService } from "@/services/doctorService"
import { emergencyService } from "@/services/emergencyService"
import { queryKeys } from "@/constants/queryKeys"
import type { EmergencyTriage, EmergencyClinicalNotesPayload } from "@/types/emergency"

export interface EmergencyClinicalNotesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedTriage: EmergencyTriage | null
  onSuccess?: () => void
}

const COMMON_EMERGENCY_INTERVENTIONS = [
  "IV Cannula 18G / 20G inserted",
  "IV Fluids Normal Saline 500ml STAT",
  "Inj. Pantocid 40mg IV STAT",
  "Inj. Tramadol 50mg IV in 100ml NS",
  "Inj. Ondansetron 4mg IV STAT",
  "High-Flow O2 via face mask @ 6L/min",
  "Sterile Wound Dressing & Compression applied",
  "ECG 12-Lead Done & Monitored",
  "Ryle's Tube / Foley Catheter inserted",
  "Inj. Tetanus Toxoid 0.5ml IM given",
]

export const EmergencyClinicalNotesModal: React.FC<EmergencyClinicalNotesModalProps> = ({
  open,
  onOpenChange,
  selectedTriage,
  onSuccess,
}) => {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<EmergencyClinicalNotesPayload>({
    provisional_diagnosis: "",
    treatment_given: "",
    doctor_notes: "",
    doctor_id: selectedTriage?.doctor_id || undefined,
  })

  useEffect(() => {
    if (selectedTriage) {
      setFormData({
        provisional_diagnosis: "",
        treatment_given: "",
        doctor_notes: "",
        doctor_id: selectedTriage.doctor_id || undefined,
      })
    }
  }, [selectedTriage, open])

  // Doctor list query
  const { data: doctorsData } = useQuery({
    queryKey: queryKeys.doctors.list(),
    queryFn: () => doctorService.getDoctors({ limit: 100 }),
    enabled: open,
  })
  const doctors = doctorsData?.data || []

  const updateNotesMutation = useMutation({
    mutationFn: () => {
      if (!selectedTriage) throw new Error("No triage selected")
      if (!formData.provisional_diagnosis?.trim() && !formData.doctor_notes?.trim() && !formData.treatment_given?.trim()) {
        throw new Error("Please enter at least a provisional diagnosis, intervention, or clinical note.")
      }
      return emergencyService.addClinicalNotes(selectedTriage.id, formData)
    },
    onSuccess: (res) => {
      toast.success(`Clinical notes & diagnosis updated for Triage #${res.triage_number}!`)
      queryClient.invalidateQueries({ queryKey: queryKeys.emergency.all })
      onOpenChange(false)
      onSuccess?.()
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update clinical notes")
    },
  })

  const handleAddIntervention = (intervention: string) => {
    setFormData((prev) => {
      const existing = prev.treatment_given ? prev.treatment_given.trim() : ""
      if (existing.includes(intervention)) return prev
      const updated = existing ? `${existing}, ${intervention}` : intervention
      return { ...prev, treatment_given: updated }
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateNotesMutation.mutate()
  }

  return (
    <FormContainer
      open={open}
      onOpenChange={onOpenChange}
      title="Casualty Doctor Orders & Clinical Notes"
      description={`Triage #${selectedTriage?.triage_number} • Patient: ${selectedTriage?.patient_name}`}
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={updateNotesMutation.isPending}
            className="bg-teal-600 hover:bg-teal-700 text-white font-semibold gap-1.5"
          >
            {updateNotesMutation.isPending && <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" />}
            Save Clinical Orders
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Examining Doctor & Chief Complaint Context */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl border border-slate-200/80 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/60">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">CHIEF COMPLAINT:</span>
            <p className="font-semibold text-foreground text-xs mt-0.5">
              {selectedTriage?.chief_complaint || "No chief complaint recorded"}
            </p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Attending CMO / Examining Doctor</Label>
            <select
              value={formData.doctor_id || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  doctor_id: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="w-full h-8 text-xs rounded-lg border border-input bg-background px-2 font-medium"
            >
              <option value="">Select Doctor</option>
              {doctors.map((doc: any) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name} ({doc.specialization || "Emergency Medicine"})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Provisional Diagnosis */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Stethoscope className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            Provisional Clinical Diagnosis *
          </Label>
          <Input
            type="text"
            placeholder="e.g. Acute STEMI, Polytrauma with Blunt Abdominal Trauma, Status Epilepticus"
            value={formData.provisional_diagnosis ?? ""}
            onChange={(e) => setFormData({ ...formData, provisional_diagnosis: e.target.value })}
            className="h-10 text-xs font-semibold"
          />
        </div>

        {/* Rapid Emergency Interventions Chips */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Syringe className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              STAT Interventions Administered
            </Label>
            <span className="text-[10px] text-muted-foreground">Click chip to append</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {COMMON_EMERGENCY_INTERVENTIONS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => handleAddIntervention(item)}
                className="px-2 py-1 rounded-md text-[11px] font-medium border border-slate-200 bg-white hover:border-teal-500 hover:bg-teal-50 hover:text-teal-800 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-teal-950/40 dark:hover:text-teal-300 transition-colors cursor-pointer"
              >
                + {item}
              </button>
            ))}
          </div>

          <textarea
            rows={2}
            placeholder="IV fluids, emergency medications given, CPR details, splints, dressings..."
            value={formData.treatment_given ?? ""}
            onChange={(e) => setFormData({ ...formData, treatment_given: e.target.value })}
            className="w-full text-xs rounded-xl border border-input bg-background p-2.5 font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>

        {/* Detailed CMO Doctor Notes / Orders */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            CMO Clinical Observations & Nurse Orders
          </Label>
          <textarea
            rows={3}
            placeholder="e.g. Keep NPO, send STAT Troponin-I and CBC, call on-call Cardiologist, shift to ICCU once bed is ready."
            value={formData.doctor_notes ?? ""}
            onChange={(e) => setFormData({ ...formData, doctor_notes: e.target.value })}
            className="w-full text-xs rounded-xl border border-input bg-background p-2.5 font-sans focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>

        {/* Existing Clinical Notes History */}
        {selectedTriage?.clinical_notes && (
          <div className="space-y-1 pt-1 border-t border-border">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">
              PREVIOUS CLINICAL LOG ENTRIES:
            </span>
            <div className="max-h-32 overflow-y-auto p-2.5 rounded-xl border border-slate-200/80 bg-slate-100/50 dark:border-slate-800 dark:bg-slate-900/40 text-[11px] font-mono text-muted-foreground whitespace-pre-line">
              {selectedTriage.clinical_notes}
            </div>
          </div>
        )}
      </form>
    </FormContainer>
  )
}
