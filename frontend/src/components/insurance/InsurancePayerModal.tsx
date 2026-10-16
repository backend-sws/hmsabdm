import React, { useState } from "react"
import { createPortal } from "react-dom"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { X, Building2, Phone, Mail, Globe, Percent, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  open: boolean
  onClose: () => void
  editingPayer?: InsurancePayer | null
  onSaved: () => void
}

const PAYER_TYPES = [
  { value: "tpa", label: "Third Party Administrator (TPA)" },
  { value: "insurance_company", label: "Insurance Company" },
  { value: "corporate", label: "Corporate / Employer" },
  { value: "cghs", label: "CGHS (Central Govt Health Scheme)" },
  { value: "esic", label: "ESIC (Employees State Insurance)" },
  { value: "pmjay", label: "AB-PMJAY (Ayushman Bharat)" },
  { value: "other", label: "Other" },
]

export const InsurancePayerModal: React.FC<Props> = ({ open, onClose, editingPayer, onSaved }) => {
  const [form, setForm] = useState({
    name: editingPayer?.name || "",
    payer_type: editingPayer?.payer_type || "tpa",
    code: editingPayer?.code || "",
    contact_person: editingPayer?.contact_person || "",
    contact_phone: editingPayer?.contact_phone || "",
    contact_email: editingPayer?.contact_email || "",
    portal_url: editingPayer?.portal_url || "",
    empanelment_number: editingPayer?.empanelment_number || "",
    empanelment_valid_till: editingPayer?.empanelment_valid_till || "",
    gst_number: editingPayer?.gst_number || "",
    pan_number: editingPayer?.pan_number || "",
    default_copay_percent: editingPayer?.default_copay_percent ?? 0,
    default_deductible: editingPayer?.default_deductible ?? 0,
    preauth_tat_hours: editingPayer?.preauth_tat_hours ?? 4,
    claim_settlement_days: editingPayer?.claim_settlement_days ?? 30,
  })

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }))

  const mutation = useMutation({
    mutationFn: (data: any) =>
      editingPayer
        ? insuranceService.updatePayer(editingPayer.id, data)
        : insuranceService.createPayer(data),
    onSuccess: () => {
      toast.success(editingPayer ? "Payer updated" : "Payer added successfully")
      onSaved()
      onClose()
    },
    onError: () => toast.error("Failed to save payer"),
  })

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-border animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">{editingPayer ? "Edit Payer" : "Add Insurance Payer / TPA"}</h2>
              <p className="text-xs text-muted-foreground">TPA, CGHS, ESIC, PMJAY, Corporate</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <Label>Payer Name *</Label>
              <Input placeholder="e.g., Medi Assist TPA Pvt Ltd" value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Payer Type *</Label>
              <Select value={form.payer_type} onValueChange={(v) => set("payer_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYER_TYPES.map((pt) => (
                    <SelectItem key={pt.value} value={pt.value}>{pt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Short Code</Label>
              <Input placeholder="e.g., MEDASSIST" value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} />
            </div>
          </div>

          {/* Contact */}
          <div className="rounded-xl border border-border/70 p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contact Details</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Contact Person</Label>
                <Input placeholder="Name" value={form.contact_person} onChange={(e) => set("contact_person", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label><Phone className="h-3 w-3 inline mr-1" />Phone</Label>
                <Input placeholder="98765 43210" value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label><Mail className="h-3 w-3 inline mr-1" />Email</Label>
                <Input type="email" placeholder="tpa@example.com" value={form.contact_email} onChange={(e) => set("contact_email", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label><Globe className="h-3 w-3 inline mr-1" />Portal URL</Label>
              <Input placeholder="https://portal.tpa.com" value={form.portal_url} onChange={(e) => set("portal_url", e.target.value)} />
            </div>
          </div>

          {/* Empanelment */}
          <div className="rounded-xl border border-border/70 p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Empanelment Details</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5 md:col-span-2">
                <Label>Empanelment / Network ID</Label>
                <Input placeholder="Hospital's network ID with this payer" value={form.empanelment_number} onChange={(e) => set("empanelment_number", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Valid Till</Label>
                <Input type="date" value={form.empanelment_valid_till} onChange={(e) => set("empanelment_valid_till", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>GST Number</Label>
                <Input placeholder="27AAAAA0000A1Z5" value={form.gst_number} onChange={(e) => set("gst_number", e.target.value.toUpperCase())} />
              </div>
              <div className="space-y-1.5">
                <Label>PAN Number</Label>
                <Input placeholder="AAAAA0000A" value={form.pan_number} onChange={(e) => set("pan_number", e.target.value.toUpperCase())} />
              </div>
            </div>
          </div>

          {/* Financial Config */}
          <div className="rounded-xl border border-border/70 p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Default Financial Config</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label><Percent className="h-3 w-3 inline mr-1" />Co-pay %</Label>
                <Input type="number" min="0" max="100" step="0.5" value={form.default_copay_percent} onChange={(e) => set("default_copay_percent", parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-1.5">
                <Label>Deductible (₹)</Label>
                <Input type="number" min="0" value={form.default_deductible} onChange={(e) => set("default_deductible", parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-1.5">
                <Label><Clock className="h-3 w-3 inline mr-1" />Pre-Auth TAT (hrs)</Label>
                <Input type="number" min="1" value={form.preauth_tat_hours} onChange={(e) => set("preauth_tat_hours", parseInt(e.target.value) || 4)} />
              </div>
              <div className="space-y-1.5">
                <Label>Settlement Days</Label>
                <Input type="number" min="1" value={form.claim_settlement_days} onChange={(e) => set("claim_settlement_days", parseInt(e.target.value) || 30)} />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate(form)}
            disabled={mutation.isPending || !form.name || !form.payer_type}
          >
            {mutation.isPending ? "Saving..." : editingPayer ? "Update Payer" : "Add Payer"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
