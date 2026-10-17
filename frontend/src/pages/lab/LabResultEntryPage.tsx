import React, { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useParams, useNavigate, Link } from "react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  ArrowLeft,
  FlaskConical,
  Calculator,
  Save,
  CheckCircle2,
  Printer,
  ShieldCheck,
  CheckSquare,
  Square,
  FileText,
  RotateCcw,
  AlertTriangle,
  History,
  Loader2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { labService } from "@/services/labService"
import { LabAuditLogModal } from "@/components/lab/LabAuditLogModal"
import { ClinicalEditor } from "@/components/lab/ClinicalEditor"
import { WidalMatrixEntry } from "@/components/lab/special_tests/WidalMatrixEntry"
import { CultureSensitivityEntry } from "@/components/lab/special_tests/CultureSensitivityEntry"
import type { LabOrder, LabOrderItem, LabReferenceRange, LabTestTemplate } from "@/types/lab"

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

export const LabResultEntryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const orderId = parseInt(id || "0")

  const [paramStates, setParamStates] = useState<Record<string, ParameterState>>({})
  const [technicianRemarks, setTechnicianRemarks] = useState("")
  const [clinicalNotes, setClinicalNotes] = useState("")
  const [itemInterpretations, setItemInterpretations] = useState<Record<number, { interpretation: string; technician_remarks: string }>>({})
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([])
  const [selectedForApprovalIds, setSelectedForApprovalIds] = useState<number[]>([])
  const [activeTestTab, setActiveTestTab] = useState<string>("all")
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle")
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup auto-save timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [])

  // 1. Fetch Order Details
  const { data: order, isLoading: isOrderLoading } = useQuery<LabOrder>({
    queryKey: ["lab", "order", orderId],
    queryFn: () => labService.getOrder(orderId),
    enabled: Boolean(orderId),
  })

  // Fetch master catalog templates to guarantee interpretation pre-fill even if item was unlinked
  const { data: catalogTemplates } = useQuery({
    queryKey: ["lab", "allTemplatesCatalog"],
    queryFn: () => labService.getTemplates({ per_page: 300 }),
    staleTime: 5 * 60 * 1000,
  })

  const templatesList: LabTestTemplate[] = useMemo(() => {
    if (!catalogTemplates) return []
    return Array.isArray(catalogTemplates)
      ? catalogTemplates
      : Array.isArray((catalogTemplates as any).data)
      ? (catalogTemplates as any).data
      : []
  }, [catalogTemplates])

  // Initialize per-item interpretations & selective print on order load
  useEffect(() => {
    if (!order?.items) return
    const initInterp: Record<number, { interpretation: string; technician_remarks: string }> = {}
    const initIds: number[] = []

    order.items.forEach((item) => {
      initIds.push(item.id)
      const matchedCatalogTpl =
        item.test_template ||
        templatesList.find(
          (t: any) =>
            (item.test_code && t.test_code?.toUpperCase() === item.test_code.toUpperCase()) ||
            t.test_name?.toLowerCase().trim() === item.test_name?.toLowerCase().trim() ||
            item.test_name?.toLowerCase().includes(t.test_name?.toLowerCase())
        )

      // Priority: previously saved pathologist_remarks > template interpretation from catalog > empty
      const rawInterp = item.pathologist_remarks || matchedCatalogTpl?.interpretation || ""

      initInterp[item.id] = {
        interpretation: rawInterp,
        technician_remarks: item.technician_remarks || "",
      }
    })

    setItemInterpretations((prev) => {
      const merged = { ...initInterp }
      // Preserve any active edits user has already typed during this session
      Object.entries(prev).forEach(([idStr, val]) => {
        if (val.interpretation) {
          merged[Number(idStr)] = val
        }
      })
      return merged
    })
    setSelectedItemIds(initIds)
    // Default select items that are not yet authorized for approval
    setSelectedForApprovalIds(order.items.filter((it) => it.status !== "authorized").map((it) => it.id))
    setClinicalNotes(order.clinical_notes || "")
    setTechnicianRemarks(order.items[0]?.technician_remarks || "")
  }, [order, templatesList])

  // 2. Delta Check: Fetch previous authorized results for patient
  const { data: deltaHistory } = useQuery({
    queryKey: ["lab", "delta", order?.patient_id],
    queryFn: () => labService.getDeltaHistory(order!.patient_id),
    enabled: Boolean(order?.patient_id),
  })

  const deltaMap = useMemo(() => {
    const map: Record<string, any> = {}
    if (deltaHistory && Array.isArray(deltaHistory)) {
      deltaHistory.forEach((item: any) => {
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
    order?.patient?.gender === "M" || order?.patient?.gender === "Male"
      ? "Male"
      : order?.patient?.gender === "F" || order?.patient?.gender === "Female"
      ? "Female"
      : "Both"

  // Patient exact age in Years, Months, and Days
  const patientAgeData = useMemo(() => {
    const rawAge = typeof order?.patient?.age === "number" ? order.patient.age : 30
    let years = rawAge
    let months = rawAge * 12
    let days = rawAge * 365

    if (order?.patient?.dob) {
      const dob = new Date(order.patient.dob)
      const now = new Date()
      const diffMs = now.getTime() - dob.getTime()
      days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
      months = Math.max(0, Math.floor(days / 30.4375))
      years = Math.max(0, Math.floor(days / 365.25))
    }
    return { years, months, days }
  }, [order?.patient?.age, order?.patient?.dob])

  // Match reference range for patient demographics
  const findMatchingRange = useCallback(
    (ranges?: LabReferenceRange[]): LabReferenceRange | null => {
      if (!ranges || ranges.length === 0) return null

      const matchedGender = ranges.filter(
        (r) => r.gender === "Both" || r.gender === patientGender
      )
      if (matchedGender.length === 0) return ranges[0]

      const matchedAge = matchedGender.find((r) => {
        let ageToCheck = patientAgeData.years
        if (r.age_unit === "Months") ageToCheck = patientAgeData.months
        if (r.age_unit === "Days") ageToCheck = patientAgeData.days

        const meetsMin = r.age_min === null || r.age_min === undefined || ageToCheck >= r.age_min
        const meetsMax = r.age_max === null || r.age_max === undefined || ageToCheck <= r.age_max
        return meetsMin && meetsMax
      })

      return matchedAge || matchedGender[0]
    },
    [patientGender, patientAgeData]
  )

  // Compute Flag based on Observed Value & Range
  const computeFlag = useCallback(
    (
      valueStr: string,
      range: LabReferenceRange | null
    ): "normal" | "low" | "high" | "panic_low" | "panic_high" | "abnormal" => {
      if (!valueStr || valueStr.trim() === "" || !range) return "normal"

      const val = parseFloat(valueStr)
      if (isNaN(val)) {
        if (range.normal_value && range.normal_value.trim() !== "") {
          return valueStr.trim().toLowerCase() === range.normal_value.trim().toLowerCase()
            ? "normal"
            : "abnormal"
        }
        return "normal"
      }

      const panicMin = range.panic_min !== null ? parseFloat(String(range.panic_min)) : null
      const panicMax = range.panic_max !== null ? parseFloat(String(range.panic_max)) : null
      const minVal = range.min_val !== null ? parseFloat(String(range.min_val)) : null
      const maxVal = range.max_val !== null ? parseFloat(String(range.max_val)) : null

      if (panicMin !== null && !isNaN(panicMin) && val < panicMin) return "panic_low"
      if (panicMax !== null && !isNaN(panicMax) && val > panicMax) return "panic_high"
      if (minVal !== null && !isNaN(minVal) && val < minVal) return "low"
      if (maxVal !== null && !isNaN(maxVal) && val > maxVal) return "high"

      return "normal"
    },
    []
  )

  // Initialize parameter states when order loads
  useEffect(() => {
    if (!order?.items) return

    const initial: Record<string, ParameterState> = {}

    order.items.forEach((item) => {
      const template = item.test_template
      const parameters = template?.parameters || []

      if (parameters.length > 0) {
        parameters.forEach((param) => {
          const key = `${item.id}_${param.id}`
          const existingRes = item.results?.find((r) => r.parameter_id === param.id)
          const matchedRange = findMatchingRange(param.reference_ranges)
          const obsVal = existingRes?.observed_value || ""

          // Parse options safely if string or array
          let resolvedOptions: string[] = []
          if (Array.isArray(param.options)) {
            resolvedOptions = param.options
          } else if (typeof param.options === "string" && (param.options as string).trim() !== "") {
            try {
              const parsed = JSON.parse(param.options)
              if (Array.isArray(parsed)) resolvedOptions = parsed
            } catch {
              resolvedOptions = (param.options as string)
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean)
            }
          }

          // Fallback options for common tests if not specified
          if (resolvedOptions.length === 0) {
            const isSelectionType =
              (param.input_type as string) === "selection" ||
              (param.input_type as string) === "dropdown"
            const pName = (param.name || "").toLowerCase()
            const pCode = (param.short_code || "").toLowerCase()

            if (pName.includes("widal") || ["to", "th", "ao", "bh"].includes(pCode)) {
              resolvedOptions = ["Negative", "1:20", "1:40", "1:80", "1:160", "1:320"]
            } else if (
              isSelectionType &&
              (pName.includes("dengue") ||
                pName.includes("malaria") ||
                pName.includes("rapid") ||
                pName.includes("antigen") ||
                pName.includes("antibody"))
            ) {
              resolvedOptions = ["Negative", "Positive", "Equivocal"]
            } else if (isSelectionType && (pName.includes("rh") || pCode === "rh")) {
              resolvedOptions = ["Positive", "Negative"]
            } else if (isSelectionType && (pName.includes("blood group") || pCode === "bg")) {
              resolvedOptions = [
                "A Positive",
                "A Negative",
                "B Positive",
                "B Negative",
                "O Positive",
                "O Negative",
                "AB Positive",
                "AB Negative",
              ]
            } else if (isSelectionType) {
              resolvedOptions = ["Negative", "Positive"]
            }
          }

          initial[key] = {
            order_item_id: item.id,
            parameter_id: param.id,
            parameter_name: param.name,
            short_code: param.short_code || "",
            unit: param.unit || "",
            method: param.method || template?.method || "",
            input_type: param.input_type || "numeric",
            options: resolvedOptions,
            is_calculated: param.is_calculated || false,
            formula: param.formula || "",
            observed_value: obsVal,
            flag: existingRes?.flag
              ? (existingRes.flag as any)
              : computeFlag(obsVal, matchedRange),
            ref_range: matchedRange,
          }
        })
      } else {
        const key = `${item.id}_0`
        const existingRes = item.results?.[0]
        const obsVal = existingRes?.observed_value || ""

        initial[key] = {
          order_item_id: item.id,
          parameter_id: null,
          parameter_name: item.test_name,
          short_code: item.test_code || "TEST",
          unit: "",
          method: template?.method || "",
          input_type: "numeric",
          is_calculated: false,
          formula: "",
          observed_value: obsVal,
          flag: (existingRes?.flag as any) || "normal",
          ref_range: null,
        }
      }
    })

    setParamStates(initial)
  }, [order, findMatchingRange, computeFlag])

  // Evaluate Formulas
  const evaluateCalculatedParameters = useCallback(
    (currentStates: Record<string, ParameterState>) => {
      const updated = { ...currentStates }
      const variableMap: Record<string, number> = {}

      Object.values(currentStates).forEach((p) => {
        const val = parseFloat(p.observed_value)
        if (!isNaN(val)) {
          if (p.short_code) variableMap[p.short_code.toUpperCase()] = val
          variableMap[p.parameter_name.toUpperCase()] = val
        }
      })

      Object.entries(currentStates).forEach(([key, param]) => {
        if (!param.is_calculated || !param.formula || param.is_manual_override) return

        try {
          let expr = param.formula.toUpperCase()
          const tokens = Object.keys(variableMap).sort((a, b) => b.length - a.length)
          let hasMissing = false

          for (const token of tokens) {
            if (expr.includes(token)) {
              expr = expr.replaceAll(token, String(variableMap[token]))
            }
          }

          if (/[A-Z_]/.test(expr)) hasMissing = true

          if (!hasMissing) {
            const cleanExpr = expr.replace(/[^0-9+\-*/().]/g, "")
            const computedVal = new Function(`return (${cleanExpr})`)()
            if (typeof computedVal === "number" && !isNaN(computedVal) && isFinite(computedVal)) {
              const formatted = computedVal % 1 === 0 ? String(computedVal) : computedVal.toFixed(2)
              const newFlag = computeFlag(formatted, param.ref_range || null)
              updated[key] = {
                ...param,
                observed_value: formatted,
                flag: newFlag,
              }
            }
          }
        } catch {
          // Expression error ignored
        }
      })

      return updated
    },
    [computeFlag]
  )

  const handleValueChange = (key: string, value: string) => {
    setParamStates((prev) => {
      const target = prev[key]
      if (!target) return prev

      const newFlag = computeFlag(value, target.ref_range || null)
      const next = {
        ...prev,
        [key]: {
          ...target,
          observed_value: value,
          flag: newFlag,
          is_manual_override: target.is_calculated ? true : false,
        },
      }
      return evaluateCalculatedParameters(next)
    })

    // Debounced automatic background save when results are entered
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }
    if (order?.status !== "authorized") {
      autoSaveTimerRef.current = setTimeout(() => {
        setAutoSaveStatus("saving")
        saveMutation.mutate(
          { action: "draft", silent: true },
          {
            onSuccess: () => {
              setAutoSaveStatus("saved")
              setTimeout(() => setAutoSaveStatus("idle"), 3000)
            },
            onError: () => {
              setAutoSaveStatus("idle")
            },
          }
        )
      }, 1500)
    }
  }

  // DLC Sum Check (Differential Leukocyte Count Validation: Neutrophils% + Lymphocytes% + Monocytes% + Eosinophils% + Basophils%)
  const dlcSum = useMemo(() => {
    const dlcCodes = ["neu", "neut", "lymph", "lym", "mono", "mon", "eos", "baso", "bas"]
    const dlcNames = ["neutrophil", "lymphocyte", "monocyte", "eosinophil", "basophil", "polymorph", "band form", "metamyelocyte"]
    let sum = 0
    let count = 0

    Object.values(paramStates).forEach((p) => {
      const name = (p.parameter_name || "").toLowerCase()
      const code = (p.short_code || "").toLowerCase()
      const unit = (p.unit || "").trim().toLowerCase()

      // Strictly exclude absolute counts (ANC, ALC, AMC, AEC, ABC, etc.) and non-percentage parameters
      if (
        name.includes("absolute") ||
        code.startsWith("anc") ||
        code.startsWith("alc") ||
        code.startsWith("amc") ||
        code.startsWith("aec") ||
        code.startsWith("abc") ||
        unit.includes("cell") ||
        unit.includes("cumm") ||
        unit.includes("µl") ||
        unit.includes("ul")
      ) {
        return
      }

      // Must be a recognized DLC differential parameter
      const isDlcParam =
        dlcCodes.includes(code) ||
        dlcNames.some((n) => name.includes(n))

      // Only count parameters whose unit is '%' or empty
      if (isDlcParam && (unit === "%" || unit === "" || name.includes("%"))) {
        const val = parseFloat(p.observed_value)
        if (!isNaN(val)) {
          sum += val
          count++
        }
      }
    })

    return count >= 2 ? Math.round(sum * 10) / 10 : null
  }, [paramStates])

  // Save Results & Optional 1-Click Approval Mutation
  const saveMutation = useMutation({
    mutationFn: async (opts?: {
      action?: "draft" | "approve"
      redirect?: boolean
      approved_item_ids?: number[]
      silent?: boolean
    }) => {
      if (!order) throw new Error("Order not loaded")
      const action = opts?.action || "draft"

      const payloadResults = Object.values(paramStates)
        .filter((p) => p.observed_value !== "")
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

      const itemRemarksPayload: Record<number, { technician_remarks?: string; pathologist_remarks?: string }> = {}
      Object.entries(itemInterpretations).forEach(([itemIdStr, data]) => {
        itemRemarksPayload[Number(itemIdStr)] = {
          pathologist_remarks: data.interpretation,
          technician_remarks: data.technician_remarks,
        }
      })

      return labService.recordResults(order.id, {
        results: payloadResults,
        item_remarks: itemRemarksPayload,
        technician_remarks: technicianRemarks,
        clinical_notes: clinicalNotes,
        action,
        approved_item_ids: opts?.approved_item_ids,
        doctor_id: order.doctor_id,
      })
    },
    onSuccess: (_, vars) => {
      const isApprove = vars?.action === "approve"
      if (isApprove) {
        if (vars?.approved_item_ids && vars.approved_item_ids.length > 0) {
          toast.success(`${vars.approved_item_ids.length} test panel(s) approved and signed off!`)
        } else {
          toast.success("Diagnostic report approved and officially released by Pathologist!")
        }
      } else if (!vars?.silent) {
        toast.success("Lab test results saved successfully (Results Entered)!")
      }
      queryClient.invalidateQueries({ queryKey: ["lab", "orders"] })
      queryClient.invalidateQueries({ queryKey: ["lab", "order", orderId] })
      queryClient.invalidateQueries({ queryKey: ["lab", "auditLogs", orderId] })
      if (vars?.redirect) {
        navigate("/lab")
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to record lab results.")
    },
  })

  // Independent / Selective Test Approval Mutation (e.g. approve 2 of 5 tests!)
  const approveItemsMutation = useMutation({
    mutationFn: async (itemIds: number[]) => {
      if (!order) throw new Error("Order not loaded")
      return saveMutation.mutateAsync({
        action: "approve",
        approved_item_ids: itemIds,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab", "orders"] })
      queryClient.invalidateQueries({ queryKey: ["lab", "order", orderId] })
      queryClient.invalidateQueries({ queryKey: ["lab", "auditLogs", orderId] })
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to approve selected test panels.")
    },
  })

  // Individual Test Revoke Mutation
  const revokeItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      if (!order) throw new Error("Order not loaded")
      return labService.revokeOrderItem(order.id, itemId, "Re-opened for adjustment by pathologist")
    },
    onSuccess: () => {
      toast.info("Test approval revoked. Panel re-opened for editing.")
      queryClient.invalidateQueries({ queryKey: ["lab", "orders"] })
      queryClient.invalidateQueries({ queryKey: ["lab", "order", orderId] })
      queryClient.invalidateQueries({ queryKey: ["lab", "auditLogs", orderId] })
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to revoke test approval.")
    },
  })

  // Revoke Authorization Mutation (Whole order)
  const revokeMutation = useMutation({
    mutationFn: () => labService.revokeAuthorization(orderId, "Re-opened for modification by pathologist"),
    onSuccess: () => {
      toast.info("Authorization revoked. Report re-opened for editing.")
      queryClient.invalidateQueries({ queryKey: ["lab", "orders"] })
      queryClient.invalidateQueries({ queryKey: ["lab", "order", orderId] })
      queryClient.invalidateQueries({ queryKey: ["lab", "auditLogs", orderId] })
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to revoke authorization.")
    },
  })

  // Selective print navigation
  const handlePrintSelected = (withHeader: boolean = true) => {
    const testIds = selectedItemIds.length > 0 ? selectedItemIds.join(",") : ""
    const url = `/lab/orders/${orderId}/report?tests=${testIds}&header=${withHeader ? "1" : "0"}`
    window.open(url, "_blank")
  }

  // Toggle single test selection for selective print
  const toggleItemSelection = (itemId: number) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    )
  }

  // Group params by order item
  const groupedItems = useMemo(() => {
    if (!order?.items) return []
    const map = new Map<number, { item: LabOrderItem; params: Array<{ key: string; state: ParameterState }> }>()
    order.items.forEach((item) => {
      map.set(item.id, { item, params: [] })
    })

    Object.entries(paramStates).forEach(([key, state]) => {
      const entry = map.get(state.order_item_id)
      if (entry) {
        entry.params.push({ key, state })
      }
    })

    return Array.from(map.values())
  }, [order?.items, paramStates])

  // Live completion status for every test panel in order
  const itemCompletionMap = useMemo(() => {
    const map = new Map<
      number,
      {
        isComplete: boolean
        isPartiallyFilled: boolean
        isEmpty: boolean
        filledCount: number
        totalCount: number
        statusBadge: { text: string; className: string }
        canApprove: boolean
      }
    >()

    groupedItems.forEach(({ item, params }) => {
      const isAuthorized = item.status === "authorized"
      const totalCount = params.length
      const filledCount = params.filter(
        (p) =>
          p.state.observed_value !== undefined &&
          p.state.observed_value !== null &&
          String(p.state.observed_value).trim() !== ""
      ).length

      const isComplete = totalCount > 0 && filledCount >= totalCount
      const isPartiallyFilled = filledCount > 0 && filledCount < totalCount
      const isEmpty = filledCount === 0

      let statusBadge = {
        text: "Pending Entry",
        className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
      }

      if (isAuthorized) {
        statusBadge = {
          text: "✓ Approved",
          className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
        }
      } else if (isComplete) {
        statusBadge = {
          text: "✓ Results Entered",
          className: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
        }
      } else if (isPartiallyFilled) {
        statusBadge = {
          text: `${filledCount}/${totalCount} Entered`,
          className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
        }
      }

      map.set(item.id, {
        isComplete,
        isPartiallyFilled,
        isEmpty,
        filledCount,
        totalCount,
        statusBadge,
        canApprove: isComplete && !isAuthorized,
      })
    })

    return map
  }, [groupedItems])

  // Ready item IDs that have complete results and are not yet authorized
  const readyItemIds = useMemo(() => {
    return groupedItems
      .filter(({ item }) => item.status !== "authorized")
      .filter(({ item }) => itemCompletionMap.get(item.id)?.isComplete)
      .map(({ item }) => item.id)
  }, [groupedItems, itemCompletionMap])

  // Selected item IDs that are valid and complete for batch approval
  const validSelectedForApprovalIds = useMemo(() => {
    return selectedForApprovalIds.filter((id) => itemCompletionMap.get(id)?.isComplete)
  }, [selectedForApprovalIds, itemCompletionMap])

  // Automatically sync ready checkboxes when test parameter entries become complete
  useEffect(() => {
    if (!order?.items) return
    setSelectedForApprovalIds((prev) => {
      const next = new Set(prev)
      let changed = false

      groupedItems.forEach(({ item }) => {
        if (item.status === "authorized") {
          if (next.has(item.id)) {
            next.delete(item.id)
            changed = true
          }
          return
        }

        const comp = itemCompletionMap.get(item.id)
        if (comp?.isComplete && !next.has(item.id)) {
          next.add(item.id)
          changed = true
        } else if (!comp?.isComplete && next.has(item.id)) {
          next.delete(item.id)
          changed = true
        }
      })

      return changed ? Array.from(next) : prev
    })
  }, [itemCompletionMap, order?.items, groupedItems])

  // Approve single test safely with full parameter save
  const handleApproveSingleTest = (itemId: number) => {
    const comp = itemCompletionMap.get(itemId)
    if (!comp?.isComplete) {
      toast.error(
        `Cannot approve: Results pending (${comp?.filledCount || 0}/${comp?.totalCount || 0} entered). Please enter results first.`
      )
      return
    }
    saveMutation.mutate({
      action: "approve",
      approved_item_ids: [itemId],
    })
  }

  // Count abnormal and critical parameters
  const stats = useMemo(() => {
    const list = Object.values(paramStates)
    const filled = list.filter((p) => p.observed_value !== "").length
    const abnormal = list.filter((p) => p.flag === "high" || p.flag === "low" || p.flag === "abnormal").length
    const critical = list.filter((p) => p.flag === "panic_high" || p.flag === "panic_low").length
    return { total: list.length, filled, abnormal, critical }
  }, [paramStates])

  if (isOrderLoading) {
    return (
      <div className="py-24 text-center">
        <LoadingSpinner label="Loading diagnostic order and test parameters..." />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-xl font-bold text-foreground">Diagnostic Order Not Found</h2>
        <Button onClick={() => navigate("/lab")}>Back to Worklist</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      {/* ── Top Breadcrumbs & Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
            <Link to="/lab" className="hover:text-foreground flex items-center gap-1 transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" />
              Laboratory Desk
            </Link>
            <span>/</span>
            <span className="text-foreground">Order #{order.order_number}</span>
            <span>/</span>
            <span className="text-primary font-bold">Result Entry Workstation</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <FlaskConical className="h-6 w-6 text-primary" />
            Pathology Result Entry & Validation
          </h1>
        </div>

        {/* Quick action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/lab")}
            className="text-xs h-9"
          >
            Back to Queue
          </Button>

          {/* Audit Trail Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAuditModalOpen(true)}
            className="text-xs h-9 gap-1.5 border-primary/30 text-primary hover:bg-primary/5 font-semibold"
            title="View History of Result Entries, Changes, and Sign-offs"
          >
            <History className="h-3.5 w-3.5" />
            Audit Trail
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePrintSelected(true)}
            className="text-xs h-9 gap-1.5"
            title="Print selected tests on Letterhead"
          >
            <Printer className="h-3.5 w-3.5 text-primary" />
            Print ({selectedItemIds.length})
          </Button>

          {/* Auto-save Status Indicator */}
          {autoSaveStatus === "saving" && (
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 animate-pulse">
              <Loader2 className="h-3 w-3 animate-spin" />
              Auto-saving...
            </span>
          )}
          {autoSaveStatus === "saved" && (
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="h-3 w-3" />
              Auto-saved
            </span>
          )}

          {/* Save Draft / Update Results (ALWAYS ALLOWED, EVEN ON AUTHORIZED ORDERS!) */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => saveMutation.mutate({ action: "draft" })}
            disabled={saveMutation.isPending}
            className="text-xs h-9 gap-1.5 font-bold"
            title="Save result entries with audit logging"
          >
            <Save className="h-3.5 w-3.5" />
            {saveMutation.isPending
              ? "Saving..."
              : order.status === "authorized"
              ? "Save / Update Results"
              : "Save Draft"}
          </Button>

          {/* Approve Selected Ready Panels */}
          {validSelectedForApprovalIds.length > 0 && order.status !== "authorized" && (
            <Button
              variant="default"
              size="sm"
              onClick={() => approveItemsMutation.mutate(validSelectedForApprovalIds)}
              disabled={approveItemsMutation.isPending || saveMutation.isPending}
              className="text-xs font-bold gap-1.5 h-9 bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
              title="Approve only selected tests and mark order Partial Approved"
            >
              <ShieldCheck className="h-4 w-4" />
              {approveItemsMutation.isPending
                ? "Approving..."
                : `Approve Selected (${validSelectedForApprovalIds.length})`}
            </Button>
          )}

          {/* Full Order Approve / Release or Revoke */}
          {order.status === "authorized" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => revokeMutation.mutate()}
              disabled={revokeMutation.isPending}
              className="text-xs h-9 gap-1.5 text-red-600 border-red-500/30 hover:bg-red-500/10 font-bold"
              title="Revoke sign-off for all tests in this order"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Revoke Sign-off
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                if (readyItemIds.length === 0) {
                  toast.error("Cannot approve: No test has complete results entered. Please enter observed results first.")
                  return
                }
                saveMutation.mutate({ action: "approve", approved_item_ids: readyItemIds })
              }}
              disabled={saveMutation.isPending || readyItemIds.length === 0}
              className={`text-xs font-bold gap-1.5 h-9 shadow-sm transition-all ${
                readyItemIds.length > 0
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                  : "bg-muted text-muted-foreground border border-border cursor-not-allowed opacity-60 hover:bg-muted"
              }`}
              title={
                readyItemIds.length > 0
                  ? `Approve and officially sign off ${readyItemIds.length} completed test(s)`
                  : "Cannot approve: Enter test parameter results first"
              }
            >
              <ShieldCheck className="h-4 w-4" />
              {saveMutation.isPending
                ? "Validating & Approving..."
                : readyItemIds.length > 0
                ? `Approve Ready Tests (${readyItemIds.length})`
                : "Approve Ready Tests (0)"}
            </Button>
          )}
        </div>
      </div>

      {/* ── Patient Demographics & Order Banner ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 p-4 rounded-2xl bg-card border border-border shadow-xs">
        <div>
          <span className="text-[10px] text-muted-foreground block font-bold uppercase">Patient Name</span>
          <span className="font-bold text-foreground text-sm truncate block">{order.patient?.name}</span>
          <span className="text-[11px] text-muted-foreground font-mono">UHID: {order.patient?.uhid}</span>
        </div>

        <div>
          <span className="text-[10px] text-muted-foreground block font-bold uppercase">Age / Gender</span>
          <span className="font-semibold text-foreground text-sm">
            {order.patient?.age ? `${order.patient.age} Y` : "N/A"} • {order.patient?.gender === "M" ? "Male" : "Female"}
          </span>
          <span className="text-[11px] text-muted-foreground block">
            DOB: {order.patient?.dob ? new Date(order.patient.dob).toLocaleDateString() : "N/A"}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-muted-foreground block font-bold uppercase">Token & Urgency</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            {order.token_number && (
              <span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                {order.token_number}
              </span>
            )}
            {order.urgency === "STAT" ? (
              <Badge variant="destructive" className="animate-pulse text-[10px] font-bold uppercase">
                STAT
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">
                {order.urgency}
              </Badge>
            )}
          </div>
        </div>

        <div>
          <span className="text-[10px] text-muted-foreground block font-bold uppercase">Accession Barcode</span>
          <span className="font-mono font-bold text-foreground text-xs block">
            {order.sample_accession_number || "SMP-SAMPLE-PENDING"}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {order.sample_collected_at
              ? new Date(order.sample_collected_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "Collected"}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-muted-foreground block font-bold uppercase">Referring Doctor</span>
          <span className="font-semibold text-foreground text-xs block truncate">
            {order.doctor?.name || "Self / Walk-In"}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {order.doctor?.specialization || "General Practice"}
          </span>
        </div>

        <div className="text-right flex flex-col justify-between">
          <span className="text-[10px] text-muted-foreground block font-bold uppercase">Test Progress & Status</span>
          <div className="font-mono text-sm font-bold text-foreground">
            {order.items?.filter((i) => i.status === "authorized").length || 0} / {order.items?.length || 0} Approved
          </div>
          <div className="flex items-center gap-1 mt-0.5 justify-end">
            {order.status === "authorized" ? (
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                ✓ Full Authorized
              </Badge>
            ) : order.status === "partially_authorized" ? (
              <Badge className="bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/30 text-[10px] font-bold">
                ⚡ Partial Approved
              </Badge>
            ) : (
              <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 text-[10px] font-bold">
                {stats.filled} / {stats.total} Params
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Partial Authorization Alert Banner */}
      {order.status === "partially_authorized" && (
        <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-800 dark:text-teal-300 text-xs font-semibold flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-teal-600 shrink-0" />
            <span>
              Interim Diagnostic Status: <strong>{order.items?.filter((i) => i.status === "authorized").length || 0} of {order.items?.length || 0}</strong> tests approved and released. Remaining pending tests can be entered and approved below.
            </span>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono border-teal-500/40 text-teal-700">
            {order.items?.filter((i) => i.status !== "authorized").length || 0} Pending
          </Badge>
        </div>
      )}

      {/* Authorized Order Modification Alert Banner */}
      {order.status === "authorized" && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              This diagnostic report is officially authorized. You can still modify any parameter values or remarks below; changes will be automatically logged to the Audit Trail.
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAuditModalOpen(true)}
            className="h-6 text-[10px] text-emerald-700 underline hover:no-underline font-bold"
          >
            View Audit Log
          </Button>
        </div>
      )}

      {/* ── Test Sections Filter Tabs ── */}
      {order.items && order.items.length > 1 && (
        <div className="flex border-b border-border overflow-x-auto text-xs font-semibold gap-1">
          <button
            onClick={() => setActiveTestTab("all")}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeTestTab === "all"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            All Prescribed Panels ({order.items.length})
          </button>
          {order.items.map((it) => (
            <button
              key={it.id}
              onClick={() => setActiveTestTab(String(it.id))}
              className={`px-4 py-2 border-b-2 transition-colors ${
                activeTestTab === String(it.id)
                  ? "border-primary text-primary font-bold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {it.test_name}
            </button>
          ))}
        </div>
      )}

      {/* ── DLC Differential Leukocyte Count Validation Alert Banner ── */}
      {dlcSum !== null && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${
            Math.round(dlcSum) === 100
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
              : "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400 animate-pulse"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {Math.round(dlcSum) === 100 ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            )}
            <div>
              <span className="font-bold">
                {Math.round(dlcSum) === 100
                  ? "DLC Sum Validation Passed:"
                  : "DLC Sum Validation Alert:"}
              </span>{" "}
              Total sum of Differential Leukocyte Count (Neutrophils + Lymphocytes + Monocytes + Eosinophils + Basophils) is{" "}
              <strong className="underline">{dlcSum}%</strong>.{" "}
              {Math.round(dlcSum) !== 100 && "(Pathology guidelines require sum to equal exactly 100% before releasing report)"}
            </div>
          </div>
          <Badge
            className={
              Math.round(dlcSum) === 100
                ? "bg-emerald-600 text-white"
                : "bg-amber-600 text-white"
            }
          >
            DLC Sum: {dlcSum}%
          </Badge>
        </div>
      )}

      {/* ── Main Parameters Entry Grid ── */}
      <div className="space-y-6">
        {groupedItems
          .filter(({ item }) => activeTestTab === "all" || activeTestTab === String(item.id))
          .map(({ item, params }) => {
            const comp = itemCompletionMap.get(item.id)
            const isSelectedForPrint = selectedItemIds.includes(item.id)
            const isWidal =
              item.test_code?.toUpperCase() === "WIDAL" ||
              item.test_name.toLowerCase().includes("widal")
            const isCulture =
              item.test_name.toLowerCase().includes("culture") ||
              item.test_code?.toUpperCase().includes("CULT") ||
              params.some((p) => p.state.input_type === "culture_sensitivity")

            return (
              <div key={item.id} className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
                {/* Panel Header */}
                <div className="px-6 py-3.5 bg-muted/40 border-b border-border flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleItemSelection(item.id)}
                      className="text-muted-foreground hover:text-foreground transition-colors p-1"
                      title={isSelectedForPrint ? "Uncheck to exclude from print" : "Check to include in print"}
                    >
                      {isSelectedForPrint ? (
                        <CheckSquare className="h-5 w-5 text-primary" />
                      ) : (
                        <Square className="h-5 w-5" />
                      )}
                    </button>
                    <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                      <FlaskConical className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                        {item.test_name}
                        {isSelectedForPrint && (
                          <span className="text-[10px] font-normal px-2 py-0.5 rounded bg-primary/10 text-primary">
                            Selected for Print
                          </span>
                        )}
                      </h3>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                        <span>Code: {item.test_code || "TEST"}</span>
                        {item.test_template?.container_color && (
                          <span>• Tube: {item.test_template.container_color}</span>
                        )}
                        {item.test_template?.method && (
                          <span>• Method: {item.test_template.method}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Item Dynamic Status Badge */}
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-2.5 py-0.5 font-bold transition-all ${
                        comp?.statusBadge.className || "bg-amber-500/10 text-amber-700 border-amber-500/20"
                      }`}
                    >
                      {comp?.statusBadge.text || "Pending Entry"}
                    </Badge>

                    {/* Checkbox for batch approval */}
                    {item.status !== "authorized" && (
                      <label
                        className={`flex items-center gap-1.5 text-[11px] font-semibold transition-opacity select-none ${
                          comp?.isComplete
                            ? "text-foreground cursor-pointer"
                            : "text-muted-foreground/60 cursor-not-allowed opacity-60"
                        }`}
                        title={
                          comp?.isComplete
                            ? "Marked ready for batch sign-off"
                            : `Results pending (${comp?.filledCount || 0}/${comp?.totalCount || 0} entered). Enter all results to make ready.`
                        }
                      >
                        <input
                          type="checkbox"
                          checked={selectedForApprovalIds.includes(item.id)}
                          disabled={!comp?.isComplete}
                          onChange={(e) => {
                            if (e.target.checked) {
                              if (!comp?.isComplete) {
                                toast.error(`Cannot select: Results not entered yet for ${item.test_name}`)
                                return
                              }
                              setSelectedForApprovalIds((prev) => [...prev, item.id])
                            } else {
                              setSelectedForApprovalIds((prev) => prev.filter((id) => id !== item.id))
                            }
                          }}
                          className="rounded border-border text-primary cursor-pointer disabled:cursor-not-allowed"
                        />
                        <span>Ready</span>
                      </label>
                    )}

                    {/* Single Test Approve or Revoke Button */}
                    {item.status === "authorized" ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => revokeItemMutation.mutate(item.id)}
                        disabled={revokeItemMutation.isPending}
                        className="text-[11px] h-7 gap-1 text-red-600 hover:text-red-700 hover:bg-red-500/10 font-semibold"
                        title="Revoke approval for this specific test panel"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Revoke Test
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        onClick={() => handleApproveSingleTest(item.id)}
                        disabled={saveMutation.isPending || approveItemsMutation.isPending || !comp?.canApprove}
                        className={`text-[11px] h-7 gap-1 font-bold shadow-xs transition-all ${
                          comp?.canApprove
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                            : "bg-muted text-muted-foreground border border-border cursor-not-allowed opacity-60 hover:bg-muted"
                        }`}
                        title={
                          comp?.canApprove
                            ? "Save observed results and approve this test panel now"
                            : `Cannot approve: Results not entered yet (${comp?.filledCount || 0}/${comp?.totalCount || 0} entered). Enter results first.`
                        }
                      >
                        <ShieldCheck className="h-3 w-3" />
                        Approve This Test
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/lab/orders/${orderId}/report?tests=${item.id}&header=1`, "_blank")}
                      className="text-xs h-7 gap-1 font-semibold"
                    >
                      <Printer className="h-3 w-3 text-primary" />
                      Print
                    </Button>
                    <Badge variant="outline" className="text-xs">
                      {params.length} Parameter(s)
                    </Badge>
                  </div>
                </div>

                {/* Specialized Workstations: Widal Agglutination Matrix */}
                {(item.test_code?.toUpperCase() === "WIDAL" ||
                  item.test_name.toLowerCase().includes("widal")) && (
                  <div className="p-3 bg-muted/10 border-b border-border">
                    <WidalMatrixEntry
                      initialValues={(() => {
                        const map: Record<string, string> = {}
                        params.forEach(({ state }) => {
                          if (state.short_code) {
                            map[state.short_code.toUpperCase()] = state.observed_value
                          }
                        })
                        return map
                      })()}
                      onTitreChange={(paramCode, titre) => {
                        const targetParam = params.find(
                          (p) =>
                            p.state.short_code?.toUpperCase() === paramCode.toUpperCase() ||
                            p.state.parameter_name.toUpperCase().includes(paramCode.toUpperCase())
                        )
                        if (targetParam) {
                          handleValueChange(targetParam.key, titre)
                        }
                      }}
                    />
                  </div>
                )}

                {/* Specialized Workstations: Culture & Sensitivity Antibiogram */}
                {(item.test_name.toLowerCase().includes("culture") ||
                  item.test_code?.toUpperCase().includes("CULT") ||
                  params.some((p) => p.state.input_type === "culture_sensitivity")) && (
                  <div className="p-3 bg-muted/10 border-b border-border">
                    <CultureSensitivityEntry
                      testName={item.test_name}
                      defaultSpecimen={item.test_template?.sample_type || ""}
                      initialValue={params[0]?.state?.observed_value}
                      onResultChange={(_summary, jsonStr) => {
                        if (params[0]) {
                          handleValueChange(params[0].key, jsonStr)
                        }
                      }}
                    />
                  </div>
                )}

                {/* Parameters Table: Hidden for specialized Culture/Widal to avoid duplicate tables */}
                {!isWidal && !isCulture && (
                  <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-border/70 bg-muted/20 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-5 py-3 w-[260px]">Parameter & Method</th>
                        <th className="px-4 py-3 w-[240px]">Observed Result</th>
                        <th className="px-4 py-3 w-[100px]">Unit</th>
                        <th className="px-4 py-3 w-[220px]">Reference Interval</th>
                        <th className="px-4 py-3 w-[110px]">Status / Flag</th>
                        <th className="px-5 py-3 w-[220px]">Delta Check (Previous)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {params.map(({ key, state }) => {
                        const deltaItem =
                          deltaMap[state.short_code?.toLowerCase().trim()] ||
                          (state.parameter_id ? deltaMap[String(state.parameter_id)] : null)

                        // Compute delta difference if both are numbers
                        let deltaDiffText = ""
                        let deltaBadgeColor = ""
                        if (deltaItem && state.observed_value) {
                          const cur = parseFloat(state.observed_value)
                          const prev = parseFloat(String(deltaItem.value))
                          if (!isNaN(cur) && !isNaN(prev) && prev !== 0) {
                            const pct = ((cur - prev) / prev) * 100
                            const sign = pct > 0 ? "+" : ""
                            deltaDiffText = `${sign}${pct.toFixed(1)}%`
                            if (Math.abs(pct) > 50) {
                              deltaBadgeColor = "text-red-600 bg-red-500/10 border-red-500/20"
                            } else if (Math.abs(pct) > 25) {
                              deltaBadgeColor = "text-amber-600 bg-amber-500/10 border-amber-500/20"
                            } else {
                              deltaBadgeColor = "text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
                            }
                          }
                        }

                        return (
                          <tr
                            key={key}
                            className={`hover:bg-muted/30 transition-colors ${
                              state.flag === "panic_high" || state.flag === "panic_low"
                                ? "bg-red-500/5"
                                : state.flag === "high" || state.flag === "low"
                                ? "bg-amber-500/5"
                                : ""
                            }`}
                          >
                            {/* Parameter Name */}
                            <td className="px-5 py-3">
                              <div className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                                {state.parameter_name}
                                {state.is_calculated && (
                                  <span
                                    className="text-[9px] px-1 py-0.2 rounded bg-purple-500/10 text-purple-600 border border-purple-500/20 flex items-center gap-0.5"
                                    title={`Auto-computed formula: ${state.formula}`}
                                  >
                                    <Calculator className="h-2.5 w-2.5" />
                                    Formula
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                {state.short_code}
                                {state.method && <span> • {state.method}</span>}
                              </div>
                            </td>

                            {/* Observed Input */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {(state.input_type === "dropdown" ||
                                  state.input_type === "selection" ||
                                  (state.options && state.options.length > 0)) &&
                                state.options &&
                                state.options.length > 0 ? (
                                  <select
                                    value={state.observed_value}
                                    onChange={(e) => handleValueChange(key, e.target.value)}
                                    className="h-8.5 w-full rounded-lg border border-border bg-background px-2.5 text-xs font-semibold focus:ring-1 focus:ring-primary focus:outline-none"
                                  >
                                    <option value="">Select Result...</option>
                                    {state.options.map((opt) => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <Input
                                    value={state.observed_value}
                                    onChange={(e) => handleValueChange(key, e.target.value)}
                                    placeholder={state.is_calculated ? "Calculated" : "Enter result..."}
                                    className={`h-8.5 text-xs font-mono font-bold ${
                                      state.flag === "panic_high" || state.flag === "panic_low"
                                        ? "border-red-500 text-red-600 bg-red-500/10"
                                        : state.flag === "high" || state.flag === "low"
                                        ? "border-amber-500 text-amber-600 bg-amber-500/10"
                                        : "border-border"
                                    }`}
                                  />
                                )}
                              </div>
                            </td>

                            {/* Unit */}
                            <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                              {state.unit || "—"}
                            </td>

                            {/* Biological Reference Interval */}
                            <td className="px-4 py-3">
                              {state.ref_range ? (
                                <div>
                                  <span className="font-mono text-xs font-medium text-foreground block">
                                    {state.ref_range.min_val !== null && state.ref_range.max_val !== null
                                      ? `${state.ref_range.min_val} - ${state.ref_range.max_val}`
                                      : state.ref_range.normal_value || "As per clinical correlation"}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground block">
                                    {state.ref_range.gender} • {state.ref_range.age_min || 0}-
                                    {state.ref_range.age_max || "120"} {state.ref_range.age_unit || "Years"}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-[11px] italic">
                                  Reference interval not configured
                                </span>
                              )}
                            </td>

                            {/* Status Flag */}
                            <td className="px-4 py-3">
                              {state.flag === "panic_high" ? (
                                <Badge variant="destructive" className="text-[10px] font-bold uppercase animate-pulse">
                                  Panic High
                                </Badge>
                              ) : state.flag === "panic_low" ? (
                                <Badge variant="destructive" className="text-[10px] font-bold uppercase animate-pulse">
                                  Panic Low
                                </Badge>
                              ) : state.flag === "high" ? (
                                <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px] font-bold">
                                  High ↑
                                </Badge>
                              ) : state.flag === "low" ? (
                                <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px] font-bold">
                                  Low ↓
                                </Badge>
                              ) : state.flag === "abnormal" ? (
                                <Badge className="bg-red-500/15 text-red-600 border-red-500/30 text-[10px] font-bold">
                                  Abnormal
                                </Badge>
                              ) : state.observed_value ? (
                                <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
                                  Normal ✓
                                </Badge>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">Pending</span>
                              )}
                            </td>

                            {/* Delta Check */}
                            <td className="px-5 py-3">
                              {deltaItem ? (
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-bold text-xs text-foreground">
                                      {deltaItem.value} {deltaItem.unit || ""}
                                    </span>
                                    {deltaDiffText && (
                                      <span
                                        className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded border ${deltaBadgeColor}`}
                                      >
                                        {deltaDiffText}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-muted-foreground block mt-0.5">
                                    {deltaItem.test_date}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-[10px] italic">
                                  No previous tests
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

                {/* Per-Test Clinical Interpretation & Impression Visual Editor */}
                <div className="p-4 bg-muted/20 border-t border-border">
                  <ClinicalEditor
                    label={`INTERPRETATION FOR ${item.test_name.toUpperCase()}`}
                    value={itemInterpretations[item.id]?.interpretation || ""}
                    defaultTemplate={
                      item.test_template?.interpretation ||
                      templatesList.find(
                        (t: any) =>
                          (item.test_code && t.test_code?.toUpperCase() === item.test_code.toUpperCase()) ||
                          t.test_name?.toLowerCase().trim() === item.test_name?.toLowerCase().trim() ||
                          item.test_name?.toLowerCase().includes(t.test_name?.toLowerCase())
                      )?.interpretation ||
                      ""
                    }
                    onChange={(val) => {
                      setItemInterpretations((prev) => ({
                        ...prev,
                        [item.id]: {
                          interpretation: val,
                          technician_remarks: prev[item.id]?.technician_remarks || "",
                        },
                      }))
                    }}
                    placeholder={`Add specific interpretation for ${item.test_name}...`}
                  />
                </div>
              </div>
            )
          })}
      </div>

      {/* ── Master Action Bar ── */}
      <div className="p-4 rounded-2xl border border-border bg-card shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>
            Selected for Print: <strong>{selectedItemIds.length} of {order.items?.length || 0} panels</strong>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
            {/* Audit Trail Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAuditModalOpen(true)}
              className="text-xs h-9 gap-1.5 border-primary/30 text-primary hover:bg-primary/5 font-semibold"
            >
              <History className="h-3.5 w-3.5" />
              Audit Trail
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePrintSelected(true)}
              className="text-xs h-9 gap-1.5"
            >
              <Printer className="h-3.5 w-3.5 text-primary" />
              Print Letterhead ({selectedItemIds.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePrintSelected(false)}
              className="text-xs h-9 gap-1.5 text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
              title="Print on pre-printed stationery without digital header"
            >
              <FileText className="h-3.5 w-3.5" />
              Stationery Paper
            </Button>
            {/* Auto-save Status Indicator */}
            {autoSaveStatus === "saving" && (
              <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 animate-pulse">
                <Loader2 className="h-3 w-3 animate-spin" />
                Auto-saving...
              </span>
            )}
            {autoSaveStatus === "saved" && (
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="h-3 w-3" />
                Auto-saved
              </span>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => saveMutation.mutate({ action: "draft" })}
              disabled={saveMutation.isPending}
              className="text-xs h-9 gap-1.5 font-bold"
            >
              <Save className="h-3.5 w-3.5" />
              {saveMutation.isPending
                ? "Saving..."
                : order.status === "authorized"
                ? "Save / Update Results"
                : "Save Draft"}
            </Button>

            {/* Approve Selected Ready Panels */}
            {validSelectedForApprovalIds.length > 0 && order.status !== "authorized" && (
              <Button
                variant="default"
                size="sm"
                onClick={() => approveItemsMutation.mutate(validSelectedForApprovalIds)}
                disabled={approveItemsMutation.isPending || saveMutation.isPending}
                className="text-xs font-bold gap-1.5 h-9 bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
                title="Approve only selected tests and mark order Partial Approved"
              >
                <ShieldCheck className="h-4 w-4" />
                {approveItemsMutation.isPending
                  ? "Approving..."
                  : `Approve Selected (${validSelectedForApprovalIds.length})`}
              </Button>
            )}

            {order.status === "authorized" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => revokeMutation.mutate()}
                disabled={revokeMutation.isPending}
                className="text-xs h-9 gap-1.5 text-red-600 border-red-500/30 hover:bg-red-500/10 font-bold"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Revoke Sign-off
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  if (readyItemIds.length === 0) {
                    toast.error("Cannot approve: No test has complete results entered. Please enter observed results first.")
                    return
                  }
                  saveMutation.mutate({ action: "approve", approved_item_ids: readyItemIds })
                }}
                disabled={saveMutation.isPending || readyItemIds.length === 0}
                className={`text-xs font-bold gap-1.5 h-9 shadow-sm transition-all ${
                  readyItemIds.length > 0
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                    : "bg-muted text-muted-foreground border border-border cursor-not-allowed opacity-60 hover:bg-muted"
                }`}
                title={
                  readyItemIds.length > 0
                    ? `Approve and officially sign off ${readyItemIds.length} completed test(s)`
                    : "Cannot approve: Enter test parameter results first"
                }
              >
                <ShieldCheck className="h-4 w-4" />
                {saveMutation.isPending
                  ? "Validating & Approving..."
                  : readyItemIds.length > 0
                  ? `Approve Ready Tests (${readyItemIds.length})`
                  : "Approve Ready Tests (0)"}
              </Button>
            )}
          </div>
        </div>

      {/* Audit Trail Modal */}
      {isAuditModalOpen && (
        <LabAuditLogModal
          order={order}
          isOpen={isAuditModalOpen}
          onClose={() => setIsAuditModalOpen(false)}
        />
      )}
    </div>
  )
}
