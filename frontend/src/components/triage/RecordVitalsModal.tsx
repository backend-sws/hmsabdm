import React, { useState, useEffect, useMemo } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Activity,
  Heart,
  Thermometer,
  Wind,
  Weight,
  Ruler,
  Droplet,
  Smile,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  User,
} from "lucide-react"

import { FormContainer } from "@/components/formContainer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { opdService } from "@/services/opdService"
import { queryKeys } from "@/constants/queryKeys"
import type { OpdVisit } from "@/types/opd"

interface RecordVitalsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  visit: OpdVisit | null
  onSuccess?: () => void
}

export const RecordVitalsModal: React.FC<RecordVitalsModalProps> = ({
  open,
  onOpenChange,
  visit,
  onSuccess,
}) => {
  const queryClient = useQueryClient()

  // Dynamic Custom Vitals configured in Hospital Settings
  const { data: vitalConfigs = [] } = useQuery({
    queryKey: queryKeys.opd.vitalConfigs,
    queryFn: opdService.getVitalConfigs,
    staleTime: 5 * 60_000,
  })

  // Core Vitals State
  const [systolic, setSystolic] = useState<string>("")
  const [diastolic, setDiastolic] = useState<string>("")
  const [pulse, setPulse] = useState<string>("")
  const [temp, setTemp] = useState<string>("")
  const [tempUnit, setTempUnit] = useState<"F" | "C">("F")
  const [spo2, setSpo2] = useState<string>("")
  const [respRate, setRespRate] = useState<string>("")
  const [height, setHeight] = useState<string>("")
  const [weight, setWeight] = useState<string>("")
  const [bloodSugar, setBloodSugar] = useState<string>("")
  const [glucoseType, setGlucoseType] = useState<"random" | "fasting" | "post_meal">("random")
  const [painScore, setPainScore] = useState<number>(0)
  const [notes, setNotes] = useState<string>("")
  const [customVitals, setCustomVitals] = useState<Record<string, any>>({})

  // Pre-fill existing vitals if available
  useEffect(() => {
    if (visit?.latest_vital || visit?.latestVital) {
      const v = visit.latest_vital || visit.latestVital
      if (v.blood_pressure_sys) setSystolic(String(v.blood_pressure_sys))
      if (v.blood_pressure_dia) setDiastolic(String(v.blood_pressure_dia))
      if (v.pulse_rate) setPulse(String(v.pulse_rate))
      if (v.temperature) setTemp(String(v.temperature))
      if (v.temperature_unit) setTempUnit(v.temperature_unit)
      if (v.oxygen_saturation) setSpo2(String(v.oxygen_saturation))
      if (v.respiratory_rate) setRespRate(String(v.respiratory_rate))
      if (v.height) setHeight(String(v.height))
      if (v.weight) setWeight(String(v.weight))
      if (v.blood_glucose) setBloodSugar(String(v.blood_glucose))
      if (v.glucose_type) setGlucoseType(v.glucose_type)
      if (v.custom_vitals) setCustomVitals(v.custom_vitals)
    } else {
      // Reset
      setSystolic("")
      setDiastolic("")
      setPulse("")
      setTemp("")
      setTempUnit("F")
      setSpo2("")
      setRespRate("")
      setHeight("")
      setWeight("")
      setBloodSugar("")
      setGlucoseType("random")
      setPainScore(0)
      setNotes("")
      setCustomVitals({})
    }
  }, [visit, open])

  // Real-Time BMI Calculation & Categorization
  const bmiData = useMemo(() => {
    const h = parseFloat(height)
    const w = parseFloat(weight)
    if (!h || !w || h <= 0 || w <= 0) return null

    const hInMeters = h / 100
    const calculatedBmi = parseFloat((w / (hInMeters * hInMeters)).toFixed(1))

    let category = "Normal"
    let color = "text-emerald-600 bg-emerald-500/10 border-emerald-500/30"

    if (calculatedBmi < 18.5) {
      category = "Underweight"
      color = "text-amber-600 bg-amber-500/10 border-amber-500/30"
    } else if (calculatedBmi >= 25 && calculatedBmi < 30) {
      category = "Overweight"
      color = "text-amber-600 bg-amber-500/10 border-amber-500/30"
    } else if (calculatedBmi >= 30) {
      category = "Obese"
      color = "text-rose-600 bg-rose-500/10 border-rose-500/30"
    }

    return { bmi: calculatedBmi, category, color }
  }, [height, weight])

  // Clinical Alert Flags
  const alerts = useMemo(() => {
    const list: string[] = []
    const sys = parseInt(systolic, 10)
    const dia = parseInt(diastolic, 10)
    const p = parseInt(pulse, 10)
    const t = parseFloat(temp)
    const sp = parseFloat(spo2)
    const sugar = parseFloat(bloodSugar)

    if (sys >= 140 || dia >= 90) list.push("Hypertension Alert (High Blood Pressure)")
    else if (sys && dia && (sys < 90 || dia < 60)) list.push("Hypotension Alert (Low Blood Pressure)")

    if (p > 100) list.push("Tachycardia Alert (High Heart Rate > 100 bpm)")
    else if (p > 0 && p < 50) list.push("Bradycardia Alert (Low Heart Rate < 50 bpm)")

    if (tempUnit === "F" && t >= 100.4) list.push("High Fever Alert (Temp ≥ 100.4°F)")
    else if (tempUnit === "C" && t >= 38.0) list.push("High Fever Alert (Temp ≥ 38.0°C)")

    if (sp > 0 && sp < 95) list.push("Hypoxia Warning (SpO2 < 95%)")

    if (sugar >= 200) list.push("Hyperglycemia Warning (High Blood Sugar ≥ 200 mg/dL)")
    else if (sugar > 0 && sugar < 70) list.push("Hypoglycemia Warning (Low Blood Sugar < 70 mg/dL)")

    return list
  }, [systolic, diastolic, pulse, temp, tempUnit, spo2, bloodSugar])

  // Save Vitals Mutation
  const saveVitalsMutation = useMutation({
    mutationFn: async () => {
      if (!visit?.patient_id) throw new Error("Patient ID is missing.")

      const payload: any = {
        patient_id: visit.patient_id,
        opd_visit_id: visit.id || visit.visit_id,
        encounter_type: "opd",
        recorded_at: new Date().toISOString(),
      }

      if (systolic) payload.blood_pressure_sys = parseInt(systolic, 10)
      if (diastolic) payload.blood_pressure_dia = parseInt(diastolic, 10)
      if (pulse) payload.pulse_rate = parseInt(pulse, 10)
      if (temp) {
        payload.temperature = parseFloat(temp)
        payload.temperature_unit = tempUnit
      }
      if (spo2) payload.oxygen_saturation = parseFloat(spo2)
      if (respRate) payload.respiratory_rate = parseInt(respRate, 10)
      if (height) payload.height = parseFloat(height)
      if (weight) payload.weight = parseFloat(weight)
      if (bloodSugar) {
        payload.blood_glucose = parseFloat(bloodSugar)
        payload.glucose_type = glucoseType
      }
      if (notes) payload.notes = notes

      // Attach custom vitals & pain score
      const finalCustom: Record<string, any> = { ...customVitals }
      if (painScore > 0) finalCustom.pain_score = painScore
      if (Object.keys(finalCustom).length > 0) {
        payload.custom_vitals = finalCustom
      }

      return opdService.recordVitals(payload)
    },
    onSuccess: () => {
      toast.success("Patient vitals recorded successfully!", {
        description: `Patient is now marked as Vitals Recorded and ready for doctor consultation.`,
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.opd.queue })
      queryClient.invalidateQueries({ queryKey: queryKeys.opd.visitVitals(visit?.id || 0) })
      onOpenChange(false)
      onSuccess?.()
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to record vitals")
    },
  })

  return (
    <FormContainer
      open={open}
      onOpenChange={onOpenChange}
      title="Nurse Triage & Vitals Station"
      description="Record baseline physiological measurements and clinical triage flags before doctor consultation."
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Activity className="h-4 w-4 text-primary" />
            Auto-calculates BMI & flags abnormal thresholds
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => saveVitalsMutation.mutate()}
              disabled={saveVitalsMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              {saveVitalsMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Save Vitals & Mark Ready
                </>
              )}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5 text-xs">
        {/* Patient Header Banner */}
        {visit && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-primary/20 bg-primary/5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <User className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground text-sm">
                    {visit.patient_name || visit.patient?.name || "Patient"}
                  </span>
                  <Badge variant="outline" className="font-mono text-primary border-primary/30 text-[10px]">
                    Token #{visit.token_no || visit.queue_token || visit.opd_number}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {visit.uhid || visit.patient?.uhid}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {visit.age || visit.patient?.age ? `${visit.age || visit.patient?.age} yrs` : "—"} /{" "}
                  {visit.gender || visit.patient?.gender || "—"} • Department:{" "}
                  <span className="font-medium text-foreground">
                    {visit.department_name || visit.department?.name || "General"}
                  </span>{" "}
                  • Doctor:{" "}
                  <span className="font-medium text-foreground">
                    {visit.doctor_name || visit.doctor?.name || "Assigned Doctor"}
                  </span>
                </p>
              </div>
            </div>

            {visit.chief_complaint && (
              <div className="text-right sm:max-w-xs">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-medium">
                  Chief Complaint
                </span>
                <span className="text-xs text-foreground font-medium line-clamp-2">
                  {visit.chief_complaint}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Clinical Alert Warning Banner (If Any Abnormal Parameter) */}
        {alerts.length > 0 && (
          <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 space-y-1">
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-semibold">
              <AlertTriangle className="h-4 w-4" />
              <span>Abnormal Clinical Value Alerts:</span>
            </div>
            <ul className="list-disc list-inside text-[11px] text-rose-600 dark:text-rose-300 space-y-0.5 pl-1">
              {alerts.map((alert, i) => (
                <li key={i}>{alert}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Core Vitals Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {/* 1. Blood Pressure */}
          <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
            <Label className="flex items-center gap-1.5 font-semibold text-foreground">
              <Activity className="h-4 w-4 text-rose-500" /> Blood Pressure (mmHg)
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-muted-foreground block mb-0.5">Systolic (Sys)</span>
                <Input
                  type="number"
                  placeholder="120"
                  value={systolic}
                  onChange={(e) => setSystolic(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block mb-0.5">Diastolic (Dia)</span>
                <Input
                  type="number"
                  placeholder="80"
                  value={diastolic}
                  onChange={(e) => setDiastolic(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground block">Normal: 90-120 / 60-80</span>
          </div>

          {/* 2. Pulse / Heart Rate */}
          <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
            <Label className="flex items-center gap-1.5 font-semibold text-foreground">
              <Heart className="h-4 w-4 text-rose-500" /> Heart Rate / Pulse (bpm)
            </Label>
            <Input
              type="number"
              placeholder="72"
              value={pulse}
              onChange={(e) => setPulse(e.target.value)}
              className="font-mono text-xs mt-1"
            />
            <span className="text-[10px] text-muted-foreground block">Normal resting: 60 - 100 bpm</span>
          </div>

          {/* 3. Temperature */}
          <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5 font-semibold text-foreground">
                <Thermometer className="h-4 w-4 text-amber-500" /> Temperature
              </Label>
              <div className="inline-flex rounded-md border border-border p-0.5 bg-muted/30">
                <button
                  type="button"
                  onClick={() => setTempUnit("F")}
                  className={`px-2 py-0.5 text-[10px] rounded font-medium ${
                    tempUnit === "F" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  °F
                </button>
                <button
                  type="button"
                  onClick={() => setTempUnit("C")}
                  className={`px-2 py-0.5 text-[10px] rounded font-medium ${
                    tempUnit === "C" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  °C
                </button>
              </div>
            </div>
            <Input
              type="number"
              step="0.1"
              placeholder={tempUnit === "F" ? "98.6" : "37.0"}
              value={temp}
              onChange={(e) => setTemp(e.target.value)}
              className="font-mono text-xs mt-1"
            />
            <span className="text-[10px] text-muted-foreground block">
              Normal: 97.8°F - 99.1°F (36.5°C - 37.3°C)
            </span>
          </div>

          {/* 4. Oxygen Saturation (SpO2) */}
          <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
            <Label className="flex items-center gap-1.5 font-semibold text-foreground">
              <Droplet className="h-4 w-4 text-cyan-500" /> SpO2 Oxygen Saturation (%)
            </Label>
            <Input
              type="number"
              step="0.1"
              placeholder="98"
              value={spo2}
              onChange={(e) => setSpo2(e.target.value)}
              className="font-mono text-xs mt-1"
            />
            <span className="text-[10px] text-muted-foreground block">Normal: 95% - 100%</span>
          </div>

          {/* 5. Respiratory Rate */}
          <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
            <Label className="flex items-center gap-1.5 font-semibold text-foreground">
              <Wind className="h-4 w-4 text-teal-500" /> Respiratory Rate (breaths/min)
            </Label>
            <Input
              type="number"
              placeholder="16"
              value={respRate}
              onChange={(e) => setRespRate(e.target.value)}
              className="font-mono text-xs mt-1"
            />
            <span className="text-[10px] text-muted-foreground block">Normal adult: 12 - 20 breaths/min</span>
          </div>

          {/* 6. Blood Glucose */}
          <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5 font-semibold text-foreground">
                <Droplet className="h-4 w-4 text-rose-400" /> Blood Sugar (mg/dL)
              </Label>
              <select
                value={glucoseType}
                onChange={(e) => setGlucoseType(e.target.value as any)}
                className="text-[10px] rounded border border-border bg-background px-1.5 py-0.5"
              >
                <option value="random">Random (RBS)</option>
                <option value="fasting">Fasting (FBS)</option>
                <option value="post_meal">Post-Meal (PPBS)</option>
              </select>
            </div>
            <Input
              type="number"
              placeholder="110"
              value={bloodSugar}
              onChange={(e) => setBloodSugar(e.target.value)}
              className="font-mono text-xs mt-1"
            />
            <span className="text-[10px] text-muted-foreground block">Fasting: 70-100 | Random: &lt;140</span>
          </div>
        </div>

        {/* Height, Weight & Real-Time BMI Calculation Panel */}
        <div className="p-4 rounded-xl border border-border bg-card space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground flex items-center gap-2">
              <Weight className="h-4 w-4 text-primary" /> Body Measurements & BMI Engine
            </span>
            {bmiData && (
              <Badge variant="outline" className={`font-mono text-xs border ${bmiData.color}`}>
                BMI: {bmiData.bmi} ({bmiData.category})
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-[11px] flex items-center gap-1">
                <Ruler className="h-3.5 w-3.5 text-muted-foreground" /> Height (cm)
              </Label>
              <Input
                type="number"
                step="0.5"
                placeholder="170"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="font-mono text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-[11px] flex items-center gap-1">
                <Weight className="h-3.5 w-3.5 text-muted-foreground" /> Weight (kg)
              </Label>
              <Input
                type="number"
                step="0.5"
                placeholder="68.5"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="font-mono text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Calculated Body Mass Index</Label>
              <div className="mt-1 h-9 flex items-center px-3 rounded-md border border-input bg-muted/30 font-mono text-xs font-semibold text-foreground">
                {bmiData ? `${bmiData.bmi} kg/m²` : "Enter Height & Weight"}
              </div>
            </div>
          </div>
        </div>

        {/* Pain Scale (0-10 Wong-Baker Grimace Rating) */}
        <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-1.5 font-semibold text-foreground">
              <Smile className="h-4 w-4 text-amber-500" /> Patient Pain Rating Score (0 to 10)
            </Label>
            <Badge
              variant="outline"
              className={`font-mono text-xs ${
                painScore === 0
                  ? "text-emerald-600 border-emerald-500/30"
                  : painScore <= 3
                  ? "text-teal-600 border-teal-500/30"
                  : painScore <= 6
                  ? "text-amber-600 border-amber-500/30"
                  : "text-rose-600 border-rose-500/30"
              }`}
            >
              Score: {painScore}/10 —{" "}
              {painScore === 0
                ? "No Pain"
                : painScore <= 3
                ? "Mild Pain"
                : painScore <= 6
                ? "Moderate Pain"
                : painScore <= 8
                ? "Severe Pain"
                : "Worst Possible Pain"}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5 pt-1">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
              <button
                key={score}
                type="button"
                onClick={() => setPainScore(score)}
                className={`flex-1 py-1.5 rounded text-xs font-bold transition-all border ${
                  painScore === score
                    ? "bg-primary text-primary-foreground border-primary scale-105 shadow-xs"
                    : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                {score}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Hospital Custom Vitals (If configured in settings) */}
        {vitalConfigs.length > 0 && (
          <div className="p-3.5 rounded-xl border border-border bg-card space-y-3">
            <span className="font-semibold text-foreground block">
              Additional Hospital Custom Vitals
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {vitalConfigs.map((cfg) => (
                <div key={cfg.id}>
                  <Label className="text-[11px]">
                    {cfg.label} {cfg.unit ? `(${cfg.unit})` : ""}
                  </Label>
                  {cfg.input_type === "select" && cfg.options ? (
                    <select
                      value={customVitals[cfg.key] || ""}
                      onChange={(e) =>
                        setCustomVitals({ ...customVitals, [cfg.key]: e.target.value })
                      }
                      className="mt-1 flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs"
                    >
                      <option value="">Select option</option>
                      {cfg.options.map((opt, i) => (
                        <option key={i} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      type={cfg.input_type === "number" ? "number" : "text"}
                      value={customVitals[cfg.key] || ""}
                      onChange={(e) =>
                        setCustomVitals({ ...customVitals, [cfg.key]: e.target.value })
                      }
                      className="mt-1 text-xs"
                      placeholder={`Enter ${cfg.label}`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Nurse Clinical Notes */}
        <div>
          <Label className="font-semibold text-foreground">Nurse Clinical Remarks / Triage Notes</Label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Patient feeling dizzy, reported fasting since morning, allergic to penicillin..."
            className="mt-1 text-xs"
          />
        </div>
      </div>
    </FormContainer>
  )
}
