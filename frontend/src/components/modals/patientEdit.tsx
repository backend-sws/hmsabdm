import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { useForm, type SubmitHandler } from "react-hook-form"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Calendar,
  Stethoscope,
  ShieldCheck,
  ArrowRight,
  FileText,
  X,
  Sparkles,
  RefreshCw,
  User,
  Pencil,
  Eye,
  Lock,
  CheckCircle2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { sectionHeader } from "@/components/sectionHeader"
import { patientService } from "@/services/patientService"
import { settingsService } from "@/services/settingsService"
import { queryKeys } from "@/constants/queryKeys"
import {
  GENDER_OPTIONS,
  BLOOD_GROUP_OPTIONS,
  GUARDIAN_RELATION_OPTIONS,
} from "@/constants/patient.constants"
import { PatientAvatar, AbhaCardModal, LinkAbhaModal } from "@/components/common"
import { DobAgePicker, calculateAgeBreakdown } from "@/components/common/DobAgePicker"
import type { Patient } from "@/types/patient"

export const ID_PROOF_OPTIONS = [
  { value: "aadhaar", label: "Aadhaar Card" },
  { value: "pan", label: "PAN Card" },
  { value: "voter_id", label: "Voter ID" },
  { value: "driving_license", label: "Driving License" },
  { value: "passport", label: "Passport" },
  { value: "ration_card", label: "Ration Card" },
  { value: "other", label: "Other Official Govt ID" },
]

interface PatientFormValues {
  name: string
  mobile?: string
  email?: string
  id_proof_type?: string
  id_proof_number?: string
  gender: "M" | "F" | "O" | ""
  dob?: string
  blood_group?: string
  guardian_name?: string
  guardian_relation?: string
  guardian_phone?: string
  address?: string
  city?: string
  district?: string
  state?: string
  pincode?: string
}

interface PatientEditProps {
  open: boolean
  onClose: (open: boolean) => void
  patient?: (Patient & { viewMode?: boolean }) | null
}

