import React, { useMemo, useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { UserPlus, RefreshCw, Sparkles } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { DobAgePicker } from "@/components/common/DobAgePicker"
import { settingsService } from "@/services/settingsService"
import { queryKeys } from "@/constants/queryKeys"
import { generateDoctorSlots } from "@/utils/slotGenerator"
import { DoctorQueueLoadCard } from "@/components/reception/DoctorQueueLoadCard"
import { SlotPicker } from "@/components/reception/SlotPicker"
import type { QuickVisitPayload } from "@/types/reception"

export const walkInSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  mobile: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit mobile number")
    .optional()
    .or(z.literal("")),
  gender: z.enum(["M", "F", "O"]).default("M"),
  dob: z.string().optional(),
  age: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => (val !== "" && val !== undefined && val !== null && !isNaN(Number(val)) ? Number(val) : undefined)),
  department_id: z
    .union([z.string(), z.number()])
    .refine((val) => val !== "" && val !== undefined && val !== null && !isNaN(Number(val)) && Number(val) > 0, {
      message: "Please select a department",
    })
    .transform((val) => Number(val)),
  doctor_id: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => (val !== "" && val !== undefined && val !== null && !isNaN(Number(val)) ? Number(val) : undefined)),
  slot_time: z.string().optional(),
  visit_reason: z.string().optional(),
  guardian_name: z.string().optional(),
  guardian_phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit mobile number")
    .optional()
    .or(z.literal("")),
  blood_group: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  fee_charged: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v !== "" && v !== undefined && !isNaN(Number(v)) ? Number(v) : 0)),
  payment_method: z.string().default("cash"),
  payment_status: z.string().default("paid"),
})

export type WalkInFormValues = z.infer<typeof walkInSchema>

interface WalkInFlowProps {
  departments: any[]
  isSubmitting: boolean
  onSubmit: (payload: QuickVisitPayload) => void
}

