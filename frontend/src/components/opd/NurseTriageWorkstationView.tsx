import React, { useState, useMemo, useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Heart,
  Droplet,
  Thermometer,
  Plus,
  Trash2,
  User,
  ShieldCheck,
  Search,
  History,
  FileText,
  RotateCcw,
  Sliders,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { useAuth } from "@/context/AuthContext"
import { opdService } from "@/services/opdService"
import { settingsService } from "@/services/settingsService"
import { queryKeys } from "@/constants/queryKeys"
import { formatPatientAge, formatPatientGender } from "@/utils/patientUtils"
import {
  calculateBmi,
  calculateMap,
  calculateBsa,
  calculateEgfr,
  classifyBloodPressure,
} from "@/utils/clinicalCalculators"
import { VitalAuditModal } from "./VitalAuditModal"
import type {
  OpdVisit,
  PastMedicalHistoryItem,
  PastSurgicalHistoryItem,
  AddictionItem,
  PersonalHistory,
  VitalRecord,
} from "@/types/opd"

const COMMON_SYMPTOMS_CATALOG = [
  "FEVER",
  "CHEST PAIN",
  "BACK PAIN",
  "HEADACHE",
  "ABD DISCOMFORT",
  "ABDOMINAL DISTENTION",
  "ABDOMINAL FULLNESS",
  "LEFT SIDE THIGH PAIN",
  "HEAVINESS IN RIGHT LOWER LIMB",
  "COUGH & COLD",
  "BREATHLESSNESS / DYSPNEA",
  "NAUSEA & VOMITING",
  "DIZZINESS / VERTIGO",
  "LOOSE MOTIONS / DIARRHEA",
  "CONSTIPATION",
  "BURNING MICTURITION",
  "GENERAL WEAKNESS / FATIGUE",
  "JOINT PAIN",
]

interface NurseTriageWorkstationViewProps {
  visit: OpdVisit
  onBack: () => void
  onSuccess?: () => void
}

export const NurseTriageWorkstationView: React.FC<NurseTriageWorkstationViewProps> = ({
  visit,
  onBack,
  onSuccess,
}) => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const visitId = Number(visit.id || visit.visit_id || 0)
  const patientId = Number(visit.patient_id || visit.patient?.id || 0)
  const patient = visit.patient || ({} as any)

  // Fetch Existing Vitals for this visit (if re-triaging or viewing)
  const { data: existingVitalsList = [] } = useQuery({
    queryKey: queryKeys.opd.visitVitals(visitId),
    queryFn: () => opdService.getVisitVitals(visitId),
    enabled: Boolean(visitId > 0),
  })

  const latestVital: VitalRecord | undefined = existingVitalsList[0]
  const existingCustom = latestVital?.custom_vitals || {}

  // Audit modal state
  const [auditModalOpen, setAuditModalOpen] = useState(false)

  // Fetch dynamic vital field configs from settings
  const { data: dynamicVitalConfigs = [] } = useQuery({
    queryKey: queryKeys.settings.vitals,
    queryFn: () => settingsService.getVitalConfigs(),
  })

  // Fetch hospital triage sections configuration
  const { data: triageSettingsData } = useQuery({
    queryKey: ["hospital", "settings", "triage_sections"],
    queryFn: () => settingsService.getSettings("triage_sections"),
  })

  const enableSymptoms = triageSettingsData?.enable_symptoms !== false
  const enablePastMedical = triageSettingsData?.enable_past_medical !== false
  const enablePastSurgical = triageSettingsData?.enable_past_surgical !== false
  const enableAddictions = triageSettingsData?.enable_addictions !== false
  const enablePersonal = triageSettingsData?.enable_personal_history !== false
  const customSections = Array.isArray(triageSettingsData?.custom_sections)
    ? triageSettingsData.custom_sections
    : []
  const [customSectionsData, setCustomSectionsData] = useState<Record<string, Record<string, string>>>({})

  // Exclude standard baseline parameters already in Row 1 & 2
  const standardKeys = useMemo(
    () =>
      new Set([
        "pulse", "pulse_rate", "bp", "blood_pressure", "blood_pressure_sys", "blood_pressure_dia", "sbp", "dbp",
        "temp", "temperature", "temperature_unit", "respiratory_rate", "resp_rate", "spo2", "oxygen_saturation",
        "pain_score", "height", "weight", "bmi", "bsa", "map", "creatinine", "egfr",
        "glucose", "blood_glucose", "random_blood_sugar", "fasting_blood_sugar", "post_meal_blood_sugar", "glucose_type"
      ]),
    []
  )

  const hospitalCustomVitals = useMemo(() => {
    return dynamicVitalConfigs.filter((cfg: any) => {
      const key = String(cfg.field_key || cfg.field_name || "").toLowerCase().trim()
      return !standardKeys.has(key)
    })
  }, [dynamicVitalConfigs, standardKeys])

  // ─── 1. TOP METRICS STATE ──────────────────────────────────────────
  const [pulse, setPulse] = useState<string>("")
  const [sbp, setSbp] = useState<string>("")
  const [dbp, setDbp] = useState<string>("")
  const [temp, setTemp] = useState<string>("")
  const [tempUnit, setTempUnit] = useState<"F" | "C">("F")
  const [respRate, setRespRate] = useState<string>("")
  const [spo2, setSpo2] = useState<string>("")
  const [painScore, setPainScore] = useState<string>("0")
  const [heightCm, setHeightCm] = useState<string>("")
  const [weightKg, setWeightKg] = useState<string>("")
  const [glucose, setGlucose] = useState<string>("")
  const [glucoseType, setGlucoseType] = useState<"random" | "fasting" | "post_meal">("random")
  const [creatinine, setCreatinine] = useState<string>("")
  const [customVitals, setCustomVitals] = useState<Record<string, any>>({})

  // ─── 2. CLINICAL ASSESSMENT SECTIONS STATE ──────────────────────────
  // Section A: Symptoms / Complaints
  const [symptomsText, setSymptomsText] = useState<string>(
    Array.isArray(visit.chief_complaint)
      ? visit.chief_complaint.join(", ")
      : visit.chief_complaint || visit.visit_reason || ""
  )
  const [symptomSearch, setSymptomSearch] = useState<string>("")

  // Section B: Past Medical History
  const [pastMedical, setPastMedical] = useState<PastMedicalHistoryItem[]>([
    { disease: "", duration: "", medication: "" },
  ])

  // Section C: Past Surgical History
  const [pastSurgical, setPastSurgical] = useState<PastSurgicalHistoryItem[]>([])

  // Section D: Addiction Details
  const [addictions, setAddictions] = useState<AddictionItem[]>([])

  // Section E: Personal History
  const [personalHistory, setPersonalHistory] = useState<PersonalHistory>({
    diet: "Non-Vegetarian",
    appetite: "Normal",
    sleep: "Normal",
    bladder: "Normal",
    bowel: "Normal",
    current_treatment: "",
    comments: "",
  })

  // Pre-fill state if existing vital record exists
  useEffect(() => {
    if (latestVital) {
      if (latestVital.pulse_rate) setPulse(String(latestVital.pulse_rate))
      if (latestVital.blood_pressure_sys) setSbp(String(latestVital.blood_pressure_sys))
      if (latestVital.blood_pressure_dia) setDbp(String(latestVital.blood_pressure_dia))
      if (latestVital.temperature) setTemp(String(latestVital.temperature))
      if (latestVital.temperature_unit) setTempUnit(latestVital.temperature_unit as any)
      if (latestVital.respiratory_rate) setRespRate(String(latestVital.respiratory_rate))
      if (latestVital.oxygen_saturation) setSpo2(String(latestVital.oxygen_saturation))
      if (latestVital.height) setHeightCm(String(latestVital.height))
      if (latestVital.weight) setWeightKg(String(latestVital.weight))
      if (latestVital.blood_glucose) setGlucose(String(latestVital.blood_glucose))
      if (latestVital.glucose_type) setGlucoseType(latestVital.glucose_type as any)

      // Custom fields from JSON
      if (existingCustom.pain_score) setPainScore(String(existingCustom.pain_score))
      if (existingCustom.creatinine) setCreatinine(String(existingCustom.creatinine))
      if (existingCustom.symptoms) {
        setSymptomsText(
          Array.isArray(existingCustom.symptoms)
            ? existingCustom.symptoms.join("; ")
            : String(existingCustom.symptoms)
        )
      }
      if (Array.isArray(existingCustom.past_medical_history)) {
        setPastMedical(existingCustom.past_medical_history)
      }
      if (Array.isArray(existingCustom.past_surgical_history)) {
        setPastSurgical(existingCustom.past_surgical_history)
      }
      if (Array.isArray(existingCustom.addictions)) {
        setAddictions(existingCustom.addictions)
      }
      if (existingCustom.personal_history) {
        setPersonalHistory((prev) => ({ ...prev, ...existingCustom.personal_history }))
      }
      if (existingCustom.custom_fields) {
        setCustomVitals(existingCustom.custom_fields)
      }
      if (existingCustom.custom_sections_data) {
        setCustomSectionsData(existingCustom.custom_sections_data)
      }
    }
  }, [latestVital])

  // ─── Real-time Auto Computations ────────────────────────────────────
  const mapValue = useMemo(() => calculateMap(sbp, dbp), [sbp, dbp])
  const bsaValue = useMemo(() => calculateBsa(heightCm, weightKg), [heightCm, weightKg])
  const bmiResult = useMemo(() => calculateBmi(heightCm, weightKg), [heightCm, weightKg])
  const bpClassification = useMemo(() => classifyBloodPressure(sbp, dbp), [sbp, dbp])
  const egfrValue = useMemo(
    () => calculateEgfr(creatinine, visit.age || patient.age, visit.gender || patient.gender),
    [creatinine, visit.age, patient.age, visit.gender, patient.gender]
  )

  // Dynamic symptoms catalog from hospital settings
  const symptomsCatalog: string[] = useMemo(() => {
    if (
      triageSettingsData?.symptoms_catalog &&
      Array.isArray(triageSettingsData.symptoms_catalog) &&
      triageSettingsData.symptoms_catalog.length > 0
    ) {
      return triageSettingsData.symptoms_catalog
    }
    return COMMON_SYMPTOMS_CATALOG
  }, [triageSettingsData])

  // Filtered symptoms catalog
  const filteredCatalog = useMemo(() => {
    if (!symptomSearch.trim()) return symptomsCatalog
    return symptomsCatalog.filter((s) =>
      s.toLowerCase().includes(symptomSearch.toLowerCase())
    )
  }, [symptomSearch, symptomsCatalog])

  // Append symptom helper
  const addSymptom = (sym: string) => {
    const trimmed = sym.trim()
    if (!trimmed) return
    setSymptomsText((prev) => {
      const parts = prev
        .split(";")
        .map((p) => p.trim())
        .filter(Boolean)
      if (parts.includes(trimmed)) return prev
      return parts.length > 0 ? `${prev}; ${trimmed}` : trimmed
    })
  }

  // ─── Mutation: Save / Update Triage Vitals ──────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmitTriage = async () => {
    setIsSubmitting(true)
    try {
      const payload: any = {
        patient_id: patientId,
        opd_visit_id: visitId,
        encounter_type: "opd",
        blood_pressure_sys: sbp ? parseInt(sbp, 10) : undefined,
        blood_pressure_dia: dbp ? parseInt(dbp, 10) : undefined,
        pulse_rate: pulse ? parseInt(pulse, 10) : undefined,
        temperature: temp ? parseFloat(temp) : undefined,
        temperature_unit: tempUnit,
        respiratory_rate: respRate ? parseInt(respRate, 10) : undefined,
        oxygen_saturation: spo2 ? parseFloat(spo2) : undefined,
        height: heightCm ? parseFloat(heightCm) : undefined,
        weight: weightKg ? parseFloat(weightKg) : undefined,
        blood_glucose: glucose ? parseFloat(glucose) : undefined,
        glucose_type: glucoseType,
        custom_vitals: {
          pain_score: painScore ? parseInt(painScore, 10) : undefined,
          mean_arterial_pressure: mapValue,
          body_surface_area: bsaValue,
          creatinine: creatinine ? parseFloat(creatinine) : undefined,
          egfr: egfrValue,
          symptoms: symptomsText,
          past_medical_history: pastMedical.filter((m) => m.disease.trim() !== ""),
          past_surgical_history: pastSurgical.filter((s) => s.name.trim() !== ""),
          addictions: addictions.filter((a) => a.type.trim() !== ""),
          personal_history: personalHistory,
          custom_sections_data: customSectionsData,
          custom_fields: customVitals,
          recorded_staff_name: user?.name,
          recorded_staff_role: user?.role || "Staff Nurse",
          recorded_staff_username: user?.username,
        },
      }

      if (latestVital?.id) {
        // Update existing record
        await opdService.updateVital(latestVital.id, payload)
        toast.success("Pre-consultation triage updated with audit revision!")
      } else {
        // New record
        await opdService.recordVitals(payload)
        toast.success("Pre-consultation vitals & assessment recorded successfully!")
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.opd.queue })
      queryClient.invalidateQueries({ queryKey: queryKeys.opd.visitVitals(visitId) })
      queryClient.invalidateQueries({ queryKey: ["vitals"] })
      queryClient.invalidateQueries({ queryKey: ["patient", patientId] })

      if (onSuccess) onSuccess()
      onBack()
    } catch (err: any) {
      toast.error(err.message || "Failed to save triage assessment")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-200">
      {/* ────────────────────────────────────────────────────────────────
          1. TOP NAVIGATION & PATIENT ATTRIBUTION HEADER
         ──────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-2xl border border-teal-500/20 bg-teal-500/5 shadow-xs">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="h-9 gap-1.5 text-xs rounded-xl border-teal-500/30 hover:bg-teal-500/10 text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Triage Queue
          </Button>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-extrabold text-foreground">
                {visit.patient_name || patient.name || "Patient"}
              </span>
              <Badge className="bg-teal-600 text-white font-mono text-[11px] px-2 py-0.5">
                Token #{visit.token_no || visit.queue_token || visit.opd_number}
              </Badge>
              <Badge variant="outline" className="font-mono text-[11px] text-muted-foreground border-border">
                UHID: {visit.uhid || patient.uhid || "—"}
              </Badge>
              <Badge variant="outline" className="text-teal-700 dark:text-teal-400 bg-teal-500/10 text-[10px]">
                Nurse Triage Desk
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatPatientAge(visit.age || patient.age, visit.dob || patient.dob)} /{" "}
              {formatPatientGender(visit.gender || patient.gender)} • Blood:{" "}
              <strong className="text-foreground">{patient.blood_group || "—"}</strong> • Mobile:{" "}
              <span className="font-mono">{visit.patient_mobile || patient.mobile || "—"}</span>
            </p>
          </div>
        </div>

        {/* Staff Attribution & Audit Logs Trigger */}
        <div className="flex items-center gap-2 self-start md:self-auto bg-background/80 border border-teal-500/30 rounded-xl px-3 py-2 shadow-2xs">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/15 text-teal-600 shrink-0">
            <ShieldCheck className="h-4.5 w-4.5" />
          </div>
          <div className="text-right text-[11px] min-w-0">
            <span className="text-muted-foreground block text-[10px]">Triage Staff On Duty</span>
            <span className="font-bold text-foreground truncate block">
              {user?.name || "Staff Nurse"} {user?.username ? `(@${user.username})` : ""}
            </span>
          </div>

          {latestVital && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAuditModalOpen(true)}
              className="ml-2 h-7 px-2 text-[10px] text-teal-700 dark:text-teal-300 hover:bg-teal-500/15 rounded-lg gap-1 border border-teal-500/30"
              title="View Staff Attribution & Audit Logs"
            >
              <History className="h-3 w-3" /> Audit Log
            </Button>
          )}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────
          2. COMPACT HORIZONTAL CLINICAL METRICS GRID (Exact Screenshot Layout)
         ──────────────────────────────────────────────────────────────── */}
      <Card className="p-3.5 rounded-2xl border shadow-xs bg-card space-y-2.5">
        <div className="flex items-center justify-between pb-1.5 border-b border-border/70">
          <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
            <Activity className="h-4 w-4 text-rose-500" />
            Pre-Consultation Baseline Vitals & Physiological Parameters
          </span>
          <div className="flex items-center gap-2 text-[11px]">
            {bpClassification.label !== "Not Recorded" && (
              <Badge variant="outline" className={`font-mono text-[10px] ${bpClassification.colorClass}`}>
                {bpClassification.label}
              </Badge>
            )}
            <span className="text-muted-foreground text-[10px] hidden sm:inline">
              Real-time MAP, BSA, BMI & eGFR Auto-Calculated
            </span>
          </div>
        </div>

        {/* Compact Horizontal Grid Row 1: Vitals */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 lg:grid-cols-10 gap-2 text-xs">
          {/* Pulse */}
          <div className="space-y-1">
            <Label className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
              <Heart className="h-3 w-3 text-rose-500" /> Pulse (bpm)
            </Label>
            <Input
              type="number"
              placeholder="72"
              value={pulse}
              onChange={(e) => setPulse(e.target.value)}
              className="h-8 text-xs font-mono font-bold"
            />
          </div>

          {/* SBP */}
          <div className="space-y-1">
            <Label className="text-[10px] font-semibold text-muted-foreground">SBP (mmHg)</Label>
            <Input
              type="number"
              placeholder="120"
              value={sbp}
              onChange={(e) => setSbp(e.target.value)}
              className="h-8 text-xs font-mono font-bold text-rose-600 dark:text-rose-400"
            />
          </div>

          {/* DBP */}
          <div className="space-y-1">
            <Label className="text-[10px] font-semibold text-muted-foreground">DBP (mmHg)</Label>
            <Input
              type="number"
              placeholder="80"
              value={dbp}
              onChange={(e) => setDbp(e.target.value)}
              className="h-8 text-xs font-mono font-bold text-rose-600 dark:text-rose-400"
            />
          </div>

          {/* Auto MAP */}
          <div className="space-y-1">
            <Label className="text-[10px] font-semibold text-muted-foreground">MAP (mmHg)</Label>
            <div className="h-8 rounded-md border border-border bg-muted/30 px-2 flex items-center font-mono font-bold text-xs text-foreground">
              {mapValue !== null ? `${mapValue}` : "—"}
            </div>
          </div>

          {/* Temp */}
          <div className="space-y-1">
            <Label className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
              <Thermometer className="h-3 w-3 text-amber-500" /> Temp (°{tempUnit})
            </Label>
            <div className="flex gap-1">
              <Input
                type="number"
                step="0.1"
                placeholder="98.6"
                value={temp}
                onChange={(e) => setTemp(e.target.value)}
                className="h-8 text-xs font-mono font-bold flex-1"
              />
              <button
                type="button"
                onClick={() => setTempUnit((u) => (u === "F" ? "C" : "F"))}
                className="h-8 px-1.5 rounded border border-border bg-muted/40 text-[10px] font-bold text-muted-foreground hover:text-foreground"
              >
                {tempUnit}
              </button>
            </div>
          </div>

          {/* Resp */}
          <div className="space-y-1">
            <Label className="text-[10px] font-semibold text-muted-foreground">Resp (bpm)</Label>
            <Input
              type="number"
              placeholder="16"
              value={respRate}
              onChange={(e) => setRespRate(e.target.value)}
              className="h-8 text-xs font-mono"
            />
          </div>

          {/* SpO2 */}
          <div className="space-y-1">
            <Label className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
              <Droplet className="h-3 w-3 text-blue-500" /> SpO2 (%)
            </Label>
            <Input
              type="number"
              placeholder="98"
              value={spo2}
              onChange={(e) => setSpo2(e.target.value)}
              className="h-8 text-xs font-mono font-bold text-blue-600 dark:text-blue-400"
            />
          </div>

          {/* Pain Score */}
          <div className="space-y-1">
            <Label className="text-[10px] font-semibold text-muted-foreground">Pain (1-10)</Label>
            <select
              value={painScore}
              onChange={(e) => setPainScore(e.target.value)}
              className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs font-mono font-semibold"
            >
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <option key={num} value={num}>
                  {num === 0 ? "0 (None)" : num === 10 ? "10 (Severe)" : `${num}`}
                </option>
              ))}
            </select>
          </div>

          {/* Height */}
          <div className="space-y-1">
            <Label className="text-[10px] font-semibold text-muted-foreground">Height (cm)</Label>
            <Input
              type="number"
              placeholder="170"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              className="h-8 text-xs font-mono"
            />
          </div>

          {/* Weight */}
          <div className="space-y-1">
            <Label className="text-[10px] font-semibold text-muted-foreground">Weight (kg)</Label>
            <Input
              type="number"
              step="0.1"
              placeholder="65"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className="h-8 text-xs font-mono font-bold"
            />
          </div>
        </div>

        {/* Compact Horizontal Grid Row 2: Derived Clinical Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-1 border-t border-border/50 text-xs">
          {/* BSA */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/60">
            <span className="text-[10px] text-muted-foreground">BSA (Mosteller):</span>
            <span className="font-mono font-bold text-foreground text-xs">
              {bsaValue !== null ? `${bsaValue} m²` : "—"}
            </span>
          </div>

          {/* BMI */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/60">
            <span className="text-[10px] text-muted-foreground">BMI:</span>
            <span className="font-mono font-bold text-foreground text-xs">
              {bmiResult ? `${bmiResult.bmi}` : "—"}
            </span>
          </div>

          {/* Category */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/60">
            <span className="text-[10px] text-muted-foreground">Category:</span>
            {bmiResult ? (
              <Badge variant="outline" className={`font-semibold text-[10px] py-0 ${bmiResult.colorClass}`}>
                {bmiResult.category}
              </Badge>
            ) : (
              <span className="text-[10px] text-muted-foreground">—</span>
            )}
          </div>

          {/* Blood Sugar BS */}
          <div className="col-span-2 flex items-center gap-1.5 p-1.5 rounded-lg bg-muted/20 border border-border/60">
            <span className="text-[10px] text-muted-foreground whitespace-nowrap pl-1">BS (mg%):</span>
            <select
              value={glucoseType}
              onChange={(e) => setGlucoseType(e.target.value as any)}
              className="h-7 rounded border border-border bg-background px-1.5 text-[10px]"
            >
              <option value="random">Rand</option>
              <option value="fasting">Fast</option>
              <option value="post_meal">PP</option>
            </select>
            <Input
              type="number"
              placeholder="110"
              value={glucose}
              onChange={(e) => setGlucose(e.target.value)}
              className="h-7 text-xs font-mono font-bold flex-1"
            />
          </div>

          {/* Creatinine & eGFR */}
          <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-muted/20 border border-border/60">
            <span className="text-[10px] text-muted-foreground whitespace-nowrap pl-1">Creat:</span>
            <Input
              type="number"
              step="0.1"
              placeholder="1.0"
              value={creatinine}
              onChange={(e) => setCreatinine(e.target.value)}
              className="h-7 w-16 text-xs font-mono"
            />
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">eGFR:</span>
            <span className="font-mono font-bold text-xs text-foreground">
              {egfrValue !== null ? egfrValue : "—"}
            </span>
          </div>
        </div>

        {/* Dynamic Hospital Custom Vital Metrics (filtered: non-standard parameters only) */}
        {hospitalCustomVitals.length > 0 && (
          <div className="pt-2 border-t border-border/50 space-y-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Additional Hospital Custom Vital Metrics:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {hospitalCustomVitals.map((cfg: any) => {
                const key = cfg.field_key || cfg.field_name
                const label = cfg.label || cfg.field_label || key
                return (
                  <div key={cfg.id || key} className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground font-semibold">
                      {label} {cfg.unit ? `(${cfg.unit})` : ""}
                    </Label>
                    <Input
                      type={cfg.input_type === "number" || cfg.field_type === "number" ? "number" : "text"}
                      placeholder={cfg.unit ? `Enter ${label} (${cfg.unit})` : `Enter ${label}`}
                      value={customVitals[key] || ""}
                      onChange={(e) =>
                        setCustomVitals((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Card>

      {/* ────────────────────────────────────────────────────────────────
          3. SECTION 1: SYMPTOMS / COMPLAINTS (Screenshot Layout)
         ──────────────────────────────────────────────────────────────── */}
      {enableSymptoms && (
        <Card className="p-4 rounded-2xl border shadow-xs bg-card space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-border/70">
          <span className="font-bold text-xs text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-teal-600" />
            Symptoms / Complaints
          </span>
          <span className="text-[11px] text-muted-foreground">
            Type or click symptoms from the catalog on the right to append
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Left: Complaints Textarea */}
          <div className="lg:col-span-7 space-y-1.5">
            <textarea
              rows={5}
              placeholder="e.g. BACK PAIN; CHEST PAIN; LEFT SIDE THIGH PAIN; HEAVINESS IN RIGHT LOWER LIMB; FEVER..."
              value={symptomsText}
              onChange={(e) => setSymptomsText(e.target.value)}
              className="w-full rounded-xl border border-input bg-background p-3 text-xs font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Separate multiple symptoms with semicolons ( ; )</span>
              {symptomsText && (
                <button
                  type="button"
                  onClick={() => setSymptomsText("")}
                  className="text-destructive hover:underline text-[10px]"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* Right: Searchable Quick Symptom Catalog */}
          <div className="lg:col-span-5 rounded-xl border border-border/80 bg-muted/20 p-2.5 flex flex-col h-[140px]">
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search quick symptoms..."
                value={symptomSearch}
                onChange={(e) => setSymptomSearch(e.target.value)}
                className="pl-8 h-7 text-xs bg-background"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {filteredCatalog.map((sym, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-1 px-2 rounded-lg bg-background border border-border/60 hover:border-teal-500/40 hover:bg-teal-500/5 text-[11px] transition-colors"
                >
                  <span className="font-medium text-foreground truncate">{sym}</span>
                  <button
                    type="button"
                    onClick={() => addSymptom(sym)}
                    className="h-5 w-5 rounded-md flex items-center justify-center text-teal-600 hover:bg-teal-500/20"
                    title={`Add ${sym}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
      )}

      {/* ────────────────────────────────────────────────────────────────
          4. SECTION 2: PAST MEDICAL HISTORY
         ──────────────────────────────────────────────────────────────── */}
      {enablePastMedical && (
        <Card className="p-4 rounded-2xl border shadow-xs bg-card space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-border/70">
          <span className="font-bold text-xs text-foreground flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Past Medical History
          </span>
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={() => setPastMedical([...pastMedical, { disease: "", duration: "", medication: "" }])}
            className="text-xs gap-1 border-primary/30 text-primary"
          >
            <Plus className="h-3.5 w-3.5" /> Add Disease
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-[10px] text-muted-foreground uppercase font-semibold">
              <tr>
                <th className="p-2">Disease</th>
                <th className="p-2">Duration</th>
                <th className="p-2">Medication / Treatment</th>
                <th className="p-2 text-right">Remove</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pastMedical.map((row, idx) => (
                <tr key={idx} className="hover:bg-muted/10">
                  <td className="p-2">
                    <Input
                      placeholder="e.g. TB [TUBERCULOSIS], Hypertension, Diabetes..."
                      value={row.disease}
                      onChange={(e) => {
                        const val = e.target.value
                        setPastMedical((prev) => prev.map((m, i) => (i === idx ? { ...m, disease: val } : m)))
                      }}
                      className="h-8 text-xs"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      placeholder="e.g. 2 YEAR(S), 6 Months..."
                      value={row.duration}
                      onChange={(e) => {
                        const val = e.target.value
                        setPastMedical((prev) => prev.map((m, i) => (i === idx ? { ...m, duration: val } : m)))
                      }}
                      className="h-8 text-xs font-mono"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      placeholder="e.g. GOVT MED, Telmisartan 40mg..."
                      value={row.medication}
                      onChange={(e) => {
                        const val = e.target.value
                        setPastMedical((prev) => prev.map((m, i) => (i === idx ? { ...m, medication: val } : m)))
                      }}
                      className="h-8 text-xs"
                    />
                  </td>
                  <td className="p-2 text-right">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => setPastMedical((prev) => prev.filter((_, i) => i !== idx))}
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      )}

      {/* ────────────────────────────────────────────────────────────────
          5. SECTION 3: PAST SURGICAL HISTORY
         ──────────────────────────────────────────────────────────────── */}
      {enablePastSurgical && (
        <Card className="p-4 rounded-2xl border shadow-xs bg-card space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-border/70">
          <span className="font-bold text-xs text-foreground flex items-center gap-2">
            <Activity className="h-4 w-4 text-teal-600" />
            Past Surgical History
          </span>
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={() =>
              setPastSurgical([...pastSurgical, { name: "", date: "", surgeon: "", hospital: "" }])
            }
            className="text-xs gap-1 border-teal-500/30 text-teal-700 dark:text-teal-400"
          >
            <Plus className="h-3.5 w-3.5" /> Add Surgery
          </Button>
        </div>

        {pastSurgical.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-1">
            No past surgical interventions recorded. Click "Add Surgery" if patient had prior operations.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-[10px] text-muted-foreground uppercase font-semibold">
                <tr>
                  <th className="p-2">Search / Surgery Name</th>
                  <th className="p-2">Date</th>
                  <th className="p-2">Surgeon Name</th>
                  <th className="p-2">Hospital</th>
                  <th className="p-2 text-right">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pastSurgical.map((row, idx) => (
                  <tr key={idx} className="hover:bg-muted/10">
                    <td className="p-2">
                      <Input
                        placeholder="e.g. ADENOIDECTOMY, Appendectomy, Cholecystectomy..."
                        value={row.name}
                        onChange={(e) => {
                          const val = e.target.value
                          setPastSurgical((prev) => prev.map((s, i) => (i === idx ? { ...s, name: val } : s)))
                        }}
                        className="h-8 text-xs font-medium"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="date"
                        value={row.date}
                        onChange={(e) => {
                          const val = e.target.value
                          setPastSurgical((prev) => prev.map((s, i) => (i === idx ? { ...s, date: val } : s)))
                        }}
                        className="h-8 text-xs font-mono"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        placeholder="e.g. DR ABC"
                        value={row.surgeon}
                        onChange={(e) => {
                          const val = e.target.value
                          setPastSurgical((prev) => prev.map((s, i) => (i === idx ? { ...s, surgeon: val } : s)))
                        }}
                        className="h-8 text-xs"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        placeholder="e.g. XYZ Hospital, City"
                        value={row.hospital}
                        onChange={(e) => {
                          const val = e.target.value
                          setPastSurgical((prev) => prev.map((s, i) => (i === idx ? { ...s, hospital: val } : s)))
                        }}
                        className="h-8 text-xs"
                      />
                    </td>
                    <td className="p-2 text-right">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => setPastSurgical((prev) => prev.filter((_, i) => i !== idx))}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      )}

      {/* ────────────────────────────────────────────────────────────────
          6. SECTION 4: ADDICTION DETAILS
         ──────────────────────────────────────────────────────────────── */}
      {enableAddictions && (
        <Card className="p-4 rounded-2xl border shadow-xs bg-card space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-border/70">
          <span className="font-bold text-xs text-foreground flex items-center gap-2">
            <Activity className="h-4 w-4 text-amber-600" />
            Addiction Details & Habits
          </span>
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={() =>
              setAddictions([
                ...addictions,
                { type: "TOBACCO", duration: "1 Year", units: "1", frequency: "DAILY", action: "ONGOING" },
              ])
            }
            className="text-xs gap-1 border-amber-500/30 text-amber-700 dark:text-amber-400"
          >
            <Plus className="h-3.5 w-3.5" /> Add Addiction
          </Button>
        </div>

        {addictions.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-1">
            No substance or addiction habits recorded. Click "Add Addiction" to log tobacco, alcohol, etc.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-[10px] text-muted-foreground uppercase font-semibold">
                <tr>
                  <th className="p-2">Type</th>
                  <th className="p-2">Duration</th>
                  <th className="p-2">Units</th>
                  <th className="p-2">Frequency</th>
                  <th className="p-2">Action / Status</th>
                  <th className="p-2 text-right">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {addictions.map((row, idx) => (
                  <tr key={idx} className="hover:bg-muted/10">
                    <td className="p-2">
                      <select
                        value={row.type}
                        onChange={(e) => {
                          const val = e.target.value
                          setAddictions((prev) => prev.map((a, i) => (i === idx ? { ...a, type: val } : a)))
                        }}
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs font-semibold"
                      >
                        <option value="TOBACCO">TOBACCO</option>
                        <option value="SMOKING">SMOKING / CIGARETTE</option>
                        <option value="ALCOHOL">ALCOHOL</option>
                        <option value="BETEL NUT">BETEL NUT / GUTKHA</option>
                        <option value="SUBSTANCE">OTHER SUBSTANCE</option>
                      </select>
                    </td>
                    <td className="p-2">
                      <Input
                        placeholder="e.g. 2 YEAR(S)"
                        value={row.duration}
                        onChange={(e) => {
                          const val = e.target.value
                          setAddictions((prev) => prev.map((a, i) => (i === idx ? { ...a, duration: val } : a)))
                        }}
                        className="h-8 text-xs font-mono"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        placeholder="e.g. 3"
                        value={row.units}
                        onChange={(e) => {
                          const val = e.target.value
                          setAddictions((prev) => prev.map((a, i) => (i === idx ? { ...a, units: val } : a)))
                        }}
                        className="h-8 text-xs font-mono"
                      />
                    </td>
                    <td className="p-2">
                      <select
                        value={row.frequency}
                        onChange={(e) => {
                          const val = e.target.value
                          setAddictions((prev) => prev.map((a, i) => (i === idx ? { ...a, frequency: val } : a)))
                        }}
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                      >
                        <option value="DAILY">DAILY</option>
                        <option value="OCCASIONAL">OCCASIONAL</option>
                        <option value="WEEKLY">WEEKLY</option>
                        <option value="SOCIAL">SOCIAL</option>
                      </select>
                    </td>
                    <td className="p-2">
                      <select
                        value={row.action}
                        onChange={(e) => {
                          const val = e.target.value
                          setAddictions((prev) => prev.map((a, i) => (i === idx ? { ...a, action: val } : a)))
                        }}
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium"
                      >
                        <option value="ONGOING">ONGOING</option>
                        <option value="QUIT">QUIT / STOPPED</option>
                        <option value="REDUCED">REDUCED</option>
                      </select>
                    </td>
                    <td className="p-2 text-right">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => setAddictions((prev) => prev.filter((_, i) => i !== idx))}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      )}

      {/* ────────────────────────────────────────────────────────────────
          7. SECTION 5: PERSONAL HISTORY (Diet, Sleep, Bowel, Bladder)
         ──────────────────────────────────────────────────────────────── */}
      {enablePersonal && (
        <Card className="p-4 rounded-2xl border shadow-xs bg-card space-y-3">
        <div className="pb-2 border-b border-border/70">
          <span className="font-bold text-xs text-foreground flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Personal History & Physiological Functions
          </span>
        </div>

        {/* 5 Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
          <div>
            <Label className="text-[10px] text-muted-foreground font-semibold">Diet</Label>
            <select
              value={personalHistory.diet}
              onChange={(e) => setPersonalHistory({ ...personalHistory, diet: e.target.value })}
              className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
            >
              <option value="Non-Vegetarian">Non-Vegetarian</option>
              <option value="Vegetarian">Vegetarian</option>
              <option value="Eggetarian">Eggetarian</option>
              <option value="Vegan">Vegan</option>
            </select>
          </div>

          <div>
            <Label className="text-[10px] text-muted-foreground font-semibold">Appetite</Label>
            <select
              value={personalHistory.appetite}
              onChange={(e) => setPersonalHistory({ ...personalHistory, appetite: e.target.value })}
              className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
            >
              <option value="Normal">Normal</option>
              <option value="Reduced">Reduced</option>
              <option value="Increased">Increased</option>
            </select>
          </div>

          <div>
            <Label className="text-[10px] text-muted-foreground font-semibold">Sleep</Label>
            <select
              value={personalHistory.sleep}
              onChange={(e) => setPersonalHistory({ ...personalHistory, sleep: e.target.value })}
              className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
            >
              <option value="Normal">Normal</option>
              <option value="Reduced">Reduced</option>
              <option value="Disturbed">Disturbed</option>
              <option value="Insomnia">Insomnia</option>
            </select>
          </div>

          <div>
            <Label className="text-[10px] text-muted-foreground font-semibold">Bladder</Label>
            <select
              value={personalHistory.bladder}
              onChange={(e) => setPersonalHistory({ ...personalHistory, bladder: e.target.value })}
              className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
            >
              <option value="Normal">Normal</option>
              <option value="Inconsistent">Inconsistent</option>
              <option value="Frequent">Frequent</option>
              <option value="Nocturia">Nocturia</option>
            </select>
          </div>

          <div>
            <Label className="text-[10px] text-muted-foreground font-semibold">Bowel</Label>
            <select
              value={personalHistory.bowel}
              onChange={(e) => setPersonalHistory({ ...personalHistory, bowel: e.target.value })}
              className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
            >
              <option value="Normal">Normal</option>
              <option value="Loose-Motions">Loose-Motions</option>
              <option value="Constipated">Constipated</option>
              <option value="Irregular">Irregular</option>
            </select>
          </div>
        </div>

        {/* Current Treatment & Comments */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/50">
          <div>
            <Label className="text-[10px] text-muted-foreground font-semibold">Current Ongoing Treatment</Label>
            <textarea
              rows={2}
              placeholder="e.g. Taking Ayurvedic kadha, Homeopathic pills, or self-medication..."
              value={personalHistory.current_treatment || ""}
              onChange={(e) => setPersonalHistory({ ...personalHistory, current_treatment: e.target.value })}
              className="mt-1 w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:outline-none"
            />
          </div>

          <div>
            <Label className="text-[10px] text-muted-foreground font-semibold">Triage Nurse Comments & Observations</Label>
            <textarea
              rows={2}
              placeholder="e.g. Patient appeared dehydrated, came with attendant, walking with support..."
              value={personalHistory.comments || ""}
              onChange={(e) => setPersonalHistory({ ...personalHistory, comments: e.target.value })}
              className="mt-1 w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:outline-none"
            />
          </div>
        </div>
      </Card>
      )}

      {/* ────────────────────────────────────────────────────────────────
          DYNAMIC CUSTOM CLINICAL INTAKE SECTIONS (FROM SETTINGS)
         ──────────────────────────────────────────────────────────────── */}
      {customSections.map((sec: any) => (
        <Card key={sec.id} className="p-4 rounded-2xl border shadow-xs bg-card space-y-3">
          <div className="pb-2 border-b border-border/70 flex items-center justify-between">
            <span className="font-bold text-xs text-foreground flex items-center gap-2">
              <Sliders className="h-4 w-4 text-teal-600" />
              {sec.title}
            </span>
            {sec.description && (
              <span className="text-[10px] text-muted-foreground">{sec.description}</span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            {sec.fields.map((field: any) => {
              const val = customSectionsData[sec.id]?.[field.id] || ""
              return (
                <div key={field.id} className="space-y-1">
                  <Label className="text-[10px] font-semibold text-muted-foreground">
                    {field.label}
                  </Label>
                  {field.type === "textarea" ? (
                    <textarea
                      rows={2}
                      value={val}
                      onChange={(e) =>
                        setCustomSectionsData((prev) => ({
                          ...prev,
                          [sec.id]: { ...(prev[sec.id] || {}), [field.id]: e.target.value },
                        }))
                      }
                      placeholder={field.placeholder || `Enter ${field.label}...`}
                      className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:outline-none"
                    />
                  ) : field.type === "select" ? (
                    <select
                      value={val}
                      onChange={(e) =>
                        setCustomSectionsData((prev) => ({
                          ...prev,
                          [sec.id]: { ...(prev[sec.id] || {}), [field.id]: e.target.value },
                        }))
                      }
                      className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                    >
                      <option value="">-- Select {field.label} --</option>
                      {(field.options || "")
                        .split(",")
                        .map((opt: string) => opt.trim())
                        .filter(Boolean)
                        .map((opt: string) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                    </select>
                  ) : (
                    <Input
                      type={field.type === "number" ? "number" : "text"}
                      value={val}
                      onChange={(e) =>
                        setCustomSectionsData((prev) => ({
                          ...prev,
                          [sec.id]: { ...(prev[sec.id] || {}), [field.id]: e.target.value },
                        }))
                      }
                      placeholder={field.placeholder || `Enter ${field.label}...`}
                      className="h-8 text-xs font-mono"
                    />
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      ))}

      {/* ────────────────────────────────────────────────────────────────
          8. STICKY ACTION FOOTER (PRE-CONSULTATION COMPLETE)
         ──────────────────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border px-6 py-3.5 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onBack}
            className="text-xs rounded-xl"
          >
            Cancel & Return
          </Button>

          <span className="text-[11px] text-muted-foreground hidden md:inline">
            Triage notes and vitals will be directly available on Doctor Consultation Desk.
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            disabled={isSubmitting}
            onClick={handleSubmitTriage}
            className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5 text-xs font-bold rounded-xl shadow-md px-5"
          >
            {isSubmitting ? (
              <>
                <RotateCcw className="h-4 w-4 animate-spin" /> Saving Triage...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" /> Save Pre-Consultation Triage & Forward to Doctor
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Audit Log Modal */}
      {latestVital && (
        <VitalAuditModal
          open={auditModalOpen}
          onClose={() => setAuditModalOpen(false)}
          vital={latestVital}
          patientName={visit.patient_name || patient.name}
        />
      )}
    </div>
  )
}
