import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { useForm, Controller, type SubmitHandler } from "react-hook-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Calendar,
  Stethoscope,
  ShieldCheck,
  ArrowRight,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { FormField, FormSelectField } from "@/components/ui/form-fields"
import { FormContainer } from "@/components/formContainer"
import { sectionHeader } from "@/components/sectionHeader"
import { patientService } from "@/services/patientService"
import { queryKeys } from "@/constants/queryKeys"
import {
  PATIENT_FORM_INITIAL_DATA,
  GENDER_OPTIONS,
  BLOOD_GROUP_OPTIONS,
  GUARDIAN_RELATION_OPTIONS,
  MARITAL_STATUS_OPTIONS,
} from "@/constants/patient.constants"
import { PatientAvatar } from "@/components/common"
import type { Patient, RegisterPatientWithoutAbhaDto } from "@/types/patient"

interface PatientFormValues {
  name: string
  guardian_name?: string
  guardian_relation?: string
  guardian_phone?: string
  mobile?: string
  gender: "M" | "F" | "O" | ""
  dob?: string
  blood_group?: string
  address?: string
  city?: string
  district?: string
  state?: string
  pincode?: string
  marital_status?: string
  occupation?: string
}

interface PatientEditProps {
  open: boolean
  onClose: (open: boolean) => void
  patient?: (Patient & { viewMode?: boolean }) | null
}

