import React, { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Search,
  Save,
  Percent,
  Sparkles,
  Layers,
  Building2,
  RefreshCw,
  FileSpreadsheet,
} from "lucide-react"

import { labService } from "@/services/labService"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { EmptyState } from "@/components/common/EmptyState"
import type { LabRateListMatrixItem } from "@/types/lab"

export const LabRateListMatrixTab: React.FC = () => {
  const qc = useQueryClient()

  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedFulfillment, setSelectedFulfillment] = useState("all")

  // Local edits map: key = test id, value = edited fields
  const [pendingEdits, setPendingEdits] = useState<Record<number, Partial<LabRateListMatrixItem>>>({})

  // Bulk % Adjustment modal state
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [bulkField, setBulkField] = useState<"standard_price" | "b2b_cost" | "reagent_cost">("standard_price")
  const [bulkPercentage, setBulkPercentage] = useState<number>(10)
  const [bulkCategory, setBulkCategory] = useState<string>("all")
  const [bulkRoundTo, setBulkRoundTo] = useState<number>(5)

  // Make vs Buy modal
  const [isMakeVsBuyOpen, setIsMakeVsBuyOpen] = useState(false)

  // 1. Fetch Rate List Matrix
  const {
    data: rateData,
    isLoading: isRateLoading,
    refetch: refetchRates,
    isRefetching,
  } = useQuery({
    queryKey: ["lab", "rate-list", selectedCategory, selectedFulfillment],
    queryFn: () =>
      labService.getRateList({
        category: selectedCategory !== "all" ? selectedCategory : undefined,
        fulfillment_type: selectedFulfillment !== "all" ? selectedFulfillment : undefined,
      }),
  })

  // 2. Fetch Vendors for dropdown
  const { data: vendors = [] } = useQuery({
    queryKey: ["lab", "outsource", "vendors"],
    queryFn: labService.getVendors,
  })

  // 3. Fetch Profitability & ROI Advisor
  const { data: profitStats } = useQuery({
    queryKey: ["lab", "analytics", "profitability"],
    queryFn: labService.getProfitabilityAnalytics,
  })

  const testsList: LabRateListMatrixItem[] = rateData?.tests || []

  // Filtered by search
  const filteredTests = useMemo(() => {
    if (!searchQuery.trim()) return testsList
    const q = searchQuery.toLowerCase()
    return testsList.filter(
      (t) =>
        t.test_name.toLowerCase().includes(q) ||
        t.test_code.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
    )
  }, [testsList, searchQuery])

  // Bulk Save Mutation
  const bulkSaveMutation = useMutation({
    mutationFn: (items: any[]) => labService.bulkUpdateRateList(items),
    onSuccess: (res) => {
      toast.success(res?.message || "Rates updated successfully!")
      setPendingEdits({})
      qc.invalidateQueries({ queryKey: ["lab", "rate-list"] })
      qc.invalidateQueries({ queryKey: ["lab", "templates"] })
      qc.invalidateQueries({ queryKey: ["lab", "analytics"] })
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update rates")
    },
  })

  // Bulk Percentage Adjustment Mutation
  const applyPercentageMutation = useMutation({
    mutationFn: labService.applyPercentage,
    onSuccess: (res) => {
      toast.success(res?.message || "Percentage adjustment applied!")
      setIsBulkModalOpen(false)
      qc.invalidateQueries({ queryKey: ["lab", "rate-list"] })
      qc.invalidateQueries({ queryKey: ["lab", "templates"] })
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to apply percentage adjustment")
    },
  })

  const handleCellChange = (id: number, field: keyof LabRateListMatrixItem, value: any) => {
    setPendingEdits((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [field]: value,
      },
    }))
  }

  const handleSaveAll = () => {
    const editKeys = Object.keys(pendingEdits)
    if (!editKeys.length) {
      toast.info("No modifications to save")
      return
    }
    const payload = editKeys.map((idStr) => {
      const id = Number(idStr)
      return {
        id,
        ...pendingEdits[id],
      }
    })
    bulkSaveMutation.mutate(payload)
  }

  // Export to CSV
  const handleExportCsv = () => {
    if (!testsList.length) return
    const headers = [
      "Test Code",
      "Test Name",
      "Department",
      "Fulfillment Mode",
      "Reference Lab",
      "Patient Price (MRP)",
      "Outsource B2B Cost",
      "In-House Reagent Cost",
      "Estimated Profit (INR)",
      "Margin (%)",
      "TAT (Hours)",
    ]

    const rows = testsList.map((t) => [
      t.test_code,
      `"${t.test_name.replace(/"/g, '""')}"`,
      t.category,
      t.fulfillment_type,
      `"${t.default_vendor_name || "N/A"}"`,
      t.standard_price,
      t.b2b_cost,
      t.reagent_cost,
      t.gross_profit,
      `${t.margin_percentage}%`,
      t.tat_hours,
    ])

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `Hospital_Lab_Rate_Matrix_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("Rate list exported to CSV")
  }

  // Calculate overall metrics
  const avgMargin = useMemo(() => {
    if (!testsList.length) return 0
    const sum = testsList.reduce((acc, t) => acc + (t.margin_percentage || 0), 0)
    return Math.round(sum / testsList.length)
  }, [testsList])

  const outsourceCount = useMemo(() => {
    return testsList.filter((t) => t.fulfillment_type === "outsourced").length
  }, [testsList])

  const editedCount = Object.keys(pendingEdits).length

  return (
    <div className="space-y-4">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Catalog Diagnostic Tests</span>
            <Layers className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground mt-1">{testsList.length}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Active pre-seeded pathology tests
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Average Gross Margin</span>
            <Percent className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {avgMargin}%
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Across in-house & reference labs
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Outsourced Investigations</span>
            <Building2 className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {outsourceCount}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Specialized tests sent to partner labs
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Analyzer ROI Advisor</span>
            <Sparkles className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-1.5 flex items-center justify-between">
            <span>High Volume Detected</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMakeVsBuyOpen(true)}
              className="h-6 text-[10px] px-2 font-bold border-indigo-500/30 text-indigo-600 hover:bg-indigo-500/10"
            >
              View Advice
            </Button>
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Make vs Buy Analyzer leasing recommendations
          </div>
        </div>
      </div>

      {/* Filter & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-2xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search test name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs rounded-lg border border-input bg-background px-3 py-1.5 text-foreground focus:outline-hidden h-8"
          >
            <option value="all">All Departments</option>
            <option value="Biochemistry">Biochemistry</option>
            <option value="Haematology">Haematology</option>
            <option value="Clinical Pathology">Clinical Pathology</option>
            <option value="Serology & Immunology">Serology & Immunology</option>
            <option value="Microbiology">Microbiology</option>
            <option value="Hormones">Hormones</option>
            <option value="Vitamins">Vitamins</option>
            <option value="Molecular Diagnostics">Molecular Diagnostics</option>
            <option value="Histopathology">Histopathology</option>
          </select>

          <select
            value={selectedFulfillment}
            onChange={(e) => setSelectedFulfillment(e.target.value)}
            className="text-xs rounded-lg border border-input bg-background px-3 py-1.5 text-foreground focus:outline-hidden h-8"
          >
            <option value="all">All Fulfillment</option>
            <option value="in_house">In-House Only</option>
            <option value="outsourced">Outsourced to Partner Lab</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {editedCount > 0 && (
            <Button
              size="sm"
              onClick={handleSaveAll}
              disabled={bulkSaveMutation.isPending}
              className="h-8 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse"
            >
              <Save className="h-3.5 w-3.5" />
              Save {editedCount} Changes
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsBulkModalOpen(true)}
            className="h-8 text-xs font-semibold gap-1.5"
          >
            <Percent className="h-3.5 w-3.5" />
            Bulk Adjust %
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="h-8 text-xs font-semibold gap-1.5"
            title="Download full rate card in Excel CSV"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            Export CSV
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetchRates()}
            className="h-8 text-xs px-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Spreadsheet Table Grid */}
      {isRateLoading ? (
        <div className="py-20 text-center">
          <LoadingSpinner label="Loading 281+ tests pricing spreadsheet..." />
        </div>
      ) : filteredTests.length === 0 ? (
        <EmptyState
          title="No Tests Match Selected Filters"
          description="Try changing the department or fulfillment filter."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-2xs max-h-[650px] overflow-y-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-muted/80 text-muted-foreground font-semibold border-b border-border sticky top-0 z-10 backdrop-blur-xs">
              <tr>
                <th className="p-3">Test Code</th>
                <th className="p-3">Test Name & Department</th>
                <th className="p-3">Fulfillment Mode</th>
                <th className="p-3">Reference Lab Partner</th>
                <th className="p-3 w-32">Patient MRP (₹)</th>
                <th className="p-3 w-32">Outsource B2B (₹)</th>
                <th className="p-3 w-32">In-House Cost (₹)</th>
                <th className="p-3 text-right">Gross Profit (₹)</th>
                <th className="p-3 text-center">Margin %</th>
                <th className="p-3 text-center">TAT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTests.map((test) => {
                const edits = pendingEdits[test.id] || {}
                const currentMRP = edits.standard_price !== undefined ? Number(edits.standard_price) : test.standard_price
                const currentB2B = edits.b2b_cost !== undefined ? Number(edits.b2b_cost) : test.b2b_cost
                const currentReagent = edits.reagent_cost !== undefined ? Number(edits.reagent_cost) : test.reagent_cost
                const currentFulfillment = edits.fulfillment_type || test.fulfillment_type
                const currentVendorId = edits.default_vendor_id !== undefined ? edits.default_vendor_id : test.default_vendor_id

                const isOutsource = currentFulfillment === "outsourced"
                const effectiveCost = isOutsource ? currentB2B : currentReagent
                const profit = Math.max(0, currentMRP - effectiveCost)
                const marginPercent = currentMRP > 0 ? Math.round((profit / currentMRP) * 100) : 0
                const isDirty = Boolean(pendingEdits[test.id])

                return (
                  <tr
                    key={test.id}
                    className={`hover:bg-muted/40 transition-colors ${
                      isDirty ? "bg-amber-500/10 font-medium" : ""
                    }`}
                  >
                    {/* Code */}
                    <td className="p-3">
                      <span className="font-mono font-bold text-foreground bg-muted px-2 py-0.5 rounded text-[11px]">
                        {test.test_code}
                      </span>
                    </td>

                    {/* Name & Dept */}
                    <td className="p-3">
                      <div className="font-bold text-foreground">{test.test_name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {test.category} · {test.sample_type || "Serum"}
                      </div>
                    </td>

                    {/* Fulfillment */}
                    <td className="p-3">
                      <select
                        value={currentFulfillment}
                        onChange={(e) =>
                          handleCellChange(test.id, "fulfillment_type", e.target.value as any)
                        }
                        className={`text-xs rounded border px-2 py-1 focus:outline-hidden font-semibold ${
                          currentFulfillment === "outsourced"
                            ? "bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300"
                            : "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                        }`}
                      >
                        <option value="in_house">In-House Lab</option>
                        <option value="outsourced">Outsource to Lab</option>
                        <option value="hybrid">Hybrid (Both)</option>
                      </select>
                    </td>

                    {/* Vendor */}
                    <td className="p-3">
                      {isOutsource ? (
                        <select
                          value={currentVendorId || ""}
                          onChange={(e) =>
                            handleCellChange(
                              test.id,
                              "default_vendor_id",
                              e.target.value ? Number(e.target.value) : null
                            )
                          }
                          className="text-xs rounded border border-input bg-background px-2 py-1 text-foreground focus:outline-hidden max-w-[150px]"
                        >
                          <option value="">-- Choose Vendor --</option>
                          {vendors.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">In-House Analyzer</span>
                      )}
                    </td>

                    {/* Patient Price MRP (Editable) */}
                    <td className="p-3">
                      <div className="relative">
                        <span className="absolute left-2 top-1.5 text-muted-foreground font-semibold text-xs">
                          ₹
                        </span>
                        <input
                          type="number"
                          step="1"
                          value={currentMRP}
                          onChange={(e) =>
                            handleCellChange(test.id, "standard_price", Number(e.target.value))
                          }
                          className="w-full text-xs font-mono font-bold rounded-lg border border-input bg-background pl-5 pr-2 py-1 text-foreground focus:ring-1 focus:ring-primary focus:outline-hidden"
                        />
                      </div>
                    </td>

                    {/* Outsource B2B Cost (Editable) */}
                    <td className="p-3">
                      <div className="relative">
                        <span className="absolute left-2 top-1.5 text-muted-foreground font-semibold text-xs">
                          ₹
                        </span>
                        <input
                          type="number"
                          step="1"
                          disabled={!isOutsource}
                          value={currentB2B}
                          onChange={(e) =>
                            handleCellChange(test.id, "b2b_cost", Number(e.target.value))
                          }
                          className={`w-full text-xs font-mono font-bold rounded-lg border border-input pl-5 pr-2 py-1 focus:ring-1 focus:ring-primary focus:outline-hidden ${
                            isOutsource
                              ? "bg-amber-500/5 text-amber-700 dark:text-amber-300 border-amber-500/30"
                              : "bg-muted text-muted-foreground opacity-50"
                          }`}
                        />
                      </div>
                    </td>

                    {/* In-House Reagent Cost (Editable) */}
                    <td className="p-3">
                      <div className="relative">
                        <span className="absolute left-2 top-1.5 text-muted-foreground font-semibold text-xs">
                          ₹
                        </span>
                        <input
                          type="number"
                          step="1"
                          disabled={isOutsource}
                          value={currentReagent}
                          onChange={(e) =>
                            handleCellChange(test.id, "reagent_cost", Number(e.target.value))
                          }
                          className={`w-full text-xs font-mono font-bold rounded-lg border border-input pl-5 pr-2 py-1 focus:ring-1 focus:ring-primary focus:outline-hidden ${
                            !isOutsource
                              ? "bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                              : "bg-muted text-muted-foreground opacity-50"
                          }`}
                        />
                      </div>
                    </td>

                    {/* Gross Profit */}
                    <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ₹{profit}
                    </td>

                    {/* Margin % Badge */}
                    <td className="p-3 text-center">
                      <Badge
                        className={`font-black text-[10px] ${
                          marginPercent >= 65
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                            : marginPercent >= 35
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                            : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                        }`}
                      >
                        {marginPercent}%
                      </Badge>
                    </td>

                    {/* TAT */}
                    <td className="p-3 text-center text-muted-foreground font-mono">
                      {test.tat_hours}h
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: BULK PERCENTAGE MODIFIER
         ───────────────────────────────────────────────────────────── */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Bulk Percentage Price Modifier</h3>
                <p className="text-xs text-muted-foreground">
                  Apply quick % markups or discounts across categories or cost columns.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Target Field to Adjust</label>
                <select
                  value={bulkField}
                  onChange={(e) => setBulkField(e.target.value as any)}
                  className="w-full text-xs rounded-lg border border-input bg-background p-2.5 font-medium text-foreground focus:outline-hidden"
                >
                  <option value="standard_price">Patient Price / MRP (+/- %)</option>
                  <option value="b2b_cost">Outsource B2B Cost (+/- %)</option>
                  <option value="reagent_cost">In-House Reagent Cost (+/- %)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Percentage Change (%)</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.5"
                    value={bulkPercentage}
                    onChange={(e) => setBulkPercentage(Number(e.target.value))}
                    className="text-xs font-mono font-bold"
                  />
                  <div className="flex gap-1">
                    {[5, 10, 15, 20].map((pct) => (
                      <Button
                        key={pct}
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setBulkPercentage(pct)}
                        className="h-8 text-xs px-2"
                      >
                        +{pct}%
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Target Department</label>
                <select
                  value={bulkCategory}
                  onChange={(e) => setBulkCategory(e.target.value)}
                  className="w-full text-xs rounded-lg border border-input bg-background p-2.5 font-medium text-foreground focus:outline-hidden"
                >
                  <option value="all">All Departments (Entire Catalog)</option>
                  <option value="Biochemistry">Biochemistry</option>
                  <option value="Haematology">Haematology</option>
                  <option value="Clinical Pathology">Clinical Pathology</option>
                  <option value="Serology & Immunology">Serology & Immunology</option>
                  <option value="Microbiology">Microbiology</option>
                  <option value="Hormones">Hormones</option>
                  <option value="Vitamins">Vitamins</option>
                  <option value="Molecular Diagnostics">Molecular Diagnostics</option>
                  <option value="Histopathology">Histopathology</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Rounding Rule</label>
                <select
                  value={bulkRoundTo}
                  onChange={(e) => setBulkRoundTo(Number(e.target.value))}
                  className="w-full text-xs rounded-lg border border-input bg-background p-2.5 font-medium text-foreground focus:outline-hidden"
                >
                  <option value={1}>Exact decimals (No rounding)</option>
                  <option value={5}>Round to nearest ₹5 (e.g. ₹85, ₹125)</option>
                  <option value={10}>Round to nearest ₹10 (e.g. ₹90, ₹130)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBulkModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={applyPercentageMutation.isPending}
                  onClick={() =>
                    applyPercentageMutation.mutate({
                      field: bulkField,
                      percentage: bulkPercentage,
                      category: bulkCategory,
                      round_to: bulkRoundTo,
                    })
                  }
                  className="font-bold bg-primary text-primary-foreground"
                >
                  {applyPercentageMutation.isPending ? "Applying..." : "Apply Adjustment"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: MAKE VS BUY ANALYZER ROI ADVISOR
         ───────────────────────────────────────────────────────────── */}
      {isMakeVsBuyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-card border border-border p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-500" />
                  Make vs Buy: Diagnostic Analyzer ROI Advisor
                </h3>
                <p className="text-xs text-muted-foreground">
                  Intelligent volume analysis to evaluate leasing benchtop analyzers vs continuing reference lab outsource.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMakeVsBuyOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3.5 text-xs text-indigo-900 dark:text-indigo-300 space-y-1">
                <strong>How this works:</strong> When monthly outsourced volume for a test (e.g., Thyroid or Vitamin D) crosses 50 samples, leasing an automated benchtop chemiluminescence analyzer (CLIA) reduces per-test cost from ~₹250 B2B down to ~₹45 reagent cost!
              </div>

              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-muted text-muted-foreground font-semibold border-b border-border">
                    <tr>
                      <th className="p-2.5">Outsourced Test</th>
                      <th className="p-2.5 text-center">Billed Volume</th>
                      <th className="p-2.5">Current Outsource Payout</th>
                      <th className="p-2.5">Est. In-House Cost</th>
                      <th className="p-2.5 text-emerald-600 font-bold">Potential Savings</th>
                      <th className="p-2.5">Strategic Recommendation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {profitStats?.make_vs_buy_advisor?.length ? (
                      profitStats.make_vs_buy_advisor.map((adv) => (
                        <tr key={adv.test_code} className="hover:bg-muted/30">
                          <td className="p-2.5 font-bold text-foreground">
                            {adv.test_name} ({adv.test_code})
                          </td>
                          <td className="p-2.5 text-center font-bold">{adv.count}</td>
                          <td className="p-2.5 font-mono text-amber-600">₹{adv.monthly_outsource_cost}</td>
                          <td className="p-2.5 font-mono text-blue-600">₹{adv.estimated_inhouse_cost}</td>
                          <td className="p-2.5 font-mono font-bold text-emerald-600">
                            +₹{adv.potential_monthly_savings}/mo
                          </td>
                          <td className="p-2.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                            {adv.recommendation}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-muted-foreground">
                          As more outsourced patient tests are billed, automated leasing ROI will calculate here!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  size="sm"
                  onClick={() => setIsMakeVsBuyOpen(false)}
                  className="font-bold text-xs"
                >
                  Close Advisor
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
