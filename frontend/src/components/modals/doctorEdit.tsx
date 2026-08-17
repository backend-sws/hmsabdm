import { useEffect, useState } from "react"
import { useForm, useFieldArray, Controller, type SubmitHandler } from "react-hook-form"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Clock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { FormField, FormSelectField } from "@/components/ui/form-fields"
import { FormContainer } from "@/components/formContainer"
import { sectionHeader } from "@/components/sectionHeader"
import { doctorService } from "@/services/doctorService"
import { departmentService } from "@/services/departmentService"
import { queryKeys } from "@/constants/queryKeys"
import { DOCTOR_FORM_INITIAL_DATA, DAYS_OF_WEEK } from "@/constants/doctor.constants"
import type { Doctor, DoctorSchedule } from "@/types/doctor"

interface DoctorEditProps {
  open: boolean
  onClose: (open: boolean) => void
  doctor?: (Doctor & { viewMode?: boolean }) | null
}

interface DoctorFormValues {
  name: string
  username?: string
  password?: string
  email?: string
  phone?: string
  department_id: string | number
  specialization?: string
  qualification?: string
  hpr_id?: string
  consultation_time?: number
  is_active: boolean
  schedules: {
    day_of_week: number
    enabled: boolean
    start_time: string
    end_time: string
    max_patients: number
    opd_fee: number | string
  }[]
}

