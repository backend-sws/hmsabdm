import React, { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Printer, RefreshCw, CheckCircle2, ShieldCheck } from "lucide-react"

import { FormContainer } from "@/components/formContainer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { emergencyService } from "@/services/emergencyService"
import { queryKeys } from "@/constants/queryKeys"
import type { EmergencyTriage, EmergencyDepositPayload, EmergencyDepositReceiptData } from "@/types/emergency"

export interface EmergencyDepositModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedTriage: EmergencyTriage | null
  onSuccess?: () => void
}

export const EmergencyDepositModal: React.FC<EmergencyDepositModalProps> = ({
  open,
  onOpenChange,
  selectedTriage,
  onSuccess,
}) => {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<EmergencyDepositPayload>({
    amount: 2000,
    payment_method: "cash",
    transaction_ref: "",
  })
  const [receiptData, setReceiptData] = useState<EmergencyDepositReceiptData | null>(null)

  const depositMutation = useMutation({
    mutationFn: () => {
      if (!selectedTriage) throw new Error("No triage selected")
      if (!formData.amount || formData.amount <= 0) throw new Error("Please enter a valid deposit amount")
      return emergencyService.collectDeposit(selectedTriage.id, formData)
    },
    onSuccess: (res) => {
      setReceiptData(res)
      toast.success(`Emergency deposit of ₹${res.amount} collected! Receipt #${res.receipt_number}`)
      queryClient.invalidateQueries({ queryKey: queryKeys.emergency.all })
      queryClient.invalidateQueries({ queryKey: ["billing"] })
      onSuccess?.()
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to collect emergency deposit")
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    depositMutation.mutate()
  }

  const handleClose = () => {
    setReceiptData(null)
    setFormData({ amount: 2000, payment_method: "cash", transaction_ref: "" })
    onOpenChange(false)
  }

  return (
    <FormContainer
      open={open}
      onOpenChange={handleClose}
      title={receiptData ? "Emergency Deposit Receipt" : "Collect Emergency Advance Deposit"}
      description={`Triage #${selectedTriage?.triage_number} • Patient: ${selectedTriage?.patient_name}`}
      size="md"
      footer={
        <div className="flex justify-between items-center w-full">
          <Button variant="outline" size="sm" onClick={handleClose}>
            {receiptData ? "Done" : "Cancel"}
          </Button>
          {receiptData ? (
            <Button
              size="sm"
              onClick={() => window.print()}
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold gap-1.5"
            >
              <Printer className="h-4 w-4" /> Print Deposit Slip
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={depositMutation.isPending}
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold gap-1.5"
            >
              {depositMutation.isPending && <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" />}
              Collect ₹{formData.amount}
            </Button>
          )}
        </div>
      }
    >
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-deposit-slip, #printable-deposit-slip * {
            visibility: visible;
          }
          #printable-deposit-slip {
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

      {receiptData ? (
        <div
          id="printable-deposit-slip"
          className="p-5 border-2 border-dashed border-teal-500/40 rounded-2xl bg-teal-50/20 dark:bg-teal-950/20 space-y-3 text-xs font-mono"
        >
          {/* Receipt Header */}
          <div className="text-center pb-2.5 border-b border-border">
            <h3 className="font-bold text-sm text-foreground uppercase tracking-wider">
              {receiptData.hospital.name}
            </h3>
            <p className="text-[10px] text-muted-foreground uppercase">
              Emergency Admission & Casualty Advance Voucher
            </p>
            <div className="inline-block mt-1 px-2.5 py-0.5 bg-teal-600 text-white rounded text-[10px] font-bold">
              RECEIPT: {receiptData.receipt_number}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs border-b border-border pb-2.5">
            <div>
              <span className="text-muted-foreground block text-[10px]">PATIENT NAME:</span>
              <span className="font-bold text-foreground">{receiptData.patient.name}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px]">UHID / TRIAGE:</span>
              <span className="font-bold">{receiptData.patient.uhid || receiptData.triage_number}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px]">PAYMENT MODE:</span>
              <span className="font-bold uppercase text-teal-600 dark:text-teal-400">
                {receiptData.payment_method}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px]">TRANSACTION REF:</span>
              <span className="font-bold">{receiptData.transaction_ref || "Direct Counter"}</span>
            </div>
          </div>

          {/* Amount Box */}
          <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-teal-700 dark:text-teal-300 font-bold block">
                AMOUNT RECEIVED:
              </span>
              <span className="text-lg font-black text-teal-800 dark:text-teal-200">
                ₹{Number(receiptData.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <CheckCircle2 className="h-6 w-6 text-teal-600" />
          </div>

          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
            <span>Collected by: {receiptData.collected_by}</span>
            <span>{new Date(receiptData.collected_at).toLocaleString()}</span>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Quick preset amount buttons */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Quick Preset Amount</Label>
            <div className="grid grid-cols-4 gap-1.5">
              {[1000, 2000, 5000, 10000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setFormData({ ...formData, amount: amt })}
                  className={`py-1.5 rounded-lg border text-center font-bold text-xs transition cursor-pointer ${
                    formData.amount === amt
                      ? "border-teal-500 bg-teal-50 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300"
                      : "border-input bg-background hover:bg-muted"
                  }`}
                >
                  ₹{amt.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Deposit Amount (₹) *</Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground font-bold">₹</span>
              <Input
                type="number"
                min="1"
                placeholder="2000"
                value={formData.amount || ""}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                className="pl-7 h-10 font-bold text-sm"
                required
              />
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Payment Method</Label>
            <select
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as any })}
              className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs font-medium"
            >
              <option value="cash">💵 Cash at Emergency Counter</option>
              <option value="upi">📱 UPI / QR Code</option>
              <option value="card">💳 Credit / Debit Card</option>
              <option value="net_banking">🏦 Net Banking / Bank Transfer</option>
            </select>
          </div>

          {/* Reference */}
          {formData.payment_method !== "cash" && (
            <div className="space-y-1">
              <Label className="text-xs">Transaction / UTR Reference</Label>
              <Input
                type="text"
                placeholder="e.g. UPI/123456789 or Card Auth Code"
                value={formData.transaction_ref ?? ""}
                onChange={(e) => setFormData({ ...formData, transaction_ref: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
          )}

          <div className="p-3 rounded-xl border border-border/80 bg-muted/20 text-[11px] text-muted-foreground flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-teal-600 shrink-0" />
            <span>
              This deposit will be credited instantly to the casualty billing ledger and can be adjusted against final discharge bills.
            </span>
          </div>
        </form>
      )}
    </FormContainer>
  )
}
