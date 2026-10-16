import React, { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  X,
  FlaskConical,
  Search,
  Zap,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Syringe,
  Building2,
  User,
  Bed,
  FileText,
  DollarSign,
  Loader2,
  Sparkles,
  Layers,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { labService } from "@/services/labService"
import type { LabTestTemplate } from "@/types/lab"

export interface CreateIpdLabOrderModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  admissionId: number
  patientName: string
  uhid: string
  wardName?: string
  bedNumber?: string
  doctorId?: number | string | null
  doctorName?: string
}

// Popular admission test panels for rapid 1-click addition
const POPULAR_PANELS = [
  { label: "CBC (Hemogram)", search: "CBC", desc: "Hb, TLC, DLC, Platelets" },
  { label: "KFT / RFT", search: "KFT", desc: "Urea, Creatinine, Uric Acid" },
  { label: "LFT (Liver)", search: "LFT", desc: "Bilirubin, SGOT, SGPT, AlkP" },
  { label: "Electrolytes", search: "Electrolytes", desc: "Na+, K+, Cl-" },
  { label: "Blood Sugar (RBS)", search: "Blood Sugar Random", desc: "Random Glucose" },
  { label: "Urine R/M", search: "Urine Routine", desc: "Microscopy & Chemistry" },
  { label: "Culture & Sensitivity", search: "Culture", desc: "Aerobic / Antibiotic" },
  { label: "Coagulation (PT/INR)", search: "PT / INR", desc: "Prothrombin Time" },
  { label: "ABG", search: "Arterial Blood Gas", desc: "pH, pO2, pCO2, HCO3" },
  { label: "Cardiac Troponin", search: "Troponin", desc: "Cardiac Biomarker" },
]

