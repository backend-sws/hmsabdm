import React, { useState } from "react"
import {
  X,
  History,
  Pill,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileText,
  Sparkles,
  ShoppingCart,
} from "lucide-react"
import { usePatientMedicationHistory } from "@/hooks/usePharmacy"
import { getBatchFefoStatus } from "@/utils/pharmacyFefo"
import type { PharmacyBatch, PatientMedicationHistoryItem, PharmacySale } from "@/types/pharmacy"
import type { Patient } from "@/types/patient"

interface PatientMedicationHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  patient: Patient | null
  onRefillItem: (item: PatientMedicationHistoryItem, batch: PharmacyBatch) => void
  onRefillAll: (itemsWithBatches: Array<{ item: PatientMedicationHistoryItem; batch: PharmacyBatch }>) => void
  onOpenSubstitutes?: (medicineId: number, brandName: string, genericName?: string) => void
}

export const PatientMedicationHistoryModal: React.FC<PatientMedicationHistoryModalProps> = ({
  isOpen,
  onClose,
  patient,
  onRefillItem,
  onRefillAll,
  onOpenSubstitutes,
}) => {
  const [activeTab, setActiveTab] = useState<"medications" | "invoices">("medications")

  const patientId = patient ? Number(patient.id) : undefined
  const { data, isLoading } = usePatientMedicationHistory(patientId, isOpen && Boolean(patientId))

  if (!isOpen || !patient) return null

  const medications = data?.medications || []
  const recentSales = data?.recent_sales || []
  const patientName = (patient.name || `${patient.first_name || ""} ${patient.last_name || ""}`).trim()

  const refillableItems = medications
    .filter((m) => m.can_refill && m.fefo_batch)
    .map((m) => ({ item: m, batch: m.fefo_batch! }))

  const handleRefillAllClick = () => {
    if (refillableItems.length === 0) return
    onRefillAll(refillableItems)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-border dark:bg-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
              <History className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Patient Past Medication History & 1-Click Refill
                </h3>
                <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full dark:bg-teal-950 dark:text-teal-300">
                  {patient.uhid}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Patient: <strong className="font-bold text-slate-700 dark:text-slate-300">{patientName}</strong> • Phone: {patient.mobile || patient.phone || "N/A"}
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

        {/* Tab Switcher & 1-Click Master Refill Bar */}
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/60 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-border dark:bg-muted/20">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("medications")}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                activeTab === "medications"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-card dark:text-slate-300"
              }`}
            >
              <Pill className="h-3.5 w-3.5" />
              Distinct Medications ({medications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("invoices")}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                activeTab === "invoices"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-card dark:text-slate-300"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              Past Invoices ({recentSales.length})
            </button>
          </div>

          {activeTab === "medications" && refillableItems.length > 0 && (
            <button
              type="button"
              onClick={handleRefillAllClick}
              className="flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-teal-600/25 transition-all hover:bg-teal-700 active:scale-95"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>1-Click Refill All In-Stock ({refillableItems.length} Drugs)</span>
            </button>
          )}
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
              <p className="mt-3 text-xs font-bold text-slate-500">Fetching past prescription records...</p>
            </div>
          ) : activeTab === "medications" ? (
            medications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <History className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                <h4 className="mt-2 text-sm font-bold text-slate-800 dark:text-white">
                  No Past Pharmacy Records Found
                </h4>
                <p className="mt-1 text-xs text-slate-400 max-w-sm">
                  This patient does not have any prior pharmacy dispensing bills recorded in this hospital yet.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {medications.map((item) => {
                  const fefo = item.fefo_batch ? getBatchFefoStatus(item.fefo_batch.expiry_date) : null

                  return (
                    <div
                      key={item.medicine_id}
                      className={`flex flex-col gap-3 rounded-2xl border p-4 transition-all sm:flex-row sm:items-center sm:justify-between ${
                        item.in_stock
                          ? "border-slate-200 bg-white hover:border-teal-300 dark:border-border dark:bg-card"
                          : "border-slate-200/60 bg-slate-50/50 dark:border-border/40 dark:bg-muted/10"
                      }`}
                    >
                      {/* Left: Drug Details */}
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-black text-slate-900 dark:text-white">
                            {item.brand_name}
                          </h4>
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-muted dark:text-slate-300">
                            {item.dosage_form}
                          </span>
                          {item.strength && (
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-muted dark:text-slate-400">
                              {item.strength}
                            </span>
                          )}
                          {item.prescription_type && ["SCHEDULE_H", "SCHEDULE_H1", "NARCOTIC"].includes(item.prescription_type) && (
                            <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              {item.prescription_type.replace("_", " ")}
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-500">
                          <span>Salt: {item.generic_name || "N/A"}</span>
                          {item.last_purchased_at && (
                            <span>
                              {" "}• Last Refilled: {new Date(item.last_purchased_at).toLocaleDateString()} (Qty: {item.last_quantity})
                            </span>
                          )}
                        </div>

                        {/* Stock status badge */}
                        <div className="pt-1 flex flex-wrap items-center gap-2 text-xs">
                          {item.in_stock ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {item.current_stock} Units In Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 font-bold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                              <AlertCircle className="h-3.5 w-3.5" />
                              Currently Out of Stock
                            </span>
                          )}

                          {item.fefo_batch && fefo && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 font-semibold text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 text-[11px]">
                              FEFO Batch: #{item.fefo_batch.batch_number} (Exp: {item.fefo_batch.expiry_date})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {item.in_stock && item.fefo_batch ? (
                          <button
                            type="button"
                            onClick={() => {
                              onRefillItem(item, item.fefo_batch!)
                              onClose()
                            }}
                            className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-700 transition-all active:scale-95"
                          >
                            <ShoppingCart className="h-3.5 w-3.5" />
                            <span>+ Refill to Cart</span>
                          </button>
                        ) : (
                          onOpenSubstitutes && (
                            <button
                              type="button"
                              onClick={() => {
                                onOpenSubstitutes(item.medicine_id, item.brand_name, item.generic_name || undefined)
                                onClose()
                              }}
                              className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-all dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-300"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                              <span>Find Salt Substitutes</span>
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          ) : (
            /* Invoices Tab */
            recentSales.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <FileText className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                <h4 className="mt-2 text-sm font-bold text-slate-800 dark:text-white">
                  No Past Invoices
                </h4>
              </div>
            ) : (
              <div className="space-y-3">
                {recentSales.map((sale: PharmacySale) => (
                  <div
                    key={sale.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-border dark:bg-card"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-slate-900 dark:text-white">
                            {sale.invoice_number}
                          </span>
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-muted dark:text-slate-300">
                            {sale.sale_type}
                          </span>
                          <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            {sale.payment_mode}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          Date: {sale.created_at ? new Date(sale.created_at).toLocaleString() : "N/A"}
                          {sale.doctor_name && ` • Prescribed by: ${sale.doctor_name}`}
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-black text-slate-900 dark:text-white">
                          ₹{sale.net_amount}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {sale.items?.length || sale.items_count || 0} items
                        </span>
                      </div>
                    </div>

                    {/* Sale Items preview */}
                    {sale.items && sale.items.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2.5 dark:border-border/50">
                        {sale.items.map((it) => (
                          <span
                            key={it.id}
                            className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 dark:bg-muted dark:text-slate-300"
                          >
                            <Pill className="h-3 w-3 text-teal-600" />
                            {it.medicine?.brand_name || "Item"} (x{it.quantity})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 p-4 dark:border-border dark:bg-muted/30">
          <span className="text-xs text-slate-500">
            Records are synchronized with Hospital Central Patient Repository.
          </span>
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
