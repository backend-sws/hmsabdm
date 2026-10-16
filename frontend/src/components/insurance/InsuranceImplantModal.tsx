import React, { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  ShieldCheck,
  Plus,
  Search,
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
  onClose: () => void
  onRefresh?: () => void
}

export const InsuranceImplantModal: React.FC<Props> = ({ onClose, onRefresh }) => {
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState("")

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

  const { data: implants = [], isLoading, refetch } = useQuery({
    queryKey: ["insurance", "implants", search],
    queryFn: () => insuranceService.getImplants({ search }),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => insuranceService.createImplant(data),
    onSuccess: () => {
      toast.success("Implant prior-approval request submitted")
      setShowCreate(false)
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

  const implantList = Array.isArray(implants) ? implants : []

  return (
    <div className="bg-background rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">Implant & High-Cost Device Prior Approvals</h2>
            <p className="text-xs text-muted-foreground">Cardiac stents, orthopedic implants, pacemakers, cochlear devices</p>
          </div>
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Controls */}
        <div className="flex items-center justify-between gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="pl-9 h-8 text-xs"
              placeholder="Search implant name, serial..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Button size="sm" className="h-8 text-xs" onClick={() => setShowCreate(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> New Prior-Approval
          </Button>
        </div>

        {/* List */}
        <div className="space-y-3">
          {isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl border border-border bg-muted/30 animate-pulse" />
            ))}

          {!isLoading && !implantList.length && (
            <div className="text-center py-12 rounded-xl border border-dashed border-border text-muted-foreground">
              <ShieldCheck className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">No implant prior approval requests</p>
              <p className="text-xs mt-1">Submit high-cost surgical implant details prior to surgery for TPA sanction.</p>
            </div>
          )}

          {implantList.map((item: any) => {
            const isApproved = item.status === "approved"
            const isDenied = item.status === "denied"
            const isPending = item.status === "pending"

            return (
              <div
                key={item.id}
                className="rounded-xl border border-border bg-card p-4 shadow-sm hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm">{item.device_name}</h4>
                      <Badge
                        variant={isApproved ? "default" : isDenied ? "destructive" : "secondary"}
                        className="text-[10px] capitalize"
                      >
                        {item.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.manufacturer && `${item.manufacturer} · `}
                      {item.brand_model || "Standard Model"}
                      {item.barcode_serial && ` · Serial: ${item.barcode_serial}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Payer: <strong className="text-foreground">{item.payer?.name || "—"}</strong>
                      {item.approval_reference && (
                        <span className="text-emerald-700 dark:text-emerald-400 font-mono ml-2">
                          Ref: {item.approval_reference}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Device Cost</p>
                    <p className="text-base font-extrabold text-foreground">
                      ₹{Number(item.device_cost || 0).toLocaleString("en-IN")}
                    </p>

                    {/* Action buttons */}
                    {isPending && (
                      <div className="flex gap-1.5 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[11px] border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                          onClick={() => {
                            setActionValue("")
                            setActionModal({ isOpen: true, type: "approve", item })
                          }}
                        >
                          ✓ Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[11px] border-red-300 text-red-700 hover:bg-red-50"
                          onClick={() => {
                            setActionValue("")
                            setActionModal({ isOpen: true, type: "deny", item })
                          }}
                        >
                          ✗ Deny
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

      {/* ── CREATE IMPLANT REQUEST MODAL ───────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" /> Request Implant Prior Approval
            </h3>

            <div className="space-y-3 text-sm">
              <div className="space-y-1">
                <Label>Payer / Insurer *</Label>
                <Select value={form.payer_id} onValueChange={(v) => setForm((f) => ({ ...f, payer_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select Payer" /></SelectTrigger>
                  <SelectContent>
                    {payers.map((p: any) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Device / Implant Name *</Label>
                <Input
                  placeholder="e.g. Drug Eluting Stent (DES), Cobalt Chromium Knee"
                  value={form.device_name}
                  onChange={(e) => setForm((f) => ({ ...f, device_name: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Brand / Model</Label>
                  <Input
                    placeholder="e.g. Xience Sierra"
                    value={form.brand_model}
                    onChange={(e) => setForm((f) => ({ ...f, brand_model: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Manufacturer</Label>
                  <Input
                    placeholder="e.g. Abbott, Stryker"
                    value={form.manufacturer}
                    onChange={(e) => setForm((f) => ({ ...f, manufacturer: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Barcode / Serial #</Label>
                  <Input
                    placeholder="Serial or GTIN"
                    value={form.barcode_serial}
                    onChange={(e) => setForm((f) => ({ ...f, barcode_serial: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Device Cost (₹) *</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={form.device_cost}
                    onChange={(e) => setForm((f) => ({ ...f, device_cost: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button
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
        </div>
      )}

      {/* Custom Action Modal replacing prompt */}
      {actionModal.isOpen && actionModal.item && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
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
                className="h-8 text-xs"
                placeholder={actionModal.type === "approve" ? "e.g. TPA-IMP-8821" : "e.g. Implant cost exceeds policy cap"}
                value={actionValue}
                onChange={(e) => setActionValue(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setActionModal({ isOpen: false, type: null, item: null })}>
                Cancel
              </Button>
              <Button
                size="sm"
                className={`h-7 text-xs ${actionModal.type === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"} text-white`}
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
        </div>
      )}
    </div>
  )
}
