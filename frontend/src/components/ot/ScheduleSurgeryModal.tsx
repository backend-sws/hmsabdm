import React, { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { otService } from "@/services/otService"
import { doctorService } from "@/services/doctorService"
import { departmentService } from "@/services/departmentService"
import { patientService } from "@/services/patientService"
import type { CreateOtSchedulePayload } from "@/types/ot"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectItem } from "@/components/ui/select"
import { toast } from "sonner"
import {
  Calendar,
  Clock,
  User,
  HeartPulse,
  Droplet,
  Building2,
  Stethoscope,
  Scissors,
  Loader2,
  AlertTriangle,
} from "lucide-react"

interface ScheduleSurgeryModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  prefillPatientId?: number
  prefillPatientName?: string
  prefillUhid?: string
  prefillAdmissionId?: number
  prefillDoctorId?: number
  prefillDepartmentId?: number
}

const COMMON_PROCEDURES = [
  "Laparoscopic Cholecystectomy",
  "Appendectomy (Open / Lap)",
  "Hernioplasty (Inguinal / Umbilical)",
  "Lower Segment Caesarean Section (LSCS)",
  "Total Knee Replacement (TKR)",
  "Total Hip Replacement (THR)",
  "Transurethral Resection of Prostate (TURP)",
  "Diagnostic Laparoscopy & Biopsy",
  "Fistulectomy / Hemorrhoidectomy",
  "Exploratory Laparotomy",
  "Tonsillectomy",
  "Cataract Surgery (Phaco + IOL)",
  "Debridement & Skin Grafting",
]

