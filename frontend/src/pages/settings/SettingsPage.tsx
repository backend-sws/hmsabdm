import React, { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Building2,
  Binary,
  Activity,
  UserPlus,
  Sliders,
  Save,
  Plus,
  Trash2,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Clock,
  Printer,
  Sparkles,
} from "lucide-react"

import { generateDoctorSlots } from "@/utils/slotGenerator"

import { PageHeader } from "@/components/common/PageHeader"
import { DataTable, type Column } from "@/components/common/DataTable"
import { FormContainer } from "@/components/formContainer"
import { TriageSectionsSettingsCard } from "@/components/settings/TriageSectionsSettingsCard"
import { PrescriptionPrintSettingsCard } from "@/components/settings/PrescriptionPrintSettingsCard"
import { RxPresetsSettingsCard } from "@/components/settings/RxPresetsSettingsCard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

import { settingsService } from "@/services/settingsService"
import { hospitalService } from "@/services/hospitalService"
import { useAuth } from "@/context/AuthContext"
import { queryKeys } from "@/constants/queryKeys"
import type {
  HospitalProfile,
  VitalFieldConfig,
  PatientFieldConfig,
} from "@/types/settings"

export const SettingsPage: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const hospitalId = Number(user?.hospital_id || user?.hospitalId || 1)

  // ─── Active Tab ──────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<
    "profile" | "numbering" | "vitals" | "patient_fields" | "opd_slots" | "rx_presets" | "rx_print" | "system"
  >("profile")

  // ─── Queries ────────────────────────────────────────────────────────
  // 1. Hospital Profile
  const { data: hospital, refetch: refetchHospital } = useQuery({
    queryKey: queryKeys.settings.hospital(hospitalId),
    queryFn: () => hospitalService.getHospital(hospitalId) as Promise<HospitalProfile>,
    enabled: !!hospitalId,
  })

  // 2. Numbering Sequences Overview
  const { data: numbering, refetch: refetchNumbering } = useQuery({
    queryKey: queryKeys.settings.numbering,
    queryFn: () => settingsService.getNumberingOverview(),
  })

  // 3. Dynamic Vital Configs
  const { data: vitals = [], isLoading: vitalsLoading } = useQuery({
    queryKey: queryKeys.settings.vitals,
    queryFn: () => settingsService.getVitalConfigs(),
  })

  // 4. Custom Patient Fields
  const { data: patientFields = [], isLoading: fieldsLoading } = useQuery({
    queryKey: queryKeys.settings.patientFields,
    queryFn: () => settingsService.getPatientFieldConfigs(),
  })

  // 5. System General Settings
  const { data: generalSettings, refetch: refetchGeneralSettings } = useQuery({
    queryKey: queryKeys.settings.general("general"),
    queryFn: () => settingsService.getSettings("general"),
  })

  // 6. OPD Slot Settings
  const { data: opdSlotSettings, refetch: refetchOpdSlotSettings } = useQuery({
    queryKey: ["settings", "opd_slot"],
    queryFn: () => settingsService.getSettings("opd_slot"),
  })

  const [slotSettings, setSlotSettings] = useState({
    slot_duration_minutes: 15,
    morning_start: "09:00",
    morning_end: "13:00",
    evening_start: "17:00",
    evening_end: "21:00",
    max_patients_per_slot: 1,
    allow_fifo_live_token: true,
  })

  React.useEffect(() => {
    if (opdSlotSettings && typeof opdSlotSettings === "object") {
      setSlotSettings({
        slot_duration_minutes: Number(opdSlotSettings.slot_duration_minutes || 15),
        morning_start: opdSlotSettings.morning_start || "09:00",
        morning_end: opdSlotSettings.morning_end || "13:00",
        evening_start: opdSlotSettings.evening_start || "17:00",
        evening_end: opdSlotSettings.evening_end || "21:00",
        max_patients_per_slot: Number(opdSlotSettings.max_patients_per_slot || 1),
        allow_fifo_live_token: opdSlotSettings.allow_fifo_live_token !== false,
      })
    }
  }, [opdSlotSettings])

  const saveSlotSettingsMutation = useMutation({
    mutationFn: () => settingsService.saveSettings("opd_slot", slotSettings),
    onSuccess: () => {
      toast.success("OPD Appointment Slot settings saved successfully!")
      refetchOpdSlotSettings()
    },
    onError: (err: any) => toast.error(err.message || "Failed to save slot settings"),
  })

  // ─── Tab 1: Profile Form State & Mutation ────────────────────────────
  const [profileForm, setProfileForm] = useState({
    name: "",
    code: "",
    abdm_hip_id: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  })

  React.useEffect(() => {
    if (hospital) {
      setProfileForm((prev) => {
        if (
          prev.name === (hospital.name || "") &&
          prev.code === (hospital.code || "") &&
          prev.abdm_hip_id === (hospital.abdm_hip_id || "") &&
          prev.phone === (hospital.phone || "") &&
          prev.email === (hospital.email || "") &&
          prev.address === (hospital.address || "") &&
          prev.city === (hospital.city || "") &&
          prev.state === (hospital.state || "") &&
          prev.pincode === (hospital.pincode || "")
        ) {
          return prev
        }
        return {
          name: hospital.name || "",
          code: hospital.code || "",
          abdm_hip_id: hospital.abdm_hip_id || "",
          phone: hospital.phone || "",
          email: hospital.email || "",
          address: hospital.address || "",
          city: hospital.city || "",
          state: hospital.state || "",
          pincode: hospital.pincode || "",
        }
      })
    }
  }, [hospital])

  const saveProfileMutation = useMutation({
    mutationFn: () => hospitalService.updateHospital(hospitalId, profileForm as any),
    onSuccess: () => {
      toast.success("Hospital profile & ABDM configuration updated!")
      refetchHospital()
    },
    onError: (err: any) => toast.error(err.message || "Failed to update profile"),
  })

  // ─── Tab 2: Numbering Forms State & Mutations ────────────────────────
  const [uhidForm, setUhidForm] = useState({
    uhid_prefix: "UHID",
    uhid_format: "{PREFIX}-{YEAR}-{SEQ}",
    uhid_padding: 5,
    uhid_sequence_reset: "yearly",
    uhid_next_sequence: 1,
  })
  const [opdForm, setOpdForm] = useState({
    opd_prefix: "OPD",
    opd_format: "{PREFIX}-{YEAR}-{SEQ}",
    opd_padding: 5,
    opd_sequence_reset: "yearly",
    opd_next_sequence: 1,
  })
  const [ipdForm, setIpdForm] = useState({
    ipd_prefix: "IPD",
    ipd_format: "{PREFIX}-{YEAR}-{SEQ}",
    ipd_padding: 5,
    ipd_sequence_reset: "yearly",
    ipd_next_sequence: 1,
  })

  React.useEffect(() => {
    if (numbering) {
      if (numbering.uhid) {
        setUhidForm((prev) => {
          const next = {
            uhid_prefix: numbering.uhid.prefix || numbering.uhid.uhid_prefix || "UHID",
            uhid_format: numbering.uhid.format || numbering.uhid.uhid_format || "{PREFIX}-{YEAR}-{SEQ}",
            uhid_padding: Number(numbering.uhid.padding || numbering.uhid.uhid_padding || 5),
            uhid_sequence_reset: numbering.uhid.sequence_reset || "yearly",
            uhid_next_sequence: Number(numbering.uhid.next_sequence || 1),
          }
          return JSON.stringify(prev) === JSON.stringify(next) ? prev : next
        })
      }
      // Backend returns 'opd' key, frontend also accepts 'opd_number'
      const opdData = numbering.opd_number || (numbering as any).opd
      if (opdData) {
        setOpdForm((prev) => {
          const next = {
            opd_prefix: opdData.prefix || opdData.opd_prefix || "OPD",
            opd_format: opdData.format || opdData.opd_format || "{PREFIX}-{YEAR}-{SEQ}",
            opd_padding: Number(opdData.padding || opdData.opd_padding || 5),
            opd_sequence_reset: opdData.sequence_reset || "daily",
            opd_next_sequence: Number(opdData.next_sequence || 1),
          }
          return JSON.stringify(prev) === JSON.stringify(next) ? prev : next
        })
      }
      // Backend returns 'ipd' key, frontend also accepts 'ipd_number'
      const ipdData = numbering.ipd_number || (numbering as any).ipd
      if (ipdData) {
        setIpdForm((prev) => {
          const next = {
            ipd_prefix: ipdData.prefix || ipdData.ipd_prefix || "IPD",
            ipd_format: ipdData.format || ipdData.ipd_format || "{PREFIX}-{YEAR}-{SEQ}",
            ipd_padding: Number(ipdData.padding || ipdData.ipd_padding || 5),
            ipd_sequence_reset: ipdData.sequence_reset || "yearly",
            ipd_next_sequence: Number(ipdData.next_sequence || 1),
          }
          return JSON.stringify(prev) === JSON.stringify(next) ? prev : next
        })
      }
    }
  }, [numbering])

  const saveUhidMutation = useMutation({
    mutationFn: () => settingsService.updateUhidConfig(uhidForm),
    onSuccess: () => {
      toast.success("UHID format updated!")
      refetchNumbering()
    },
    onError: (err: any) => toast.error(err.message || "Failed to update UHID format"),
  })

  const saveOpdMutation = useMutation({
    mutationFn: () => settingsService.updateOpdConfig(opdForm),
    onSuccess: () => {
      toast.success("OPD Visit Number format updated!")
      refetchNumbering()
    },
    onError: (err: any) => toast.error(err.message || "Failed to update OPD format"),
  })

  const saveIpdMutation = useMutation({
    mutationFn: () => settingsService.updateIpdConfig(ipdForm),
    onSuccess: () => {
      toast.success("IPD Admission Number format updated!")
      refetchNumbering()
    },
    onError: (err: any) => toast.error(err.message || "Failed to update IPD format"),
  })

  // ─── Tab 3: Dynamic Vitals Modal & Mutation ──────────────────────────
  const [vitalModalOpen, setVitalModalOpen] = useState(false)
  const [editingVitalId, setEditingVitalId] = useState<number | null>(null)
  const [vitalPayload, setVitalPayload] = useState({
    field_key: "",
    label: "",
    unit: "",
    input_type: "number" as "number" | "text" | "select" | "boolean",
    options_text: "",
    min_value: undefined as number | undefined,
    max_value: undefined as number | undefined,
    is_required: false,
  })

  const createVitalMutation = useMutation({
    mutationFn: () => {
      const options =
        vitalPayload.input_type === "select"
          ? vitalPayload.options_text
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined

      return settingsService.createVitalConfig({
        field_key: vitalPayload.field_key.trim(),
        label: vitalPayload.label.trim(),
        unit: vitalPayload.input_type === "number" ? vitalPayload.unit?.trim() || undefined : undefined,
        input_type: vitalPayload.input_type,
        options: options && options.length > 0 ? options : undefined,
        min_value: vitalPayload.input_type === "number" ? vitalPayload.min_value : undefined,
        max_value: vitalPayload.input_type === "number" ? vitalPayload.max_value : undefined,
        is_required: vitalPayload.is_required,
      })
    },
    onSuccess: () => {
      toast.success("Vital metric configured!")
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.vitals })
      setVitalModalOpen(false)
      setEditingVitalId(null)
      setVitalPayload({
        field_key: "",
        label: "",
        unit: "",
        input_type: "number",
        options_text: "",
        min_value: undefined,
        max_value: undefined,
        is_required: false,
      })
    },
    onError: (err: any) => toast.error(err.message || "Failed to create vital metric"),
  })

  const updateVitalMutation = useMutation({
    mutationFn: () => {
      if (!editingVitalId) throw new Error("No vital metric selected to update")
      const options =
        vitalPayload.input_type === "select"
          ? vitalPayload.options_text
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined

      return settingsService.updateVitalConfig(editingVitalId, {
        field_key: vitalPayload.field_key.trim(),
        label: vitalPayload.label.trim(),
        unit: vitalPayload.input_type === "number" ? vitalPayload.unit?.trim() || undefined : undefined,
        input_type: vitalPayload.input_type,
        options: options && options.length > 0 ? options : undefined,
        min_value: vitalPayload.input_type === "number" ? vitalPayload.min_value : undefined,
        max_value: vitalPayload.input_type === "number" ? vitalPayload.max_value : undefined,
        is_required: vitalPayload.is_required,
      })
    },
    onSuccess: () => {
      toast.success("Vital parameter updated successfully!")
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.vitals })
      setVitalModalOpen(false)
      setEditingVitalId(null)
      setVitalPayload({
        field_key: "",
        label: "",
        unit: "",
        input_type: "number",
        options_text: "",
        min_value: undefined,
        max_value: undefined,
        is_required: false,
      })
    },
    onError: (err: any) => toast.error(err.message || "Failed to update vital metric"),
  })

  const deleteVitalMutation = useMutation({
    mutationFn: (id: number) => settingsService.deleteVitalConfig(id),
    onSuccess: () => {
      toast.success("Vital parameter removed")
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.vitals })
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete vital"),
  })

  // ─── Tab 4: Custom Patient Fields Modal & Mutation ───────────────────
  const [fieldModalOpen, setFieldModalOpen] = useState(false)
  const [editingField, setEditingField] = useState<PatientFieldConfig | null>(null)
  const [fieldPayload, setFieldPayload] = useState({
    field_key: "",
    label: "",
    input_type: "text" as "text" | "number" | "select" | "date" | "boolean",
    options_text: "",
    placeholder: "",
    is_required: false,
  })

  const createFieldMutation = useMutation({
    mutationFn: () => {
      const options =
        fieldPayload.input_type === "select"
          ? fieldPayload.options_text
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined

      return settingsService.createPatientFieldConfig({
        field_key: fieldPayload.field_key.trim(),
        field_name: fieldPayload.field_key.trim(),
        label: fieldPayload.label.trim(),
        input_type: fieldPayload.input_type,
        field_type: fieldPayload.input_type,
        options: options && options.length > 0 ? options : undefined,
        placeholder: fieldPayload.placeholder?.trim() || undefined,
        is_required: fieldPayload.is_required,
      })
    },
    onSuccess: () => {
      toast.success("Patient registration field added!")
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.patientFields })
      setFieldModalOpen(false)
      setEditingField(null)
      setFieldPayload({
        field_key: "",
        label: "",
        input_type: "text",
        options_text: "",
        placeholder: "",
        is_required: false,
      })
    },
    onError: (err: any) => toast.error(err.message || "Failed to add field"),
  })

  const updateFieldMutation = useMutation({
    mutationFn: () => {
      if (!editingField) return Promise.reject(new Error("No field selected for update"))
      const options =
        fieldPayload.input_type === "select"
          ? fieldPayload.options_text
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined

      return settingsService.updatePatientFieldConfig(editingField.id, {
        field_key: fieldPayload.field_key.trim(),
        label: fieldPayload.label.trim(),
        input_type: fieldPayload.input_type,
        options: options && options.length > 0 ? options : undefined,
        placeholder: fieldPayload.placeholder?.trim() || undefined,
        is_required: fieldPayload.is_required,
      })
    },
    onSuccess: () => {
      toast.success("Patient registration field updated!")
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.patientFields })
      setFieldModalOpen(false)
      setEditingField(null)
      setFieldPayload({
        field_key: "",
        label: "",
        input_type: "text",
        options_text: "",
        placeholder: "",
        is_required: false,
      })
    },
    onError: (err: any) => toast.error(err.message || "Failed to update field"),
  })

  const deleteFieldMutation = useMutation({
    mutationFn: (id: number) => settingsService.deletePatientFieldConfig(id),
    onSuccess: () => {
      toast.success("Patient field removed")
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.patientFields })
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete field"),
  })

  // ─── Tab 5: General System Settings State & Mutation ─────────────────
  const [systemSettings, setSystemSettings] = useState<Record<string, any>>({})
  React.useEffect(() => {
    if (generalSettings && typeof generalSettings === "object") {
      setSystemSettings((prev) => {
        return JSON.stringify(prev) === JSON.stringify(generalSettings) ? prev : generalSettings
      })
    }
  }, [generalSettings])

  const saveSystemSettingsMutation = useMutation({
    mutationFn: () => settingsService.saveSettings("general", systemSettings),
    onSuccess: () => {
      toast.success("System & print preferences saved!")
      refetchGeneralSettings()
    },
    onError: (err: any) => toast.error(err.message || "Failed to save settings"),
  })

  // ─── Table Columns: Vitals ───────────────────────────────────────────
  const vitalsColumns: Column<VitalFieldConfig>[] = [
    {
      key: "label",
      header: "Vital Parameter",
      cell: (row) => (
        <div>
          <span className="font-semibold text-foreground text-xs">{row.label}</span>
          <span className="block text-[10px] text-muted-foreground font-mono">{row.field_key}</span>
        </div>
      ),
    },
    {
      key: "input_type",
      header: "Type & Options",
      className: "w-[180px]",
      cell: (row) => (
        <div className="space-y-1">
          <Badge variant="outline" className="capitalize text-[10px] font-mono">
            {row.input_type || "number"}
          </Badge>
          {row.input_type === "select" && row.options && Array.isArray(row.options) && row.options.length > 0 && (
            <div className="flex flex-wrap gap-1 max-w-[180px]">
              {row.options.map((opt, i) => (
                <span
                  key={i}
                  className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20 font-medium"
                >
                  {opt}
                </span>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "unit",
      header: "Standard Unit",
      className: "w-[110px]",
      cell: (row) => (
        <Badge variant="outline" className="font-mono text-[10px]">
          {row.unit || "--"}
        </Badge>
      ),
    },
    {
      key: "range",
      header: "Normal Clinical Range",
      className: "w-[150px]",
      cell: (row) => {
        if (row.input_type === "select") {
          return <span className="text-[11px] text-muted-foreground italic">Dropdown choices</span>
        }
        if (row.input_type === "boolean") {
          return <span className="text-[11px] text-muted-foreground italic">Yes / No</span>
        }
        if (row.input_type === "text") {
          return <span className="text-[11px] text-muted-foreground italic">Free text</span>
        }
        return (
          <span className="text-xs font-mono text-muted-foreground">
            {row.min_value !== undefined && row.min_value !== null ? row.min_value : "--"} –{" "}
            {row.max_value !== undefined && row.max_value !== null ? row.max_value : "--"}
          </span>
        )
      },
    },
    {
      key: "required",
      header: "Required?",
      className: "w-[95px]",
      cell: (row) =>
        row.is_required ? (
          <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 text-[10px]">
            Mandatory
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] text-muted-foreground">
            Optional
          </Badge>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-[90px] text-right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Edit vital parameter"
            onClick={() => {
              setEditingVitalId(row.id)
              setVitalPayload({
                field_key: row.field_key || (row as any).field_name || "",
                label: row.label || (row as any).field_label || "",
                unit: row.unit || "",
                input_type: (row.input_type || (row as any).field_type || "number") as any,
                options_text: Array.isArray(row.options) ? row.options.join(", ") : "",
                min_value: row.min_value !== undefined && row.min_value !== null ? Number(row.min_value) : undefined,
                max_value: row.max_value !== undefined && row.max_value !== null ? Number(row.max_value) : undefined,
                is_required: Boolean(row.is_required),
              })
              setVitalModalOpen(true)
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
            title="Remove vital parameter"
            onClick={() => {
              if (confirm(`Remove vital metric "${row.label}"?`)) {
                deleteVitalMutation.mutate(row.id)
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  // ─── Table Columns: Custom Patient Fields ────────────────────────────
  const fieldsColumns: Column<PatientFieldConfig>[] = [
    {
      key: "label",
      header: "Field Label",
      cell: (row) => (
        <div>
          <span className="font-semibold text-foreground text-xs">{row.label}</span>
          <span className="block text-[10px] text-muted-foreground font-mono">
            {row.field_key || row.field_name}
          </span>
        </div>
      ),
    },
    {
      key: "type",
      header: "Input Type & Choices",
      className: "w-[220px]",
      cell: (row) => (
        <div className="space-y-1">
          <Badge variant="outline" className="capitalize text-[10px] font-mono">
            {row.input_type || row.field_type || "text"}
          </Badge>
          {row.options && Array.isArray(row.options) && row.options.length > 0 && (
            <div className="flex flex-wrap gap-1 max-w-[220px]">
              {row.options.map((opt, i) => (
                <span
                  key={i}
                  className="text-[9px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded border border-border font-medium"
                >
                  {opt}
                </span>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "required",
      header: "Requirement",
      className: "w-[110px]",
      cell: (row) =>
        row.is_required ? (
          <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 text-[10px]">
            Mandatory
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] text-muted-foreground">
            Optional
          </Badge>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-[90px] text-right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
            title="Edit Field"
            onClick={() => {
              setEditingField(row)
              setFieldPayload({
                field_key: row.field_key || row.field_name || "",
                label: row.label || "",
                input_type: (row.input_type || row.field_type || "text") as any,
                options_text: Array.isArray(row.options) ? row.options.join(", ") : "",
                placeholder: row.placeholder || "",
                is_required: Boolean(row.is_required),
              })
              setFieldModalOpen(true)
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
            title="Delete Field"
            onClick={() => {
              if (confirm(`Remove field "${row.label}"?`)) {
                deleteFieldMutation.mutate(row.id)
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* ────────────────────────────────────────────────────────────────
          TOP BAR: PAGE HEADER
         ──────────────────────────────────────────────────────────────── */}
      <PageHeader
        title="Hospital System Settings & ABDM Config"
        subtitle="Manage facility credentials, ABDM gateway integration, document numbering rules & dynamic clinical parameters"
        badgeText="Admin Configuration"
        badgeVariant="default"
      />

      {/* ────────────────────────────────────────────────────────────────
          NAVIGATION TABS (Non-scrolling 4x2 Responsive Grid - All 8 visible upfront)
         ──────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          { id: "profile", label: "Hospital Profile & ABDM", desc: "Facility ID & HIP Config", icon: Building2 },
          { id: "numbering", label: "Document Numbering", desc: "UHID, OPD, IPD Sequences", icon: Binary },
          { id: "vitals", label: "Clinical Vitals Master", desc: "Dynamic Vitals & Range", icon: Activity, badge: vitals.length },
          { id: "patient_fields", label: "Patient Demographics", desc: "Registration Fields", icon: UserPlus },
          { id: "opd_slots", label: "OPD Slot Config", desc: "Doctor Timings & Duration", icon: Clock },
          { id: "rx_print", label: "Prescription Print", desc: "Rx Layout & Header/Footer", icon: Printer },
          { id: "rx_presets", label: "Rx Presets & Templates", desc: "3-Tier Clinical Engine", icon: Sparkles, isSpecial: true, badge: "Clinical" },
          { id: "system", label: "System Preferences", desc: "Hospital Rules & Options", icon: Sliders },
        ].map((tab) => {
          const isActive = activeTab === tab.id
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`group flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                isActive
                  ? tab.isSpecial
                    ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 shadow-xs ring-1 ring-amber-500/40"
                    : "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary/40"
                  : "border-slate-200/90 dark:border-border/70 bg-card text-muted-foreground hover:bg-slate-50 dark:hover:bg-muted/40 hover:text-foreground hover:border-slate-300"
              }`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  isActive
                    ? tab.isSpecial
                      ? "bg-amber-500 text-white shadow-2xs"
                      : "bg-primary text-primary-foreground shadow-2xs"
                    : "bg-slate-100 dark:bg-muted text-muted-foreground group-hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 justify-between">
                  <p
                    className={`text-xs font-bold leading-tight truncate ${
                      isActive ? "text-foreground" : "text-foreground/85 group-hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </p>
                  {tab.badge !== undefined && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${
                        isActive
                          ? tab.isSpecial
                            ? "bg-amber-500 text-white"
                            : "bg-primary text-primary-foreground"
                          : "bg-slate-200/80 dark:bg-muted text-muted-foreground"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </div>
                <p className="text-[10.5px] text-muted-foreground truncate mt-0.5">
                  {tab.desc}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {/* ════════════════════════════════════════════════════════════════
          TAB 1: HOSPITAL PROFILE & ABDM HIP
         ════════════════════════════════════════════════════════════════ */}
      {activeTab === "profile" && (
        <div className="w-full space-y-5">
          <div className="p-5 rounded-xl border border-border bg-card space-y-4 text-xs">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-sm text-foreground">
                  Hospital Identity & National Facility Registry
                </h3>
                <p className="text-muted-foreground text-xs mt-0.5">
                  General identification, contact details, and Ayushman Bharat Digital Mission HIP ID.
                </p>
              </div>
              {profileForm.abdm_hip_id ? (
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 gap-1 text-[11px]">
                  <ShieldCheck className="h-3.5 w-3.5" /> ABDM Linked
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-600 border-amber-300 text-[11px]">
                  ABDM HIP Pending
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Hospital Name *</Label>
                <Input
                  value={profileForm.name || ""}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  placeholder="e.g. City Multi-Speciality Hospital"
                  className="mt-1 text-xs font-semibold"
                />
              </div>

              <div>
                <Label>Hospital Code / Short Name *</Label>
                <Input
                  value={profileForm.code || ""}
                  onChange={(e) => setProfileForm({ ...profileForm, code: e.target.value })}
                  placeholder="e.g. CITY"
                  className="mt-1 text-xs font-mono"
                />
              </div>
            </div>

            {/* ABDM HIP Configuration */}
            <div className="p-3.5 rounded-xl border border-sky-500/30 bg-sky-500/5 space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-sky-600" />
                <Label className="font-bold text-xs uppercase tracking-wider text-sky-800 dark:text-sky-300">
                  ABDM Health Information Provider (HIP ID)
                </Label>
              </div>
              <Input
                value={profileForm.abdm_hip_id || ""}
                onChange={(e) => setProfileForm({ ...profileForm, abdm_hip_id: e.target.value })}
                placeholder="e.g. IN0110000042 (National Health Facility Registry ID)"
                className="text-xs font-mono bg-background"
              />
              <p className="text-[10px] text-muted-foreground">
                Required for ABDM Milestone 1, 2 & 3 compliance: QR Scan & Share token processing,
                FHIR Care Context Linking, and Consent Artefact verification.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Official Contact Phone</Label>
                <Input
                  value={profileForm.phone || ""}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label>Official Support Email</Label>
                <Input
                  value={profileForm.email || ""}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  placeholder="admin@hospital.com"
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div>
              <Label>Facility Street Address</Label>
              <Input
                value={profileForm.address || ""}
                onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                placeholder="Building, Road, Landmark"
                className="mt-1 text-xs"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>City</Label>
                <Input
                  value={profileForm.city || ""}
                  onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                  placeholder="e.g. New Delhi"
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label>State</Label>
                <Input
                  value={profileForm.state || ""}
                  onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })}
                  placeholder="e.g. Delhi"
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label>Pin Code</Label>
                <Input
                  value={profileForm.pincode || ""}
                  onChange={(e) => setProfileForm({ ...profileForm, pincode: e.target.value })}
                  placeholder="110001"
                  className="mt-1 text-xs font-mono"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                onClick={() => saveProfileMutation.mutate()}
                disabled={saveProfileMutation.isPending}
                className="gap-2"
              >
                {saveProfileMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Hospital Profile
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB 2: DOCUMENT & NUMBERING FORMATS
         ════════════════════════════════════════════════════════════════ */}
      {activeTab === "numbering" && (
        <div className="w-full space-y-5">
          <p className="text-xs text-muted-foreground">
            Configure dynamic numbering sequences, auto-increment resets, and formatting templates.
            All sequences update live in reception, OPD, and IPD desks.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. UHID FORMAT */}
            <div className="p-4 rounded-xl border border-border bg-card space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-sm text-foreground">1. Patient UHID</span>
                <Badge variant="outline" className="font-mono text-[10px]">
                  UHID
                </Badge>
              </div>

              <div>
                <Label>Prefix</Label>
                <Input
                  value={uhidForm.uhid_prefix}
                  onChange={(e) => setUhidForm({ ...uhidForm, uhid_prefix: e.target.value })}
                  placeholder="UHID"
                  className="mt-1 text-xs font-mono uppercase"
                />
              </div>

              <div>
                <Label>Format Pattern</Label>
                <Input
                  value={uhidForm.uhid_format}
                  onChange={(e) => setUhidForm({ ...uhidForm, uhid_format: e.target.value })}
                  placeholder="{PREFIX}-{YEAR}-{SEQ}"
                  className="mt-1 text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Padding Digits</Label>
                  <Input
                    type="number"
                    min={3}
                    max={8}
                    value={uhidForm.uhid_padding}
                    onChange={(e) =>
                      setUhidForm({ ...uhidForm, uhid_padding: Number(e.target.value) })
                    }
                    className="mt-1 text-xs font-mono"
                  />
                </div>
                <div>
                  <Label>Sequence Reset</Label>
                  <select
                    value={uhidForm.uhid_sequence_reset}
                    onChange={(e) =>
                      setUhidForm({ ...uhidForm, uhid_sequence_reset: e.target.value })
                    }
                    className="w-full text-xs rounded-md border border-input bg-background px-2 py-2 mt-1"
                  >
                    <option value="yearly">Yearly</option>
                    <option value="monthly">Monthly</option>
                    <option value="never">Never (Continuous)</option>
                  </select>
                </div>
              </div>

              <div className="p-2.5 rounded-lg border bg-muted/30">
                <span className="text-[10px] text-muted-foreground block">LIVE SAMPLE PREVIEW:</span>
                <span className="font-mono font-bold text-primary text-xs">
                  {numbering?.uhid?.sample_preview ||
                    `${uhidForm.uhid_prefix}-2026-${"0".repeat(uhidForm.uhid_padding - 1)}1`}
                </span>
              </div>

              <Button
                size="sm"
                onClick={() => saveUhidMutation.mutate()}
                disabled={saveUhidMutation.isPending}
                className="w-full text-xs gap-1"
              >
                {saveUhidMutation.isPending && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                Save UHID Format
              </Button>
            </div>

            {/* 2. OPD NUMBER FORMAT */}
            <div className="p-4 rounded-xl border border-border bg-card space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-sm text-foreground">2. OPD Visit Number</span>
                <Badge variant="outline" className="font-mono text-[10px]">
                  OPD
                </Badge>
              </div>

              <div>
                <Label>Prefix</Label>
                <Input
                  value={opdForm.opd_prefix}
                  onChange={(e) => setOpdForm({ ...opdForm, opd_prefix: e.target.value })}
                  placeholder="OPD"
                  className="mt-1 text-xs font-mono uppercase"
                />
              </div>

              <div>
                <Label>Format Pattern</Label>
                <Input
                  value={opdForm.opd_format}
                  onChange={(e) => setOpdForm({ ...opdForm, opd_format: e.target.value })}
                  placeholder="{PREFIX}-{YEAR}-{SEQ}"
                  className="mt-1 text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Padding Digits</Label>
                  <Input
                    type="number"
                    min={3}
                    max={8}
                    value={opdForm.opd_padding}
                    onChange={(e) =>
                      setOpdForm({ ...opdForm, opd_padding: Number(e.target.value) })
                    }
                    className="mt-1 text-xs font-mono"
                  />
                </div>
                <div>
                  <Label>Sequence Reset</Label>
                  <select
                    value={opdForm.opd_sequence_reset}
                    onChange={(e) =>
                      setOpdForm({ ...opdForm, opd_sequence_reset: e.target.value })
                    }
                    className="w-full text-xs rounded-md border border-input bg-background px-2 py-2 mt-1"
                  >
                    <option value="daily">Daily</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="never">Never</option>
                  </select>
                </div>
              </div>

              <div className="p-2.5 rounded-lg border bg-muted/30">
                <span className="text-[10px] text-muted-foreground block">LIVE SAMPLE PREVIEW:</span>
                <span className="font-mono font-bold text-primary text-xs">
                  {numbering?.opd_number?.sample_preview ||
                    `${opdForm.opd_prefix}-2026-${"0".repeat(opdForm.opd_padding - 1)}1`}
                </span>
              </div>

              <Button
                size="sm"
                onClick={() => saveOpdMutation.mutate()}
                disabled={saveOpdMutation.isPending}
                className="w-full text-xs gap-1"
              >
                {saveOpdMutation.isPending && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                Save OPD Format
              </Button>
            </div>

            {/* 3. IPD ADMISSION FORMAT */}
            <div className="p-4 rounded-xl border border-border bg-card space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-sm text-foreground">3. IPD Admission No.</span>
                <Badge variant="outline" className="font-mono text-[10px]">
                  IPD
                </Badge>
              </div>

              <div>
                <Label>Prefix</Label>
                <Input
                  value={ipdForm.ipd_prefix}
                  onChange={(e) => setIpdForm({ ...ipdForm, ipd_prefix: e.target.value })}
                  placeholder="IPD"
                  className="mt-1 text-xs font-mono uppercase"
                />
              </div>

              <div>
                <Label>Format Pattern</Label>
                <Input
                  value={ipdForm.ipd_format}
                  onChange={(e) => setIpdForm({ ...ipdForm, ipd_format: e.target.value })}
                  placeholder="{PREFIX}-{YEAR}-{SEQ}"
                  className="mt-1 text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Padding Digits</Label>
                  <Input
                    type="number"
                    min={3}
                    max={8}
                    value={ipdForm.ipd_padding}
                    onChange={(e) =>
                      setIpdForm({ ...ipdForm, ipd_padding: Number(e.target.value) })
                    }
                    className="mt-1 text-xs font-mono"
                  />
                </div>
                <div>
                  <Label>Sequence Reset</Label>
                  <select
                    value={ipdForm.ipd_sequence_reset}
                    onChange={(e) =>
                      setIpdForm({ ...ipdForm, ipd_sequence_reset: e.target.value })
                    }
                    className="w-full text-xs rounded-md border border-input bg-background px-2 py-2 mt-1"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="never">Never</option>
                  </select>
                </div>
              </div>

              <div className="p-2.5 rounded-lg border bg-muted/30">
                <span className="text-[10px] text-muted-foreground block">LIVE SAMPLE PREVIEW:</span>
                <span className="font-mono font-bold text-primary text-xs">
                  {numbering?.ipd_number?.sample_preview ||
                    `${ipdForm.ipd_prefix}-2026-${"0".repeat(ipdForm.ipd_padding - 1)}1`}
                </span>
              </div>

              <Button
                size="sm"
                onClick={() => saveIpdMutation.mutate()}
                disabled={saveIpdMutation.isPending}
                className="w-full text-xs gap-1"
              >
                {saveIpdMutation.isPending && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                Save IPD Format
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB 3: CLINICAL VITALS MASTER
         ════════════════════════════════════════════════════════════════ */}
      {activeTab === "vitals" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm text-foreground">
                Hospital Dynamic Vitals Baseline Parameters
              </h3>
              <p className="text-muted-foreground text-xs mt-0.5">
                Define vital signs collected at Triage, OPD Consultation, and IPD Nursing Charts.
              </p>
            </div>
            <Button
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => {
                setEditingVitalId(null)
                setVitalPayload({
                  field_key: "",
                  label: "",
                  unit: "",
                  input_type: "number",
                  options_text: "",
                  min_value: undefined,
                  max_value: undefined,
                  is_required: false,
                })
                setVitalModalOpen(true)
              }}
            >
              <Plus className="h-4 w-4" /> Add Vital Metric
            </Button>
          </div>

          <DataTable
            columns={vitalsColumns}
            data={vitals}
            isLoading={vitalsLoading}
            rowKey="id"
            emptyTitle="No Custom Vitals Configured"
            emptyDescription="Standard baseline vitals will be applied by default."
          />

          <TriageSectionsSettingsCard />
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB 4: CUSTOM PATIENT REGISTRATION FIELDS
         ════════════════════════════════════════════════════════════════ */}
      {activeTab === "patient_fields" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm text-foreground">
                Dynamic Patient Registration Demographic Fields
              </h3>
              <p className="text-muted-foreground text-xs mt-0.5">
                Customize additional intake fields collected during walk-in patient registration.
              </p>
            </div>
            <Button
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => {
                setEditingField(null)
                setFieldPayload({
                  field_key: "",
                  label: "",
                  input_type: "text",
                  options_text: "",
                  placeholder: "",
                  is_required: false,
                })
                setFieldModalOpen(true)
              }}
            >
              <Plus className="h-4 w-4" /> Add Intake Field
            </Button>
          </div>

          <DataTable
            columns={fieldsColumns}
            data={patientFields}
            isLoading={fieldsLoading}
            rowKey="id"
            emptyTitle="No Custom Fields"
            emptyDescription="Using default core demographics (Name, Age, Gender, Mobile, Address)."
          />
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB 5: SYSTEM & PRINT PREFERENCES
         ════════════════════════════════════════════════════════════════ */}
      {activeTab === "system" && (
        <div className="w-full space-y-5">
          <div className="p-5 rounded-xl border border-border bg-card space-y-4 text-xs">
            <div>
              <h3 className="font-bold text-sm text-foreground">
                Hospital Print Header & System Preferences
              </h3>
              <p className="text-muted-foreground text-xs mt-0.5">
                Settings applied across printed prescriptions, OPD visit slips, and tax invoices.
              </p>
            </div>

            <div>
              <Label>Hospital Motto / Tagline</Label>
              <Input
                value={systemSettings.hospital_tagline || ""}
                onChange={(e) =>
                  setSystemSettings({ ...systemSettings, hospital_tagline: e.target.value })
                }
                placeholder="e.g. Committed to Compassionate Healthcare & Excellence"
                className="mt-1 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Emergency Hotline Number</Label>
                <Input
                  value={systemSettings.emergency_contact || ""}
                  onChange={(e) =>
                    setSystemSettings({ ...systemSettings, emergency_contact: e.target.value })
                  }
                  placeholder="e.g. 102 / 011-23456789"
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label>Currency Symbol / Code</Label>
                <Input
                  value={systemSettings.currency || "INR (₹)"}
                  onChange={(e) =>
                    setSystemSettings({ ...systemSettings, currency: e.target.value })
                  }
                  placeholder="INR (₹)"
                  className="mt-1 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <Label>Prescription / Discharge Slip Disclaimer</Label>
              <textarea
                rows={3}
                value={systemSettings.prescription_disclaimer || ""}
                onChange={(e) =>
                  setSystemSettings({
                    ...systemSettings,
                    prescription_disclaimer: e.target.value,
                  })
                }
                placeholder="e.g. This is a computer-generated medical document. Not valid for medico-legal claims without doctor signature."
                className="w-full text-xs rounded-md border border-input bg-background p-2.5 mt-1"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                onClick={() => saveSystemSettingsMutation.mutate()}
                disabled={saveSystemSettingsMutation.isPending}
                className="gap-2"
              >
                {saveSystemSettingsMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Print & System Preferences
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB: PRESCRIPTION (RX) PRINT TEMPLATE
         ════════════════════════════════════════════════════════════════ */}
      {activeTab === "rx_print" && (
        <div className="w-full">
          <PrescriptionPrintSettingsCard />
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB 6: OPD & APPOINTMENT SLOT SETTINGS
         ════════════════════════════════════════════════════════════════ */}
      {activeTab === "opd_slots" && (
        <div className="w-full space-y-6">
          <div className="p-6 rounded-xl border border-border bg-card space-y-6 text-xs shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" /> OPD Appointment Slot Engine
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure consultation slot intervals (5 min to 60 min), shift durations, and FIFO walk-in rules.
                </p>
              </div>
              <Badge variant="outline" className="border-primary/40 text-primary w-fit font-mono">
                Active Slot: {slotSettings.slot_duration_minutes} Mins
              </Badge>
            </div>

            {/* 1. Slot Duration Interval Selection */}
            <div className="space-y-3">
              <Label className="text-xs font-semibold text-foreground">
                Consultation Slot Duration (Minutes) *
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                {[5, 10, 15, 20, 30, 45, 60].map((mins) => {
                  const isSelected = slotSettings.slot_duration_minutes === mins
                  return (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setSlotSettings({ ...slotSettings, slot_duration_minutes: mins })}
                      className={`py-3 px-3 rounded-xl border text-center transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary font-bold shadow-xs ring-2 ring-primary/40"
                          : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      }`}
                    >
                      <span className="text-base font-bold block">{mins}m</span>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                        {mins <= 10 ? "Fast Track" : mins <= 20 ? "Standard" : "Extended"}
                      </span>
                    </button>
                  )
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Determines the granularity of time slots generated during patient walk-in intake and appointments.
              </p>
            </div>

            {/* 2. OPD Operating Sessions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Morning OPD Session</span>
                  <Badge variant="secondary" className="text-[10px]">Shift 1</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px]">Start Time</Label>
                    <Input
                      type="time"
                      value={slotSettings.morning_start}
                      onChange={(e) => setSlotSettings({ ...slotSettings, morning_start: e.target.value })}
                      className="mt-1 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">End Time</Label>
                    <Input
                      type="time"
                      value={slotSettings.morning_end}
                      onChange={(e) => setSlotSettings({ ...slotSettings, morning_end: e.target.value })}
                      className="mt-1 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Evening OPD Session</span>
                  <Badge variant="secondary" className="text-[10px]">Shift 2</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px]">Start Time</Label>
                    <Input
                      type="time"
                      value={slotSettings.evening_start}
                      onChange={(e) => setSlotSettings({ ...slotSettings, evening_start: e.target.value })}
                      className="mt-1 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">End Time</Label>
                    <Input
                      type="time"
                      value={slotSettings.evening_end}
                      onChange={(e) => setSlotSettings({ ...slotSettings, evening_end: e.target.value })}
                      className="mt-1 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Capacity & Overbooking Rules */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              <div>
                <Label className="text-xs font-semibold">Max Patients Per Slot</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={slotSettings.max_patients_per_slot}
                  onChange={(e) => setSlotSettings({ ...slotSettings, max_patients_per_slot: Number(e.target.value) || 1 })}
                  className="mt-1 text-xs font-mono max-w-xs"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Default is 1 patient per slot. Set to 2 or 3 to allow simultaneous parallel intake.
                </p>
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={slotSettings.allow_fifo_live_token}
                    onChange={(e) => setSlotSettings({ ...slotSettings, allow_fifo_live_token: e.target.checked })}
                    className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                  />
                  <div>
                    <span className="font-semibold text-foreground block">
                      Enable "Live Queue (FIFO Next Available Token)"
                    </span>
                    <span className="text-[11px] text-muted-foreground block">
                      Provides walk-in receptionists a fast option to issue live FIFO queue tokens without picking a time slot.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* 4. Live Slot Generator Simulator Preview */}
            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-primary flex items-center gap-1.5 text-xs">
                  ⚡ Live Dynamic Slot Simulator ({slotSettings.slot_duration_minutes}m Interval Preview)
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Simulating with {slotSettings.morning_start} to {slotSettings.morning_end}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
                {generateDoctorSlots({
                  startTime: slotSettings.morning_start,
                  endTime: slotSettings.morning_end,
                  slotDurationMinutes: slotSettings.slot_duration_minutes,
                  includeLiveToken: slotSettings.allow_fifo_live_token,
                }).map((slot, idx) => (
                  <span
                    key={idx}
                    className={`text-[10px] px-2.5 py-1 rounded-lg border font-mono ${
                      slot.isLiveToken
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 font-semibold"
                        : "bg-background text-foreground border-border"
                    }`}
                  >
                    {slot.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                onClick={() => saveSlotSettingsMutation.mutate()}
                disabled={saveSlotSettingsMutation.isPending}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saveSlotSettingsMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save OPD Slot Configuration
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB: 3-TIER RX PRESETS & TEMPLATES
         ════════════════════════════════════════════════════════════════ */}
      {activeTab === "rx_presets" && (
        <div className="w-full space-y-6">
          <RxPresetsSettingsCard />
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────
          MODAL: ADD / EDIT VITAL METRIC
         ──────────────────────────────────────────────────────────────── */}
      <FormContainer
        open={vitalModalOpen}
        onOpenChange={(isOpen) => {
          setVitalModalOpen(isOpen)
          if (!isOpen) setEditingVitalId(null)
        }}
        title={editingVitalId ? "Edit Hospital Vital Sign Metric" : "Add Hospital Vital Sign Metric"}
        description={
          editingVitalId
            ? "Modify clinical parameter ranges, units, and dropdown options"
            : "Configure dynamic clinical parameter for nurse stations and doctor consults"
        }
        size="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button
              variant="outline"
              onClick={() => {
                setVitalModalOpen(false)
                setEditingVitalId(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!vitalPayload.label.trim()) {
                  toast.error("Please enter a display name for the vital metric")
                  return
                }
                if (!vitalPayload.field_key.trim()) {
                  toast.error("Please enter a field key")
                  return
                }
                if (vitalPayload.input_type === "select" && !vitalPayload.options_text.trim()) {
                  toast.error("Please enter dropdown options separated by commas")
                  return
                }
                if (editingVitalId) {
                  updateVitalMutation.mutate()
                } else {
                  createVitalMutation.mutate()
                }
              }}
              disabled={createVitalMutation.isPending || updateVitalMutation.isPending}
            >
              {(createVitalMutation.isPending || updateVitalMutation.isPending) && (
                <RefreshCw className="h-4 w-4 animate-spin mr-1" />
              )}
              {editingVitalId ? "Update Vital Parameter" : "Save Vital Metric"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <div>
            <Label>Display Name *</Label>
            <Input
              value={vitalPayload.label}
              onChange={(e) =>
                setVitalPayload({
                  ...vitalPayload,
                  label: e.target.value,
                  field_key: editingVitalId
                    ? vitalPayload.field_key
                    : e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "_"),
                })
              }
              placeholder="e.g. Pain Severity Score"
              className="mt-1 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Field Key *</Label>
              <Input
                value={vitalPayload.field_key}
                onChange={(e) =>
                  setVitalPayload({
                    ...vitalPayload,
                    field_key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                  })
                }
                placeholder="e.g. pain_severity"
                className="mt-1 text-xs font-mono"
              />
            </div>

            <div>
              <Label>Unit of Measurement</Label>
              <Input
                value={vitalPayload.unit}
                onChange={(e) => setVitalPayload({ ...vitalPayload, unit: e.target.value })}
                placeholder={vitalPayload.input_type === "number" ? "e.g. mg/dL, mmHg, bpm" : "e.g. scale (optional)"}
                className="mt-1 text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <Label>Input Type *</Label>
            <select
              value={vitalPayload.input_type}
              onChange={(e) =>
                setVitalPayload({
                  ...vitalPayload,
                  input_type: e.target.value as "number" | "text" | "select" | "boolean",
                })
              }
              className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1 focus:ring-1 focus:ring-primary"
            >
              <option value="number">Numeric (e.g. Blood Pressure, Glucose, Weight)</option>
              <option value="select">Dropdown Choice (e.g. Severity: Mild, Moderate, Severe)</option>
              <option value="text">Free Text Note (e.g. Clinical Observations)</option>
              <option value="boolean">Yes / No Switch (e.g. Cyanosis Present)</option>
            </select>
          </div>

          {/* Conditional: Dropdown Choices */}
          {vitalPayload.input_type === "select" && (
            <div className="p-3 bg-muted/40 rounded-lg border border-border/80 space-y-2">
              <Label className="font-semibold text-foreground">
                Dropdown Choices (Comma-separated) *
              </Label>
              <Input
                value={vitalPayload.options_text}
                onChange={(e) => setVitalPayload({ ...vitalPayload, options_text: e.target.value })}
                placeholder="e.g. Mild, Moderate, Severe, Critical"
                className="mt-1 text-xs bg-background"
              />
              <p className="text-[11px] text-muted-foreground">
                Enter all selectable options separated by commas (e.g., <code className="text-primary font-mono">Normal, Borderline, High</code>).
              </p>
              {vitalPayload.options_text.trim() && (
                <div className="pt-1">
                  <span className="text-[10px] text-muted-foreground block mb-1 font-medium">Choices Preview:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {vitalPayload.options_text
                      .split(",")
                      .map((opt) => opt.trim())
                      .filter(Boolean)
                      .map((opt, i) => (
                        <span
                          key={i}
                          className="bg-primary/10 text-primary border border-primary/20 text-[10px] px-2 py-0.5 rounded-full font-medium"
                        >
                          {opt}
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Conditional: Normal Range for Numbers */}
          {vitalPayload.input_type === "number" ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Normal Minimum</Label>
                <Input
                  type="number"
                  value={vitalPayload.min_value ?? ""}
                  onChange={(e) =>
                    setVitalPayload({
                      ...vitalPayload,
                      min_value: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g. 70"
                  className="mt-1 text-xs font-mono"
                />
              </div>

              <div>
                <Label>Normal Maximum</Label>
                <Input
                  type="number"
                  value={vitalPayload.max_value ?? ""}
                  onChange={(e) =>
                    setVitalPayload({
                      ...vitalPayload,
                      max_value: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g. 140"
                  className="mt-1 text-xs font-mono"
                />
              </div>
            </div>
          ) : vitalPayload.input_type !== "select" ? (
            <div className="text-[11px] text-muted-foreground bg-muted/30 p-2.5 rounded border border-border">
              ℹ️ Clinical range limits do not apply to {vitalPayload.input_type === "boolean" ? "Yes/No boolean toggles" : "free-text notes"}.
            </div>
          ) : null}

          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={vitalPayload.is_required}
                onChange={(e) =>
                  setVitalPayload({ ...vitalPayload, is_required: e.target.checked })
                }
                className="rounded border-input text-primary focus:ring-primary h-4 w-4"
              />
              <span className="font-semibold text-foreground">
                Mark as Mandatory in Triage & Nursing Station
              </span>
            </label>
          </div>
        </div>
      </FormContainer>

      {/* ────────────────────────────────────────────────────────────────
          MODAL: ADD / EDIT CUSTOM PATIENT INTAKE FIELD
         ──────────────────────────────────────────────────────────────── */}
      <FormContainer
        open={fieldModalOpen}
        onOpenChange={(open) => {
          setFieldModalOpen(open)
          if (!open) setEditingField(null)
        }}
        title={editingField ? "Edit Custom Patient Intake Field" : "Add Custom Patient Intake Demographic Field"}
        description={
          editingField
            ? "Modify field form label, type, dropdown choices, and walk-in requirement"
            : "Add custom registration attribute to patient profiles"
        }
        size="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button
              variant="outline"
              onClick={() => {
                setFieldModalOpen(false)
                setEditingField(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!fieldPayload.label.trim()) {
                  toast.error("Please enter a field form label")
                  return
                }
                if (!fieldPayload.field_key.trim()) {
                  toast.error("Please enter a field identifier")
                  return
                }
                if (fieldPayload.input_type === "select" && !fieldPayload.options_text.trim()) {
                  toast.error("Please enter dropdown choices separated by commas")
                  return
                }
                if (editingField) {
                  updateFieldMutation.mutate()
                } else {
                  createFieldMutation.mutate()
                }
              }}
              disabled={createFieldMutation.isPending || updateFieldMutation.isPending}
            >
              {(createFieldMutation.isPending || updateFieldMutation.isPending) && (
                <RefreshCw className="h-4 w-4 animate-spin mr-1" />
              )}
              {editingField ? "Update Intake Field" : "Save Intake Field"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <div>
            <Label>Field Form Label *</Label>
            <Input
              value={fieldPayload.label}
              onChange={(e) => {
                const newLabel = e.target.value
                if (editingField) {
                  setFieldPayload((prev) => ({ ...prev, label: newLabel }))
                } else {
                  setFieldPayload((prev) => ({
                    ...prev,
                    label: newLabel,
                    field_key: newLabel.toLowerCase().replace(/[^a-z0-9]/g, "_"),
                  }))
                }
              }}
              placeholder="e.g. Marital Status or Occupation"
              className="mt-1 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Field Identifier (lowercase_underscore) *</Label>
              <Input
                value={fieldPayload.field_key}
                onChange={(e) =>
                  setFieldPayload({
                    ...fieldPayload,
                    field_key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                  })
                }
                placeholder="e.g. marital_status"
                className="mt-1 text-xs font-mono"
              />
            </div>

            <div>
              <Label>Input Type *</Label>
              <select
                value={fieldPayload.input_type}
                onChange={(e) =>
                  setFieldPayload({
                    ...fieldPayload,
                    input_type: e.target.value as "text" | "number" | "select" | "date" | "boolean",
                  })
                }
                className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1 focus:ring-1 focus:ring-primary"
              >
                <option value="text">Text Input (Single Line)</option>
                <option value="select">Dropdown Selection (Multiple Choices)</option>
                <option value="number">Number (Numeric)</option>
                <option value="date">Date Picker</option>
                <option value="boolean">Yes / No Checkbox</option>
              </select>
            </div>
          </div>

          {/* Conditional: Dropdown choices for Patient Demographic field */}
          {fieldPayload.input_type === "select" && (
            <div className="p-3 bg-muted/40 rounded-lg border border-border/80 space-y-2">
              <Label className="font-semibold text-foreground">
                Dropdown Choices (Comma-separated) *
              </Label>
              <Input
                value={fieldPayload.options_text}
                onChange={(e) =>
                  setFieldPayload({ ...fieldPayload, options_text: e.target.value })
                }
                placeholder="e.g. Single, Married, Divorced, Widowed"
                className="mt-1 text-xs bg-background"
              />
              <p className="text-[11px] text-muted-foreground">
                Enter choices separated by commas (e.g. <code className="text-primary font-mono">Single, Married, Other</code>).
              </p>
              {fieldPayload.options_text.trim() && (
                <div className="pt-1">
                  <span className="text-[10px] text-muted-foreground block mb-1 font-medium">Choices Preview:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {fieldPayload.options_text
                      .split(",")
                      .map((opt) => opt.trim())
                      .filter(Boolean)
                      .map((opt, i) => (
                        <span
                          key={i}
                          className="bg-secondary text-secondary-foreground border border-border text-[10px] px-2 py-0.5 rounded-full font-medium"
                        >
                          {opt}
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <Label>Placeholder / Guidance Hint (Optional)</Label>
            <Input
              value={fieldPayload.placeholder}
              onChange={(e) => setFieldPayload({ ...fieldPayload, placeholder: e.target.value })}
              placeholder="e.g. Select marital status from list"
              className="mt-1 text-xs"
            />
          </div>

          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={fieldPayload.is_required}
                onChange={(e) =>
                  setFieldPayload({ ...fieldPayload, is_required: e.target.checked })
                }
                className="rounded border-input text-primary focus:ring-primary h-4 w-4"
              />
              <span className="font-semibold text-foreground">
                Mandatory during Walk-in Patient Registration
              </span>
            </label>
          </div>
        </div>
      </FormContainer>
    </div>
  )
}

export default SettingsPage