export const CreateIpdLabOrderModal: React.FC<CreateIpdLabOrderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  admissionId,
  patientName,
  uhid,
  wardName,
  bedNumber,
  doctorId,
  doctorName,
}) => {
  const queryClient = useQueryClient()

  // Form State
  const [urgency, setUrgency] = useState<"Routine" | "Urgent" | "STAT">("Routine")
  const [isBedsideCollection, setIsBedsideCollection] = useState(true)
  const [clinicalNotes, setClinicalNotes] = useState("")
  const [selectedTests, setSelectedTests] = useState<LabTestTemplate[]>([])

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("All")

  // Fetch Test Templates Catalog
  const { data: templatesRaw, isLoading: templatesLoading } = useQuery({
    queryKey: ["lab", "templates", "catalog"],
    queryFn: () => labService.getTemplates({ per_page: 350 }),
    enabled: isOpen,
  })

  // Normalize templates
  const allTemplates: LabTestTemplate[] = useMemo(() => {
    if (Array.isArray(templatesRaw)) return templatesRaw
    if (templatesRaw && Array.isArray((templatesRaw as any).data)) return (templatesRaw as any).data
    return []
  }, [templatesRaw])

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>()
    allTemplates.forEach((t) => {
      if (t.category) set.add(t.category)
    })
    return ["All", ...Array.from(set).sort()]
  }, [allTemplates])

  // Filter templates by category and search term
  const filteredTemplates = useMemo(() => {
    return allTemplates.filter((tpl) => {
      if (!tpl.is_active) return false
      if (selectedCategory !== "All" && tpl.category !== selectedCategory) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesName = tpl.test_name?.toLowerCase().includes(q)
        const matchesCode = tpl.test_code?.toLowerCase().includes(q)
        const matchesCat = tpl.category?.toLowerCase().includes(q)
        if (!matchesName && !matchesCode && !matchesCat) return false
      }
      return true
    })
  }, [allTemplates, selectedCategory, searchQuery])

  // Total Rate Calculation
  const totalAmount = useMemo(() => {
    return selectedTests.reduce((sum, item) => sum + (Number(item.standard_price) || 0), 0)
  }, [selectedTests])

  // Toggle selection
  const handleToggleTest = (tpl: LabTestTemplate) => {
    setSelectedTests((prev) => {
      const exists = prev.some((t) => t.id === tpl.id)
      if (exists) {
        return prev.filter((t) => t.id !== tpl.id)
      } else {
        return [...prev, tpl]
      }
    })
  }

  // Quick 1-click add from popular panel shortcuts
  const handleQuickAdd = (searchStr: string) => {
    const found = allTemplates.find((t) =>
      t.test_name?.toLowerCase().includes(searchStr.toLowerCase()) ||
      t.test_code?.toLowerCase().includes(searchStr.toLowerCase())
    )
    if (found) {
      if (!selectedTests.some((t) => t.id === found.id)) {
        setSelectedTests((prev) => [...prev, found])
        toast.success(`Added ${found.test_name}`)
      } else {
        toast.info(`${found.test_name} is already in the requisition list`)
      }
    } else {
      setSearchQuery(searchStr)
    }
  }

  // Remove test
  const handleRemoveTest = (id: number) => {
    setSelectedTests((prev) => prev.filter((t) => t.id !== id))
  }

  // Mutation
  const createOrderMutation = useMutation({
    mutationFn: () =>
      labService.createIpdLabOrder({
        ipd_admission_id: admissionId,
        template_ids: selectedTests.map((t) => t.id),
        doctor_id: doctorId ? Number(doctorId) : null,
        urgency,
        is_bedside_collection: isBedsideCollection,
        clinical_notes: clinicalNotes.trim() || undefined,
      }),
    onSuccess: (data) => {
      toast.success(
        `Lab Requisition #${data.order_number} created successfully! Charges posted to IPD ledger.`
      )
      queryClient.invalidateQueries({ queryKey: ["ipd", "chart", admissionId] })
      queryClient.invalidateQueries({ queryKey: ["lab", "orders"] })
      queryClient.invalidateQueries({ queryKey: ["billing"] })
      onSuccess?.()
      onClose()
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create bedside lab requisition")
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedTests.length === 0) {
      toast.error("Please select at least one diagnostic test or panel.")
      return
    }
    createOrderMutation.mutate()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
              <FlaskConical className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Bedside Lab & Diagnostic Requisition
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  IPD Bedside Order
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Order diagnostic laboratory investigations with auto-billing to IPD ledger
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Patient Demographics & Bed Info Strip */}
        <div className="px-5 py-3 bg-blue-50/50 dark:bg-blue-950/20 border-b border-blue-100 dark:border-blue-900/30 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
              <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{patientName}</span>
              <span className="text-slate-400">({uhid})</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>{wardName || "General Ward"}</span>
            </div>
            <div className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
              <Bed className="w-3.5 h-3.5" />
              <span>Bed #{bedNumber || "Unassigned"}</span>
            </div>
            {doctorName && (
              <div className="text-slate-500">
                Dr. {doctorName}
              </div>
            )}
          </div>
          <div className="text-slate-500 dark:text-slate-400 text-[11px]">
            Admission #{admissionId}
          </div>
        </div>

        {/* Main Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* 1. Urgency & Collection Mode Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Urgency Selector */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                Requisition Urgency / Clinical Priority
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setUrgency("Routine")}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border text-center transition-all ${
                    urgency === "Routine"
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 mx-auto mb-1 opacity-80" />
                  Routine
                </button>
                <button
                  type="button"
                  onClick={() => setUrgency("Urgent")}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border text-center transition-all ${
                    urgency === "Urgent"
                      ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 mx-auto mb-1 opacity-80" />
                  Urgent
                </button>
                <button
                  type="button"
                  onClick={() => setUrgency("STAT")}
                  className={`px-3 py-2 rounded-lg text-xs font-bold border text-center transition-all ${
                    urgency === "STAT"
                      ? "bg-rose-600 text-white border-rose-600 shadow-md animate-pulse"
                      : "bg-white dark:bg-slate-800 border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 hover:bg-rose-50/50"
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 mx-auto mb-1 opacity-90" />
                  STAT Emergency
                </button>
              </div>
            </div>

            {/* Phlebotomy / Collection Location */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Syringe className="w-3.5 h-3.5 text-blue-500" />
                Sample Collection Protocol
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsBedsideCollection(true)}
                  className={`p-2.5 rounded-lg text-left border transition-all ${
                    isBedsideCollection
                      ? "bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-900 dark:text-blue-100 shadow-sm"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                  }`}
                >
                  <div className="font-semibold text-xs flex items-center justify-between">
                    Bedside Phlebotomy
                    {isBedsideCollection && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Phlebotomist draws sample at Bed #{bedNumber || "Bedside"}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setIsBedsideCollection(false)}
                  className={`p-2.5 rounded-lg text-left border transition-all ${
                    !isBedsideCollection
                      ? "bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-900 dark:text-blue-100 shadow-sm"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                  }`}
                >
                  <div className="font-semibold text-xs flex items-center justify-between">
                    Lab Booth Visit
                    {!isBedsideCollection && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Mobile patient visits central phlebotomy booth
                  </p>
                </button>
              </div>
            </div>
          </div>

          {/* 2. Popular Clinical Panels (1-Click Shortcuts) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Quick-Add Common Inpatient Investigations
              </span>
              <span className="text-[11px] text-slate-400">Click to add instantly</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {POPULAR_PANELS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handleQuickAdd(p.search)}
                  className="p-2 text-left rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-all group"
                >
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 truncate">
                    + {p.label}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Search & Test Catalog Browser */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search 280+ tests by name, code (e.g. CBC, KFT, LFT, CRP, Trop-I, Urine)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
                {categories.slice(0, 7).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                      selectedCategory === cat
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Test Catalog Grid */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-800/10">
              <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-1">
                {templatesLoading ? (
                  <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    Loading pathology & diagnostic catalog...
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No matching laboratory tests found for "{searchQuery}".
                  </div>
                ) : (
                  filteredTemplates.slice(0, 60).map((tpl) => {
                    const isSelected = selectedTests.some((t) => t.id === tpl.id)
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => handleToggleTest(tpl)}
                        className={`p-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800"
                            : "hover:bg-white dark:hover:bg-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded flex items-center justify-center border text-xs transition-colors ${
                              isSelected
                                ? "bg-blue-600 border-blue-600 text-white"
                                : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                            }`}
                          >
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                              <span>{tpl.test_name}</span>
                              {tpl.test_code && (
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                                  {tpl.test_code}
                                </span>
                              )}
                              {tpl.is_panel && (
                                <span className="text-[10px] font-semibold px-1 rounded bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200">
                                  Panel
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>{tpl.category}</span>
                              {tpl.sample_type && (
                                <>
                                  <span>•</span>
                                  <span>{tpl.sample_type}</span>
                                </>
                              )}
                              {tpl.container_color && (
                                <>
                                  <span>•</span>
                                  <span className="font-medium text-slate-600 dark:text-slate-300">
                                    Vial: {tpl.container_color}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            ₹{Number(tpl.standard_price).toFixed(2)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            TAT: {tpl.tat_hours || 24}h
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {/* 4. Selected Tests Tray */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-600" />
                Selected Investigations ({selectedTests.length})
              </span>
              {selectedTests.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedTests([])}
                  className="text-[11px] text-rose-500 hover:text-rose-600 font-medium"
                >
                  Clear All
                </button>
              )}
            </div>

            {selectedTests.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                No tests selected yet. Click any test above to add to this requisition.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto">
                {selectedTests.map((t, idx) => (
                  <div
                    key={t.id}
                    className="py-2 flex items-center justify-between text-xs group"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-[10px] text-slate-400 font-mono w-4">
                        {idx + 1}.
                      </span>
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {t.test_name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {t.category} {t.sample_type ? `• ${t.sample_type}` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        ₹{Number(t.standard_price).toFixed(2)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveTest(t.id)}
                        className="h-6 w-6 text-slate-400 hover:text-rose-500 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Financial Summary & Auto-IPD Ledger Notice */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  Auto-posted to <strong>IPD Ledger (Encounter #{admissionId})</strong>
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 mr-2">Total Requisition Charges:</span>
                <span className="text-base font-extrabold text-blue-600 dark:text-blue-400">
                  ₹{totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* 5. Clinical Indication / Doctor Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Clinical Indication / Diagnosis / Special Instructions
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Post-op day 2 fever spike; rule out sepsis; pre-op routine screening..."
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {selectedTests.length} investigation{selectedTests.length === 1 ? "" : "s"} selected
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={createOrderMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSubmit}
              disabled={createOrderMutation.isPending || selectedTests.length === 0}
              className={`gap-1.5 ${
                urgency === "STAT"
                  ? "bg-rose-600 hover:bg-rose-700 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {createOrderMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Order...
                </>
              ) : (
                <>
                  <FlaskConical className="w-4 h-4" />
                  Place Bedside Order ({selectedTests.length})
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