export const ScheduleSurgeryModal: React.FC<ScheduleSurgeryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  prefillPatientId,
  prefillPatientName,
  prefillUhid,
  prefillAdmissionId,
  prefillDoctorId,
  prefillDepartmentId,
}) => {
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState<CreateOtSchedulePayload>({
    patient_id: prefillPatientId || 0,
    ipd_admission_id: prefillAdmissionId || null,
    primary_surgeon_id: prefillDoctorId || 0,
    assistant_surgeon_id: null,
    anesthetist_id: null,
    surgical_department_id: prefillDepartmentId || null,
    operation_theatre_id: null,
    procedure_name: "",
    procedure_code: "",
    surgery_date: new Date().toISOString().split("T")[0],
    scheduled_start_time: "09:00",
    scheduled_end_time: "11:00",
    anesthesia_type: "ga",
    priority: "elective",
    status: "booked",
    pre_op_diagnosis: "",
    post_op_diagnosis: "",
    scrub_nurse_name: "",
    circulating_nurse_name: "",
    blood_required_units: 0,
    special_instruments: "",
  })

  // Queries for Theatres, Doctors, Departments, and Patients (if not prefilled)
  const { data: theatres = [] } = useQuery({
    queryKey: ["ot", "theatres"],
    queryFn: () => otService.getTheatres(),
    enabled: isOpen,
  })

  const { data: doctorsData } = useQuery({
    queryKey: ["doctors"],
    queryFn: () => doctorService.getDoctors(),
    enabled: isOpen,
  })
  const doctors = doctorsData?.data || []

  const { data: departmentsData } = useQuery({
    queryKey: ["departments"],
    queryFn: () => departmentService.getDepartments(),
    enabled: isOpen,
  })
  const departments = departmentsData?.data || []

  const [patientSearch, setPatientSearch] = useState("")
  const { data: patientsData } = useQuery({
    queryKey: ["patients", "search", patientSearch],
    queryFn: () => patientService.getPatients({ search: patientSearch }),
    enabled: isOpen && !prefillPatientId && patientSearch.length >= 2,
  })
  const patientSearchResults = patientsData?.data || []

  const createMutation = useMutation({
    mutationFn: () => {
      if (!formData.patient_id) {
        throw new Error("Please select a patient")
      }
      if (!formData.primary_surgeon_id) {
        throw new Error("Please select a primary surgeon")
      }
      if (!formData.procedure_name.trim()) {
        throw new Error("Please enter or select procedure name")
      }
      return otService.createSchedule(formData)
    },
    onSuccess: (saved) => {
      toast.success(`Surgery scheduled successfully! Booking #${saved.booking_number}`)
      queryClient.invalidateQueries({ queryKey: ["ot", "schedules"] })
      queryClient.invalidateQueries({ queryKey: ["ot", "theatres"] })
      onSuccess?.()
      onClose()
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to schedule surgery")
    },
  })

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
        {/* Header */}
        <DialogHeader className="p-5 border-b border-border bg-muted/40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-600/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 flex items-center justify-center font-bold">
              <Scissors className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                Book OT Surgery & Pre-Op Schedule
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Allocate Operation Theatre, surgical team, anesthesia, and initiate WHO Surgical Safety Checklist.
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Patient Card / Selection */}
          <div className="p-3.5 rounded-xl border border-border bg-card shadow-2xs">
            {prefillPatientId ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground">{prefillPatientName}</span>
                    <span className="text-[11px] text-muted-foreground ml-2 font-mono">({prefillUhid})</span>
                  </div>
                </div>
                {prefillAdmissionId && (
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-900">
                    Inpatient Admission #{prefillAdmissionId}
                  </span>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Select Patient</Label>
                <Input
                  className="text-xs"
                  placeholder="Search patient by name, mobile, or UHID..."
                  value={patientSearch}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPatientSearch(e.target.value)}
                />
                {patientSearchResults.length > 0 && !formData.patient_id && (
                  <div className="max-h-36 overflow-y-auto border border-border rounded-lg divide-y divide-border bg-background">
                    {patientSearchResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, patient_id: Number(p.id) }))
                          setPatientSearch(`${p.name} (${p.uhid})`)
                        }}
                        className="w-full text-left p-2 hover:bg-muted text-xs flex justify-between"
                      >
                        <span className="font-semibold">{p.name}</span>
                        <span className="text-muted-foreground font-mono">{p.uhid}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Procedure & Speciality Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Procedure / Surgery Name *</Label>
              <Input
                className="text-xs font-medium"
                placeholder="e.g. Laparoscopic Appendectomy"
                value={formData.procedure_name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData((p) => ({ ...p, procedure_name: e.target.value }))}
                list="common-procedures-list"
              />
              <datalist id="common-procedures-list">
                {COMMON_PROCEDURES.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Surgical Specialty / Department</Label>
              <Select
                value={formData.surgical_department_id ? String(formData.surgical_department_id) : ""}
                onValueChange={(val) => setFormData((p) => ({ ...p, surgical_department_id: val ? Number(val) : null }))}
              >
                <SelectItem value="">Select department (Optional)</SelectItem>
                {departments.map((d: any) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.name}
                  </SelectItem>
                ))}
              </Select>
            </div>
          </div>

          {/* OT Room & Date/Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-blue-500" /> Operation Theatre (Room)
              </Label>
              <Select
                value={formData.operation_theatre_id ? String(formData.operation_theatre_id) : ""}
                onValueChange={(val) => setFormData((p) => ({ ...p, operation_theatre_id: val ? Number(val) : null }))}
              >
                <SelectItem value="">Assign OT later</SelectItem>
                {theatres.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.name} ({t.status === "available" ? "🟢 Vacant" : "🟡 " + t.status})
                  </SelectItem>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" /> Proposed Date
              </Label>
              <Input
                type="date"
                className="text-xs font-mono"
                value={formData.surgery_date}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData((p) => ({ ...p, surgery_date: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-purple-500" /> Scheduled Start Time
              </Label>
              <Input
                type="time"
                className="text-xs font-mono"
                value={formData.scheduled_start_time || "09:00"}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData((p) => ({ ...p, scheduled_start_time: e.target.value }))}
              />
            </div>
          </div>

          {/* Surgical Team Allocation */}
          <div className="p-4 rounded-xl border border-border bg-card space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Stethoscope className="h-4 w-4 text-primary" /> Surgical Team Allocation
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-foreground">Primary Surgeon *</Label>
                <Select
                  value={formData.primary_surgeon_id ? String(formData.primary_surgeon_id) : ""}
                  onValueChange={(val) => setFormData((p) => ({ ...p, primary_surgeon_id: Number(val) }))}
                >
                  <SelectItem value="">Select Surgeon</SelectItem>
                  {doctors.map((doc: any) => (
                    <SelectItem key={doc.id} value={String(doc.id)}>
                      Dr. {doc.name} ({doc.specialization || doc.department?.name || "Consultant"})
                    </SelectItem>
                  ))}
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Assistant Surgeon</Label>
                <Select
                  value={formData.assistant_surgeon_id ? String(formData.assistant_surgeon_id) : ""}
                  onValueChange={(val) => setFormData((p) => ({ ...p, assistant_surgeon_id: val ? Number(val) : null }))}
                >
                  <SelectItem value="">None / Optional</SelectItem>
                  {doctors.map((doc: any) => (
                    <SelectItem key={doc.id} value={String(doc.id)}>
                      Dr. {doc.name}
                    </SelectItem>
                  ))}
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Consultant Anesthetist</Label>
                <Select
                  value={formData.anesthetist_id ? String(formData.anesthetist_id) : ""}
                  onValueChange={(val) => setFormData((p) => ({ ...p, anesthetist_id: val ? Number(val) : null }))}
                >
                  <SelectItem value="">To be assigned</SelectItem>
                  {doctors.map((doc: any) => (
                    <SelectItem key={doc.id} value={String(doc.id)}>
                      Dr. {doc.name} (Anesthesia)
                    </SelectItem>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          {/* Anesthesia & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <HeartPulse className="h-3.5 w-3.5 text-rose-500" /> Planned Anesthesia Type
              </Label>
              <Select
                value={formData.anesthesia_type}
                onValueChange={(val) => setFormData((p) => ({ ...p, anesthesia_type: val }))}
              >
                <SelectItem value="ga">General Anesthesia (GA)</SelectItem>
                <SelectItem value="spinal">Spinal Anesthesia (SA)</SelectItem>
                <SelectItem value="epidural">Epidural Anesthesia</SelectItem>
                <SelectItem value="local">Local Anesthesia (LA)</SelectItem>
                <SelectItem value="mac">MAC / Conscious Sedation</SelectItem>
                <SelectItem value="regional_block">Regional Nerve Block</SelectItem>
                <SelectItem value="other">Other / Combined</SelectItem>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Priority Level
              </Label>
              <Select
                value={formData.priority}
                onValueChange={(val) => setFormData((p) => ({ ...p, priority: val as any }))}
              >
                <SelectItem value="elective">Elective (Planned)</SelectItem>
                <SelectItem value="urgent">Urgent (&lt; 24 Hours)</SelectItem>
                <SelectItem value="emergency">Emergency (&lt; 2 Hours)</SelectItem>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Droplet className="h-3.5 w-3.5 text-rose-600" /> Blood Required (Units)
              </Label>
              <Input
                type="number"
                min="0"
                className="text-xs"
                placeholder="0"
                value={formData.blood_required_units ?? 0}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData((p) => ({ ...p, blood_required_units: Number(e.target.value) || 0 }))}
              />
            </div>
          </div>

          {/* Clinical Notes & Diagnosis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Pre-Operative Clinical Diagnosis</Label>
              <textarea
                rows={2}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-2xs resize-none placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="e.g. Symptomatic Cholelithiasis with chronic cholecystitis"
                value={formData.pre_op_diagnosis || ""}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData((p) => ({ ...p, pre_op_diagnosis: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Special Equipment / Implants / Notes</Label>
              <textarea
                rows={2}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-2xs resize-none placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="e.g. C-Arm Image Intensifier required, Prolene Mesh 6x11cm"
                value={formData.special_instruments || ""}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData((p) => ({ ...p, special_instruments: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t border-border bg-muted/20 flex items-center justify-between">
          <Button size="sm" variant="outline" onClick={onClose} disabled={createMutation.isPending}>
            Cancel
          </Button>

          <Button
            size="sm"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold"
          >
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scissors className="h-4 w-4" />}
            Confirm OT Booking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export default ScheduleSurgeryModal
