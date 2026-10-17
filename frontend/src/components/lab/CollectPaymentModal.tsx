import React, { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  DollarSign,
  Banknote,
  QrCode,
  CreditCard,
  Split,
  CheckCircle2,
} from "lucide-react"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { labService } from "@/services/labService"
import { collectLabPaymentSchema } from "@/schemas/lab.schema"
import type { LabOrder } from "@/types/lab"

export interface CollectPaymentModalProps {
  order: LabOrder
  open?: boolean
  onClose: () => void
  onSuccess: () => void
}

export const CollectPaymentModal: React.FC<CollectPaymentModalProps> = ({
  order,
  open = true,
  onClose,
  onSuccess,
}) => {
  const inv = order.invoice
  const gross =
    inv?.gross_amount ??
    order.items?.reduce((s, it) => s + parseFloat(String(it.rate || (it as any).price || 0)), 0) ??
    0
  const discount = inv?.discount_amount ?? 0
  const net = inv?.net_amount ?? Math.max(0, gross - discount)
  const paid = inv?.paid_amount ?? (inv?.payment_status === "paid" ? net : 0)
  const due = inv?.balance_due ?? Math.max(0, net - paid)

  const [amount, setAmount] = useState(String(due > 0 ? due : 0))
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "card" | "split">("cash")
  const [reference, setReference] = useState("")

  // Single mode UPI / Card inputs
  const [singleUpiUtr, setSingleUpiUtr] = useState("")
  const [singleCardRef, setSingleCardRef] = useState("")

  // Split mode inputs
  const [splitCashAmount, setSplitCashAmount] = useState("")
  const [splitUpiAmount, setSplitUpiAmount] = useState("")
  const [splitUpiUtr, setSplitUpiUtr] = useState("")

  const toCollect = Math.max(0, parseFloat(amount) || 0)
  const splitCash = Math.max(0, parseFloat(splitCashAmount) || 0)
  const splitUpi = Math.max(0, parseFloat(splitUpiAmount) || 0)
  const splitTotal = Math.round((splitCash + splitUpi) * 100) / 100
  const splitDiff = Math.round((toCollect - splitTotal) * 100) / 100

  const handleAllocateRemainder = (target: "cash" | "upi") => {
    if (target === "upi") {
      const cur = parseFloat(splitUpiAmount) || 0
      const updated = Math.max(0, Math.round((cur + splitDiff) * 100) / 100)
      setSplitUpiAmount(String(updated))
    } else {
      const cur = parseFloat(splitCashAmount) || 0
      const updated = Math.max(0, Math.round((cur + splitDiff) * 100) / 100)
      setSplitCashAmount(String(updated))
    }
  }

  const collectMutation = useMutation({
    mutationFn: () => {
      const toCollectVal = parseFloat(amount) || 0
      if (toCollectVal <= 0) {
        throw new Error("Amount to collect must be greater than 0.")
      }

      let paymentBreakdown: Array<{ method: string; amount: number; ref?: string }> | undefined = undefined

      if (paymentMethod === "split") {
        paymentBreakdown = []
        if (splitCash > 0) {
          paymentBreakdown.push({ method: "cash", amount: splitCash })
        }
        if (splitUpi > 0) {
          paymentBreakdown.push({
            method: "upi",
            amount: splitUpi,
            ref: splitUpiUtr.trim() || undefined,
          })
        }

        if (paymentBreakdown.length === 0) {
          throw new Error("Please enter split payment amount for Cash or UPI.")
        }
        if (Math.abs(splitDiff) > 0.05) {
          throw new Error(
            `Split total (₹${splitTotal.toFixed(2)}) must match Amount to Collect (₹${toCollectVal.toFixed(2)}).`
          )
        }
      } else if (paymentMethod === "upi") {
        if (singleUpiUtr.trim()) {
          paymentBreakdown = [
            {
              method: "upi",
              amount: toCollectVal,
              ref: singleUpiUtr.trim(),
            },
          ]
        }
      } else if (paymentMethod === "card") {
        if (singleCardRef.trim()) {
          paymentBreakdown = [
            {
              method: "card",
              amount: toCollectVal,
              ref: singleCardRef.trim(),
            },
          ]
        }
      }

      // Validate with Zod Schema
      const validation = collectLabPaymentSchema.safeParse({
        amount: toCollectVal,
        payment_method: paymentMethod,
        transaction_reference: (
          paymentMethod === "upi"
            ? singleUpiUtr.trim()
            : paymentMethod === "card"
            ? singleCardRef.trim()
            : reference.trim()
        ) || undefined,
        utr_number: (
          paymentMethod === "upi"
            ? singleUpiUtr.trim()
            : paymentMethod === "split"
            ? splitUpiUtr.trim()
            : undefined
        ) || undefined,
        payment_breakdown: paymentBreakdown,
      })

      if (!validation.success) {
        throw new Error(validation.error.issues[0]?.message || "Invalid payment details")
      }

      return labService.collectPayment(order.id, {
        amount: toCollectVal,
        payment_method: paymentMethod,
        transaction_reference: (
          paymentMethod === "upi"
            ? singleUpiUtr.trim()
            : paymentMethod === "card"
            ? singleCardRef.trim()
            : reference.trim()
        ) || undefined,
        utr_number: (
          paymentMethod === "upi"
            ? singleUpiUtr.trim()
            : paymentMethod === "split"
            ? splitUpiUtr.trim()
            : undefined
        ) || undefined,
        payment_breakdown: paymentBreakdown,
      })
    },
    onSuccess: () => {
      toast.success("Payment collected and invoice updated successfully!")
      onSuccess()
      onClose()
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to collect payment.")
    },
  })

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Collect Due Balance</DialogTitle>
              <p className="text-xs text-muted-foreground">
                Order #{order.order_number} • {order.patient?.name}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-3 bg-muted/40 rounded-xl space-y-1.5 text-xs">
          <div className="flex justify-between text-muted-foreground">
            <span>Net Bill Amount:</span>
            <span className="font-mono font-bold text-foreground">
              ₹{parseFloat(String(net)).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Already Paid:</span>
            <span className="font-mono font-bold text-emerald-600">
              ₹{parseFloat(String(paid)).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-xs font-bold border-t border-border pt-1.5">
            <span className="text-destructive font-semibold">Outstanding Due:</span>
            <span className="font-mono text-destructive font-black">
              ₹{parseFloat(String(due)).toFixed(2)}
            </span>
          </div>
        </div>

        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs font-bold text-foreground">Amount to Collect (₹)</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 h-9 font-mono font-bold text-sm"
            />
          </div>

          <div>
            <Label className="text-xs font-bold text-foreground">Payment Method</Label>
            <div className="grid grid-cols-4 gap-2 mt-1">
              {[
                { id: "cash", label: "Cash", icon: Banknote },
                { id: "upi", label: "UPI / QR", icon: QrCode },
                { id: "card", label: "Card", icon: CreditCard },
                { id: "split", label: "Split / Multi", icon: Split },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id as any)}
                  className={`py-2 px-1.5 rounded-lg border text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    paymentMethod === m.id
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-background border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <m.icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* UPI Mode -> Single UTR Input */}
          {paymentMethod === "upi" && (
            <div className="p-2.5 rounded-lg border border-blue-500/20 bg-blue-500/5 space-y-1 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-bold text-foreground">
                  UPI UTR / Reference No. (Optional)
                </Label>
                <span className="text-[10px] text-muted-foreground">12-digit UTR or Txn ID</span>
              </div>
              <Input
                placeholder="Enter 12-digit UTR No. (e.g. 428712345678 / GPay Ref)..."
                value={singleUpiUtr}
                onChange={(e) => setSingleUpiUtr(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>
          )}

          {/* Card Mode -> Single Card Ref Input */}
          {paymentMethod === "card" && (
            <div className="p-2.5 rounded-lg border border-border/80 bg-background/80 space-y-1 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-bold text-foreground">
                  Card Last 4 Digits / POS Auth Approval Code (Optional)
                </Label>
                <span className="text-[10px] text-muted-foreground">e.g. 4321 / Auth 8912</span>
              </div>
              <Input
                placeholder="Enter Card Last 4 Digits / POS Ref..."
                value={singleCardRef}
                onChange={(e) => setSingleCardRef(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>
          )}

          {/* Cash Mode -> Reference / Receipt Note */}
          {paymentMethod === "cash" && (
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">
                Transaction Reference / Receipt Note (Optional)
              </Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Cash receipt number, note, etc..."
                className="mt-1 h-8 text-xs font-mono"
              />
            </div>
          )}

          {/* Split Mode -> Multi-Mode Breakdown Fields */}
          {paymentMethod === "split" && (
            <div className="p-3 rounded-lg border border-primary/20 bg-muted/30 space-y-2.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
                <span className="text-[11px] font-bold text-primary flex items-center gap-1.5">
                  <Split className="h-3.5 w-3.5" />
                  Split Payment Breakdown
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Target: <strong className="text-foreground">₹{toCollect.toFixed(2)}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Cash Part */}
                <div className="p-2.5 rounded-md border border-border bg-card space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold text-foreground flex items-center gap-1">
                      <Banknote className="h-3 w-3 text-emerald-600" />
                      Cash Amount (₹)
                    </Label>
                    {splitDiff !== 0 && (
                      <button
                        type="button"
                        onClick={() => handleAllocateRemainder("cash")}
                        className="text-[9px] font-bold text-primary hover:underline cursor-pointer"
                      >
                        Auto-Fill Balance
                      </button>
                    )}
                  </div>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={splitCashAmount}
                    onChange={(e) => setSplitCashAmount(e.target.value)}
                    className="h-8 text-xs font-mono font-bold"
                  />
                </div>

                {/* UPI Part + UTR */}
                <div className="p-2.5 rounded-md border border-border bg-card space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold text-foreground flex items-center gap-1">
                      <QrCode className="h-3 w-3 text-blue-600" />
                      UPI Amount (₹)
                    </Label>
                    {splitDiff !== 0 && (
                      <button
                        type="button"
                        onClick={() => handleAllocateRemainder("upi")}
                        className="text-[9px] font-bold text-primary hover:underline cursor-pointer"
                      >
                        Auto-Fill Balance
                      </button>
                    )}
                  </div>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={splitUpiAmount}
                    onChange={(e) => setSplitUpiAmount(e.target.value)}
                    className="h-8 text-xs font-mono font-bold"
                  />
                  <Input
                    placeholder="UPI UTR No. (Optional)"
                    value={splitUpiUtr}
                    onChange={(e) => setSplitUpiUtr(e.target.value)}
                    className="h-7 text-[11px] font-mono mt-1"
                  />
                </div>
              </div>

              {/* Status summary */}
              <div
                className={`p-2 rounded-md text-[11px] font-medium flex items-center justify-between ${
                  splitDiff === 0 && splitTotal > 0
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                }`}
              >
                <span>
                  Allocated: <strong>₹{splitTotal.toFixed(2)}</strong> of{" "}
                  <strong>₹{toCollect.toFixed(2)}</strong>
                </span>
                <span>
                  {splitDiff === 0 && splitTotal > 0 ? (
                    <span className="font-bold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                    </span>
                  ) : splitDiff > 0 ? (
                    <span className="font-bold">₹{splitDiff.toFixed(2)} Pending</span>
                  ) : (
                    <span className="font-bold">₹{Math.abs(splitDiff).toFixed(2)} Over</span>
                  )}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} className="flex-1 text-xs h-9">
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => collectMutation.mutate()}
            disabled={
              collectMutation.isPending ||
              toCollect <= 0 ||
              (paymentMethod === "split" && (Math.abs(splitDiff) > 0.05 || splitTotal <= 0))
            }
            title={
              paymentMethod === "split" && Math.abs(splitDiff) > 0.05
                ? `Allocated split amount (₹${splitTotal.toFixed(2)}) must match Amount to Collect (₹${toCollect.toFixed(2)})`
                : undefined
            }
            className="flex-1 text-xs h-9 font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {collectMutation.isPending ? "Collecting..." : "Confirm Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

