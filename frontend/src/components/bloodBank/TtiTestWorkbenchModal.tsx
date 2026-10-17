import React, { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  X,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FileCheck2,
  CheckCircle2,
  XCircle,
  FlaskConical,
  Barcode,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { bloodBankService } from "@/services/bloodBankService"
import { bloodBankKeys } from "@/constants/queryKeys"
import type { BloodUnit, BloodGroup } from "@/types/bloodBank"

interface TtiTestWorkbenchModalProps {
  isOpen: boolean
  onClose: () => void
  unit: BloodUnit | null
}

export const TtiTestWorkbenchModal: React.FC<TtiTestWorkbenchModalProps> = ({
  isOpen,
  onClose,
  unit,
}) => {
  const queryClient = useQueryClient()

  const [hiv, setHiv] = useState<"non_reactive" | "reactive">("non_reactive")
  const [hbv, setHbv] = useState<"non_reactive" | "reactive">("non_reactive")
  const [hcv, setHcv] = useState<"non_reactive" | "reactive">("non_reactive")
  const [syphilis, setSyphilis] = useState<"non_reactive" | "reactive">("non_reactive")
  const [malaria, setMalaria] = useState<"non_reactive" | "reactive">("non_reactive")
  const [confirmedGroup, setConfirmedGroup] = useState<BloodGroup>(unit?.blood_group || "O+")
  const [remarks, setRemarks] = useState("")

  React.useEffect(() => {
    if (unit) {
      setConfirmedGroup(unit.blood_group)
      setHiv("non_reactive")
      setHbv("non_reactive")
      setHcv("non_reactive")
      setSyphilis("non_reactive")
      setMalaria("non_reactive")
      setRemarks("")
    }
  }, [unit])

  const isAnyReactive =
    hiv === "reactive" ||
    hbv === "reactive" ||
    hcv === "reactive" ||
    syphilis === "reactive" ||
    malaria === "reactive"

  const ttiMutation = useMutation({
    mutationFn: (payload: any) => {
      if (!unit) throw new Error("No unit selected")
      return bloodBankService.recordTtiTest(unit.id, payload)
    },
    onSuccess: (data) => {
      if (data.overall_status === "passed") {
        toast.success(`Unit ${unit?.unit_barcode} cleared safe & moved to Available stock!`)
      } else {
        toast.error(`Unit ${unit?.unit_barcode} tested REACTIVE. Marked biohazard for safe discard!`)
      }
      queryClient.invalidateQueries({ queryKey: bloodBankKeys.units() })
      queryClient.invalidateQueries({ queryKey: bloodBankKeys.dashboard })
      onClose()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to save TTI test results.")
    },
  })

  if (!isOpen || !unit) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    ttiMutation.mutate({
      hiv_result: hiv,
      hbv_result: hbv,
      hcv_result: hcv,
      syphilis_result: syphilis,
      malaria_result: malaria,
      blood_group_confirmed: confirmedGroup,
      remarks: remarks || (isAnyReactive ? "Reactive TTI test detected" : "All standard 5 serological markers non-reactive"),
    })
  }

  const tests = [
    { id: "hiv", label: "HIV 1 & 2 (Antibody / p24 Ag)", value: hiv, setter: setHiv },
    { id: "hbv", label: "HBV (HBsAg ELISA / CLIA)", value: hbv, setter: setHbv },
    { id: "hcv", label: "HCV (Anti-HCV Antibody)", value: hcv, setter: setHcv },
    { id: "syphilis", label: "Syphilis (VDRL / TPHA Treponemal)", value: syphilis, setter: setSyphilis },
    { id: "malaria", label: "Malaria Parasite (Antigen / Rapid Pf/Pv)", value: malaria, setter: setMalaria },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-red-600 to-rose-700 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/15 backdrop-blur-md rounded-xl">
              <FlaskConical className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">TTI Serology & Pathologist Release</h2>
              <p className="text-xs text-red-100 flex items-center gap-2">
                <span>Drugs & Cosmetics Act Mandatory 5-Marker Testing</span>
                <span>•</span>
                <span className="font-mono bg-red-800/60 px-2 py-0.5 rounded text-[11px] font-semibold">
                  {unit.unit_barcode}
                </span>
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

        {/* Unit Info Strip */}
        <div className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Barcode className="w-4 h-4 text-slate-500" />
            <span className="text-slate-500">Unit ID:</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{unit.unit_barcode}</span>
          </div>
          <div>
            <span className="text-slate-500">Donor Blood Group:</span>{" "}
            <span className="inline-flex items-center px-2 py-0.5 rounded-md font-bold text-red-700 bg-red-100 dark:bg-red-950/60 dark:text-red-300">
              {unit.blood_group}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Component:</span>{" "}
            <span className="font-medium uppercase text-slate-700 dark:text-slate-300">{unit.component_type.replace("_", " ")}</span>
          </div>
          <div>
            <span className="text-slate-500">Volume:</span>{" "}
            <span className="font-medium text-slate-700 dark:text-slate-300">{unit.volume_ml} mL</span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status Alert Banner */}
          {isAnyReactive ? (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 flex items-start gap-3">
              <ShieldAlert className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-red-900 dark:text-red-200">
                  REACTIVE INFECTION DETECTED - BIOHAZARD QUARANTINE
                </h4>
                <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                  Submitting this will immediately invalidate this blood unit, mark it for high-temperature autoclave incineration, and record donor deferral in accordance with statutory guidelines.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-start gap-3">
              <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                  All 5 Mandatory Pathogen Screenings Non-Reactive
                </h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                  Upon authorization, unit status will change from <span className="font-semibold underline">Quarantine</span> to <span className="font-semibold underline">Available</span> for cross-matching and patient issue.
                </p>
              </div>
            </div>
          )}

          {/* Test Grid */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Mandatory Serological Immunoassay (CLIA / ELISA)
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
              {tests.map((test) => (
                <div key={test.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{test.label}</p>
                    <p className="text-[11px] text-slate-400">Kit Batch & Calibrator in range</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => test.setter("non_reactive")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                        test.value === "non_reactive"
                          ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/20"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200"
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Non-Reactive (Safe)
                    </button>
                    <button
                      type="button"
                      onClick={() => test.setter("reactive")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                        test.value === "reactive"
                          ? "bg-red-600 text-white shadow-sm ring-2 ring-red-500/20"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200"
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reactive (Positive)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Blood Group Confirmation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                ABO & Rh Confirmed Group *
              </label>
              <select
                value={confirmedGroup}
                onChange={(e) => setConfirmedGroup(e.target.value as BloodGroup)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500 outline-none"
              >
                {(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as BloodGroup[]).map((grp) => (
                  <option key={grp} value={grp}>
                    {grp}
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Forward and Reverse cell/serum grouping confirmed
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Technician / Pathologist Remarks
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Absorbance OD 0.04 (Cut-off 0.20), safe"
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>
          </div>

          {/* Footer Controls */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={ttiMutation.isPending}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md flex items-center gap-2 transition ${
                isAnyReactive
                  ? "bg-red-700 hover:bg-red-800"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              {ttiMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Recording Result...
                </>
              ) : isAnyReactive ? (
                <>
                  <AlertTriangle className="w-4 h-4" />
                  Discard Unit as Reactive Biohazard
                </>
              ) : (
                <>
                  <FileCheck2 className="w-4 h-4" />
                  Authorize & Release to Safe Stock
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
