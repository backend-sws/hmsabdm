import React, { useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { RefreshCw, CheckCircle, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { PatientAvatar } from "@/components/common"
import { cn } from "@/lib/utils"

export const deptDoctorSchema = z.object({
  department_id: z
    .union([z.string(), z.number()])
    .refine((v) => v !== "" && v !== undefined && v !== null && !isNaN(Number(v)) && Number(v) > 0, {
      message: "Please select a department",
    })
    .transform((v) => Number(v)),
  doctor_id: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v !== "" && v !== undefined && !isNaN(Number(v)) ? Number(v) : undefined)),
  slot_time: z.string().optional(),
  chief_complaint: z.string().optional(),
  fee_charged: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v !== "" && v !== undefined && !isNaN(Number(v)) ? Number(v) : 0)),
  payment_method: z.string().default("cash"),
  payment_status: z.string().default("paid"),
})

export type DeptDoctorFormValues = z.infer<typeof deptDoctorSchema>

interface PatientSummary {
  name: string
  gender?: string
  age?: number | string
  mobile?: string
  uhid?: string
  abha_number?: string | null
  abha_address?: string | null
  preferred_department?: string | null
  photo?: string
  address?: string
  city?: string
  district?: string
  state?: string
  pincode?: string
  kyc_verified?: boolean
}

interface DeptDoctorPickerProps {
  departments: any[]
  patient: PatientSummary
  onSubmit: (values: DeptDoctorFormValues) => void
  onCancel: () => void
  isLoading?: boolean
}

export const DeptDoctorPicker: React.FC<DeptDoctorPickerProps> = ({
  departments,
  patient,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DeptDoctorFormValues>({
    resolver: zodResolver(deptDoctorSchema) as any,
    defaultValues: {
      payment_method: "cash",
      payment_status: "paid",
      fee_charged: 0,
      slot_time: "",
    },
  })

  const selectedDeptId = watch("department_id")
  const selectedDoctorId = watch("doctor_id")

  const availableDoctors = useMemo(() => {
    if (!selectedDeptId) return []
    const dept = departments.find((d) => String(d.id) === String(selectedDeptId))
    return dept?.doctors || []
  }, [selectedDeptId, departments])

  const selectedDoctor = useMemo(() => {
    if (!selectedDoctorId) return null
    return availableDoctors.find((doc: any) => String(doc.id) === String(selectedDoctorId))
  }, [selectedDoctorId, availableDoctors])

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

  React.useEffect(() => {
    if (selectedDoctor?.schedules?.[0]?.opd_fee) {
      setValue("fee_charged", Number(selectedDoctor.schedules[0].opd_fee))
    }
  }, [selectedDoctor, setValue])

  return (
    <div className="space-y-5">
      {/* Patient Summary Card */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <PatientAvatar
              photo={patient.photo}
              name={patient.name}
              uhid={patient.uhid}
              size="lg"
              shape="rounded"
              allowPreview={true}
              kyc_verified={patient.kyc_verified}
              subtitle={[patient.address, patient.district || patient.city, patient.state, patient.pincode].filter(Boolean).join(", ")}
            />
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-foreground text-sm">{patient.name}</p>
                {patient.kyc_verified && (
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                    KYC Verified
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span>
                  {patient.gender ? `${patient.gender}` : ""} {patient.age ? `• ${patient.age} yrs` : ""}
                </span>
                {patient.mobile && <span>• 📱 +91 {patient.mobile}</span>}
                {patient.uhid && <span className="font-mono font-semibold text-primary">• UHID: {patient.uhid}</span>}
              </div>
              {(patient.address || patient.district || patient.city || patient.state || patient.pincode) && (
                <p className="text-[11px] text-muted-foreground mt-1 truncate max-w-md">
                  📍 {[patient.address, patient.district || patient.city, patient.state, patient.pincode].filter(Boolean).join(", ")}
                </p>
              )}
            </div>
          </div>
          {patient.abha_address && (
            <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 font-mono text-[11px] shrink-0">
              <ShieldCheck className="mr-1 h-3.5 w-3.5" />
              {patient.abha_address}
            </Badge>
          )}
        </div>
      </div>

      {/* Form */}
      <form id="dept-doctor-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Department Selection */}
          <div>
            <Label className="text-xs font-semibold">Department *</Label>
            <select
              {...register("department_id")}
              className={cn(
                "mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring",
                errors.department_id ? "border-destructive text-destructive" : ""
              )}
            >
              <option value="">-- Select Department --</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name} {dept.doctors?.length ? `(${dept.doctors.length} doctors)` : ""}
                </option>
              ))}
            </select>
            {errors.department_id && (
              <p className="text-[11px] text-destructive mt-1">{errors.department_id.message}</p>
            )}
          </div>

          {/* Doctor Selection */}
          <div>
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
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">-- Auto-assign first available doctor --</option>
              {availableDoctors.map((doc: any) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name} {doc.specialization ? `(${doc.specialization})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Appointment Slot / Session */}
          <div className="sm:col-span-2">
            <Label className="text-xs font-semibold">Appointment Slot / Session</Label>
            <select
              {...register("slot_time")}
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">⚡ Next Available Token (Live Queue - FIFO)</option>
              <option value="10:00 AM - 10:30 AM">10:00 AM – 10:30 AM (Morning Slot)</option>
              <option value="10:30 AM - 11:00 AM">10:30 AM – 11:00 AM (Morning Slot)</option>
              <option value="11:00 AM - 11:30 AM">11:00 AM – 11:30 AM (Morning Slot)</option>
              <option value="11:30 AM - 12:00 PM">11:30 AM – 12:00 PM (Morning Slot)</option>
              <option value="12:00 PM - 12:30 PM">12:00 PM – 12:30 PM (Morning Slot)</option>
              <option value="12:30 PM - 01:00 PM">12:30 PM – 01:00 PM (Morning Slot)</option>
              <option value="04:00 PM - 04:30 PM">04:00 PM – 04:30 PM (Evening Slot)</option>
              <option value="04:30 PM - 05:00 PM">04:30 PM – 05:00 PM (Evening Slot)</option>
              <option value="05:00 PM - 05:30 PM">05:00 PM – 05:30 PM (Evening Slot)</option>
              <option value="05:30 PM - 06:00 PM">05:30 PM – 06:00 PM (Evening Slot)</option>
            </select>
          </div>

          {/* Chief Complaint / Reason */}
          <div className="sm:col-span-2">
            <Label className="text-xs font-semibold">Chief Complaint / Visit Reason (optional)</Label>
            <Input
              placeholder="e.g. Fever, Cough, Chest pain, General checkup..."
              className="mt-1 text-xs"
              {...register("chief_complaint")}
            />
          </div>

          {/* Fee Charged */}
          <div>
            <Label className="text-xs font-semibold">OPD Fee Charged (₹)</Label>
            <Input
              type="number"
              min="0"
              placeholder="0"
              className="mt-1 text-xs"
              {...register("fee_charged")}
            />
          </div>

          {/* Payment Method */}
          <div>
            <Label className="text-xs font-semibold">Payment Mode</Label>
            <select
              {...register("payment_method")}
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI / QR</option>
              <option value="card">Debit / Credit Card</option>
              <option value="insurance">Insurance / Ayushman</option>
              <option value="waived">Waived / Free</option>
            </select>
          </div>
        </div>
      </form>

      {/* Buttons */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" form="dept-doctor-form" disabled={isLoading}>
          {isLoading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Issuing Token...
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Generate Token & Issue Slip
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
