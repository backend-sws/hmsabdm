import React, { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ipdService } from "@/services/ipdService"
import type {
  DischargeSummary,
  DischargeMedicationItem,
  DischargeVitals,
} from "@/types/ipd"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectItem } from "@/components/ui/select"
import { toast } from "sonner"
import {
  FileText,
  Save,
  CheckCircle2,
  Printer,
  Plus,
  Trash2,
  AlertTriangle,
  Stethoscope,
  Pill,
  HeartPulse,
  Activity,
  ClipboardList,
  Loader2,
  Sparkles,
} from "lucide-react"

interface CreateDischargeSummaryModalProps {
  isOpen: boolean
  onClose: () => void
  admissionId: number
  patientName: string
  uhid: string
  onSuccess?: () => void
  onOpenPrint?: () => void
}

const COMMON_DOSAGE_FORMS = ["Tablet", "Capsule", "Syrup", "Injection", "Ointment", "Drops", "Inhaler"]
const COMMON_FREQUENCIES = [
  "1-0-1 (Twice daily / BD)",
  "1-1-1 (Thrice daily / TDS)",
  "1-0-0 (Morning / OD)",
  "0-0-1 (Bedtime / HS)",
  "0-1-0 (Afternoon / OD)",
  "1-1-1-1 (Four times / QID)",
  "SOS (As needed when required)",
  "Once weekly",
  "Alternate days",
]

