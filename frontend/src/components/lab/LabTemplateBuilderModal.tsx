import React, { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  X,
  Plus,
  Trash2,
  Save,
  FlaskConical,
  Sparkles,
  Settings,
  ChevronUp,
  ChevronDown,
  Type,
  ListPlus,
  Sliders,
  FileText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { RichHtmlEditor } from "@/components/common/RichHtmlEditor"
import { labService } from "@/services/labService"
import type { LabTestTemplate, LabReferenceRange } from "@/types/lab"

interface LabTemplateBuilderModalProps {
  template?: LabTestTemplate | null
  onClose: () => void
  onSuccess: () => void
}

export interface RangeRow {
  gender: "Both" | "Male" | "Female"
  age_min: number
  age_max: number
  age_unit: "Years" | "Months" | "Days"
  min_val: string
  max_val: string
  display_range: string
  normal_value: string
  panic_min?: string
  panic_max?: string
  interpretation_notes?: string
}

export interface ParameterRow {
  name: string
  short_code: string
  unit: string
  method: string
  input_type: "numeric" | "calculated" | "selection" | "text" | "textarea" | "heading"
  formula: string
  options: string[]
  ranges: RangeRow[]
}

export const LabTemplateBuilderModal: React.FC<LabTemplateBuilderModalProps> = ({
  template,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient()
  const isEditing = Boolean(template)

  // Test-level metadata
  const [testName, setTestName] = useState(template?.test_name || "")
  const [testCode, setTestCode] = useState(template?.test_code || "")
  const [category, setCategory] = useState(template?.category || "Biochemistry")
  const [sampleType, setSampleType] = useState(template?.sample_type || "Blood / Serum")
  const [containerColor, setContainerColor] = useState(
    template?.container_color || "Red / Plain (SST Gel Tube)"
  )
  const [method, setMethod] = useState(template?.method || "")
  const [tatHours, setTatHours] = useState(
    template?.tat_hours ? String(template.tat_hours) : "24"
  )
  const [price, setPrice] = useState(
    template?.standard_price ? String(template.standard_price) : "0"
  )
  const [description, setDescription] = useState(template?.description || "")
  const [interpretation, setInterpretation] = useState(template?.interpretation || "")

  // Active Tab: Basic Info vs Parameters vs Clinical Notes
  const [activeTab, setActiveTab] = useState<"general" | "parameters" | "interpretation">("parameters")

  // Parameter Rows State
  const [parameters, setParameters] = useState<ParameterRow[]>(() => {
    if (template?.parameters && template.parameters.length > 0) {
      return template.parameters.map((p) => {
        const ranges: RangeRow[] =
          p.reference_ranges && p.reference_ranges.length > 0
            ? p.reference_ranges.map((r: LabReferenceRange) => ({
                gender: r.gender || "Both",
                age_min: r.age_min ?? 0,
                age_max: r.age_max ?? 120,
                age_unit: (r.age_unit as any) || "Years",
                min_val: r.min_val !== undefined && r.min_val !== null ? String(r.min_val) : "",
                max_val: r.max_val !== undefined && r.max_val !== null ? String(r.max_val) : "",
                display_range: r.display_range || "",
                normal_value: r.normal_value || "",
                panic_min: r.panic_min !== undefined && r.panic_min !== null ? String(r.panic_min) : "",
                panic_max: r.panic_max !== undefined && r.panic_max !== null ? String(r.panic_max) : "",
                interpretation_notes: r.interpretation_notes || "",
              }))
            : [
                {
                  gender: "Both",
                  age_min: 0,
                  age_max: 120,
                  age_unit: "Years",
                  min_val: "",
                  max_val: "",
                  display_range: "",
                  normal_value: "",
                },
              ]

        return {
          name: p.name,
          short_code: p.short_code || "",
          unit: p.unit || "",
          method: p.method || "",
          input_type: p.input_type || "numeric",
          formula: p.formula || "",
          options: Array.isArray(p.options) ? p.options : [],
          ranges,
        }
      })
    }
    return [
      {
        name: "",
        short_code: "",
        unit: "",
        method: "",
        input_type: "numeric",
        formula: "",
        options: [],
        ranges: [
          {
            gender: "Both",
            age_min: 0,
            age_max: 120,
            age_unit: "Years",
            min_val: "",
            max_val: "",
            display_range: "",
            normal_value: "",
          },
        ],
      },
    ]
  })

  // Modal Sub-dialogs
  const [editingParamIndex, setEditingParamIndex] = useState<number | null>(null)
  const [isRangeModalOpen, setIsRangeModalOpen] = useState(false)
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false)
  const [newOptionInput, setNewOptionInput] = useState("")

  // --- Parameter Row Actions ---
  const addParameter = () => {
    setParameters([
      ...parameters,
      {
        name: "",
        short_code: "",
        unit: "",
        method: "",
        input_type: "numeric",
        formula: "",
        options: [],
        ranges: [
          {
            gender: "Both",
            age_min: 0,
            age_max: 120,
            age_unit: "Years",
            min_val: "",
            max_val: "",
            display_range: "",
            normal_value: "",
          },
        ],
      },
    ])
  }

  const addHeading = () => {
    setParameters([
      ...parameters,
      {
        name: "",
        short_code: "",
        unit: "",
        method: "",
        input_type: "heading",
        formula: "",
        options: [],
        ranges: [],
      },
    ])
  }

  const removeParameter = (index: number) => {
    setParameters(parameters.filter((_, idx) => idx !== index))
  }

  const moveParameterUp = (index: number) => {
    if (index === 0) return
    const updated = [...parameters]
    const temp = updated[index - 1]
    updated[index - 1] = updated[index]
    updated[index] = temp
    setParameters(updated)
  }

  const moveParameterDown = (index: number) => {
    if (index === parameters.length - 1) return
    const updated = [...parameters]
    const temp = updated[index + 1]
    updated[index + 1] = updated[index]
    updated[index] = temp
    setParameters(updated)
  }

  const updateParameter = (index: number, field: keyof ParameterRow, value: any) => {
    const updated = [...parameters]
    updated[index] = { ...updated[index], [field]: value }
    setParameters(updated)
  }

  // --- Range Modal Actions ---
  const openRangeConfig = (index: number) => {
    setEditingParamIndex(index)
    if (!parameters[index].ranges || parameters[index].ranges.length === 0) {
      updateParameter(index, "ranges", [
        {
          gender: "Both",
          age_min: 0,
          age_max: 120,
          age_unit: "Years",
          min_val: "",
          max_val: "",
          display_range: "",
          normal_value: "",
        },
      ])
    }
    setIsRangeModalOpen(true)
  }

  const addRangeVariation = () => {
    if (editingParamIndex === null) return
    const updated = [...parameters]
    const currentRanges = updated[editingParamIndex].ranges || []
    updated[editingParamIndex].ranges = [
      ...currentRanges,
      {
        gender: "Male",
        age_min: 0,
        age_max: 120,
        age_unit: "Years",
        min_val: "",
        max_val: "",
        display_range: "",
        normal_value: "",
      },
    ]
    setParameters(updated)
  }

  const removeRangeVariation = (rangeIdx: number) => {
    if (editingParamIndex === null) return
    const updated = [...parameters]
    updated[editingParamIndex].ranges = updated[editingParamIndex].ranges.filter(
      (_, idx) => idx !== rangeIdx
    )
    setParameters(updated)
  }

  const updateRangeField = (rangeIdx: number, field: keyof RangeRow, value: any) => {
    if (editingParamIndex === null) return
    const updated = [...parameters]
    const targetRange = { ...updated[editingParamIndex].ranges[rangeIdx], [field]: value }

    // Auto-update display_range if min_val and max_val are entered
    if (field === "min_val" || field === "max_val") {
      const min = field === "min_val" ? value : targetRange.min_val
      const max = field === "max_val" ? value : targetRange.max_val
      if (min && max && !targetRange.display_range) {
        targetRange.display_range = `${min} - ${max}`
      }
    }

    updated[editingParamIndex].ranges[rangeIdx] = targetRange
    setParameters(updated)
  }

  // --- Dropdown Options Modal Actions ---
  const openOptionsConfig = (index: number) => {
    setEditingParamIndex(index)
    setNewOptionInput("")
    setIsOptionsModalOpen(true)
  }

  const addOptionItem = () => {
    if (!newOptionInput.trim() || editingParamIndex === null) return
    const updated = [...parameters]
    const currentOpts = updated[editingParamIndex].options || []
    if (!currentOpts.includes(newOptionInput.trim())) {
      updated[editingParamIndex].options = [...currentOpts, newOptionInput.trim()]
      setParameters(updated)
    }
    setNewOptionInput("")
  }

  const removeOptionItem = (optIdx: number) => {
    if (editingParamIndex === null) return
    const updated = [...parameters]
    updated[editingParamIndex].options = updated[editingParamIndex].options.filter(
      (_, idx) => idx !== optIdx
    )
    setParameters(updated)
  }

  // --- Mutation: Save Test Template ---
  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: Partial<LabTestTemplate> = {
        test_name: testName.trim(),
        test_code: testCode.trim().toUpperCase(),
        category,
        sample_type: sampleType,
        container_color: containerColor,
        method: method.trim() || null,
        tat_hours: Number(tatHours) || 24,
        standard_price: Number(price) || 0,
        description: description.trim() || null,
        interpretation: interpretation.trim() || null,
        parameters: parameters
          .filter((p) => p.name.trim() !== "")
          .map((p, idx) => ({
            id: 0,
            test_template_id: template?.id || 0,
            name: p.name.trim(),
            short_code: p.short_code.trim() ? p.short_code.trim().toUpperCase() : null,
            unit: p.unit.trim() || null,
            input_type: p.input_type as any,
            method: p.method.trim() || null,
            options: p.options && p.options.length > 0 ? p.options : null,
            formula: p.input_type === "calculated" && p.formula.trim() ? p.formula.trim() : null,
            is_calculated: p.input_type === "calculated",
            range_type: "flexible",
            display_order: idx + 1,
            is_mandatory: p.input_type !== "heading",
            is_active: true,
            reference_ranges:
              p.input_type !== "heading" && p.ranges && p.ranges.length > 0
                ? p.ranges
                    .filter((r) => r.display_range || r.min_val || r.max_val || r.normal_value)
                    .map((r) => ({
                      id: 0,
                      parameter_id: 0,
                      gender: r.gender,
                      age_min: Number(r.age_min) || 0,
                      age_max: Number(r.age_max) || 120,
                      age_unit: r.age_unit,
                      min_val: r.min_val ? Number(r.min_val) : null,
                      max_val: r.max_val ? Number(r.max_val) : null,
                      panic_min: r.panic_min ? Number(r.panic_min) : null,
                      panic_max: r.panic_max ? Number(r.panic_max) : null,
                      normal_value: r.normal_value.trim() || null,
                      display_range: r.display_range.trim() || null,
                      interpretation_notes: r.interpretation_notes?.trim() || null,
                    }))
                : [],
          })),
      }

      if (isEditing && template) {
        return labService.updateTemplate(template.id, payload)
      }
      return labService.createTemplate(payload)
    },
    onSuccess: () => {
      toast.success(
        isEditing
          ? "Lab test template updated successfully!"
          : "New lab test template created successfully!"
      )
      queryClient.invalidateQueries({ queryKey: ["lab", "templates"] })
      onSuccess()
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save test template.")
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-muted/40 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-foreground text-base">
                  {isEditing ? `Edit Test: ${template?.test_name}` : "Create New Pathology Test Template"}
                </h3>
                {testCode && (
                  <Badge variant="outline" className="font-mono text-xs font-bold text-primary">
                    {testCode}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure test properties, parameter-level methods, multi-tier age/gender reference ranges, and dropdown formats
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

        {/* Tab Navigation */}
        <div className="px-6 pt-2 border-b border-border bg-muted/20 flex gap-2">
          <button
            onClick={() => setActiveTab("parameters")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "parameters"
                ? "border-primary text-primary bg-background/50 rounded-t-lg"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            Report Parameters ({parameters.length})
          </button>
          <button
            onClick={() => setActiveTab("general")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "general"
                ? "border-primary text-primary bg-background/50 rounded-t-lg"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Test Properties & Pricing
          </button>
          <button
            onClick={() => setActiveTab("interpretation")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "interpretation"
                ? "border-primary text-primary bg-background/50 rounded-t-lg"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Clinical Interpretation & Notes
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: PARAMETERS BUILDER */}
          {activeTab === "parameters" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-muted/40 border border-border">
                <div>
                  <h4 className="text-xs font-bold text-foreground">
                    Define Investigation Parameters
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Set measurement methods at parameter level, input types (numeric, formula, dropdown), and multi-tier age/gender ranges.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addHeading}
                    className="h-8 text-xs gap-1.5 border-dashed"
                  >
                    <Type className="h-3.5 w-3.5 text-muted-foreground" />
                    + Add Heading
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={addParameter}
                    className="h-8 text-xs gap-1.5 font-bold"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    + Add Parameter Field
                  </Button>
                </div>
              </div>

              {/* Parameters Table */}
              <div className="border border-border rounded-xl overflow-hidden bg-card shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-muted/70 text-muted-foreground uppercase text-[10px] font-bold border-b border-border">
                        <th className="py-2.5 px-3 w-10 text-center">#</th>
                        <th className="py-2.5 px-3 min-w-[180px]">Parameter Name</th>
                        <th className="py-2.5 px-2 w-20">Code</th>
                        <th className="py-2.5 px-2 min-w-[140px]">Parameter Method</th>
                        <th className="py-2.5 px-2 w-28">Input Format</th>
                        <th className="py-2.5 px-2 w-20">Unit</th>
                        <th className="py-2.5 px-3 min-w-[170px]">Reference Ranges Matrix</th>
                        <th className="py-2.5 px-2 w-24 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {parameters.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-muted-foreground text-xs">
                            No parameters defined yet. Click "+ Add Parameter Field" or "+ Add Heading" to begin.
                          </td>
                        </tr>
                      ) : (
                        parameters.map((param, index) => {
                          const isHeading = param.input_type === "heading"
                          const isCalculated = param.input_type === "calculated"
                          const isSelection = param.input_type === "selection"
                          const rangeCount = param.ranges?.length || 0

                          if (isHeading) {
                            return (
                              <tr
                                key={index}
                                className="bg-blue-500/5 hover:bg-blue-500/10 transition-colors"
                              >
                                <td className="py-2 px-3 text-center text-muted-foreground font-mono text-[11px]">
                                  {index + 1}
                                </td>
                                <td colSpan={6} className="py-2 px-3">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-600 border border-blue-500/30">
                                      SECTION HEADING
                                    </span>
                                    <Input
                                      value={param.name}
                                      onChange={(e) => updateParameter(index, "name", e.target.value)}
                                      placeholder="e.g. DIFFERENTIAL LEUKOCYTE COUNT, LIVER ENZYMES"
                                      className="h-8 text-xs font-bold bg-background text-foreground uppercase tracking-wide flex-1"
                                    />
                                  </div>
                                </td>
                                <td className="py-2 px-2 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => moveParameterUp(index)}
                                      disabled={index === 0}
                                      className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                                      title="Move Up"
                                    >
                                      <ChevronUp className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => moveParameterDown(index)}
                                      disabled={index === parameters.length - 1}
                                      className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                                      title="Move Down"
                                    >
                                      <ChevronDown className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removeParameter(index)}
                                      className="p-1 rounded text-red-500 hover:bg-red-500/10"
                                      title="Delete Heading"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          }

                          return (
                            <tr key={index} className="hover:bg-muted/30 transition-colors">
                              {/* Index */}
                              <td className="py-2.5 px-3 text-center font-mono text-muted-foreground text-[11px]">
                                {index + 1}
                              </td>

                              {/* Parameter Name */}
                              <td className="py-2.5 px-3">
                                <Input
                                  value={param.name}
                                  onChange={(e) => updateParameter(index, "name", e.target.value)}
                                  placeholder="e.g. Hemoglobin"
                                  className="h-8 text-xs font-medium"
                                />
                              </td>

                              {/* Short Code */}
                              <td className="py-2.5 px-2">
                                <Input
                                  value={param.short_code}
                                  onChange={(e) =>
                                    updateParameter(index, "short_code", e.target.value.toUpperCase())
                                  }
                                  placeholder="HB"
                                  className="h-8 text-xs font-mono font-bold text-center text-primary"
                                />
                              </td>

                              {/* Parameter Method */}
                              <td className="py-2.5 px-2">
                                <Input
                                  value={param.method}
                                  onChange={(e) => updateParameter(index, "method", e.target.value)}
                                  placeholder="e.g. Hexokinase, Diazo"
                                  className="h-8 text-[11px]"
                                  title="Specific parameter measurement method"
                                />
                              </td>

                              {/* Input Type */}
                              <td className="py-2.5 px-2">
                                <div className="space-y-1">
                                  <select
                                    value={param.input_type}
                                    onChange={(e) =>
                                      updateParameter(index, "input_type", e.target.value as any)
                                    }
                                    className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs font-medium"
                                  >
                                    <option value="numeric">Numeric</option>
                                    <option value="calculated">Calculated Formula</option>
                                    <option value="selection">Dropdown Select</option>
                                    <option value="text">Text (Short)</option>
                                    <option value="textarea">Observation (Long)</option>
                                  </select>

                                  {/* Formula Sub-Input */}
                                  {isCalculated && (
                                    <div className="relative">
                                      <Input
                                        value={param.formula}
                                        onChange={(e) => updateParameter(index, "formula", e.target.value)}
                                        placeholder="{TBIL} - {DBIL}"
                                        className="h-7 text-[10px] font-mono bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
                                        title="Use tokens in curly braces: {PARAM_CODE}"
                                      />
                                    </div>
                                  )}

                                  {/* Dropdown Options Button */}
                                  {isSelection && (
                                    <button
                                      type="button"
                                      onClick={() => openOptionsConfig(index)}
                                      className="w-full py-0.5 px-2 rounded border border-blue-500/40 bg-blue-500/10 text-blue-600 text-[10px] font-bold flex items-center justify-center gap-1 hover:bg-blue-500/20"
                                    >
                                      <ListPlus className="h-3 w-3" />
                                      {param.options?.length ? `${param.options.length} Options` : "Set Options"}
                                    </button>
                                  )}
                                </div>
                              </td>

                              {/* Unit */}
                              <td className="py-2.5 px-2">
                                <Input
                                  value={param.unit}
                                  onChange={(e) => updateParameter(index, "unit", e.target.value)}
                                  placeholder="mg/dL"
                                  className="h-8 text-xs font-mono"
                                />
                              </td>

                              {/* Reference Range Matrix Config */}
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => openRangeConfig(index)}
                                    className={`flex-1 py-1 px-2.5 rounded-lg border text-xs font-bold transition-all flex items-center justify-between gap-1.5 ${
                                      rangeCount > 1
                                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/20"
                                        : rangeCount === 1 && param.ranges[0].display_range
                                        ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                                        : "bg-muted/80 border-border text-muted-foreground hover:bg-muted"
                                    }`}
                                  >
                                    <span className="flex items-center gap-1 truncate text-[11px]">
                                      <Settings className="h-3.5 w-3.5" />
                                      {rangeCount > 1
                                        ? `${rangeCount} Age/Gender Ranges`
                                        : param.ranges?.[0]?.display_range
                                        ? param.ranges[0].display_range
                                        : "Configure Ranges"}
                                    </span>
                                    <Badge
                                      variant="secondary"
                                      className="text-[9px] px-1 py-0 font-mono font-normal"
                                    >
                                      Config
                                    </Badge>
                                  </button>
                                </div>
                              </td>

                              {/* Actions */}
                              <td className="py-2.5 px-2 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => moveParameterUp(index)}
                                    disabled={index === 0}
                                    className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                                    title="Move Up"
                                  >
                                    <ChevronUp className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveParameterDown(index)}
                                    disabled={index === parameters.length - 1}
                                    className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                                    title="Move Down"
                                  >
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeParameter(index)}
                                    className="p-1 rounded text-red-500 hover:bg-red-500/10"
                                    title="Delete Parameter"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
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
            </div>
          )}

          {/* TAB 2: GENERAL TEST PROPERTIES */}
          {activeTab === "general" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  Test Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  placeholder="e.g. Complete Blood Count (CBC) with ESR"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  Test Code <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={testCode}
                  onChange={(e) => setTestCode(e.target.value.toUpperCase())}
                  placeholder="e.g. CBC-01"
                  className="h-9 text-xs font-mono font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  Department / Laboratory Category
                </Label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs font-medium"
                >
                  <option value="Biochemistry">Biochemistry</option>
                  <option value="Haematology">Haematology</option>
                  <option value="Clinical Pathology">Clinical Pathology</option>
                  <option value="Serology & Immunology">Serology & Immunology</option>
                  <option value="Microbiology">Microbiology</option>
                  <option value="Hormones">Hormones & Endocrinology</option>
                  <option value="Vitamins">Vitamins & Trace Elements</option>
                  <option value="Molecular Diagnostics">Molecular Diagnostics</option>
                  <option value="Histopathology">Histopathology / Cytology</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  Standard OPD Price (₹)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="350"
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  Specimen / Sample Type
                </Label>
                <Input
                  value={sampleType}
                  onChange={(e) => setSampleType(e.target.value)}
                  placeholder="Blood / Serum, EDTA Whole Blood, Urine"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  Vacutainer Tube / Container Color
                </Label>
                <Input
                  value={containerColor}
                  onChange={(e) => setContainerColor(e.target.value)}
                  placeholder="Red / Plain (SST Gel Tube), Lavender (EDTA)"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  Default Test Method
                </Label>
                <Input
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  placeholder="e.g. Automated Analyzer, CLIA, HPLC"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  Turnaround Time (Hours)
                </Label>
                <Input
                  type="number"
                  value={tatHours}
                  onChange={(e) => setTatHours(e.target.value)}
                  placeholder="24"
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="col-span-full space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  Internal Lab Instructions / Pre-analytical Notes
                </Label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Patient must be fasting for 10-12 hours. Mix gently by inverting tube 8-10 times. Avoid hemolyzed sample."
                  rows={3}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-xs font-sans resize-y"
                />
              </div>
            </div>
          )}

          {/* TAB 3: CLINICAL INTERPRETATION NOTES */}
          {activeTab === "interpretation" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h4 className="text-xs font-bold text-foreground">
                    Clinical Interpretation Notes (Printed on Report)
                  </h4>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Pathology interpretation guidelines, clinical correlation tables, and diagnostic markers printed beneath this test's results. Supports formatted text or HTML.
                </p>
              </div>

              <div className="space-y-2">
                <RichHtmlEditor
                  value={interpretation}
                  onChange={setInterpretation}
                  placeholder="Type or format clinical interpretation notes, diagnostic tables, or alert blocks..."
                  minHeight="280px"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-muted/30 border-t border-border flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {parameters.length} parameter(s) configured
          </div>
          <div className="flex items-center gap-2.5">
            <Button variant="outline" size="sm" onClick={onClose} className="h-9 px-4 text-xs">
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !testName.trim() || !testCode.trim()}
              className="h-9 px-5 text-xs font-bold gap-1.5"
            >
              <Save className="h-4 w-4" />
              {saveMutation.isPending ? "Saving..." : isEditing ? "Save Changes" : "Create Test Template"}
            </Button>
          </div>
        </div>

        {/* ── SUB-MODAL 1: MULTI-TIER REFERENCE RANGE MATRIX MODAL ── */}
        {isRangeModalOpen && editingParamIndex !== null && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
            <div className="w-full max-w-4xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="px-5 py-3.5 bg-muted/60 border-b border-border flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-primary" />
                    <h4 className="font-bold text-foreground text-sm">
                      Reference Ranges Configuration: {parameters[editingParamIndex]?.name || "Parameter"}
                    </h4>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Define biological reference intervals based on Gender (Male/Female/Both) and Age (Years/Months/Days)
                  </p>
                </div>
                <button
                  onClick={() => setIsRangeModalOpen(false)}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Range Table */}
              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-foreground">
                    Age & Gender Interval Variations ({parameters[editingParamIndex]?.ranges?.length || 0})
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addRangeVariation}
                    className="h-7 text-xs font-bold gap-1 text-primary border-primary/30 hover:bg-primary/10"
                  >
                    <Plus className="h-3 w-3" />
                    Add Range Variation
                  </Button>
                </div>

                <div className="border border-border rounded-xl overflow-hidden bg-background">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-muted text-muted-foreground uppercase text-[10px] font-bold border-b border-border">
                          <th className="py-2.5 px-3 w-28">Gender</th>
                          <th className="py-2.5 px-3 min-w-[200px]">Age Scope (Min - Max)</th>
                          <th className="py-2.5 px-2 w-20 text-center">Min Val</th>
                          <th className="py-2.5 px-2 w-20 text-center">Max Val</th>
                          <th className="py-2.5 px-3 min-w-[180px]">Report Display Text</th>
                          <th className="py-2.5 px-2 min-w-[100px]">Normal Value</th>
                          <th className="py-2.5 px-2 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {parameters[editingParamIndex]?.ranges?.map((range, rIdx) => (
                          <tr key={rIdx} className="hover:bg-muted/20">
                            {/* Gender */}
                            <td className="py-2 px-3">
                              <select
                                value={range.gender}
                                onChange={(e) => updateRangeField(rIdx, "gender", e.target.value)}
                                className="h-8 px-2 rounded-md border border-input bg-card text-xs font-semibold"
                              >
                                <option value="Both">Both (M/F)</option>
                                <option value="Male">Male Only</option>
                                <option value="Female">Female Only</option>
                              </select>
                            </td>

                            {/* Age Scope */}
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-1.5">
                                <Input
                                  type="number"
                                  value={range.age_min}
                                  onChange={(e) =>
                                    updateRangeField(rIdx, "age_min", Number(e.target.value) || 0)
                                  }
                                  className="h-8 w-14 text-center font-mono text-xs px-1"
                                  placeholder="0"
                                />
                                <span className="text-muted-foreground text-xs">-</span>
                                <Input
                                  type="number"
                                  value={range.age_max}
                                  onChange={(e) =>
                                    updateRangeField(rIdx, "age_max", Number(e.target.value) || 120)
                                  }
                                  className="h-8 w-14 text-center font-mono text-xs px-1"
                                  placeholder="120"
                                />
                                <select
                                  value={range.age_unit}
                                  onChange={(e) => updateRangeField(rIdx, "age_unit", e.target.value)}
                                  className="h-8 px-2 rounded-md border border-input bg-card text-xs"
                                >
                                  <option value="Years">Years</option>
                                  <option value="Months">Months</option>
                                  <option value="Days">Days</option>
                                </select>
                              </div>
                            </td>

                            {/* Min Val */}
                            <td className="py-2 px-2">
                              <Input
                                value={range.min_val}
                                onChange={(e) => updateRangeField(rIdx, "min_val", e.target.value)}
                                placeholder="13.5"
                                className="h-8 font-mono text-center text-xs"
                              />
                            </td>

                            {/* Max Val */}
                            <td className="py-2 px-2">
                              <Input
                                value={range.max_val}
                                onChange={(e) => updateRangeField(rIdx, "max_val", e.target.value)}
                                placeholder="17.5"
                                className="h-8 font-mono text-center text-xs"
                              />
                            </td>

                            {/* Display Range */}
                            <td className="py-2 px-3">
                              <textarea
                                value={range.display_range}
                                onChange={(e) => updateRangeField(rIdx, "display_range", e.target.value)}
                                placeholder="e.g. 13.5 - 17.5 g/dL"
                                rows={2}
                                className="w-full px-2 py-1 rounded-md border border-input bg-card text-[11px] font-mono resize-y"
                              />
                            </td>

                            {/* Normal Value */}
                            <td className="py-2 px-2">
                              <Input
                                value={range.normal_value}
                                onChange={(e) => updateRangeField(rIdx, "normal_value", e.target.value)}
                                placeholder="Negative"
                                className="h-8 text-xs"
                              />
                            </td>

                            {/* Delete Range */}
                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeRangeVariation(rIdx)}
                                className="p-1 rounded text-red-500 hover:bg-red-500/10"
                                title="Remove Variation"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Sub-modal Footer */}
              <div className="px-5 py-3 bg-muted/60 border-t border-border flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsRangeModalOpen(false)}
                  className="font-bold text-xs"
                >
                  Done, Save Ranges
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── SUB-MODAL 2: DROPDOWN OPTIONS MANAGER MODAL ── */}
        {isOptionsModalOpen && editingParamIndex !== null && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
            <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
              <div className="px-5 py-3.5 bg-muted/60 border-b border-border flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-foreground text-sm">
                    Configure Dropdown Options: {parameters[editingParamIndex]?.name || "Parameter"}
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Technician will select one of these options during result entry
                  </p>
                </div>
                <button
                  onClick={() => setIsOptionsModalOpen(false)}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newOptionInput}
                    onChange={(e) => setNewOptionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addOptionItem()
                      }
                    }}
                    placeholder="e.g. Negative, Positive, Clear, Turbid"
                    className="h-9 text-xs flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={addOptionItem}
                    className="h-9 px-3 text-xs font-bold"
                  >
                    Add
                  </Button>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-muted-foreground">
                    Configured Options ({parameters[editingParamIndex]?.options?.length || 0}):
                  </Label>
                  <div className="flex flex-wrap gap-2 p-3 bg-muted/30 border border-border rounded-xl min-h-[90px]">
                    {parameters[editingParamIndex]?.options?.length === 0 ? (
                      <span className="text-xs text-muted-foreground italic">
                        No options added yet. Type an option above and click Add.
                      </span>
                    ) : (
                      parameters[editingParamIndex]?.options?.map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background border border-border text-xs font-medium text-foreground shadow-2xs"
                        >
                          <span>{opt}</span>
                          <button
                            type="button"
                            onClick={() => removeOptionItem(oIdx)}
                            className="text-muted-foreground hover:text-red-500"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="px-5 py-3 bg-muted/60 border-t border-border flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsOptionsModalOpen(false)}
                  className="font-bold text-xs"
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