export default function PatientEdit({ open, onClose, patient }: PatientEditProps) {
  const navigate = useNavigate()
  const isViewMode = !!patient?.viewMode
  const isCreateMode = !patient?.id
  const [currentDate] = useState(() => new Date())

  const { handleSubmit, control, reset } = useForm<PatientFormValues>({
    defaultValues: PATIENT_FORM_INITIAL_DATA,
    mode: "onChange",
  })

  useEffect(() => {
    if (open) {
      if (!isCreateMode && patient) {
        reset({
          name: patient.name || "",
          guardian_name: patient.guardian_name || "",
          guardian_relation: patient.guardian_relation || "",
          guardian_phone: patient.guardian_phone || "",
          mobile: patient.mobile || "",
          gender: patient.gender || "",
          blood_group: patient.blood_group || "",
          address: patient.address || "",
          city: patient.city || "",
          district: patient.district || "",
          state: patient.state || "",
          pincode: patient.pincode || "",
          marital_status: patient.custom_fields?.marital_status || "",
          occupation: patient.custom_fields?.occupation || "",
        })
      } else {
        reset(PATIENT_FORM_INITIAL_DATA)
      }
    }
  }, [open, patient, reset, isCreateMode])

  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (data: PatientFormValues) => {
      const custom_fields: Record<string, string> = {}
      if (data.marital_status) custom_fields.marital_status = data.marital_status
      if (data.occupation) custom_fields.occupation = data.occupation

      const payload: RegisterPatientWithoutAbhaDto = {
        name: data.name,
        guardian_name: data.guardian_name || undefined,
        guardian_relation: data.guardian_relation || undefined,
        guardian_phone: data.guardian_phone || undefined,
        mobile: data.mobile || undefined,
        gender: data.gender || undefined,
        dob: data.dob || undefined,
        blood_group: data.blood_group || undefined,
        address: data.address || undefined,
        city: data.city || undefined,
        district: data.district || undefined,
        state: data.state || undefined,
        pincode: data.pincode || undefined,
        ...(Object.keys(custom_fields).length > 0 ? { custom_fields } : {}),
      }
      return patientService.registerPatientWithoutAbha(payload)
    },
    onSuccess: (newPatient) => {
      toast.success(`Patient registered successfully with UHID: ${newPatient.uhid}`)
      queryClient.invalidateQueries({ queryKey: queryKeys.patients.all })
      reset()
      onClose(false)
    },
    meta: {
      errorTitle: "Failed to register patient",
    },
  })

  const onSubmit: SubmitHandler<PatientFormValues> = (data) => {
    mutation.mutate(data)
  }

  // Calculate age for view mode helper
  const calculateAge = (dobString?: string) => {
    if (!dobString) return "N/A"
    const dob = new Date(dobString)
    if (isNaN(dob.getTime())) return "N/A"
    const diffMs = currentDate.getTime() - dob.getTime()
    const ageDate = new Date(diffMs)
    return `${Math.abs(ageDate.getUTCFullYear() - 1970)} Years`
  }

  const formatGenderLabel = (genderVal?: string) => {
    if (genderVal === "M") return "Male"
    if (genderVal === "F") return "Female"
    if (genderVal === "O") return "Other"
    return genderVal || "N/A"
  }

  return (
    <FormContainer
      variant="modal"
      open={open}
      onOpenChange={(isOpen) => onClose(isOpen)}
      title={
        isViewMode
          ? `Patient Profile - ${patient?.name || ""}`
          : "Register New Patient"
      }
      description={
        isViewMode
          ? "Detailed hospital registry demographic information and ABHA keys."
          : "Manually register a normal walk-in patient. Guardian, demographic, and contact fields can be captured."
      }
      size="lg"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onClose(false)}
            disabled={mutation.isPending}
          >
            {isViewMode ? "Close" : "Cancel"}
          </Button>

          {isViewMode && (
            <Button
              type="button"
              onClick={() => {
                onClose(false)
                navigate("/reception")
              }}
              className="gap-1.5 bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Stethoscope className="h-4 w-4" />
              Create OPD Visit / Slip
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}

          {!isViewMode && (
            <Button
              type="submit"
              form="patient-reg-form"
              disabled={mutation.isPending}
              className="bg-blue-600 font-semibold text-white hover:bg-blue-700 active:scale-[0.98] transition-all"
            >
              {mutation.isPending ? "Registering..." : "Register Patient"}
            </Button>
          )}
        </div>
      }
    >
      {isViewMode ? (
        <div className="space-y-6">
          {/* View Mode: UHID & Registry Banner */}
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
                subtitle={[patient?.address, patient?.district || patient?.city, patient?.state, patient?.pincode].filter(Boolean).join(", ")}
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                    Unique Health Identification (UHID)
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
            {patient?.created_at && (
              <div className="text-left sm:text-right">
                <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  Registration Date
                </span>
                <p className="text-xs font-semibold text-foreground">
                  {new Date(patient.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            )}
          </div>

          {/* View Mode: Clinical & Visit History Summary */}
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
              <p className="text-sm font-bold text-foreground mt-1">
                {patient?.last_department || "General Consultation"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
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

          {/* View Mode: Demographics */}
          <div className="space-y-4 rounded-xl border bg-card p-6 shadow-2xs">
            {sectionHeader("01", "Demographics & Personal Details")}
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label className="text-muted-foreground text-xs uppercase font-semibold">Full Name</Label>
                <p className="text-sm font-semibold text-foreground mt-1">{patient?.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase font-semibold">Mobile Number</Label>
                <p className="text-sm font-medium text-foreground mt-1">{patient?.mobile || "N/A"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase font-semibold">Email Address</Label>
                <p className="text-sm font-medium text-foreground mt-1">{patient?.email || "N/A"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase font-semibold">Gender</Label>
                <p className="text-sm font-medium text-foreground mt-1">
                  {formatGenderLabel(patient?.gender)}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase font-semibold">Date of Birth</Label>
                <p className="text-sm font-medium text-foreground mt-1">
                  {patient?.dob ? new Date(patient.dob).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  }) : "N/A"}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase font-semibold">Age</Label>
                <p className="text-sm font-medium text-foreground mt-1">{calculateAge(patient?.dob)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase font-semibold">Blood Group</Label>
                <p className="text-sm font-medium text-foreground mt-1">{patient?.blood_group || "N/A"}</p>
              </div>
              {patient?.custom_fields?.marital_status && (
                <div>
                  <Label className="text-muted-foreground text-xs uppercase font-semibold">Marital Status</Label>
                  <p className="text-sm font-medium text-foreground mt-1">{patient.custom_fields.marital_status}</p>
                </div>
              )}
              {patient?.custom_fields?.occupation && (
                <div>
                  <Label className="text-muted-foreground text-xs uppercase font-semibold">Occupation</Label>
                  <p className="text-sm font-medium text-foreground mt-1">{patient.custom_fields.occupation}</p>
                </div>
              )}
            </div>
          </div>

          {/* View Mode: Guardian Details */}
          {(patient?.guardian_name || patient?.guardian_phone) && (
            <div className="space-y-4 rounded-xl border bg-card p-6 shadow-2xs">
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
                  <p className="text-sm font-medium text-foreground mt-1">{patient?.guardian_phone || "N/A"}</p>
                </div>
              </div>
            </div>
          )}

          {/* View Mode: Contact & Address */}
          <div className="space-y-4 rounded-xl border bg-card p-6 shadow-2xs">
            {sectionHeader("03", "Residential Contact Details")}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-3">
                <Label className="text-muted-foreground text-xs uppercase font-semibold">Residential Address</Label>
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

          {/* View Mode: ABDM/ABHA Identity */}
          <div className="space-y-4 rounded-xl border border-emerald-500/10 bg-emerald-500/[0.02] p-6 shadow-2xs">
            {sectionHeader("04", "ABDM Digital Health Identity Details")}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-muted-foreground text-xs uppercase font-semibold">ABHA Number</Label>
                <p className="text-sm font-mono font-medium text-emerald-700 dark:text-emerald-400 mt-1">
                  {patient?.abha_number || "NOT LINKED"}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase font-semibold">ABHA Address</Label>
                <p className="text-sm font-mono font-medium text-emerald-700 dark:text-emerald-400 mt-1">
                  {patient?.abha_address || "NOT LINKED"}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <form
          id="patient-reg-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6"
        >
          {/* Section 01: Demographics */}
          <div className="space-y-4 rounded-xl border bg-card p-4 shadow-2xs sm:p-6">
            {sectionHeader("01", "Demographics & Personal Details")}

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={control}
                name="name"
                label="Full Patient Name"
                placeholder="e.g. Ramesh Kumar"
                required
                className="sm:col-span-2"
              />

              <FormField
                control={control}
                name="mobile"
                label="Mobile Number"
                placeholder="e.g. 9876543210"
              />

              <FormSelectField
                control={control}
                name="gender"
                label="Gender"
                options={GENDER_OPTIONS}
                placeholder="Select Gender"
              />

              <FormField
                control={control}
                name="dob"
                label="Date of Birth"
                inputType="date"
              />

              <FormSelectField
                control={control}
                name="blood_group"
                label="Blood Group"
                options={BLOOD_GROUP_OPTIONS}
                placeholder="Select Blood Group"
              />

              <FormSelectField
                control={control}
                name="marital_status"
                label="Marital Status"
                options={MARITAL_STATUS_OPTIONS}
                placeholder="Select Marital Status"
              />

              <FormField
                control={control}
                name="occupation"
                label="Occupation"
                placeholder="e.g. Engineer"
                className="sm:col-span-2"
              />
            </div>
          </div>

          {/* Section 02: Guardian Information */}
          <div className="space-y-4 rounded-xl border bg-card p-4 shadow-2xs sm:p-6">
            {sectionHeader("02", "Guardian Information")}

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={control}
                name="guardian_name"
                label="Guardian Name"
                placeholder="e.g. Robert Doe"
              />

              <FormSelectField
                control={control}
                name="guardian_relation"
                label="Guardian Relation"
                options={GUARDIAN_RELATION_OPTIONS}
                placeholder="Select Relation"
              />

              <FormField
                control={control}
                name="guardian_phone"
                label="Guardian Phone"
                placeholder="e.g. 9876500000"
              />
            </div>
          </div>

          {/* Section 03: Residential Address */}
          <div className="space-y-4 rounded-xl border bg-card p-4 shadow-2xs sm:p-6">
            {sectionHeader("03", "Residential Address")}

            <div className="grid gap-4 sm:grid-cols-3">
              <Controller
                control={control}
                name="address"
                render={({ field }) => (
                  <div className="space-y-1.5 sm:col-span-3">
                    <Label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                      Residential Street Address
                    </Label>
                    <textarea
                      {...field}
                      value={field.value || ""}
                      rows={2}
                      placeholder="e.g. House No. 45, Ground Floor, Sector 15"
                      className="w-full rounded-md border border-input bg-background p-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                )}
              />

              <FormField
                control={control}
                name="city"
                label="City / Town"
                placeholder="e.g. New Delhi"
              />

              <FormField
                control={control}
                name="district"
                label="District"
                placeholder="e.g. Central Delhi"
              />

              <FormField
                control={control}
                name="state"
                label="State"
                placeholder="e.g. Delhi"
              />

              <FormField
                control={control}
                name="pincode"
                label="Pincode"
                placeholder="e.g. 110001"
              />
            </div>
          </div>
        </form>
      )}
    </FormContainer>
  )
}

