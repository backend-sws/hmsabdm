import React, { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { X, AlertTriangle, AlertOctagon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { labService } from "@/services/labService"
import type { LabOrder } from "@/types/lab"

interface SampleRejectionModalProps {
  isOpen?: boolean
  order: LabOrder
  onClose: () => void
  onSuccess: () => void
}

const COMMON_REJECTION_REASONS = [
  "Hemolyzed Specimen",
  "Clotted Specimen (Microclots / Fibrin)",
  "Insufficient Volume (QNS - Quantity Not Sufficient)",
  "Incorrect Specimen Container / Vial Type",
  "Specimen Leaked / Broken in Transit",
  "Lipemic / Turbid Interfering Specimen",
  "Mislabeled / Barcode Discrepancy",
]

export const SampleRejectionModal: React.FC<SampleRejectionModalProps> = ({
  isOpen = true,
  order,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient()
  const [selectedReason, setSelectedReason] = useState(COMMON_REJECTION_REASONS[0])
  const [notes, setNotes] = useState("")

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [onClose])

  const rejectMutation = useMutation({
    mutationFn: () => labService.rejectSample(order.id, selectedReason, notes),
    onSuccess: () => {
      toast.warning(`Sample marked as rejected: ${selectedReason}. Recollection can now be raised.`)
      queryClient.invalidateQueries({ queryKey: ["lab", "orders"] })
      onSuccess()
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to reject sample.")
    },
  })

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-hidden bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-[100] flex max-w-full pl-6 sm:pl-10">
        <div className="w-screen max-w-md md:max-w-lg bg-card border-l border-destructive/30 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300 ease-out">
          {/* Header */}
        <div className="px-5 py-4 bg-destructive/10 border-b border-destructive/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-destructive/20 text-destructive">
              <AlertOctagon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-destructive dark:text-red-400">
                Reject Laboratory Specimen
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Order #{order.order_number} • Patient: {order.patient?.name} ({order.patient?.uhid})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-xs">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong>Quality Control Notice:</strong> Rejecting a specimen marks the order as compromised. A priority recollection token can immediately be dispatched for the phlebotomy queue.
            </div>
          </div>

          {/* Reason Selection */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-foreground">
              Primary Rejection Cause:
            </Label>
            <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
              {COMMON_REJECTION_REASONS.map((reason) => (
                <label
                  key={reason}
                  onClick={() => setSelectedReason(reason)}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                    selectedReason === reason
                      ? "border-destructive bg-destructive/5 font-bold text-destructive"
                      : "border-border hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <input
                    type="radio"
                    name="rejectionReason"
                    checked={selectedReason === reason}
                    onChange={() => setSelectedReason(reason)}
                    className="text-destructive focus:ring-destructive"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Phlebotomy / Laboratory Remarks */}
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs font-semibold text-foreground">
              Technician Quality Observation Notes (Optional):
            </Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Specimen visibly hemolyzed on centrifuge at 3000 RPM. Cannot process Potassium or LDH."
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-input bg-background text-xs focus:ring-2 focus:ring-destructive/20 focus:outline-hidden resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-muted/40 border-t border-border flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={rejectMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => rejectMutation.mutate()}
            disabled={rejectMutation.isPending}
            className="text-xs font-bold gap-1.5 h-8.5 px-4"
          >
            <AlertOctagon className="h-3.5 w-3.5" />
            {rejectMutation.isPending ? "Rejecting Sample..." : "Confirm Sample Rejection"}
          </Button>
        </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