export default function PatientEdit({ open, onClose, patient }: PatientEditProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isCreateMode = !patient?.id
  const isAbhaVerified = Boolean(patient?.abha_number || patient?.kyc_verified)

  // Local state to toggle between View Profile and Edit Form inside the drawer
  const [isViewMode, setIsViewMode] = useState<boolean>(Boolean(patient?.viewMode))
  const [isAbhaCardOpen, setIsAbhaCardOpen] = useState(false)
  const [isLinkAbhaOpen, setIsLinkAbhaOpen] = useState(false)

  // Dynamic custom patient demographic field configs from settings
  const { data: patientFieldConfigs = [] } = useQuery({
    queryKey: queryKeys.settings.patientFields,
    queryFn: () => settingsService.getPatientFieldConfigs(),
    enabled: open,
  })

  const [customFields, setCustomFields] = useState<Record<string, any>>({})

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PatientFormValues>({
    defaultValues: {
      name: "",
      mobile: "",
      email: "",
      id_proof_type: "",
      id_proof_number: "",
      gender: "M",
      dob: "",
      blood_group: "",
      guardian_name: "",
      guardian_relation: "",
      guardian_phone: "",
      address: "",
      city: "",
      district: "",
      state: "",
      pincode: "",
    },
    mode: "onChange",
  })

  const currentDob = watch("dob")

  // Escape key handler to close slide-over sheet
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, onClose])

  // Populate form values & sync view mode
  useEffect(() => {
    if (open) {
      setIsViewMode(Boolean(patient?.viewMode))
      if (!isCreateMode && patient) {
        reset({
          name: patient.name || "",
          mobile: patient.mobile || "",
          email: patient.email || "",
          id_proof_type: patient.id_proof_type || "",
          id_proof_number: patient.id_proof_number || "",
          gender: (patient.gender as any) || "",
          dob: patient.dob ? String(patient.dob).substring(0, 10) : "",
          blood_group: patient.blood_group || "",
          guardian_name: patient.guardian_name || "",
          guardian_relation: patient.guardian_relation || "",
          guardian_phone: patient.guardian_phone || "",
          address: patient.address || "",
          city: patient.city || "",
          district: patient.district || "",
          state: patient.state || "",
          pincode: patient.pincode || "",
        })
        const cf =
          patient.custom_fields && typeof patient.custom_fields === "object"
            ? { ...patient.custom_fields }
            : {}
        setCustomFields(cf)
      } else {
        reset({
          name: "",
          mobile: "",
          email: "",
          id_proof_type: "",
          id_proof_number: "",
          gender: "M",
          dob: "",
          blood_group: "",
          guardian_name: "",
          guardian_relation: "",
          guardian_phone: "",
          address: "",
          city: "",
          district: "",
          state: "",
          pincode: "",
        })
        setCustomFields({})
      }
    }
  }, [open, patient, reset, isCreateMode])

  // Mutation for creating or updating patient
  const mutation = useMutation({
    mutationFn: (data: PatientFormValues) => {
      // Validate any required dynamic intake fields
      if (patientFieldConfigs && patientFieldConfigs.length > 0) {
        for (const f of patientFieldConfigs) {
          const key = f.field_key || f.field_name || `field_${f.id}`
          const isReq = Boolean(f.is_required)
          const val = customFields[key]
          if (isReq && (val === undefined || val === null || String(val).trim() === "")) {
            throw new Error(`Please provide required demographic field: ${f.label}`)
          }
        }
      }

      const payload = {
        name: data.name,
        mobile: data.mobile || undefined,
        email: data.email || undefined,
        id_proof_type: data.id_proof_type || undefined,
        id_proof_number: data.id_proof_number || undefined,
        gender: (data.gender as any) || undefined,
        dob: data.dob || undefined,
        blood_group: data.blood_group || undefined,
        guardian_name: data.guardian_name || undefined,
        guardian_relation: data.guardian_relation || undefined,
        guardian_phone: data.guardian_phone || undefined,
        address: data.address || undefined,
        city: data.city || undefined,
        district: data.district || undefined,
        state: data.state || undefined,
        pincode: data.pincode || undefined,
        custom_fields: Object.keys(customFields).length > 0 ? customFields : undefined,
      }

      if (!isCreateMode && patient?.id) {
        return patientService.updatePatient(patient.id, payload)
      } else {
        return patientService.registerPatientWithoutAbha(payload)
      }
    },
    onSuccess: (savedPatient) => {
      if (!isCreateMode) {
        toast.success(`Patient record updated successfully for ${savedPatient.name || "patient"}`)
      } else {
        toast.success(`Patient registered successfully with UHID: ${savedPatient.uhid}`)
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.patients.all })
      onClose(false)
    },
    onError: (err: any) => {
      toast.error(err.message || (isCreateMode ? "Failed to register patient" : "Failed to update patient record"))
    },
  })

  const onSubmit: SubmitHandler<PatientFormValues> = (data) => {
    mutation.mutate(data)
  }

  // View mode helper: Age calculation with Years, Months, Days
  const formatDetailedAge = (dobString?: string) => {
    if (!dobString) return "N/A"
    const breakdown = calculateAgeBreakdown(dobString)
    if (!breakdown) return "N/A"
    const parts = []
    if (breakdown.years > 0) parts.push(`${breakdown.years} Yrs`)
    if (breakdown.months > 0) parts.push(`${breakdown.months} Mos`)
    if (breakdown.days > 0 && breakdown.years < 5) parts.push(`${breakdown.days} Days`)
    return parts.length > 0 ? parts.join(", ") : "0 Days"
  }

  const formatGenderLabel = (genderVal?: string) => {
    if (genderVal === "M") return "Male"
    if (genderVal === "F") return "Female"
    if (genderVal === "O") return "Other"
    return genderVal || "N/A"
  }

  if (!open) return null

  return (
    <>
      {/* ─── Backdrop Overlay ────────────────────────────────────────── */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
        onClick={() => onClose(false)}
        aria-hidden="true"
      />

      {/* ─── Slide-Over Sheet (Right Drawer) ─────────────────────────── */}
      <div
        className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 ease-out"
        role="dialog"
        aria-modal="true"
      >
        {/* Drawer Sticky Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-card/95 backdrop-blur-xs px-6 py-4 shadow-2xs">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <User className="h-4 w-4" />
              </span>
              <h2 className="text-base font-bold text-foreground">
                {isViewMode
                  ? `Patient Profile - ${patient?.name || ""}`
                  : isCreateMode
                  ? "Register New Walk-in Patient"
                  : `Edit Patient Record - ${patient?.name || ""}`}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground pl-9">
              {isViewMode
                ? "Hospital registry demographic details & ABHA credentials"
                : isCreateMode
                ? "Enter patient demographics and custom intake parameters"
                : isAbhaVerified
                ? "ABDM Linked: Contact, Address, Guardian & Custom Fields are editable"
                : "All demographic, contact, and intake attributes can be modified"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Mode Toggle in Header */}
            {isViewMode && patient?.id && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsViewMode(false)}
                className="gap-1.5 border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold h-8"
                title="Edit Patient Details"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit Patient
              </Button>
            )}
            {!isViewMode && patient?.id && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsViewMode(true)}
                className="gap-1.5 text-xs font-semibold h-8"
                title="Back to View Profile"
              >
                <Eye className="h-3.5 w-3.5" /> View Mode
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onClose(false)}
              className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {isViewMode ? (
            /* ════════════════════════════════════════════════════════════════
               VIEW MODE
               ════════════════════════════════════════════════════════════════ */
            <div className="space-y-6">
              {/* UHID & Registry Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 dark:bg-blue-950/20">
                <div className="flex items-center gap-4">
                  <PatientAvatar
                    photo={patient?.photo}
                    name={patient?.name}
                    uhid={patient?.uhid}
                    size="xl"
                    shape="rounded"
                    allowPreview={true}
                    kyc_verified={patient?.kyc_verified}
                    subtitle={[
                      patient?.address,
                      patient?.district || patient?.city,
                      patient?.state,
                      patient?.pincode,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                        UHID
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          patient?.abha_number || patient?.abha_address
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                            : "bg-slate-200 text-muted-foreground dark:bg-slate-800"
                        }`}
                      >
                        <ShieldCheck className="h-3 w-3" />
                        {patient?.abha_number || patient?.abha_address
                          ? "ABHA Digitized"
                          : "Standard Registry"}
                      </span>
                    </div>
                    <p className="text-xl font-bold font-mono text-primary leading-tight mt-0.5">
                      {patient?.uhid || "NOT GENERATED"}
                    </p>
                    <p className="text-sm font-bold text-foreground mt-0.5">{patient?.name}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsViewMode(false)}
                    className="gap-1.5 border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit Details
                  </Button>

                  {patient?.abha_number || patient?.abha_address ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAbhaCardOpen(true)}
                      className="gap-1.5 border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 text-xs font-semibold"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      ABHA Card
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsLinkAbhaOpen(true)}
                      className="gap-1.5 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 text-xs font-semibold"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Link ABHA
                    </Button>
                  )}
                </div>
              </div>

              {/* Clinical & Visit History Summary */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border bg-card p-3.5 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-primary" /> Last Visit Date
                  </span>
                  <p className="text-sm font-bold text-foreground mt-1">
                    {patient?.last_visit_date
                      ? new Date(patient.last_visit_date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "No visits recorded"}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Type: {patient?.last_visit_type || "New Registration"}
                  </p>
                </div>

                <div className="rounded-xl border bg-card p-3.5 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Stethoscope className="h-3.5 w-3.5 text-emerald-600" /> Department
                  </span>
                  <p className="text-sm font-bold text-foreground mt-1 truncate">
                    {patient?.last_department || "General Consultation"}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    Doctor: {patient?.last_doctor || "Hospital Duty Doctor"}
                  </p>
                </div>

                <div className="rounded-xl border bg-card p-3.5 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-600" /> ABDM Status
                  </span>
                  <p className="text-sm font-bold font-mono text-primary mt-1 truncate">
                    {patient?.abha_address || patient?.abha_number || "Not Linked"}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {patient?.kyc_verified ? "KYC Verified" : "Demographic Linked"}
                  </p>
                </div>
              </div>

              {/* Demographics View */}
              <div className="space-y-4 rounded-xl border bg-card p-5 shadow-2xs">
                <div className="flex items-center justify-between">
                  {sectionHeader("01", "Demographics & Personal Details")}
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => setIsViewMode(false)}
                    className="gap-1 text-xs text-primary hover:text-primary/80"
                  >
                    <Pencil className="h-3 w-3" /> Edit
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <Label className="text-muted-foreground text-xs uppercase font-semibold">Full Name</Label>
                    <p className="text-sm font-semibold text-foreground mt-1">{patient?.name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs uppercase font-semibold">Mobile Number</Label>
                    <p className="text-sm font-medium font-mono text-foreground mt-1">{patient?.mobile || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs uppercase font-semibold">Email Address</Label>
                    <p className="text-sm font-medium text-foreground mt-1">{patient?.email || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs uppercase font-semibold">Gender</Label>
                    <p className="text-sm font-medium text-foreground mt-1">{formatGenderLabel(patient?.gender)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs uppercase font-semibold">Date of Birth</Label>
                    <p className="text-sm font-medium text-foreground mt-1">
                      {patient?.dob
                        ? new Date(patient.dob).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs uppercase font-semibold">Age</Label>
                    <p className="text-sm font-medium text-foreground mt-1">{formatDetailedAge(patient?.dob)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs uppercase font-semibold">Blood Group</Label>
                    <p className="text-sm font-medium text-foreground mt-1">{patient?.blood_group || "N/A"}</p>
                  </div>
                  {patient?.id_proof_type && (
                    <div>
                      <Label className="text-muted-foreground text-xs uppercase font-semibold">Govt ID Proof</Label>
                      <p className="text-sm font-medium text-foreground mt-1 capitalize">
                        {patient.id_proof_type.replace(/_/g, " ")}:{" "}
                        <span className="font-mono">{patient.id_proof_number || "--"}</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Dynamic Custom Intake Demographics in View Mode */}
              {((patientFieldConfigs && patientFieldConfigs.length > 0) ||
                (patient?.custom_fields && Object.keys(patient.custom_fields).length > 0)) && (
                <div className="space-y-4 rounded-xl border bg-card p-5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-600 text-[10px] font-bold">
                        ★
                      </span>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Additional Demographic Intake Attributes
                      </h3>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => setIsViewMode(false)}
                      className="gap-1 text-xs text-primary hover:text-primary/80"
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </Button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    {patientFieldConfigs.map((f) => {
                      const key = f.field_key || f.field_name || `field_${f.id}`
                      const val = patient?.custom_fields?.[key]
                      if (val === undefined || val === null || val === "") return null

                      return (
                        <div key={f.id}>
                          <Label className="text-muted-foreground text-xs uppercase font-semibold">
                            {f.label}
                          </Label>
                          <p className="text-sm font-medium text-foreground mt-1">
                            {typeof val === "boolean" ? (val ? "Yes" : "No") : String(val)}
                          </p>
                        </div>
                      )
                    })}

                    {/* Any extra custom field in DB not in current active configs */}
                    {patient?.custom_fields &&
                      Object.entries(patient.custom_fields)
                        .filter(([k]) => !patientFieldConfigs.some((cfg) => (cfg.field_key || cfg.field_name) === k))
                        .map(([k, v]) => (
                          <div key={k}>
                            <Label className="text-muted-foreground text-xs uppercase font-semibold capitalize">
                              {k.replace(/_/g, " ")}
                            </Label>
                            <p className="text-sm font-medium text-foreground mt-1">
                              {typeof v === "boolean" ? (v ? "Yes" : "No") : String(v)}
                            </p>
                          </div>
                        ))}
                  </div>
                </div>
              )}

              {/* Guardian Details */}
              {(patient?.guardian_name || patient?.guardian_phone) && (
                <div className="space-y-4 rounded-xl border bg-card p-5 shadow-2xs">
                  {sectionHeader("02", "Guardian Info")}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <Label className="text-muted-foreground text-xs uppercase font-semibold">Guardian Name</Label>
                      <p className="text-sm font-semibold text-foreground mt-1">{patient?.guardian_name || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs uppercase font-semibold">Relation</Label>
                      <p className="text-sm font-medium text-foreground mt-1">{patient?.guardian_relation || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs uppercase font-semibold">Guardian Phone</Label>
                      <p className="text-sm font-medium font-mono text-foreground mt-1">
                        {patient?.guardian_phone || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Contact & Residential Address */}
              <div className="space-y-4 rounded-xl border bg-card p-5 shadow-2xs">
                {sectionHeader("03", "Residential Contact Details")}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-3">
                    <Label className="text-muted-foreground text-xs uppercase font-semibold">Street Address</Label>
                    <p className="text-sm font-medium text-foreground mt-1">{patient?.address || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs uppercase font-semibold">City</Label>
                    <p className="text-sm font-medium text-foreground mt-1">{patient?.city || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs uppercase font-semibold">District</Label>
                    <p className="text-sm font-medium text-foreground mt-1">{patient?.district || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs uppercase font-semibold">State</Label>
                    <p className="text-sm font-medium text-foreground mt-1">{patient?.state || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs uppercase font-semibold">Pincode</Label>
                    <p className="text-sm font-mono text-foreground mt-1">{patient?.pincode || "N/A"}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ════════════════════════════════════════════════════════════════
               EDIT / REGISTER MODE
               ════════════════════════════════════════════════════════════════ */
            <form id="patient-drawer-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Status Banner explaining what is editable */}
              {isAbhaVerified && !isCreateMode ? (
                <div className="flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 p-3.5 text-xs text-blue-700 dark:text-blue-300">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">
                      ABHA Verified Digital Patient (ABDM NHA Compliance):
                    </p>
                    <p className="text-[11px] leading-relaxed text-blue-800 dark:text-blue-200">
                      <strong>Name</strong>, <strong>Gender</strong>, and <strong>Date of Birth</strong> are locked as verified government credentials.
                      <br />
                      ✓ <strong>Mobile, Email, ID Proof, Address, Guardian, Blood Group</strong>, and <strong>all Custom Intake Fields</strong> can be edited below.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>
                    <strong>Standard Patient Record:</strong> All core demographics, contact numbers, address details, and custom intake fields can be modified.
                  </span>
                </div>
              )}

              {/* Section 01: Demographics */}
              <div className="space-y-4 rounded-xl border bg-card p-5 shadow-2xs">
                <div className="flex items-center justify-between">
                  {sectionHeader("01", "Demographics & Personal Details")}
                  <Badge variant="outline" className="text-[10px]">
                    {isAbhaVerified && !isCreateMode ? "Selective Edit Mode" : "Full Edit Mode"}
                  </Badge>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Full Patient Name *</Label>
                      {isAbhaVerified && !isCreateMode && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                          <Lock className="h-3 w-3" /> ABHA Locked
                        </span>
                      )}
                    </div>
                    <Input
                      placeholder="e.g. Ramesh Kumar"
                      className="mt-1 text-xs"
                      disabled={isAbhaVerified && !isCreateMode}
                      {...register("name", { required: "Full name is required" })}
                    />
                    {errors.name && (
                      <p className="text-[11px] text-destructive mt-1">{errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">Mobile Number</Label>
                    <Input
                      type="tel"
                      placeholder="10-digit mobile"
                      className="mt-1 font-mono text-xs"
                      {...register("mobile")}
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">Email Address (Optional)</Label>
                    <Input
                      type="email"
                      placeholder="patient@email.com"
                      className="mt-1 text-xs"
                      {...register("email")}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Gender</Label>
                      {isAbhaVerified && !isCreateMode && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                          <Lock className="h-3 w-3" /> ABHA Locked
                        </span>
                      )}
                    </div>
                    <select
                      {...register("gender")}
                      disabled={isAbhaVerified && !isCreateMode}
                      className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
                    >
                      {GENDER_OPTIONS.map((g) => (
                        <option key={g.value} value={g.value}>
                          {g.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">Blood Group</Label>
                    <select
                      {...register("blood_group")}
                      className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
                    >
                      <option value="">Select Blood Group</option>
                      {BLOOD_GROUP_OPTIONS.map((bg) => (
                        <option key={bg.value} value={bg.value}>
                          {bg.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Dual DOB & Age Breakdown Picker with Auto-Calculation */}
                  <div className="sm:col-span-2 p-3.5 rounded-xl border border-border/80 bg-muted/20">
                    <DobAgePicker
                      dobValue={currentDob}
                      isAbhaLocked={isAbhaVerified && !isCreateMode}
                      onChange={(val) => {
                        setValue("dob", val.dob || "", { shouldValidate: true })
                      }}
                    />
                  </div>

                  {/* Govt ID Proof Type & Number */}
                  <div>
                    <Label className="text-xs font-semibold">Government ID Proof Type</Label>
                    <select
                      {...register("id_proof_type")}
                      className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
                    >
                      <option value="">Select ID Type (Optional)</option>
                      {ID_PROOF_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">ID Proof Number</Label>
                    <Input
                      placeholder="e.g. ABCD1234E or ID number"
                      className="mt-1 font-mono text-xs"
                      {...register("id_proof_number")}
                    />
                  </div>
                </div>
              </div>

              {/* Section 02: Dynamic Intake Demographics (Configured via Settings) */}
              {patientFieldConfigs && patientFieldConfigs.length > 0 && (
                <div className="space-y-4 rounded-xl border bg-card p-5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary text-[10px] font-bold">
                        02
                      </span>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Additional Intake Demographics
                      </h3>
                    </div>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      Dynamic Settings Fields
                    </span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {patientFieldConfigs.map((f) => {
                      const key = f.field_key || f.field_name || `field_${f.id}`
                      const val = customFields[key] ?? ""
                      const isReq = Boolean(f.is_required)

                      if (f.input_type === "select") {
                        return (
                          <div key={f.id} className="sm:col-span-1">
                            <Label className="text-xs font-semibold">
                              {f.label} {isReq && <span className="text-destructive">*</span>}
                            </Label>
                            <select
                              value={val}
                              onChange={(e) =>
                                setCustomFields((prev) => ({ ...prev, [key]: e.target.value }))
                              }
                              className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
                            >
                              <option value="">{f.placeholder || `-- Select ${f.label} --`}</option>
                              {Array.isArray(f.options) &&
                                f.options.map((opt, i) => (
                                  <option key={i} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                            </select>
                          </div>
                        )
                      }

                      if (f.input_type === "boolean") {
                        return (
                          <div key={f.id} className="sm:col-span-1 flex items-center pt-5">
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground">
                              <input
                                type="checkbox"
                                checked={Boolean(val)}
                                onChange={(e) =>
                                  setCustomFields((prev) => ({ ...prev, [key]: e.target.checked }))
                                }
                                className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                              />
                              <span>
                                {f.label} {isReq && <span className="text-destructive">*</span>}
                              </span>
                            </label>
                          </div>
                        )
                      }

                      if (f.input_type === "textarea") {
                        return (
                          <div key={f.id} className="sm:col-span-2">
                            <Label className="text-xs font-semibold">
                              {f.label} {isReq && <span className="text-destructive">*</span>}
                            </Label>
                            <textarea
                              rows={2}
                              value={val}
                              onChange={(e) =>
                                setCustomFields((prev) => ({ ...prev, [key]: e.target.value }))
                              }
                              placeholder={f.placeholder || `Enter ${f.label}`}
                              className="mt-1 flex w-full rounded-md border border-input bg-background p-2 text-xs shadow-xs"
                            />
                          </div>
                        )
                      }

                      return (
                        <div key={f.id} className="sm:col-span-1">
                          <Label className="text-xs font-semibold">
                            {f.label} {isReq && <span className="text-destructive">*</span>}
                          </Label>
                          <Input
                            type={
                              f.input_type === "number"
                                ? "number"
                                : f.input_type === "date"
                                ? "date"
                                : "text"
                            }
                            value={val}
                            onChange={(e) =>
                              setCustomFields((prev) => ({ ...prev, [key]: e.target.value }))
                            }
                            placeholder={f.placeholder || `Enter ${f.label}`}
                            className="mt-1 text-xs"
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Section 03: Guardian Information */}
              <div className="space-y-4 rounded-xl border bg-card p-5 shadow-2xs">
                {sectionHeader(
                  patientFieldConfigs && patientFieldConfigs.length > 0 ? "03" : "02",
                  "Guardian Information"
                )}

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <Label className="text-xs font-semibold">Guardian Name</Label>
                    <Input
                      placeholder="e.g. Robert Doe"
                      className="mt-1 text-xs"
                      {...register("guardian_name")}
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">Guardian Relation</Label>
                    <select
                      {...register("guardian_relation")}
                      className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
                    >
                      <option value="">Select Relation</option>
                      {GUARDIAN_RELATION_OPTIONS.map((rel) => (
                        <option key={rel.value} value={rel.value}>
                          {rel.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">Guardian Phone</Label>
                    <Input
                      placeholder="e.g. 9876500000"
                      className="mt-1 font-mono text-xs"
                      {...register("guardian_phone")}
                    />
                  </div>
                </div>
              </div>

              {/* Section 04: Residential Address */}
              <div className="space-y-4 rounded-xl border bg-card p-5 shadow-2xs">
                {sectionHeader(
                  patientFieldConfigs && patientFieldConfigs.length > 0 ? "04" : "03",
                  "Residential Address"
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label className="text-xs font-semibold">Street / House Address</Label>
                    <textarea
                      rows={2}
                      placeholder="e.g. House No. 45, Ground Floor, Sector 15"
                      className="mt-1 w-full rounded-md border border-input bg-background p-2.5 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                      {...register("address")}
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">City / Town</Label>
                    <Input placeholder="e.g. Ranchi" className="mt-1 text-xs" {...register("city")} />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">District</Label>
                    <Input placeholder="e.g. Ranchi" className="mt-1 text-xs" {...register("district")} />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">State</Label>
                    <Input placeholder="e.g. Jharkhand" className="mt-1 text-xs" {...register("state")} />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">Pincode</Label>
                    <Input
                      placeholder="6-digit PIN"
                      maxLength={6}
                      className="mt-1 font-mono text-xs"
                      {...register("pincode")}
                    />
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Drawer Sticky Footer */}
        <div className="sticky bottom-0 z-20 flex items-center justify-between border-t border-border bg-card/95 backdrop-blur-xs px-6 py-4 shadow-lg">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (patient?.id && !isViewMode) {
                setIsViewMode(true)
              } else {
                onClose(false)
              }
            }}
            disabled={mutation.isPending}
            className="text-xs font-semibold"
          >
            {isViewMode ? "Close Panel" : patient?.id ? "Cancel Edit" : "Cancel"}
          </Button>

          {isViewMode ? (
            <div className="flex items-center gap-2">
              {patient?.id && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsViewMode(false)}
                  className="gap-1.5 border-primary/40 text-primary hover:bg-primary/10 font-semibold text-xs shadow-xs"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit Patient Details
                </Button>
              )}

              <Button
                type="button"
                onClick={() => {
                  onClose(false)
                  navigate("/reception")
                }}
                className="gap-1.5 bg-primary font-semibold text-primary-foreground hover:bg-primary/90 text-xs shadow-xs"
              >
                <Stethoscope className="h-4 w-4" />
                Create OPD Visit / Slip
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              type="submit"
              form="patient-drawer-form"
              disabled={mutation.isPending}
              className="bg-primary hover:bg-primary/90 font-semibold text-primary-foreground text-xs shadow-xs min-w-[140px]"
            >
              {mutation.isPending ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Saving Changes...
                </>
              ) : isCreateMode ? (
                "Register Patient"
              ) : (
                "Save Patient Changes"
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Official ABHA Card Modal */}
      <AbhaCardModal
        open={isAbhaCardOpen}
        onClose={() => setIsAbhaCardOpen(false)}
        patient={patient || null}
      />

      {/* Link ABHA to Existing Patient Modal */}
      <LinkAbhaModal
        open={isLinkAbhaOpen}
        onClose={() => setIsLinkAbhaOpen(false)}
        patient={patient || null}
        onLinked={() => {
          queryClient.invalidateQueries({ queryKey: queryKeys.patients.all })
          onClose(false)
        }}
      />
    </>
  )
}
