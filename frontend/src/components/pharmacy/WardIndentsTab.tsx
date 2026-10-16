import React, { useState } from "react"
import {
  Bed,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  RotateCcw,
  XCircle,
  Pill,
  Loader2,
  User,
  ShieldAlert,
} from "lucide-react"
import {
  useWardIndents,
  useDispenseWardIndentMutation,
  useRejectWardIndentMutation,
  useReturnWardIndentItemMutation,
} from "@/hooks/usePharmacy"
import type { PharmacyWardIndent, PharmacyWardIndentItem } from "@/types/pharmacy"
import { CreateWardIndentModal } from "./CreateWardIndentModal"

export const WardIndentsTab: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL")
  const [searchQuery, setSearchQuery] = useState("")

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [dispenseModalIndent, setDispenseModalIndent] = useState<PharmacyWardIndent | null>(null)
  const [rejectModalIndent, setRejectModalIndent] = useState<PharmacyWardIndent | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [returnModalItem, setReturnModalItem] = useState<{
    indent: PharmacyWardIndent
    item: PharmacyWardIndentItem
  } | null>(null)
  const [returnQuantity, setReturnQuantity] = useState<number>(1)

  // Fetch Ward Indents Query
  const { data: indentsData, isLoading, refetch } = useWardIndents({
    status: statusFilter === "ALL" ? undefined : statusFilter,
    priority: priorityFilter === "ALL" ? undefined : priorityFilter,
    search: searchQuery.trim() || undefined,
  })

  const indents: PharmacyWardIndent[] = indentsData?.data || []

  // Mutations
  const dispenseMutation = useDispenseWardIndentMutation()
  const rejectMutation = useRejectWardIndentMutation()
  const returnMutation = useReturnWardIndentItemMutation()

  // KPI counts
  const pendingCount = indents.filter((i) => i.status === "PENDING").length
  const urgentCount = indents.filter((i) => i.priority === "STAT" || i.priority === "URGENT").length
  const dispensedCount = indents.filter((i) => i.status === "DISPENSED").length

  // Dispense Form State
  const [dispenseItemSelections, setDispenseItemSelections] = useState<
    Record<number, { batch_id?: number; dispensed_quantity: number }>
  >({})

  const handleOpenDispenseModal = (indent: PharmacyWardIndent) => {
    setDispenseModalIndent(indent)
    const initialSelections: Record<number, { batch_id?: number; dispensed_quantity: number }> = {}
    indent.items.forEach((item) => {
      // Find best batch from medicine if available
      const bestBatch = item.medicine?.active_batches?.[0]
      initialSelections[item.id] = {
        batch_id: bestBatch?.id,
        dispensed_quantity: item.requested_quantity,
      }
    })
    setDispenseItemSelections(initialSelections)
  }

  const handleConfirmDispense = async () => {
    if (!dispenseModalIndent) return
    const itemsPayload = dispenseModalIndent.items.map((item) => ({
      item_id: item.id,
      batch_id: dispenseItemSelections[item.id]?.batch_id,
      dispensed_quantity: dispenseItemSelections[item.id]?.dispensed_quantity ?? item.requested_quantity,
    }))

    await dispenseMutation.mutateAsync({
      id: dispenseModalIndent.id,
      payload: { items: itemsPayload },
    })
    setDispenseModalIndent(null)
    refetch()
  }

  const handleConfirmReject = async () => {
    if (!rejectModalIndent || !rejectReason.trim()) return
    await rejectMutation.mutateAsync({
      id: rejectModalIndent.id,
      reason: rejectReason.trim(),
    })
    setRejectModalIndent(null)
    setRejectReason("")
    refetch()
  }

  const handleConfirmReturn = async () => {
    if (!returnModalItem) return
    await returnMutation.mutateAsync({
      indentId: returnModalItem.indent.id,
      itemId: returnModalItem.item.id,
      returnQuantity,
    })
    setReturnModalItem(null)
    refetch()
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-border dark:bg-card">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            <Bed className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              IPD Ward Drug Indents & Requisitions
              {pendingCount > 0 && (
                <span className="animate-pulse rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                  {pendingCount} Pending Requisitions
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ward/ICU Bedside Medication Dispensing, FEFO Batch Allocation & Automated IPD Billing Ledger Charge
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-primary/90 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          New Ward Indent
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            <span>Pending Dispense Queue</span>
            <Clock className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-900 dark:text-amber-100">{pendingCount}</div>
          <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">Awaiting pharmacist verification</p>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 dark:border-rose-900/40 dark:bg-rose-950/20">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
            <span>Emergency / STAT Indents</span>
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-black text-rose-900 dark:text-rose-100">{urgentCount}</div>
          <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">Requires immediate bedside delivery</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            <span>Dispensed to Inpatients</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-900 dark:text-emerald-100">{dispensedCount}</div>
          <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">Auto-posted to IPD running bills</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-border dark:bg-card">
        <div className="flex flex-wrap items-center gap-1">
          {["ALL", "PENDING", "DISPENSED", "PARTIALLY_DISPENSED", "REJECTED"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                statusFilter === st
                  ? "bg-primary text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {st.replace("_", " ")}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search indent #, UHID, patient, bed..."
              className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs outline-none focus:border-primary dark:border-border dark:bg-card"
            />
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold outline-none dark:border-border dark:bg-card"
          >
            <option value="ALL">All Priorities</option>
            <option value="STAT">STAT (Emergency)</option>
            <option value="URGENT">Urgent</option>
            <option value="ROUTINE">Routine</option>
          </select>
        </div>
      </div>

      {/* Indents List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-border dark:bg-card">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-3 text-xs font-bold text-slate-600">Loading ward drug requisitions...</p>
        </div>
      ) : indents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500 dark:border-border dark:bg-card">
          <Bed className="h-10 w-10 text-slate-300 mb-2" />
          <p className="font-bold text-sm">No ward indents found</p>
          <p className="text-xs text-slate-400">Nurses can raise drug requisitions directly for admitted IPD patients.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {indents.map((indent) => {
            const isPending = indent.status === "PENDING" || indent.status === "PARTIALLY_DISPENSED"
            const isStat = indent.priority === "STAT"
            const isUrgent = indent.priority === "URGENT"

            return (
              <div
                key={indent.id}
                className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-all dark:bg-card ${
                  isStat
                    ? "border-rose-300 dark:border-rose-900"
                    : isUrgent
                    ? "border-amber-300 dark:border-amber-900"
                    : "border-slate-200 dark:border-border"
                }`}
              >
                {/* Indent Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 p-4 dark:border-border dark:bg-slate-900/40">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-black text-primary">{indent.indent_number}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                        isStat
                          ? "animate-pulse bg-rose-600 text-white"
                          : isUrgent
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {indent.priority}
                    </span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        indent.status === "DISPENSED"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : indent.status === "REJECTED"
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      }`}
                    >
                      {indent.status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">
                      Requested: {new Date(indent.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                    </span>
                    {indent.requestedBy && (
                      <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">
                        by {indent.requestedBy.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Patient & Bed Info */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-4 text-xs dark:border-border">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400" />
                      <span className="font-bold text-slate-900 dark:text-white">
                        {indent.patient?.name || "Patient"}
                      </span>
                      <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[11px] font-mono font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        {indent.patient?.uhid}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Bed className="h-4 w-4 text-indigo-500" />
                      <span className="font-semibold">{indent.ward_name || "General Ward"}</span>
                      <span>•</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">{indent.bed_number || "Bed"}</span>
                    </div>
                  </div>

                  {indent.status === "DISPENSED" && (
                    <div className="flex items-center gap-2 text-emerald-600 font-bold">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Charged to IPD Ledger: ₹{indent.total_amount.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {/* Items Table */}
                <div className="overflow-x-auto p-4">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-500 dark:border-border">
                        <th className="pb-2 font-bold">Medicine / Drug</th>
                        <th className="pb-2 font-bold text-center">Req. Qty</th>
                        <th className="pb-2 font-bold text-center">Disp. Qty</th>
                        <th className="pb-2 font-bold">Dosage Instruction</th>
                        <th className="pb-2 font-bold">Allocated Batch</th>
                        <th className="pb-2 font-bold text-right">Line Total</th>
                        <th className="pb-2 font-bold text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-border">
                      {indent.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                          <td className="py-2.5 font-bold text-slate-800 dark:text-slate-200">
                            {item.medicine?.brand_name || "Medicine"}
                            <span className="ml-2 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800">
                              {item.medicine?.dosage_form}
                            </span>
                          </td>
                          <td className="py-2.5 text-center font-bold text-slate-900 dark:text-white">
                            {item.requested_quantity}
                          </td>
                          <td className="py-2.5 text-center font-bold text-emerald-600">
                            {item.dispensed_quantity}
                          </td>
                          <td className="py-2.5 text-slate-500">{item.dosage_instruction || "As directed"}</td>
                          <td className="py-2.5">
                            {item.batch ? (
                              <span className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                {item.batch.batch_number} (Exp: {item.batch.expiry_date})
                              </span>
                            ) : (
                              <span className="text-slate-400">FEFO Auto</span>
                            )}
                          </td>
                          <td className="py-2.5 text-right font-black text-slate-900 dark:text-white">
                            {item.total_amount > 0 ? `₹${item.total_amount.toFixed(2)}` : "-"}
                          </td>
                          <td className="py-2.5 text-center">
                            {item.status === "DISPENSED" && item.dispensed_quantity > item.returned_quantity && (
                              <button
                                type="button"
                                onClick={() => {
                                  setReturnModalItem({ indent, item })
                                  setReturnQuantity(item.dispensed_quantity - item.returned_quantity)
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 dark:border-border dark:text-slate-300"
                              >
                                <RotateCcw className="h-3 w-3 text-orange-500" />
                                Return Med
                              </button>
                            )}
                            {item.returned_quantity > 0 && (
                              <span className="ml-2 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-800 dark:bg-orange-950 dark:text-orange-300">
                                {item.returned_quantity} Ret.
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Card Action Bar */}
                {isPending && (
                  <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/40 p-3 dark:border-border dark:bg-slate-900/30">
                    <button
                      type="button"
                      onClick={() => setRejectModalIndent(indent)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:border-rose-900/40"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Reject Requisition
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenDispenseModal(indent)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95"
                    >
                      <Pill className="h-3.5 w-3.5" />
                      Dispense & Post to IPD Bill
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* DISPENSE MODAL */}
      {dispenseModalIndent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-border dark:bg-card">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Dispense Ward Indent: {dispenseModalIndent.indent_number}
                </h3>
                <p className="text-xs text-slate-500">
                  Patient: <span className="font-bold text-slate-800 dark:text-white">{dispenseModalIndent.patient?.name}</span> • Bed:{" "}
                  <span className="font-bold text-indigo-600">{dispenseModalIndent.bed_number}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDispenseModalIndent(null)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Confirm dispense quantity and allocated FEFO batch for each drug. On confirmation, stock will be deducted and charged directly to patient&apos;s IPD billing ledger.
              </p>

              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:border-border">
                {dispenseModalIndent.items.map((item) => (
                  <div key={item.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-bold text-xs text-slate-800 dark:text-white">
                        {item.medicine?.brand_name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Requested: <span className="font-bold text-slate-700 dark:text-slate-300">{item.requested_quantity}</span> • Rate: ₹{item.unit_price} (MRP Incl.)
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-slate-500">Dispense Qty:</span>
                        <input
                          type="number"
                          min={1}
                          max={item.requested_quantity}
                          value={dispenseItemSelections[item.id]?.dispensed_quantity ?? item.requested_quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0
                            setDispenseItemSelections((prev) => ({
                              ...prev,
                              [item.id]: {
                                ...prev[item.id],
                                dispensed_quantity: val,
                              },
                            }))
                          }}
                          className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-center font-bold text-xs outline-none focus:border-primary dark:border-border dark:bg-card"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t pt-4">
              <button
                type="button"
                onClick={() => setDispenseModalIndent(null)}
                className="rounded-xl border px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDispense}
                disabled={dispenseMutation.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
              >
                {dispenseMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pill className="h-4 w-4" />}
                Confirm & Charge to IPD Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectModalIndent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-border dark:bg-card">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Reject Indent: {rejectModalIndent.indent_number}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Provide reason for rejecting this ward drug requisition.
            </p>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Out of stock, duplicate indent, doctor cancelled prescription..."
              rows={3}
              className="mt-4 w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-rose-500 dark:border-border dark:bg-card"
            />

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectModalIndent(null)}
                className="rounded-xl border px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={!rejectReason.trim() || rejectMutation.isPending}
                className="rounded-xl bg-rose-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RETURN ITEM MODAL */}
      {returnModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-border dark:bg-card">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-orange-500" />
              Return Unused Medicine
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Drug: <span className="font-bold text-slate-800 dark:text-white">{returnModalItem.item.medicine?.brand_name}</span>
            </p>

            <div className="mt-4 space-y-3">
              <div className="rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800">
                <div>Dispensed: <span className="font-bold">{returnModalItem.item.dispensed_quantity}</span></div>
                <div>Already Returned: <span className="font-bold">{returnModalItem.item.returned_quantity}</span></div>
                <div>Max Returnable: <span className="font-bold text-emerald-600">{returnModalItem.item.dispensed_quantity - returnModalItem.item.returned_quantity}</span></div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Return Quantity:
                </label>
                <input
                  type="number"
                  min={1}
                  max={returnModalItem.item.dispensed_quantity - returnModalItem.item.returned_quantity}
                  value={returnQuantity}
                  onChange={(e) => setReturnQuantity(parseInt(e.target.value) || 1)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs font-bold outline-none focus:border-primary dark:border-border dark:bg-card"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 border-t pt-4">
              <button
                type="button"
                onClick={() => setReturnModalItem(null)}
                className="rounded-xl border px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReturn}
                disabled={returnMutation.isPending}
                className="rounded-xl bg-orange-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-orange-700 disabled:opacity-50"
              >
                Process Return & Adjust Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE WARD INDENT MODAL */}
      {isCreateModalOpen && (
        <CreateWardIndentModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false)
            refetch()
          }}
        />
      )}
    </div>
  )
}