export const CreateDischargeSummaryModal: React.FC<CreateDischargeSummaryModalProps> = ({
  isOpen,
  onClose,
  admissionId,
  patientName,
  uhid,
  onSuccess,
  onOpenPrint,
}) => {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<"clinical" | "course" | "medications" | "advice">("clinical")
  const [markAsDischarged, setMarkAsDischarged] = useState(false)

  // Form State
  const [formData, setFormData] = useState<Partial<DischargeSummary>>({
    discharge_type: "normal",
    admission_date: "",
    discharge_date: new Date().toISOString().slice(0, 16),
    admission_diagnosis: "",
    final_diagnosis: "",
    icd10_code: "",
    chief_complaints: "",
    history_of_present_illness: "",
    past_history_and_allergies: "",
    condition_at_discharge: "Patient is hemodynamically stable, afebrile, and ambulatory at time of discharge.",
    discharge_vitals: {
      temperature: "",
      systolic_bp: "",
      diastolic_bp: "",
      pulse_rate: "",
      respiratory_rate: "",
      spo2: "",
    },
    hospital_course: "",
    procedures_surgeries: "",
    investigations_summary: "",
    treatment_given: "",
    discharge_medications: [],
    dietary_advice: "Normal balanced diet. Adequate oral fluid hydration. Avoid spicy and oily foods.",
    physical_activity_advice: "Gentle ambulation allowed. Avoid heavy weight lifting for 2 weeks.",
    wound_care_instructions: "Keep surgical/IV site clean and dry. Watch for redness, swelling, or discharge.",
    emergency_red_flags: "Report to Emergency / Casualty immediately if: High persistent fever (>101°F), severe breathlessness, uncontrolled acute pain, persistent vomiting, or active bleeding.",
    follow_up_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    follow_up_instructions: "Review in OPD after 7 days with all discharge documents and follow-up reports.",
  })

  // Fetch summary or proposal
  const {
    data: summaryData,
    isLoading,
  } = useQuery({
    queryKey: ["ipd", "discharge-summary", admissionId],
    queryFn: () => ipdService.getDischargeSummary(admissionId),
    enabled: isOpen && !!admissionId,
  })

  // Sync state when data is loaded
  useEffect(() => {
    if (summaryData) {
      setFormData({
        ...summaryData,
        discharge_date: summaryData.discharge_date
          ? new Date(summaryData.discharge_date).toISOString().slice(0, 16)
          : new Date().toISOString().slice(0, 16),
        follow_up_date: summaryData.follow_up_date
          ? String(summaryData.follow_up_date).split("T")[0]
          : new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
        discharge_medications: Array.isArray(summaryData.discharge_medications)
          ? summaryData.discharge_medications
          : [],
        discharge_vitals: summaryData.discharge_vitals || {
          temperature: "",
          systolic_bp: "",
          diastolic_bp: "",
          pulse_rate: "",
          respiratory_rate: "",
          spo2: "",
        },
      })
    }
  }, [summaryData])

  // Save Mutation (Draft or Finalize)
  const saveMutation = useMutation({
    mutationFn: (status: "draft" | "finalized") =>
      ipdService.saveDischargeSummary(admissionId, {
        ...formData,
        status,
        mark_as_discharged: markAsDischarged,
      }),
    onSuccess: (saved) => {
      toast.success(
        saved.status === "finalized"
          ? "Discharge Summary finalized successfully!"
          : "Discharge Summary saved as draft!"
      )
      queryClient.invalidateQueries({ queryKey: ["ipd", "discharge-summary", admissionId] })
      queryClient.invalidateQueries({ queryKey: ["ipd", "chart", admissionId] })
      queryClient.invalidateQueries({ queryKey: ["ipd", "admissions"] })
      onSuccess?.()
      if (saved.status === "finalized" && onOpenPrint) {
        onOpenPrint()
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save discharge summary")
    },
  })

  // Medication handlers
  const handleAddMedication = () => {
    setFormData((prev) => ({
      ...prev,
      discharge_medications: [
        ...(prev.discharge_medications || []),
        {
          medicine_name: "",
          dosage_form: "Tablet",
          dose: "1 Tab",
          route: "Oral",
          frequency: "1-0-1 (Twice daily / BD)",
          duration: "5 Days",
          instructions: "After meals",
        },
      ],
    }))
  }

  const handleUpdateMedication = (index: number, field: keyof DischargeMedicationItem, val: string) => {
    setFormData((prev) => {
      const meds = [...(prev.discharge_medications || [])]
      meds[index] = { ...meds[index], [field]: val }
      return { ...prev, discharge_medications: meds }
    })
  }

  const handleRemoveMedication = (index: number) => {
    setFormData((prev) => {
      const meds = [...(prev.discharge_medications || [])]
      meds.splice(index, 1)
      return { ...prev, discharge_medications: meds }
    })
  }

  const handleVitalChange = (field: keyof DischargeVitals, val: string) => {
    setFormData((prev) => ({
      ...prev,
      discharge_vitals: {
        ...(prev.discharge_vitals || {}),
        [field]: val,
      },
    }))
  }

  const isFinalized = summaryData?.status === "finalized"

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
        {/* Header */}
        <DialogHeader className="p-5 border-b border-border bg-muted/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center font-bold">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  Clinical Discharge Summary
                  {summaryData?.summary_number && (
                    <Badge variant="outline" className="font-mono text-xs border-primary/30 text-primary">
                      {summaryData.summary_number}
                    </Badge>
                  )}
                  {isFinalized ? (
                    <Badge className="bg-emerald-600 text-white text-xs gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Finalized
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      Draft
                    </Badge>
                  )}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Patient: <span className="font-semibold text-foreground">{patientName}</span> ({uhid}) • IPD #{summaryData?.ipd_admission?.ipd_number || admissionId}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {summaryData && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onOpenPrint}
                  className="gap-1.5 text-xs text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900"
                >
                  <Printer className="h-4 w-4" /> Print Card
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Content Body */}
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-muted-foreground gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm">Generating NABH discharge summary proposal from patient chart...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Top Config Ribbon */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl border border-border bg-card shadow-2xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Discharge Type</Label>
                <Select
                  value={formData.discharge_type}
                  onValueChange={(val) => setFormData((p) => ({ ...p, discharge_type: val as any }))}
                >
                  <SelectItem value="normal">Normal / Recovered</SelectItem>
                  <SelectItem value="dama">DAMA (Discharge Against Medical Advice)</SelectItem>
                  <SelectItem value="lama">LAMA (Left Against Medical Advice)</SelectItem>
                  <SelectItem value="referred">Referred to Higher Facility</SelectItem>
                  <SelectItem value="absconded">Absconded</SelectItem>
                  <SelectItem value="expired">Deceased / Expired</SelectItem>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Discharge Date & Time</Label>
                <Input
                  type="datetime-local"
                  className="h-9 text-xs font-mono"
                  value={formData.discharge_date}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData((p) => ({ ...p, discharge_date: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Next Follow-Up Date</Label>
                <Input
                  type="date"
                  className="h-9 text-xs font-mono"
                  value={formData.follow_up_date}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData((p) => ({ ...p, follow_up_date: e.target.value }))}
                />
              </div>
            </div>

            {/* Organized Form Tab Buttons */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 bg-muted/60 rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => setActiveTab("clinical")}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
                    activeTab === "clinical"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Stethoscope className="h-3.5 w-3.5" /> Clinical Diagnoses
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("course")}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
                    activeTab === "course"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Activity className="h-3.5 w-3.5" /> Hospital Course
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("medications")}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
                    activeTab === "medications"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Pill className="h-3.5 w-3.5" /> Take-Home Rx ({formData.discharge_medications?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("advice")}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
                    activeTab === "advice"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ClipboardList className="h-3.5 w-3.5" /> Advice & Red Flags
                </button>
              </div>

              {/* TAB 1: Clinical Diagnoses & Vitals */}
              {activeTab === "clinical" && (
                <div className="space-y-4 pt-1 animate-in fade-in-50 duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Admission Diagnosis / Provisional</Label>
                      <Input
                        className="text-xs"
                        placeholder="e.g. Acute Gastroenteritis with moderate dehydration"
                        value={formData.admission_diagnosis || ""}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData((p) => ({ ...p, admission_diagnosis: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-primary">Final Diagnosis (Official NABH)</Label>
                      <div className="flex gap-2">
                        <Input
                          className="text-xs flex-1 border-primary/40 font-medium"
                          placeholder="e.g. Acute Bacterial Enteritis, resolved"
                          value={formData.final_diagnosis || ""}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData((p) => ({ ...p, final_diagnosis: e.target.value }))}
                        />
                        <Input
                          className="w-24 text-xs font-mono uppercase"
                          placeholder="ICD-10"
                          value={formData.icd10_code || ""}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData((p) => ({ ...p, icd10_code: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Chief Complaints at Admission</Label>
                      <textarea
                        rows={2}
                        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-2xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring resize-none"
                        placeholder="Symptoms presented at the time of admission..."
                        value={formData.chief_complaints || ""}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData((p) => ({ ...p, chief_complaints: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Known Drug Allergies & Past History</Label>
                      <textarea
                        rows={2}
                        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-2xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring resize-none"
                        placeholder="e.g. NKDA or Penicillin allergy, Diabetes Mellitus"
                        value={formData.past_history_and_allergies || ""}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData((p) => ({ ...p, past_history_and_allergies: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Discharge Vitals Box */}
                  <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <HeartPulse className="h-4 w-4 text-rose-500" /> Vitals at Time of Discharge
                      </span>
                      <Badge variant="outline" className="text-[10px] text-muted-foreground font-normal">
                        NABH Clinical Parameter
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Temp (°F)</Label>
                        <Input
                          className="h-8 text-xs font-mono"
                          placeholder="98.6"
                          value={formData.discharge_vitals?.temperature || ""}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleVitalChange("temperature", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">BP Sys (mmHg)</Label>
                        <Input
                          className="h-8 text-xs font-mono"
                          placeholder="120"
                          value={formData.discharge_vitals?.systolic_bp || ""}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleVitalChange("systolic_bp", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">BP Dia (mmHg)</Label>
                        <Input
                          className="h-8 text-xs font-mono"
                          placeholder="80"
                          value={formData.discharge_vitals?.diastolic_bp || ""}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleVitalChange("diastolic_bp", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Pulse (bpm)</Label>
                        <Input
                          className="h-8 text-xs font-mono"
                          placeholder="78"
                          value={formData.discharge_vitals?.pulse_rate || ""}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleVitalChange("pulse_rate", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Resp Rate (/min)</Label>
                        <Input
                          className="h-8 text-xs font-mono"
                          placeholder="18"
                          value={formData.discharge_vitals?.respiratory_rate || ""}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleVitalChange("respiratory_rate", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">SpO2 (%)</Label>
                        <Input
                          className="h-8 text-xs font-mono"
                          placeholder="99"
                          value={formData.discharge_vitals?.spo2 || ""}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleVitalChange("spo2", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">General Condition at Discharge</Label>
                    <Input
                      className="text-xs"
                      value={formData.condition_at_discharge || ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData((p) => ({ ...p, condition_at_discharge: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: Hospital Course & Investigations */}
              {activeTab === "course" && (
                <div className="space-y-4 pt-1 animate-in fade-in-50 duration-200">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-blue-500" /> Course in the Hospital (Clinical Narrative)
                      </Label>
                      <span className="text-[11px] text-muted-foreground">Auto-synthesized from Doctor SOAP rounds</span>
                    </div>
                    <textarea
                      rows={4}
                      className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-2xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring leading-relaxed"
                      placeholder="Summary of daily clinical progression and response to therapy..."
                      value={formData.hospital_course || ""}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData((p) => ({ ...p, hospital_course: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Laboratory & Diagnostic Findings</Label>
                      <textarea
                        rows={3}
                        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-2xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring resize-none"
                        placeholder="Key lab reports and diagnostic observations..."
                        value={formData.investigations_summary || ""}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData((p) => ({ ...p, investigations_summary: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Procedures, Surgeries & Interventions</Label>
                      <textarea
                        rows={3}
                        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-2xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring resize-none"
                        placeholder="Bedside nursing procedures, catheterization, operative procedures..."
                        value={formData.procedures_surgeries || ""}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData((p) => ({ ...p, procedures_surgeries: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Inpatient Treatment Administered</Label>
                    <textarea
                      rows={2}
                      className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-2xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring resize-none"
                      placeholder="IV antibiotics, fluids, supportive therapy given during admission..."
                      value={formData.treatment_given || ""}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData((p) => ({ ...p, treatment_given: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: Take-Home Discharge Medications (Rx) */}
              {activeTab === "medications" && (
                <div className="space-y-4 pt-1 animate-in fade-in-50 duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-foreground">Take-Home Prescription (Discharge Rx)</h4>
                      <p className="text-[11px] text-muted-foreground">
                        Medications the patient must take post-discharge with precise dosages and schedules.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleAddMedication}
                      className="gap-1.5 text-xs text-primary border-primary/30"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Medicine
                    </Button>
                  </div>

                  {(!formData.discharge_medications || formData.discharge_medications.length === 0) ? (
                    <div className="p-8 text-center border-2 border-dashed border-border rounded-xl">
                      <Pill className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-xs font-medium text-foreground">No discharge medications added yet</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Click below to prescribe medications for patient to take at home.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleAddMedication}
                        className="mt-3 gap-1.5 text-xs"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add First Medication
                      </Button>
                    </div>
                  ) : (
                    <div className="border border-border rounded-xl overflow-hidden shadow-2xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-muted/70 text-muted-foreground uppercase text-[10px] font-bold tracking-wider border-b border-border">
                            <tr>
                              <th className="py-2.5 px-3 min-w-[180px]">Medicine Name</th>
                              <th className="py-2.5 px-2 w-28">Form</th>
                              <th className="py-2.5 px-2 w-24">Dose</th>
                              <th className="py-2.5 px-2 min-w-[150px]">Frequency</th>
                              <th className="py-2.5 px-2 w-24">Duration</th>
                              <th className="py-2.5 px-2 min-w-[150px]">Timing / Instructions</th>
                              <th className="py-2.5 px-2 w-10 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/60 bg-card">
                            {formData.discharge_medications.map((med, idx) => (
                              <tr key={idx} className="hover:bg-muted/30 transition-colors">
                                <td className="p-2">
                                  <Input
                                    className="h-8 text-xs font-medium"
                                    placeholder="e.g. Tab Pantocid 40mg"
                                    value={med.medicine_name}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdateMedication(idx, "medicine_name", e.target.value)}
                                  />
                                </td>
                                <td className="p-2">
                                  <Select
                                    value={med.dosage_form || "Tablet"}
                                    onValueChange={(val) => handleUpdateMedication(idx, "dosage_form", val)}
                                  >
                                    {COMMON_DOSAGE_FORMS.map((f) => (
                                      <SelectItem key={f} value={f}>
                                        {f}
                                      </SelectItem>
                                    ))}
                                  </Select>
                                </td>
                                <td className="p-2">
                                  <Input
                                    className="h-8 text-xs"
                                    placeholder="1 Tab"
                                    value={med.dose || ""}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdateMedication(idx, "dose", e.target.value)}
                                  />
                                </td>
                                <td className="p-2">
                                  <Select
                                    value={med.frequency || "1-0-1 (Twice daily / BD)"}
                                    onValueChange={(val) => handleUpdateMedication(idx, "frequency", val)}
                                  >
                                    {COMMON_FREQUENCIES.map((freq) => (
                                      <SelectItem key={freq} value={freq}>
                                        {freq}
                                      </SelectItem>
                                    ))}
                                  </Select>
                                </td>
                                <td className="p-2">
                                  <Input
                                    className="h-8 text-xs"
                                    placeholder="5 Days"
                                    value={med.duration || ""}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdateMedication(idx, "duration", e.target.value)}
                                  />
                                </td>
                                <td className="p-2">
                                  <Input
                                    className="h-8 text-xs"
                                    placeholder="e.g. After meals with water"
                                    value={med.instructions || ""}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdateMedication(idx, "instructions", e.target.value)}
                                  />
                                </td>
                                <td className="p-2 text-center">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-500/10"
                                    onClick={() => handleRemoveMedication(idx)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: Advice & Emergency Red Flags */}
              {activeTab === "advice" && (
                <div className="space-y-4 pt-1 animate-in fade-in-50 duration-200">
                  {/* Emergency Red Flags Box */}
                  <div className="p-4 rounded-xl border-2 border-rose-300 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 space-y-2">
                    <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-xs">
                      <AlertTriangle className="h-4 w-4" /> EMERGENCY WARNING SIGNS / RED FLAGS (NABH Safety Protocol)
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Specific clinical warning indicators that necessitate immediate return to hospital Casualty/Emergency.
                    </p>
                    <textarea
                      rows={3}
                      className="w-full rounded-md border border-rose-200 dark:border-rose-900 bg-white dark:bg-background px-3 py-2 text-xs shadow-2xs leading-relaxed focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-rose-500"
                      value={formData.emergency_red_flags || ""}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData((p) => ({ ...p, emergency_red_flags: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Dietary Advice</Label>
                      <textarea
                        rows={2}
                        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-2xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring resize-none"
                        placeholder="Diet instructions..."
                        value={formData.dietary_advice || ""}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData((p) => ({ ...p, dietary_advice: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Physical Activity & Rest</Label>
                      <textarea
                        rows={2}
                        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-2xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring resize-none"
                        placeholder="Activity restrictions..."
                        value={formData.physical_activity_advice || ""}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData((p) => ({ ...p, physical_activity_advice: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Wound Care / Catheter / Dressing Instructions</Label>
                    <Input
                      className="text-xs"
                      value={formData.wound_care_instructions || ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData((p) => ({ ...p, wound_care_instructions: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Follow-Up OPD Review Instructions</Label>
                    <Input
                      className="text-xs"
                      value={formData.follow_up_instructions || ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData((p) => ({ ...p, follow_up_instructions: e.target.value }))}
                    />
                  </div>

                  {/* Finalize Bed release checkbox */}
                  {!isFinalized && (
                    <div className="flex items-center gap-2 p-3 bg-muted/40 rounded-lg border border-border">
                      <input
                        type="checkbox"
                        id="markDischargedCheck"
                        checked={markAsDischarged}
                        onChange={(e) => setMarkAsDischarged(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                      />
                      <label htmlFor="markDischargedCheck" className="text-xs font-medium cursor-pointer text-foreground">
                        Also Mark Patient as Discharged in System & Release Bed (Vacate Bed)
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <DialogFooter className="p-4 border-t border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-muted-foreground flex items-center gap-2">
            {summaryData?.finalized_at && (
              <span>Finalized on {new Date(summaryData.finalized_at).toLocaleDateString()}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onClose} disabled={saveMutation.isPending}>
              Cancel
            </Button>

            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5 text-xs"
              onClick={() => saveMutation.mutate("draft")}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save Draft
            </Button>

            <Button
              size="sm"
              variant="default"
              className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
              onClick={() => saveMutation.mutate("finalized")}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              {isFinalized ? "Update & Finalize" : "Finalize & Sign"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export default CreateDischargeSummaryModal
