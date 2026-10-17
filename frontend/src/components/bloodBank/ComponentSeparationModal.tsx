import React, { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  X,
  Disc3,
  ThermometerSnowflake,
  Activity,
  Layers,
  Sparkles,
  Clock,
  Loader2,
  Barcode,
} from "lucide-react"
import { toast } from "sonner"
import { bloodBankService } from "@/services/bloodBankService"
import { bloodBankKeys } from "@/constants/queryKeys"
import type { BloodUnit } from "@/types/bloodBank"

interface ComponentSeparationModalProps {
  isOpen: boolean
  onClose: () => void
  unit: BloodUnit | null
}

export const ComponentSeparationModal: React.FC<ComponentSeparationModalProps> = ({
  isOpen,
  onClose,
  unit,
}) => {
  const queryClient = useQueryClient()

  const [includePrbc, setIncludePrbc] = useState(true)
  const [prbcVolume, setPrbcVolume] = useState(250)

  const [includeFfp, setIncludeFfp] = useState(true)
  const [ffpVolume, setFfpVolume] = useState(200)

  const [includePlatelets, setIncludePlatelets] = useState(true)
  const [plateletVolume, setPlateletVolume] = useState(55)

  const [includeCryo, setIncludeCryo] = useState(false)
  const [cryoVolume, setCryoVolume] = useState(20)

  const [centrifugeSpeed, setCentrifugeSpeed] = useState("3800 RPM @ 4°C, 10 min")

  const separationMutation = useMutation({
    mutationFn: (payload: any) => {
      if (!unit) throw new Error("No unit selected")
      return bloodBankService.separateComponents(unit.id, payload)
    },
    onSuccess: () => {
      toast.success(
        `Unit ${unit?.unit_barcode} separated into therapeutic components successfully!`
      )
      queryClient.invalidateQueries({ queryKey: bloodBankKeys.units() })
      queryClient.invalidateQueries({ queryKey: bloodBankKeys.dashboard })
      onClose()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to separate components.")
    },
  })

  if (!isOpen || !unit) return null

  const totalYield =
    (includePrbc ? Number(prbcVolume) : 0) +
    (includeFfp ? Number(ffpVolume) : 0) +
    (includePlatelets ? Number(plateletVolume) : 0) +
    (includeCryo ? Number(cryoVolume) : 0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const components: any[] = []
    if (includePrbc) {
      components.push({
        component_type: "prbc",
        volume_ml: Number(prbcVolume),
        bag_type: "triple_sag_m",
      })
    }
    if (includeFfp) {
      components.push({
        component_type: "ffp",
        volume_ml: Number(ffpVolume),
        bag_type: "satellite_ffp",
      })
    }
    if (includePlatelets) {
      components.push({
        component_type: "platelets",
        volume_ml: Number(plateletVolume),
        bag_type: "gas_permeable_rdp",
      })
    }
    if (includeCryo) {
      components.push({
        component_type: "cryo",
        volume_ml: Number(cryoVolume),
        bag_type: "cryo_satellite",
      })
    }

    if (components.length === 0) {
      toast.error("Please select at least one component to yield.")
      return
    }

    separationMutation.mutate({
      components,
      centrifuge_protocol: centrifugeSpeed,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-700 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/15 backdrop-blur-md rounded-xl">
              <Disc3 className="w-6 h-6 text-white animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Refrigerated Component Separation</h2>
              <p className="text-xs text-indigo-100 flex items-center gap-2">
                <span>Centrifuge Fractionation (Triple / Quadruple Bag)</span>
                <span>•</span>
                <span className="font-mono bg-indigo-950/50 px-2 py-0.5 rounded text-[11px] font-semibold">
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

        {/* Source Unit Info Strip */}
        <div className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Barcode className="w-4 h-4 text-slate-500" />
            <span className="text-slate-500">Source Bag:</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{unit.unit_barcode}</span>
          </div>
          <div>
            <span className="text-slate-500">Blood Group:</span>{" "}
            <span className="inline-flex items-center px-2 py-0.5 rounded-md font-bold text-red-700 bg-red-100 dark:bg-red-950/60 dark:text-red-300">
              {unit.blood_group}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Raw Volume:</span>{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">{unit.volume_ml} mL</span>
          </div>
          <div>
            <span className="text-slate-500">Calculated Yield:</span>{" "}
            <span className={`font-bold ${totalYield > unit.volume_ml + 20 ? "text-amber-600" : "text-emerald-600"}`}>
              {totalYield} mL
            </span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900 rounded-xl p-3.5 text-xs text-indigo-900 dark:text-indigo-200 flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-indigo-600 shrink-0" />
            <p>
              Separation splits 1 unit of whole blood into 3 life-saving components. The parent whole blood unit will be archived, and new barcoded component fractions will be placed into their dedicated climate storage.
            </p>
          </div>

          {/* Centrifuge Protocol */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
              Centrifuge Protocol & Spin Parameters
            </label>
            <input
              type="text"
              value={centrifugeSpeed}
              onChange={(e) => setCentrifugeSpeed(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="e.g. Heavy Spin: 3800 RPM @ 4°C, 10 min; Light Spin for PRP"
            />
          </div>

          {/* Component Selection Grid */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Component Fractions to Generate
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* PRBC Card */}
              <div
                className={`p-4 rounded-xl border transition cursor-pointer ${
                  includePrbc
                    ? "border-red-500 bg-red-50/40 dark:bg-red-950/20 ring-1 ring-red-500"
                    : "border-slate-200 dark:border-slate-800 opacity-60 bg-white dark:bg-slate-900"
                }`}
                onClick={() => setIncludePrbc(!includePrbc)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-red-600 text-white flex items-center justify-center text-xs font-bold">
                      RBC
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        Packed Red Cells (PRBC)
                      </h4>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <ThermometerSnowflake className="w-3 h-3 text-blue-500" />
                        2°C to 6°C • Shelf-life: 42 Days
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={includePrbc}
                    onChange={(e) => setIncludePrbc(e.target.checked)}
                    className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                {includePrbc && (
                  <div className="mt-3 pt-3 border-t border-red-200/50 dark:border-red-900/50 flex items-center gap-2">
                    <label className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                      Volume:
                    </label>
                    <input
                      type="number"
                      min={150}
                      max={350}
                      value={prbcVolume}
                      onChange={(e) => setPrbcVolume(Number(e.target.value))}
                      onClick={(e) => e.stopPropagation()}
                      className="w-24 px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    />
                    <span className="text-xs text-slate-500">mL (with SAGM)</span>
                  </div>
                )}
              </div>

              {/* FFP Card */}
              <div
                className={`p-4 rounded-xl border transition cursor-pointer ${
                  includeFfp
                    ? "border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 ring-1 ring-amber-500"
                    : "border-slate-200 dark:border-slate-800 opacity-60 bg-white dark:bg-slate-900"
                }`}
                onClick={() => setIncludeFfp(!includeFfp)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center text-xs font-bold">
                      FFP
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        Fresh Frozen Plasma (FFP)
                      </h4>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <ThermometerSnowflake className="w-3 h-3 text-cyan-500" />
                        ≤ -30°C Deep Freezer • 1 Year
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeFfp}
                    onChange={(e) => setIncludeFfp(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                {includeFfp && (
                  <div className="mt-3 pt-3 border-t border-amber-200/50 dark:border-amber-900/50 flex items-center gap-2">
                    <label className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                      Volume:
                    </label>
                    <input
                      type="number"
                      min={100}
                      max={300}
                      value={ffpVolume}
                      onChange={(e) => setFfpVolume(Number(e.target.value))}
                      onClick={(e) => e.stopPropagation()}
                      className="w-24 px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    />
                    <span className="text-xs text-slate-500">mL</span>
                  </div>
                )}
              </div>

              {/* Platelets Card */}
              <div
                className={`p-4 rounded-xl border transition cursor-pointer ${
                  includePlatelets
                    ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 ring-1 ring-emerald-500"
                    : "border-slate-200 dark:border-slate-800 opacity-60 bg-white dark:bg-slate-900"
                }`}
                onClick={() => setIncludePlatelets(!includePlatelets)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                      PLT
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        Random Donor Platelets (RDP)
                      </h4>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Activity className="w-3 h-3 text-emerald-500" />
                        20°C - 24°C Agitator • 5 Days
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={includePlatelets}
                    onChange={(e) => setIncludePlatelets(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                {includePlatelets && (
                  <div className="mt-3 pt-3 border-t border-emerald-200/50 dark:border-emerald-900/50 flex items-center gap-2">
                    <label className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                      Volume:
                    </label>
                    <input
                      type="number"
                      min={30}
                      max={100}
                      value={plateletVolume}
                      onChange={(e) => setPlateletVolume(Number(e.target.value))}
                      onClick={(e) => e.stopPropagation()}
                      className="w-24 px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    />
                    <span className="text-xs text-slate-500">mL</span>
                  </div>
                )}
              </div>

              {/* Cryoprecipitate Card */}
              <div
                className={`p-4 rounded-xl border transition cursor-pointer ${
                  includeCryo
                    ? "border-purple-500 bg-purple-50/40 dark:bg-purple-950/20 ring-1 ring-purple-500"
                    : "border-slate-200 dark:border-slate-800 opacity-60 bg-white dark:bg-slate-900"
                }`}
                onClick={() => setIncludeCryo(!includeCryo)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center text-xs font-bold">
                      CRYO
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        Cryoprecipitate (Factor VIII / Fibrinogen)
                      </h4>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-purple-500" />
                        ≤ -30°C • 1 Year
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeCryo}
                    onChange={(e) => setIncludeCryo(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                {includeCryo && (
                  <div className="mt-3 pt-3 border-t border-purple-200/50 dark:border-purple-900/50 flex items-center gap-2">
                    <label className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                      Volume:
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={40}
                      value={cryoVolume}
                      onChange={(e) => setCryoVolume(Number(e.target.value))}
                      onClick={(e) => e.stopPropagation()}
                      className="w-24 px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    />
                    <span className="text-xs text-slate-500">mL</span>
                  </div>
                )}
              </div>
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
              disabled={separationMutation.isPending}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md flex items-center gap-2 transition"
            >
              {separationMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Fractions...
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4" />
                  Complete Separation & Create Fractions
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