export default function DoctorEdit({ open, onClose, doctor }: DoctorEditProps) {
  const isViewMode = !!doctor?.viewMode
  const isEditMode = !!doctor?.id && !doctor?.viewMode
  const doctorId = doctor?.id

  const [activeTab, setActiveTab] = useState<"profile" | "schedule">("profile")

  const { handleSubmit, control, reset, register, watch } = useForm<DoctorFormValues>({
    defaultValues: {
      ...DOCTOR_FORM_INITIAL_DATA,
      schedules: Array.from({ length: 7 }, (_, i) => ({
        day_of_week: i,
        enabled: false,
        start_time: "09:00",
        end_time: "17:00",
        max_patients: 30,
        opd_fee: "",
      })),
    },
    mode: "onChange",
  })

  const { fields } = useFieldArray({
    control,
    name: "schedules",
  })

  // Fetch active departments for dropdown
  const { data: deptData } = useQuery({
    queryKey: queryKeys.departments.all,
    queryFn: () => departmentService.getDepartments({ all: true, is_active: true }),
    enabled: open,
  })

  const departmentOptions = (Array.isArray(deptData) ? deptData : (deptData as any)?.data || [])
    .map((dept: any) => ({
      label: `${dept.name} (${dept.code})`,
      value: String(dept.id),
    }))

  useEffect(() => {
    if (open) {
      setActiveTab("profile")
      if (isEditMode || isViewMode) {
        // Map schedules to 7 days
        const existingSchedules = doctor?.schedules || []
        const mappedSchedules = Array.from({ length: 7 }, (_, i) => {
          const match = existingSchedules.find((s) => Number(s.day_of_week) === i)
          return {
            day_of_week: i,
            enabled: !!match && match.is_active !== false,
            start_time: match?.start_time ? match.start_time.substring(0, 5) : "09:00",
            end_time: match?.end_time ? match.end_time.substring(0, 5) : "17:00",
            max_patients: match?.max_patients ?? 30,
            opd_fee: match?.opd_fee !== undefined && match?.opd_fee !== null ? String(match.opd_fee) : "",
          }
        })

        reset({
          name: doctor?.name || "",
          username: doctor?.username || "",
          password: "",
          email: doctor?.email || "",
          phone: doctor?.phone || "",
          department_id: doctor?.department_id ? String(doctor.department_id) : "",
          specialization: doctor?.specialization || "",
          qualification: doctor?.qualification || "",
          hpr_id: doctor?.hpr_id || "",
          consultation_time: doctor?.consultation_time ?? 15,
          is_active: doctor?.is_active ?? true,
          schedules: mappedSchedules,
        })
      } else {
        reset({
          ...DOCTOR_FORM_INITIAL_DATA,
          schedules: Array.from({ length: 7 }, (_, i) => ({
            day_of_week: i,
            enabled: false,
            start_time: "09:00",
            end_time: "17:00",
            max_patients: 30,
            opd_fee: "",
          })),
        })
      }
    }
  }, [open, doctor, reset, isEditMode, isViewMode])

  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async (values: DoctorFormValues) => {
      const doctorPayload: any = {
        name: values.name,
        username: values.username || undefined,
        email: values.email || undefined,
        phone: values.phone || undefined,
        department_id: Number(values.department_id),
        specialization: values.specialization || undefined,
        qualification: values.qualification || undefined,
        hpr_id: values.hpr_id || undefined,
        consultation_time: Number(values.consultation_time),
        is_active: values.is_active,
      }

      if (values.password) {
        doctorPayload.password = values.password
      }

      // 1. Create or Update Doctor
      let savedDoctor: Doctor
      if (isEditMode && doctorId) {
        savedDoctor = await doctorService.updateDoctor(doctorId, doctorPayload)
      } else {
        savedDoctor = await doctorService.createDoctor(doctorPayload)
      }

      // 2. Submit schedules
      const activeSchedules: DoctorSchedule[] = values.schedules
        .filter((s) => s.enabled)
        .map((s) => ({
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time,
          max_patients: s.max_patients ? Number(s.max_patients) : 30,
          opd_fee: s.opd_fee !== "" && s.opd_fee !== null ? Number(s.opd_fee) : 0,
          is_active: true,
        }))

      await doctorService.updateSchedule(savedDoctor.id, activeSchedules)
      return savedDoctor
    },
    onSuccess: () => {
      toast.success(
        isEditMode ? "Doctor profile and schedule updated" : "Doctor profile registered successfully"
      )
      queryClient.invalidateQueries({ queryKey: queryKeys.doctors.all })
      onClose(false)
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save doctor details")
    },
  })

  const onSubmit: SubmitHandler<DoctorFormValues> = (data) => {
    mutation.mutate(data)
  }

  return (
    <FormContainer
      variant="modal"
      open={open}
      onOpenChange={(isOpen) => onClose(isOpen)}
      title={
        isViewMode
          ? `Doctor Profile - ${doctor?.name}`
          : isEditMode
            ? "Edit Physician Profile"
            : "Add Doctor Profile"
      }
      description={
        isViewMode
          ? "Viewing clinical specialties, registry info, and weekly OPD duty hours."
          : isEditMode
            ? "Modify profile details, credentials, and weekly OPD scheduling."
            : "Create user credentials and configure OPD rosters for a new physician."
      }
      size="xl"
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

          {!isViewMode && (
            <Button
              type="submit"
              form="doctor-form"
              disabled={mutation.isPending}
              className="bg-blue-600 font-semibold text-white hover:bg-blue-700 active:scale-[0.98] transition-all"
            >
              {mutation.isPending ? "Saving Records..." : isEditMode ? "Save Changes" : "Register Doctor"}
            </Button>
          )}
        </div>
      }
    >
      {/* Tabs Switcher */}
      <div className="flex border-b border-border mb-6">
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`px-4 py-2 text-xs uppercase font-bold tracking-wider border-b-2 transition-all -mb-px active:scale-95 ${
            activeTab === "profile"
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Physician Profile
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("schedule")}
          className={`px-4 py-2 text-xs uppercase font-bold tracking-wider border-b-2 transition-all -mb-px active:scale-95 ${
            activeTab === "schedule"
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          OPD Weekly Schedule
        </button>
      </div>

      <form id="doctor-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="space-y-6">
            {/* Section 01: Core Information */}
            <div className="space-y-4 rounded-xl border bg-card p-4 shadow-2xs sm:p-6">
              {sectionHeader("01", "Physician Information")}

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={control}
                  name="name"
                  label="DOCTOR FULL NAME"
                  placeholder="e.g. Dr. Vikram Sethi"
                  required
                  readOnly={isViewMode}
                  className="sm:col-span-2"
                />

                <FormSelectField
                  control={control}
                  name="department_id"
                  label="ASSIGNED DEPARTMENT"
                  options={departmentOptions}
                  placeholder="Select Clinical Wing..."
                  required
                  disabled={isViewMode}
                />

                <FormField
                  control={control}
                  name="consultation_time"
                  label="CONSULTATION SLOT TIME (MINUTES)"
                  placeholder="e.g. 15"
                  required
                  inputType="number"
                  readOnly={isViewMode}
                />

                <FormField
                  control={control}
                  name="specialization"
                  label="CLINICAL SPECIALTY"
                  placeholder="e.g. Pediatric Cardiology"
                  readOnly={isViewMode}
                />

                <FormField
                  control={control}
                  name="qualification"
                  label="QUALIFICATIONS & DEGREES"
                  placeholder="e.g. MBBS, MD, DM"
                  readOnly={isViewMode}
                />

                <FormField
                  control={control}
                  name="hpr_id"
                  label="HPR ID (ABDM REGISTRY)"
                  placeholder="e.g. 1234-5678-9012"
                  readOnly={isViewMode}
                />

                <Controller
                  control={control}
                  name="is_active"
                  render={({ field }) => (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                        ROSTER STATUS
                      </Label>
                      <select
                        value={field.value ? "true" : "false"}
                        onChange={(e) => field.onChange(e.target.value === "true")}
                        disabled={isViewMode}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent text-foreground cursor-pointer"
                      >
                        <option value="true">Active & Listed</option>
                        <option value="false">Deactivated / Suspended</option>
                      </select>
                    </div>
                  )}
                />
              </div>
            </div>

            {/* Section 02: Login Credentials */}
            <div className="space-y-4 rounded-xl border bg-card p-4 shadow-2xs sm:p-6">
              {sectionHeader("02", "Login Credentials & Contact")}

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={control}
                  name="email"
                  label="EMAIL ADDRESS"
                  placeholder="dr.vikram@hospital.com"
                  inputType="email"
                  readOnly={isViewMode}
                />

                <FormField
                  control={control}
                  name="phone"
                  label="CONTACT PHONE"
                  placeholder="e.g. 9876543210"
                  inputType="tel"
                  readOnly={isViewMode}
                />

                <FormField
                  control={control}
                  name="username"
                  label="LOGIN USERNAME"
                  placeholder="Leave empty to auto-generate"
                  readOnly={isViewMode || isEditMode}
                />

                <FormField
                  control={control}
                  name="password"
                  label={isEditMode ? "RESET LOGIN PASSWORD" : "LOGIN PASSWORD"}
                  placeholder={isEditMode ? "Leave empty to keep current" : "••••••••"}
                  inputType="password"
                  required={!isEditMode}
                  readOnly={isViewMode}
                />
              </div>
            </div>
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === "schedule" && (
          <div className="space-y-4 rounded-xl border bg-card p-4 shadow-2xs sm:p-6">
            {sectionHeader("03", "Weekly OPD Duty Timings")}
            <p className="text-xs text-muted-foreground mb-4">
              Toggle days and enter OPD timings, max consulting capacity, and consultation fees.
            </p>

            <div className="space-y-3">
              {fields.map((field, index) => {
                const isEnabled = watch(`schedules.${index}.enabled`)
                const dayName = DAYS_OF_WEEK[index].label

                return (
                  <div
                    key={field.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isEnabled
                        ? "border-blue-200 bg-blue-50/20 dark:border-blue-900/40 dark:bg-blue-950/10"
                        : "border-border bg-card/50 opacity-60"
                    }`}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="flex items-center gap-3 min-w-[150px]">
                        <input
                          type="checkbox"
                          id={`schedule-${index}`}
                          {...register(`schedules.${index}.enabled` as const)}
                          disabled={isViewMode}
                          className="h-4.5 w-4.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <Label
                          htmlFor={`schedule-${index}`}
                          className="font-bold text-xs text-foreground cursor-pointer disabled:cursor-not-allowed uppercase tracking-wider"
                        >
                          {dayName}
                        </Label>
                      </div>

                      {isEnabled ? (
                        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-1 sm:items-center sm:gap-4">
                          <div className="space-y-1 sm:flex-1">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase">
                              Start Time
                            </Label>
                            <input
                              type="time"
                              {...register(`schedules.${index}.start_time` as const, { required: isEnabled })}
                              disabled={isViewMode}
                              className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                          </div>

                          <div className="space-y-1 sm:flex-1">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase">
                              End Time
                            </Label>
                            <input
                              type="time"
                              {...register(`schedules.${index}.end_time` as const, { required: isEnabled })}
                              disabled={isViewMode}
                              className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                          </div>

                          <div className="space-y-1 sm:flex-1">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase">
                              Max Patients
                            </Label>
                            <input
                              type="number"
                              {...register(`schedules.${index}.max_patients` as const, {
                                valueAsNumber: true,
                                min: 1,
                              })}
                              disabled={isViewMode}
                              className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                          </div>

                          <div className="space-y-1 sm:flex-1">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase">
                              OPD Fee (₹)
                            </Label>
                            <input
                              type="number"
                              placeholder="0 (Free)"
                              {...register(`schedules.${index}.opd_fee` as const)}
                              disabled={isViewMode}
                              className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground italic sm:flex-1 flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          Roster slot inactive (Off-Duty)
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </form>
    </FormContainer>
  )
}
