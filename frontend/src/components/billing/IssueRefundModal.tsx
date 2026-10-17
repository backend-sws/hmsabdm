import React, { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Printer, RotateCcw } from "lucide-react"

import { FormContainer } from "@/components/formContainer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

import { billingService } from "@/services/billingService"
import { queryKeys } from "@/constants/queryKeys"
import type { CreditNoteReceiptData } from "@/types/billing"

interface IssueRefundModalProps {
  isOpen: boolean
  onClose: () => void
  patientId?: number
  patientName?: string
  uhid?: string
  defaultAmount?: number
  encounterType?: "ipd" | "opd" | "emergency"
  encounterId?: number
}

export const IssueRefundModal: React.FC<IssueRefundModalProps> = ({
  isOpen,
  onClose,
  patientId,
  patientName,
  uhid,
  defaultAmount = 0,
  encounterType = "ipd",
  encounterId,
}) => {
  const queryClient = useQueryClient()

  const [amount, setAmount] = useState<number>(defaultAmount)
  const [reason, setReason] = useState<string>("Excess Advance Deposit Balance Refund Upon Bill Clearance")
  const [refundMethod, setRefundMethod] = useState<"cash" | "upi" | "bank_transfer">("cash")
  const [reference, setReference] = useState<string>("")

  const [receiptData, setReceiptData] = useState<CreditNoteReceiptData | null>(null)

  const refundMutation = useMutation({
    mutationFn: () => {
      if (!patientId) throw new Error("Patient not specified")
      if (!amount || amount <= 0) throw new Error("Please enter a valid refund amount")

      return billingService.issueRefund({
        patient_id: patientId,
        amount: Number(amount),
        reason,
        refund_method: refundMethod,
        transaction_reference: reference || undefined,
        encounter_type: encounterType,
        encounter_id: encounterId,
      })
    },
    onSuccess: (res) => {
      toast.success(`Refund voucher of ₹${amount.toLocaleString("en-IN")} issued successfully!`)
      setReceiptData(res)
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.all })
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to issue refund")
    },
  })

  const handleClose = () => {
    setReceiptData(null)
    onClose()
  }

  return (
    <FormContainer
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose()
      }}
      title={receiptData ? "Credit Note / Refund Voucher" : "Issue Patient Refund"}
      description={
        receiptData
          ? `Credit Note #${receiptData.credit_note_number}`
          : `Disburse excess payment or concession refund to patient`
      }
      size="md"
      footer={
        receiptData ? (
          <div className="flex justify-between items-center w-full">
            <Button variant="outline" size="sm" onClick={handleClose}>
              Close
            </Button>
            <Button size="sm" className="gap-2 bg-slate-900 text-white" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print Credit Note Slip
            </Button>
          </div>
        ) : (
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" size="sm" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="gap-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold"
              onClick={() => refundMutation.mutate()}
              disabled={refundMutation.isPending || !amount || amount <= 0}
            >
              <RotateCcw className="h-4 w-4" />
              {refundMutation.isPending ? "Issuing..." : "Confirm & Issue Refund"}
            </Button>
          </div>
        )
      }
    >
      <div className="space-y-4 text-xs font-sans">
        {!receiptData ? (
          <>
            {/* Patient Header */}
            <div className="p-3 bg-muted/40 border rounded-xl flex items-center justify-between">
              <div>
                <span className="font-bold text-sm text-foreground block">{patientName || "Patient"}</span>
                <span className="font-mono text-muted-foreground text-[11px]">UHID: {uhid || "N/A"}</span>
              </div>
              <Badge variant="outline" className="text-[10px] uppercase font-mono">
                {encounterType} Encounter
              </Badge>
            </div>

            {/* Refund Amount */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Refund Amount (₹) *</Label>
              <Input
                type="number"
                min="1"
                value={amount || ""}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
                placeholder="0.00"
                className="text-sm font-bold font-mono text-rose-600"
              />
            </div>

            {/* Refund Method */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Disbursement Mode *</Label>
                <select
                  value={refundMethod}
                  onChange={(e) => setRefundMethod(e.target.value as any)}
                  className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1 font-semibold"
                >
                  <option value="cash">Cash Counter Return</option>
                  <option value="upi">UPI / Instant Bank Transfer</option>
                  <option value="bank_transfer">Direct Bank NEFT / RTGS</option>
                </select>
              </div>

              <div>
                <Label className="text-xs">Txn Ref / Voucher No.</Label>
                <Input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. UPI-REF-441100"
                  className="mt-1 text-xs font-mono"
                />
              </div>
            </div>

            {/* Reason */}
            <div>
              <Label className="text-xs font-semibold">Audit Reason *</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Audit reason for refunding amount..."
                className="mt-1 text-xs"
              />
            </div>
          </>
        ) : (
          /* Printable Credit Note */
          <div className="p-5 border-2 border-slate-900 rounded-2xl bg-white text-slate-900 space-y-3 print:p-0 print:border-none">
            <div className="text-center border-b pb-2 space-y-0.5">
              <div className="font-extrabold text-sm uppercase tracking-wider text-slate-950">
                {receiptData.hospital.name}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                ABDM HIP ID: {receiptData.hospital.abdm_hip_id} • CREDIT NOTE VOUCHER
              </div>
            </div>

            <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border text-xs">
              <div>
                <span className="text-[9px] text-slate-500 uppercase block">CREDIT NOTE #</span>
                <span className="font-mono font-bold">{receiptData.credit_note_number}</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-slate-500 uppercase block">DATE</span>
                <span>{new Date(receiptData.refund_date).toLocaleString()}</span>
              </div>
            </div>

            <div className="p-2 border rounded-lg bg-slate-50 text-xs">
              <span className="text-[9px] text-slate-500 uppercase block">REFUNDED TO</span>
              <span className="font-bold">{receiptData.patient.name}</span>
              <span className="font-mono text-slate-600 block text-[11px]">UHID: {receiptData.patient.uhid}</span>
            </div>

            <div className="border border-slate-900 rounded-xl p-3 text-center bg-slate-50 space-y-1">
              <div className="text-[10px] text-slate-500 uppercase">AMOUNT REFUNDED</div>
              <div className="font-mono font-extrabold text-xl text-slate-950">
                ₹{receiptData.amount_refunded.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] italic text-slate-600 font-medium">({receiptData.amount_in_words})</div>
              <div className="text-[10px] text-slate-500">
                Mode: <strong className="uppercase">{receiptData.refund_method}</strong> • Reason: {receiptData.reason}
              </div>
            </div>

            <div className="pt-6 border-t flex justify-between items-end text-xs text-slate-600">
              <div>
                <div className="border-t border-slate-400 w-32 pt-1 text-center text-[10px]">
                  Recipient's Signature
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-slate-900">{receiptData.authorized_by}</div>
                <div className="border-t border-slate-400 w-36 pt-1 text-center text-[10px] mt-1">
                  Billing Accounts Officer
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </FormContainer>
  )
}
