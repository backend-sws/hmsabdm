import React, { useState } from "react"
import {
  Search,
  Plus,
  X,
  Check,
  AlertTriangle,
  ShieldAlert,
  RotateCcw,
  SlidersHorizontal,
  Layers,
  Clock,
  Ban,
  CheckCircle2,
  Building2,
} from "lucide-react"
import {
  useBatchStock,
  useAdjustBatchStockMutation,
  useExpiryDashboard,
  useQuarantineBatchMutation,
} from "@/hooks/usePharmacy"
import type { PharmacyBatch } from "@/types/pharmacy"
import { MedicineFormModal } from "./MedicineFormModal"
import { SupplierReturnModal } from "./SupplierReturnModal"

export const BatchInventoryTab: React.FC = () => {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isMedicineModalOpen, setIsMedicineModalOpen] = useState(false)

  // RTV Modal State
  const [isRtvModalOpen, setIsRtvModalOpen] = useState(false)
  const [batchForRtv, setBatchForRtv] = useState<PharmacyBatch | null>(null)

  // Stock Adjustment Modal State
  const [selectedBatchForAdjust, setSelectedBatchForAdjust] = useState<PharmacyBatch | null>(null)
  const [adjustmentQty, setAdjustmentQty] = useState<number>(0)
  const [adjustmentReason, setAdjustmentReason] = useState<string>("")

  // Queries
  const { data: expiryData } = useExpiryDashboard()
  const { data: batchData, isLoading } = useBatchStock({
    search,
    status: statusFilter === "all" ? undefined : statusFilter,
    per_page: 50,
  })
  const batches = batchData?.data || []

  const adjustMutation = useAdjustBatchStockMutation()
  const quarantineMutation = useQuarantineBatchMutation()

  const handleQuarantine = async (batchId: number) => {
    if (confirm("Are you sure you want to QUARANTINE this batch? It will be removed from the POS dispensing pool.")) {
      await quarantineMutation.mutateAsync(batchId)
    }
  }

  const handleInitiateRtv = (batch: PharmacyBatch) => {
    setBatchForRtv(batch)
    setIsRtvModalOpen(true)
  }

  const handleConfirmAdjust = async () => {
    if (!selectedBatchForAdjust) return
    if (adjustmentQty === 0) {
      alert("Adjustment quantity cannot be 0")
      return
    }
    if (!adjustmentReason.trim()) {
      alert("Please provide a reason for adjustment")
      return
    }

    await adjustMutation.mutateAsync({
      batchId: selectedBatchForAdjust.id,
      payload: {
        adjustment_quantity: adjustmentQty,
        reason: adjustmentReason.trim(),
      },
    })

    setSelectedBatchForAdjust(null)
    setAdjustmentQty(0)
    setAdjustmentReason("")
  }

  const expSummary = expiryData?.summary || {
    expired_count: 0,
    critical_count: 0,
    near_expiry_count: 0,
    good_count: 0,
  }

  return (
    <div className="space-y-6">
      {/* 1. Red/Orange/Yellow/Green Expiry Surveillance Dashboard Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* EXPIRED (Red) */}
        <div
          onClick={() => setStatusFilter("expired")}
          className={`cursor-pointer rounded-2xl border p-4 transition-all hover:shadow-md ${
            statusFilter === "expired"
              ? "border-red-500 bg-red-50 dark:bg-red-950/30 ring-2 ring-red-500"
              : "border-red-200 bg-red-50/50 dark:border-red-950 dark:bg-red-950/20"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-red-700 dark:text-red-400">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
              🔴 EXPIRED
            </span>
            <Ban className="h-4 w-4 text-red-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-red-700 dark:text-red-300">
            {expSummary.expired_count} <span className="text-xs font-semibold">batches</span>
          </div>
          <p className="mt-1 text-[11px] font-medium text-red-600/80 dark:text-red-400">
            Dispensing blocked immediately • Initiate RTV
          </p>
        </div>

        {/* CRITICAL <30 Days (Orange) */}
        <div
          onClick={() => setStatusFilter("critical")}
          className={`cursor-pointer rounded-2xl border p-4 transition-all hover:shadow-md ${
            statusFilter === "critical"
              ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30 ring-2 ring-orange-500"
              : "border-orange-200 bg-orange-50/50 dark:border-orange-950 dark:bg-orange-950/20"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-orange-700 dark:text-orange-400">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-orange-500" />
              🟠 CRITICAL (&lt;30d)
            </span>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-orange-700 dark:text-orange-300">
            {expSummary.critical_count} <span className="text-xs font-semibold">batches</span>
          </div>
          <p className="mt-1 text-[11px] font-medium text-orange-600/80 dark:text-orange-400">
            Urgent action needed • Return to vendor now
          </p>
        </div>

        {/* NEAR EXPIRY 30-90 Days (Yellow) */}
        <div
          onClick={() => setStatusFilter("near_expiry")}
          className={`cursor-pointer rounded-2xl border p-4 transition-all hover:shadow-md ${
            statusFilter === "near_expiry"
              ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30 ring-2 ring-amber-500"
              : "border-amber-200 bg-amber-50/50 dark:border-amber-950 dark:bg-amber-950/20"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-400">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              🟡 NEAR EXPIRY (30-90d)
            </span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-700 dark:text-amber-300">
            {expSummary.near_expiry_count} <span className="text-xs font-semibold">batches</span>
          </div>
          <p className="mt-1 text-[11px] font-medium text-amber-600/80 dark:text-amber-400">
            Plan vendor returns or push to high-use wards
          </p>
        </div>

        {/* ACTIVE / GOOD >90 Days (Green) */}
        <div
          onClick={() => setStatusFilter("active")}
          className={`cursor-pointer rounded-2xl border p-4 transition-all hover:shadow-md ${
            statusFilter === "active"
              ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 ring-2 ring-emerald-500"
              : "border-emerald-200 bg-emerald-50/50 dark:border-emerald-950 dark:bg-emerald-950/20"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              🟢 GOOD (&gt;90d Active)
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-700 dark:text-emerald-300">
            {expSummary.good_count} <span className="text-xs font-semibold">batches</span>
          </div>
          <p className="mt-1 text-[11px] font-medium text-emerald-600/80 dark:text-emerald-400">
            Normal dispensing • FEFO rotation healthy
          </p>
        </div>
      </div>

      {/* 2. Filters and Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-border dark:bg-card">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              statusFilter === "all"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-muted dark:text-slate-300"
            }`}
          >
            All Batches
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("active")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              statusFilter === "active"
                ? "bg-emerald-600 text-white"
                : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
            }`}
          >
            In Stock
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("near_expiry")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              statusFilter === "near_expiry"
                ? "bg-amber-600 text-white"
                : "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
            }`}
          >
            Near Expiry (&lt;90d)
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("critical")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              statusFilter === "critical"
                ? "bg-orange-600 text-white"
                : "bg-orange-500/10 text-orange-600 hover:bg-orange-500/20"
            }`}
          >
            Critical (&lt;30d)
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("expired")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              statusFilter === "expired"
                ? "bg-red-600 text-white"
                : "bg-red-500/10 text-red-600 hover:bg-red-500/20"
            }`}
          >
            Expired (Locked)
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("quarantined")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              statusFilter === "quarantined"
                ? "bg-purple-600 text-white"
                : "bg-purple-500/10 text-purple-600 hover:bg-purple-500/20"
            }`}
          >
            🛡️ Quarantined Zone
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("out_of_stock")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              statusFilter === "out_of_stock"
                ? "bg-slate-700 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-muted dark:text-slate-300"
            }`}
          >
            Zero Stock
          </button>
        </div>

        {/* Right Search & Actions */}
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search batch, brand, salt, rack..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-1.5 pl-8 pr-3 text-xs font-medium dark:border-border dark:bg-card dark:text-white"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setBatchForRtv(null)
              setIsRtvModalOpen(true)
            }}
            className="flex items-center gap-1.5 rounded-xl bg-orange-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-orange-600/25 hover:bg-orange-700"
          >
            <RotateCcw className="h-4 w-4" />
            Supplier RTV
          </button>

          <button
            type="button"
            onClick={() => setIsMedicineModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-primary/25 hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add Medicine
          </button>
        </div>
      </div>

      {/* 3. Batches Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:bg-muted/40">
              <tr>
                <th className="py-3 px-4">Medicine & Form</th>
                <th className="py-3 px-4">Salt / Composition</th>
                <th className="py-3 px-4">Vendor / Supplier</th>
                <th className="py-3 px-4">Batch Number</th>
                <th className="py-3 px-4">Expiry Date</th>
                <th className="py-3 px-4">Rack Location</th>
                <th className="py-3 px-4 text-center">Available Stock</th>
                <th className="py-3 px-4 text-right">Cost Price</th>
                <th className="py-3 px-4 text-right">MRP</th>
                <th className="py-3 px-4 text-right">Selling Price</th>
                <th className="py-3 px-4 text-center">Expiry Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={12} className="p-12 text-center text-slate-400">
                    Loading batch inventory...
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-12 text-center text-slate-500">
                    No batches found matching selected filter.
                  </td>
                </tr>
              ) : (
                batches.map((batch) => {
                  const today = new Date()
                  const expDate = new Date(batch.expiry_date)
                  const isExpired = expDate < today
                  const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 3600 * 24))
                  const isCritical = !isExpired && diffDays <= 30
                  const isNearExp = !isExpired && diffDays > 30 && diffDays <= 90
                  const isQuarantined = batch.expiry_status === "QUARANTINED"

                  return (
                    <tr
                      key={batch.id}
                      className={`hover:bg-slate-50/50 dark:hover:bg-muted/20 ${
                        isExpired
                          ? "bg-red-500/5 dark:bg-red-500/10"
                          : isCritical
                          ? "bg-orange-500/5 dark:bg-orange-500/10"
                          : isQuarantined
                          ? "bg-purple-500/5 dark:bg-purple-500/10"
                          : ""
                      }`}
                    >
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {batch.medicine?.brand_name || "Medicine"}
                        </span>
                        <span className="block text-[11px] text-slate-500">
                          {batch.medicine?.dosage_form}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-[180px] truncate text-slate-600 dark:text-slate-300">
                        {batch.medicine?.generic_name || "N/A"}
                      </td>
                      <td className="py-3 px-4 max-w-[160px] truncate">
                        {batch.supplier ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                            <Building2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                            <span className="truncate">{batch.supplier.supplier_name}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {batch.batch_number}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {batch.expiry_date}
                        </span>
                        {isExpired && (
                          <span className="block text-[10px] font-bold text-red-600">
                            Expired ({Math.abs(diffDays)}d ago)
                          </span>
                        )}
                        {isCritical && (
                          <span className="block text-[10px] font-bold text-orange-600">
                            Critical ({diffDays}d left)
                          </span>
                        )}
                        {isNearExp && (
                          <span className="block text-[10px] font-bold text-amber-600">
                            Near Expiry ({diffDays}d left)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-muted dark:text-slate-300">
                          {batch.rack_location || batch.medicine?.rack_location || "Shelf A-1"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span
                            className={`text-sm font-extrabold ${
                              batch.available_quantity <= 0
                                ? "text-slate-400"
                                : batch.available_quantity < (batch.medicine?.min_reorder_level || 20)
                                ? "text-amber-500"
                                : "text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {batch.available_quantity}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500">
                            {batch.medicine?.unit_name ||
                              (batch.medicine?.dosage_form?.toLowerCase().includes("tab")
                                ? "Tabs"
                                : batch.medicine?.dosage_form?.toLowerCase().includes("cap")
                                ? "Caps"
                                : batch.medicine?.dosage_form?.toLowerCase().includes("syrup")
                                ? "Bottles"
                                : "Units")}
                          </span>
                        </div>
                        {batch.medicine?.pack_size && batch.medicine.pack_size > 1 && batch.available_quantity > 0 && (
                          <div className="text-[10px] text-slate-400 font-medium">
                            {Math.floor(batch.available_quantity / batch.medicine.pack_size)} Strips +{" "}
                            {batch.available_quantity % batch.medicine.pack_size} Loose
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600">₹{batch.purchase_rate}</td>
                      <td className="py-3 px-4 text-right text-slate-600">₹{batch.mrp}</td>
                      <td className="py-3 px-4 text-right font-bold text-primary">
                        ₹{batch.selling_price || batch.mrp}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isQuarantined ? (
                          <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                            QUARANTINED
                          </span>
                        ) : isExpired ? (
                          <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-950 dark:text-red-300">
                            EXPIRED
                          </span>
                        ) : isCritical ? (
                          <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[10px] font-bold text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                            CRITICAL &lt;30d
                          </span>
                        ) : isNearExp ? (
                          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                            NEAR EXPIRY
                          </span>
                        ) : batch.available_quantity <= 0 ? (
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-muted">
                            Out of Stock
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            ACTIVE
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Quarantine Action */}
                          {!isQuarantined && (isExpired || isCritical || isNearExp) && (
                            <button
                              type="button"
                              onClick={() => handleQuarantine(batch.id)}
                              disabled={quarantineMutation.isPending}
                              title="Quarantine this batch (remove from dispensing)"
                              className="rounded-lg bg-purple-50 p-1 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300"
                            >
                              <ShieldAlert className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {/* Initiate RTV Return */}
                          <button
                            type="button"
                            onClick={() => handleInitiateRtv(batch)}
                            title="Return to Supplier (RTV Challan)"
                            className="rounded-lg bg-orange-50 p-1 text-orange-700 hover:bg-orange-100 dark:bg-orange-950/40 dark:text-orange-300"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>

                          {/* Adjust stock */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBatchForAdjust(batch)
                              setAdjustmentQty(0)
                              setAdjustmentReason("")
                            }}
                            className="rounded-lg border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-slate-100 dark:border-border dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            Adjust
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {selectedBatchForAdjust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-border dark:bg-card">
            <div className="flex items-center justify-between border-b pb-3 dark:border-border">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Adjust Batch Stock ({selectedBatchForAdjust.batch_number})
              </h3>
              <button
                type="button"
                onClick={() => setSelectedBatchForAdjust(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Current Stock:{" "}
                  <span className="font-bold text-primary">
                    {selectedBatchForAdjust.available_quantity} Units
                  </span>
                </label>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Quantity Adjustment (+ to add, - to subtract)
                </label>
                <input
                  type="number"
                  value={adjustmentQty}
                  onChange={(e) => setAdjustmentQty(Number(e.target.value))}
                  placeholder="e.g. -5 for breakage or +10 for count correction"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 dark:border-border dark:bg-card dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Reason for Adjustment <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="e.g. Broken vial during shelf stocking, Physical count discrepancy"
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 dark:border-border dark:bg-card dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedBatchForAdjust(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 dark:border-border dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAdjust}
                  disabled={adjustMutation.isPending}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-md shadow-primary/25 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  {adjustMutation.isPending ? "Saving..." : "Confirm Adjustment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Formulary Medicine Modal */}
      <MedicineFormModal
        isOpen={isMedicineModalOpen}
        onClose={() => setIsMedicineModalOpen(false)}
      />

      {/* RTV Modal */}
      <SupplierReturnModal
        isOpen={isRtvModalOpen}
        onClose={() => {
          setIsRtvModalOpen(false)
          setBatchForRtv(null)
        }}
        initialBatch={batchForRtv}
      />
    </div>
  )
}
