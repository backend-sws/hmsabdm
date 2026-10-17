import React, { useState } from "react"
import { createPortal } from "react-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Tag,
  Plus,
  Trash2,
  Search,
  Sparkles,
  Clock,
  Percent,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { insuranceService } from "@/services/insuranceService"
import type { InsurancePayer } from "@/types/insurance"

interface Props {
  payer: InsurancePayer
  onClose: () => void
}

const CATEGORIES = [
  { value: "surgery", label: "Surgery" },
  { value: "procedure", label: "Procedure" },
  { value: "consultation", label: "Consultation" },
  { value: "room", label: "Room & Nursing" },
  { value: "icu", label: "ICU / CCU" },
  { value: "lab", label: "Pathology / Lab" },
  { value: "pharmacy", label: "Pharmacy" },
  { value: "implant", label: "Implant / Device" },
  { value: "other", label: "Other" },
]

// Common Indian Healthcare / PMJAY / CGHS package templates for quick seeding
const STANDARD_PACKAGES_TEMPLATES = [
  {
    procedure_name: "Laparoscopic Cholecystectomy",
    category: "surgery",
    hbp_code: "SG001A",
    cghs_code: "CGHS-SURG-102",
    approved_rate: 65000,
    max_los_days: 3,
    room_rent_cap_per_day: 3000,
    icu_cap_per_day: 6500,
    requires_prior_approval: true,
  },
  {
    procedure_name: "Laparoscopic Appendectomy",
    category: "surgery",
    hbp_code: "SG002B",
    cghs_code: "CGHS-SURG-105",
    approved_rate: 55000,
    max_los_days: 2,
    room_rent_cap_per_day: 3000,
    icu_cap_per_day: 6000,
    requires_prior_approval: true,
  },
  {
    procedure_name: "Caesarean Section (LSCS) with Neo-natal Care",
    category: "surgery",
    hbp_code: "OB003C",
    cghs_code: "CGHS-OBS-015",
    approved_rate: 48000,
    max_los_days: 4,
    room_rent_cap_per_day: 2500,
    icu_cap_per_day: 5000,
    requires_prior_approval: true,
  },
  {
    procedure_name: "Normal Vaginal Delivery (Single)",
    category: "procedure",
    hbp_code: "OB001A",
    cghs_code: "CGHS-OBS-001",
    approved_rate: 22000,
    max_los_days: 2,
    room_rent_cap_per_day: 2000,
    icu_cap_per_day: 4000,
    requires_prior_approval: false,
  },
  {
    procedure_name: "Phacoemulsification with Foldable Hydrophobic IOL (Cataract)",
    category: "surgery",
    hbp_code: "OP005A",
    cghs_code: "CGHS-OPH-044",
    approved_rate: 26000,
    max_los_days: 1,
    room_rent_cap_per_day: 2000,
    icu_cap_per_day: 4000,
    requires_prior_approval: true,
  },
  {
    procedure_name: "Total Knee Replacement (TKR Unilateral with Implant)",
    category: "surgery",
    hbp_code: "OR012A",
    cghs_code: "CGHS-ORTH-201",
    approved_rate: 185000,
    max_los_days: 5,
    room_rent_cap_per_day: 4000,
    icu_cap_per_day: 8500,
    requires_prior_approval: true,
  },
  {
    procedure_name: "Percutaneous Transluminal Coronary Angioplasty (PTCA 1 Stent)",
    category: "surgery",
    hbp_code: "CT008B",
    cghs_code: "CGHS-CARD-110",
    approved_rate: 145000,
    max_los_days: 3,
    room_rent_cap_per_day: 4500,
    icu_cap_per_day: 10000,
    requires_prior_approval: true,
  },
  {
    procedure_name: "Hemodialysis Session (Single)",
    category: "procedure",
    hbp_code: "NE001A",
    cghs_code: "CGHS-NEPH-002",
    approved_rate: 2200,
    max_los_days: 1,
    room_rent_cap_per_day: 1500,
    icu_cap_per_day: 3500,
    requires_prior_approval: false,
  },
]

