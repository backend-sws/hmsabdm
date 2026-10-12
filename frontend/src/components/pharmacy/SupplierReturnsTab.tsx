import React, { useState } from "react"
import {
  RotateCcw,
  Search,
  Plus,
  FileText,
  Printer,
  CheckCircle2,
  Clock,
  Building2,
  FileCheck,
} from "lucide-react"
import { useSupplierReturns, useUpdateSupplierReturnStatusMutation } from "@/hooks/usePharmacy"
import type { PharmacySupplierReturn } from "@/types/pharmacy"
import { SupplierReturnModal } from "./SupplierReturnModal"

export const SupplierReturnsTab: React.FC = () => {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false)
  const [selectedRtvForView, setSelectedRtvForView] = useState<PharmacySupplierReturn | null>(null)

  const { data: rtvData, isLoading } = useSupplierReturns({
    status: statusFilter === "ALL" ? undefined : statusFilter,
    per_page: 50,
  })
  const returns = rtvData?.data || []

  const updateStatusMutation = useUpdateSupplierReturnStatusMutation()

  // Filtered by local search query
  const filteredReturns = returns.filter((r) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      r.rtv_number.toLowerCase().includes(q) ||
      (r.supplier?.supplier_name && r.supplier.supplier_name.toLowerCase().includes(q)) ||
      (r.debit_note_number && r.debit_note_number.toLowerCase().includes(q))
    )
  })

  // Financial summary
  const totalRtvValue = returns.reduce((acc, r) => acc + (r.total_return_value || 0), 0)
  const debitNotesCount = returns.filter((r) => r.status === "DEBIT_NOTE_ISSUED" || r.status === "CLOSED").length

  const handleIssueDebitNote = async (rtv: PharmacySupplierReturn) => {
    const dnNum = prompt("Enter Debit Note Number:", `DN-${rtv.rtv_number.replace("RTV-", "")}`)
    if (!dnNum) return

    await updateStatusMutation.mutateAsync({
      id: rtv.id,
      payload: {
        status: "DEBIT_NOTE_ISSUED",
        debit_note_number: dnNum.trim(),
        debit_note_amount: rtv.total_return_value,
        debit_note_date: new Date().toISOString().split("T")[0],
      },
    })
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-border dark:bg-card">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Total RTV Challans</span>
            <RotateCcw className="h-4 w-4 text-orange-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {returns.length}
          </div>
          <div className="mt-1 text-xs text-slate-400">Recorded vendor returns</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-border dark:bg-card">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Total Returned Valuation</span>
            <Building2 className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-primary">
            ₹{totalRtvValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-xs text-slate-400">Total goods cost reversed</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-border dark:bg-card">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Debit Notes Issued</span>
            <FileCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {debitNotesCount}
          </div>
          <div className="mt-1 text-xs text-slate-400">Adjusted against supplier ledgers</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-border dark:bg-card">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Pending Debit Notes</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">
            {returns.length - debitNotesCount}
          </div>
          <div className="mt-1 text-xs text-slate-400">Awaiting vendor acceptance</div>
        </div>
      </div>

      {/* Filters & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-border dark:bg-card">
        {/* Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {["ALL", "DRAFT", "CHALLAN_PRINTED", "SUPPLIER_ACCEPTED", "DEBIT_NOTE_ISSUED"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                statusFilter === st
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-muted dark:text-slate-300"
              }`}
            >
              {st === "ALL" ? "All Challans" : st.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Search & New Return Button */}
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Challan #, Vendor, DN #..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-1.5 pl-8 pr-3 text-xs font-medium dark:border-border dark:bg-card dark:text-white"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsReturnModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-orange-600/25 hover:bg-orange-700"
          >
            <Plus className="h-4 w-4" />
            Initiate RTV Challan
          </button>
        </div>
      </div>

      {/* Returns Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:bg-muted/40">
              <tr>
                <th className="py-3 px-4">Challan Number</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Vendor / Supplier</th>
                <th className="py-3 px-4">Return Reason</th>
                <th className="py-3 px-4 text-center">Batch Items</th>
                <th className="py-3 px-4 text-right">Return Value</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Debit Note #</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400">
                    Loading supplier returns...
                  </td>
                </tr>
              ) : filteredReturns.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-500">
                    No supplier returns found. Click "Initiate RTV Challan" above to return expired or damaged inventory.
                  </td>
                </tr>
              ) : (
                filteredReturns.map((rtv) => (
                  <tr key={rtv.id} className="hover:bg-slate-50/50 dark:hover:bg-muted/20">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {rtv.rtv_number}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {rtv.created_at ? new Date(rtv.created_at).toLocaleDateString("en-IN") : "N/A"}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {rtv.supplier?.supplier_name || `Supplier #${rtv.supplier_id}`}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="rounded-md bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-800 dark:bg-orange-950/40 dark:text-orange-400">
                        {rtv.return_reason.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                      {rtv.items_count ?? rtv.items?.length ?? 1}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-white">
                      ₹{rtv.total_return_value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          rtv.status === "DEBIT_NOTE_ISSUED" || rtv.status === "CLOSED"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            : rtv.status === "SUPPLIER_ACCEPTED"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        {rtv.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {rtv.debit_note_number || <span className="text-slate-400 italic">Pending</span>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {rtv.status !== "DEBIT_NOTE_ISSUED" && rtv.status !== "CLOSED" && (
                          <button
                            type="button"
                            onClick={() => handleIssueDebitNote(rtv)}
                            className="rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-400"
                          >
                            Issue DN
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRtvForView(rtv)
                            window.print()
                          }}
                          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                          title="Print Challan"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RTV Modal */}
      <SupplierReturnModal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
      />
    </div>
  )
}
