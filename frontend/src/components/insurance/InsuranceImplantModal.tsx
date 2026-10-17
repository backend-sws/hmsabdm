import React, { useState, useEffect, useMemo } from "react"
import { createPortal } from "react-dom"
import { useQuery, useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  ShieldCheck,
  Plus,
  Search,
  X,
  CheckCircle2,
  XCircle,
  RefreshCw,
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

interface Props {
  embedded?: boolean
  initialOpenCreate?: boolean
  onResetOpenCreate?: () => void
  onClose?: () => void
  onRefresh?: () => void
}

export const InsuranceImplantModal: React.FC<Props> = ({
  embedded = false,
  initialOpenCreate = false,
  onResetOpenCreate,
  onClose,
  onRefresh,
}) => {
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "denied">("all")

  useEffect(() => {
    if (initialOpenCreate) {
      setShowCreate(true)
    }
  }, [initialOpenCreate])

  const [form, setForm] = useState({
    payer_id: "",
    admission_id: "",
    device_name: "",
    brand_model: "",
    barcode_serial: "",
    manufacturer: "",
    device_cost: "",
  })

  // Action modal state replacing prompt
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean
    type: "approve" | "deny" | null
    item: any | null
  }>({ isOpen: false, type: null, item: null })
  const [actionValue, setActionValue] = useState("")

  const { data: payers = [] } = useQuery({
    queryKey: ["insurance", "payers"],
    queryFn: () => insuranceService.getPayers(),
  })

  const { data: implants = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["insurance", "implants", search],
    queryFn: () => insuranceService.getImplants({ search }),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => insuranceService.createImplant(data),
    onSuccess: () => {
      toast.success("Implant prior-approval request submitted")
      setShowCreate(false)
      onResetOpenCreate?.()
      setForm({
        payer_id: "",
        admission_id: "",
        device_name: "",
        brand_model: "",
        barcode_serial: "",
        manufacturer: "",
        device_cost: "",
      })
      refetch()
      onRefresh?.()
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to submit implant request")
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, data }: any) =>
      insuranceService.updateImplant(id, { status, ...data }),
    onSuccess: () => {
      toast.success("Implant approval status updated")
      refetch()
      onRefresh?.()
    },
    onError: () => toast.error("Failed to update implant status"),
  })

  const rawList = Array.isArray(implants) ? implants : []

  // Filter list by status
  const implantList = useMemo(() => {
    if (statusFilter === "all") return rawList
    return rawList.filter((item: any) => item.status === statusFilter)
  }, [rawList, statusFilter])

  // KPI Calculations
  const stats = useMemo(() => {
    const total = rawList.length
    const pending = rawList.filter((i: any) => i.status === "pending").length
    const approved = rawList.filter((i: any) => i.status === "approved").length
    const denied = rawList.filter((i: any) => i.status === "denied").length
    const totalCost = rawList.reduce((acc: number, curr: any) => acc + Number(curr.device_cost || 0), 0)
    return { total, pending, approved, denied, totalCost }
  }, [rawList])

  const handleCloseCreate = () => {
    setShowCreate(false)
    onResetOpenCreate?.()
  }

  return (
    <div
      className={
        embedded
          ? "space-y-4 w-full"
          : "bg-background rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-border"
      }
    >
      {/* ── Modal Header (Only shown when not embedded) ── */}
      {!embedded && (
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-primary/10 p-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Implant & High-Cost Device Prior Approvals</h2>
              <p className="text-xs text-muted-foreground">Cardiac stents, orthopedic implants, pacemakers, cochlear devices</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* ── Main Content Container ── */}
      <div className={embedded ? "space-y-4" : "flex-1 overflow-y-auto p-6 space-y-4"}>
        {/* In-page KPI Metric Cards */}
        {embedded && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-2xs">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Implants</p>
              <p className="text-xl font-bold font-mono mt-1 tabular-nums">{stats.total}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">High-cost devices</p>
            </div>
            <div className="rounded-xl border border-amber-200/60 dark:border-amber-900/40 bg-amber-500/5 p-3.5 shadow-2xs">
              <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Pending TPA Approval</p>
              <p className="text-xl font-bold font-mono text-amber-700 dark:text-amber-400 mt-1 tabular-nums">{stats.pending}</p>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">Awaiting sanction</p>
            </div>
            <div className="rounded-xl border border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-500/5 p-3.5 shadow-2xs">
              <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Sanctioned & Approved</p>
              <p className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">{stats.approved}</p>
              <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">Cleared for surgery</p>
            </div>
            <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-2xs">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Value</p>
              <p className="text-xl font-bold font-mono mt-1 tabular-nums">
                ₹{((stats.totalCost) / 100000).toFixed(2)}L
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Approved & pending</p>
            </div>
          </div>
        )}

        {/* Controls Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/80 shadow-2xs">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="pl-9 h-9 text-xs"
                placeholder="Search implant name, serial number, brand, manufacturer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                >
                  ✕
                </button>
              )}
            </div>
            <Button size="sm" variant="ghost" className="h-9 px-2.5" onClick={() => refetch()} title="Refresh">
              <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {/* Status Filter Buttons */}
            <div className="flex gap-1 bg-muted/60 p-1 rounded-lg">
              {(["all", "pending", "approved", "denied"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md capitalize transition-all ${
                    statusFilter === s
                      ? "bg-background text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <Button size="sm" className="h-9 text-xs" onClick={() => setShowCreate(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> New Prior-Approval
            </Button>
          </div>
        </div>

        {/* List of Implants */}
        <div className="space-y-3">
          {isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl border border-border bg-muted/30 animate-pulse" />
            ))}

          {!isLoading && !implantList.length && (
            <div className="text-center py-14 rounded-2xl border border-dashed border-border/80 bg-card/40 text-muted-foreground">
              <div className="rounded-2xl bg-muted/50 p-4 w-fit mx-auto mb-3">
                <ShieldCheck className="h-8 w-8 text-primary/60" />
              </div>
              <p className="text-sm font-bold text-foreground">No implant prior approval requests found</p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                {search || statusFilter !== "all"
                  ? "Try adjusting your search query or status filter to see other records."
                  : "Submit high-cost surgical implant details prior to surgery for TPA / Ayushman Bharat sanction."}
              </p>
              <Button size="sm" className="mt-4" onClick={() => setShowCreate(true)}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Request First Implant Approval
              </Button>
            </div>
          )}

          {implantList.map((item: any) => {
            const isApproved = item.status === "approved"
            const isDenied = item.status === "denied"
            const isPending = item.status === "pending"

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs hover:border-primary/40 hover:shadow-xs transition-all"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-foreground">{item.device_name}</h4>
                      <Badge
                        variant={isApproved ? "default" : isDenied ? "destructive" : "secondary"}
                        className={`text-[10px] capitalize font-semibold px-2 py-0.5 ${
                          isApproved
                            ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/25"
                            : isPending
                            ? "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/25 animate-pulse"
                            : ""
                        }`}
                      >
                        {item.status}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {item.manufacturer && <span className="font-semibold text-foreground/80">{item.manufacturer}</span>}
                      {item.brand_model && <span> · Model: {item.brand_model}</span>}
                      {item.barcode_serial && <span className="font-mono ml-1.5 bg-muted/60 px-1.5 py-0.5 rounded text-[11px]">Serial: {item.barcode_serial}</span>}
                    </p>

                    <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground pt-0.5">
                      <span>
                        Payer: <strong className="text-foreground">{item.payer?.name || "Standard Payer"}</strong>
                      </span>
                      {item.approval_reference && (
                        <span className="text-emerald-700 dark:text-emerald-400 font-mono font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          Ref: {item.approval_reference}
                        </span>
                      )}
                      {item.denial_reason && (
                        <span className="text-rose-700 dark:text-rose-400 text-xs italic bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                          Reason: {item.denial_reason}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Device Cost</p>
                    <p className="text-lg font-black font-mono tabular-nums text-foreground mt-0.5">
                      ₹{Number(item.device_cost || 0).toLocaleString("en-IN")}
                    </p>

                    {/* Action buttons */}
                    {isPending && (
                      <div className="flex gap-2 mt-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                          onClick={() => {
                            setActionValue("")
                            setActionModal({ isOpen: true, type: "approve", item })
                          }}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-red-300 text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                          onClick={() => {
                            setActionValue("")
                            setActionModal({ isOpen: true, type: "deny", item })
                          }}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Deny
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── CREATE IMPLANT REQUEST MODAL DIALOG ───────────────────────────── */}
      {showCreate &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 border border-border animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" /> Request Implant Prior Approval
              </h3>
              <button
                onClick={handleCloseCreate}
                className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <Label className="text-xs">Payer / Insurer *</Label>
                <Select value={form.payer_id} onValueChange={(v) => setForm((f) => ({ ...f, payer_id: v }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select Payer" /></SelectTrigger>
                  <SelectContent>
                    {payers.map((p: any) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Device / Implant Name *</Label>
                <Input
                  className="h-9 text-xs"
                  placeholder="e.g. Drug Eluting Stent (DES), Cobalt Chromium Knee Prosthesis"
                  value={form.device_name}
                  onChange={(e) => setForm((f) => ({ ...f, device_name: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Brand / Model</Label>
                  <Input
                    className="h-9 text-xs"
                    placeholder="e.g. Xience Sierra"
                    value={form.brand_model}
                    onChange={(e) => setForm((f) => ({ ...f, brand_model: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Manufacturer</Label>
                  <Input
                    className="h-9 text-xs"
                    placeholder="e.g. Abbott, Stryker, Zimmer"
                    value={form.manufacturer}
                    onChange={(e) => setForm((f) => ({ ...f, manufacturer: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Barcode / Serial #</Label>
                  <Input
                    className="h-9 text-xs"
                    placeholder="Serial or GTIN"
                    value={form.barcode_serial}
                    onChange={(e) => setForm((f) => ({ ...f, barcode_serial: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Device Cost (₹) *</Label>
                  <Input
                    className="h-9 text-xs"
                    type="number"
                    placeholder="0.00"
                    value={form.device_cost}
                    onChange={(e) => setForm((f) => ({ ...f, device_cost: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="outline" size="sm" onClick={handleCloseCreate}>Cancel</Button>
              <Button
                size="sm"
                disabled={!form.payer_id || !form.device_name || !form.device_cost || createMutation.isPending}
                onClick={() =>
                  createMutation.mutate({
                    ...form,
                    payer_id: Number(form.payer_id),
                    device_cost: Number(form.device_cost),
                  })
                }
              >
                {createMutation.isPending ? "Submitting..." : "Submit Approval Request"}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Action Modal replacing prompt ───────────────────────────── */}
      {actionModal.isOpen && actionModal.item &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-3 border border-border animate-in fade-in zoom-in-95 duration-150">
            <h4 className="font-semibold text-sm">
              {actionModal.type === "approve" ? "Confirm Implant Approval" : "Record Implant Denial"}
            </h4>
            <p className="text-xs text-muted-foreground">
              {actionModal.item.device_name} ({actionModal.item.brand_model})
            </p>
            <div className="space-y-1 text-xs">
              <Label className="text-xs">
                {actionModal.type === "approve" ? "TPA Approval Reference Code *" : "Denial Reason *"}
              </Label>
              <Input
                className="h-9 text-xs"
                placeholder={actionModal.type === "approve" ? "e.g. TPA-IMP-8821" : "e.g. Implant cost exceeds policy cap"}
                value={actionValue}
                onChange={(e) => setActionValue(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button size="sm" variant="outline" onClick={() => setActionModal({ isOpen: false, type: null, item: null })}>
                Cancel
              </Button>
              <Button
                size="sm"
                className={`${actionModal.type === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"} text-white`}
                disabled={!actionValue || updateStatusMutation.isPending}
                onClick={() => {
                  if (actionModal.type === "approve") {
                    updateStatusMutation.mutate({ id: actionModal.item.id, status: "approved", data: { approval_reference: actionValue } })
                  } else {
                    updateStatusMutation.mutate({ id: actionModal.item.id, status: "denied", data: { denial_reason: actionValue } })
                  }
                  setActionModal({ isOpen: false, type: null, item: null })
                }}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
