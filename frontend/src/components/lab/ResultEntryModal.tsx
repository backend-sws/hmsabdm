import React, { useState, useEffect, useMemo, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  X,
  FlaskConical,
  Sparkles,
  Calculator,
  ShieldAlert,
  Save,
  RotateCcw,
  History,
  TrendingUp,
  TrendingDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { labService } from "@/services/labService"
import type { LabOrder, LabOrderItem, LabReferenceRange } from "@/types/lab"

interface ResultEntryModalProps {
  order: LabOrder
  onClose: () => void
  onSuccess: () => void
}

interface ParameterState {
  order_item_id: number
  parameter_id?: number | null
  parameter_name: string
  short_code: string
  unit: string
  method: string
  input_type: string
  options?: string[]
  is_calculated: boolean
  formula: string
  observed_value: string
  flag: "normal" | "low" | "high" | "panic_low" | "panic_high" | "abnormal"
  ref_range?: LabReferenceRange | null
  is_manual_override?: boolean
}

export const ResultEntryModal: React.FC<ResultEntryModalProps> = ({
  order,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient()
  const [paramStates, setParamStates] = useState<Record<string, ParameterState>>({})
  const [technicianRemarks, setTechnicianRemarks] = useState("")
  const [activeTestTab, setActiveTestTab] = useState<string>("all")

  // Delta Check: Fetch previous authorized results for patient
  const { data: deltaHistory } = useQuery({
    queryKey: ["lab", "delta", order.patient_id],
    queryFn: () => labService.getDeltaHistory(order.patient_id),
    enabled: Boolean(order.patient_id),
  })

  const deltaMap = useMemo(() => {
    const map: Record<string, any> = {}
    if (deltaHistory && Array.isArray(deltaHistory)) {
      deltaHistory.forEach((item) => {
        if (item.short_code) {
          map[item.short_code.toLowerCase().trim()] = item
        }
        if (item.parameter_id) {
          map[String(item.parameter_id)] = item
        }
      })
    }
    return map
  }, [deltaHistory])

  // Patient Gender resolution
  const patientGender =
    order.patient?.gender === "M" || order.patient?.gender === "Male"
      ? "Male"
      : order.patient?.gender === "F" || order.patient?.gender === "Female"
      ? "Female"
      : "Both"

  // Patient exact age in Years, Months, and Days
  const patientAgeData = useMemo(() => {
    const rawAge = typeof order.patient?.age === "number" ? order.patient.age : 30
    let years = rawAge
    let months = rawAge * 12
    let days = rawAge * 365

    if (order.patient?.dob) {
      const dob = new Date(order.patient.dob)
      const now = new Date()
      const diffMs = now.getTime() - dob.getTime()
      days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
      months = Math.max(0, Math.floor(days / 30.4375))
      years = Math.max(0, Math.floor(days / 365.25))
    }

    return { years, months, days }
  }, [order.patient])

  // Precise Reference Range Matching based on Gender and Age Unit
  const resolveReferenceRange = useCallback(
    (ranges?: LabReferenceRange[]): LabReferenceRange | null => {
      if (!ranges || ranges.length === 0) return null

      // 1. Exact Gender + Age interval match
      const exactMatch = ranges.find((r) => {
        const rGender = r.gender || "Both"
        if (rGender !== "Both" && rGender !== patientGender) return false

        const unit = r.age_unit || "Years"
        const ageVal =
          unit === "Days"
            ? patientAgeData.days
            : unit === "Months"
            ? patientAgeData.months
            : patientAgeData.years

        return ageVal >= (r.age_min ?? 0) && ageVal <= (r.age_max ?? 150)
      })

      if (exactMatch) return exactMatch

      // 2. Gender match fallback
      const genderMatch = ranges.find((r) => r.gender === patientGender)
      if (genderMatch) return genderMatch

      // 3. 'Both' gender fallback
      const bothMatch = ranges.find((r) => (r.gender || "Both") === "Both")
      if (bothMatch) return bothMatch

      return ranges[0]
    },
    [patientGender, patientAgeData]
  )

  // Initialize parameter states from order items & test templates
  useEffect(() => {
    const initialState: Record<string, ParameterState> = {}

    order.items?.forEach((item) => {
      const existingResultsMap = new Map(
        item.results?.map((r) => [r.parameter_id || r.parameter_name, r])
      )

      if (item.test_template?.parameters && item.test_template.parameters.length > 0) {
        item.test_template.parameters.forEach((param) => {
          const key = `${item.id}_${param.id}`
          const existing = existingResultsMap.get(param.id) || existingResultsMap.get(param.name)
          const refRange = resolveReferenceRange(param.reference_ranges)

          initialState[key] = {
            order_item_id: item.id,
            parameter_id: param.id,
            parameter_name: param.name,
            short_code: (param.short_code || "").toUpperCase(),
            unit: param.unit || "",
            method: param.method || item.test_template?.method || "",
            input_type: param.input_type || "numeric",
            options: param.options || undefined,
            is_calculated: Boolean(param.is_calculated || param.formula),
            formula: param.formula || "",
            observed_value: existing?.observed_value || "",
            flag: existing?.flag || "normal",
            ref_range: refRange,
            is_manual_override: false,
          }
        })
      } else {
        const key = `${item.id}_single`
        const existing = item.results?.[0]
        initialState[key] = {
          order_item_id: item.id,
          parameter_id: null,
          parameter_name: item.test_name,
          short_code: (item.test_code || "TEST").toUpperCase(),
          unit: "",
          method: item.test_template?.method || "",
          input_type: "numeric",
          is_calculated: false,
          formula: "",
          observed_value: existing?.observed_value || "",
          flag: existing?.flag || "normal",
          ref_range: null,
          is_manual_override: false,
        }
      }
    })

    setParamStates(initialState)
  }, [order, resolveReferenceRange])

  // Live Formula Evaluation & Range Flagging Engine
  const evaluateAll = useCallback(
    (currentState: Record<string, ParameterState>): Record<string, ParameterState> => {
      const nextState = { ...currentState }

      // 1. Index numeric values by uppercase short_code
      const valuesByCode: Record<string, number> = {}
      Object.values(nextState).forEach((p) => {
        if (p.short_code && p.observed_value && !isNaN(Number(p.observed_value))) {
          valuesByCode[p.short_code] = Number(p.observed_value)
        }
      })

      // 2. Evaluate calculated parameters (unless manual override is active)
      Object.keys(nextState).forEach((k) => {
        const p = nextState[k]
        if (p.is_calculated && p.formula && !p.is_manual_override) {
          let expr = p.formula
          let allVarsPresent = true

          const tokens = expr.match(/\{[a-zA-Z0-9_]+\}/g) || []
          for (const token of tokens) {
            const varName = token.replace(/[{}]/g, "").toUpperCase()
            if (valuesByCode[varName] !== undefined) {
              expr = expr.replace(token, String(valuesByCode[varName]))
            } else {
              allVarsPresent = false
              break
            }
          }

          if (allVarsPresent && tokens.length > 0) {
            try {
              const clean = expr.replace(/[^0-9.+\-*/()\s]/g, "")
              if (clean.trim()) {
                const computed = Function(`"use strict"; return (${clean});`)()
                if (typeof computed === "number" && !isNaN(computed) && isFinite(computed)) {
                  const rounded = Math.round(computed * 100) / 100
                  p.observed_value = String(rounded)
                  if (p.short_code) {
                    valuesByCode[p.short_code] = rounded
                  }
                }
              }
            } catch {
              // Ignore formula syntax error
            }
          }
        }

        // 3. Flag Status (Panic, High, Low, Abnormal, Normal)
        if (p.ref_range && p.input_type !== "heading") {
          const num = Number(p.observed_value)
          if (p.observed_value !== "" && !isNaN(num)) {
            const min = p.ref_range.min_val
            const max = p.ref_range.max_val
            const pMin = p.ref_range.panic_min
            const pMax = p.ref_range.panic_max

            if (pMin !== undefined && pMin !== null && num < pMin) {
              p.flag = "panic_low"
            } else if (pMax !== undefined && pMax !== null && num > pMax) {
              p.flag = "panic_high"
            } else if (min !== undefined && min !== null && num < min) {
              p.flag = "low"
            } else if (max !== undefined && max !== null && num > max) {
              p.flag = "high"
            } else {
              p.flag = "normal"
            }
          } else if (p.ref_range.normal_value && p.observed_value) {
            if (p.observed_value.toLowerCase() !== p.ref_range.normal_value.toLowerCase()) {
              p.flag = "abnormal"
            } else {
              p.flag = "normal"
            }
          }
        }
      })

      return nextState
    },
    []
  )

  const handleValueChange = (key: string, val: string, isManualEditOfCalculated = false) => {
    setParamStates((prev) => {
      const updated = {
        ...prev,
        [key]: {
          ...prev[key],
          observed_value: val,
          is_manual_override: isManualEditOfCalculated ? true : prev[key].is_manual_override,
        },
      }
      return evaluateAll(updated)
    })
  }

  const resetManualOverride = (key: string) => {
    setParamStates((prev) => {
      const updated = {
        ...prev,
        [key]: {
          ...prev[key],
          is_manual_override: false,
        },
      }
      return evaluateAll(updated)
    })
  }

  // Count panic alerts
  const panicAlerts = useMemo(() => {
    return Object.values(paramStates).filter(
      (p) => p.flag === "panic_low" || p.flag === "panic_high"
    )
  }, [paramStates])

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: () => {
      const payloadResults = Object.values(paramStates)
        .filter((p) => p.input_type !== "heading")
        .map((p) => ({
          order_item_id: p.order_item_id,
          parameter_id: p.parameter_id,
          parameter_name: p.parameter_name,
          short_code: p.short_code,
          unit: p.unit,
          method: p.method,
          observed_value: p.observed_value,
          is_calculated: p.is_calculated,
          formula: p.formula,
        }))

      return labService.recordResults(order.id, {
        results: payloadResults,
        technician_remarks: technicianRemarks,
      })
    },
    onSuccess: () => {
      toast.success("Lab test results recorded and verified against reference ranges!")
      queryClient.invalidateQueries({ queryKey: ["lab", "orders"] })
      onSuccess()
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to record lab results.")
    },
  })

  // Group params by order item
  const groupedItems = useMemo(() => {
    const map = new Map<
      number,
      { item: LabOrderItem; params: Array<{ key: string; state: ParameterState }> }
    >()
    order.items?.forEach((item) => {
      map.set(item.id, { item, params: [] })
    })

    Object.entries(paramStates).forEach(([key, state]) => {
      const entry = map.get(state.order_item_id)
      if (entry) {
        entry.params.push({ key, state })
      }
    })

    return Array.from(map.values())
  }, [order.items, paramStates])

  // Filtered by active tab
  const displayedGroupedItems = useMemo(() => {
    if (activeTestTab === "all") return groupedItems
    const itemId = Number(activeTestTab)
    return groupedItems.filter((g) => g.item.id === itemId)
  }, [groupedItems, activeTestTab])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-muted/40 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-foreground text-base">
                  Result Entry Workstation
                </h3>
                <Badge variant="outline" className="font-mono text-xs px-2 py-0.5">
                  Accession #{order.sample_accession_number || order.order_number}
                </Badge>
                {order.urgency === "STAT" && (
                  <Badge variant="destructive" className="animate-pulse text-[10px] font-bold">
                    STAT Critical
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Patient: <span className="font-semibold text-foreground">{order.patient?.name}</span> ({order.patient?.uhid}) • {order.patient?.age || "30"} Y / {order.patient?.gender === "M" ? "Male" : "Female"} • Ref Doctor: <span className="font-semibold text-foreground">{order.doctor?.name || "Self"}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Panic Alerts Banner */}
        {panicAlerts.length > 0 && (
          <div className="px-6 py-2 bg-red-500/15 border-b border-red-500/30 flex items-center gap-2 text-red-600 dark:text-red-400 text-xs font-bold animate-pulse">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>
              CRITICAL PANIC VALUES DETECTED:{" "}
              {panicAlerts.map((p) => `${p.parameter_name} (${p.observed_value} ${p.unit})`).join(", ")}
            </span>
          </div>
        )}

        {/* Multi-Test Tabs Filter */}
        {order.items && order.items.length > 1 && (
          <div className="px-6 pt-2 bg-muted/20 border-b border-border flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveTestTab("all")}
              className={`px-3 py-1.5 rounded-t-lg text-xs font-bold transition-all border-b-2 ${
                activeTestTab === "all"
                  ? "border-primary text-primary bg-background shadow-2xs"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              All Tests ({order.items.length})
            </button>
            {order.items.map((it) => (
              <button
                key={it.id}
                onClick={() => setActiveTestTab(String(it.id))}
                className={`px-3 py-1.5 rounded-t-lg text-xs font-bold transition-all border-b-2 truncate max-w-[200px] ${
                  activeTestTab === String(it.id)
                    ? "border-primary text-primary bg-background shadow-2xs"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {it.test_name}
              </button>
            ))}
          </div>
        )}

        {/* Workstation Table Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {displayedGroupedItems.map(({ item, params }) => (
            <div
              key={item.id}
              className="border border-border rounded-xl overflow-hidden bg-card shadow-2xs"
            >
              {/* Test Panel Header */}
              <div className="px-5 py-3 bg-muted/40 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-foreground tracking-wide">
                      {item.test_name}
                    </span>
                    {item.test_code && (
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {item.test_code}
                      </Badge>
                    )}
                    <span className="text-[11px] text-muted-foreground">
                      • {item.test_template?.sample_type || "Blood / Serum"}
                    </span>
                  </div>
                </div>
                {item.test_template?.method && (
                  <span className="text-[11px] text-muted-foreground italic">
                    Default Method: {item.test_template.method}
                  </span>
                )}
              </div>

              {/* Table of Parameters */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-muted/70 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                    <tr>
                      <th className="py-2.5 px-4 min-w-[200px]">Investigation Parameter</th>
                      <th className="py-2.5 px-3 min-w-[170px] w-52">Observed Result</th>
                      <th className="py-2.5 px-2 w-20">Unit</th>
                      <th className="py-2.5 px-4 min-w-[180px]">Biological Reference Range</th>
                      <th className="py-2.5 px-3 min-w-[130px]">Delta Check (Prev Result)</th>
                      <th className="py-2.5 px-3 w-28 text-center">Status Flag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {params.map(({ key, state }) => {
                      // 1. Heading row
                      if (state.input_type === "heading") {
                        return (
                          <tr key={key} className="bg-muted/40">
                            <td
                              colSpan={6}
                              className="py-2 px-4 font-black uppercase text-xs tracking-wider text-foreground bg-primary/5 border-l-4 border-primary"
                            >
                              {state.parameter_name}
                            </td>
                          </tr>
                        )
                      }

                      const isCalculated = state.is_calculated
                      const isSelection = state.options && state.options.length > 0
                      const isHigh = state.flag === "high" || state.flag === "panic_high"
                      const isLow = state.flag === "low" || state.flag === "panic_low"
                      const isPanic = state.flag === "panic_low" || state.flag === "panic_high"

                      return (
                        <tr key={key} className="hover:bg-muted/20 transition-colors">
                          {/* Parameter Name & Method */}
                          <td className="py-2.5 px-4 font-medium text-foreground">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold">{state.parameter_name}</span>
                              {isCalculated && (
                                <span
                                  title={`Formula: ${state.formula}`}
                                  className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] bg-purple-500/10 text-purple-600 dark:text-purple-400 font-mono font-bold"
                                >
                                  <Calculator className="h-2.5 w-2.5" />
                                  Calc
                                </span>
                              )}
                              {state.is_manual_override && (
                                <span
                                  title="Calculated value manually modified by technician"
                                  className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold"
                                >
                                  Override
                                </span>
                              )}
                            </div>
                            {state.method && (
                              <div className="text-[10px] text-muted-foreground italic mt-0.5">
                                Method: {state.method}
                              </div>
                            )}
                            {state.short_code && (
                              <span className="text-[9px] font-mono text-muted-foreground">
                                [{state.short_code}]
                              </span>
                            )}
                          </td>

                          {/* Observed Result Input Field */}
                          <td className="py-2.5 px-3">
                            {isSelection ? (
                              <select
                                value={state.observed_value}
                                onChange={(e) => handleValueChange(key, e.target.value)}
                                className={`w-full h-8 px-2 rounded-lg border text-xs font-semibold text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary ${
                                  state.flag === "abnormal"
                                    ? "border-red-500 bg-red-500/10 text-red-600 font-bold"
                                    : "border-border bg-card"
                                }`}
                              >
                                <option value="">Select Result...</option>
                                {state.options?.map((opt, oIdx) => (
                                  <option key={oIdx} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            ) : state.input_type === "textarea" ? (
                              <textarea
                                value={state.observed_value}
                                onChange={(e) => handleValueChange(key, e.target.value)}
                                placeholder="Enter observations / findings..."
                                rows={2}
                                className="w-full px-2 py-1 rounded-lg border border-border bg-card text-xs resize-y"
                              />
                            ) : (
                              <div className="relative flex items-center gap-1">
                                <Input
                                  type="text"
                                  value={state.observed_value}
                                  placeholder={
                                    isCalculated && !state.is_manual_override
                                      ? "⚡ Auto-calculates"
                                      : "Enter value"
                                  }
                                  onChange={(e) =>
                                    handleValueChange(key, e.target.value, isCalculated)
                                  }
                                  className={`h-8 text-xs font-semibold ${
                                    isPanic
                                      ? "border-red-500 bg-red-500/10 text-red-600 font-black"
                                      : isHigh
                                      ? "border-red-500/60 bg-red-500/5 text-red-700 font-bold"
                                      : isLow
                                      ? "border-blue-500/60 bg-blue-500/5 text-blue-700 font-bold"
                                      : isCalculated
                                      ? "border-purple-500/30 bg-purple-500/5 text-purple-700 dark:text-purple-300"
                                      : ""
                                  }`}
                                />
                                {isCalculated && state.is_manual_override && (
                                  <button
                                    type="button"
                                    onClick={() => resetManualOverride(key)}
                                    className="p-1.5 rounded text-amber-600 hover:bg-amber-500/10"
                                    title="Reset to calculated formula value"
                                  >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Unit */}
                          <td className="py-2.5 px-2 text-muted-foreground font-mono text-[11px]">
                            {state.unit || "-"}
                          </td>

                          {/* Biological Reference Range */}
                          <td className="py-2.5 px-4 text-foreground">
                            {state.ref_range?.display_range ? (
                              <span className="font-semibold text-xs whitespace-pre-line">
                                {state.ref_range.display_range}
                              </span>
                            ) : state.ref_range?.normal_value ? (
                              <span className="font-semibold text-xs">
                                {state.ref_range.normal_value}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">General</span>
                            )}
                            {state.ref_range && (
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                Scope: {state.ref_range.gender} (Age: {state.ref_range.age_min} - {state.ref_range.age_max} {state.ref_range.age_unit || "Years"})
                              </div>
                            )}
                          </td>

                          {/* Delta Check Column */}
                          <td className="py-2.5 px-3">
                            {(() => {
                              const prev =
                                (state.short_code && deltaMap[state.short_code.toLowerCase().trim()]) ||
                                (state.parameter_id && deltaMap[String(state.parameter_id)])
                              if (!prev) {
                                return (
                                  <span className="text-[10px] text-muted-foreground/60 italic">First test</span>
                                )
                              }

                              let deltaChange: number | null = null
                              const currentNum = parseFloat(state.observed_value)
                              const prevNum = parseFloat(String(prev.value))
                              if (!isNaN(currentNum) && !isNaN(prevNum) && prevNum !== 0) {
                                deltaChange = Math.round(((currentNum - prevNum) / prevNum) * 100)
                              }

                              const isHighShift = deltaChange !== null && Math.abs(deltaChange) >= 30

                              return (
                                <div className="text-[10px] leading-tight space-y-0.5">
                                  <div className="font-semibold text-foreground flex items-center gap-1">
                                    <History className="h-3 w-3 text-muted-foreground" />
                                    <span>{prev.value}</span>
                                    {prev.unit && (
                                      <span className="text-muted-foreground font-mono text-[9px]">
                                        {prev.unit}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[9px] text-muted-foreground truncate">
                                    {prev.test_date}
                                  </div>
                                  {deltaChange !== null && (
                                    <div
                                      className={`font-mono font-bold text-[9px] flex items-center gap-0.5 ${
                                        isHighShift
                                          ? "text-amber-600 dark:text-amber-400"
                                          : deltaChange > 0
                                          ? "text-blue-600 dark:text-blue-400"
                                          : "text-emerald-600 dark:text-emerald-400"
                                      }`}
                                    >
                                      {deltaChange > 0 ? (
                                        <TrendingUp className="h-2.5 w-2.5" />
                                      ) : (
                                        <TrendingDown className="h-2.5 w-2.5" />
                                      )}
                                      <span>
                                        {deltaChange > 0 ? `+${deltaChange}%` : `${deltaChange}%`}
                                      </span>
                                      {isHighShift && (
                                        <span className="text-[8px] bg-amber-500/15 px-1 rounded text-amber-700 dark:text-amber-300 font-sans">
                                          Shift
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )
                            })()}
                          </td>

                          {/* Status Flag */}
                          <td className="py-2.5 px-3 text-center">
                            {state.flag === "panic_low" || state.flag === "panic_high" ? (
                              <Badge
                                variant="destructive"
                                className="animate-pulse text-[10px] px-2 py-0.5 font-black uppercase"
                              >
                                {state.flag === "panic_low" ? "PANIC LOW" : "PANIC HIGH"}
                              </Badge>
                            ) : state.flag === "high" ? (
                              <Badge className="bg-red-500/15 text-red-600 border border-red-500/30 text-[10px] font-bold">
                                HIGH [H]
                              </Badge>
                            ) : state.flag === "low" ? (
                              <Badge className="bg-blue-500/15 text-blue-600 border border-blue-500/30 text-[10px] font-bold">
                                LOW [L]
                              </Badge>
                            ) : state.flag === "abnormal" ? (
                              <Badge className="bg-amber-500/15 text-amber-700 border border-amber-500/30 text-[10px] font-bold">
                                ABNORMAL
                              </Badge>
                            ) : state.observed_value ? (
                              <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px]">
                                Normal
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-[10px]">-</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Clinical Interpretation & Notes Card */}
              {item.test_template?.interpretation && (
                <div className="p-3.5 bg-muted/20 border-t border-border flex items-start gap-2.5">
                  <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold text-[11px] text-foreground uppercase tracking-wider">
                      Reference Clinical Interpretation
                    </span>
                    {/<[a-z][\s\S]*>/i.test(item.test_template.interpretation) ? (
                      <div
                        className="text-[11px] text-muted-foreground leading-relaxed [&_table]:border-collapse [&_table]:w-full [&_table]:my-1.5 [&_th]:border [&_th]:border-border [&_th]:bg-muted/40 [&_th]:p-1.5 [&_th]:text-left [&_th]:font-bold [&_td]:border [&_td]:border-border [&_td]:p-1.5 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"
                        dangerouslySetInnerHTML={{ __html: item.test_template.interpretation }}
                      />
                    ) : (
                      <p className="text-[11px] text-muted-foreground whitespace-pre-line leading-relaxed">
                        {item.test_template.interpretation}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Technician Visit Remarks */}
          <div className="space-y-1.5 p-4 rounded-xl border border-border bg-card">
            <Label className="text-xs font-bold text-foreground">
              Technician Remarks / Observations (Printed on Report)
            </Label>
            <textarea
              value={technicianRemarks}
              onChange={(e) => setTechnicianRemarks(e.target.value)}
              placeholder="e.g. Sample was mildly lipemic. Re-run on automated analyzer with high precision calibrator."
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-xs resize-y"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-muted/30 border-t border-border flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {Object.keys(paramStates).length} parameter(s) monitored
          </div>
          <div className="flex items-center gap-2.5">
            <Button variant="outline" size="sm" onClick={onClose} className="h-9 px-4 text-xs">
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="h-9 px-5 text-xs font-bold gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Save className="h-4 w-4" />
              {saveMutation.isPending ? "Recording Results..." : "Save & Verify Results"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
