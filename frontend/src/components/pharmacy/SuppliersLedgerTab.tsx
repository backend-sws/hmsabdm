import React, { useState, useMemo } from "react"
import {
  Building2,
  Search,
  Plus,
  Receipt,
  CreditCard,
  TrendingDown,
  Edit2,
  FileText,
  Phone,
} from "lucide-react"
import { useSuppliers } from "@/hooks/usePharmacy"
import type { PharmacySupplier } from "@/types/pharmacy"
import { SupplierModal } from "./SupplierModal"
import { SupplierLedgerModal } from "./SupplierLedgerModal"
import { RecordSupplierPaymentModal } from "./RecordSupplierPaymentModal"

export const SuppliersLedgerTab: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterMode, setFilterMode] = useState<"ALL" | "DUE" | "OVERLIMIT">("ALL")

  // Modal States
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false)
  const [supplierToEdit, setSupplierToEdit] = useState<PharmacySupplier | null>(null)
  const [selectedLedgerSupplierId, setSelectedLedgerSupplierId] = useState<number | null>(null)
  const [paymentSupplier, setPaymentSupplier] = useState<PharmacySupplier | null>(null)

  const { data: suppliers = [], isLoading, isError } = useSuppliers()

  // Computed Financial Metrics
  const summary = useMemo(() => {
    let totalPurchases = 0
    let totalPaid = 0
    let totalOutstanding = 0
    let overlimitCount = 0

    suppliers.forEach((s) => {
      const p = s.calculated_total_purchases ?? 0
      const pd = s.calculated_total_paid ?? 0
      const out = s.calculated_outstanding ?? 0
      totalPurchases += p
      totalPaid += pd
      totalOutstanding += out
      if (s.is_credit_limit_exceeded) {
        overlimitCount++
      }
    })

    return {
      totalVendors: suppliers.length,
      totalPurchases,
      totalPaid,
      totalOutstanding,
      overlimitCount,
    }
  }, [suppliers])

  // Filtered List
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        s.supplier_name.toLowerCase().includes(q) ||
        (s.contact_person && s.contact_person.toLowerCase().includes(q)) ||
        (s.phone && s.phone.includes(q)) ||
        (s.gstin && s.gstin.toLowerCase().includes(q))

      if (!matchesSearch) return false

      if (filterMode === "DUE") {
        return (s.calculated_outstanding ?? 0) > 0
      }
      if (filterMode === "OVERLIMIT") {
        return Boolean(s.is_credit_limit_exceeded)
      }

      return true
    })
  }, [suppliers, searchQuery, filterMode])

  return (
    <div className="space-y-6">
      {/* 1. Financial KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-border dark:bg-card">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Active Suppliers</span>
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {summary.totalVendors}
          </div>
          <div className="mt-1 text-xs text-slate-400">Approved medicine distributors</div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-border dark:bg-card">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Total Inward Purchases</span>
            <Receipt className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            ₹{summary.totalPurchases.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-xs text-slate-400">Total GRN invoices recorded</div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-border dark:bg-card">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Total Paid Settled</span>
            <CreditCard className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            ₹{summary.totalPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-xs text-slate-400">Via NEFT, Cheque & Cash</div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-border dark:bg-card">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Outstanding Balance Due</span>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </div>
          <div
            className={`mt-2 text-2xl font-black ${
              summary.totalOutstanding > 0 ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-white"
            }`}
          >
            ₹{summary.totalOutstanding.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
            {summary.overlimitCount > 0 ? (
              <span className="font-semibold text-red-500">
                ⚠ {summary.overlimitCount} vendor(s) over credit limit
              </span>
            ) : (
              <span>All credit accounts within limit</span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Control Bar (Search, Filters, Action) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative min-w-[260px] flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by vendor name, contact person, phone, GSTIN..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-border dark:bg-card dark:text-white"
            />
          </div>

          {/* Quick Filter Chips */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 dark:border-border dark:bg-card">
            <button
              onClick={() => setFilterMode("ALL")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                filterMode === "ALL"
                  ? "bg-primary text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-300"
              }`}
            >
              All ({suppliers.length})
            </button>
            <button
              onClick={() => setFilterMode("DUE")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                filterMode === "DUE"
                  ? "bg-red-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-300"
              }`}
            >
              Pending Dues Only
            </button>
            <button
              onClick={() => setFilterMode("OVERLIMIT")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                filterMode === "OVERLIMIT"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-300"
              }`}
            >
              Credit Exceeded
            </button>
          </div>
        </div>

        <button
          onClick={() => {
            setSupplierToEdit(null)
            setIsRegisterModalOpen(true)
          }}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Register Supplier
        </button>
      </div>

      {/* 3. Main Vendors Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-border dark:bg-card">
        {isLoading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-xs text-slate-400">Loading suppliers & credit statements...</p>
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-sm text-red-500">
            Failed to load suppliers list. Please refresh or check backend connection.
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Building2 className="mx-auto mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
            <p className="text-base font-bold text-slate-700 dark:text-slate-300">No Suppliers Found</p>
            <p className="mt-1 text-xs">
              {searchQuery ? "No supplier matches your filter criteria." : "Register your first distributor."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/75 text-slate-600 dark:border-border dark:bg-slate-900/50 dark:text-slate-400">
                <tr>
                  <th className="py-3.5 pl-6 pr-3 font-bold">Supplier / Distributor</th>
                  <th className="px-3 py-3.5 font-bold">Licenses & GSTIN</th>
                  <th className="px-3 py-3.5 font-bold">Credit System</th>
                  <th className="px-3 py-3.5 text-right font-bold">Orders / Gross (₹)</th>
                  <th className="px-3 py-3.5 text-right font-bold">Paid Settled (₹)</th>
                  <th className="px-3 py-3.5 text-right font-bold">Balance Due (₹)</th>
                  <th className="py-3.5 pl-3 pr-6 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-border/40">
                {filteredSuppliers.map((supplier) => {
                  const grossPurchases = supplier.calculated_total_purchases ?? 0
                  const paidAmount = supplier.calculated_total_paid ?? 0
                  const outstanding = supplier.calculated_outstanding ?? 0
                  const creditLimit = supplier.credit_limit ?? 0
                  const utilization = supplier.calculated_credit_utilization ?? 0
                  const isOverlimit = Boolean(supplier.is_credit_limit_exceeded)

                  return (
                    <tr
                      key={supplier.id}
                      className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
                    >
                      {/* Name & Contact */}
                      <td className="py-3.5 pl-6 pr-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {supplier.supplier_name}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                          {supplier.contact_person && (
                            <span>Contact: {supplier.contact_person}</span>
                          )}
                          {supplier.phone && (
                            <span className="flex items-center gap-1 font-mono">
                              <Phone className="h-3 w-3" /> {supplier.phone}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Tax & Drug License */}
                      <td className="px-3 py-3.5 font-mono text-slate-600 dark:text-slate-400">
                        <div>
                          <span className="text-[10px] font-semibold uppercase text-slate-400">GST:</span>{" "}
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {supplier.gstin || "—"}
                          </span>
                        </div>
                        <div className="text-[11px]">
                          <span className="text-[10px] text-slate-400">DL:</span>{" "}
                          {supplier.drug_license_no || "—"}
                        </div>
                      </td>

                      {/* Credit Terms & Progress */}
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {supplier.credit_days ?? 30} Days
                          </span>
                          {creditLimit > 0 && (
                            <span className="text-[11px] text-slate-400">
                              Limit: ₹{creditLimit.toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>

                        {creditLimit > 0 && (
                          <div className="mt-1.5 w-36">
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  isOverlimit
                                    ? "bg-red-500"
                                    : utilization > 80
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                                }`}
                                style={{ width: `${Math.min(utilization, 100)}%` }}
                              />
                            </div>
                            <div className="mt-0.5 flex justify-between text-[10px]">
                              <span className={isOverlimit ? "font-bold text-red-500" : "text-slate-400"}>
                                {utilization}% used
                              </span>
                              {isOverlimit && <span className="font-bold text-red-500">EXCEEDED</span>}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Orders Count & Gross */}
                      <td className="px-3 py-3.5 text-right">
                        <div className="font-bold text-slate-900 dark:text-white">
                          ₹{grossPurchases.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {supplier.purchases_count ?? 0} Inward GRNs
                        </div>
                      </td>

                      {/* Paid Settled */}
                      <td className="px-3 py-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{paidAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>

                      {/* Balance Due */}
                      <td className="px-3 py-3.5 text-right">
                        <span
                          className={`inline-block rounded-full px-2.5 py-1 text-xs font-black ${
                            outstanding > 0
                              ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                          }`}
                        >
                          ₹{outstanding.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 pl-3 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedLedgerSupplierId(supplier.id)}
                            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:border-primary hover:text-primary dark:border-border dark:bg-card dark:text-slate-300 dark:hover:border-primary"
                            title="View Complete Orders & Inward Medicine History"
                          >
                            <FileText className="h-3.5 w-3.5 text-blue-500" />
                            Ledger
                          </button>

                          <button
                            onClick={() => setPaymentSupplier(supplier)}
                            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-500"
                            title="Record Payment Voucher"
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            Pay
                          </button>

                          <button
                            onClick={() => {
                              setSupplierToEdit(supplier)
                              setIsRegisterModalOpen(true)
                            }}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                            title="Edit Supplier"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Modals */}
      {/* Create / Edit Supplier Modal */}
      {isRegisterModalOpen && (
        <SupplierModal
          isOpen={isRegisterModalOpen}
          onClose={() => {
            setIsRegisterModalOpen(false)
            setSupplierToEdit(null)
          }}
          supplierToEdit={supplierToEdit}
        />
      )}

      {/* Detailed Statement & Line Items Ledger Modal */}
      {selectedLedgerSupplierId && (
        <SupplierLedgerModal
          isOpen={Boolean(selectedLedgerSupplierId)}
          onClose={() => setSelectedLedgerSupplierId(null)}
          supplierId={selectedLedgerSupplierId}
        />
      )}

      {/* Direct Payment Voucher Modal */}
      {paymentSupplier && (
        <RecordSupplierPaymentModal
          isOpen={Boolean(paymentSupplier)}
          onClose={() => setPaymentSupplier(null)}
          supplier={paymentSupplier}
        />
      )}
    </div>
  )
}
