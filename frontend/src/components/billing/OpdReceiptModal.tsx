import React from "react"
import { createPortal } from "react-dom"
import { Printer, X, CheckCircle2, Receipt, Phone, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { OpdReceiptData } from "@/types/billing"

interface OpdReceiptModalProps {
  open: boolean
  onClose: () => void
  receipt: OpdReceiptData | null
}

export const OpdReceiptModal: React.FC<OpdReceiptModalProps> = ({
  open,
  onClose,
  receipt,
}) => {
  if (!open || !receipt) return null

  const handlePrint = () => {
    window.print()
  }

  const formattedDate = receipt.invoice_date
    ? new Date(receipt.invoice_date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date().toLocaleString("en-IN")

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      {/* ────────────────────────────────────────────────────────────────
          PRINT MEDIA STYLES
         ──────────────────────────────────────────────────────────────── */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #opd-receipt-print-area, #opd-receipt-print-area * {
            visibility: visible !important;
          }
          #opd-receipt-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 15px !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="relative w-full max-w-2xl bg-card rounded-2xl shadow-2xl border border-border flex flex-col max-h-[92vh] overflow-hidden">
        {/* Top Floating Control Bar */}
        <div className="no-print p-4 border-b border-border bg-muted/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            <div>
              <h3 className="font-bold text-sm text-foreground">OPD Billing Receipt Issued</h3>
              <p className="text-[11px] text-muted-foreground font-mono">{receipt.invoice_number}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handlePrint}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 text-xs font-semibold rounded-xl h-8 px-4"
            >
              <Printer className="h-4 w-4" /> Print Receipt
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable Receipt Area */}
        <div className="p-6 overflow-y-auto bg-card text-foreground">
          <div
            id="opd-receipt-print-area"
            className="border border-border/80 rounded-xl p-6 bg-card text-card-foreground shadow-xs space-y-4"
          >
            {/* 1. Hospital Header */}
            <div className="border-b border-border/80 pb-3 flex items-start justify-between">
              <div>
                <h1 className="text-lg font-black tracking-tight text-foreground uppercase">
                  Apex Multispeciality Hospital
                </h1>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <MapPin className="h-3 w-3" /> Circular Road, Health City, New Delhi - 110001
                </p>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <Phone className="h-3 w-3" /> Helpline: +91 11 4000 8000 | GSTIN: 07AAAAA0000A1Z5
                </p>
              </div>

              <div className="text-right">
                <Badge className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider mb-1">
                  OFFICIAL CASH RECEIPT
                </Badge>
                <div className="text-[11px] font-mono text-muted-foreground">
                  Date: <strong className="text-foreground">{formattedDate}</strong>
                </div>
                <div className="text-[11px] font-mono text-muted-foreground">
                  Bill No: <strong className="text-foreground">{receipt.invoice_number}</strong>
                </div>
              </div>
            </div>

            {/* 2. Patient & Encounter Details */}
            <div className="bg-muted/20 border border-border/60 rounded-lg p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Patient Name</span>
                <strong className="text-foreground">{receipt.patient.name}</strong>
              </div>

              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">UHID</span>
                <span className="font-mono font-bold text-primary">{receipt.patient.uhid}</span>
              </div>

              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Token / OPD #</span>
                <span className="font-mono font-bold text-foreground">
                  TK-{receipt.token_no} ({receipt.opd_number})
                </span>
              </div>

              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Age / Gender</span>
                <span className="text-foreground">
                  {receipt.patient.age ? `${receipt.patient.age} Y` : "—"} / {receipt.patient.gender || "—"}
                </span>
              </div>

              <div className="col-span-2 sm:col-span-2 pt-1 border-t border-border/40">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Consulting Doctor</span>
                <strong className="text-foreground">
                  {receipt.doctor.name || "Duty Medical Officer"}{" "}
                  {receipt.doctor.department ? `(${receipt.doctor.department})` : ""}
                </strong>
              </div>

              <div className="col-span-2 sm:col-span-2 pt-1 border-t border-border/40">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Contact Number</span>
                <span className="font-mono text-foreground">{receipt.patient.mobile || "—"}</span>
              </div>
            </div>

            {/* 3. Itemized Charges Table */}
            <div className="space-y-1.5">
              <table className="w-full text-left border border-collapse text-xs">
                <thead className="bg-muted/50 text-[10px] uppercase font-bold border-b border-border">
                  <tr>
                    <th className="p-2 border-r border-border w-8 text-center">#</th>
                    <th className="p-2 border-r border-border">Description / Service</th>
                    <th className="p-2 border-r border-border w-28">Category</th>
                    <th className="p-2 border-r border-border w-16 text-center">Qty</th>
                    <th className="p-2 border-r border-border w-24 text-right">Rate (₹)</th>
                    <th className="p-2 w-28 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {receipt.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-muted/10">
                      <td className="p-2 border-r border-border font-mono text-center text-muted-foreground">
                        {idx + 1}
                      </td>
                      <td className="p-2 border-r border-border font-medium text-foreground">
                        {item.item_name}
                      </td>
                      <td className="p-2 border-r border-border text-[10px] uppercase text-muted-foreground font-mono">
                        {item.category?.replace(/_/g, " ") || "General"}
                      </td>
                      <td className="p-2 border-r border-border font-mono text-center">{item.quantity}</td>
                      <td className="p-2 border-r border-border font-mono text-right">
                        {Number(item.unit_price).toFixed(2)}
                      </td>
                      <td className="p-2 font-mono font-bold text-right text-foreground">
                        {Number(item.total_amount).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 4. Financial Totals & Payment Summary */}
            <div className="pt-2 border-t border-border/80 flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="text-xs space-y-1 max-w-sm">
                <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="h-4 w-4" /> Payment Settled Successfully
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Payment Mode: <strong className="text-foreground uppercase">{receipt.payment_method}</strong>
                </div>
                {receipt.discount_reason && (
                  <div className="text-[11px] text-muted-foreground">
                    Discount Reason: <span className="italic">{receipt.discount_reason}</span>
                  </div>
                )}
                <div className="text-[10px] text-muted-foreground pt-1">
                  Issued By: <span className="font-semibold">{receipt.billed_by}</span>
                </div>
              </div>

              <div className="w-full sm:w-64 space-y-1.5 text-xs bg-muted/20 p-3 rounded-lg border border-border/60">
                <div className="flex justify-between text-muted-foreground">
                  <span>Gross Amount:</span>
                  <span className="font-mono">₹{Number(receipt.gross_amount).toFixed(2)}</span>
                </div>

                {receipt.discount_amount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount:</span>
                    <span className="font-mono">- ₹{Number(receipt.discount_amount).toFixed(2)}</span>
                  </div>
                )}

                {receipt.tax_amount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>GST / Tax:</span>
                    <span className="font-mono">+ ₹{Number(receipt.tax_amount).toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-base font-bold text-foreground border-t border-border pt-1">
                  <span>Net Payable:</span>
                  <span className="font-mono text-primary">₹{Number(receipt.net_amount).toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-400 pt-0.5">
                  <span>Amount Paid:</span>
                  <span className="font-mono">₹{Number(receipt.amount_paid).toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
                  <span>Balance Due:</span>
                  <span>₹0.00</span>
                </div>
              </div>
            </div>

            {/* 5. Official Cashier Clearance Stamp & Footer */}
            <div className="pt-4 border-t border-border/80 flex items-end justify-between text-[10px] text-muted-foreground">
              <div className="space-y-0.5">
                <p>• Computer generated bill receipt. No physical signature required.</p>
                <p>• Please present this receipt at Diagnostic Collection / Lab / Radiology counter.</p>
                <p>• Valid for today only.</p>
              </div>

              <div className="text-center">
                <div className="border border-dashed border-muted-foreground/30 rounded px-3 py-1 font-mono uppercase text-[9px] mb-1 font-bold text-emerald-700 dark:text-emerald-400">
                  ✓ PAID & CLEARED
                </div>
                <span>Authorized Cashier</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
