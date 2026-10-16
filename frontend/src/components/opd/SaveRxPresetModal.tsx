import React, { useState } from "react"
import { createPortal } from "react-dom"
import { Sparkles, X, Check, Building2, Stethoscope, Hospital } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { rxPresetService } from "@/services/rxPresetService"
import type { RxPresetScope, RxPresetMedicine, RxPreset } from "@/types/rxPreset"

interface SaveRxPresetModalProps {
  isOpen: boolean
  onClose: () => void
  medicines: RxPresetMedicine[]
  doctorId?: number | null
  doctorName?: string | null
  departmentId?: number | null
  departmentName?: string | null
  onSaved?: (preset: RxPreset) => void
}

const PRESET_ICONS = ["💊", "🌡️", "🫀", "🩺", "🩸", "🩹", "🦴", "👶", "🫁", "👁️", "👂", "🦷", "🧠", "✨"]

export const SaveRxPresetModal: React.FC<SaveRxPresetModalProps> = ({
  isOpen,
  onClose,
  medicines,
  doctorId,
  doctorName,
  departmentId,
  departmentName,
  onSaved,
}) => {
  const [name, setName] = useState("")
  const [selectedIcon, setSelectedIcon] = useState("💊")
  const [scope, setScope] = useState<RxPresetScope>("doctor")
  const [isSaving, setIsSaving] = useState(false)

  // Filter out any blank medicines
  const validMeds = medicines.filter((m) => m.medicine_name && m.medicine_name.trim() !== "")

  if (!isOpen) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("Please enter a name for this preset")
      return
    }
    if (validMeds.length === 0) {
      toast.error("At least one valid medicine is required to create a preset")
      return
    }

    setIsSaving(true)
    try {
      const saved = await rxPresetService.savePreset({
        name: name.trim(),
        icon: selectedIcon,
        scope,
        doctor_id: scope === "doctor" ? doctorId || null : null,
        doctor_name: scope === "doctor" ? doctorName || null : null,
        department_id: scope === "department" ? departmentId || null : null,
        department_name: scope === "department" ? departmentName || null : null,
        meds: validMeds,
      })

      toast.success(`Preset "${saved.name}" saved successfully under ${scope === "doctor" ? "My Presets" : scope === "department" ? "Department" : "Hospital"}!`)
      setName("")
      if (onSaved) onSaved(saved)
      onClose()
    } catch (err: any) {
      toast.error(err.message || "Failed to save preset")
    } finally {
      setIsSaving(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-0 duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-white dark:bg-card p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Save as Quick Prescription Preset</h2>
              <p className="text-xs text-muted-foreground">Save current medicines for 1-click prescribing in future visits</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Preset Name & Icon */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">Preset Name *</Label>
            <div className="flex gap-2">
              <div className="relative">
                <button
                  type="button"
                  className="flex h-9 w-12 items-center justify-center rounded-lg border border-input bg-background text-lg shadow-xs hover:border-primary"
                  title="Choose Icon"
                >
                  {selectedIcon}
                </button>
              </div>
              <Input
                placeholder="e.g. Mild Hypertension, Viral Flu Special, Post-Op Pain..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 text-sm flex-1"
                autoFocus
              />
            </div>

            {/* Quick Icon Selector */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[11px] text-muted-foreground mr-1">Choose icon:</span>
              {PRESET_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setSelectedIcon(icon)}
                  className={`h-7 w-7 rounded-md text-sm transition-transform ${
                    selectedIcon === icon ? "bg-primary/20 scale-110 ring-1 ring-primary" : "hover:bg-muted"
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* 3-Tier Scope Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">Preset Scope (Who can access this?)</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Option 1: Doctor Personal */}
              <button
                type="button"
                onClick={() => setScope("doctor")}
                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  scope === "doctor"
                    ? "border-amber-500 bg-amber-500/10 shadow-xs ring-1 ring-amber-500"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Stethoscope className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  {scope === "doctor" && <Check className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />}
                </div>
                <div className="mt-2">
                  <p className="text-xs font-bold text-foreground">⭐ My Personal</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">
                    {doctorName ? `Only Dr. ${doctorName}` : "Only you"}
                  </p>
                </div>
              </button>

              {/* Option 2: Department */}
              <button
                type="button"
                onClick={() => setScope("department")}
                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  scope === "department"
                    ? "border-purple-500 bg-purple-500/10 shadow-xs ring-1 ring-purple-500"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Building2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  {scope === "department" && <Check className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />}
                </div>
                <div className="mt-2">
                  <p className="text-xs font-bold text-foreground">🏢 Department</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">
                    {departmentName || "All in this Dept"}
                  </p>
                </div>
              </button>

              {/* Option 3: Hospital Common */}
              <button
                type="button"
                onClick={() => setScope("hospital")}
                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  scope === "hospital"
                    ? "border-blue-500 bg-blue-500/10 shadow-xs ring-1 ring-blue-500"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Hospital className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  {scope === "hospital" && <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />}
                </div>
                <div className="mt-2">
                  <p className="text-xs font-bold text-foreground">🏥 Hospital Wide</p>
                  <p className="text-[11px] text-muted-foreground">All OPD Doctors</p>
                </div>
              </button>
            </div>
          </div>

          {/* Medicines Preview in this Preset */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">Medicines included ({validMeds.length})</Label>
              <span className="text-[11px] text-muted-foreground">Pre-filled from current Rx</span>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1 rounded-xl border border-border p-2 bg-muted/20">
              {validMeds.map((m, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-white dark:bg-card border border-border/60 text-xs">
                  <div className="font-semibold text-foreground truncate">{m.medicine_name}</div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5">{m.dosage}</Badge>
                    <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-mono">{m.frequency}</Badge>
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5">{m.duration}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSaving || validMeds.length === 0} className="gap-1.5 bg-primary font-semibold">
              <Sparkles className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save Preset"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

export default SaveRxPresetModal
