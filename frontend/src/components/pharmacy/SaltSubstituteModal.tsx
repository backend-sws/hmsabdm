import React, { useState, useEffect } from "react"
import {
  X,
  Search,
  Sparkles,
  Pill,
  AlertCircle,
  ArrowRight,
  TrendingDown,
  Layers,
  Star,
  CheckCircle2,
} from "lucide-react"
import { useGenericSubstitutes } from "@/hooks/usePharmacy"
import { getBatchFefoStatus, findBestFefoBatch } from "@/utils/pharmacyFefo"
import type { PharmacyBatch, GenericSubstituteItem } from "@/types/pharmacy"

interface SaltSubstituteModalProps {
  isOpen: boolean
  onClose: () => void
  medicineId?: number
  initialBrandName?: string
  initialGenericName?: string
  currentPrice?: number
  onSelectBatch: (batch: PharmacyBatch, substituteItem?: GenericSubstituteItem) => void
}

export const SaltSubstituteModal: React.FC<SaltSubstituteModalProps> = ({
  isOpen,
  onClose,
  medicineId,
  initialBrandName,
  initialGenericName,
  currentPrice,
  onSelectBatch,
}) => {
  const [searchTerm, setSearchTerm] = useState(initialGenericName || initialBrandName || "")

  useEffect(() => {
    if (initialGenericName) {
      setSearchTerm(initialGenericName)
    } else if (initialBrandName) {
      setSearchTerm(initialBrandName)
    }
  }, [initialGenericName, initialBrandName])

  const { data, isLoading } = useGenericSubstitutes(
    {
      medicine_id: medicineId,
      generic_name: searchTerm.trim() || undefined,
      search: !medicineId ? searchTerm.trim() : undefined,
    },
    isOpen && (Boolean(medicineId) || searchTerm.trim().length >= 2)
  )

  if (!isOpen) return null

  const substitutes = data?.substitutes || []
  const activeSalt = data?.generic_name || initialGenericName || searchTerm

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-border dark:bg-card">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Generic Salt Substitute Finder
                </h3>
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  Same Chemical Composition
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Dispense bio-equivalent branded generics with identical active salt when a drug is out of stock or price-sensitive.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search & Active Salt Bar */}
        <div className="border-b border-slate-100 bg-slate-50/60 p-4 dark:border-border dark:bg-muted/20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search active salt composition (e.g. Paracetamol, Amoxicillin)..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none dark:border-border dark:bg-card dark:text-white"
              />
            </div>
            {initialBrandName && (
              <div className="flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/80 px-3 py-2 text-xs font-medium text-indigo-900 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-200">
                <Pill className="h-4 w-4 text-indigo-600 shrink-0" />
                <span className="truncate">
                  Selected Drug: <strong className="font-bold">{initialBrandName}</strong>
                  {currentPrice ? ` (₹${currentPrice})` : ""}
                </span>
              </div>
            )}
          </div>

          {activeSalt && (
            <div className="mt-2.5 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400">
                Active Salt Composition:
              </span>
              <span className="rounded-lg bg-white px-2.5 py-0.5 font-mono text-xs font-bold text-indigo-700 shadow-xs border border-indigo-100 dark:border-border dark:bg-card dark:text-indigo-400">
                {activeSalt}
              </span>
              <span className="text-[11px] text-slate-400">
                • {substitutes.length} formulation{substitutes.length === 1 ? "" : "s"} found in formulary
              </span>
            </div>
          )}
        </div>

        {/* Substitutes List Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
              <p className="mt-3 text-xs font-bold text-slate-500">Searching active salt matches in inventory...</p>
            </div>
          ) : substitutes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <AlertCircle className="h-10 w-10 text-slate-300 dark:text-slate-600" />
              <h4 className="mt-2 text-sm font-bold text-slate-800 dark:text-white">
                No Same-Salt Alternatives Found
              </h4>
              <p className="mt-1 text-xs text-slate-400 max-w-sm">
                No other medicines in your active hospital formulary share this exact salt composition ({activeSalt}).
                You can import alternatives from the 200k+ National Master via Formulary.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {substitutes.map((sub) => {
                const bestFefo = findBestFefoBatch(sub.batches)
                const priceDiff = currentPrice ? currentPrice - sub.min_price : 0
                const isCheaper = priceDiff > 0

                return (
                  <div
                    key={sub.id}
                    className={`rounded-2xl border p-4 transition-all ${
                      sub.is_current
                        ? "border-indigo-300 bg-indigo-50/20 dark:border-indigo-900 dark:bg-indigo-950/10"
                        : sub.in_stock
                        ? "border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md dark:border-border dark:bg-card"
                        : "border-slate-200/60 bg-slate-50/50 opacity-70 dark:border-border/40 dark:bg-muted/10"
                    }`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      {/* Left: Medicine Info */}
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-black text-slate-900 dark:text-white">
                            {sub.brand_name}
                          </h4>
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-muted dark:text-slate-300">
                            {sub.dosage_form}
                          </span>
                          {sub.strength && (
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-muted dark:text-slate-400">
                              {sub.strength}
                            </span>
                          )}
                          {sub.is_current && (
                            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-black text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                              Currently Selected
                            </span>
                          )}
                          {sub.prescription_type && ["SCHEDULE_H", "SCHEDULE_H1", "NARCOTIC"].includes(sub.prescription_type) && (
                            <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              {sub.prescription_type.replace("_", " ")}
                            </span>
                          )}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          <span>Mfg: {sub.manufacturer || "Generic Pharma"}</span>
                          {sub.pack_size > 1 && <span> • Pack Size: {sub.pack_size}</span>}
                        </div>

                        {/* Stock & Expiry Indicators */}
                        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                          {sub.in_stock ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {sub.total_stock} Units In Stock ({sub.batches.length} active batch{sub.batches.length === 1 ? "" : "es"})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-1 font-bold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                              <AlertCircle className="h-3.5 w-3.5" />
                              Out of Stock
                            </span>
                          )}

                          {bestFefo && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 font-semibold text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                              <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                              Best FEFO: Batch {bestFefo.batch_number} (Exp: {bestFefo.expiry_date})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Pricing & 1-Click Replace Button */}
                      <div className="flex items-center justify-between gap-4 md:flex-col md:items-end">
                        <div className="text-left md:text-right">
                          <div className="text-base font-black text-slate-900 dark:text-white">
                            ₹{sub.min_price}
                            <span className="text-[10px] font-normal text-slate-400"> /unit</span>
                          </div>
                          {isCheaper && (
                            <div className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                              <TrendingDown className="h-3 w-3" />
                              Save ₹{priceDiff.toFixed(2)}/unit
                            </div>
                          )}
                        </div>

                        {bestFefo && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectBatch(bestFefo, sub)
                              onClose()
                            }}
                            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/25 transition-all hover:bg-indigo-700 hover:shadow-lg active:scale-95"
                          >
                            <span>Dispense Substitute</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Batch List Dropdown if multiple batches */}
                    {sub.batches.length > 1 && (
                      <div className="mt-3 border-t border-slate-100 pt-3 dark:border-border/50">
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                          Available Batches for {sub.brand_name} (FEFO Prioritized):
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {sub.batches.map((batch) => {
                            const fefo = getBatchFefoStatus(batch.expiry_date)
                            const isRecommended = bestFefo?.id === batch.id

                            return (
                              <div
                                key={batch.id}
                                onClick={() => {
                                  onSelectBatch(batch, sub)
                                  onClose()
                                }}
                                className={`flex cursor-pointer items-center justify-between rounded-xl border p-2 text-xs transition-all hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 ${
                                  isRecommended
                                    ? "border-amber-300 bg-amber-50/30 dark:border-amber-900/50 dark:bg-amber-950/20"
                                    : "border-slate-200 bg-white dark:border-border dark:bg-card"
                                }`}
                              >
                                <div>
                                  <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-white">
                                    <span className="font-mono">#{batch.batch_number}</span>
                                    {isRecommended && (
                                      <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[9px] font-black text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                        ⭐ FEFO Pick
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    Exp: {batch.expiry_date} • {fefo.label}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-primary">₹{batch.selling_price || batch.mrp}</div>
                                  <div className="text-[10px] font-semibold text-emerald-600">
                                    {batch.available_quantity} Avail
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 p-4 dark:border-border dark:bg-muted/30">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Layers className="h-4 w-4 text-indigo-600" />
            <span>Always obtain patient consent prior to brand substitution.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition-all hover:bg-slate-100 dark:border-border dark:bg-card dark:text-slate-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
