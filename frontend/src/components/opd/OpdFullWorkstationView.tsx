import React, { useState, useMemo, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeft,
  Activity,
  Stethoscope,
  Pill,
  FileText,
  FlaskConical,
  CalendarCheck,
  CheckCircle2,
  RefreshCw,
  Plus,
  Trash2,
  Search,
  History,
  Heart,
  Droplet,
  Thermometer,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { opdService } from "@/services/opdService"
import { patientService } from "@/services/patientService"
import { settingsService } from "@/services/settingsService"
import { queryKeys } from "@/constants/queryKeys"
import { formatPatientAge, formatPatientGender, formatPatientDob } from "@/utils/patientUtils"
import { cn } from "@/lib/utils"
import type { OpdVisit, PrescriptionItem, DiagnosisResult } from "@/types/opd"

const FREQUENCY_OPTIONS = ["OD", "BD", "TID", "QID", "SOS", "Stat", "QHS", "QAM"]
const ROUTE_OPTIONS = ["Oral", "IV", "IM", "SC", "Topical", "Inhaled", "Sublingual", "Eye Drops", "Ear Drops"]

const COMMON_INVESTIGATIONS = [
  "Complete Blood Count (CBC)",
  "Liver Function Test (LFT)",
  "Kidney Function Test (KFT)",
  "Lipid Profile",
  "HbA1c & Blood Glucose",
  "Urine Routine & Microscopy",
  "Chest X-Ray (PA View)",
  "ECG 12-Lead",
  "USG Abdomen & Pelvis",
  "Thyroid Profile (T3, T4, TSH)",
  "Serum Electrolytes (Na, K, Cl)",
  "Serum Creatinine & Urea",
]

interface OpdFullWorkstationViewProps {
  visit: OpdVisit
  onBack: () => void
  onSuccess?: () => void
  isNurseOnly?: boolean
}

export const OpdFullWorkstationView: React.FC<OpdFullWorkstationViewProps> = ({
  visit,
  onBack,
  onSuccess,
  isNurseOnly = false,
}) => {
  const queryClient = useQueryClient()
  const patientId = visit.patient_id || visit.patient?.id
  const patient = visit.patient || ({} as any)
  const visitId = visit.id || visit.visit_id || 0

  // ─── Pre-recorded vitals fallback ─────────────────────────────────────
  const initialVital = visit.latest_vital || visit.latestVital || patient.latestVital
  const iv = initialVital?.vitals || initialVital || {}

  // ─── Clinical Vitals State ───────────────────────────────────────────
  const [bpSystolic, setBpSystolic] = useState<string>(iv.bp_systolic ? String(iv.bp_systolic) : "")
  const [bpDiastolic, setBpDiastolic] = useState<string>(iv.bp_diastolic ? String(iv.bp_diastolic) : "")
  const [pulse, setPulse] = useState<string>(iv.pulse_rate || iv.heart_rate ? String(iv.pulse_rate || iv.heart_rate) : "")
  const [spo2, setSpo2] = useState<string>(iv.spo2 ? String(iv.spo2) : "")
  const [temperature, setTemperature] = useState<string>(iv.temperature_f || iv.temperature ? String(iv.temperature_f || iv.temperature) : "")
  const [respiratoryRate, setRespiratoryRate] = useState<string>(iv.respiratory_rate ? String(iv.respiratory_rate) : "")
  const [heightCm, setHeightCm] = useState<string>(iv.height_cm ? String(iv.height_cm) : "")
  const [weightKg, setWeightKg] = useState<string>(iv.weight_kg ? String(iv.weight_kg) : "")
  const [bloodSugar, setBloodSugar] = useState<string>(iv.blood_sugar_random || iv.blood_sugar_fasting ? String(iv.blood_sugar_random || iv.blood_sugar_fasting) : "")
  const [vitalsNotes, setVitalsNotes] = useState<string>(iv.notes || "")
  const [customVitals, setCustomVitals] = useState<Record<string, any>>(iv.custom_vitals || {})

  // Dynamic vitals config
  const { data: customVitalConfigs = [] } = useQuery({
    queryKey: queryKeys.settings.vitals,
    queryFn: () => settingsService.getVitalConfigs(),
  })

  // ─── Automated Real-time BMI Calculation ──────────────────────────────
  const bmiData = useMemo(() => {
    const h = parseFloat(heightCm)
    const w = parseFloat(weightKg)
    if (!h || !w || h <= 0 || w <= 0) return null
    const heightM = h / 100
    const val = (w / (heightM * heightM)).toFixed(1)
    const num = parseFloat(val)
    let category = "Normal weight"
    let colorClass = "text-emerald-600 bg-emerald-500/10 border-emerald-500/30"
    if (num < 18.5) {
      category = "Underweight"
      colorClass = "text-amber-600 bg-amber-500/10 border-amber-500/30"
    } else if (num >= 25 && num < 30) {
      category = "Overweight"
      colorClass = "text-amber-600 bg-amber-500/10 border-amber-500/30"
    } else if (num >= 30) {
      category = "Obesity"
      colorClass = "text-rose-600 bg-rose-500/10 border-rose-500/30"
    }
    return { val, category, colorClass }
  }, [heightCm, weightKg])

  // ─── Clinical Notes & Examination ─────────────────────────────────────
  const [chiefComplaints, setChiefComplaints] = useState<string>(
    Array.isArray(visit.chief_complaint)
      ? visit.chief_complaint.join(", ")
      : visit.chief_complaint || visit.visit_reason || ""
  )
  const [clinicalNotes, setClinicalNotes] = useState<string>(visit.notes || "")
  const [examinationFindings, setExaminationFindings] = useState<string>("")

  // ─── Investigations Ordered ───────────────────────────────────────────
  const [investigations, setInvestigations] = useState<Array<{ name: string; urgency: "routine" | "urgent" | "stat" }>>([])
  const [invSearchQuery, setInvSearchQuery] = useState("")

  const addInvestigation = (name: string, urgency: "routine" | "urgent" | "stat" = "routine") => {
    if (!name.trim()) return
    if (investigations.some((x) => x.name.toLowerCase() === name.toLowerCase())) {
      toast.info(`"${name}" is already in the investigation list.`)
      return
    }
    setInvestigations((prev) => [...prev, { name: name.trim(), urgency }])
    setInvSearchQuery("")
  }

  const removeInvestigation = (index: number) => {
    setInvestigations((prev) => prev.filter((_, i) => i !== index))
  }

  // ─── Diagnosis & ICD-10 Coding ────────────────────────────────────────
  const [diagQuery, setDiagQuery] = useState("")
  const [diagSuggestions, setDiagSuggestions] = useState<DiagnosisResult[]>([])
  const [diagnoses, setDiagnoses] = useState<string[]>([])
  const diagDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleDiagSearch = (q: string) => {
    setDiagQuery(q)
    if (diagDebounceRef.current) clearTimeout(diagDebounceRef.current)
    if (q.trim().length < 2) {
      setDiagSuggestions([])
      return
    }
    diagDebounceRef.current = setTimeout(async () => {
      try {
        const res = await opdService.searchDiagnosis(q)
        setDiagSuggestions(res || [])
      } catch {
        setDiagSuggestions([])
      }
    }, 250)
  }

  const addDiagnosis = (d: DiagnosisResult) => {
    const label = `${d.code} - ${d.description}`
    if (!diagnoses.includes(label)) {
      setDiagnoses((prev) => [...prev, label])
    }
    setDiagQuery("")
    setDiagSuggestions([])
  }

  // ─── E-Prescription Medicines ─────────────────────────────────────────
  const [medicines, setMedicines] = useState<PrescriptionItem[]>([
    { medicine_name: "", dosage: "1 tab", frequency: "OD", duration: "5 days", route: "Oral", instructions: "After meals" },
  ])

  const handleMedicineChange = (index: number, field: keyof PrescriptionItem, val: string) => {
    setMedicines((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: val }
      return copy
    })
  }

  const addMedicineRow = () => {
    setMedicines((prev) => [
      ...prev,
      { medicine_name: "", dosage: "1 tab", frequency: "BD", duration: "5 days", route: "Oral", instructions: "After meals" },
    ])
  }

  const removeMedicineRow = (index: number) => {
    setMedicines((prev) => prev.filter((_, i) => i !== index))
  }

  // ─── Follow-up & Advice ───────────────────────────────────────────────
  const [followUpDate, setFollowUpDate] = useState<string>("")
  const [advice, setAdvice] = useState<string>("")

  const setShortcutFollowUp = (days: number) => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    setFollowUpDate(d.toISOString().substring(0, 10))
  }

  // ─── Patient Past History ─────────────────────────────────────────────
  const { data: historyData } = useQuery({
    queryKey: ["patient", patientId, "history"],
    queryFn: () => patientService.getPatientHistory(patientId),
    enabled: Boolean(patientId),
  })
  const history = historyData?.data || historyData || {}
  const pastOpdVisits = Array.isArray(history.opd_visits)
    ? history.opd_visits.filter((v: any) => v.id !== visitId)
    : []

  // ─── Mutations ────────────────────────────────────────────────────────
  const [isSaving, setIsSaving] = useState(false)

  // 1. Save Vitals
  const recordVitalsMutation = useMutation({
    mutationFn: opdService.recordVitals,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.opd.queue })
    },
  })

  // 2. Save Prescription
  const savePrescriptionMutation = useMutation({
    mutationFn: opdService.savePrescription,
  })

  // 3. Complete Consultation
  const completeMutation = useMutation({
    mutationFn: () => opdService.completeConsultation(visitId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.opd.queue })
      queryClient.invalidateQueries({ queryKey: ["reception", "queue"] })
    },
  })

  // Helper to submit Vitals only (e.g. for Nurse Triage)
  const handleSaveVitalsOnly = async () => {
    setIsSaving(true)
    try {
      const payload: any = {
        visit_id: visitId,
        patient_id: patientId,
        bp_systolic: bpSystolic ? parseInt(bpSystolic, 10) : undefined,
        bp_diastolic: bpDiastolic ? parseInt(bpDiastolic, 10) : undefined,
        pulse_rate: pulse ? parseInt(pulse, 10) : undefined,
        temperature_f: temperature ? parseFloat(temperature) : undefined,
        spo2: spo2 ? parseFloat(spo2) : undefined,
        respiratory_rate: respiratoryRate ? parseInt(respiratoryRate, 10) : undefined,
        height_cm: heightCm ? parseFloat(heightCm) : undefined,
        weight_kg: weightKg ? parseFloat(weightKg) : undefined,
        blood_sugar_random: bloodSugar ? parseFloat(bloodSugar) : undefined,
        notes: vitalsNotes,
        custom_vitals: customVitals,
      }
      await recordVitalsMutation.mutateAsync(payload)
      toast.success("Clinical Vitals recorded and verified successfully!")
      if (onSuccess) onSuccess()
      onBack()
    } catch (err: any) {
      toast.error(err.message || "Failed to record vitals")
    } finally {
      setIsSaving(false)
    }
  }

  // Full Consultation Completion (Doctor sign-off)
  const handleCompleteConsultation = async () => {
    setIsSaving(true)
    try {
      // Step 1: Save Vitals if entered
      if (bpSystolic || pulse || temperature || spo2 || weightKg || heightCm) {
        await recordVitalsMutation.mutateAsync({
          visit_id: visitId,
          patient_id: patientId,
          bp_systolic: bpSystolic ? parseInt(bpSystolic, 10) : undefined,
          bp_diastolic: bpDiastolic ? parseInt(bpDiastolic, 10) : undefined,
          pulse_rate: pulse ? parseInt(pulse, 10) : undefined,
          temperature_f: temperature ? parseFloat(temperature) : undefined,
          spo2: spo2 ? parseFloat(spo2) : undefined,
          respiratory_rate: respiratoryRate ? parseInt(respiratoryRate, 10) : undefined,
          height_cm: heightCm ? parseFloat(heightCm) : undefined,
          weight_kg: weightKg ? parseFloat(weightKg) : undefined,
          blood_sugar_random: bloodSugar ? parseFloat(bloodSugar) : undefined,
          notes: vitalsNotes,
          custom_vitals: customVitals,
        })
      }

      // Step 2: Combine Clinical Notes with Investigations and Findings
      let fullNotes = clinicalNotes
      if (examinationFindings) {
        fullNotes = fullNotes ? `${fullNotes}\n\n[Physical Examination]: ${examinationFindings}` : `[Physical Examination]: ${examinationFindings}`
      }
      if (investigations.length > 0) {
        const invList = investigations.map((x) => `${x.name} (${x.urgency.toUpperCase()})`).join(", ")
        fullNotes = fullNotes ? `${fullNotes}\n\n[Investigations Ordered]: ${invList}` : `[Investigations Ordered]: ${invList}`
      }

      // Step 3: Save Prescription
      const activeMeds = medicines.filter((m) => m.medicine_name.trim() !== "")
      await savePrescriptionMutation.mutateAsync({
        visit_id: visitId,
        opd_visit_id: visitId,
        patient_id: patientId,
        doctor_id: visit.doctor_id || visit.doctor?.id,
        chief_complaints: typeof chiefComplaints === "string" && chiefComplaints.trim()
          ? chiefComplaints.split(/;\s*|,\s*|\n/).map((s: string) => s.trim()).filter(Boolean)
          : Array.isArray(chiefComplaints) && chiefComplaints.length > 0
          ? chiefComplaints
          : ["Consultation complete"],
        medicines: activeMeds,
        follow_up_date: followUpDate || undefined,
        advice: advice || undefined,
      })

      // Step 4: Complete Visit
      await completeMutation.mutateAsync()
      toast.success(`Consultation completed for ${visit.patient_name || patient.name}! Slip & Prescription issued.`)
      if (onSuccess) onSuccess()
      onBack()
    } catch (err: any) {
      toast.error(err.message || "Failed to complete consultation. Please check all fields.")
    } finally {
      setIsSaving(false)
    }
  }

  const ageDisplay = formatPatientAge(visit.age || patient.age, visit.dob || patient.dob)
  const genderDisplay = formatPatientGender(visit.gender || patient.gender)
  const dobDisplay = formatPatientDob(visit.dob || patient.dob)

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* ── 1. TOP HEADER & BREADCRUMBS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-primary/20 bg-card shadow-xs">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onBack}
            className="h-9 px-3 gap-1.5 text-xs font-semibold hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Queue
          </Button>

          <div className="h-6 w-px bg-border/60 hidden sm:block" />

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-bold text-foreground">
                {visit.patient_name || patient.name || "Patient"}
              </span>
              <Badge className="font-mono text-xs px-2 py-0.5 bg-primary/10 text-primary border-primary/30">
                Token #{visit.token_no || visit.queue_token}
              </Badge>
              <span className="font-mono text-xs text-muted-foreground">
                UHID: {visit.uhid || patient.uhid || "—"}
              </span>
            </div>

            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
              <strong className="text-foreground">{ageDisplay}</strong>
              <span>•</span>
              <span>{genderDisplay}</span>
              <span>•</span>
              <span>DOB: {dobDisplay}</span>
              {patient.blood_group && (
                <>
                  <span>•</span>
                  <span className="font-semibold text-rose-600">Blood: {patient.blood_group}</span>
                </>
              )}
              <span>•</span>
              <span>
                Dept: <strong>{visit.department_name || visit.department?.name || "OPD"}</strong>
              </span>
              <span>•</span>
              <span>
                Doctor: <strong>Dr. {visit.doctor_name || visit.doctor?.name || "Consultant"}</strong>
              </span>
            </p>
          </div>
        </div>

        {/* Quick Save Buttons in Header */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSaveVitalsOnly}
            disabled={isSaving}
            className="text-xs h-9 text-teal-600 border-teal-500/40 hover:bg-teal-500/10 font-medium"
          >
            <Activity className="h-3.5 w-3.5 mr-1 text-teal-600" />
            Save Vitals Only
          </Button>

          {!isNurseOnly && (
            <Button
              type="button"
              size="sm"
              onClick={handleCompleteConsultation}
              disabled={isSaving}
              className="text-xs h-9 font-semibold bg-primary text-primary-foreground shadow-xs gap-1.5"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Saving & Completing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Complete Consultation & Sign-Off
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* ── 2. TWO-COLUMN COMPREHENSIVE CLINICAL WORKSPACE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ──── LEFT COLUMN (7 COLS): Vitals, Examination, Investigations ──── */}
        <div className="lg:col-span-7 space-y-4">
          {/* Card A: Physiological Vitals */}
          <Card className="p-4 rounded-2xl border shadow-xs space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-teal-600" />
                <h3 className="text-sm font-bold text-foreground">Clinical Vitals & Measurements</h3>
              </div>
              <span className="text-[11px] text-muted-foreground">
                Automatic calculations & clinical alerts
              </span>
            </div>

            {/* Vitals Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {/* BP Systolic */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold flex items-center justify-between">
                  <span>BP Systolic</span>
                  <span className="text-[9px] text-muted-foreground">mmHg</span>
                </Label>
                <Input
                  type="number"
                  placeholder="120"
                  value={bpSystolic}
                  onChange={(e) => setBpSystolic(e.target.value)}
                  className="h-9 text-xs font-mono font-bold"
                />
              </div>

              {/* BP Diastolic */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold flex items-center justify-between">
                  <span>BP Diastolic</span>
                  <span className="text-[9px] text-muted-foreground">mmHg</span>
                </Label>
                <Input
                  type="number"
                  placeholder="80"
                  value={bpDiastolic}
                  onChange={(e) => setBpDiastolic(e.target.value)}
                  className="h-9 text-xs font-mono font-bold"
                />
              </div>

              {/* Pulse */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Heart className="h-3 w-3 text-rose-500" /> Pulse
                  </span>
                  <span className="text-[9px] text-muted-foreground">bpm</span>
                </Label>
                <Input
                  type="number"
                  placeholder="72"
                  value={pulse}
                  onChange={(e) => setPulse(e.target.value)}
                  className="h-9 text-xs font-mono font-bold"
                />
              </div>

              {/* SpO2 */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Droplet className="h-3 w-3 text-blue-500" /> SpO2
                  </span>
                  <span className="text-[9px] text-muted-foreground">%</span>
                </Label>
                <Input
                  type="number"
                  placeholder="98"
                  value={spo2}
                  onChange={(e) => setSpo2(e.target.value)}
                  className="h-9 text-xs font-mono font-bold"
                />
              </div>

              {/* Temperature */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Thermometer className="h-3 w-3 text-amber-500" /> Temp
                  </span>
                  <span className="text-[9px] text-muted-foreground">°F</span>
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="98.6"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  className="h-9 text-xs font-mono font-bold"
                />
              </div>

              {/* Resp Rate */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold flex items-center justify-between">
                  <span>Resp. Rate</span>
                  <span className="text-[9px] text-muted-foreground">bpm</span>
                </Label>
                <Input
                  type="number"
                  placeholder="16"
                  value={respiratoryRate}
                  onChange={(e) => setRespiratoryRate(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              {/* Height */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold flex items-center justify-between">
                  <span>Height</span>
                  <span className="text-[9px] text-muted-foreground">cm</span>
                </Label>
                <Input
                  type="number"
                  placeholder="170"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              {/* Weight */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold flex items-center justify-between">
                  <span>Weight</span>
                  <span className="text-[9px] text-muted-foreground">kg</span>
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="65"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            {/* BMI & Blood Sugar Banner */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-muted/40 border border-border/60 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-medium">Auto-Calculated BMI:</span>
                {bmiData ? (
                  <Badge variant="outline" className={cn("font-bold text-xs", bmiData.colorClass)}>
                    {bmiData.val} kg/m² ({bmiData.category})
                  </Badge>
                ) : (
                  <span className="text-muted-foreground italic text-[11px]">Enter height & weight</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-[11px] text-muted-foreground whitespace-nowrap">Blood Sugar (RBS):</Label>
                <Input
                  type="number"
                  placeholder="110 mg/dL"
                  value={bloodSugar}
                  onChange={(e) => setBloodSugar(e.target.value)}
                  className="h-7 w-28 text-xs font-mono"
                />
              </div>
            </div>

            {/* Custom Hospital Vitals */}
            {customVitalConfigs.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 border-t border-border/40 text-xs">
                {customVitalConfigs.map((cfg: any) => (
                  <div key={cfg.id} className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">
                      {cfg.field_label} {cfg.unit ? `(${cfg.unit})` : ""}
                    </Label>
                    <Input
                      type={cfg.field_type === "number" ? "number" : "text"}
                      placeholder={cfg.unit || "—"}
                      value={customVitals[cfg.field_name] || ""}
                      onChange={(e) =>
                        setCustomVitals((prev) => ({ ...prev, [cfg.field_name]: e.target.value }))
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Triage / Vitals Notes */}
            <div className="pt-2 border-t border-border/40">
              <Label className="text-[11px] text-muted-foreground">Triage Observations / Vitals Notes</Label>
              <Input
                placeholder="e.g. Patient rested 5 mins before BP measurement, mild distress..."
                value={vitalsNotes}
                onChange={(e) => setVitalsNotes(e.target.value)}
                className="h-8 text-xs mt-1"
              />
            </div>
          </Card>

          {/* Card B: Clinical Examination & Symptoms */}
          <Card className="p-4 rounded-2xl border shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Clinical Examination & Symptoms</h3>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Chief Complaint / Reasons for Visit *</Label>
                <Input
                  value={chiefComplaints}
                  onChange={(e) => setChiefComplaints(e.target.value)}
                  placeholder="e.g. Fever for 3 days, dry cough, headache..."
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">History of Present Illness (HPI) & Notes</Label>
                  <textarea
                    rows={3}
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                    placeholder="Patient history, duration of symptoms, past allergies..."
                    className="w-full rounded-md border border-input bg-background p-2 text-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Physical Examination Findings</Label>
                  <textarea
                    rows={3}
                    value={examinationFindings}
                    onChange={(e) => setExaminationFindings(e.target.value)}
                    placeholder="Chest clear, S1/S2 heard, abdomen soft, no edema..."
                    className="w-full rounded-md border border-input bg-background p-2 text-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Card C: Diagnostic & Lab Investigations */}
          <Card className="p-4 rounded-2xl border shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-purple-600" />
                <h3 className="text-sm font-bold text-foreground">Investigation Orders (Pathology & Radiology)</h3>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {investigations.length} ordered
              </Badge>
            </div>

            {/* Quick Test Recommendations */}
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Quick Diagnostic Tests:</Label>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {COMMON_INVESTIGATIONS.map((test, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => addInvestigation(test)}
                    className="rounded-md border border-border/80 bg-muted/40 hover:bg-primary/10 hover:border-primary/40 px-2 py-0.5 text-[11px] text-foreground transition-all"
                  >
                    + {test}
                  </button>
                ))}
              </div>
            </div>

            {/* Manual Add Input */}
            <div className="flex items-center gap-2 pt-1">
              <Input
                placeholder="Type custom lab test or radiology order..."
                value={invSearchQuery}
                onChange={(e) => setInvSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addInvestigation(invSearchQuery)
                  }
                }}
                className="h-8 text-xs flex-1"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => addInvestigation(invSearchQuery)}
                disabled={!invSearchQuery.trim()}
                className="h-8 text-xs"
              >
                Add Order
              </Button>
            </div>

            {/* Selected Investigations List */}
            {investigations.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-border/40">
                {investigations.map((inv, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-purple-500/5 border border-purple-500/20 text-xs"
                  >
                    <span className="font-semibold text-foreground">{inv.name}</span>
                    <div className="flex items-center gap-2">
                      <select
                        value={inv.urgency}
                        onChange={(e) => {
                          const val = e.target.value as any
                          setInvestigations((prev) => {
                            const c = [...prev]
                            c[idx].urgency = val
                            return c
                          })
                        }}
                        className="h-6 rounded border border-border bg-background px-1.5 text-[10px] font-semibold"
                      >
                        <option value="routine">Routine</option>
                        <option value="urgent">Urgent</option>
                        <option value="stat">STAT</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removeInvestigation(idx)}
                        className="text-muted-foreground hover:text-destructive p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* ──── RIGHT COLUMN (5 COLS): Diagnosis, Prescription, Follow-up ──── */}
        <div className="lg:col-span-5 space-y-4">
          {/* Card D: ICD-10 Diagnosis */}
          <Card className="p-4 rounded-2xl border shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-foreground">Diagnosis & ICD-10 Coding</h3>
              </div>
            </div>

            {/* Search ICD-10 */}
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search ICD-10 code or condition (e.g. fever, hypertension)..."
                  value={diagQuery}
                  onChange={(e) => handleDiagSearch(e.target.value)}
                  className="pl-8 text-xs h-9"
                />
              </div>

              {diagSuggestions.length > 0 && (
                <div className="absolute z-20 mt-1 w-full rounded-xl border border-border bg-popover p-1 shadow-lg max-h-48 overflow-y-auto">
                  {diagSuggestions.map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => addDiagnosis(item)}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-muted text-xs flex items-center justify-between"
                    >
                      <span className="font-medium text-foreground">{item.description}</span>
                      <span className="font-mono text-[10px] text-muted-foreground ml-2">{item.code}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Diagnosis Pills */}
            <div className="flex flex-wrap gap-1.5 min-h-8">
              {diagnoses.length === 0 ? (
                <span className="text-muted-foreground italic text-[11px]">
                  No ICD-10 diagnoses tagged yet.
                </span>
              ) : (
                diagnoses.map((code, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[11px] gap-1 px-2 py-0.5"
                  >
                    <span>{code}</span>
                    <button
                      type="button"
                      onClick={() => setDiagnoses((prev) => prev.filter((_, i) => i !== idx))}
                      className="hover:text-destructive ml-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
          </Card>

          {/* Card E: E-Prescription Medicines */}
          <Card className="p-4 rounded-2xl border shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Pill className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-foreground">E-Prescription & Dosages</h3>
              </div>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={addMedicineRow}
                className="gap-1 text-xs text-primary"
              >
                <Plus className="h-3 w-3" />
                Add Medicine
              </Button>
            </div>

            {/* Medicines List */}
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {medicines.map((med, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl border border-border/70 bg-muted/20 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Input
                      placeholder="Medicine Name (e.g. Paracetamol 650mg)"
                      value={med.medicine_name}
                      onChange={(e) => handleMedicineChange(idx, "medicine_name", e.target.value)}
                      className="h-8 text-xs font-semibold flex-1"
                    />
                    {medicines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMedicineRow(idx)}
                        className="text-muted-foreground hover:text-destructive p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      placeholder="Dosage (1 tab)"
                      value={med.dosage}
                      onChange={(e) => handleMedicineChange(idx, "dosage", e.target.value)}
                      className="h-7 text-[11px]"
                    />

                    <select
                      value={med.frequency}
                      onChange={(e) => handleMedicineChange(idx, "frequency", e.target.value)}
                      className="h-7 rounded-md border border-input bg-background px-1.5 text-[11px]"
                    >
                      {FREQUENCY_OPTIONS.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>

                    <Input
                      placeholder="Duration (5 days)"
                      value={med.duration}
                      onChange={(e) => handleMedicineChange(idx, "duration", e.target.value)}
                      className="h-7 text-[11px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={med.route || "Oral"}
                      onChange={(e) => handleMedicineChange(idx, "route", e.target.value)}
                      className="h-7 rounded-md border border-input bg-background px-1.5 text-[11px]"
                    >
                      {ROUTE_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>

                    <Input
                      placeholder="Instructions (After food)"
                      value={med.instructions || ""}
                      onChange={(e) => handleMedicineChange(idx, "instructions", e.target.value)}
                      className="h-7 text-[11px]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Card F: Follow-up & Discharge Advice */}
          <Card className="p-4 rounded-2xl border shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Follow-up & Patient Advice</h3>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Follow-up Date:</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShortcutFollowUp(3)}
                      className="px-2 py-1 rounded bg-muted hover:bg-primary/10 text-[10px] font-semibold text-foreground"
                    >
                      +3d
                    </button>
                    <button
                      type="button"
                      onClick={() => setShortcutFollowUp(7)}
                      className="px-2 py-1 rounded bg-muted hover:bg-primary/10 text-[10px] font-semibold text-foreground"
                    >
                      +7d
                    </button>
                    <button
                      type="button"
                      onClick={() => setShortcutFollowUp(15)}
                      className="px-2 py-1 rounded bg-muted hover:bg-primary/10 text-[10px] font-semibold text-foreground"
                    >
                      +15d
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Doctor Advice / Diet instructions:</Label>
                <textarea
                  rows={2}
                  value={advice}
                  onChange={(e) => setAdvice(e.target.value)}
                  placeholder="Drink plenty of water, light diet, review if fever persists..."
                  className="w-full rounded-md border border-input bg-background p-2 text-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>
          </Card>

          {/* Card G: Quick Past Visits History (Reference) */}
          {pastOpdVisits.length > 0 && (
            <Card className="p-3.5 rounded-2xl border shadow-xs space-y-2 text-xs">
              <div className="flex items-center justify-between pb-1 border-b border-border/50">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5 text-muted-foreground" />
                  Past Consultation Records ({pastOpdVisits.length})
                </span>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {pastOpdVisits.slice(0, 3).map((past: any, idx: number) => (
                  <div key={idx} className="p-2 rounded-lg bg-muted/30 border border-border/50 text-[11px]">
                    <div className="flex justify-between font-medium">
                      <span>{past.visit_date ? new Date(past.visit_date).toLocaleDateString("en-IN") : "Past"}</span>
                      <span className="text-muted-foreground">Dr. {past.doctor?.name || past.doctor_name || "Doctor"}</span>
                    </div>
                    {past.diagnosis && (
                      <p className="text-emerald-700 dark:text-emerald-400 font-medium truncate mt-0.5">
                        Dx: {past.diagnosis}
                      </p>
                    )}
                    {past.chief_complaint && (
                      <p className="text-muted-foreground truncate">{past.chief_complaint}</p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* ── 3. BOTTOM STICKY ACTION BAR ── */}
      <div className="sticky bottom-2 z-20 flex items-center justify-between p-3.5 rounded-2xl border border-border bg-background/95 backdrop-blur-md shadow-lg">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onBack}
          className="text-xs h-9"
        >
          Cancel & Return
        </Button>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSaveVitalsOnly}
            disabled={isSaving}
            className="text-xs h-9 text-teal-600 border-teal-500/40 hover:bg-teal-500/10 font-semibold"
          >
            <Activity className="h-3.5 w-3.5 mr-1 text-teal-600" />
            Save Vitals Only
          </Button>

          {!isNurseOnly && (
            <Button
              type="button"
              size="sm"
              onClick={handleCompleteConsultation}
              disabled={isSaving}
              className="text-xs h-9 px-5 font-semibold bg-primary text-primary-foreground shadow-xs gap-1.5"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Completing Consultation...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Complete Consultation & Issue E-Prescription
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
