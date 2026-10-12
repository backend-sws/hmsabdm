import React, { useState } from "react"
import {
  Pill,
  Search,
  Plus,
  AlertTriangle,
  MapPin,
} from "lucide-react"
import { useFormulary } from "@/hooks/usePharmacy"
import { MedicineFormModal } from "./MedicineFormModal"

export const FormularyTab: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("")
  const [dosageFilter, setDosageFilter] = useState("")
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  const { data: responseData, isLoading, isError } = useFormulary({
    search: searchQuery,
    dosage_form: dosageFilter,
    low_stock: lowStockOnly ? "true" : undefined,
  })

  const medicines = responseData?.data || []

  return (
    <div className="space-y-6">
      {/* Search & Actions Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative min-w-[260px] flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search formulary by brand, generic name, or item code..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-border dark:bg-card dark:text-white"
            />
          </div>

          {/* Dosage Form Filter */}
          <select
            value={dosageFilter}
            onChange={(e) => setDosageFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-border dark:bg-card dark:text-slate-200"
          >
            <option value="">All Dosage Forms</option>
            <option value="Tablet">Tablet</option>
            <option value="Capsule">Capsule</option>
            <option value="Syrup">Syrup</option>
            <option value="Suspension">Suspension</option>
            <option value="Injection">Injection</option>
            <option value="IV Fluid">IV Fluid</option>
            <option value="Ointment">Ointment</option>
            <option value="Drops">Drops</option>
            <option value="Inhaler">Inhaler</option>
          </select>

          {/* Low Stock Toggle */}
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 dark:border-border dark:bg-card dark:text-slate-200">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="rounded text-primary focus:ring-primary"
            />
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              Low Stock Only
            </span>
          </label>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add / Import Medicine
        </button>
      </div>

      {/* Medicines Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-border dark:bg-card">
        {isLoading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-xs text-slate-400">Loading hospital formulary...</p>
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-sm text-red-500">
            Failed to load medicines. Please try again.
          </div>
        ) : medicines.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Pill className="mx-auto mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
            <p className="text-base font-bold text-slate-700 dark:text-slate-300">No Medicines Found</p>
            <p className="mt-1 text-xs">
              {searchQuery
                ? "No formulations match your search."
                : "Import medicines from the national master or create custom entries."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/75 text-slate-600 dark:border-border dark:bg-slate-900/50 dark:text-slate-400">
                <tr>
                  <th className="py-3.5 pl-6 pr-3 font-bold">Brand & Generic Name</th>
                  <th className="px-3 py-3.5 font-bold">Dosage & Strength</th>
                  <th className="px-3 py-3.5 font-bold">Schedule</th>
                  <th className="px-3 py-3.5 text-right font-bold">Total Stock</th>
                  <th className="px-3 py-3.5 text-right font-bold">Reorder Level</th>
                  <th className="px-3 py-3.5 text-right font-bold">Selling Price (₹)</th>
                  <th className="px-3 py-3.5 text-right font-bold">MRP (₹)</th>
                  <th className="py-3.5 pl-3 pr-6 font-bold">Rack Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-border/40">
                {medicines.map((med) => {
                  const totalStock =
                    med.total_stock !== undefined && med.total_stock !== null
                      ? med.total_stock
                      : med.active_batches?.reduce((acc, b) => acc + (b.available_quantity || 0), 0) ?? 0
                  const isLowStock = totalStock <= med.min_reorder_level
                  const packSummary =
                    med.packaging_summary ||
                    (med.dosage_form?.toLowerCase().includes("tab")
                      ? "1 Strip = 10 Tabs"
                      : med.dosage_form?.toLowerCase().includes("cap")
                      ? "1 Strip = 10 Caps"
                      : "1 Unit")
                  const unitLabel =
                    med.unit_name ||
                    (med.dosage_form?.toLowerCase().includes("tab")
                      ? "Tabs"
                      : med.dosage_form?.toLowerCase().includes("cap")
                      ? "Caps"
                      : med.dosage_form?.toLowerCase().includes("syrup")
                      ? "Bottles"
                      : "Units")
                  const breakdownText = med.stock_breakdown?.formatted || `${totalStock} ${unitLabel}`

                  return (
                    <tr
                      key={med.id}
                      className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
                    >
                      <td className="py-3.5 pl-6 pr-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {med.brand_name}
                        </div>
                        {med.generic_name && (
                          <div className="text-[11px] text-slate-400">{med.generic_name}</div>
                        )}
                        {med.manufacturer && (
                          <div className="text-[10px] text-slate-400">Mfr: {med.manufacturer}</div>
                        )}
                      </td>

                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="rounded bg-slate-100 px-2 py-0.5 font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {med.dosage_form}
                          </span>
                          {med.strength && (
                            <span className="text-slate-500 font-medium text-xs">({med.strength})</span>
                          )}
                        </div>
                        <div className="text-[11px] text-primary/80 font-medium mt-1">
                          <span className="text-slate-400 font-normal">Pack:</span> {packSummary}
                        </div>
                      </td>

                      <td className="px-3 py-3.5">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            med.prescription_type === "OTC"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : med.prescription_type === "NARCOTIC"
                              ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                          }`}
                        >
                          {med.prescription_type}
                        </span>
                      </td>

                      <td className="px-3 py-3.5 text-right">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 font-bold text-xs ${
                            isLowStock
                              ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                          }`}
                        >
                          {breakdownText}
                        </span>
                        {med.pack_size && med.pack_size > 1 && totalStock > 0 && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {totalStock} {unitLabel} total
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-3.5 text-right font-medium text-slate-600 dark:text-slate-400">
                        {med.min_reorder_level} {unitLabel}
                      </td>

                      <td className="px-3 py-3.5 text-right font-bold text-slate-900 dark:text-white">
                        ₹{med.default_selling_price.toFixed(2)}
                      </td>

                      <td className="px-3 py-3.5 text-right font-medium text-slate-600 dark:text-slate-400">
                        ₹{med.mrp.toFixed(2)}
                      </td>

                      <td className="py-3.5 pl-3 pr-6 font-medium text-slate-600 dark:text-slate-400">
                        {med.rack_location ? (
                          <span className="flex items-center gap-1 font-mono">
                            <MapPin className="h-3 w-3 text-slate-400" />
                            {med.rack_location}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Import Medicine Modal */}
      {isAddModalOpen && (
        <MedicineFormModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
        />
      )}
    </div>
  )
}
