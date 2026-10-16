import React, { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  X,
  HeartPulse,
  Thermometer,
  Activity,
  Wind,
  Droplet,
  Clock,
  User,
  Bed,
  Building2,
  CheckCircle2,
  Smile,
  Meh,
  Frown,
  Loader2,
  ShieldAlert,
  FileText,
  Sliders,
  PlusCircle,
  Trash2,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ipdService } from "@/services/ipdService"
import { settingsService } from "@/services/settingsService"
import { queryKeys } from "@/constants/queryKeys"
import {
  calculateMews,
  getTemperatureStatus,
  getBloodPressureStatus,
  getPulseStatus,
  getSpo2Status,
  getGlucoseStatus,
} from "@/utils/mewsCalculator"

export interface RecordIpdVitalModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  admissionId: number
  patientId: number | string
  patientName: string
  uhid: string
  wardName?: string
  bedNumber?: string
}

export const RecordIpdVitalModal: React.FC<RecordIpdVitalModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  admissionId,
  patientId,
  patientName,
  uhid,
  wardName,
  bedNumber,
}) => {
  const queryClient = useQueryClient()

  // ─── Dynamic Hospital Vitals Configuration from Settings ────────────
  const { data: vitalConfigs = [] } = useQuery({
    queryKey: queryKeys.settings.vitals,
    queryFn: () => settingsService.getVitalConfigs(),
    staleTime: 60_000,
  })

  const CORE_KEYS = useMemo(
    () => [
      "blood_pressure",
      "blood_pressure_sys",
      "blood_pressure_dia",
      "pulse_rate",
      "temperature",
      "oxygen_saturation",
      "respiratory_rate",
      "weight",
      "height",
      "blood_glucose",
      "pain_score",
    ],
    []
  )

  // Filter custom metrics that are enabled in Hospital Settings
  const hospitalCustomConfigs = useMemo(() => {
    return vitalConfigs.filter(
      (c) => !CORE_KEYS.includes(c.field_key) && c.is_active !== false
    )
  }, [vitalConfigs, CORE_KEYS])

  // Form State
  const nowStr = useMemo(() => {
    const d = new Date()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 16)
  }, [isOpen])

  const [recordedAt, setRecordedAt] = useState<string>(nowStr)
  const [temperature, setTemperature] = useState<string>("98.6")
  const [temperatureUnit, setTemperatureUnit] = useState<"F" | "C">("F")
  const [bpSys, setBpSys] = useState<string>("120")
  const [bpDia, setBpDia] = useState<string>("80")
  const [pulseRate, setPulseRate] = useState<string>("76")
  const [respiratoryRate, setRespiratoryRate] = useState<string>("16")
  const [oxygenSaturation, setOxygenSaturation] = useState<string>("98")
  const [oxygenSupplement, setOxygenSupplement] = useState<string>("Room Air")
  const [o2FlowRate, setO2FlowRate] = useState<string>("")
  const [bloodGlucose, setBloodGlucose] = useState<string>("")
  const [glucoseType, setGlucoseType] = useState<"random" | "fasting" | "post_meal">("random")
  const [avpu, setAvpu] = useState<"Alert" | "Voice" | "Pain" | "Unresponsive">("Alert")
  const [painScore, setPainScore] = useState<number>(0)
  const [recordedByName, setRecordedByName] = useState<string>("Duty Nurse")
  const [clinicalRemarks, setClinicalRemarks] = useState<string>("")

  // Values for Hospital Settings custom fields: { [field_key]: value }
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({})

  // Patient-Specific / On-the-fly Bedside Ad-Hoc Metrics
  const [patientSpecificMetrics, setPatientSpecificMetrics] = useState<
    Array<{ id: string; name: string; value: string; unit: string }>
  >([])

  const addPatientSpecificMetric = () => {
    setPatientSpecificMetrics((prev) => [
      ...prev,
      { id: Date.now().toString(), name: "", value: "", unit: "" },
    ])
  }

  const updatePatientSpecificMetric = (
    id: string,
    field: "name" | "value" | "unit",
    val: string
  ) => {
    setPatientSpecificMetrics((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: val } : m))
    )
  }

  const removePatientSpecificMetric = (id: string) => {
    setPatientSpecificMetrics((prev) => prev.filter((m) => m.id !== id))
  }

  // Quick Time Shift Presets
  const setPresetTime = (hour: number, minute: number = 0) => {
    const d = new Date()
    d.setHours(hour, minute, 0, 0)
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    setRecordedAt(d.toISOString().slice(0, 16))
  }

  // Calculate live Mean Arterial Pressure (MAP)
  const mapValue = useMemo(() => {
    const s = Number(bpSys)
    const d = Number(bpDia)
    if (s && d && s > d) {
      return Math.round(d + (s - d) / 3)
    }
    return null
  }, [bpSys, bpDia])

  // Calculate Live MEWS Score
  const mews = useMemo(() => {
    return calculateMews({
      respiratory_rate: respiratoryRate ? Number(respiratoryRate) : null,
      pulse_rate: pulseRate ? Number(pulseRate) : null,
      blood_pressure_sys: bpSys ? Number(bpSys) : null,
      temperature: temperature ? Number(temperature) : null,
      temperature_unit: temperatureUnit,
      avpu,
    })
  }, [respiratoryRate, pulseRate, bpSys, temperature, temperatureUnit, avpu])

  // Threshold Alerts
  const tempStatus = useMemo(() => getTemperatureStatus(Number(temperature), temperatureUnit), [temperature, temperatureUnit])
  const bpStatus = useMemo(() => getBloodPressureStatus(Number(bpSys), Number(bpDia)), [bpSys, bpDia])
  const pulseStatus = useMemo(() => getPulseStatus(Number(pulseRate)), [pulseRate])
  const spo2Status = useMemo(() => getSpo2Status(Number(oxygenSaturation)), [oxygenSaturation])
  const glucoseStatus = useMemo(() => getGlucoseStatus(Number(bloodGlucose), glucoseType), [bloodGlucose, glucoseType])

  // Mutation
  const recordVitalMutation = useMutation({
    mutationFn: () => {
      // Assemble unified custom vitals payload
      const customPayload: Record<string, any> = {
        avpu,
        oxygen_supplement: oxygenSupplement,
        o2_flow_rate: o2FlowRate ? Number(o2FlowRate) : undefined,
        pain_score: painScore,
        mews_score: mews.score,
        mews_risk: mews.risk,
        recorded_by_name: recordedByName.trim() || "Duty Nurse",
        remarks: clinicalRemarks.trim() || undefined,
      }

      // Merge Hospital Settings custom fields
      Object.entries(customFieldValues).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") {
          customPayload[k] = v
        }
      })

      // Merge Patient-specific Bedside one-off metrics
      patientSpecificMetrics.forEach((m) => {
        if (m.name.trim() && m.value.trim()) {
          const cleanKey = m.name.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_")
          customPayload[cleanKey] = m.unit?.trim()
            ? `${m.value.trim()} ${m.unit.trim()}`
            : m.value.trim()
        }
      })

      return ipdService.recordIpdVital({
        patient_id: Number(patientId),
        ipd_admission_id: admissionId,
        encounter_type: "ipd",
        recorded_at: recordedAt ? new Date(recordedAt).toISOString() : new Date().toISOString(),
        temperature: temperature ? Number(temperature) : undefined,
        temperature_unit: temperatureUnit,
        blood_pressure_sys: bpSys ? Number(bpSys) : undefined,
        blood_pressure_dia: bpDia ? Number(bpDia) : undefined,
        pulse_rate: pulseRate ? Number(pulseRate) : undefined,
        respiratory_rate: respiratoryRate ? Number(respiratoryRate) : undefined,
        oxygen_saturation: oxygenSaturation ? Number(oxygenSaturation) : undefined,
        blood_glucose: bloodGlucose ? Number(bloodGlucose) : undefined,
        glucose_type: bloodGlucose ? glucoseType : undefined,
        custom_vitals: customPayload,
      })
    },
    onSuccess: () => {
      toast.success("Bedside vitals logged successfully into Inpatient Flowsheet!")
      queryClient.invalidateQueries({ queryKey: ["ipd", "chart", admissionId] })
      queryClient.invalidateQueries({ queryKey: ["ipd", "vitals", admissionId] })
      onSuccess?.()
      onClose()
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to record bedside vitals")
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    recordVitalMutation.mutate()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl max-h-[92vh] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400">
              <HeartPulse className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Record Bedside Vitals (TPR Chart)
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                  Time-to-Time Flowsheet
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Log hourly temperature, pulse, BP, respiration, SpO2 & MEWS early warning score
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Patient Location Bar */}
        <div className="px-5 py-3 bg-rose-50/40 dark:bg-rose-950/20 border-b border-rose-100 dark:border-rose-900/30 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
              <User className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>{patientName}</span>
              <span className="text-slate-400 font-mono">({uhid})</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>{wardName || "Ward"}</span>
            </div>
            <div className="flex items-center gap-1.5 font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800">
              <Bed className="w-3.5 h-3.5" />
              <span>Bed #{bedNumber || "—"}</span>
            </div>
          </div>
          <div className="text-slate-500 dark:text-slate-400 text-[11px]">
            Admission #{admissionId}
          </div>
        </div>

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* 1. Date & Exact Time of Measurement */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                Measurement Date & Time (Bedside Reading Time) *
              </label>
              {/* Quick Shift Shortcut Buttons */}
              <div className="flex items-center gap-1 overflow-x-auto text-[10px]">
                <button
                  type="button"
                  onClick={() => setRecordedAt(nowStr)}
                  className="px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-blue-50"
                >
                  Now
                </button>
                <button
                  type="button"
                  onClick={() => setPresetTime(6, 0)}
                  className="px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-blue-50"
                >
                  06:00 AM
                </button>
                <button
                  type="button"
                  onClick={() => setPresetTime(10, 0)}
                  className="px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-blue-50"
                >
                  10:00 AM
                </button>
                <button
                  type="button"
                  onClick={() => setPresetTime(14, 0)}
                  className="px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-blue-50"
                >
                  02:00 PM
                </button>
                <button
                  type="button"
                  onClick={() => setPresetTime(18, 0)}
                  className="px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-blue-50"
                >
                  06:00 PM
                </button>
                <button
                  type="button"
                  onClick={() => setPresetTime(22, 0)}
                  className="px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-blue-50"
                >
                  10:00 PM
                </button>
              </div>
            </div>
            <input
              type="datetime-local"
              required
              value={recordedAt}
              onChange={(e) => setRecordedAt(e.target.value)}
              className="w-full p-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
            />
          </div>

          {/* 2. Core Vitals Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Temperature */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Thermometer className="w-3.5 h-3.5 text-amber-500" />
                  Temperature
                </label>
                <div className="flex items-center text-[10px] font-bold rounded border overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setTemperatureUnit("F")}
                    className={`px-1.5 py-0.5 ${temperatureUnit === "F" ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600"}`}
                  >
                    °F
                  </button>
                  <button
                    type="button"
                    onClick={() => setTemperatureUnit("C")}
                    className={`px-1.5 py-0.5 ${temperatureUnit === "C" ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600"}`}
                  >
                    °C
                  </button>
                </div>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  placeholder="98.6"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  className="w-full p-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>
              {tempStatus && (
                <div className="text-[10px]">
                  <span className={tempStatus.color}>{tempStatus.label}</span>
                </div>
              )}
            </div>

            {/* Blood Pressure (Sys & Dia) */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-rose-500" />
                  Blood Pressure (mmHg)
                </label>
                {mapValue && (
                  <span className="text-[10px] font-mono text-slate-400">
                    MAP: {mapValue}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="number"
                  placeholder="Sys (120)"
                  value={bpSys}
                  onChange={(e) => setBpSys(e.target.value)}
                  className="p-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                />
                <input
                  type="number"
                  placeholder="Dia (80)"
                  value={bpDia}
                  onChange={(e) => setBpDia(e.target.value)}
                  className="p-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>
              {bpStatus && (
                <div className="text-[10px]">
                  <span className={bpStatus.color}>{bpStatus.label}</span>
                </div>
              )}
            </div>

            {/* Pulse Rate */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
                Pulse Rate (Heart Rate bpm)
              </label>
              <input
                type="number"
                placeholder="72"
                value={pulseRate}
                onChange={(e) => setPulseRate(e.target.value)}
                className="w-full p-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
              />
              {pulseStatus && (
                <div className="text-[10px]">
                  <span className={pulseStatus.color}>{pulseStatus.label}</span>
                </div>
              )}
            </div>

            {/* Respiratory Rate */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Wind className="w-3.5 h-3.5 text-sky-500" />
                Respiratory Rate (breaths/min)
              </label>
              <input
                type="number"
                placeholder="16"
                value={respiratoryRate}
                onChange={(e) => setRespiratoryRate(e.target.value)}
                className="w-full p-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
              />
              <div className="text-[10px] text-slate-400">
                Normal: 12 - 20 /min
              </div>
            </div>

            {/* Oxygen Saturation (SpO2) */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-500" />
                Oxygen Saturation (SpO2 %)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="98"
                value={oxygenSaturation}
                onChange={(e) => setOxygenSaturation(e.target.value)}
                className="w-full p-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
              />
              {spo2Status && (
                <div className="text-[10px]">
                  <span className={spo2Status.color}>{spo2Status.label}</span>
                </div>
              )}
            </div>

            {/* Supplemental Oxygen Device */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Wind className="w-3.5 h-3.5 text-teal-500" />
                Oxygen Support Device
              </label>
              <select
                value={oxygenSupplement}
                onChange={(e) => setOxygenSupplement(e.target.value)}
                className="w-full p-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="Room Air">Room Air (21% FiO2)</option>
                <option value="Nasal Cannula">Nasal Cannula</option>
                <option value="Simple Face Mask">Simple Face Mask</option>
                <option value="NRBM Mask">NRBM (Non-Rebreather Mask)</option>
                <option value="BiPAP / CPAP">BiPAP / CPAP (NIV)</option>
                <option value="Mechanical Ventilator">Mechanical Ventilator</option>
              </select>
              {oxygenSupplement !== "Room Air" && (
                <input
                  type="number"
                  step="0.5"
                  placeholder="Flow Rate (e.g. 2 L/min)"
                  value={o2FlowRate}
                  onChange={(e) => setO2FlowRate(e.target.value)}
                  className="w-full p-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono mt-1"
                />
              )}
            </div>
          </div>

          {/* 3. Secondary Parameters (Blood Glucose, AVPU, Pain Scale) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Blood Glucose */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Droplet className="w-3.5 h-3.5 text-purple-500" />
                  Blood Sugar (mg/dL)
                </label>
                <select
                  value={glucoseType}
                  onChange={(e) => setGlucoseType(e.target.value as any)}
                  className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 rounded px-1.5 py-0.5 border"
                >
                  <option value="random">Random (RBS)</option>
                  <option value="fasting">Fasting (FBS)</option>
                  <option value="post_meal">Post-Meal (PPBS)</option>
                </select>
              </div>
              <input
                type="number"
                placeholder="e.g. 110"
                value={bloodGlucose}
                onChange={(e) => setBloodGlucose(e.target.value)}
                className="w-full p-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
              />
              {glucoseStatus && (
                <div className="text-[10px]">
                  <span className={glucoseStatus.color}>{glucoseStatus.label}</span>
                </div>
              )}
            </div>

            {/* Consciousness (AVPU) */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-indigo-500" />
                Consciousness (AVPU Scale)
              </label>
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                {(["Alert", "Voice", "Pain", "Unresponsive"] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setAvpu(lvl)}
                    className={`py-1.5 px-2 rounded-lg border text-center transition-all ${
                      avpu === lvl
                        ? "bg-indigo-600 text-white font-bold border-indigo-600 shadow-xs"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Pain Scale (0-10) */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  {painScore === 0 ? (
                    <Smile className="w-3.5 h-3.5 text-emerald-500" />
                  ) : painScore <= 4 ? (
                    <Meh className="w-3.5 h-3.5 text-amber-500" />
                  ) : (
                    <Frown className="w-3.5 h-3.5 text-rose-500" />
                  )}
                  Pain Score (0 - 10)
                </label>
                <span className="text-xs font-bold font-mono text-slate-900 dark:text-white">
                  {painScore} / 10
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="1"
                value={painScore}
                onChange={(e) => setPainScore(Number(e.target.value))}
                className="w-full accent-rose-600 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-slate-400">
                <span>0 (No Pain)</span>
                <span>5 (Moderate)</span>
                <span>10 (Severe)</span>
              </div>
            </div>
          </div>

          {/* 3B. Hospital Custom Vitals (Configured in Settings) */}
          {hospitalCustomConfigs.length > 0 && (
            <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                    <Sliders className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                      Hospital Custom Vitals Parameters ({hospitalCustomConfigs.length})
                    </h5>
                    <p className="text-[10px] text-indigo-700/80 dark:text-indigo-300/80">
                      Configured in Hospital Settings for department/inpatient monitoring
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 font-semibold">
                  Settings Enabled
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                {hospitalCustomConfigs.map((cfg) => {
                  const val = customFieldValues[cfg.field_key] || ""

                  return (
                    <div
                      key={cfg.id}
                      className="p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/40 bg-white dark:bg-slate-800/80 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {cfg.label}
                        </label>
                        {cfg.unit && (
                          <span className="text-[9px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {cfg.unit}
                          </span>
                        )}
                      </div>

                      {cfg.input_type === "select" && cfg.options && cfg.options.length > 0 ? (
                        <select
                          value={val}
                          onChange={(e) =>
                            setCustomFieldValues({
                              ...customFieldValues,
                              [cfg.field_key]: e.target.value,
                            })
                          }
                          className="w-full p-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        >
                          <option value="">Select option</option>
                          {cfg.options.map((opt, i) => (
                            <option key={i} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : cfg.input_type === "boolean" ? (
                        <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                          <button
                            type="button"
                            onClick={() =>
                              setCustomFieldValues({
                                ...customFieldValues,
                                [cfg.field_key]: "Yes",
                              })
                            }
                            className={`py-1 text-xs rounded font-semibold border ${
                              val === "Yes"
                                ? "bg-emerald-600 text-white border-emerald-600"
                                : "bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300"
                            }`}
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setCustomFieldValues({
                                ...customFieldValues,
                                [cfg.field_key]: "No",
                              })
                            }
                            className={`py-1 text-xs rounded font-semibold border ${
                              val === "No"
                                ? "bg-slate-700 text-white border-slate-700"
                                : "bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300"
                            }`}
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <input
                          type={cfg.input_type === "number" ? "number" : "text"}
                          step="any"
                          min={cfg.min_value ?? undefined}
                          max={cfg.max_value ?? undefined}
                          placeholder={`Enter ${cfg.label}`}
                          value={val}
                          onChange={(e) =>
                            setCustomFieldValues({
                              ...customFieldValues,
                              [cfg.field_key]: e.target.value,
                            })
                          }
                          className="w-full p-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 3C. Patient-Specific / Bedside Ad-Hoc Metrics */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Patient-Specific Bedside Metrics (Ad-Hoc)
                </span>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Record any special bedside parameter for this patient (e.g. Chest Drain Output, CVP, Pupils, Urine Output)
                </p>
              </div>

              <button
                type="button"
                onClick={addPatientSpecificMetric}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-md transition-all"
              >
                <PlusCircle className="w-3 h-3" />
                Add Patient Metric
              </button>
            </div>

            {patientSpecificMetrics.length > 0 && (
              <div className="space-y-2 pt-1">
                {patientSpecificMetrics.map((metric) => (
                  <div
                    key={metric.id}
                    className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700"
                  >
                    <input
                      type="text"
                      placeholder="Parameter Name (e.g. Chest Drain Output)"
                      value={metric.name}
                      onChange={(e) => updatePatientSpecificMetric(metric.id, "name", e.target.value)}
                      className="flex-1 p-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                    <input
                      type="text"
                      placeholder="Value (e.g. 150)"
                      value={metric.value}
                      onChange={(e) => updatePatientSpecificMetric(metric.id, "value", e.target.value)}
                      className="w-28 p-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-slate-900 dark:text-white"
                    />
                    <input
                      type="text"
                      placeholder="Unit (e.g. ml)"
                      value={metric.unit}
                      onChange={(e) => updatePatientSpecificMetric(metric.id, "unit", e.target.value)}
                      className="w-20 p-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => removePatientSpecificMetric(metric.id)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors"
                      title="Remove parameter"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. Live MEWS Early Warning Score Banner */}
          <div className={`p-4 rounded-xl border ${mews.borderColor} ${mews.bgColor} flex items-center justify-between gap-4 transition-all`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg font-mono font-black text-lg ${mews.color}`}>
                MEWS: {mews.score}
              </div>
              <div>
                <div className={`text-xs font-bold ${mews.color}`}>
                  {mews.label}
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                  {mews.advice}
                </div>
              </div>
            </div>
            {mews.score >= 5 && (
              <span className="px-2 py-1 text-xs font-bold text-white bg-rose-600 rounded-lg animate-pulse shrink-0">
                Critical Alert
              </span>
            )}
          </div>

          {/* 5. Nurse Name & Clinical Remarks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Recorded By (Nurse / Clinician Name) *
              </label>
              <input
                type="text"
                required
                value={recordedByName}
                onChange={(e) => setRecordedByName(e.target.value)}
                placeholder="e.g. Staff Nurse Sunita"
                className="w-full p-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Bedside Remarks / Interventions
              </label>
              <input
                type="text"
                value={clinicalRemarks}
                onChange={(e) => setClinicalRemarks(e.target.value)}
                placeholder="e.g. Paracetamol given, IV fluids continued, sleeping comfortably..."
                className="w-full p-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Vitals will be saved to chronological bedside TPR flowsheet
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={recordVitalMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSubmit}
              disabled={recordVitalMutation.isPending}
              className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {recordVitalMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving Vitals...
                </>
              ) : (
                <>
                  <HeartPulse className="w-4 h-4" />
                  Save Bedside Vitals
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
