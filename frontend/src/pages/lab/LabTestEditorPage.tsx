import React, { useState, useEffect, useMemo } from "react"
import { useParams, useNavigate } from "react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Settings,
  ChevronUp,
  ChevronDown,
  Type,
  ListPlus,
  Sliders,
  Sparkles,
  FlaskConical,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { RichHtmlEditor } from "@/components/common/RichHtmlEditor"
import { labService } from "@/services/labService"
import type { LabTestTemplate, LabReferenceRange } from "@/types/lab"

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

export const LabTestEditorPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEditing = Boolean(id)

  // Fetch test template data if editing
  const { data: existingTemplate, isLoading: isFetchingTemplate } = useQuery<LabTestTemplate>({
    queryKey: ["lab", "template", id],
    queryFn: () => labService.getTemplate(Number(id)),
    enabled: isEditing && !isNaN(Number(id)),
  })

  // --- Test-level State ---
  const [testName, setTestName] = useState("")
  const [testCode, setTestCode] = useState("")
  const [category, setCategory] = useState("Biochemistry")
  const [sampleType, setSampleType] = useState("Blood / Serum")
  const [containerColor, setContainerColor] = useState("Red / Plain (SST Gel Tube)")
  const [method, setMethod] = useState("")
  const [tatHours, setTatHours] = useState("24")
  const [price, setPrice] = useState("0")
  const [description, setDescription] = useState("")
  const [interpretation, setInterpretation] = useState("")
  const [isActive, setIsActive] = useState(true)

  // --- Parameters State ---
  const [parameters, setParameters] = useState<ParameterRow[]>([])

  // --- Modals State ---
  const [editingParamIndex, setEditingParamIndex] = useState<number | null>(null)
  const [isRangeModalOpen, setIsRangeModalOpen] = useState(false)
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false)
  const [newOptionInput, setNewOptionInput] = useState("")

  // Populate data when existingTemplate loads
  useEffect(() => {
    if (existingTemplate) {
      setTestName(existingTemplate.test_name || "")
      setTestCode(existingTemplate.test_code || "")
      setCategory(existingTemplate.category || "Biochemistry")
      setSampleType(existingTemplate.sample_type || "Blood / Serum")
      setContainerColor(existingTemplate.container_color || "Red / Plain (SST Gel Tube)")
      setMethod(existingTemplate.method || "")
      setTatHours(existingTemplate.tat_hours ? String(existingTemplate.tat_hours) : "24")
      setPrice(existingTemplate.standard_price ? String(existingTemplate.standard_price) : "0")
      setDescription(existingTemplate.description || "")
      setInterpretation(existingTemplate.interpretation || "")
      setIsActive(existingTemplate.is_active ?? true)

      if (existingTemplate.parameters && existingTemplate.parameters.length > 0) {
        setParameters(
          existingTemplate.parameters.map((p) => {
            const ranges: RangeRow[] =
              p.reference_ranges && p.reference_ranges.length > 0
                ? p.reference_ranges.map((r: LabReferenceRange) => ({
                    gender: r.gender || "Both",
                    age_min: r.age_min ?? 0,
                    age_max: r.age_max ?? 120,
                    age_unit: (r.age_unit as any) || "Years",
                    min_val:
                      r.min_val !== undefined && r.min_val !== null ? String(r.min_val) : "",
                    max_val:
                      r.max_val !== undefined && r.max_val !== null ? String(r.max_val) : "",
                    display_range: r.display_range || "",
                    normal_value: r.normal_value || "",
                    panic_min:
                      r.panic_min !== undefined && r.panic_min !== null ? String(r.panic_min) : "",
                    panic_max:
                      r.panic_max !== undefined && r.panic_max !== null ? String(r.panic_max) : "",
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
        )
      } else {
        setParameters([
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
    } else if (!isEditing) {
      // Default empty parameter row for new test
      setParameters([
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
  }, [existingTemplate, isEditing])

  // --- Parameter Management Actions ---
  const addParameter = () => {
    setParameters((prev) => [
      ...prev,
      {
        name: "",
        short_code: "",
        unit: "",
        method: method || "",
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
    setParameters((prev) => [
      ...prev,
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
    setParameters((prev) => prev.filter((_, idx) => idx !== index))
  }

  const moveParameterUp = (index: number) => {
    if (index === 0) return
    setParameters((prev) => {
      const copy = [...prev]
      const temp = copy[index - 1]
      copy[index - 1] = copy[index]
      copy[index] = temp
      return copy
    })
  }

  const moveParameterDown = (index: number) => {
    if (index === parameters.length - 1) return
    setParameters((prev) => {
      const copy = [...prev]
      const temp = copy[index + 1]
      copy[index + 1] = copy[index]
      copy[index] = temp
      return copy
    })
  }

  const updateParameter = (index: number, field: keyof ParameterRow, value: any) => {
    setParameters((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
  }

  // --- Range Matrix Dialog Actions ---
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
    setParameters((prev) => {
      const copy = [...prev]
      const currentRanges = copy[editingParamIndex].ranges || []
      copy[editingParamIndex].ranges = [
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
      return copy
    })
  }

  const removeRangeVariation = (rangeIdx: number) => {
    if (editingParamIndex === null) return
    setParameters((prev) => {
      const copy = [...prev]
      copy[editingParamIndex].ranges = copy[editingParamIndex].ranges.filter(
        (_, idx) => idx !== rangeIdx
      )
      return copy
    })
  }

  const updateRangeField = (rangeIdx: number, field: keyof RangeRow, value: any) => {
    if (editingParamIndex === null) return
    setParameters((prev) => {
      const copy = [...prev]
      const targetRange = { ...copy[editingParamIndex].ranges[rangeIdx], [field]: value }

      if (field === "min_val" || field === "max_val") {
        const min = field === "min_val" ? value : targetRange.min_val
        const max = field === "max_val" ? value : targetRange.max_val
        if (min && max && !targetRange.display_range) {
          targetRange.display_range = `${min} - ${max}`
        }
      }

      copy[editingParamIndex].ranges[rangeIdx] = targetRange
      return copy
    })
  }

  // --- Dropdown Options Actions ---
  const openOptionsConfig = (index: number) => {
    setEditingParamIndex(index)
    setNewOptionInput("")
    setIsOptionsModalOpen(true)
  }

  const addOptionItem = (customVal?: string) => {
    const val = (customVal || newOptionInput).trim()
    if (!val || editingParamIndex === null) return
    setParameters((prev) => {
      const copy = [...prev]
      const currentOpts = copy[editingParamIndex].options || []
      if (!currentOpts.includes(val)) {
        copy[editingParamIndex].options = [...currentOpts, val]
      }
      return copy
    })
    setNewOptionInput("")
  }

  const removeOptionItem = (optIdx: number) => {
    if (editingParamIndex === null) return
    setParameters((prev) => {
      const copy = [...prev]
      copy[editingParamIndex].options = copy[editingParamIndex].options.filter(
        (_, idx) => idx !== optIdx
      )
      return copy
    })
  }

  // Preset option templates
  const applyOptionPreset = (preset: string[]) => {
    if (editingParamIndex === null) return
    setParameters((prev) => {
      const copy = [...prev]
      copy[editingParamIndex].options = [...preset]
      return copy
    })
  }

  // --- Save Mutation ---
  const saveMutation = useMutation({
    mutationFn: () => {
      if (!testName.trim()) throw new Error("Test Name is required.")
      if (!testCode.trim()) throw new Error("Test Code is required.")

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
        is_active: isActive,
        parameters: parameters
          .filter((p) => p.name.trim() !== "")
          .map((p, idx) => ({
            id: 0,
            test_template_id: existingTemplate?.id || 0,
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

      if (isEditing && existingTemplate) {
        return labService.updateTemplate(existingTemplate.id, payload)
      }
      return labService.createTemplate(payload)
    },
    onSuccess: (saved) => {
      toast.success(
        isEditing
          ? `Test "${saved.test_name}" updated successfully!`
          : `New test template "${saved.test_name}" created successfully!`
      )
      queryClient.invalidateQueries({ queryKey: ["lab", "templates"] })
      queryClient.invalidateQueries({ queryKey: ["lab", "template", id] })
      navigate("/lab")
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save test template.")
    },
  })

  // Keyboard shortcut Ctrl+S or Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault()
        saveMutation.mutate()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [saveMutation])

  // Summary Metrics
  const parameterCount = useMemo(
    () => parameters.filter((p) => p.input_type !== "heading").length,
    [parameters]
  )
  const headingCount = useMemo(
    () => parameters.filter((p) => p.input_type === "heading").length,
    [parameters]
  )
  const formulaCount = useMemo(
    () => parameters.filter((p) => p.input_type === "calculated").length,
    [parameters]
  )

  if (isEditing && isFetchingTemplate) {
    return (
      <div className="py-24 flex items-center justify-center">
        <LoadingSpinner label="Loading test configuration and parameter matrix..." />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 w-full animate-in fade-in duration-150">
      {/* ── STICKY TOP APP HEADER ── */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border py-3 px-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/lab")}
            className="h-9 px-3 gap-1.5 text-xs font-semibold hover:bg-muted"
            title="Return to Laboratory Desk"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Catalog
          </Button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-foreground tracking-tight">
                {isEditing ? `Edit Test: ${testName || "Loading..."}` : "Create New Pathology Test Template"}
              </h1>
              {testCode && (
                <Badge variant="outline" className="font-mono text-xs font-bold text-primary bg-primary/5">
                  {testCode}
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs font-medium">
                {category}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Full parameter-level measurement methods, formulas, dropdown selections, and multi-tier age/gender ranges.
            </p>
          </div>
        </div>

        {/* Top Right Save & Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/lab")}
            className="h-9 px-3 text-xs"
          >
            Cancel
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !testName.trim() || !testCode.trim()}
            className="h-9 px-5 text-xs font-bold gap-2 shadow-xs bg-primary hover:bg-primary/90 text-primary-foreground"
            title="Save changes (Ctrl + S)"
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? "Saving Test..." : isEditing ? "Save Changes" : "Create Test Template"}
          </Button>
        </div>
      </div>

      {/* ── SECTION 1: TEST IDENTITY & CLINICAL MASTER SETTINGS ── */}
      <Card className="border-border bg-card shadow-xs">
        <div className="p-4 bg-muted/30 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <FlaskConical className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                1. Test Identity & Specimen Properties
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Basic test parameters, hospital department, sample type, standard price, and turnaround time.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Test Status:</span>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                isActive
                  ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                  : "bg-muted text-muted-foreground border border-border"
              }`}
            >
              {isActive ? "● Active in Catalog" : "○ Inactive"}
            </button>
          </div>
        </div>

        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Test Name */}
            <div className="space-y-1.5 lg:col-span-2">
              <Label className="text-xs font-bold text-foreground">
                Test Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                placeholder="e.g. Complete Blood Count (CBC) with ESR"
                className="h-9 text-xs font-medium"
              />
            </div>

            {/* Test Code */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                Test Code <span className="text-red-500">*</span>
              </Label>
              <Input
                value={testCode}
                onChange={(e) => setTestCode(e.target.value.toUpperCase())}
                placeholder="e.g. CBC-01"
                className="h-9 text-xs font-mono font-bold text-primary"
              />
            </div>

            {/* Department */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                Laboratory Department
              </Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs font-medium focus:ring-1 focus:ring-primary"
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

            {/* Price */}
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
                className="h-9 text-xs font-mono font-bold"
              />
            </div>

            {/* Specimen / Sample Type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                Sample Specimen Type
              </Label>
              <Input
                value={sampleType}
                onChange={(e) => setSampleType(e.target.value)}
                placeholder="Blood / Serum, EDTA Whole Blood, Urine"
                className="h-9 text-xs"
              />
            </div>

            {/* Vacutainer Tube */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                Vacutainer Tube / Container
              </Label>
              <Input
                value={containerColor}
                onChange={(e) => setContainerColor(e.target.value)}
                placeholder="Lavender (EDTA), Red / Plain (SST Gel Tube)"
                className="h-9 text-xs"
              />
            </div>

            {/* Turnaround Time */}
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

            {/* Default Test Method */}
            <div className="space-y-1.5 lg:col-span-2">
              <Label className="text-xs font-bold text-foreground">
                Default Test Measurement Method
              </Label>
              <Input
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                placeholder="e.g. Automated 5-Part Hematology Analyzer, CLIA, HPLC, Spectrophotometry"
                className="h-9 text-xs"
              />
            </div>

            {/* Pre-analytical Instructions */}
            <div className="space-y-1.5 lg:col-span-2">
              <Label className="text-xs font-bold text-foreground">
                Internal Pre-analytical Instructions
              </Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. 10-12 hours fasting required. Mix gently 8-10 times. Avoid hemolyzed sample."
                className="h-9 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 2: REPORT PARAMETERS WORKSTATION ── */}
      <Card className="border-border bg-card shadow-xs">
        <div className="p-4 bg-muted/30 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                <Sliders className="h-4 w-4" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                2. Report Parameters Workstation
              </h2>
              <div className="flex items-center gap-1.5 ml-2">
                <Badge variant="outline" className="text-[11px] font-bold">
                  {parameterCount} Parameters
                </Badge>
                {formulaCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] font-mono font-bold text-purple-600 bg-purple-500/10">
                    {formulaCount} Formulas
                  </Badge>
                )}
                {headingCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] font-mono font-bold text-blue-600 bg-blue-500/10">
                    {headingCount} Headings
                  </Badge>
                )}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Configure parameter names, short codes, parameter-level measurement methods, formulas, dropdown choices, and multi-tier age/gender ranges.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addHeading}
              className="h-8 text-xs font-semibold gap-1.5 border-dashed"
            >
              <Type className="h-3.5 w-3.5 text-muted-foreground" />
              + Add Section Heading
            </Button>

            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={addParameter}
              className="h-8 text-xs font-bold gap-1.5 shadow-2xs"
            >
              <Plus className="h-3.5 w-3.5" />
              + Add Parameter Field
            </Button>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-muted/70 text-muted-foreground uppercase text-[10px] font-bold border-b border-border">
                  <th className="py-3 px-3 w-12 text-center">#</th>
                  <th className="py-3 px-3 min-w-[240px]">Parameter Name</th>
                  <th className="py-3 px-2 w-24 text-center">Code</th>
                  <th className="py-3 px-3 min-w-[190px]">Parameter Method</th>
                  <th className="py-3 px-2 min-w-[140px]">Input Format</th>
                  <th className="py-3 px-3 min-w-[160px]">Formula / Dropdown Options</th>
                  <th className="py-3 px-2 w-24">Unit</th>
                  <th className="py-3 px-3 min-w-[220px]">Biological Reference Range</th>
                  <th className="py-3 px-2 w-24 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {parameters.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-muted-foreground text-xs">
                      No parameters defined yet. Click <strong>"+ Add Parameter Field"</strong> to add an investigation field.
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
                          <td className="py-2.5 px-3 text-center text-muted-foreground font-mono text-xs">
                            {index + 1}
                          </td>
                          <td colSpan={7} className="py-2.5 px-3">
                            <div className="flex items-center gap-2.5">
                              <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-600 border border-blue-500/30">
                                SECTION HEADING
                              </span>
                              <Input
                                value={param.name}
                                onChange={(e) => updateParameter(index, "name", e.target.value)}
                                placeholder="e.g. DIFFERENTIAL LEUKOCYTE COUNT, LIVER ENZYMES"
                                className="h-8 text-xs font-black bg-background text-foreground uppercase tracking-wide flex-1"
                              />
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => moveParameterUp(index)}
                                disabled={index === 0}
                                className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                                title="Move Up"
                              >
                                <ChevronUp className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveParameterDown(index)}
                                disabled={index === parameters.length - 1}
                                className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                                title="Move Down"
                              >
                                <ChevronDown className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeParameter(index)}
                                className="p-1 rounded text-red-500 hover:bg-red-500/10"
                                title="Delete Heading"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    }

                    return (
                      <tr key={index} className="hover:bg-muted/30 transition-colors">
                        {/* Index */}
                        <td className="py-3 px-3 text-center font-mono text-muted-foreground text-xs">
                          {index + 1}
                        </td>

                        {/* Parameter Name */}
                        <td className="py-3 px-3">
                          <Input
                            value={param.name}
                            onChange={(e) => updateParameter(index, "name", e.target.value)}
                            placeholder="e.g. Hemoglobin, Total Bilirubin"
                            className="h-8.5 text-xs font-semibold"
                          />
                        </td>

                        {/* Short Code */}
                        <td className="py-3 px-2">
                          <Input
                            value={param.short_code}
                            onChange={(e) =>
                              updateParameter(index, "short_code", e.target.value.toUpperCase())
                            }
                            placeholder="HB"
                            className="h-8.5 text-xs font-mono font-bold text-center text-primary uppercase bg-muted/20"
                            title="Code used in formulas e.g. {HB}"
                          />
                        </td>

                        {/* Parameter Method */}
                        <td className="py-3 px-3">
                          <Input
                            value={param.method}
                            onChange={(e) => updateParameter(index, "method", e.target.value)}
                            placeholder="e.g. Hexokinase, Diazo, CLIA"
                            className="h-8.5 text-xs placeholder:text-muted-foreground/60"
                            title="Specific method for this parameter"
                          />
                        </td>

                        {/* Input Type */}
                        <td className="py-3 px-2">
                          <select
                            value={param.input_type}
                            onChange={(e) =>
                              updateParameter(index, "input_type", e.target.value as any)
                            }
                            className="w-full h-8.5 px-2.5 rounded-md border border-input bg-background text-xs font-medium focus:ring-1 focus:ring-primary"
                          >
                            <option value="numeric">Numeric Value</option>
                            <option value="calculated">Calculated Formula</option>
                            <option value="selection">Dropdown Select</option>
                            <option value="text">Short Text</option>
                            <option value="textarea">Observation (Multiline)</option>
                          </select>
                        </td>

                        {/* Formula / Options Details */}
                        <td className="py-3 px-3">
                          {isCalculated ? (
                            <div className="space-y-1">
                              <Input
                                value={param.formula}
                                onChange={(e) => updateParameter(index, "formula", e.target.value)}
                                placeholder="{TBIL} - {DBIL}"
                                className="h-8 font-mono text-[11px] bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300 font-bold"
                                title="Formula expression with parameter codes in braces"
                              />
                            </div>
                          ) : isSelection ? (
                            <button
                              type="button"
                              onClick={() => openOptionsConfig(index)}
                              className="w-full py-1 px-2.5 rounded-md border border-blue-500/40 bg-blue-500/10 text-blue-600 text-xs font-bold flex items-center justify-between hover:bg-blue-500/20 transition-colors"
                            >
                              <span className="flex items-center gap-1 truncate text-[11px]">
                                <ListPlus className="h-3.5 w-3.5" />
                                {param.options?.length ? `${param.options.length} Options` : "Set Options"}
                              </span>
                              <span className="text-[10px] underline">Edit</span>
                            </button>
                          ) : (
                            <span className="text-muted-foreground text-xs italic">-</span>
                          )}
                        </td>

                        {/* Unit */}
                        <td className="py-3 px-2">
                          <Input
                            value={param.unit}
                            onChange={(e) => updateParameter(index, "unit", e.target.value)}
                            placeholder="mg/dL"
                            className="h-8.5 text-xs font-mono"
                          />
                        </td>

                        {/* Biological Reference Range */}
                        <td className="py-3 px-3">
                          <button
                            type="button"
                            onClick={() => openRangeConfig(index)}
                            className={`w-full py-1 px-3 rounded-lg border text-xs font-bold transition-all flex items-center justify-between gap-2 shadow-2xs ${
                              rangeCount > 1
                                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/20"
                                : rangeCount === 1 && param.ranges[0]?.display_range
                                ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                                : "bg-muted/80 border-border text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            <span className="truncate text-xs font-semibold">
                              {rangeCount > 1
                                ? `${rangeCount} Age/Gender Ranges`
                                : param.ranges?.[0]?.display_range || "Configure Ranges"}
                            </span>
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 font-mono font-normal shrink-0"
                            >
                              Config
                            </Badge>
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => moveParameterUp(index)}
                              disabled={index === 0}
                              className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                              title="Move Up"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveParameterDown(index)}
                              disabled={index === parameters.length - 1}
                              className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                              title="Move Down"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeParameter(index)}
                              className="p-1 rounded text-red-500 hover:bg-red-500/10"
                              title="Delete Parameter"
                            >
                              <Trash2 className="h-4 w-4" />
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
        </CardContent>
      </Card>

      {/* ── SECTION 3: CLINICAL INTERPRETATION & DIAGNOSTIC NOTES ── */}
      <Card className="border-border bg-card shadow-xs">
        <div className="p-4 bg-muted/30 border-b border-border flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                3. Clinical Interpretation & Diagnostic Guidelines
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Pathology clinical correlation commentary, differential diagnosis notes, and analytical principles printed on final diagnostic reports.
              </p>
            </div>
          </div>
        </div>

        <CardContent className="p-5">
          <RichHtmlEditor
            value={interpretation}
            onChange={setInterpretation}
            placeholder="Type or format comprehensive clinical interpretation notes here... (e.g. Clinical Significance, Reference Intervals interpretation, Diagnostic Patterns, Tables)"
            minHeight="340px"
          />
        </CardContent>
      </Card>

      {/* ── BOTTOM ACTIONS BAR ── */}
      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border">
        <div className="text-xs text-muted-foreground">
          Showing {parameterCount} parameter(s) and {headingCount} heading(s). All changes are validated against hospital schema.
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/lab")}
            className="h-9 px-4 text-xs font-semibold"
          >
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !testName.trim() || !testCode.trim()}
            className="h-9 px-6 text-xs font-bold gap-2 shadow-xs bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? "Saving Test..." : isEditing ? "Save Changes" : "Create Test Template"}
          </Button>
        </div>
      </div>

      {/* ── DIALOG 1: MULTI-TIER REFERENCE RANGE MATRIX DIALOG ── */}
      {isRangeModalOpen && editingParamIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-4xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 bg-muted/60 border-b border-border flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-primary" />
                  <h3 className="font-bold text-foreground text-sm">
                    Reference Ranges Configuration: {parameters[editingParamIndex]?.name || "Parameter"}
                  </h3>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Define biological reference intervals based on Gender (Male/Female/Both) and Age scope (Years/Months/Days)
                </p>
              </div>
              <button
                onClick={() => setIsRangeModalOpen(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Range Table */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-foreground">
                  Age & Gender Range Variations ({parameters[editingParamIndex]?.ranges?.length || 0})
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addRangeVariation}
                  className="h-7 text-xs font-bold gap-1 text-primary border-primary/30 hover:bg-primary/10"
                >
                  <Plus className="h-3 w-3" />
                  Add Age/Gender Range Variation
                </Button>
              </div>

              <div className="border border-border rounded-xl overflow-hidden bg-background shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-muted text-muted-foreground uppercase text-[10px] font-bold border-b border-border">
                        <th className="py-2.5 px-3 w-28">Gender</th>
                        <th className="py-2.5 px-3 min-w-[210px]">Age Range (Min - Max)</th>
                        <th className="py-2.5 px-2 w-20 text-center">Min Val</th>
                        <th className="py-2.5 px-2 w-20 text-center">Max Val</th>
                        <th className="py-2.5 px-3 min-w-[190px]">Report Display Text</th>
                        <th className="py-2.5 px-2 min-w-[110px]">Normal Value</th>
                        <th className="py-2.5 px-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {parameters[editingParamIndex]?.ranges?.map((range, rIdx) => (
                        <tr key={rIdx} className="hover:bg-muted/20">
                          {/* Gender */}
                          <td className="py-2.5 px-3">
                            <select
                              value={range.gender}
                              onChange={(e) => updateRangeField(rIdx, "gender", e.target.value)}
                              className="h-8.5 px-2 rounded-md border border-input bg-card text-xs font-semibold"
                            >
                              <option value="Both">Both (M/F)</option>
                              <option value="Male">Male Only</option>
                              <option value="Female">Female Only</option>
                            </select>
                          </td>

                          {/* Age Scope */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <Input
                                type="number"
                                value={range.age_min}
                                onChange={(e) =>
                                  updateRangeField(rIdx, "age_min", Number(e.target.value) || 0)
                                }
                                className="h-8.5 w-14 text-center font-mono text-xs px-1"
                                placeholder="0"
                              />
                              <span className="text-muted-foreground text-xs">-</span>
                              <Input
                                type="number"
                                value={range.age_max}
                                onChange={(e) =>
                                  updateRangeField(rIdx, "age_max", Number(e.target.value) || 120)
                                }
                                className="h-8.5 w-14 text-center font-mono text-xs px-1"
                                placeholder="120"
                              />
                              <select
                                value={range.age_unit}
                                onChange={(e) => updateRangeField(rIdx, "age_unit", e.target.value)}
                                className="h-8.5 px-2 rounded-md border border-input bg-card text-xs font-medium"
                              >
                                <option value="Years">Years</option>
                                <option value="Months">Months</option>
                                <option value="Days">Days</option>
                              </select>
                            </div>
                          </td>

                          {/* Min Val */}
                          <td className="py-2.5 px-2">
                            <Input
                              value={range.min_val}
                              onChange={(e) => updateRangeField(rIdx, "min_val", e.target.value)}
                              placeholder="13.5"
                              className="h-8.5 font-mono text-center text-xs"
                            />
                          </td>

                          {/* Max Val */}
                          <td className="py-2.5 px-2">
                            <Input
                              value={range.max_val}
                              onChange={(e) => updateRangeField(rIdx, "max_val", e.target.value)}
                              placeholder="17.5"
                              className="h-8.5 font-mono text-center text-xs"
                            />
                          </td>

                          {/* Display Range */}
                          <td className="py-2.5 px-3">
                            <textarea
                              value={range.display_range}
                              onChange={(e) => updateRangeField(rIdx, "display_range", e.target.value)}
                              placeholder="e.g. 13.5 - 17.5 g/dL"
                              rows={2}
                              className="w-full px-2.5 py-1 rounded-md border border-input bg-card text-xs font-mono resize-y"
                            />
                          </td>

                          {/* Normal Value */}
                          <td className="py-2.5 px-2">
                            <Input
                              value={range.normal_value}
                              onChange={(e) => updateRangeField(rIdx, "normal_value", e.target.value)}
                              placeholder="Negative"
                              className="h-8.5 text-xs"
                            />
                          </td>

                          {/* Delete */}
                          <td className="py-2.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeRangeVariation(rIdx)}
                              className="p-1.5 rounded text-red-500 hover:bg-red-500/10"
                              title="Remove Variation"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 bg-muted/60 border-t border-border flex justify-end">
              <Button
                type="button"
                size="sm"
                onClick={() => setIsRangeModalOpen(false)}
                className="font-bold text-xs px-5"
              >
                Done, Save Ranges
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── DIALOG 2: DROPDOWN OPTIONS MANAGER DIALOG ── */}
      {isOptionsModalOpen && editingParamIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-muted/60 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-bold text-foreground text-sm">
                  Configure Selection Options: {parameters[editingParamIndex]?.name || "Parameter"}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Technicians will choose from these dropdown values during result entry
                </p>
              </div>
              <button
                onClick={() => setIsOptionsModalOpen(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
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
                  placeholder="Type an option and press Enter (e.g. Negative, Positive, Clear)"
                  className="h-9 text-xs flex-1"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => addOptionItem()}
                  className="h-9 px-4 text-xs font-bold"
                >
                  Add Option
                </Button>
              </div>

              {/* Quick Presets */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-muted-foreground">Quick Presets:</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyOptionPreset(["Negative", "Positive", "Equivocal"])}
                    className="px-2 py-1 rounded-md border border-border bg-muted/40 text-[10px] font-semibold text-foreground hover:bg-muted"
                  >
                    Negative / Positive / Equivocal
                  </button>
                  <button
                    type="button"
                    onClick={() => applyOptionPreset(["Clear", "Slightly Hazy", "Hazy", "Turbid"])}
                    className="px-2 py-1 rounded-md border border-border bg-muted/40 text-[10px] font-semibold text-foreground hover:bg-muted"
                  >
                    Clear / Hazy / Turbid
                  </button>
                  <button
                    type="button"
                    onClick={() => applyOptionPreset(["Pale Yellow", "Straw", "Amber", "Dark Yellow"])}
                    className="px-2 py-1 rounded-md border border-border bg-muted/40 text-[10px] font-semibold text-foreground hover:bg-muted"
                  >
                    Urine Color Shades
                  </button>
                  <button
                    type="button"
                    onClick={() => applyOptionPreset(["Nil", "Trace", "1+", "2+", "3+", "4+"])}
                    className="px-2 py-1 rounded-md border border-border bg-muted/40 text-[10px] font-semibold text-foreground hover:bg-muted"
                  >
                    Nil / Trace / 1+ / 2+ / 3+ / 4+
                  </button>
                </div>
              </div>

              {/* Configured Options Chips */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground">
                  Configured Choices ({parameters[editingParamIndex]?.options?.length || 0}):
                </Label>
                <div className="flex flex-wrap gap-2 p-3 bg-muted/20 border border-border rounded-xl min-h-[90px]">
                  {parameters[editingParamIndex]?.options?.length === 0 ? (
                    <span className="text-xs text-muted-foreground italic">
                      No choices added yet. Type an option above or select a preset.
                    </span>
                  ) : (
                    parameters[editingParamIndex]?.options?.map((opt, oIdx) => (
                      <div
                        key={oIdx}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background border border-border text-xs font-bold text-foreground shadow-2xs"
                      >
                        <span>{opt}</span>
                        <button
                          type="button"
                          onClick={() => removeOptionItem(oIdx)}
                          className="text-muted-foreground hover:text-red-500"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-muted/60 border-t border-border flex justify-end">
              <Button
                type="button"
                size="sm"
                onClick={() => setIsOptionsModalOpen(false)}
                className="font-bold text-xs px-5"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
