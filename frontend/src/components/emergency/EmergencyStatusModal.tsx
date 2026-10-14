import React, { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { RefreshCw } from "lucide-react"

import { FormContainer } from "@/components/formContainer"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ipdService } from "@/services/ipdService"
import { emergencyService } from "@/services/emergencyService"
import { queryKeys } from "@/constants/queryKeys"
import type { EmergencyTriage, EmergencyStatus, TriageStatusUpdatePayload } from "@/types/emergency"

export interface EmergencyStatusModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedTriage: EmergencyTriage | null
  onSuccess?: () => void
}

export const EmergencyStatusModal: React.FC<EmergencyStatusModalProps> = ({
  open,
  onOpenChange,
  selectedTriage,
  onSuccess,
}) => {
  const queryClient = useQueryClient()
  const [statusUpdate, setStatusUpdate] = useState<TriageStatusUpdatePayload>({
    status: "stabilized",
    notes: "",
    ward_id: undefined,
    bed_id: undefined,
  })
  const [selectedWardId, setSelectedWardId] = useState<number | undefined>(undefined)

  const { data: wards = [] } = useQuery({
    queryKey: queryKeys.ipd.wards,
    queryFn: () => ipdService.getWards(),
    enabled: open && statusUpdate.status === "admitted_to_ipd",
  })

  const { data: availableBeds = [] } = useQuery({
    queryKey: queryKeys.ipd.availableBeds(selectedWardId),
    queryFn: () => ipdService.getAvailableBeds(selectedWardId),
    enabled: open && statusUpdate.status === "admitted_to_ipd" && !!selectedWardId,
  })

  const updateStatusMutation = useMutation({
    mutationFn: () => {
      if (!selectedTriage) throw new Error("No triage selected")
      return emergencyService.updateStatus(selectedTriage.id, statusUpdate)
    },
    onSuccess: (res) => {
      toast.success(
        `Triage #${res.triage_number} status updated to ${res.status.replace(/_/g, " ").toUpperCase()}`
      )
      queryClient.invalidateQueries({ queryKey: queryKeys.emergency.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.ipd.bedMatrix })
      onOpenChange(false)
      if (onSuccess) onSuccess()
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update clinical status")
    },
  })

  return (
    <FormContainer
      open={open}
      onOpenChange={onOpenChange}
      title="Update Casualty Clinical Status"
      description={`Triage #${selectedTriage?.triage_number} • Patient: ${selectedTriage?.patient_name}`}
      size="md"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => updateStatusMutation.mutate()}
            disabled={updateStatusMutation.isPending}
          >
            {updateStatusMutation.isPending && <RefreshCw className="h-4 w-4 animate-spin mr-1" />}
            Save Status Transition
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        <div>
          <Label>Target Status *</Label>
          <select
            value={statusUpdate.status}
            onChange={(e) =>
              setStatusUpdate({ ...statusUpdate, status: e.target.value as EmergencyStatus })
            }
            className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1 font-semibold"
          >
            <option value="under_treatment">🔴 Under ER Treatment (Active)</option>
            <option value="stabilized">🟢 Stabilized in Casualty</option>
            <option value="admitted_to_ipd">🏥 Admitted to Inpatient Ward (IPD)</option>
            <option value="transferred_external">🚑 Transferred to Higher Facility</option>
            <option value="discharged">✅ Discharged from Casualty</option>
            <option value="brought_dead">⬛ Brought Dead</option>
            <option value="expired">⬛ Expired in Casualty</option>
          </select>
        </div>

        {statusUpdate.status === "admitted_to_ipd" && !selectedTriage?.ipd_admission_id && (
          <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/5 space-y-3">
            <span className="font-semibold text-blue-700 dark:text-blue-300 block text-[11px]">
              🏥 Allocate Inpatient Ward & Bed
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Select Ward *</Label>
                <select
                  value={selectedWardId || ""}
                  onChange={(e) => {
                    const wid = e.target.value ? Number(e.target.value) : undefined
                    setSelectedWardId(wid)
                    setStatusUpdate((p) => ({ ...p, ward_id: wid, bed_id: undefined }))
                  }}
                  className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1"
                >
                  <option value="">Select Ward</option>
                  {wards.map((w: any) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.gender_type || "General"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Select Bed *</Label>
                <select
                  value={statusUpdate.bed_id || ""}
                  onChange={(e) =>
                    setStatusUpdate((p) => ({
                      ...p,
                      bed_id: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  disabled={!selectedWardId}
                  className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1"
                >
                  <option value="">
                    {selectedWardId ? "Select Available Bed" : "Choose Ward First"}
                  </option>
                  {availableBeds.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      Bed #{b.bed_number}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        <div>
          <Label>Clinical Transition Notes</Label>
          <textarea
            rows={3}
            value={statusUpdate.notes}
            onChange={(e) => setStatusUpdate({ ...statusUpdate, notes: e.target.value })}
            placeholder="e.g. Vitals normalized post IV fluids and oxygenation. Shifted to Ward 3."
            className="w-full text-xs rounded-md border border-input bg-background p-2.5 mt-1"
          />
        </div>
      </div>
    </FormContainer>
  )
}
