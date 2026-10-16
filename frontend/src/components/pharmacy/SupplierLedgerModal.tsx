import React, { useState } from "react"
import {
  X,
  Building2,
  FileText,
  IndianRupee,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Receipt,
  Plus,
  Printer,
  PackageCheck,
  TrendingDown,
} from "lucide-react"
import { useSupplierLedger } from "@/hooks/usePharmacy"
import { RecordSupplierPaymentModal } from "./RecordSupplierPaymentModal"

interface SupplierLedgerModalProps {
  isOpen: boolean
  onClose: () => void
  supplierId: number | null
}

export const SupplierLedgerModal: React.FC<SupplierLedgerModalProps> = ({
  isOpen,
  onClose,
  supplierId,
}) => {
  const [activeTab, setActiveTab] = useState<"orders" | "payments">("orders")
  const [expandedPurchaseId, setExpandedPurchaseId] = useState<number | null>(null)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)

  const { data: ledgerData, isLoading, isError } = useSupplierLedger(supplierId ?? 0)

  if (!isOpen || !supplierId) return null

  const supplier = ledgerData?.supplier
  const purchases = ledgerData?.purchases ?? []
  const payments = ledgerData?.payments ?? []

  const toggleExpand = (id: number) => {
    setExpandedPurchaseId((prev) => (prev === id ? null : id))
  }

  const unpaidPurchases = purchases.filter(
    (p) => p.payment_status === "UNPAID" || p.payment_status === "PARTIAL"
  )

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-border dark:bg-card">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-border">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {supplier?.supplier_name || "Supplier Ledger"}
                  </h2>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    Vendor Ledger & Statements
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  GSTIN: {supplier?.gstin || "N/A"} | DL: {supplier?.drug_license_no || "N/A"} | Phone:{" "}
                  {supplier?.phone || "N/A"} | Credit: {supplier?.credit_days ?? 30} Days
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPaymentModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500"
              >
                <Plus className="h-4 w-4" />
                Record Payment
              </button>
              <button
                onClick={() => window.print()}
                className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 dark:border-border dark:text-slate-300 dark:hover:bg-slate-800"
                title="Print Statement"
              >
                <Printer className="h-4 w-4" />
              </button>
              <button
                onClick={onClose}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Financial KPI Banner */}
          <div className="border-b border-slate-200 bg-slate-50/75 p-5 dark:border-border dark:bg-slate-900/30">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-border dark:bg-card">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <Receipt className="h-3.5 w-3.5 text-blue-500" />
                  Total Inward Purchases
                </div>
                <div className="mt-1 text-lg font-black text-slate-900 dark:text-white">
                  ₹{(supplier?.total_purchases_amount ?? 0).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <span className="text-[11px] text-slate-400">
                  {supplier?.purchases_count ?? 0} Inward Orders
                </span>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-border dark:bg-card">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <CreditCard className="h-3.5 w-3.5 text-emerald-500" />
                  Total Paid Settled
                </div>
                <div className="mt-1 text-lg font-black text-emerald-600 dark:text-emerald-400">
                  ₹{(supplier?.total_paid_amount ?? 0).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <span className="text-[11px] text-slate-400">
                  {supplier?.payments_count ?? 0} Payment Vouchers
                </span>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-border dark:bg-card">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                  Outstanding Balance Due
                </div>
                <div
                  className={`mt-1 text-lg font-black ${
                    (supplier?.outstanding_balance ?? 0) > 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-slate-900 dark:text-white"
                  }`}
                >
                  ₹{(supplier?.outstanding_balance ?? 0).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <span className="text-[11px] text-slate-400">
                  Opening: ₹{(supplier?.opening_balance ?? 0).toFixed(2)}
                </span>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-border dark:bg-card">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <IndianRupee className="h-3.5 w-3.5 text-purple-500" />
                  Credit Limit & Terms
                </div>
                <div className="mt-1 text-lg font-black text-slate-900 dark:text-white">
                  ₹{(supplier?.credit_limit ?? 0).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Utilized: {supplier?.credit_utilization ?? 0}%</span>
                  <span>{supplier?.credit_days ?? 30} Days Term</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-slate-200 px-6 dark:border-border">
            <button
              onClick={() => setActiveTab("orders")}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-all ${
                activeTab === "orders"
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <PackageCheck className="h-4 w-4" />
              Inward Orders & Medicines Breakdown ({purchases.length})
            </button>
            <button
              onClick={() => setActiveTab("payments")}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-all ${
                activeTab === "payments"
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <CreditCard className="h-4 w-4" />
              Payment Vouchers & Settlement History ({payments.length})
            </button>
          </div>

          {/* Content Area */}
          <div className="custom-scrollbar flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex h-64 flex-col items-center justify-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-xs text-slate-400">Loading vendor ledger...</p>
              </div>
            ) : isError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600 dark:border-red-900/30 dark:bg-red-950/20">
                Failed to load supplier ledger. Please try again.
              </div>
            ) : activeTab === "orders" ? (
              /* TAB 1: Inward Orders */
              purchases.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400 dark:border-border">
                  <Receipt className="mb-2 h-10 w-10 text-slate-300 dark:text-slate-600" />
                  <p className="font-semibold">No Inward Purchases Recorded</p>
                  <p className="text-xs">Inward GRNs created for this vendor will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {purchases.map((purchase) => {
                    const isExpanded = expandedPurchaseId === purchase.id
                    const balanceDue = Math.max(0, purchase.net_amount - purchase.paid_amount)

                    return (
                      <div
                        key={purchase.id}
                        className="rounded-xl border border-slate-200 bg-white transition-all hover:border-slate-300 dark:border-border dark:bg-card"
                      >
                        {/* Order Header Summary */}
                        <div
                          onClick={() => toggleExpand(purchase.id)}
                          className="flex cursor-pointer flex-wrap items-center justify-between gap-3 p-4"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                                  {purchase.grn_number}
                                </span>
                                <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                  Inv: {purchase.supplier_invoice_no}
                                </span>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                    purchase.payment_status === "PAID"
                                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                                      : purchase.payment_status === "PARTIAL"
                                      ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                                      : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                                  }`}
                                >
                                  {purchase.payment_status}
                                </span>
                              </div>
                              <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-400">
                                <span>Inv Date: {purchase.invoice_date}</span>
                                <span>Received: {purchase.received_date}</span>
                                <span>By: {purchase.received_by_user?.name || "Inventory Desk"}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <div className="text-xs text-slate-400">Total Invoice Amount</div>
                              <div className="text-base font-black text-slate-900 dark:text-white">
                                ₹{purchase.net_amount.toFixed(2)}
                              </div>
                              <div className="text-[11px] font-medium text-slate-500">
                                Paid: ₹{purchase.paid_amount.toFixed(2)} | Due:{" "}
                                <strong
                                  className={balanceDue > 0 ? "text-red-500" : "text-emerald-600"}
                                >
                                  ₹{balanceDue.toFixed(2)}
                                </strong>
                              </div>
                            </div>

                            <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
                              {isExpanded ? (
                                <ChevronUp className="h-5 w-5" />
                              ) : (
                                <ChevronDown className="h-5 w-5" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Order Items Breakdown Accordion */}
                        {isExpanded && (
                          <div className="border-t border-slate-100 bg-slate-50/60 p-4 dark:border-border/50 dark:bg-slate-900/20">
                            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                              Ordered Medicines & Batch Details ({purchase.items?.length ?? 0} Items)
                            </h4>
                            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-border dark:bg-card">
                              <table className="w-full text-left text-xs">
                                <thead className="border-b border-slate-200 bg-slate-100/75 text-slate-600 dark:border-border dark:bg-slate-800/50 dark:text-slate-400">
                                  <tr>
                                    <th className="py-2.5 pl-3 pr-2 font-bold">Medicine Brand</th>
                                    <th className="px-2 py-2.5 font-bold">Batch No.</th>
                                    <th className="px-2 py-2.5 font-bold">Expiry</th>
                                    <th className="px-2 py-2.5 text-right font-bold">Pack Qty</th>
                                    <th className="px-2 py-2.5 text-right font-bold">Free</th>
                                    <th className="px-2 py-2.5 text-right font-bold">Total Units</th>
                                    <th className="px-2 py-2.5 text-right font-bold">Unit Rate</th>
                                    <th className="px-2 py-2.5 text-right font-bold">GST %</th>
                                    <th className="py-2.5 pl-2 pr-3 text-right font-bold">Item Total (₹)</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-border/40">
                                  {(purchase.items || []).map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                      <td className="py-2.5 pl-3 pr-2 font-bold text-slate-900 dark:text-white">
                                        {item.medicine?.brand_name || "Medicine Item"}
                                        <span className="ml-1 text-[11px] font-normal text-slate-400">
                                          ({item.medicine?.dosage_form})
                                        </span>
                                      </td>
                                      <td className="px-2 py-2.5 font-mono font-semibold text-slate-700 dark:text-slate-300">
                                        {item.batch_number}
                                      </td>
                                      <td className="px-2 py-2.5 font-medium text-slate-600 dark:text-slate-400">
                                        {item.expiry_date}
                                      </td>
                                      <td className="px-2 py-2.5 text-right font-semibold">
                                        {item.pack_quantity}
                                      </td>
                                      <td className="px-2 py-2.5 text-right font-semibold text-emerald-600">
                                        {item.free_pack_quantity || 0}
                                      </td>
                                      <td className="px-2 py-2.5 text-right font-bold text-slate-900 dark:text-white">
                                        {item.total_unit_quantity}
                                      </td>
                                      <td className="px-2 py-2.5 text-right font-semibold">
                                        ₹{item.purchase_rate_per_unit.toFixed(2)}
                                      </td>
                                      <td className="px-2 py-2.5 text-right font-semibold">
                                        {item.gst_rate}%
                                      </td>
                                      <td className="py-2.5 pl-2 pr-3 text-right font-bold text-slate-900 dark:text-white">
                                        ₹{item.total_amount.toFixed(2)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            ) : (
              /* TAB 2: Payment Vouchers */
              payments.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400 dark:border-border">
                  <CreditCard className="mb-2 h-10 w-10 text-slate-300 dark:text-slate-600" />
                  <p className="font-semibold">No Payment Vouchers Yet</p>
                  <p className="text-xs">
                    Click "Record Payment" to record a cheque, RTGS, or cash payout to this vendor.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-border dark:bg-card">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-100/75 text-slate-600 dark:border-border dark:bg-slate-800/50 dark:text-slate-400">
                      <tr>
                        <th className="py-3 pl-4 pr-2 font-bold">Voucher No.</th>
                        <th className="px-3 py-3 font-bold">Payment Date</th>
                        <th className="px-3 py-3 font-bold">Mode</th>
                        <th className="px-3 py-3 font-bold">Ref / UTR Number</th>
                        <th className="px-3 py-3 font-bold">Linked GRN / Invoice</th>
                        <th className="px-3 py-3 font-bold">Prepared By</th>
                        <th className="py-3 pl-2 pr-4 text-right font-bold">Amount Paid (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-border/40">
                      {payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-3 pl-4 pr-2 font-mono font-bold text-slate-900 dark:text-white">
                            {p.payment_number}
                          </td>
                          <td className="px-3 py-3 font-medium text-slate-600 dark:text-slate-400">
                            {p.payment_date}
                          </td>
                          <td className="px-3 py-3">
                            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                              {p.payment_mode}
                            </span>
                          </td>
                          <td className="px-3 py-3 font-mono text-slate-600 dark:text-slate-400">
                            {p.reference_number || "—"}
                          </td>
                          <td className="px-3 py-3 font-medium text-slate-700 dark:text-slate-300">
                            {p.purchase ? `${p.purchase.grn_number} (Inv #${p.purchase.supplier_invoice_no})` : "General On-Account"}
                          </td>
                          <td className="px-3 py-3 text-slate-500">
                            {p.paid_by_user?.name || "Finance Desk"}
                          </td>
                          <td className="py-3 pl-2 pr-4 text-right font-black text-emerald-600 dark:text-emerald-400">
                            ₹{p.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Record Payment Voucher Nested Modal */}
      {isPaymentModalOpen && supplier && (
        <RecordSupplierPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          supplier={supplier}
          unpaidPurchases={unpaidPurchases}
        />
      )}
    </>
  )
}
