import React, { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { CheckCircle2 } from "lucide-react"

import { FormContainer } from "@/components/formContainer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

import { ipdService } from "@/services/ipdService"
import { queryKeys } from "@/constants/queryKeys"
import type { SettleDischargePayload } from "@/types/ipd"

interface CentralSettlementModalProps {
  isOpen: boolean
  onClose: () => void
  admissionId: number | null
  onSettledSuccess: (invoiceId: number, admissionId: number) => void
}

export const CentralSettlementModal: React.FC<CentralSettlementModalProps> = ({
  isOpen,
  onClose,
  admissionId,
  onSettledSuccess,
}) => {
  const queryClient = useQueryClient()

  // 1. Fetch pre-discharge estimate
  const {
    data: estimate,
    isLoading: estimateLoading,
  } = useQuery({
    queryKey: queryKeys.ipd.dischargeEstimate(admissionId || 0),
    queryFn: () => ipdService.getDischargeEstimate(admissionId!),
    enabled: isOpen && !!admissionId,
  })

  // Form states
  const [discountAmount, setDiscountAmount] = useState<number>(0)
  const [discountReason, setDiscountReason] = useState<string>("")
  const [insuranceApproved, setInsuranceApproved] = useState<number>(0)
  const [tpaClaimNumber, setTpaClaimNumber] = useState<string>("")
  const [paymentMethod, setPaymentMethod] = useState<string>("cash")
  const [amountPaid, setAmountPaid] = useState<number>(0)
  const [dischargeType, setDischargeType] = useState<string>("normal")

  // Auto calculate net payable
  const gross = estimate?.financials?.gross_amount ?? 0
  const advance = estimate?.financials?.advance_deposit_paid ?? 0
  const tax = estimate?.financials?.tax_amount ?? 0
  const calculatedNet = Math.max(0, gross + tax - discountAmount)
  const advanceAdjusted = Math.min(advance, calculatedNet)
  const netDueAfterAdvance = Math.max(0, calculatedNet - advanceAdjusted - insuranceApproved)

  useEffect(() => {
    if (estimate) {
      setAmountPaid(netDueAfterAdvance)
    }
  }, [estimate, discountAmount, insuranceApproved])

  const settleMutation = useMutation({
    mutationFn: () => {
      if (!admissionId) throw new Error("No admission selected")

      const payload: SettleDischargePayload = {
        discharge_type: dischargeType as any,
        discount_amount: Number(discountAmount) || 0,
        discount_reason: discountReason || undefined,
        insurance_approved_amount: Number(insuranceApproved) || 0,
        tpa_claim_number: tpaClaimNumber || undefined,
        amount_paid: Number(amountPaid) || 0,
        payment_method: paymentMethod,
        mark_bed_cleaning: true,
      }

      return ipdService.settleDischarge(admissionId, payload)
    },
    onSuccess: (res) => {
      toast.success("Bill settled, bed freed, and Gate Pass generated successfully!")
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.ipd.all })
      const invoiceId = res?.invoice?.id
      if (invoiceId && admissionId) {
        onSettledSuccess(invoiceId, admissionId)
      }
      onClose()
    },
    onError: (err: any) => {
      toast.error(err?.message || "Settlement failed")
    },
  })

  return (
    <FormContainer
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title="Cashier Inpatient Final Bill Settlement"
      description={`Discharge clearance & final invoice settlement for IPD #${estimate?.ipd_number || "..."}`}
      size="lg"
      footer={
        <div className="flex justify-between items-center w-full">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            onClick={() => settleMutation.mutate()}
            disabled={settleMutation.isPending || estimateLoading}
          >
            <CheckCircle2 className="h-4 w-4" />
            {settleMutation.isPending ? "Finalizing Invoice..." : "Confirm Settlement & Issue Gate Pass"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-xs font-sans">
        {estimateLoading ? (
          <div className="py-16 text-center text-muted-foreground">
            Calculating running ledger items, room rent, and advance deposits...
          </div>
        ) : estimate ? (
          <>
            {/* Patient Header Card */}
            <div className="p-3 bg-muted/40 border rounded-xl flex items-center justify-between">
              <div>
                <div className="font-bold text-sm text-foreground flex items-center gap-2">
                  {estimate.patient?.name}
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {estimate.patient?.uhid}
                  </Badge>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  IPD: <strong className="text-foreground">{estimate.ipd_number}</strong> • Ward:{" "}
                  {estimate.ward?.name} • Bed: {estimate.bed?.bed_number}
                </div>
              </div>
              <Badge className="bg-sky-500/15 text-sky-700 dark:text-sky-400">
                {estimate.unbilled_items_count} Unbilled Charges
              </Badge>
            </div>

            {/* Financial Ledger Calculation Matrix */}
            <div className="p-3 border rounded-xl bg-card space-y-2">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-muted/30 rounded-lg border">
                  <span className="text-[10px] text-muted-foreground block uppercase font-bold">Gross Charges</span>
                  <span className="font-mono font-bold text-sm">₹{gross.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block uppercase font-bold">Advance Paid</span>
                  <span className="font-mono font-bold text-sm text-emerald-700 dark:text-emerald-400">
                    -₹{advance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 block uppercase font-bold">Net Balance Due</span>
                  <span className="font-mono font-extrabold text-sm text-amber-700 dark:text-amber-400">
                    ₹{netDueAfterAdvance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Concession & Insurance Adjustments */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Hospital Concession / Discount (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  value={discountAmount || ""}
                  onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                  placeholder="0.00"
                  className="mt-1 text-xs font-mono"
                />
              </div>

              <div>
                <Label className="text-xs">Discount Reason / Approval Note</Label>
                <Input
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  placeholder="e.g. Approved by Medical Superintendent"
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs">TPA / Insurance Approved Amount (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  value={insuranceApproved || ""}
                  onChange={(e) => setInsuranceApproved(Number(e.target.value) || 0)}
                  placeholder="0.00"
                  className="mt-1 text-xs font-mono"
                />
              </div>

              <div>
                <Label className="text-xs">TPA Claim # / Pre-Auth Sanction</Label>
                <Input
                  value={tpaClaimNumber}
                  onChange={(e) => setTpaClaimNumber(e.target.value)}
                  placeholder="e.g. PREAUTH-STAR-998822"
                  className="mt-1 text-xs font-mono"
                />
              </div>
            </div>

            {/* Collection Amount & Mode */}
            <div className="p-3 bg-muted/30 border rounded-xl space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Payment Mode *</Label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1 font-semibold"
                  >
                    <option value="cash">Cash (Physical Currency)</option>
                    <option value="upi">UPI / Dynamic QR Code</option>
                    <option value="card">Debit / Credit Card (POS)</option>
                    <option value="bank_transfer">Bank Transfer / NEFT</option>
                    <option value="cheque">Cheque / Demand Draft</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Amount Collecting Now (₹) *</Label>
                  <Input
                    type="number"
                    min="0"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(Number(e.target.value) || 0)}
                    className="mt-1 text-sm font-bold font-mono text-emerald-600"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-1">
                <span>Discharge Category:</span>
                <select
                  value={dischargeType}
                  onChange={(e) => setDischargeType(e.target.value)}
                  className="text-xs rounded border border-input bg-background px-2 py-1 font-medium"
                >
                  <option value="normal">Normal Medical Discharge</option>
                  <option value="lama">LAMA (Against Medical Advice)</option>
                  <option value="transfer">Transfer to Higher Facility</option>
                  <option value="referred">Referred Out</option>
                  <option value="death">Deceased</option>
                </select>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </FormContainer>
  )
}