export const WalkInFlow: React.FC<WalkInFlowProps> = ({ departments, isSubmitting, onSubmit }) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<WalkInFormValues>({
    resolver: zodResolver(walkInSchema) as any,
    defaultValues: {
      gender: "M",
      payment_method: "cash",
      payment_status: "paid",
      fee_charged: 0,
      slot_time: "",
      dob: "",
      age: undefined,
    },
  })

  // Dynamic Custom Patient Demographic Fields from Settings
  const { data: patientFieldConfigs = [] } = useQuery({
    queryKey: queryKeys.settings.patientFields,
    queryFn: () => settingsService.getPatientFieldConfigs(),
  })
  const [customFields, setCustomFields] = useState<Record<string, any>>({})

  const currentFee = watch("fee_charged") || 0
  const currentPaymentMethod = watch("payment_method")

  const [upiUtr, setUpiUtr] = useState<string>("")
  const [splitCashAmount, setSplitCashAmount] = useState<number>(0)
  const [splitUpiAmount, setSplitUpiAmount] = useState<number>(0)
  const [splitUpiUtr, setSplitUpiUtr] = useState<string>("")

  // Auto-sync split amounts when fee changes or split is selected
  useEffect(() => {
    if (currentPaymentMethod === "split") {
      const half = Math.floor(currentFee / 2)
      setSplitCashAmount(half)
      setSplitUpiAmount(currentFee - half)
    }
  }, [currentPaymentMethod, currentFee])

  const handleCashChange = (val: number) => {
    const cash = Math.max(0, val)
    setSplitCashAmount(cash)
    setSplitUpiAmount(Math.max(0, currentFee - cash))
  }

  const handleUpiChange = (val: number) => {
    const upi = Math.max(0, val)
    setSplitUpiAmount(upi)
    setSplitCashAmount(Math.max(0, currentFee - upi))
  }

  const selectedDeptId = watch("department_id")
  const selectedDoctorId = watch("doctor_id")
  const selectedSlotTime = watch("slot_time")
  const currentDob = watch("dob")
  const currentAge = watch("age")

  const availableDoctors = useMemo(() => {
    if (!selectedDeptId) return []
    const dept = departments.find((d: any) => String(d.id) === String(selectedDeptId))
    return dept?.doctors || []
  }, [selectedDeptId, departments])

  const selectedDoctor = useMemo(() => {
    if (!selectedDoctorId) return null
    return availableDoctors.find((doc: any) => String(doc.id) === String(selectedDoctorId))
  }, [selectedDoctorId, availableDoctors])

  // OPD Slot Duration Settings from Hospital Configuration
  const { data: opdSlotConfig } = useQuery({
    queryKey: ["settings", "opd_slot"],
    queryFn: () => settingsService.getSettings("opd_slot"),
  })

  const doctorTiming = useMemo(() => {
    if (!selectedDoctor) return null
    if (selectedDoctor.schedules && selectedDoctor.schedules.length > 0) {
      const activeSched = selectedDoctor.schedules[0]
      const start = activeSched.start_time?.slice(0, 5) || "09:00"
      const end = activeSched.end_time?.slice(0, 5) || "13:00"
      return `${start} - ${end}`
    }
    return selectedDoctor.consultation_time || "10:00 AM - 02:00 PM"
  }, [selectedDoctor])

  const dynamicSlots = useMemo(() => {
    const slotDuration = Number(opdSlotConfig?.slot_duration_minutes || 15)
    let startTime = opdSlotConfig?.morning_start || "09:00"
    let endTime = opdSlotConfig?.morning_end || "13:00"

    if (selectedDoctor?.schedules && selectedDoctor.schedules.length > 0) {
      const sched = selectedDoctor.schedules[0]
      if (sched.start_time && sched.end_time) {
        startTime = sched.start_time.slice(0, 5)
        endTime = sched.end_time.slice(0, 5)
      }
    }

    return generateDoctorSlots({
      startTime,
      endTime,
      slotDurationMinutes: slotDuration,
      includeLiveToken: true,
      defaultMorningStart: opdSlotConfig?.morning_start || "09:00",
      defaultMorningEnd: opdSlotConfig?.morning_end || "13:00",
      defaultEveningStart: opdSlotConfig?.evening_start || "17:00",
      defaultEveningEnd: opdSlotConfig?.evening_end || "21:00",
    })
  }, [selectedDoctor, opdSlotConfig])

  React.useEffect(() => {
    if (selectedDoctor?.schedules?.[0]?.opd_fee) {
      setValue("fee_charged", Number(selectedDoctor.schedules[0].opd_fee))
    }
  }, [selectedDoctor, setValue])

  const handleFormSubmit = (data: WalkInFormValues) => {
    // Validate required custom intake fields
    if (patientFieldConfigs && patientFieldConfigs.length > 0) {
      for (const f of patientFieldConfigs) {
        const key = f.field_key || f.field_name || `field_${f.id}`
        const isReq = Boolean(f.is_required)
        const val = customFields[key]
        if (isReq && (val === undefined || val === null || String(val).trim() === "")) {
          toast.error(`Please provide required field: ${f.label}`)
          return
        }
      }
    }

    const finalPaymentMethod = data.payment_method
    let paymentBreakdown: any[] | undefined = undefined
    let paymentRef: string | undefined = undefined

    if (finalPaymentMethod === "split") {
      paymentBreakdown = [
        { method: "cash", amount: Number(splitCashAmount) || 0 },
        { method: "upi", amount: Number(splitUpiAmount) || 0, ref: splitUpiUtr.trim() || undefined },
      ]
      paymentRef = splitUpiUtr.trim() || undefined
    } else if (finalPaymentMethod === "upi") {
      paymentRef = upiUtr.trim() || undefined
    }

    const payload: QuickVisitPayload = {
      name: data.name,
      mobile: data.mobile || undefined,
      gender: data.gender,
      dob: data.dob || undefined,
      age: data.age,
      department_id: data.department_id,
      doctor_id: data.doctor_id || undefined,
      slot_time: data.slot_time || undefined,
      visit_reason: data.visit_reason || undefined,
      guardian_name: data.guardian_name || undefined,
      guardian_phone: data.guardian_phone || undefined,
      blood_group: data.blood_group || undefined,
      address: data.address || undefined,
      city: data.city || undefined,
      district: data.district || undefined,
      state: data.state || undefined,
      pincode: data.pincode || undefined,
      fee_charged: data.fee_charged,
      amount_paid: data.fee_charged,
      payment_method: finalPaymentMethod,
      payment_status: data.payment_status,
      payment_ref: paymentRef,
      payment_breakdown: paymentBreakdown,
      custom_fields: Object.keys(customFields).length > 0 ? customFields : undefined,
    }
    onSubmit(payload)
  }

  return (
    <div className="w-full space-y-6">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Section 01: Demographics */}
        <div className="w-full rounded-2xl border bg-card p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 border-b pb-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
              01
            </span>
            <h3 className="text-sm font-semibold text-foreground">Patient Demographic Info</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2 lg:col-span-2">
              <Label className="text-xs font-semibold">Full Name *</Label>
              <Input
                placeholder="e.g. Ramesh Kumar"
                className="mt-1 text-xs"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-[11px] text-destructive mt-1">{errors.name.message}</p>
              )}
            </div>

            <div className="sm:col-span-1 lg:col-span-1">
              <Label className="text-xs font-semibold">Mobile Number</Label>
              <Input
                type="tel"
                placeholder="10-digit mobile"
                className="mt-1 font-mono text-xs"
                {...register("mobile")}
              />
              {errors.mobile && (
                <p className="text-[11px] text-destructive mt-1">{errors.mobile.message}</p>
              )}
            </div>

            <div className="sm:col-span-1 lg:col-span-1">
              <Label className="text-xs font-semibold">Gender</Label>
              <select
                {...register("gender")}
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
              >
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
              </select>
            </div>

            {/* Reusable Bidirectional DOB & Age (Years, Months, Days) Picker */}
            <div className="sm:col-span-2 lg:col-span-4 p-4 rounded-xl border border-border/80 bg-muted/20">
              <DobAgePicker
                dobValue={currentDob}
                ageValue={currentAge}
                onChange={(val) => {
                  setValue("dob", val.dob || "", { shouldValidate: true })
                  setValue("age", val.age !== undefined ? val.age : (undefined as any), { shouldValidate: true })
                }}
              />
            </div>

            <div className="sm:col-span-1 lg:col-span-1">
              <Label className="text-xs font-semibold">Blood Group</Label>
              <select
                {...register("blood_group")}
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
              >
                <option value="">Select blood group (optional)</option>
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-1 lg:col-span-1">
              <Label className="text-xs font-semibold">Guardian / Relative Name</Label>
              <Input
                placeholder="Attendant/Guardian"
                className="mt-1 text-xs"
                {...register("guardian_name")}
              />
            </div>

            <div className="sm:col-span-1 lg:col-span-2">
              <Label className="text-xs font-semibold">Guardian Mobile</Label>
              <Input
                placeholder="Guardian mobile"
                className="mt-1 font-mono text-xs"
                {...register("guardian_phone")}
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-2">
              <Label className="text-xs font-semibold">Street / House Address</Label>
              <Input
                placeholder="House No, Road, Locality"
                className="mt-1 text-xs"
                {...register("address")}
              />
            </div>

            <div className="sm:col-span-1 lg:col-span-1">
              <Label className="text-xs font-semibold">City / Town</Label>
              <Input placeholder="e.g. Ranchi" className="mt-1 text-xs" {...register("city")} />
            </div>

            <div className="sm:col-span-1 lg:col-span-1">
              <Label className="text-xs font-semibold">District</Label>
              <Input placeholder="District" className="mt-1 text-xs" {...register("district")} />
            </div>

            <div className="sm:col-span-1 lg:col-span-2">
              <Label className="text-xs font-semibold">State</Label>
              <Input placeholder="State" className="mt-1 text-xs" {...register("state")} />
            </div>

            <div className="sm:col-span-1 lg:col-span-2">
              <Label className="text-xs font-semibold">Pincode</Label>
              <Input placeholder="6-digit PIN" maxLength={6} className="mt-1 font-mono text-xs" {...register("pincode")} />
            </div>
          </div>
        </div>

        {/* Section 02: Dynamic Custom Demographics configured in Settings */}
        {patientFieldConfigs && patientFieldConfigs.length > 0 && (
          <div className="w-full rounded-2xl border bg-card p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary text-[11px] font-bold">
                  02
                </span>
                <h3 className="text-sm font-semibold text-foreground">
                  Additional Patient Intake Demographics
                </h3>
              </div>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Custom Fields from Settings
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {patientFieldConfigs.map((f) => {
                const key = f.field_key || f.field_name || `field_${f.id}`
                const val = customFields[key] ?? ""
                const isReq = Boolean(f.is_required)

                if (f.input_type === "select") {
                  return (
                    <div key={f.id} className="sm:col-span-1 lg:col-span-2">
                      <Label className="text-xs font-semibold">
                        {f.label} {isReq && <span className="text-destructive">*</span>}
                      </Label>
                      <select
                        value={val}
                        onChange={(e) => setCustomFields((prev) => ({ ...prev, [key]: e.target.value }))}
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
                    <div key={f.id} className="sm:col-span-1 lg:col-span-2 flex items-center pt-5">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground">
                        <input
                          type="checkbox"
                          checked={Boolean(val)}
                          onChange={(e) => setCustomFields((prev) => ({ ...prev, [key]: e.target.checked }))}
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
                    <div key={f.id} className="sm:col-span-2 lg:col-span-4">
                      <Label className="text-xs font-semibold">
                        {f.label} {isReq && <span className="text-destructive">*</span>}
                      </Label>
                      <textarea
                        rows={2}
                        value={val}
                        onChange={(e) => setCustomFields((prev) => ({ ...prev, [key]: e.target.value }))}
                        placeholder={f.placeholder || `Enter ${f.label}`}
                        className="mt-1 flex w-full rounded-md border border-input bg-background p-2 text-xs shadow-xs"
                      />
                    </div>
                  )
                }

                return (
                  <div key={f.id} className="sm:col-span-1 lg:col-span-2">
                    <Label className="text-xs font-semibold">
                      {f.label} {isReq && <span className="text-destructive">*</span>}
                    </Label>
                    <Input
                      type={f.input_type === "number" ? "number" : f.input_type === "date" ? "date" : "text"}
                      value={val}
                      onChange={(e) => setCustomFields((prev) => ({ ...prev, [key]: e.target.value }))}
                      placeholder={f.placeholder || `Enter ${f.label}`}
                      className="mt-1 text-xs"
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Section 03: OPD Assignment & Billing */}
        <div className="w-full rounded-2xl border bg-card p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 border-b pb-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
              {patientFieldConfigs && patientFieldConfigs.length > 0 ? "03" : "02"}
            </span>
            <h3 className="text-sm font-semibold text-foreground">OPD Department, Doctor & Billing</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-1 lg:col-span-2">
              <Label className="text-xs font-semibold">Department *</Label>
              <select
                {...register("department_id")}
                className={cn(
                  "mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs",
                  errors.department_id ? "border-destructive text-destructive" : ""
                )}
              >
                <option value="">-- Select Department --</option>
                {departments.map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.doctors?.length ? `(${d.doctors.length} doctors)` : ""}
                  </option>
                ))}
              </select>
              {errors.department_id && (
                <p className="text-[11px] text-destructive mt-1">{errors.department_id.message}</p>
              )}
            </div>

            <div className="sm:col-span-1 lg:col-span-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Assigned Doctor (optional)</Label>
                {doctorTiming && (
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    🕒 Shift: {doctorTiming}
                  </span>
                )}
              </div>
              <select
                {...register("doctor_id")}
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
              >
                <option value="">-- Auto-assign first available doctor --</option>
                {availableDoctors.map((doc: any) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name} {doc.specialization ? `(${doc.specialization})` : ""} {typeof doc.today_waiting_count === 'number' ? `• [${doc.today_waiting_count} waiting]` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Doctor Live Queue & Load Status Card */}
            {selectedDeptId && availableDoctors.length > 0 && (
              <div className="sm:col-span-2 lg:col-span-4">
                <DoctorQueueLoadCard
                  selectedDoctor={selectedDoctor}
                  availableDoctors={availableDoctors}
                  slotDurationMinutes={Number(opdSlotConfig?.slot_duration_minutes || 15)}
                  onSelectDoctor={(docId) => setValue("doctor_id", docId ? Number(docId) : undefined)}
                />
              </div>
            )}

            {/* Appointment Slot / Session Selection */}
            <div className="sm:col-span-2 lg:col-span-4">
              <Label className="text-xs font-semibold mb-1 block">Appointment Slot / Token Allocation</Label>
              <SlotPicker
                slots={dynamicSlots}
                value={selectedSlotTime}
                onChange={(val) => setValue("slot_time", val)}
                slotDurationMinutes={Number(opdSlotConfig?.slot_duration_minutes || 15)}
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-4">
              <Label className="text-xs font-semibold">Chief Complaint / Reason (optional)</Label>
              <Input
                placeholder="e.g. Fever, Cough, Chest pain, Checkup..."
                className="mt-1 text-xs"
                {...register("visit_reason")}
              />
            </div>

            <div className="sm:col-span-1 lg:col-span-2">
              <Label className="text-xs font-semibold">OPD Fee (₹)</Label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                className="mt-1 text-xs"
                {...register("fee_charged")}
              />
            </div>

            <div className="sm:col-span-1 lg:col-span-2">
              <Label className="text-xs font-semibold">Payment Mode</Label>
              <select
                {...register("payment_method")}
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI / QR</option>
                <option value="split">Split (Cash + UPI)</option>
                <option value="card">Card</option>
                <option value="insurance">Insurance / Ayushman</option>
                <option value="waived">Waived / Free</option>
              </select>
            </div>

            {/* Optional UTR for single UPI */}
            {currentPaymentMethod === "upi" && (
              <div className="sm:col-span-2 lg:col-span-4 animate-in fade-in duration-200">
                <Label className="text-xs font-semibold flex items-center justify-between">
                  <span>UPI / Bank Reference (UTR) Number</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Optional</span>
                </Label>
                <Input
                  placeholder="e.g. 423456789012 or UPI txn ID"
                  value={upiUtr}
                  onChange={(e) => setUpiUtr(e.target.value)}
                  className="mt-1 text-xs font-mono"
                />
              </div>
            )}

            {/* Split Payment Breakdown Box */}
            {currentPaymentMethod === "split" && (
              <div className="sm:col-span-2 lg:col-span-4 rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                    ⚡ Split Payment Breakdown (Fee: ₹{currentFee})
                  </span>
                  <span
                    className={`text-[11px] font-mono font-semibold ${
                      Number(splitCashAmount) + Number(splitUpiAmount) === Number(currentFee)
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    Sum: ₹{Number(splitCashAmount) + Number(splitUpiAmount)} / ₹{currentFee}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-[11px] font-medium text-muted-foreground">Cash Amount (₹)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={splitCashAmount}
                      onChange={(e) => handleCashChange(Number(e.target.value))}
                      className="mt-1 text-xs font-mono font-bold bg-background"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-medium text-muted-foreground">UPI Amount (₹)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={splitUpiAmount}
                      onChange={(e) => handleUpiChange(Number(e.target.value))}
                      className="mt-1 text-xs font-mono font-bold bg-background"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-medium text-muted-foreground">UPI UTR # (Optional)</Label>
                    <Input
                      placeholder="e.g. 4291823901"
                      value={splitUpiUtr}
                      onChange={(e) => setSplitUpiUtr(e.target.value)}
                      className="mt-1 text-xs font-mono bg-background"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isSubmitting} className="h-11 px-6 text-sm font-semibold">
            {isSubmitting ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Registering & Generating Token...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Register Patient & Issue OPD Slip
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
