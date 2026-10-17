import React, { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  X,
  GitCompare,
  CheckCircle2,
  AlertTriangle,
  Barcode,
  Thermometer,
  ShieldCheck,
  PackageCheck,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { bloodBankService } from "@/services/bloodBankService"
import { bloodBankKeys } from "@/constants/queryKeys"
import type { BloodRequisition, BloodCrossmatch } from "@/types/bloodBank"

interface CrossmatchWorkbenchModalProps {
  isOpen: boolean
  onClose: () => void
  requisition: BloodRequisition | null
  onPrintTag?: (crossmatch: BloodCrossmatch) => void
}

export const CrossmatchWorkbenchModal: React.FC<CrossmatchWorkbenchModalProps> = ({
  isOpen,
  onClose,
  requisition,
  onPrintTag,
}) => {
  const queryClient = useQueryClient()

  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null)
  const [method, setMethod] = useState<"gel_card" | "tube_ahg" | "emergency_uncrossmatched">("gel_card")
  const [compatibility, setCompatibility] = useState<"compatible" | "incompatible">("compatible")
  const [serviceCharge, setServiceCharge] = useState<number>(500)

  // Direct Issue fields (optional immediate issuance)
  const [issueDirectly, setIssueDirectly] = useState(false)
  const [staffName, setStaffName] = useState("")
  const [coldBoxTemp, setColdBoxTemp] = useState<number>(4.2)

  // Query available units of matching blood group and component
  const { data: unitsData, isLoading: loadingUnits } = useQuery({
    queryKey: bloodBankKeys.units({
      blood_group: requisition?.blood_group_needed,
      component_type: requisition?.component_needed,
      status: "available",
      tti_status: "tested_safe",
    }),
    queryFn: () =>
      bloodBankService.getBloodUnits({
        blood_group: requisition?.blood_group_needed,
        component_type: requisition?.component_needed,
        status: "available",
        tti_status: "tested_safe",
        per_page: 20,
      }),
    enabled: isOpen && !!requisition,
  })

  React.useEffect(() => {
    if (requisition?.urgency === "emergency_un_crossmatched") {
      setMethod("emergency_uncrossmatched")
    } else {
      setMethod("gel_card")
    }
    setSelectedUnitId(null)
    setCompatibility("compatible")
    setIssueDirectly(false)
    setStaffName("")
    setColdBoxTemp(4.2)
  }, [requisition])

  const crossmatchMutation = useMutation({
    mutationFn: async () => {
      if (!requisition) throw new Error("No requisition selected")
      if (!selectedUnitId) throw new Error("Please select a blood unit from inventory")

      // 1. Perform crossmatch & reserve
      const crossmatch = await bloodBankService.performCrossmatch(requisition.id, {
        blood_unit_id: selectedUnitId,
        method,
        compatibility,
        service_charge: serviceCharge,
      })

      // 2. If direct issue is checked and compatible, issue right away
      if (issueDirectly && compatibility === "compatible") {
        if (!staffName.trim()) throw new Error("Please enter recipient staff/nurse name for blood issue")
        await bloodBankService.issueBlood(crossmatch.id, {
          issued_to_staff_name: staffName.trim(),
          cold_box_temperature: Number(coldBoxTemp),
        })
      }

      return crossmatch
    },
    onSuccess: (crossmatch) => {
      if (issueDirectly) {
        toast.success("Crossmatch completed & unit issued to clinical staff!")
      } else {
        toast.success(`Unit crossmatched & reserved for 48 hours for patient!`)
      }
      queryClient.invalidateQueries({ queryKey: bloodBankKeys.requisitions() })
      queryClient.invalidateQueries({ queryKey: bloodBankKeys.units() })
      queryClient.invalidateQueries({ queryKey: bloodBankKeys.dashboard })
      onClose()

      if (onPrintTag && crossmatch) {
        onPrintTag(crossmatch)
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to complete crossmatch.")
    },
  })

  if (!isOpen || !requisition) return null

  const availableUnits = unitsData?.data || []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-teal-700 via-emerald-700 to-cyan-800 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/15 backdrop-blur-md rounded-xl">
              <GitCompare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Crossmatch Compatibility & Issue Desk</h2>
              <p className="text-xs text-teal-100 flex items-center gap-2">
                <span>Indent: {requisition.requisition_number}</span>
                <span>•</span>
                <span>Patient: {requisition.patient?.name} ({requisition.patient?.uhid})</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Requisition Summary Strip */}
        <div className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div>
            <span className="text-slate-500">Requested Group:</span>{" "}
            <span className="font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/60 px-2 py-0.5 rounded ml-1">
              {requisition.blood_group_needed}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Component:</span>{" "}
            <span className="font-semibold uppercase text-slate-800 dark:text-slate-200">
              {requisition.component_needed.replace("_", " ")}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Quantity:</span>{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {requisition.units_requested} unit(s)
            </span>
          </div>
          <div>
            <span className="text-slate-500">Urgency:</span>{" "}
            <span className={`px-2 py-0.5 rounded font-bold uppercase ${
              requisition.urgency === "emergency_un_crossmatched" || requisition.urgency === "mtp"
                ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
            }`}>
              {requisition.urgency.replace(/_/g, " ")}
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Unit Inventory Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                1. Select Tested Safe Blood Unit from Inventory *
              </label>
              <span className="text-xs text-slate-500">
                {availableUnits.length} compatible units available
              </span>
            </div>

            {loadingUnits ? (
              <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                Scanning blood bank stock...
              </div>
            ) : availableUnits.length === 0 ? (
              <div className="p-6 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-center text-amber-800 dark:text-amber-200 text-xs">
                <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-amber-600" />
                No available, tested-safe units found for {requisition.blood_group_needed} (
                {requisition.component_needed.toUpperCase()}). Please separate incoming donations or organize an emergency replacement donor drive.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1">
                {availableUnits.map((u) => {
                  const isSelected = selectedUnitId === u.id
                  return (
                    <div
                      key={u.id}
                      onClick={() => setSelectedUnitId(u.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition ${
                        isSelected
                          ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 ring-2 ring-teal-500"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                          <Barcode className="w-3.5 h-3.5 text-teal-600" />
                          {u.unit_barcode}
                        </div>
                        <span className="text-xs font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                          {u.blood_group}
                        </span>
                      </div>
                      <div className="mt-2 text-[11px] text-slate-500 flex justify-between">
                        <span>Vol: {u.volume_ml} mL</span>
                        <span>Exp: {u.expiry_date}</span>
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Safe
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Crossmatch Methodology */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              2. Crossmatching Method & Technology *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: "gel_card",
                  name: "Gel Card (CAT)",
                  desc: "Column Agglutination Test (Gold Standard)",
                },
                {
                  id: "tube_ahg",
                  name: "Tube AHG",
                  desc: "Conventional Indirect Antiglobulin",
                },
                {
                  id: "emergency_uncrossmatched",
                  name: "Emergency Protocol",
                  desc: "Immediate waiver release (concurrent test)",
                },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id as any)}
                  className={`p-3 rounded-xl border text-left transition ${
                    method === m.id
                      ? "border-teal-500 bg-teal-50 dark:bg-teal-950/40 ring-1 ring-teal-500"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  }`}
                >
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{m.name}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Compatibility Verdict */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 block">
              3. Compatibility Test Verdict *
            </label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setCompatibility("compatible")}
                className={`flex-1 p-3 rounded-xl border flex items-center justify-center gap-2 font-semibold text-xs transition ${
                  compatibility === "compatible"
                    ? "bg-emerald-600 text-white shadow-md ring-2 ring-emerald-500/20"
                    : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900"
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                COMPATIBLE (Safe to Transfuse)
              </button>
              <button
                type="button"
                onClick={() => setCompatibility("incompatible")}
                className={`flex-1 p-3 rounded-xl border flex items-center justify-center gap-2 font-semibold text-xs transition ${
                  compatibility === "incompatible"
                    ? "bg-red-600 text-white shadow-md ring-2 ring-red-500/20"
                    : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900"
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                INCOMPATIBLE (Agglutination / Hemolysis)
              </button>
            </div>
          </div>

          {/* Direct Issue Option */}
          {compatibility === "compatible" && (
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={issueDirectly}
                    onChange={(e) => setIssueDirectly(e.target.checked)}
                    className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                  />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Direct Issue to OT / ICU Ward Nurse Now
                  </span>
                </label>
                <span className="text-[11px] text-slate-500">
                  (Otherwise keeps reserved for 48 hrs)
                </span>
              </div>

              {issueDirectly && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Recipient Staff / Staff Nurse Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={staffName}
                      onChange={(e) => setStaffName(e.target.value)}
                      placeholder="e.g. Sister Anjali, OT-1 Nurse"
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Cold Chain Box Temp (°C) * (NABH: 2°C - 10°C)
                    </label>
                    <div className="relative">
                      <Thermometer className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-blue-500" />
                      <input
                        type="number"
                        step="0.1"
                        value={coldBoxTemp}
                        onChange={(e) => setColdBoxTemp(Number(e.target.value))}
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pricing & Reservation Notice */}
          <div className="flex items-center justify-between text-xs text-slate-500 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
            <span>Standard Crossmatch & Serology Processing Fee:</span>
            <div className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
              <span>₹</span>
              <input
                type="number"
                value={serviceCharge}
                onChange={(e) => setServiceCharge(Number(e.target.value))}
                className="w-20 px-2 py-0.5 border border-slate-300 dark:border-slate-700 rounded text-xs bg-transparent"
              />
            </div>
          </div>
        </div>

        {/* Footer Controls */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectedUnitId || crossmatchMutation.isPending}
            onClick={() => crossmatchMutation.mutate()}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-md flex items-center gap-2 transition disabled:opacity-50"
          >
            {crossmatchMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : issueDirectly ? (
              <>
                <PackageCheck className="w-4 h-4" />
                Issue Blood to Nurse
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Confirm Crossmatch & Reserve Unit
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
