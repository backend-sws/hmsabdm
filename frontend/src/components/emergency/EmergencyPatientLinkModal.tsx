import React, { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { RefreshCw } from "lucide-react"

import { FormContainer } from "@/components/formContainer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { emergencyService } from "@/services/emergencyService"
import { queryKeys } from "@/constants/queryKeys"
import type { EmergencyTriage, LinkPatientPayload } from "@/types/emergency"

export interface EmergencyPatientLinkModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedTriage: EmergencyTriage | null
  onSuccess?: () => void
}

export const EmergencyPatientLinkModal: React.FC<EmergencyPatientLinkModalProps> = ({
  open,
  onOpenChange,
  selectedTriage,
  onSuccess,
}) => {
  const queryClient = useQueryClient()
  const [linkMode, setLinkMode] = useState<"lookup" | "demographics">("demographics")
  const [linkPayload, setLinkPayload] = useState<LinkPatientPayload>({
    uhid: "",
    name: "",
    mobile: "",
    gender: "M",
    dob: "",
    blood_group: "",
    abha_number: "",
    abha_address: "",
    id_proof_type: "aadhaar",
    id_proof_number: "",
    address: "",
  })

  const linkPatientMutation = useMutation({
    mutationFn: () => {
      if (!selectedTriage) throw new Error("No triage selected")
      return emergencyService.linkPatient(selectedTriage.id, linkPayload)
    },
    onSuccess: (res) => {
      toast.success(`Patient identity verified & linked to Triage #${res.triage_number}!`)
      queryClient.invalidateQueries({ queryKey: queryKeys.emergency.all })
      onOpenChange(false)
      if (onSuccess) onSuccess()
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to link patient identity")
    },
  })

  return (
    <FormContainer
      open={open}
      onOpenChange={onOpenChange}
      title="Post-Stabilization Patient Identity Linking"
      description={`Merge temporary casualty profile (Triage #${selectedTriage?.triage_number}) with verified KYC or ABHA demographics`}
      size="lg"
      footer={
        <div className="flex justify-between items-center w-full">
          <span className="text-[11px] text-muted-foreground">
            Upgrades temporary emergency record to full permanent patient
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => linkPatientMutation.mutate()}
              disabled={linkPatientMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {linkPatientMutation.isPending && <RefreshCw className="h-4 w-4 animate-spin mr-1" />}
              Confirm Identity Linking
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        <div className="flex rounded-lg border border-input p-0.5 bg-muted/30">
          <button
            onClick={() => setLinkMode("demographics")}
            className={`flex-1 py-1.5 rounded-md font-semibold text-xs ${
              linkMode === "demographics" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground"
            }`}
          >
            Verify Demographics / ABHA
          </button>
          <button
            onClick={() => setLinkMode("lookup")}
            className={`flex-1 py-1.5 rounded-md font-semibold text-xs ${
              linkMode === "lookup" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground"
            }`}
          >
            Merge to Existing Registered UHID
          </button>
        </div>

        {linkMode === "lookup" ? (
          <div className="space-y-3">
            <div>
              <Label>Existing Patient Permanent UHID *</Label>
              <Input
                value={linkPayload.uhid || ""}
                onChange={(e) => setLinkPayload({ ...linkPayload, uhid: e.target.value })}
                placeholder="e.g. UHID-2026-00042"
                className="mt-1 text-xs"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                All vitals, orders, and triage records will be merged under this registered patient.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Verified Full Name *</Label>
                <Input
                  value={linkPayload.name}
                  onChange={(e) => setLinkPayload({ ...linkPayload, name: e.target.value })}
                  placeholder="Official legal name"
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label>Contact Mobile Number *</Label>
                <Input
                  value={linkPayload.mobile}
                  onChange={(e) => setLinkPayload({ ...linkPayload, mobile: e.target.value })}
                  placeholder="10-digit mobile"
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Gender</Label>
                <select
                  value={linkPayload.gender}
                  onChange={(e) => setLinkPayload({ ...linkPayload, gender: e.target.value as any })}
                  className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1"
                >
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                </select>
              </div>

              <div>
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={linkPayload.dob || ""}
                  onChange={(e) => setLinkPayload({ ...linkPayload, dob: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label>Blood Group</Label>
                <select
                  value={linkPayload.blood_group || ""}
                  onChange={(e) => setLinkPayload({ ...linkPayload, blood_group: e.target.value })}
                  className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1"
                >
                  <option value="">Unknown</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>ABHA Number (14 Digits)</Label>
                <Input
                  value={linkPayload.abha_number || ""}
                  onChange={(e) => setLinkPayload({ ...linkPayload, abha_number: e.target.value })}
                  placeholder="XX-XXXX-XXXX-XXXX"
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label>ABHA Address / Health ID</Label>
                <Input
                  value={linkPayload.abha_address || ""}
                  onChange={(e) => setLinkPayload({ ...linkPayload, abha_address: e.target.value })}
                  placeholder="username@abdm"
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Government ID Proof Type</Label>
                <select
                  value={linkPayload.id_proof_type || "aadhaar"}
                  onChange={(e) => setLinkPayload({ ...linkPayload, id_proof_type: e.target.value })}
                  className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1"
                >
                  <option value="aadhaar">Aadhaar Card</option>
                  <option value="pan">PAN Card</option>
                  <option value="voter_id">Voter ID</option>
                  <option value="passport">Passport</option>
                  <option value="driving_license">Driving License</option>
                </select>
              </div>

              <div>
                <Label>ID Document Number</Label>
                <Input
                  value={linkPayload.id_proof_number || ""}
                  onChange={(e) => setLinkPayload({ ...linkPayload, id_proof_number: e.target.value })}
                  placeholder="e.g. 1234 5678 9012"
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div>
              <Label>Permanent Address</Label>
              <Input
                value={linkPayload.address || ""}
                onChange={(e) => setLinkPayload({ ...linkPayload, address: e.target.value })}
                placeholder="House No, Street, City, State, PIN"
                className="mt-1 text-xs"
              />
            </div>
          </div>
        )}
      </div>
    </FormContainer>
  )
}
