import React, { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  DollarSign,
  Banknote,
  QrCode,
  CreditCard,
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
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "card">("cash")
  const [reference, setReference] = useState("")

  const collectMutation = useMutation({
    mutationFn: () => {
      // Validate with Zod Schema
      const validation = collectLabPaymentSchema.safeParse({
        amount: parseFloat(amount),
        payment_method: paymentMethod,
        transaction_reference: reference.trim() || undefined,
      })

      if (!validation.success) {
        throw new Error(validation.error.issues[0]?.message || "Invalid payment details")
      }

      return labService.collectPayment(order.id, {
        amount: parseFloat(amount) || 0,
        payment_method: paymentMethod,
        transaction_reference: reference.trim() || undefined,
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
            <div className="flex gap-2 mt-1">
              {[
                { id: "cash", label: "Cash", icon: Banknote },
                { id: "upi", label: "UPI / QR", icon: QrCode },
                { id: "card", label: "Card", icon: CreditCard },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id as any)}
                  className={`flex-1 py-1.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    paymentMethod === m.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <m.icon className="h-3.5 w-3.5" />
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold text-muted-foreground">
              Transaction Reference (Optional)
            </Label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="UPI Ref ID, POS Receipt number..."
              className="mt-1 h-8 text-xs font-mono"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} className="flex-1 text-xs h-9">
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => collectMutation.mutate()}
            disabled={collectMutation.isPending || parseFloat(amount) <= 0}
            className="flex-1 text-xs h-9 font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {collectMutation.isPending ? "Collecting..." : "Confirm Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