export const InsuranceTariffModal: React.FC<Props> = ({ payer, onClose }) => {
  const qc = useQueryClient()
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [showAddForm, setShowAddForm] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    procedure_name: "",
    category: "surgery",
    hbp_code: "",
    cghs_code: "",
    approved_rate: "",
    max_los_days: "3",
    room_rent_cap_per_day: "",
    icu_cap_per_day: "",
    requires_prior_approval: true,
  })

  // Tariffs Query
  const { data: tariffs = [], isLoading, refetch } = useQuery({
    queryKey: ["insurance", "tariffs", payer?.id],
    queryFn: () => (payer ? insuranceService.getPayerTariffs(payer.id) : Promise.resolve([])),
    enabled: !!payer,
  })

  // Save Tariff Mutation
  const saveMutation = useMutation({
    mutationFn: (payload: any) => insuranceService.saveTariffPackage(payer.id, payload),
    onSuccess: () => {
      toast.success("Tariff package saved successfully")
      setShowAddForm(false)
      setFormData({
        procedure_name: "",
        category: "surgery",
        hbp_code: "",
        cghs_code: "",
        approved_rate: "",
        max_los_days: "3",
        room_rent_cap_per_day: "",
        icu_cap_per_day: "",
        requires_prior_approval: true,
      })
      refetch()
      qc.invalidateQueries({ queryKey: ["insurance", "tariffs", payer?.id] })
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to save tariff package")
    },
  })

  // Delete Tariff Mutation
  const deleteMutation = useMutation({
    mutationFn: (tariffId: number) => insuranceService.deleteTariffPackage(payer.id, tariffId),
    onSuccess: () => {
      toast.success("Tariff package deleted")
      refetch()
      qc.invalidateQueries({ queryKey: ["insurance", "tariffs", payer?.id] })
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete tariff package")
    },
  })

  // Bulk Seed Mutation
  const [seeding, setSeeding] = useState(false)
  const handleSeedStandardPackages = async () => {
    if (!payer) return
    setSeeding(true)
    try {
      let added = 0
      for (const pkg of STANDARD_PACKAGES_TEMPLATES) {
        // Only add if not already present
        const exists = tariffs.some(
          (t: any) => t.procedure_name.toLowerCase() === pkg.procedure_name.toLowerCase()
        )
        if (!exists) {
          await insuranceService.saveTariffPackage(payer.id, pkg)
          added++
        }
      }
      toast.success(`Loaded ${added} standard package tariffs for ${payer.name}`)
      refetch()
    } catch (err: any) {
      toast.error("Error loading standard packages: " + (err?.message || "Unknown error"))
    } finally {
      setSeeding(false)
    }
  }

  if (!payer) return null

  // Filtered List
  const filteredTariffs = tariffs.filter((t: any) => {
    const matchesCat = categoryFilter === "all" || t.category === categoryFilter
    const matchesSearch =
      !search ||
      t.procedure_name?.toLowerCase().includes(search.toLowerCase()) ||
      t.hbp_code?.toLowerCase().includes(search.toLowerCase()) ||
      t.cghs_code?.toLowerCase().includes(search.toLowerCase())
    return matchesCat && matchesSearch
  })

  return createPortal(
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col border border-border overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-lg">{payer.name}</h2>
                <Badge variant="secondary" className="capitalize text-xs font-semibold">
                  {payer.payer_type}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
                <span>Code: <strong>{payer.short_code || "—"}</strong></span>
                <span>•</span>
                <span>Empanelment: <strong>{payer.empanelment_number || "—"}</strong></span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> TAT: <strong>{payer.preauth_tat_hours || 4}h</strong>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Percent className="h-3 w-3" /> Co-pay: <strong>{payer.default_copay_percent || 0}%</strong>
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-muted text-muted-foreground transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Action Bar */}
        <div className="p-4 border-b border-border bg-card flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-64">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="pl-9 h-9 text-xs"
                placeholder="Search procedures, HBP code, CGHS code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9 w-36 text-xs">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            {tariffs.length === 0 && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-300"
                onClick={handleSeedStandardPackages}
                disabled={seeding}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5 text-purple-500" />
                {seeding ? "Loading..." : "Load Standard Packages"}
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => setShowAddForm(!showAddForm)}
              className="text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              {showAddForm ? "Close Form" : "Add Tariff Package"}
            </Button>
          </div>
        </div>

        {/* Collapsible Add Form */}
        {showAddForm && (
          <div className="p-4 bg-muted/40 border-b border-border animate-in slide-in-from-top-2 duration-150">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5 text-primary" /> New Negotiated Tariff Package
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Procedure / Package Name *</Label>
                <Input
                  className="h-8 text-xs"
                  placeholder="e.g. Laparoscopic Appendectomy"
                  value={formData.procedure_name}
                  onChange={(e) => setFormData((d) => ({ ...d, procedure_name: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData((d) => ({ ...d, category: v }))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Negotiated Rate (₹) *</Label>
                <Input
                  type="number"
                  className="h-8 text-xs"
                  placeholder="55000"
                  value={formData.approved_rate}
                  onChange={(e) => setFormData((d) => ({ ...d, approved_rate: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">HBP / PMJAY Code</Label>
                <Input
                  className="h-8 text-xs"
                  placeholder="e.g. SG002B"
                  value={formData.hbp_code}
                  onChange={(e) => setFormData((d) => ({ ...d, hbp_code: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">CGHS Code</Label>
                <Input
                  className="h-8 text-xs"
                  placeholder="e.g. CGHS-105"
                  value={formData.cghs_code}
                  onChange={(e) => setFormData((d) => ({ ...d, cghs_code: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Max LOS (Days)</Label>
                <Input
                  type="number"
                  className="h-8 text-xs"
                  placeholder="3"
                  value={formData.max_los_days}
                  onChange={(e) => setFormData((d) => ({ ...d, max_los_days: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Room Rent Cap/Day (₹)</Label>
                <Input
                  type="number"
                  className="h-8 text-xs"
                  placeholder="3000"
                  value={formData.room_rent_cap_per_day}
                  onChange={(e) => setFormData((d) => ({ ...d, room_rent_cap_per_day: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">ICU Cap/Day (₹)</Label>
                <Input
                  type="number"
                  className="h-8 text-xs"
                  placeholder="6000"
                  value={formData.icu_cap_per_day}
                  onChange={(e) => setFormData((d) => ({ ...d, icu_cap_per_day: e.target.value }))}
                />
              </div>

              <div className="sm:col-span-2 flex items-center gap-2 pt-4">
                <input
                  type="checkbox"
                  id="prior_approval"
                  checked={formData.requires_prior_approval}
                  onChange={(e) =>
                    setFormData((d) => ({ ...d, requires_prior_approval: e.target.checked }))
                  }
                  className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                />
                <label htmlFor="prior_approval" className="text-xs font-medium cursor-pointer">
                  Requires Prior Approval (Pre-Authorization required before surgery)
                </label>
              </div>

              <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs bg-primary"
                  disabled={!formData.procedure_name || !formData.approved_rate || saveMutation.isPending}
                  onClick={() =>
                    saveMutation.mutate({
                      ...formData,
                      approved_rate: Number(formData.approved_rate),
                      max_los_days: Number(formData.max_los_days || 1),
                      room_rent_cap_per_day: formData.room_rent_cap_per_day
                        ? Number(formData.room_rent_cap_per_day)
                        : null,
                      icu_cap_per_day: formData.icu_cap_per_day
                        ? Number(formData.icu_cap_per_day)
                        : null,
                    })
                  }
                >
                  {saveMutation.isPending ? "Saving..." : "Save Package"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tariffs Table */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading && (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-muted/40 rounded-lg animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading && filteredTariffs.length === 0 && (
            <div className="text-center py-12 border border-dashed rounded-xl border-border/80">
              <Tag className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
              <h4 className="font-semibold text-sm">No tariff packages found</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                No negotiated tariff packages are currently registered for {payer.name}.
                Click below to auto-load common standard packages or add one manually.
              </p>
              <div className="flex justify-center gap-2">
                <Button
                  size="sm"
                  className="text-xs"
                  onClick={handleSeedStandardPackages}
                  disabled={seeding}
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                  {seeding ? "Loading..." : "Load Standard Packages"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => setShowAddForm(true)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Custom
                </Button>
              </div>
            </div>
          )}

          {!isLoading && filteredTariffs.length > 0 && (
            <div className="border rounded-xl border-border overflow-hidden bg-card">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-muted-foreground font-medium">
                    <th className="py-2.5 px-3">Procedure / Package</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Code (HBP/CGHS)</th>
                    <th className="py-2.5 px-3 text-right">Negotiated Rate</th>
                    <th className="py-2.5 px-3 text-center">Max LOS</th>
                    <th className="py-2.5 px-3">Room / ICU Cap</th>
                    <th className="py-2.5 px-3 text-center">Pre-Auth</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredTariffs.map((t: any) => (
                    <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-foreground">
                        {t.procedure_name}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant="outline" className="capitalize text-[10px] font-semibold">
                          {t.category}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">
                        {t.hbp_code || t.cghs_code || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{Number(t.approved_rate).toLocaleString("en-IN")}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="bg-muted px-2 py-0.5 rounded font-medium text-[11px]">
                          {t.max_los_days ? `${t.max_los_days} d` : "—"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground text-[11px]">
                        <div>Room: {t.room_rent_cap_per_day ? `₹${Number(t.room_rent_cap_per_day).toLocaleString("en-IN")}/d` : "No Cap"}</div>
                        {t.icu_cap_per_day && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400">
                            ICU: ₹{Number(t.icu_cap_per_day).toLocaleString("en-IN")}/d
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {t.requires_prior_approval ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-semibold bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded border border-amber-200">
                            Required
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                            No
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          title="Delete Tariff Package"
                          onClick={() => {
                            if (window.confirm(`Delete tariff "${t.procedure_name}"?`)) {
                              deleteMutation.mutate(t.id)
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-3 bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
          <span>Total packages: <strong>{filteredTariffs.length}</strong></span>
          <Button size="sm" variant="outline" onClick={onClose} className="h-8 text-xs">
            Done
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
