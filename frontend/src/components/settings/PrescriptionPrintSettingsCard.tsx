import React, { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Printer,
  Save,
  RotateCcw,
  Upload,
  Image as ImageIcon,
  FileText,
  Sliders,
  ShieldCheck,
  Eye,
  Trash2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { settingsService } from "@/services/settingsService"

export interface PrescriptionPrintConfig {
  header_mode: "digital" | "preprinted" | "custom_banner"
  banner_image_url?: string
  hospital_name: string
  hospital_tagline: string
  address: string
  phone: string
  email: string
  website?: string
  reg_no?: string
  abdm_hip_id?: string
  logo_url?: string
  logo_position: "left" | "center" | "right"
  logo_size_px: number
  top_margin_mm: number
  bottom_margin_mm: number

  // Section Toggles
  show_patient_demographics: boolean
  show_token_and_uhid: boolean
  show_vitals_summary: boolean
  show_chief_complaints: boolean
  show_clinical_findings: boolean
  show_diagnoses: boolean
  show_medications_table: boolean
  show_investigations: boolean
  show_doctor_advice: boolean
  show_follow_up_date: boolean
  show_qr_code: boolean

  // Medication Table Columns
  med_cols: {
    dosage: boolean
    frequency: boolean
    duration: boolean
    route: boolean
    instructions: boolean
  }

  // Footer & Signature
  show_doctor_signature: boolean
  doctor_signature_title: string
  signature_alignment: "left" | "right"
  show_doctor_stamp_box: boolean
  footer_disclaimer: string
  emergency_helpline: string
}

export const DEFAULT_PRESCRIPTION_CONFIG: PrescriptionPrintConfig = {
  header_mode: "digital",
  banner_image_url: "",
  hospital_name: "Apex Multi-Speciality Hospital & Research Center",
  hospital_tagline: "Care • Compassion • Clinical Excellence",
  address: "Sector 14, Health City, New Delhi - 110001",
  phone: "+91 11 2345 6789 / +91 98765 43210",
  email: "opd@apexhospital.in",
  website: "www.apexhospital.in",
  reg_no: "REG/DL/2024/9876 • NABH Accredited",
  abdm_hip_id: "IN0710000001",
  logo_url: "",
  logo_position: "left",
  logo_size_px: 64,
  top_margin_mm: 10,
  bottom_margin_mm: 12,

  show_patient_demographics: true,
  show_token_and_uhid: true,
  show_vitals_summary: true,
  show_chief_complaints: true,
  show_clinical_findings: true,
  show_diagnoses: true,
  show_medications_table: true,
  show_investigations: true,
  show_doctor_advice: true,
  show_follow_up_date: true,
  show_qr_code: true,

  med_cols: {
    dosage: true,
    frequency: true,
    duration: true,
    route: true,
    instructions: true,
  },

  show_doctor_signature: true,
  doctor_signature_title: "Consulting Physician / Specialist",
  signature_alignment: "right",
  show_doctor_stamp_box: true,
  footer_disclaimer:
    "Valid for 7 days. Generic substitution permitted where clinically indicated. Not valid for medico-legal purposes without authorized seal.",
  emergency_helpline: "24x7 Emergency & Trauma: 102 / 011-23456799",
}

export const PrescriptionPrintSettingsCard: React.FC = () => {
  const queryClient = useQueryClient()

  // Fetch Settings
  const { data: savedData, isLoading } = useQuery({
    queryKey: ["hospital", "settings", "print_prescription"],
    queryFn: () => settingsService.getSettings("print_prescription"),
  })

  const [config, setConfig] = useState<PrescriptionPrintConfig>(DEFAULT_PRESCRIPTION_CONFIG)
  const [activeSubTab, setActiveSubTab] = useState<"header" | "sections" | "footer" | "preview">("header")

  useEffect(() => {
    if (savedData) {
      const val = (savedData.value || savedData) as Partial<PrescriptionPrintConfig>
      if (val && typeof val === "object" && Object.keys(val).length > 0) {
        setConfig({
          ...DEFAULT_PRESCRIPTION_CONFIG,
          ...val,
          med_cols: {
            ...DEFAULT_PRESCRIPTION_CONFIG.med_cols,
            ...(val.med_cols || {}),
          },
        })
      }
    }
  }, [savedData])

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: (newCfg: PrescriptionPrintConfig) =>
      settingsService.saveSettings("print_prescription", newCfg as any),
    onSuccess: () => {
      toast.success("Prescription print template configuration saved!")
      queryClient.invalidateQueries({ queryKey: ["hospital", "settings", "print_prescription"] })
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save prescription print configuration")
    },
  })

  // Handle Image Upload (Logo or Banner as Data URL)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: "logo" | "banner") => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image file size should be less than 2MB")
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      if (target === "logo") {
        setConfig((prev) => ({ ...prev, logo_url: dataUrl }))
      } else {
        setConfig((prev) => ({ ...prev, banner_image_url: dataUrl }))
      }
      toast.success(`${target === "logo" ? "Hospital logo" : "Header banner"} uploaded!`)
    }
    reader.readAsDataURL(file)
  }

  return (
    <Card className="p-6 rounded-2xl border shadow-xs bg-card space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border/70 gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Printer className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground">
                Prescription (Rx) Print Layout & Template Engine
              </h3>
              <Badge className="bg-emerald-600 text-white text-[10px]">Independent Slip Setting</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Customize header branding, pre-printed stationery margins, section toggles, doctor signature, and legal disclaimers.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setConfig(DEFAULT_PRESCRIPTION_CONFIG)}
            className="text-xs gap-1.5 h-8"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset Defaults
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={saveMutation.isPending || isLoading}
            onClick={() => saveMutation.mutate(config)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs gap-1.5 h-8 shadow-xs"
          >
            <Save className="h-3.5 w-3.5" />
            {saveMutation.isPending ? "Saving..." : "Save Template"}
          </Button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-border text-xs">
        <button
          type="button"
          onClick={() => setActiveSubTab("header")}
          className={`flex items-center gap-2 px-4 py-2.5 font-semibold border-b-2 transition-all ${
            activeSubTab === "header"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ImageIcon className="h-4 w-4" /> 1. Header & Letterhead Pad
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("sections")}
          className={`flex items-center gap-2 px-4 py-2.5 font-semibold border-b-2 transition-all ${
            activeSubTab === "sections"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sliders className="h-4 w-4" /> 2. Clinical Sections & Rx Table
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("footer")}
          className={`flex items-center gap-2 px-4 py-2.5 font-semibold border-b-2 transition-all ${
            activeSubTab === "footer"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShieldCheck className="h-4 w-4" /> 3. Doctor Signature & Footer
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("preview")}
          className={`flex items-center gap-2 px-4 py-2.5 font-semibold border-b-2 transition-all ${
            activeSubTab === "preview"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Eye className="h-4 w-4" /> 4. Live A4 Prescription Preview
        </button>
      </div>

      {/* ────────────────────────────────────────────────────────────────
          TAB 1: HEADER & LETTERHEAD PAD MODE
         ──────────────────────────────────────────────────────────────── */}
      {activeSubTab === "header" && (
        <div className="space-y-5 text-xs">
          {/* Header Mode Picker */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-foreground">Header Paper / Stationery Mode *</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  config.header_mode === "digital"
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border hover:bg-muted/30"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-primary" /> Digital Hospital Letterhead
                    </span>
                    <input
                      type="radio"
                      name="header_mode"
                      value="digital"
                      checked={config.header_mode === "digital"}
                      onChange={() => setConfig({ ...config, header_mode: "digital" })}
                      className="text-primary"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Prints on plain paper. System generates Hospital Name, Logo, Address, and NABH numbers at the top.
                  </p>
                </div>
              </label>

              <label
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  config.header_mode === "preprinted"
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border hover:bg-muted/30"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      <Printer className="h-4 w-4 text-amber-600" /> Pre-Printed Letterhead Pad
                    </span>
                    <input
                      type="radio"
                      name="header_mode"
                      value="preprinted"
                      checked={config.header_mode === "preprinted"}
                      onChange={() => setConfig({ ...config, header_mode: "preprinted" })}
                      className="text-primary"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Paper already has hospital branding physically printed. System suppresses header and leaves top margin clearance.
                  </p>
                </div>
              </label>

              <label
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  config.header_mode === "custom_banner"
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border hover:bg-muted/30"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      <ImageIcon className="h-4 w-4 text-emerald-600" /> Full Header Graphic Banner
                    </span>
                    <input
                      type="radio"
                      name="header_mode"
                      value="custom_banner"
                      checked={config.header_mode === "custom_banner"}
                      onChange={() => setConfig({ ...config, header_mode: "custom_banner" })}
                      className="text-primary"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Upload your own professionally designed full-width header image (JPEG/PNG) to print at the top.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Conditional: Pre-printed Margins */}
          {config.header_mode === "preprinted" && (
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3">
              <span className="font-bold text-amber-800 dark:text-amber-300 block">
                Pre-Printed Stationery Top Margin Clearance
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px]">Top Clearance Margin (in Millimeters mm)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={120}
                    value={config.top_margin_mm}
                    onChange={(e) => setConfig({ ...config, top_margin_mm: Number(e.target.value) || 0 })}
                    className="mt-1 font-mono text-xs max-w-xs"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Recommended: 40mm to 55mm so patient details start right below your physical printed pad header.
                  </p>
                </div>
                <div>
                  <Label className="text-[11px]">Bottom Margin (in Millimeters mm)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={60}
                    value={config.bottom_margin_mm}
                    onChange={(e) => setConfig({ ...config, bottom_margin_mm: Number(e.target.value) || 0 })}
                    className="mt-1 font-mono text-xs max-w-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Conditional: Custom Banner Upload */}
          {config.header_mode === "custom_banner" && (
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
              <span className="font-bold text-emerald-800 dark:text-emerald-300 block">
                Header Image Banner (Full Width)
              </span>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {config.banner_image_url ? (
                  <div className="relative border rounded-xl overflow-hidden bg-background max-h-24 max-w-md">
                    <img src={config.banner_image_url} alt="Banner" className="w-full object-contain max-h-24" />
                    <Button
                      type="button"
                      size="xs"
                      variant="destructive"
                      onClick={() => setConfig({ ...config, banner_image_url: "" })}
                      className="absolute top-1 right-1 h-6 w-6 p-0 rounded-full"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="h-20 w-full sm:w-64 rounded-xl border border-dashed border-emerald-500/40 flex items-center justify-center text-muted-foreground">
                    No banner uploaded
                  </div>
                )}

                <div className="space-y-1.5 flex-1">
                  <Label className="cursor-pointer inline-flex items-center gap-1.5 bg-background border px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-muted">
                    <Upload className="h-3.5 w-3.5" /> Upload Banner Graphic
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, "banner")}
                      className="hidden"
                    />
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Recommended resolution: 1200 x 250px (PNG or high-res JPG, max 2MB).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Digital Header Details */}
          {config.header_mode === "digital" && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <Label>Hospital / Clinic Name *</Label>
                  <Input
                    value={config.hospital_name}
                    onChange={(e) => setConfig({ ...config, hospital_name: e.target.value })}
                    className="mt-1 font-semibold text-xs"
                  />
                </div>
                <div>
                  <Label>Tagline / Specialty Line</Label>
                  <Input
                    value={config.hospital_tagline}
                    onChange={(e) => setConfig({ ...config, hospital_tagline: e.target.value })}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              {/* Logo Upload & Position */}
              <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-3">
                <span className="font-semibold text-foreground block">Hospital Logo Branding</span>
                <div className="flex flex-wrap items-center gap-4">
                  {config.logo_url ? (
                    <div className="relative border rounded-xl p-1 bg-background h-16 w-16 flex items-center justify-center">
                      <img src={config.logo_url} alt="Logo" className="max-h-14 max-w-14 object-contain" />
                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, logo_url: "" })}
                        className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-destructive text-white rounded-full flex items-center justify-center text-[10px]"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="h-16 w-16 rounded-xl border border-dashed flex items-center justify-center text-muted-foreground text-[10px]">
                      No Logo
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label className="cursor-pointer inline-flex items-center gap-1.5 bg-background border px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-muted">
                      <Upload className="h-3.5 w-3.5" /> Upload Hospital Logo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, "logo")}
                        className="hidden"
                      />
                    </Label>
                    <p className="text-[10px] text-muted-foreground">PNG transparent logo recommended (max 2MB)</p>
                  </div>

                  <div className="flex items-center gap-3 ml-auto">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Position</Label>
                      <select
                        value={config.logo_position}
                        onChange={(e) => setConfig({ ...config, logo_position: e.target.value as any })}
                        className="h-8 rounded border border-border bg-background px-2 text-xs mt-0.5"
                      >
                        <option value="left">Left Aligned</option>
                        <option value="center">Center Aligned</option>
                        <option value="right">Right Aligned</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-[10px] text-muted-foreground">Size ({config.logo_size_px}px)</Label>
                      <Input
                        type="number"
                        min={30}
                        max={120}
                        value={config.logo_size_px}
                        onChange={(e) => setConfig({ ...config, logo_size_px: Number(e.target.value) || 60 })}
                        className="h-8 w-20 text-xs font-mono mt-0.5"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Address & Contact Numbers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Full Address Line</Label>
                  <Input
                    value={config.address}
                    onChange={(e) => setConfig({ ...config, address: e.target.value })}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label>Phone Numbers / Helpline</Label>
                  <Input
                    value={config.phone}
                    onChange={(e) => setConfig({ ...config, phone: e.target.value })}
                    className="mt-1 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label>Official Email</Label>
                  <Input
                    value={config.email}
                    onChange={(e) => setConfig({ ...config, email: e.target.value })}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label>Website / Portal</Label>
                  <Input
                    value={config.website || ""}
                    onChange={(e) => setConfig({ ...config, website: e.target.value })}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label>Registration & NABH Credentials</Label>
                  <Input
                    value={config.reg_no || ""}
                    onChange={(e) => setConfig({ ...config, reg_no: e.target.value })}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────
          TAB 2: CLINICAL CONTENT & MEDICINE TABLE TOGGLES
         ──────────────────────────────────────────────────────────────── */}
      {activeSubTab === "sections" && (
        <div className="space-y-5 text-xs">
          <div className="space-y-2">
            <span className="font-bold text-foreground block">
              Clinical Blocks Visibility On Printed Prescription Slip
            </span>
            <p className="text-[11px] text-muted-foreground">
              Toggle which clinical sections appear on the printed Rx document:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-card cursor-pointer hover:bg-muted/30">
                <input
                  type="checkbox"
                  checked={config.show_patient_demographics}
                  onChange={(e) => setConfig({ ...config, show_patient_demographics: e.target.checked })}
                  className="rounded border-input text-primary h-4 w-4"
                />
                <div>
                  <span className="font-semibold text-foreground block">Patient Demographics Banner</span>
                  <span className="text-[10px] text-muted-foreground">Name, Age, Gender, Mobile</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-card cursor-pointer hover:bg-muted/30">
                <input
                  type="checkbox"
                  checked={config.show_token_and_uhid}
                  onChange={(e) => setConfig({ ...config, show_token_and_uhid: e.target.checked })}
                  className="rounded border-input text-primary h-4 w-4"
                />
                <div>
                  <span className="font-semibold text-foreground block">Token & UHID Number</span>
                  <span className="text-[10px] text-muted-foreground">Unique hospital ID & queue token</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-card cursor-pointer hover:bg-muted/30">
                <input
                  type="checkbox"
                  checked={config.show_vitals_summary}
                  onChange={(e) => setConfig({ ...config, show_vitals_summary: e.target.checked })}
                  className="rounded border-input text-primary h-4 w-4"
                />
                <div>
                  <span className="font-semibold text-foreground block">Recorded Vitals Baseline</span>
                  <span className="text-[10px] text-muted-foreground">BP, Pulse, Temp, SpO2, Weight</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-card cursor-pointer hover:bg-muted/30">
                <input
                  type="checkbox"
                  checked={config.show_chief_complaints}
                  onChange={(e) => setConfig({ ...config, show_chief_complaints: e.target.checked })}
                  className="rounded border-input text-primary h-4 w-4"
                />
                <div>
                  <span className="font-semibold text-foreground block">Chief Complaints & Symptoms</span>
                  <span className="text-[10px] text-muted-foreground">Presenting illnesses</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-card cursor-pointer hover:bg-muted/30">
                <input
                  type="checkbox"
                  checked={config.show_clinical_findings}
                  onChange={(e) => setConfig({ ...config, show_clinical_findings: e.target.checked })}
                  className="rounded border-input text-primary h-4 w-4"
                />
                <div>
                  <span className="font-semibold text-foreground block">Physical Systemic Findings</span>
                  <span className="text-[10px] text-muted-foreground">CVS, RS, CNS, P/A observations</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-card cursor-pointer hover:bg-muted/30">
                <input
                  type="checkbox"
                  checked={config.show_diagnoses}
                  onChange={(e) => setConfig({ ...config, show_diagnoses: e.target.checked })}
                  className="rounded border-input text-primary h-4 w-4"
                />
                <div>
                  <span className="font-semibold text-foreground block">WHO ICD-10 Diagnoses</span>
                  <span className="text-[10px] text-muted-foreground">Primary & secondary conditions</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-card cursor-pointer hover:bg-muted/30">
                <input
                  type="checkbox"
                  checked={config.show_medications_table}
                  onChange={(e) => setConfig({ ...config, show_medications_table: e.target.checked })}
                  className="rounded border-input text-primary h-4 w-4"
                />
                <div>
                  <span className="font-semibold text-foreground block">Rx Medication Table</span>
                  <span className="text-[10px] text-muted-foreground">Prescribed drugs with dosage</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-card cursor-pointer hover:bg-muted/30">
                <input
                  type="checkbox"
                  checked={config.show_investigations}
                  onChange={(e) => setConfig({ ...config, show_investigations: e.target.checked })}
                  className="rounded border-input text-primary h-4 w-4"
                />
                <div>
                  <span className="font-semibold text-foreground block">Lab / Radiology Orders</span>
                  <span className="text-[10px] text-muted-foreground">Pathology & Imaging requests</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-card cursor-pointer hover:bg-muted/30">
                <input
                  type="checkbox"
                  checked={config.show_doctor_advice}
                  onChange={(e) => setConfig({ ...config, show_doctor_advice: e.target.checked })}
                  className="rounded border-input text-primary h-4 w-4"
                />
                <div>
                  <span className="font-semibold text-foreground block">Doctor Advice & Dietary Guidance</span>
                  <span className="text-[10px] text-muted-foreground">Lifestyle & dietary rules</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-card cursor-pointer hover:bg-muted/30">
                <input
                  type="checkbox"
                  checked={config.show_follow_up_date}
                  onChange={(e) => setConfig({ ...config, show_follow_up_date: e.target.checked })}
                  className="rounded border-input text-primary h-4 w-4"
                />
                <div>
                  <span className="font-semibold text-foreground block">Next Follow-Up Date</span>
                  <span className="text-[10px] text-muted-foreground">Revisit schedule</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-card cursor-pointer hover:bg-muted/30">
                <input
                  type="checkbox"
                  checked={config.show_qr_code}
                  onChange={(e) => setConfig({ ...config, show_qr_code: e.target.checked })}
                  className="rounded border-input text-primary h-4 w-4"
                />
                <div>
                  <span className="font-semibold text-foreground block">Verification QR Code / ABHA</span>
                  <span className="text-[10px] text-muted-foreground">Digital Rx scan verification</span>
                </div>
              </label>
            </div>
          </div>

          {/* Medication Table Columns Specific Configuration */}
          <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
            <span className="font-bold text-primary block">
              💊 Rx Medicine Table Columns Configuration
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.med_cols.dosage}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      med_cols: { ...config.med_cols, dosage: e.target.checked },
                    })
                  }
                  className="rounded border-input text-primary h-4 w-4"
                />
                <span className="font-semibold text-foreground">Dosage</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.med_cols.frequency}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      med_cols: { ...config.med_cols, frequency: e.target.checked },
                    })
                  }
                  className="rounded border-input text-primary h-4 w-4"
                />
                <span className="font-semibold text-foreground">Frequency (1-0-1)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.med_cols.duration}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      med_cols: { ...config.med_cols, duration: e.target.checked },
                    })
                  }
                  className="rounded border-input text-primary h-4 w-4"
                />
                <span className="font-semibold text-foreground">Duration</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.med_cols.route}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      med_cols: { ...config.med_cols, route: e.target.checked },
                    })
                  }
                  className="rounded border-input text-primary h-4 w-4"
                />
                <span className="font-semibold text-foreground">Route (Oral/IV)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.med_cols.instructions}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      med_cols: { ...config.med_cols, instructions: e.target.checked },
                    })
                  }
                  className="rounded border-input text-primary h-4 w-4"
                />
                <span className="font-semibold text-foreground">Instructions</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────
          TAB 3: DOCTOR SIGNATURE & FOOTER
         ──────────────────────────────────────────────────────────────── */}
      {activeSubTab === "footer" && (
        <div className="space-y-4 text-xs">
          {/* Doctor Signature Configuration */}
          <div className="p-4 rounded-xl border border-border bg-card space-y-3">
            <span className="font-bold text-foreground block">
              Doctor Signature Block & Stamp Space
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex items-center gap-2 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={config.show_doctor_signature}
                  onChange={(e) => setConfig({ ...config, show_doctor_signature: e.target.checked })}
                  className="rounded border-input text-primary h-4 w-4"
                />
                <span className="font-semibold text-foreground">Print Signature Line & Doctor Name</span>
              </label>

              <div>
                <Label className="text-[11px]">Signature Block Title / Designation</Label>
                <Input
                  value={config.doctor_signature_title}
                  onChange={(e) => setConfig({ ...config, doctor_signature_title: e.target.value })}
                  placeholder="e.g. Consulting Physician / Specialist"
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label className="text-[11px]">Signature Alignment</Label>
                <select
                  value={config.signature_alignment}
                  onChange={(e) => setConfig({ ...config, signature_alignment: e.target.value as any })}
                  className="mt-1 h-8 w-full rounded border border-border bg-background px-2 text-xs"
                >
                  <option value="right">Right Aligned (Standard)</option>
                  <option value="left">Left Aligned</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={config.show_doctor_stamp_box}
                onChange={(e) => setConfig({ ...config, show_doctor_stamp_box: e.target.checked })}
                className="rounded border-input text-primary h-4 w-4"
              />
              <span className="text-[11px] text-muted-foreground">
                Include reserved round stamp placeholder circle next to doctor's signature
              </span>
            </label>
          </div>

          {/* Legal Disclaimer & Emergency Helpline */}
          <div className="space-y-3">
            <div>
              <Label>Prescription Legal Disclaimer / Substitution Text</Label>
              <textarea
                rows={2}
                value={config.footer_disclaimer}
                onChange={(e) => setConfig({ ...config, footer_disclaimer: e.target.value })}
                placeholder="e.g. Valid for 7 days. Generic substitution permitted..."
                className="w-full text-xs rounded-xl border border-input bg-background p-2.5 mt-1 focus:outline-none"
              />
            </div>

            <div>
              <Label>Emergency Helpline & Ambulance Contact Text</Label>
              <Input
                value={config.emergency_helpline}
                onChange={(e) => setConfig({ ...config, emergency_helpline: e.target.value })}
                placeholder="e.g. 24x7 Emergency: 102 / 011-23456799"
                className="mt-1 text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────
          TAB 4: LIVE INTERACTIVE A4 PRESCRIPTION PREVIEW
         ──────────────────────────────────────────────────────────────── */}
      {activeSubTab === "preview" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Simulated A4 Paper Preview based on your active template settings:
            </span>
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={() => window.print()}
              className="gap-1.5 text-xs"
            >
              <Printer className="h-3.5 w-3.5" /> Test Browser Print Dialog
            </Button>
          </div>

          {/* A4 Preview Container */}
          <div className="mx-auto max-w-3xl rounded-xl border border-border/80 bg-white dark:bg-slate-950 p-8 shadow-md text-foreground font-sans space-y-4 text-xs">
            {/* Header */}
            {config.header_mode === "preprinted" ? (
              <div
                style={{ height: `${config.top_margin_mm * 3.5}px` }}
                className="border-b border-dashed border-amber-500/40 flex items-center justify-center text-amber-700 dark:text-amber-400 text-xs italic"
              >
                [Pre-Printed Letterhead Space — Clearance Reserved: {config.top_margin_mm}mm]
              </div>
            ) : config.header_mode === "custom_banner" && config.banner_image_url ? (
              <div className="border-b pb-3">
                <img src={config.banner_image_url} alt="Banner" className="w-full object-contain max-h-28" />
              </div>
            ) : (
              <div className="border-b pb-4 flex items-start justify-between gap-4">
                {config.logo_url && config.logo_position === "left" && (
                  <img
                    src={config.logo_url}
                    alt="Logo"
                    style={{ height: `${config.logo_size_px}px` }}
                    className="object-contain"
                  />
                )}
                <div className={`flex-1 ${config.logo_position === "center" ? "text-center" : "text-left"}`}>
                  <h1 className="text-lg font-black tracking-tight text-primary uppercase">
                    {config.hospital_name}
                  </h1>
                  {config.hospital_tagline && (
                    <p className="text-[11px] font-semibold text-muted-foreground">{config.hospital_tagline}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {config.address} • Ph: {config.phone}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {config.reg_no} {config.abdm_hip_id ? `• HIP ID: ${config.abdm_hip_id}` : ""}
                  </p>
                </div>
                {config.logo_url && config.logo_position === "right" && (
                  <img
                    src={config.logo_url}
                    alt="Logo"
                    style={{ height: `${config.logo_size_px}px` }}
                    className="object-contain"
                  />
                )}
              </div>
            )}

            {/* Patient Demographics Bar */}
            {config.show_patient_demographics && (
              <div className="rounded-lg bg-muted/30 border p-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Patient Name</span>
                  <strong className="text-foreground">Smt. Sunita Verma</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Age / Gender</span>
                  <span>42 Yrs / Female (B+ve)</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">UHID / Token</span>
                  <span className="font-mono font-bold text-primary">UHID-2026-0042 #Token 14</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Consultant Doctor</span>
                  <span className="font-semibold">Dr. A. K. Sharma (MD)</span>
                </div>
              </div>
            )}

            {/* Vitals Summary Strip */}
            {config.show_vitals_summary && (
              <div className="rounded-lg border p-2 bg-muted/15 flex flex-wrap items-center justify-between text-[11px] font-mono">
                <span><strong>BP:</strong> 120/80 mmHg</span>
                <span><strong>Pulse:</strong> 72 bpm</span>
                <span><strong>Temp:</strong> 98.6°F</span>
                <span><strong>SpO2:</strong> 99%</span>
                <span><strong>Weight:</strong> 64 kg</span>
                <span><strong>BMI:</strong> 23.4 (Normal)</span>
              </div>
            )}

            {/* Complaints & Diagnosis */}
            <div className="space-y-2">
              {config.show_chief_complaints && (
                <div className="text-[11px]">
                  <strong className="text-foreground">Chief Complaints:</strong> Fever with chills x 3 days, dry cough, body aches.
                </div>
              )}

              {config.show_diagnoses && (
                <div className="text-[11px] flex items-center gap-2">
                  <strong className="text-foreground">Diagnosis:</strong>
                  <Badge variant="outline" className="font-mono text-[10px] bg-primary/10 text-primary border-primary/20">
                    J06.9 - Acute upper respiratory infection, unspecified
                  </Badge>
                </div>
              )}
            </div>

            {/* Rx Medications Table */}
            {config.show_medications_table && (
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                  <span className="text-xl font-serif text-primary">℞</span>
                  <span>Prescribed Medications</span>
                </div>

                <table className="w-full text-left border border-collapse text-[11px]">
                  <thead className="bg-muted/50 text-[10px] uppercase font-bold border-b">
                    <tr>
                      <th className="p-1.5 border-r">#</th>
                      <th className="p-1.5 border-r">Medicine Name</th>
                      {config.med_cols.dosage && <th className="p-1.5 border-r">Dosage</th>}
                      {config.med_cols.frequency && <th className="p-1.5 border-r">Frequency</th>}
                      {config.med_cols.duration && <th className="p-1.5 border-r">Duration</th>}
                      {config.med_cols.instructions && <th className="p-1.5">Instructions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="p-1.5 border-r font-mono">1</td>
                      <td className="p-1.5 border-r font-bold">Tab. Paracetamol 650mg</td>
                      {config.med_cols.dosage && <td className="p-1.5 border-r">1 Tablet</td>}
                      {config.med_cols.frequency && <td className="p-1.5 border-r font-mono">1-0-1 (TID)</td>}
                      {config.med_cols.duration && <td className="p-1.5 border-r">5 Days</td>}
                      {config.med_cols.instructions && <td className="p-1.5">After food / SOS for fever &gt; 100°F</td>}
                    </tr>
                    <tr>
                      <td className="p-1.5 border-r font-mono">2</td>
                      <td className="p-1.5 border-r font-bold">Tab. Levocetirizine 5mg</td>
                      {config.med_cols.dosage && <td className="p-1.5 border-r">1 Tablet</td>}
                      {config.med_cols.frequency && <td className="p-1.5 border-r font-mono">0-0-1 (QHS)</td>}
                      {config.med_cols.duration && <td className="p-1.5 border-r">5 Days</td>}
                      {config.med_cols.instructions && <td className="p-1.5">At bedtime with warm water</td>}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Investigations & Follow-Up */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-[11px]">
              {config.show_investigations && (
                <div className="p-2.5 rounded-lg border bg-muted/10 space-y-1">
                  <strong>Recommended Investigations:</strong>
                  <p className="text-muted-foreground">• Complete Blood Count (CBC) • Dengue NS1 Antigen (if fever persists)</p>
                </div>
              )}

              {config.show_follow_up_date && (
                <div className="p-2.5 rounded-lg border bg-muted/10 space-y-1">
                  <strong>Follow-Up Consultation:</strong>
                  <p className="text-primary font-bold">Review in OPD after 5 Days (or SOS if worsening symptoms)</p>
                </div>
              )}
            </div>

            {/* Doctor Signature & Stamp */}
            {config.show_doctor_signature && (
              <div className={`pt-6 flex items-end ${config.signature_alignment === "right" ? "justify-end" : "justify-start"}`}>
                <div className="text-center space-y-1 min-w-[200px]">
                  {config.show_doctor_stamp_box && (
                    <div className="h-16 w-16 mx-auto rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center text-[9px] text-muted-foreground/60 mb-2">
                      [Stamp Box]
                    </div>
                  )}
                  <div className="border-t border-foreground/40 pt-1">
                    <strong className="block text-foreground">Dr. A. K. Sharma</strong>
                    <span className="text-[10px] text-muted-foreground block">MBBS, MD (Medicine) • Reg: MCI-45892</span>
                    <span className="text-[10px] font-semibold text-primary block">{config.doctor_signature_title}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Footer Disclaimer */}
            <div className="border-t pt-3 text-[10px] text-muted-foreground text-center space-y-0.5">
              <p>{config.footer_disclaimer}</p>
              <p className="font-semibold text-foreground">{config.emergency_helpline}</p>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
