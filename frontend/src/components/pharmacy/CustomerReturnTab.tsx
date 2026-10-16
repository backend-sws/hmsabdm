import React, { useState } from "react"
import {
  Search,
  RotateCcw,
} from "lucide-react"
import {
  useReturns,
  useProcessReturnMutation,
} from "@/hooks/usePharmacy"
import { pharmacyService } from "@/services/pharmacyService"
import type { PharmacySale } from "@/types/pharmacy"
import { toast } from "sonner"

export const CustomerReturnTab: React.FC = () => {
  const [invoiceQuery, setInvoiceQuery] = useState("")
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(false)
  const [searchedSale, setSearchedSale] = useState<PharmacySale | null>(null)

  // Return Selection
  const [returnQtys, setReturnQtys] = useState<Record<number, number>>({})
  const [returnReason, setReturnReason] = useState("Patient recovered / unused medication")
  const [refundMode, setRefundMode] = useState<"CASH" | "UPI" | "IPD_DEDUCTION">("CASH")

  const { data: returnsData } = useReturns()
  const pastReturns = returnsData?.data || []

  const returnMutation = useProcessReturnMutation()

  // Search Sale
  const handleSearchInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!invoiceQuery.trim()) return

    setIsLoadingInvoice(true)
    setSearchedSale(null)
    setReturnQtys({})

    try {
      const res = await pharmacyService.getSales({ search: invoiceQuery.trim() })
      if (res.data && res.data.length > 0) {
        // Fetch full sale with items
        const fullSale = await pharmacyService.getSale(res.data[0].id)
        setSearchedSale(fullSale)
        if (fullSale.sale_type === "IPD") {
          setRefundMode("IPD_DEDUCTION")
        }
      } else {
        toast.error(`No invoice found with number "${invoiceQuery}"`)
      }
    } catch {
      toast.error("Failed to load invoice details")
    } finally {
      setIsLoadingInvoice(false)
    }
  }

  const handleQtyChange = (saleItemId: number, maxQty: number, val: number) => {
    const cleanVal = Math.max(0, Math.min(val, maxQty))
    setReturnQtys({ ...returnQtys, [saleItemId]: cleanVal })
  }

  // Calculate Refund Total
  const selectedItemsToReturn = Object.entries(returnQtys)
    .filter(([_, qty]) => qty > 0)
    .map(([saleItemId, qty]) => {
      const sItem = searchedSale?.items?.find((i) => i.id === Number(saleItemId))
      const unitPrice = sItem?.unit_price || 0
      const gstRate = sItem?.gst_rate || 12
      const lineTaxable = unitPrice * qty * (1 - ((sItem?.discount_percent || 0) / 100))
      const lineGst = lineTaxable * (gstRate / 100)
      return {
        sale_item_id: Number(saleItemId),
        quantity: qty,
        refund: lineTaxable + lineGst,
      }
    })

  const totalRefundAmount = Math.round(
    selectedItemsToReturn.reduce((acc, item) => acc + item.refund, 0)
  )

  const handleSubmitReturn = async () => {
    if (!searchedSale) return
    if (selectedItemsToReturn.length === 0) {
      alert("Please select at least 1 item and quantity to return")
      return
    }

    await returnMutation.mutateAsync({
      sale_id: searchedSale.id,
      return_reason: returnReason,
      refund_mode: refundMode,
      items: selectedItemsToReturn.map((i) => ({
        sale_item_id: i.sale_item_id,
        quantity: i.quantity,
      })),
    })

    // Reset
    setSearchedSale(null)
    setReturnQtys({})
    setInvoiceQuery("")
  }

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Customer Sales Return & Restock (Credit Note)
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Enter customer invoice number to verify original batches and reverse stock
        </p>

        <form onSubmit={handleSearchInvoice} className="mt-4 flex max-w-xl items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={invoiceQuery}
              onChange={(e) => setInvoiceQuery(e.target.value)}
              placeholder="e.g. INV-PHARM-2026-XXXX..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-xs font-semibold uppercase text-slate-900 focus:border-primary focus:bg-white focus:outline-none dark:border-border dark:bg-card dark:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={isLoadingInvoice}
            className="rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-primary/20 hover:bg-primary/90 disabled:opacity-50"
          >
            {isLoadingInvoice ? "Searching..." : "Find Invoice"}
          </button>
        </form>
      </div>

      {/* Searched Invoice Items to Return */}
      {searchedSale && (
        <div className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-5 dark:bg-primary/10">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/10 pb-3">
            <div>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                Invoice #{searchedSale.invoice_number}
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Customer: <strong>{searchedSale.customer_name}</strong> • Channel: {searchedSale.sale_type} • Date:{" "}
                {new Date(searchedSale.created_at || "").toLocaleDateString("en-IN")}
              </p>
            </div>
            <span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-bold text-primary">
              Billed Net: ₹{searchedSale.net_amount}
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-border dark:bg-card">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-slate-50 text-[11px] font-bold uppercase text-slate-500 dark:bg-muted/40">
                <tr>
                  <th className="p-3">Medicine</th>
                  <th className="p-3">Batch & Exp</th>
                  <th className="p-3 text-center">Billed Qty</th>
                  <th className="p-3 text-center">Already Ret.</th>
                  <th className="p-3 text-right">Unit Rate</th>
                  <th className="p-3 text-center">Return Qty</th>
                  <th className="p-3 text-right">Refund Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {searchedSale.items?.map((item) => {
                  const maxReturnable = Math.max(0, item.quantity - item.returned_quantity)
                  const currentReturnQty = returnQtys[item.id] || 0
                  const lineRefund = Math.round(
                    currentReturnQty * item.unit_price * (1 + item.gst_rate / 100) * 100
                  ) / 100

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-muted/20">
                      <td className="p-3 font-bold text-slate-900 dark:text-white">
                        {item.medicine?.brand_name || "Medicine"}
                      </td>
                      <td className="p-3">
                        <span className="font-mono font-bold">{item.batch_number}</span>
                        <span className="block text-[10px] text-slate-400">Exp: {item.expiry_date}</span>
                      </td>
                      <td className="p-3 text-center font-bold">{item.quantity}</td>
                      <td className="p-3 text-center text-slate-500">{item.returned_quantity}</td>
                      <td className="p-3 text-right">₹{item.unit_price}</td>
                      <td className="p-3 text-center">
                        {maxReturnable > 0 ? (
                          <input
                            type="number"
                            min="0"
                            max={maxReturnable}
                            value={currentReturnQty}
                            onChange={(e) =>
                              handleQtyChange(item.id, maxReturnable, Number(e.target.value))
                            }
                            className="w-16 rounded-lg border border-slate-200 py-1 text-center font-bold text-slate-900 dark:border-border dark:bg-card dark:text-white"
                          />
                        ) : (
                          <span className="text-slate-400">Fully Returned</span>
                        )}
                      </td>
                      <td className="p-3 text-right font-bold text-primary">
                        {currentReturnQty > 0 ? `₹${lineRefund}` : "₹0"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Refund Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Refund Mode:
                </label>
                <select
                  value={refundMode}
                  onChange={(e) => setRefundMode(e.target.value as any)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 dark:border-border dark:bg-card dark:text-white"
                >
                  <option value="CASH">Cash Refund</option>
                  <option value="UPI">UPI Refund</option>
                  <option value="IPD_DEDUCTION">IPD Ledger Deduction</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Return Reason:
                </label>
                <input
                  type="text"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-64 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium dark:border-border dark:bg-card dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-xs text-slate-500">Total Refund:</span>
                <p className="text-xl font-black text-primary">₹{totalRefundAmount}</p>
              </div>

              <button
                type="button"
                onClick={handleSubmitReturn}
                disabled={totalRefundAmount <= 0 || returnMutation.isPending}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-primary/25 hover:bg-primary/90 disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
                {returnMutation.isPending ? "Processing..." : "Process Return & Restock"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Past Returns / Credit Notes Register */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
        <div className="border-b border-slate-200 bg-slate-50/70 p-4 dark:border-border dark:bg-muted/20">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Recent Credit Notes (Returns Register)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b bg-slate-50 text-[11px] font-bold uppercase text-slate-500 dark:bg-muted/40">
              <tr>
                <th className="p-3">Credit Note #</th>
                <th className="p-3">Original Invoice</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Reason</th>
                <th className="p-3 text-center">Items</th>
                <th className="p-3 text-right">Refund Amount</th>
                <th className="p-3 text-center">Mode</th>
                <th className="p-3">Processed Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pastReturns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    No customer returns recorded yet.
                  </td>
                </tr>
              ) : (
                pastReturns.map((ret) => (
                  <tr key={ret.id} className="hover:bg-slate-50/50 dark:hover:bg-muted/20">
                    <td className="p-3 font-mono font-bold text-primary">{ret.credit_note_number}</td>
                    <td className="p-3 font-semibold">{ret.sale?.invoice_number || "Invoice"}</td>
                    <td className="p-3">{ret.customer_name}</td>
                    <td className="p-3 text-slate-500">{ret.return_reason || "Return"}</td>
                    <td className="p-3 text-center font-bold">{ret.items_count || ret.items?.length || 1}</td>
                    <td className="p-3 text-right font-extrabold text-slate-900 dark:text-white">
                      ₹{ret.refund_amount}
                    </td>
                    <td className="p-3 text-center">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold dark:bg-muted">
                        {ret.refund_mode}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500">
                      {new Date(ret.created_at || "").toLocaleDateString("en-IN")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
