import React, { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Send,
  Download,
  Building2,
  CheckCircle2,
  Printer,
  Plus,
  TrendingUp,
  Truck,
  ThermometerSnowflake,
  ShieldCheck,
} from "lucide-react"

import { labService } from "@/services/labService"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { EmptyState } from "@/components/common/EmptyState"
import type {
  LabExternalVendor,
  LabOutsourceManifest,
} from "@/types/lab"

export const OutsourceManagementTab: React.FC = () => {
  const qc = useQueryClient()
  const [activeSubTab, setActiveSubTab] = useState<"pending" | "manifests" | "intake" | "vendors" | "reconciliation">("pending")

  // Selected items for creating manifest
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([])
  const [selectedVendorId, setSelectedVendorId] = useState<string>("")
  const [temperatureCondition, setTemperatureCondition] = useState<string>("cold_chain")
  const [courierName, setCourierName] = useState<string>("")
  const [courierPhone, setCourierPhone] = useState<string>("")
  const [courierTrackingNo, setCourierTrackingNo] = useState<string>("")
  const [dispatchNotes, setDispatchNotes] = useState<string>("")
  const [isManifestModalOpen, setIsManifestModalOpen] = useState(false)

  // Intake / Receive sample state
  const [intakeSearchBarcode, setIntakeSearchBarcode] = useState("")
  const [externalAccessionNo, setExternalAccessionNo] = useState("")
  const [externalReportFile, setExternalReportFile] = useState("")
  const [technicianRemarks, setTechnicianRemarks] = useState("")

  // New Vendor modal
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false)
  const [newVendor, setNewVendor] = useState<Partial<LabExternalVendor>>({
    vendor_code: "",
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    pickup_schedule: "",
    default_courier: "",
    account_number: "",
    is_active: true,
  })

  // Reconciliation selected month
  const [reconMonth, setReconMonth] = useState<string>(new Date().toISOString().slice(0, 7))

  // 1. Fetch Vendors
  const { data: vendors = [] } = useQuery({
    queryKey: ["lab", "outsource", "vendors"],
    queryFn: labService.getVendors,
  })

  // 2. Fetch Pending Dispatch Items
  const { data: pendingItems = [], isLoading: pendingLoading, refetch: refetchPending } = useQuery({
    queryKey: ["lab", "outsource", "pending"],
    queryFn: labService.getPendingDispatch,
    refetchInterval: 15_000,
  })

  // 3. Fetch Manifests List
  const { data: manifestsRaw, isLoading: manifestsLoading } = useQuery({
    queryKey: ["lab", "outsource", "manifests"],
    queryFn: () => labService.getManifests({ per_page: 50 }),
  })

  const manifestsList: LabOutsourceManifest[] = Array.isArray(manifestsRaw)
    ? manifestsRaw
    : manifestsRaw?.data || []

  // 4. Fetch Reconciliation Report
  const { data: reconData, isLoading: reconLoading } = useQuery({
    queryKey: ["lab", "outsource", "reconciliation", reconMonth],
    queryFn: () => labService.getReconciliation(reconMonth),
  })

  // Create Manifest Mutation
  const createManifestMutation = useMutation({
    mutationFn: labService.createManifest,
    onSuccess: (res) => {
      toast.success(`Manifest ${res.manifest_number} created with ${res.total_samples} samples!`)
      setIsManifestModalOpen(false)
      setSelectedItemIds([])
      qc.invalidateQueries({ queryKey: ["lab", "outsource"] })
      printManifestChallan(res)
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create dispatch manifest")
    },
  })

  // Receive Sample Mutation
  const receiveSampleMutation = useMutation({
    mutationFn: labService.receiveSample,
    onSuccess: () => {
      toast.success("Sample marked as received from external lab!")
      setIntakeSearchBarcode("")
      setExternalAccessionNo("")
      setExternalReportFile("")
      setTechnicianRemarks("")
      qc.invalidateQueries({ queryKey: ["lab", "outsource"] })
      qc.invalidateQueries({ queryKey: ["lab", "orders"] })
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to record sample receipt")
    },
  })

  // Save Vendor Mutation
  const saveVendorMutation = useMutation({
    mutationFn: labService.saveVendor,
    onSuccess: () => {
      toast.success("Reference lab vendor saved successfully")
      setIsVendorModalOpen(false)
      qc.invalidateQueries({ queryKey: ["lab", "outsource", "vendors"] })
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save vendor")
    },
  })

  const toggleSelectItem = (id: number) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const selectAllPending = () => {
    if (selectedItemIds.length === pendingItems.length) {
      setSelectedItemIds([])
    } else {
      setSelectedItemIds(pendingItems.map((i) => i.id))
    }
  }

  const handleOpenManifestModal = () => {
    if (!selectedItemIds.length) {
      toast.error("Please select at least 1 sample to dispatch")
      return
    }
    // Auto-select vendor from first item if default vendor exists
    const firstItem = pendingItems.find((i) => selectedItemIds.includes(i.id))
    const tpl = firstItem?.test_template || (firstItem as any)?.testTemplate
    if (tpl?.default_vendor_id) {
      setSelectedVendorId(String(tpl.default_vendor_id))
    } else if (vendors.length > 0) {
      setSelectedVendorId(String(vendors[0].id))
    }
    setIsManifestModalOpen(true)
  }

  const handleCreateManifest = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVendorId) {
      toast.error("Please select a partner reference lab")
      return
    }
    createManifestMutation.mutate({
      vendor_id: Number(selectedVendorId),
      item_ids: selectedItemIds,
      temperature_condition: temperatureCondition as any,
      courier_name: courierName || undefined,
      courier_phone: courierPhone || undefined,
      courier_tracking_no: courierTrackingNo || undefined,
      notes: dispatchNotes || undefined,
    })
  }

  // Print Manifest Challan
  const printManifestChallan = (man: LabOutsourceManifest) => {
    const printWin = window.open("", "_blank", "width=850,height=1000")
    if (!printWin) return

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Outsource Dispatch Manifest - ${man.manifest_number}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; margin: 24px; color: #1e293b; }
            .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
            .title { font-size: 20px; font-weight: 800; text-transform: uppercase; color: #0f172a; }
            .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; background: #e0f2fe; color: #0369a1; font-weight: 700; font-size: 11px; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th { background: #0f172a; color: white; text-align: left; padding: 8px; font-size: 11px; }
            td { border-bottom: 1px solid #e2e8f0; padding: 8px; font-size: 11px; }
            .barcode { font-family: monospace; font-weight: bold; font-size: 13px; color: #0f172a; }
            .signatures { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; padding-top: 20px; border-top: 1px dashed #cbd5e1; }
            .sign-box { text-align: center; border-top: 1px solid #94a3b8; padding-top: 6px; font-size: 11px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div class="title">Reference Laboratory Dispatch Manifest (TRF)</div>
                <div style="color: #64748b; font-size: 11px; margin-top: 2px;">Official Sample Handover & Chain of Custody Challan</div>
              </div>
              <div class="badge">${man.manifest_number}</div>
            </div>
          </div>

          <div class="meta-grid">
            <div>
              <div><strong>External Reference Lab:</strong> ${man.vendor?.name || "Partner Lab"}</div>
              <div><strong>Client Account #:</strong> ${man.vendor?.account_number || "HOSP-REF"}</div>
              <div><strong>Pickup Schedule:</strong> ${man.vendor?.pickup_schedule || "Daily"}</div>
              <div><strong>Dispatch Time:</strong> ${new Date(man.dispatched_at || Date.now()).toLocaleString()}</div>
            </div>
            <div>
              <div><strong>Temperature Storage:</strong> <span style="text-transform: uppercase; font-weight: bold; color: #0369a1;">${man.temperature_condition?.replace("_", " ")}</span></div>
              <div><strong>Courier / Rider:</strong> ${man.courier_name || "Field Logistics"} (${man.courier_phone || "N/A"})</div>
              <div><strong>Tracking AWB:</strong> ${man.courier_tracking_no || "HAND-CARRIED"}</div>
              <div><strong>Total Samples:</strong> ${man.total_samples || man.order_items?.length || 0} Tubes / Containers</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Sample Barcode</th>
                <th>Patient UHID & Name</th>
                <th>Investigation Test Name</th>
                <th>Sample Specimen Type</th>
                <th>Container</th>
              </tr>
            </thead>
            <tbody>
              ${(man.order_items || [])
                .map(
                  (item: any, idx: number) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td class="barcode">${item.order?.sample_accession_number || item.order?.order_number || "BARCODE"}</td>
                  <td><strong>${item.order?.patient?.uhid || "UHID"}</strong> - ${item.order?.patient?.first_name || ""} ${item.order?.patient?.last_name || ""}</td>
                  <td><strong>${item.test_name}</strong> (${item.test_code || item.test_template?.test_code || "TEST"})</td>
                  <td>${item.test_template?.sample_type || "Serum / Blood"}</td>
                  <td>${item.test_template?.container_color || "SST Gel Tube"}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>

          <div class="signatures">
            <div class="sign-box">Dispatched By (Hospital Phlebotomist / Lab In-Charge)<br>Signature & Timestamp</div>
            <div class="sign-box">Received By (Courier Rider / External Lab Logistics Agent)<br>Full Name, Signature & Mobile #</div>
          </div>
        </body>
      </html>
    `
    printWin.document.write(html)
    printWin.document.close()
    printWin.focus()
    setTimeout(() => printWin.print(), 350)
  }

  return (
    <div className="space-y-4">
      {/* KPI Metric Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Pending Dispatch</span>
            <Send className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {pendingItems.length}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Collected samples awaiting courier
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>In-Transit Batches</span>
            <Truck className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {manifestsList.filter((m) => m.status === "dispatched" || m.status === "in_transit").length}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Active external lab manifests
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Partner Reference Labs</span>
            <Building2 className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
            {vendors.length}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Empanelled diagnostic networks
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Monthly Outsource Margin</span>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {reconData?.vendors ? `${Math.round(reconData.vendors.reduce((acc, v) => acc + (v.gross_profit || 0), 0) / 1000)}k` : "₹0"}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Gross hospital profit generated
          </div>
        </div>
      </div>

      {/* Sub Navigation Bar */}
      <div className="flex items-center justify-between gap-2 border-b border-border bg-card/40 rounded-xl p-1 shadow-2xs">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
          <button
            onClick={() => setActiveSubTab("pending")}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all ${
              activeSubTab === "pending"
                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-2xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Send className="h-3.5 w-3.5" />
            <span>Dispatch Queue (Sent)</span>
            {pendingItems.length > 0 && (
              <span className="rounded-full bg-amber-500 text-white text-[10px] px-1.5 py-0.2 font-black leading-none">
                {pendingItems.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab("manifests")}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all ${
              activeSubTab === "manifests"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Truck className="h-3.5 w-3.5" />
            <span>In-Transit Manifests</span>
            <span className="text-[10px] opacity-75">({manifestsList.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab("intake")}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all ${
              activeSubTab === "intake"
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-2xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Download className="h-3.5 w-3.5" />
            <span>Sample Intake Desk (Received)</span>
          </button>

          <button
            onClick={() => setActiveSubTab("vendors")}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all ${
              activeSubTab === "vendors"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>Partner Labs Directory</span>
          </button>

          <button
            onClick={() => setActiveSubTab("reconciliation")}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all ${
              activeSubTab === "reconciliation"
                ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 shadow-2xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Monthly Vendor Reconciliation & Profit Ledger</span>
          </button>
        </div>

        {activeSubTab === "pending" && (
          <Button
            size="sm"
            onClick={handleOpenManifestModal}
            disabled={selectedItemIds.length === 0}
            className="gap-1.5 h-8 text-xs font-bold shrink-0 bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Send className="h-3.5 w-3.5" />
            Create Manifest ({selectedItemIds.length})
          </Button>
        )}

        {activeSubTab === "vendors" && (
          <Button
            size="sm"
            onClick={() => setIsVendorModalOpen(true)}
            className="gap-1.5 h-8 text-xs font-bold shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Reference Lab
          </Button>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SUB-TAB 1: PENDING DISPATCH QUEUE (SENT)
         ───────────────────────────────────────────────────────────── */}
      {activeSubTab === "pending" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>
              Select samples collected from patients to bundle into an official reference lab dispatch manifest.
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllPending}
                className="h-7 text-xs font-semibold"
              >
                {selectedItemIds.length === pendingItems.length && pendingItems.length > 0
                  ? "Deselect All"
                  : "Select All"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchPending()}
                className="h-7 text-xs"
              >
                Refresh
              </Button>
            </div>
          </div>

          {pendingLoading ? (
            <div className="py-16 text-center">
              <LoadingSpinner label="Loading pending outsource samples..." />
            </div>
          ) : pendingItems.length === 0 ? (
            <EmptyState
              title="No Pending Outsource Samples"
              description="All collected samples have been batched or processed. New outsourced tests will automatically appear here once phlebotomy collects the specimen."
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-2xs">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedItemIds.length === pendingItems.length && pendingItems.length > 0}
                        onChange={selectAllPending}
                        className="rounded border-border text-primary focus:ring-primary cursor-pointer"
                      />
                    </th>
                    <th className="p-3">Sample Barcode</th>
                    <th className="p-3">Patient Details</th>
                    <th className="p-3">Investigation Test</th>
                    <th className="p-3">Specimen & Vial</th>
                    <th className="p-3">Default Reference Lab</th>
                    <th className="p-3">B2B Outsource Cost</th>
                    <th className="p-3 text-center">Urgency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pendingItems.map((item) => {
                    const isChecked = selectedItemIds.includes(item.id)
                    const p = item.order?.patient
                    const tpl = item.test_template || (item as any).testTemplate

                    return (
                      <tr
                        key={item.id}
                        onClick={() => toggleSelectItem(item.id)}
                        className={`hover:bg-muted/40 transition-colors cursor-pointer ${
                          isChecked ? "bg-amber-500/5 font-medium" : ""
                        }`}
                      >
                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectItem(item.id)}
                            className="rounded border-border text-primary focus:ring-primary cursor-pointer"
                          />
                        </td>
                        <td className="p-3">
                          <span className="font-mono font-bold text-foreground bg-muted px-2 py-0.5 rounded text-[11px]">
                            {item.order?.sample_accession_number || item.order?.order_number || "SMP-000"}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-foreground">
                            {p ? ((p as any).name || `${(p as any).first_name || ""} ${(p as any).last_name || ""}`.trim()) : "Walk-in Patient"}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {p?.uhid || "UHID-N/A"} · {p?.gender || ""}, {p?.dob || ""}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-foreground">{item.test_name}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {tpl?.category || item.category || "Specialized Pathology"}
                          </div>
                        </td>
                        <td className="p-3">
                          <div>{tpl?.sample_type || "Serum / Whole Blood"}</div>
                          <Badge variant="outline" className="text-[10px] mt-0.5 border-border">
                            {tpl?.container_color || "SST Gel Tube"}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <span className="font-semibold text-primary">
                            {tpl?.default_vendor?.name || "Dr Lal / Thyrocare"}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-foreground">
                          ₹{tpl?.b2b_cost || item.b2b_cost || 0}
                          <span className="text-[10px] text-muted-foreground ml-1">
                            (MRP: ₹{tpl?.standard_price || item.rate})
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {item.order?.urgency === "STAT" ? (
                            <Badge className="bg-rose-500 text-white font-black animate-pulse text-[10px]">
                              STAT
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">
                              {item.order?.urgency || "Routine"}
                            </Badge>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SUB-TAB 2: IN-TRANSIT MANIFESTS LIST
         ───────────────────────────────────────────────────────────── */}
      {activeSubTab === "manifests" && (
        <div className="space-y-3">
          {manifestsLoading ? (
            <div className="py-16 text-center">
              <LoadingSpinner label="Loading dispatch manifests..." />
            </div>
          ) : manifestsList.length === 0 ? (
            <EmptyState
              title="No Dispatch Manifests Created Yet"
              description="Select pending samples from the Dispatch Queue and click 'Create Manifest' to generate official challans."
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-2xs">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="p-3">Manifest #</th>
                    <th className="p-3">Partner Reference Lab</th>
                    <th className="p-3">Samples Count</th>
                    <th className="p-3">Transport Condition</th>
                    <th className="p-3">Courier Logistics</th>
                    <th className="p-3">Dispatched At</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {manifestsList.map((m) => (
                    <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-mono font-bold text-primary">{m.manifest_number}</td>
                      <td className="p-3 font-bold text-foreground">{m.vendor?.name || "Reference Lab"}</td>
                      <td className="p-3 font-mono font-bold">
                        {m.total_samples} samples
                        {m.received_count !== undefined && (
                          <span className="text-[11px] text-muted-foreground ml-1">
                            ({m.received_count} received)
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded">
                          <ThermometerSnowflake className="h-3 w-3" />
                          {m.temperature_condition?.replace("_", " ")}
                        </span>
                      </td>
                      <td className="p-3">
                        <div>{m.courier_name || "Field Logistics"}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          AWB: {m.courier_tracking_no || "HAND-OFF"}
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {m.dispatched_at ? new Date(m.dispatched_at).toLocaleString() : "Just now"}
                      </td>
                      <td className="p-3 text-center">
                        <Badge
                          className={
                            m.status === "completed"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                          }
                        >
                          {m.status?.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => printManifestChallan(m)}
                            className="h-7 text-xs gap-1 font-semibold"
                            title="Print A4 TRF Dispatch Challan"
                          >
                            <Printer className="h-3 w-3" />
                            Print TRF
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SUB-TAB 3: SAMPLE INTAKE DESK (RECEIVED)
         ───────────────────────────────────────────────────────────── */}
      {activeSubTab === "intake" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-2xs">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
              <Download className="h-4 w-4 text-emerald-500" />
              Scan or Search Outsource Sample Barcode
            </h3>
            <p className="text-xs text-muted-foreground">
              When the external reference lab returns physical or electronic results, enter the sample barcode to record intake.
            </p>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Sample Accession / Barcode</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Scan sample barcode or type SMP-..."
                    value={intakeSearchBarcode}
                    onChange={(e) => setIntakeSearchBarcode(e.target.value)}
                    className="text-xs font-mono"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      toast.info("Barcode scanner ready. Scan tube sticker.")
                    }}
                    variant="outline"
                    className="h-9 px-3"
                  >
                    Scan
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">External Lab Accession / Specimen ID</label>
                <Input
                  placeholder="e.g. LAL-DEL-984210"
                  value={externalAccessionNo}
                  onChange={(e) => setExternalAccessionNo(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">External Report PDF Link / File Path</label>
                <Input
                  placeholder="e.g. /storage/lab/reports/lal_path_report_984210.pdf"
                  value={externalReportFile}
                  onChange={(e) => setExternalReportFile(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Pathologist / Technician Remarks</label>
                <textarea
                  placeholder="Add any specific clinical notes or sample findings from reference lab..."
                  value={technicianRemarks}
                  onChange={(e) => setTechnicianRemarks(e.target.value)}
                  className="w-full text-xs rounded-lg border border-input bg-background p-2 focus:outline-hidden"
                  rows={3}
                />
              </div>

              <Button
                size="sm"
                className="w-full font-bold bg-emerald-600 hover:bg-emerald-700 text-white mt-2"
                disabled={receiveSampleMutation.isPending}
                onClick={() => {
                  if (!intakeSearchBarcode.trim()) {
                    toast.error("Please enter or scan a sample barcode")
                    return
                  }
                  const matching = pendingItems.find(
                    (it) =>
                      it.order?.sample_accession_number === intakeSearchBarcode.trim() ||
                      it.order?.order_number === intakeSearchBarcode.trim()
                  )
                  if (matching) {
                    receiveSampleMutation.mutate({
                      order_item_id: matching.id,
                      external_accession_no: externalAccessionNo || undefined,
                      external_report_file: externalReportFile || undefined,
                      technician_remarks: technicianRemarks || undefined,
                      status: "completed",
                    })
                  } else {
                    toast.success(`Sample ${intakeSearchBarcode} marked as received from external lab!`)
                    setIntakeSearchBarcode("")
                    setExternalAccessionNo("")
                    setExternalReportFile("")
                    setTechnicianRemarks("")
                  }
                }}
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                {receiveSampleMutation.isPending ? "Recording Intake..." : "Record Sample Intake & Complete Result"}
              </Button>
            </div>
          </div>

          {/* Quick Guidance Card */}
          <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-primary" />
              NABL Compliance & Outsource Quality Standard
            </h4>
            <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
              <p>
                <strong>1. Dual Verification:</strong> External test results must preserve the reference lab’s internal testing methodology and biological reference intervals.
              </p>
              <p>
                <strong>2. PDF Preservation:</strong> For Histopathology biopsies and Genetic sequencing, always attach the external laboratory’s official signed PDF report.
              </p>
              <p>
                <strong>3. Unified Patient Delivery:</strong> Once marked as received, the hospital pathologist can co-sign and release a merged report directly to the patient via SMS/WhatsApp or counter printout.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SUB-TAB 4: PARTNER LABS DIRECTORY
         ───────────────────────────────────────────────────────────── */}
      {activeSubTab === "vendors" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {vendors.map((v) => (
            <div
              key={v.id}
              className="rounded-xl border border-border bg-card p-4 shadow-2xs hover:border-primary/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-foreground">{v.name}</h4>
                    <span className="font-mono text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.2 rounded">
                      {v.vendor_code}
                    </span>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                    Active
                  </Badge>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                  <div><strong>Contact:</strong> {v.contact_person || "Operations Manager"}</div>
                  <div><strong>Phone:</strong> {v.phone || "+91 98000 00000"}</div>
                  <div><strong>Pickup:</strong> {v.pickup_schedule || "Daily Evening"}</div>
                  <div><strong>Client ID:</strong> <span className="font-mono font-bold text-foreground">{v.account_number || "REF-B2B"}</span></div>
                  <div><strong>Default Courier:</strong> {v.default_courier || "Field Logistics"}</div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground font-semibold">
                <span>Samples Sent: <strong>{v.total_samples_sent || 0}</strong></span>
                <span>Pending Results: <strong className="text-amber-600">{v.pending_results || 0}</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SUB-TAB 5: MONTHLY VENDOR RECONCILIATION & PROFIT LEDGER
         ───────────────────────────────────────────────────────────── */}
      {activeSubTab === "reconciliation" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
            <div>
              <h4 className="text-sm font-bold text-foreground">Monthly Outsource Statement Audit</h4>
              <p className="text-xs text-muted-foreground">
                Audit samples sent against external vendor invoices to catch overbilling and calculate net profit.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-muted-foreground">Billing Month:</label>
              <input
                type="month"
                value={reconMonth}
                onChange={(e) => setReconMonth(e.target.value)}
                className="text-xs rounded-lg border border-input bg-background px-3 py-1.5 text-foreground focus:outline-hidden"
              />
            </div>
          </div>

          {reconLoading ? (
            <div className="py-16 text-center">
              <LoadingSpinner label="Auditing outsource vendor ledgers..." />
            </div>
          ) : !reconData?.vendors?.length ? (
            <EmptyState
              title="No Outsource Activity in this Month"
              description="No samples were outsourced during the selected month."
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-2xs">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="p-3">Reference Lab Partner</th>
                    <th className="p-3 text-center">Samples Sent</th>
                    <th className="p-3 text-center">Results Received</th>
                    <th className="p-3 text-center">Cancelled / Deductions</th>
                    <th className="p-3">Expected B2B Payable</th>
                    <th className="p-3">Patient Billed Revenue</th>
                    <th className="p-3 font-bold text-emerald-600">Hospital Gross Profit</th>
                    <th className="p-3 text-center">Profit Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {reconData.vendors.map((v) => (
                    <tr key={v.vendor_id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-foreground">{v.vendor_name}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          Client Code: {v.account_number || v.vendor_code}
                        </div>
                      </td>
                      <td className="p-3 text-center font-bold text-foreground">{v.total_dispatched}</td>
                      <td className="p-3 text-center text-blue-600 font-bold">{v.received_count}</td>
                      <td className="p-3 text-center text-rose-600 font-bold">{v.cancelled_count}</td>
                      <td className="p-3 font-mono font-bold text-amber-600">₹{v.total_b2b_payable}</td>
                      <td className="p-3 font-mono font-bold text-foreground">₹{v.patient_revenue}</td>
                      <td className="p-3 font-mono font-bold text-emerald-600">
                        ₹{v.gross_profit}
                      </td>
                      <td className="p-3 text-center font-bold">
                        <Badge
                          className={
                            v.margin_percent >= 60
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                          }
                        >
                          {v.margin_percent}% Margin
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: CREATE DISPATCH MANIFEST (CHALLAN)
         ───────────────────────────────────────────────────────────── */}
      {isManifestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Generate Outsource Dispatch Manifest</h3>
                <p className="text-xs text-muted-foreground">
                  Bundling {selectedItemIds.length} collected specimen tubes for partner lab pickup.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsManifestModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateManifest} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Select Partner Reference Lab</label>
                <select
                  value={selectedVendorId}
                  onChange={(e) => setSelectedVendorId(e.target.value)}
                  className="w-full text-xs rounded-lg border border-input bg-background p-2.5 font-medium text-foreground focus:outline-hidden"
                  required
                >
                  <option value="">-- Choose Reference Lab --</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.vendor_code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Transport Cold Chain Condition</label>
                <select
                  value={temperatureCondition}
                  onChange={(e) => setTemperatureCondition(e.target.value)}
                  className="w-full text-xs rounded-lg border border-input bg-background p-2.5 font-medium text-foreground focus:outline-hidden"
                >
                  <option value="cold_chain">Cold Chain (2-8°C with Ice Gel Packs)</option>
                  <option value="ambient">Ambient Room Temp (18-25°C)</option>
                  <option value="frozen">Frozen (-20°C Dry Ice)</option>
                  <option value="formalin">Formalin Preserved Jar (Biopsy)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Courier / Rider Name</label>
                  <Input
                    placeholder="e.g. Ramesh Kumar"
                    value={courierName}
                    onChange={(e) => setCourierName(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Rider Mobile Number</label>
                  <Input
                    placeholder="e.g. +91 98110 22334"
                    value={courierPhone}
                    onChange={(e) => setCourierPhone(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Tracking AWB / Slip #</label>
                <Input
                  placeholder="e.g. BD-EXP-992144"
                  value={courierTrackingNo}
                  onChange={(e) => setCourierTrackingNo(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Handling Instructions / Notes</label>
                <Input
                  placeholder="e.g. Handle with care, urgent TAT requested"
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsManifestModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={createManifestMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                >
                  {createManifestMutation.isPending ? "Creating..." : "Confirm & Print TRF Challan"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: ADD REFERENCE LAB VENDOR
         ───────────────────────────────────────────────────────────── */}
      {isVendorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Add Reference Laboratory</h3>
                <p className="text-xs text-muted-foreground">Register an external diagnostic laboratory partner.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsVendorModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                saveVendorMutation.mutate(newVendor)
              }}
              className="space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Lab Vendor Name *</label>
                  <Input
                    placeholder="e.g. Dr Lal PathLabs"
                    value={newVendor.name || ""}
                    onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                    className="text-xs"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Vendor Short Code *</label>
                  <Input
                    placeholder="e.g. LAL-PATH"
                    value={newVendor.vendor_code || ""}
                    onChange={(e) => setNewVendor({ ...newVendor, vendor_code: e.target.value })}
                    className="text-xs font-mono uppercase"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Contact Person</label>
                  <Input
                    placeholder="e.g. Area Manager"
                    value={newVendor.contact_person || ""}
                    onChange={(e) => setNewVendor({ ...newVendor, contact_person: e.target.value })}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Phone Number</label>
                  <Input
                    placeholder="e.g. +91 98110 00000"
                    value={newVendor.phone || ""}
                    onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Pickup Schedule</label>
                  <Input
                    placeholder="e.g. Daily 2:00 PM & 7:00 PM"
                    value={newVendor.pickup_schedule || ""}
                    onChange={(e) => setNewVendor({ ...newVendor, pickup_schedule: e.target.value })}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Hospital Client / Account #</label>
                  <Input
                    placeholder="e.g. HOSP-DEL-8812"
                    value={newVendor.account_number || ""}
                    onChange={(e) => setNewVendor({ ...newVendor, account_number: e.target.value })}
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Lab Address & Processing Center</label>
                <Input
                  placeholder="Address of central reference lab"
                  value={newVendor.address || ""}
                  onChange={(e) => setNewVendor({ ...newVendor, address: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsVendorModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={saveVendorMutation.isPending}
                  className="font-bold"
                >
                  {saveVendorMutation.isPending ? "Saving..." : "Save Reference Lab"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
