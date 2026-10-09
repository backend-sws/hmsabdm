import React, { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  Stethoscope,
  Building2,
  Hospital,
  Search,
  RotateCcw,
  Check,
  X,
  Pill,
  Loader2,
  Layers,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { rxPresetService } from "@/services/rxPresetService"
import { departmentService } from "@/services/departmentService"
import { doctorService } from "@/services/doctorService"
import { opdService } from "@/services/opdService"
import { detectMedicineFormAndDosage } from "../opd/DoctorConsultationWorkstationView"
import type { RxPreset, RxPresetScope, RxPresetMedicine } from "@/types/rxPreset"
import type { MedicineResult } from "@/types/opd"

const PRESET_ICONS = ["💊", "🌡️", "🫀", "🩺", "🩸", "🩹", "🦴", "👶", "🫁", "👁️", "👂", "🦷", "🧠", "✨"]

export const RxPresetsSettingsCard: React.FC = () => {
  const queryClient = useQueryClient()
  const [scopeFilter, setScopeFilter] = useState<"all" | RxPresetScope>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>("")
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>("")

  // Modal State for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPreset, setEditingPreset] = useState<RxPreset | null>(null)

  // Form State
  const [formName, setFormName] = useState("")
  const [formIcon, setFormIcon] = useState("💊")
  const [formScope, setFormScope] = useState<RxPresetScope>("hospital")
  const [formDeptName, setFormDeptName] = useState("")
  const [formDoctorName, setFormDoctorName] = useState("")
  const [formMeds, setFormMeds] = useState<RxPresetMedicine[]>([
    { medicine_name: "", dosage: "1 tab", frequency: "OD", duration: "5 days", route: "Oral", instructions: "After food" },
  ])

  // Live Medicine Master Autocomplete State
  const [activeMedRow, setActiveMedRow] = useState<number | null>(null)
  const [medSuggestions, setMedSuggestions] = useState<MedicineResult[]>([])
  const [isSearchingMed, setIsSearchingMed] = useState(false)
  const medTimeoutRef = useRef<any>(null)

  const handleMedNameChange = (val: string, index: number) => {
    const updated = [...formMeds]
    updated[index].medicine_name = val
    setFormMeds(updated)
    setActiveMedRow(index)

    if (medTimeoutRef.current) clearTimeout(medTimeoutRef.current)
    if (!val || val.trim().length < 2) {
      setMedSuggestions([])
      setIsSearchingMed(false)
      return
    }

    setIsSearchingMed(true)
    medTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await opdService.searchMedicines(val)
        setMedSuggestions(results)
      } catch (err) {
        console.error("Failed to search medicine master:", err)
      } finally {
        setIsSearchingMed(false)
      }
    }, 200)
  }

  const handleSelectMedicine = (med: MedicineResult, index: number) => {
    const brandName = med.brand_name || med.name
    const detected = detectMedicineFormAndDosage(brandName, med.dosage_form)
    const updated = [...formMeds]
    updated[index] = {
      ...updated[index],
      medicine_name: brandName,
      dosage: detected.defaultDosage,
      route: detected.defaultRoute,
      instructions: detected.defaultInstructions || updated[index].instructions || "After food",
    }
    setFormMeds(updated)
    setActiveMedRow(null)
    setMedSuggestions([])
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest(".med-master-autocomplete-box")) {
        setActiveMedRow(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Queries
  const { data: presets = [] } = useQuery({
    queryKey: ["settings", "rx_presets"],
    queryFn: () => rxPresetService.getPresets(),
  })

  const { data: departmentsData } = useQuery({
    queryKey: ["departments", "list"],
    queryFn: () => departmentService.getDepartments({ all: true, is_active: true }),
  })
  const departments = Array.isArray(departmentsData)
    ? departmentsData
    : (departmentsData as any)?.data || []

  const { data: doctorsData } = useQuery({
    queryKey: ["doctors", "list"],
    queryFn: () => doctorService.getDoctors({ limit: 100 }),
  })
  const doctors = Array.isArray(doctorsData) ? doctorsData : (doctorsData as any)?.data || []

  // Mutations
  const saveMutation = useMutation({
    mutationFn: (data: Omit<RxPreset, "id"> & { id?: string }) => rxPresetService.savePreset(data),
    onSuccess: (saved) => {
      toast.success(`Preset "${saved.name}" saved successfully!`)
      queryClient.invalidateQueries({ queryKey: ["settings", "rx_presets"] })
      setIsModalOpen(false)
      resetForm()
    },
    onError: (err: any) => toast.error(err.message || "Failed to save preset"),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => rxPresetService.deletePreset(id),
    onSuccess: () => {
      toast.success("Preset deleted successfully")
      queryClient.invalidateQueries({ queryKey: ["settings", "rx_presets"] })
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete preset"),
  })

  const resetMutation = useMutation({
    mutationFn: () => rxPresetService.resetToDefaults(),
    onSuccess: () => {
      toast.success("Restored standard clinical presets")
      queryClient.invalidateQueries({ queryKey: ["settings", "rx_presets"] })
    },
  })

  const resetForm = () => {
    setEditingPreset(null)
    setFormName("")
    setFormIcon("💊")
    setFormScope("hospital")
    setFormDeptName("")
    setFormDoctorName("")
    setFormMeds([
      { medicine_name: "", dosage: "1 tab", frequency: "OD", duration: "5 days", route: "Oral", instructions: "After food" },
    ])
  }

  const handleOpenCreate = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const handleOpenEdit = (preset: RxPreset) => {
    setEditingPreset(preset)
    setFormName(preset.name)
    setFormIcon(preset.icon || "💊")
    setFormScope(preset.scope)
    setFormDeptName(preset.department_name || "")
    setFormDoctorName(preset.doctor_name || "")
    setFormMeds(
      preset.meds && preset.meds.length > 0
        ? [...preset.meds]
        : [{ medicine_name: "", dosage: "1 tab", frequency: "OD", duration: "5 days", route: "Oral", instructions: "After food" }]
    )
    setIsModalOpen(true)
  }

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) {
      toast.error("Please enter a preset name")
      return
    }
    const cleanMeds = formMeds.filter((m) => m.medicine_name.trim() !== "")
    if (cleanMeds.length === 0) {
      toast.error("Please add at least one medicine with a name")
      return
    }

    saveMutation.mutate({
      id: editingPreset?.id,
      name: formName.trim(),
      icon: formIcon,
      scope: formScope,
      department_name: formScope === "department" ? formDeptName : null,
      doctor_name: formScope === "doctor" ? formDoctorName : null,
      meds: cleanMeds,
      is_default: editingPreset?.is_default || false,
    })
  }

  // Filter Presets
  const filteredPresets = presets.filter((p) => {
    if (scopeFilter !== "all" && p.scope !== scopeFilter) return false
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      const matchName = p.name.toLowerCase().includes(q)
      const matchDept = (p.department_name || "").toLowerCase().includes(q)
      const matchDoc = (p.doctor_name || "").toLowerCase().includes(q)
      const matchMeds = p.meds.some((m) => m.medicine_name.toLowerCase().includes(q))
      if (!matchName && !matchDept && !matchDoc && !matchMeds) return false
    }
    if (selectedDeptFilter && p.department_name !== selectedDeptFilter) return false
    if (selectedDoctorFilter && p.doctor_name !== selectedDoctorFilter) return false
    return true
  })

  // Counters
  const countHospital = presets.filter((p) => p.scope === "hospital").length
  const countDept = presets.filter((p) => p.scope === "department").length
  const countDoc = presets.filter((p) => p.scope === "doctor").length

  return (
    <Card className="border border-slate-200/80 dark:border-border/70 rounded-2xl shadow-xs overflow-hidden bg-card">
      <CardHeader className="p-4 sm:p-6 pb-4 border-b border-border/80 bg-gradient-to-b from-slate-50/50 to-transparent dark:from-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/25 shadow-2xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base sm:text-lg font-bold text-foreground">
                  Prescription Presets & Clinical Templates
                </CardTitle>
                <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20 font-semibold px-2 py-0.5 rounded-full">
                  3-Tier Clinical Engine
                </Badge>
              </div>
              <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Pre-configured medication regimens for instant 1-click loading across Doctor, Department, and Hospital scopes
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (window.confirm("Restore factory default presets? This will ensure all common templates exist.")) {
                  resetMutation.mutate()
                }
              }}
              className="text-xs h-8.5 rounded-xl border-slate-200 dark:border-border gap-1.5 text-muted-foreground hover:text-foreground shadow-2xs font-medium cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Defaults
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleOpenCreate}
              className="text-xs h-8.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-1.5 shadow-xs hover:shadow transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Create Preset
            </Button>
          </div>
        </div>

        {/* 3-Tier Scope Switcher Tabs */}
        <div className="flex items-center gap-2 pt-3 flex-wrap">
          <div className="inline-flex items-center p-1 rounded-xl bg-slate-100/90 dark:bg-muted/60 border border-slate-200/80 dark:border-border/60 gap-1 flex-wrap sm:flex-nowrap shadow-2xs">
            <button
              type="button"
              onClick={() => setScopeFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                scopeFilter === "all"
                  ? "bg-white dark:bg-card text-foreground shadow-xs ring-1 ring-slate-200/80 dark:ring-border/60"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/50"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>All Presets</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                  scopeFilter === "all"
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "bg-slate-200/80 dark:bg-muted text-muted-foreground"
                }`}
              >
                {presets.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setScopeFilter("doctor")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                scopeFilter === "doctor"
                  ? "bg-white dark:bg-card text-amber-700 dark:text-amber-400 shadow-xs ring-1 ring-amber-500/40"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/50"
              }`}
            >
              <Stethoscope className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span>Doctor Personal</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                  scopeFilter === "doctor"
                    ? "bg-amber-600 text-white"
                    : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                }`}
              >
                {countDoc}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setScopeFilter("department")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                scopeFilter === "department"
                  ? "bg-white dark:bg-card text-purple-700 dark:text-purple-400 shadow-xs ring-1 ring-purple-500/40"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/50"
              }`}
            >
              <Building2 className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              <span>Department Specific</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                  scopeFilter === "department"
                    ? "bg-purple-600 text-white"
                    : "bg-purple-500/15 text-purple-700 dark:text-purple-400"
                }`}
              >
                {countDept}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setScopeFilter("hospital")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                scopeFilter === "hospital"
                  ? "bg-white dark:bg-card text-blue-700 dark:text-blue-400 shadow-xs ring-1 ring-blue-500/40"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/50"
              }`}
            >
              <Hospital className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Hospital Wide</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                  scopeFilter === "hospital"
                    ? "bg-blue-600 text-white"
                    : "bg-blue-500/15 text-blue-700 dark:text-blue-400"
                }`}
              >
                {countHospital}
              </span>
            </button>
          </div>
        </div>

        {/* Search & Filter Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/70" />
            <Input
              placeholder="Search by preset name, medicine, salt, doctor, department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-8 text-xs h-9 rounded-xl bg-slate-50/70 dark:bg-muted/30 border-slate-200/80 focus-visible:ring-primary/30"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground p-0.5 rounded-md cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {scopeFilter === "department" && (
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="h-9 rounded-xl border border-input bg-background px-3 text-xs font-medium text-foreground focus:ring-1 focus:ring-primary shadow-2xs"
            >
              <option value="">All Departments ({departments.length})</option>
              {departments.map((d: any) => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          )}
          {scopeFilter === "doctor" && (
            <select
              value={selectedDoctorFilter}
              onChange={(e) => setSelectedDoctorFilter(e.target.value)}
              className="h-9 rounded-xl border border-input bg-background px-3 text-xs font-medium text-foreground focus:ring-1 focus:ring-primary shadow-2xs"
            >
              <option value="">All Doctors ({doctors.length})</option>
              {doctors.map((doc: any) => (
                <option key={doc.id} value={doc.name || doc.user?.name}>
                  Dr. {doc.name || doc.user?.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-4">
        {filteredPresets.length === 0 ? (
          <div className="p-10 text-center border-2 rounded-2xl border-dashed border-slate-200 dark:border-border/60 bg-slate-50/50 dark:bg-muted/20 space-y-2.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground mx-auto">
              <Pill className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-foreground">No prescription presets found</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchTerm || scopeFilter !== "all"
                ? "Try clearing your search filters or selecting another tier."
                : 'Click "Create Preset" above to create your first clinical prescription template.'}
            </p>
            {(searchTerm || scopeFilter !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm("")
                  setScopeFilter("all")
                  setSelectedDeptFilter("")
                  setSelectedDoctorFilter("")
                }}
                className="text-xs mt-2"
              >
                Clear all filters
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {filteredPresets.map((preset) => (
              <div
                key={preset.id}
                className="group relative rounded-2xl border border-slate-200/90 dark:border-border/70 bg-card p-4 space-y-3.5 shadow-2xs hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  {/* Card Header: Icon, Name, Scope Badge */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200/50 dark:from-muted dark:to-muted/40 border border-slate-200/70 dark:border-border/60 text-xl group-hover:scale-105 group-hover:bg-primary/10 transition-transform shadow-2xs">
                        {preset.icon || "💊"}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-snug truncate">
                          {preset.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground">
                          <span className="font-medium text-foreground/80">{preset.meds?.length || 0} meds</span>
                          <span className="inline-block h-1 w-1 rounded-full bg-muted-foreground/40"></span>
                          <span>{preset.is_default ? "Default Template" : "Custom Template"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Scope Badge */}
                    {preset.scope === "doctor" && (
                      <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/50 rounded-full px-2.5 py-1 text-[10px] font-semibold flex items-center gap-1.5 shrink-0 shadow-2xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                        <span className="truncate max-w-[110px]">Dr. {preset.doctor_name || "Doctor"}</span>
                      </span>
                    )}
                    {preset.scope === "department" && (
                      <span className="bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/70 dark:border-purple-800/50 rounded-full px-2.5 py-1 text-[10px] font-semibold flex items-center gap-1.5 shrink-0 shadow-2xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-purple-500"></span>
                        <span className="truncate max-w-[110px]">{preset.department_name || "Dept"}</span>
                      </span>
                    )}
                    {preset.scope === "hospital" && (
                      <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/50 rounded-full px-2.5 py-1 text-[10px] font-semibold flex items-center gap-1.5 shrink-0 shadow-2xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                        <span>Hospital Wide</span>
                      </span>
                    )}
                  </div>

                  {/* Medicines preview chips */}
                  <div className="mt-3 space-y-1.5">
                    {preset.meds.slice(0, 3).map((m, mIdx) => (
                      <div
                        key={mIdx}
                        className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50/90 dark:bg-muted/30 border border-slate-100 dark:border-border/40 group/med hover:bg-slate-100/80 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                            <Pill className="h-3 w-3" />
                          </span>
                          <span className="font-semibold text-xs text-foreground truncate max-w-[170px]">
                            {m.medicine_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {m.dosage && (
                            <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-white dark:bg-card border border-slate-200 dark:border-border text-slate-700 dark:text-slate-300 shadow-2xs">
                              {m.dosage}
                            </span>
                          )}
                          {m.frequency && (
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                              {m.frequency}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {preset.meds.length > 3 && (
                      <div className="flex items-center justify-between px-1 pt-0.5">
                        <span className="text-[11px] font-medium text-muted-foreground/80">
                          +{preset.meds.length - 3} more medicines
                        </span>
                        <span
                          className="text-[10px] text-primary font-semibold hover:underline cursor-pointer"
                          onClick={() => handleOpenEdit(preset)}
                        >
                          View full list →
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-2.5 border-t border-slate-100 dark:border-border/60 flex items-center justify-between">
                  <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${preset.is_default ? "bg-emerald-500" : "bg-slate-400"}`}></span>
                    {preset.is_default ? "System Standard" : "Custom Template"}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(preset)}
                      className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                      title="Edit Preset"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (window.confirm(`Delete preset "${preset.name}"?`)) {
                          deleteMutation.mutate(preset.id)
                        }
                      }}
                      className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                      title="Delete Preset"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* ────────────────────────────────────────────────────────────
          MODAL: CREATE / EDIT PRESET (PORTALED TO DOCUMENT.BODY)
         ──────────────────────────────────────────────────────────── */}
      {isModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-0 duration-200">
            <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-border bg-white dark:bg-card shadow-2xl overflow-hidden">
              {/* Pinned Modal Header */}
              <div className="flex items-center justify-between border-b border-border p-5 pb-4 shrink-0 bg-white dark:bg-card">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      {editingPreset ? "Edit Prescription Preset" : "Create New Prescription Preset"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Configure standard medicine dosages and multi-tier scope
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Scrollable Form Body (Single Clean Scrollbar) */}
              <form id="preset-modal-form" onSubmit={handleSaveForm} className="flex-1 overflow-y-auto p-5 py-4 space-y-4">
                {/* Row 1: Name and Icon */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-xs font-semibold">Preset Title *</Label>
                    <Input
                      placeholder="e.g. Mild Hypertension, Viral URTI Special..."
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="h-9 text-sm"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Icon</Label>
                    <div className="flex items-center gap-1">
                      <span className="text-2xl p-1 bg-muted rounded-md">{formIcon}</span>
                      <div className="flex items-center gap-1 overflow-x-auto p-1">
                        {PRESET_ICONS.slice(0, 5).map((ic) => (
                          <button
                            key={ic}
                            type="button"
                            onClick={() => setFormIcon(ic)}
                            className={`h-7 w-7 rounded text-sm ${formIcon === ic ? "bg-primary/20 ring-1 ring-primary" : "hover:bg-muted"}`}
                          >
                            {ic}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Row 2: 3-Tier Scope Selection */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Preset Scope (Tier)</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormScope("hospital")}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        formScope === "hospital"
                          ? "border-blue-500 bg-blue-500/10 ring-1 ring-blue-500"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <Hospital className="h-4 w-4 text-blue-600 dark:text-blue-400 mb-1" />
                      <p className="text-xs font-bold text-foreground">🏥 Hospital Wide</p>
                      <p className="text-[11px] text-muted-foreground">All Doctors & OPDs</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormScope("department")}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        formScope === "department"
                          ? "border-purple-500 bg-purple-500/10 ring-1 ring-purple-500"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <Building2 className="h-4 w-4 text-purple-600 dark:text-purple-400 mb-1" />
                      <p className="text-xs font-bold text-foreground">🏢 Department Specific</p>
                      <p className="text-[11px] text-muted-foreground">Only in Dept (Cardio, Ortho)</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormScope("doctor")}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        formScope === "doctor"
                          ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <Stethoscope className="h-4 w-4 text-amber-600 dark:text-amber-400 mb-1" />
                      <p className="text-xs font-bold text-foreground">⭐ Doctor Personal</p>
                      <p className="text-[11px] text-muted-foreground">Specific Doctor's Desk</p>
                    </button>
                  </div>

                  {/* Sub-selectors for Department or Doctor */}
                  {formScope === "department" && (
                    <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-1">
                      <Label className="text-xs font-semibold text-purple-900 dark:text-purple-300">Select Department</Label>
                      <select
                        value={formDeptName}
                        onChange={(e) => setFormDeptName(e.target.value)}
                        className="w-full h-9 rounded-lg border border-input bg-background px-2.5 text-xs font-medium"
                        required
                      >
                        <option value="">-- Choose Department --</option>
                        {departments.map((d: any) => (
                          <option key={d.id} value={d.name}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {formScope === "doctor" && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                      <Label className="text-xs font-semibold text-amber-900 dark:text-amber-300">Select Doctor</Label>
                      <select
                        value={formDoctorName}
                        onChange={(e) => setFormDoctorName(e.target.value)}
                        className="w-full h-9 rounded-lg border border-input bg-background px-2.5 text-xs font-medium"
                        required
                      >
                        <option value="">-- Choose Doctor --</option>
                        {doctors.map((doc: any) => (
                          <option key={doc.id} value={doc.name || doc.user?.name}>
                            Dr. {doc.name || doc.user?.name} ({doc.department?.name || "General"})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Medicines List Builder with Master Database Autocomplete (No nested scrollbar!) */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground">Medicines in this Preset ({formMeds.length})</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setFormMeds([
                          ...formMeds,
                          { medicine_name: "", dosage: "1 tab", frequency: "OD", duration: "5 days", route: "Oral", instructions: "After food" },
                        ])
                      }
                      className="h-7 text-xs gap-1"
                    >
                      <Plus className="h-3 w-3" /> Add Medicine
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {formMeds.map((med, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-border bg-muted/20 space-y-2 text-xs"
                      >
                        <div className="flex items-start gap-2">
                          {/* Live Medicine Master Autocomplete */}
                          <div className="relative med-master-autocomplete-box flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[10px] font-semibold text-muted-foreground">Medicine Name *</label>
                              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-mono font-bold flex items-center gap-1">
                                ⚡ 200,000+ Medicine Master Search
                              </span>
                            </div>
                            <div className="relative">
                              <Input
                                placeholder="Type brand or salt name (e.g. Dolo 650, Augmentin, Pan-D, Metformin)..."
                                value={med.medicine_name}
                                onChange={(e) => handleMedNameChange(e.target.value, idx)}
                                onFocus={() => {
                                  if (med.medicine_name && med.medicine_name.trim().length >= 2) {
                                    handleMedNameChange(med.medicine_name, idx)
                                  }
                                }}
                                className="h-8 text-xs font-semibold pr-8"
                                required
                              />
                              {activeMedRow === idx && isSearchingMed && (
                                <Loader2 className="absolute right-2.5 top-2 h-4 w-4 text-primary animate-spin" />
                              )}
                            </div>

                            {/* Floating Autocomplete Dropdown from 200k Database */}
                            {activeMedRow === idx && medSuggestions.length > 0 && (
                              <div className="absolute z-[10005] left-0 right-0 top-full mt-1.5 max-h-52 overflow-y-auto rounded-xl border border-primary/40 bg-white dark:bg-popover shadow-2xl py-1 divide-y divide-border/60">
                                {medSuggestions.map((m) => (
                                  <button
                                    key={m.id}
                                    type="button"
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-primary/5 transition-colors flex flex-col gap-0.5 group cursor-pointer"
                                    onClick={() => handleSelectMedicine(m, idx)}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-bold text-foreground group-hover:text-primary transition-colors">
                                        {m.brand_name || m.name}
                                      </span>
                                      <div className="flex items-center gap-1 shrink-0">
                                        {m.dosage_form && (
                                          <Badge variant="outline" className="text-[9px] font-mono px-1 py-0 bg-primary/5 border-primary/30 text-primary">
                                            {m.dosage_form}
                                          </Badge>
                                        )}
                                        {m.mrp && (
                                          <span className="text-[10px] font-mono text-muted-foreground font-semibold">
                                            ₹{m.mrp}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Salt / Generic Composition */}
                                    {m.salt_composition && (
                                      <p className="text-[10px] text-muted-foreground line-clamp-1 italic">
                                        {m.salt_composition}
                                      </p>
                                    )}
                                    {m.manufacturer && (
                                      <span className="text-[9px] text-muted-foreground/75 truncate">
                                        Mfg: {m.manufacturer}
                                      </span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => setFormMeds(formMeds.filter((_, i) => i !== idx))}
                            disabled={formMeds.length <= 1}
                            className="text-muted-foreground hover:text-destructive disabled:opacity-30 p-1 mt-6"
                            title="Remove Medicine"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                          <div>
                            <label className="text-[10px] text-muted-foreground">Dosage</label>
                            <Input
                              placeholder="1 tab"
                              value={med.dosage}
                              onChange={(e) => {
                                const updated = [...formMeds]
                                updated[idx].dosage = e.target.value
                                setFormMeds(updated)
                              }}
                              className="h-7 text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground">Frequency</label>
                            <select
                              value={med.frequency}
                              onChange={(e) => {
                                const updated = [...formMeds]
                                updated[idx].frequency = e.target.value
                                setFormMeds(updated)
                              }}
                              className="h-7 w-full rounded border border-input bg-background px-1 text-xs"
                            >
                              <option value="OD">OD (Once daily)</option>
                              <option value="BD">BD (Twice daily)</option>
                              <option value="TID">TID (Thrice daily)</option>
                              <option value="QID">QID (4 times daily)</option>
                              <option value="SOS">SOS (As needed)</option>
                              <option value="HS">HS (Bedtime)</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground">Duration</label>
                            <Input
                              placeholder="5 days"
                              value={med.duration}
                              onChange={(e) => {
                                const updated = [...formMeds]
                                updated[idx].duration = e.target.value
                                setFormMeds(updated)
                              }}
                              className="h-7 text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground">Instructions</label>
                            <Input
                              placeholder="After food"
                              value={med.instructions || ""}
                              onChange={(e) => {
                                const updated = [...formMeds]
                                updated[idx].instructions = e.target.value
                                setFormMeds(updated)
                              }}
                              className="h-7 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </form>

              {/* Pinned Modal Footer */}
              <div className="flex items-center justify-end gap-2 p-4 px-5 border-t border-border bg-slate-50/90 dark:bg-muted/40 shrink-0">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="preset-modal-form"
                  size="sm"
                  disabled={saveMutation.isPending}
                  className="gap-1.5 font-semibold"
                >
                  <Check className="h-4 w-4" />
                  {saveMutation.isPending ? "Saving..." : "Save Preset"}
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </Card>
  )
}
