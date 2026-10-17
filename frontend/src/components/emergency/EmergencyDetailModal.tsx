import React from "react"
import { Scissors } from "lucide-react"

import { FormContainer } from "@/components/formContainer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { EmergencyTriage } from "@/types/emergency"

export interface EmergencyDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedTriage: EmergencyTriage | null
  onRushToOt?: (triage: EmergencyTriage) => void
}

export const EmergencyDetailModal: React.FC<EmergencyDetailModalProps> = ({
  open,
  onOpenChange,
  selectedTriage,
  onRushToOt,
}) => {
  return (
    <FormContainer
      open={open}
      onOpenChange={onOpenChange}
      title="Casualty Case File"
      description={`Triage #${selectedTriage?.triage_number}`}
      size="md"
      footer={
        <div className="flex items-center justify-between gap-2 w-full">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {selectedTriage && onRushToOt && (
            <Button
              size="sm"
              className="bg-purple-700 hover:bg-purple-800 text-white font-bold gap-1 text-xs"
              onClick={() => {
                onOpenChange(false)
                onRushToOt(selectedTriage)
              }}
            >
              <Scissors className="h-3.5 w-3.5" /> ⚡ Rush to OT
            </Button>
          )}
        </div>
      }
    >
      {selectedTriage && (
        <div className="space-y-3 text-xs">
          <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1.5">
            <div className="flex justify-between font-bold text-foreground">
              <span>{selectedTriage.patient_name}</span>
              <Badge
                className={
                  selectedTriage.priority_level === "red"
                    ? "bg-rose-600 text-white"
                    : selectedTriage.priority_level === "yellow"
                    ? "bg-amber-600 text-white"
                    : "bg-emerald-600 text-white"
                }
              >
                {selectedTriage.priority_level.toUpperCase()}
              </Badge>
            </div>
            <div className="text-[11px] text-muted-foreground">
              UHID: {selectedTriage.uhid || "Temporary"} • {selectedTriage.gender} •{" "}
              {selectedTriage.approximate_age} Years
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-muted-foreground block font-semibold text-[10px]">
              CHIEF COMPLAINT:
            </span>
            <p className="p-2 rounded bg-background border border-border text-foreground">
              {selectedTriage.chief_complaint || "N/A"}
            </p>
          </div>

          {selectedTriage.clinical_notes && (
            <div className="space-y-1">
              <span className="text-muted-foreground block font-semibold text-[10px]">
                CLINICAL NOTES:
              </span>
              <p className="p-2 rounded bg-background border border-border text-foreground font-mono text-[11px] whitespace-pre-line">
                {selectedTriage.clinical_notes}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-muted-foreground block text-[10px]">Brought By:</span>
              <span className="font-semibold text-foreground">
                {selectedTriage.brought_by || "Self"} ({selectedTriage.brought_by_contact || "N/A"})
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px]">Arrival Time:</span>
              <span className="font-semibold text-foreground">
                {new Date(selectedTriage.arrival_time).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </FormContainer>
  )
}
