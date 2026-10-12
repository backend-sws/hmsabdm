import React, { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  X,
  Search,
  Sparkles,
  PlusCircle,
  Pill,
  Check,
} from "lucide-react"
import {
  createCustomMedicineSchema,
  type CreateCustomMedicineFormValues,
} from "@/schemas/pharmacy.schema"
import {
  useSearchMasterMedicines,
  useImportMedicineMutation,
  useCreateCustomMedicineMutation,
} from "@/hooks/usePharmacy"
import type { MasterMedicine } from "@/types/pharmacy"

interface MedicineFormModalProps {
  isOpen: boolean
  onClose: () => void
}

const DOSAGE_FORMS = [
  "Tablet",
  "Capsule",
  "Syrup",
  "Suspension",
  "Injection",
  "IV Fluid",
  "Ointment",
  "Gel",
  "Drops",
  "Inhaler",
  "Sachet",
  "Consumable",
]

const GST_SLABS = [0, 5, 12, 18, 28]

export const MedicineFormModal: React.FC<MedicineFormModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"import" | "custom">("import")
  const [masterSearchQuery, setMasterSearchQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [selectedMaster, setSelectedMaster] = useState<MasterMedicine | null>(null)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(masterSearchQuery.trim())
    }, 200)
    return () => clearTimeout(handler)
  }, [masterSearchQuery])

  // Master import custom overrides
  const [importRackLocation, setImportRackLocation] = useState("")
  const [importMinReorder, setImportMinReorder] = useState(20)
  const [importPurchasePrice, setImportPurchasePrice] = useState<number | "">("")
  const [importSellingPrice, setImportSellingPrice] = useState<number | "">("")
  const [importStripSize, setImportStripSize] = useState(10)
  const [importBoxSize, setImportBoxSize] = useState(1)
  const [importBaseUnit, setImportBaseUnit] = useState("Tab")

  // Search queries
  const { data: masterResults = [], isFetching: isSearchingMaster } =
    useSearchMasterMedicines(debouncedQuery)

  const importMutation = useImportMedicineMutation()
  const createCustomMutation = useCreateCustomMedicineMutation()

  // Custom Form
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateCustomMedicineFormValues>({
    resolver: zodResolver(createCustomMedicineSchema),
    defaultValues: {
      brand_name: "",
      generic_name: "",
      dosage_form: "Tablet",
      strength: "",
      pack_size: 10,
      strip_size: 10,
      box_size: 1,
      base_unit: "Tab",
      reorder_unit: "unit",
      unit_name: "Tablets",
      manufacturer: "",
      default_purchase_price: 0,
      default_selling_price: 0,
      mrp: 0,
      hsn_code: "3004",
      gst_rate: 12,
      rack_location: "",
      min_reorder_level: 20,
      prescription_type: "SCHEDULE_H",
      is_active: true,
    },
  })

  const watchPurchase = watch("default_purchase_price") || 0
  const watchSelling = watch("default_selling_price") || 0
  const watchStripSize = watch("strip_size") || 10
  const watchBoxSize = watch("box_size") || 1
  const watchBaseUnit = watch("base_unit") || "Tab"
  const marginPercent =
    watchPurchase > 0 && watchSelling > 0
      ? Math.round(((watchSelling - watchPurchase) / watchPurchase) * 100)
      : 0

  if (!isOpen) return null

  const handleSelectMaster = (med: MasterMedicine) => {
    setSelectedMaster(med)
    const baseMrp = med.mrp || 0
    setImportSellingPrice(baseMrp)
    setImportPurchasePrice(baseMrp > 0 ? Math.round(baseMrp * 0.75 * 100) / 100 : 0)
  }

  const handleConfirmImport = async () => {
    if (!selectedMaster) return

    await importMutation.mutateAsync({
      master_medicine_id: selectedMaster.id,
      dosage_form: selectedMaster.dosage_form || "Tablet",
      default_purchase_price: Number(importPurchasePrice) || 0,
      default_selling_price: Number(importSellingPrice) || 0,
      mrp: selectedMaster.mrp || Number(importSellingPrice) || 0,
      rack_location: importRackLocation || undefined,
      min_reorder_level: importMinReorder || 20,
      strip_size: importStripSize || 10,
      box_size: importBoxSize || 1,
      base_unit: importBaseUnit || "Tab",
    })

    onClose()
  }

  const onSubmitCustom = async (data: CreateCustomMedicineFormValues) => {
    await createCustomMutation.mutateAsync(data)
    reset()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-border dark:bg-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Pill className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Add Medicine to Hospital Formulary
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Import from National Drug Master or create 100% custom in-house formulation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b border-slate-200 bg-slate-50/50 px-6 dark:border-border dark:bg-muted/20">
          <button
            type="button"
            onClick={() => setActiveTab("import")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === "import"
                ? "border-primary text-primary"
                : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            1-Click Import from National Master (200,000+ Drugs)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("custom")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === "custom"
                ? "border-primary text-primary"
                : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <PlusCircle className="h-4 w-4" />
            Create Custom / In-House Medicine
          </button>
        </div>

        {/* Content Body */}
        <div className="custom-scrollbar flex-1 overflow-y-auto p-6">
          {activeTab === "import" ? (
            <div className="space-y-4">
              {/* Autocomplete Search Bar */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Search National Master (Brand Name or Salt / Composition)
                </label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={masterSearchQuery}
                    onChange={(e) => {
                      setMasterSearchQuery(e.target.value)
                      setSelectedMaster(null)
                    }}
                    placeholder="Type at least 2 characters (e.g. Paracetamol, Augmentin, Pantocid, Azithromycin)..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-border dark:bg-card dark:text-white"
                  />
                  {isSearchingMaster && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                  )}
                </div>
              </div>

              {/* Master Search Results Dropdown/List */}
              {!selectedMaster && masterSearchQuery.trim().length >= 2 && (
                <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
                  {isSearchingMaster ? (
                    <div className="flex items-center justify-center gap-2.5 p-6 text-sm text-slate-500 dark:text-slate-400">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <span>Searching 200,000+ national medicines...</span>
                    </div>
                  ) : masterResults.length === 0 ? (
                    <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                      No drug found matching "{masterSearchQuery}". You can switch to the{" "}
                      <button
                        type="button"
                        onClick={() => setActiveTab("custom")}
                        className="font-semibold text-primary underline"
                      >
                        Create Custom Medicine
                      </button>{" "}
                      tab!
                    </div>
                  ) : (
                    masterResults.map((med) => (
                      <div
                        key={med.id}
                        onClick={() => handleSelectMaster(med)}
                        className="flex cursor-pointer items-center justify-between border-b border-slate-100 p-3.5 transition-colors hover:bg-slate-50 dark:border-border/50 dark:hover:bg-muted/40"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {med.brand_name}
                            </span>
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-muted dark:text-slate-300">
                              {med.dosage_form || "Tablet"}
                            </span>
                            {med.prescription_type && (
                              <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                {med.prescription_type}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            {med.salt_composition || med.generic_name || "Standard Salt Formulation"}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Mfg: {med.manufacturer || "Generic"}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            ₹{med.mrp || 0}
                          </span>
                          <span className="block text-[11px] text-slate-400">MRP</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Selected Master Preview & Hospital Custom Settings */}
              {selectedMaster && (
                <div className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4 dark:bg-primary/10">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-slate-900 dark:text-white">
                          {selectedMaster.brand_name}
                        </span>
                        <span className="rounded bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">
                          {selectedMaster.dosage_form || "Tablet"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                        <strong>Salt:</strong>{" "}
                        {selectedMaster.salt_composition || selectedMaster.generic_name || "Standard Formulation"}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        <strong>Company:</strong> {selectedMaster.manufacturer || "Standard"} |{" "}
                        <strong>MRP:</strong> ₹{selectedMaster.mrp || 0}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedMaster(null)}
                      className="text-xs font-semibold text-slate-500 underline hover:text-slate-700 dark:text-slate-400"
                    >
                      Change Drug
                    </button>
                  </div>

                  <hr className="border-primary/10" />

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                        Default Purchase Rate (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={importPurchasePrice}
                        onChange={(e) => setImportPurchasePrice(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 dark:border-border dark:bg-card dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                        Hospital Sale Rate (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={importSellingPrice}
                        onChange={(e) => setImportSellingPrice(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 dark:border-border dark:bg-card dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                        Rack / Shelf Location
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Rack A-02"
                        value={importRackLocation}
                        onChange={(e) => setImportRackLocation(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 dark:border-border dark:bg-card dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                        Min Reorder Level
                      </label>
                      <input
                        type="number"
                        value={importMinReorder}
                        onChange={(e) => setImportMinReorder(Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 dark:border-border dark:bg-card dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleConfirmImport}
                      disabled={importMutation.isPending}
                      className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" />
                      {importMutation.isPending ? "Importing..." : "Confirm & Add to Formulary"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Custom Medicine Form */
            <form onSubmit={handleSubmit(onSubmitCustom)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Brand Name */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Medicine / Brand Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register("brand_name")}
                    placeholder="e.g. Apex Cough Relief Syrup"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-border dark:bg-card dark:text-white"
                  />
                  {errors.brand_name && (
                    <p className="mt-1 text-xs text-red-500">{errors.brand_name.message}</p>
                  )}
                </div>

                {/* Generic / Salt Composition */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Salt / Generic Composition
                  </label>
                  <input
                    {...register("generic_name")}
                    placeholder="e.g. Dextromethorphan + CPM + Phenylephrine"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-border dark:bg-card dark:text-white"
                  />
                </div>

                {/* Dosage Form */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Dosage Form / Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register("dosage_form")}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-border dark:bg-card dark:text-white"
                  >
                    {DOSAGE_FORMS.map((form) => (
                      <option key={form} value={form}>
                        {form}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Strength / Pack Unit */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Strength / Formulation
                  </label>
                  <input
                    {...register("strength")}
                    placeholder="e.g. 500mg, 100ml, 2% w/w"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-border dark:bg-card dark:text-white"
                  />
                </div>

                {/* Packaging & Strip/Box Configuration (MARG Standard) */}
                <div className="col-span-1 sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-border dark:bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Packaging & Unit Hierarchy (MARG Standard)
                    </span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                      1 Box = {watchBoxSize} Strips = {watchBoxSize * watchStripSize} {watchBaseUnit}s
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Strip Size (Units/Strip)
                      </label>
                      <input
                        type="number"
                        min="1"
                        {...register("strip_size", { valueAsNumber: true })}
                        placeholder="e.g. 10"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none dark:border-border dark:bg-card dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Box Size (Strips/Box)
                      </label>
                      <input
                        type="number"
                        min="1"
                        {...register("box_size", { valueAsNumber: true })}
                        placeholder="e.g. 1 or 10"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none dark:border-border dark:bg-card dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Base Dispensable Unit
                      </label>
                      <input
                        {...register("base_unit")}
                        placeholder="e.g. Tab, ml, Vial"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none dark:border-border dark:bg-card dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Reorder Count Unit
                      </label>
                      <select
                        {...register("reorder_unit")}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none dark:border-border dark:bg-card dark:text-white"
                      >
                        <option value="unit">Loose Units</option>
                        <option value="strip">Strips</option>
                        <option value="box">Boxes</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Manufacturer / In-house Company */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Manufacturer / Company
                  </label>
                  <input
                    {...register("manufacturer")}
                    placeholder="e.g. In-House Hospital Pharmacy, Cipla, Sun"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-border dark:bg-card dark:text-white"
                  />
                </div>

                {/* Prescription Type */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Prescription Category
                  </label>
                  <select
                    {...register("prescription_type")}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-border dark:bg-card dark:text-white"
                  >
                    <option value="OTC">OTC (Over The Counter)</option>
                    <option value="SCHEDULE_H">Schedule H (Standard Rx)</option>
                    <option value="SCHEDULE_H1">Schedule H1 (Restricted Antibiotics)</option>
                    <option value="NARCOTIC">Narcotic / Controlled Substance</option>
                  </select>
                </div>
              </div>

              {/* Price & Taxation Section */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-border dark:bg-muted/20">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Price & GST Configuration
                  </span>
                  {marginPercent > 0 && (
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      Estimated Margin: +{marginPercent}%
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                      Purchase Rate (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      {...register("default_purchase_price", { valueAsNumber: true })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 dark:border-border dark:bg-card dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                      Maximum Retail Price (MRP)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      {...register("mrp", { valueAsNumber: true })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 dark:border-border dark:bg-card dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                      Selling Price (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      {...register("default_selling_price", { valueAsNumber: true })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 dark:border-border dark:bg-card dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                      GST Rate (%)
                    </label>
                    <select
                      {...register("gst_rate", { valueAsNumber: true })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 dark:border-border dark:bg-card dark:text-white"
                    >
                      {GST_SLABS.map((rate) => (
                        <option key={rate} value={rate}>
                          {rate}% GST
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Inventory Storage & Reorder */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Rack / Shelf Location
                  </label>
                  <input
                    {...register("rack_location")}
                    placeholder="e.g. Shelf B-04, Refrigerator-1"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-border dark:bg-card dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Min Reorder Safety Level
                  </label>
                  <input
                    type="number"
                    {...register("min_reorder_level", { valueAsNumber: true })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-border dark:bg-card dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    HSN Code
                  </label>
                  <input
                    {...register("hsn_code")}
                    defaultValue="3004"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-border dark:bg-card dark:text-white"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-border dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createCustomMutation.isPending}
                  className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  {createCustomMutation.isPending ? "Creating..." : "Save Custom Medicine"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
