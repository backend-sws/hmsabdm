import React, { useState, useMemo } from "react"
import { useNavigate } from "react-router"
import {
  HeartPulse,
  Thermometer,
  Activity,
  Wind,
  Droplet,
  Plus,
  Calendar,
  Table as TableIcon,
  LineChart,
  ShieldAlert,
  Sliders,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { VitalRecord } from "@/types/opd"
import {
  calculateMews,
  getTemperatureStatus,
  getBloodPressureStatus,
  getPulseStatus,
  getSpo2Status,
} from "@/utils/mewsCalculator"

export interface IpdVitalsFlowsheetTabProps {
  vitals: VitalRecord[]
  onOpenRecordModal: () => void
  isDischarged?: boolean
  patientName?: string
  bedNumber?: string
}

export const IpdVitalsFlowsheetTab: React.FC<IpdVitalsFlowsheetTabProps> = ({
  vitals,
  onOpenRecordModal,
  isDischarged = false,
  patientName,
  bedNumber,
}) => {
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState<"flowsheet" | "charts">("flowsheet")

  // Reserved internal keys that shouldn't appear as custom columns
  const RESERVED_CUSTOM_KEYS = useMemo(
    () =>
      new Set([
        "avpu",
        "oxygen_supplement",
        "o2_flow_rate",
        "pain_score",
        "mews_score",
        "mews_risk",
        "recorded_by_name",
        "remarks",
        "_audit_trail",
      ]),
    []
  )

  // Dynamically discover all unique custom parameter keys across all records
  const dynamicCustomKeys = useMemo(() => {
    const keys = new Set<string>()
    vitals.forEach((v) => {
      const cv = v.custom_vitals as Record<string, any> | undefined
      if (cv && typeof cv === "object") {
        Object.keys(cv).forEach((k) => {
          if (
            !RESERVED_CUSTOM_KEYS.has(k) &&
            cv[k] !== undefined &&
            cv[k] !== null &&
            cv[k] !== ""
          ) {
            keys.add(k)
          }
        })
      }
    })
    return Array.from(keys)
  }, [vitals, RESERVED_CUSTOM_KEYS])

  // Sort vitals chronologically (oldest first for charts, newest first for hero)
  const sortedAsc = useMemo(() => {
    return [...vitals].sort(
      (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    )
  }, [vitals])

  const sortedDesc = useMemo(() => {
    return [...vitals].sort(
      (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
    )
  }, [vitals])

  // Latest Vital Record
  const latestVital = sortedDesc[0] || null

  // Latest MEWS
  const latestMews = useMemo(() => {
    if (!latestVital) return null
    return calculateMews({
      respiratory_rate: latestVital.respiratory_rate,
      pulse_rate: latestVital.pulse_rate,
      blood_pressure_sys: latestVital.blood_pressure_sys,
      temperature: latestVital.temperature,
      temperature_unit: latestVital.temperature_unit || "F",
      avpu: latestVital.custom_vitals?.avpu || "Alert",
    })
  }, [latestVital])

  // Group vitals by Date (YYYY-MM-DD) for Daily Flowsheet Table
  const groupedByDate = useMemo(() => {
    const map = new Map<string, VitalRecord[]>()
    sortedAsc.forEach((v) => {
      const dateKey = new Date(v.recorded_at).toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      })
      if (!map.has(dateKey)) {
        map.set(dateKey, [])
      }
      map.get(dateKey)!.push(v)
    })
    return Array.from(map.entries()).reverse() // Newest days first
  }, [sortedAsc])

  return (
    <div className="space-y-6">
      {/* ── Header & Action Bar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="font-bold text-base text-foreground flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-rose-600 dark:text-rose-400 animate-pulse" />
            Inpatient Bedside Vitals & Daily TPR Flowsheet
            {patientName && (
              <span className="text-xs font-normal text-muted-foreground">
                • {patientName} (Bed #{bedNumber || "N/A"})
              </span>
            )}
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Time-to-time hourly monitoring chart (TPR: Temperature, Pulse, Respiration & BP) with MEWS early warning score
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Configure Hospital Vitals in Settings */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/settings?tab=vitals")}
            className="gap-1.5 text-xs text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 font-semibold"
            title="Configure hospital-wide vital parameters in Settings"
          >
            <Sliders className="h-3.5 w-3.5" />
            Vitals Settings
          </Button>

          {/* View Toggle */}
          <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
            <button
              onClick={() => setViewMode("flowsheet")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                viewMode === "flowsheet"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TableIcon className="h-3.5 w-3.5" />
              Daily Flowsheet
            </button>
            <button
              onClick={() => setViewMode("charts")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                viewMode === "charts"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LineChart className="h-3.5 w-3.5" />
              Fever & Vital Curves
            </button>
          </div>

          {!isDischarged && (
            <Button
              size="sm"
              onClick={onOpenRecordModal}
              className="gap-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/25"
            >
              <Plus className="h-4 w-4" />
              Record Bedside Vitals
            </Button>
          )}
        </div>
      </div>

      {/* ── Latest Bedside Reading Hero Banner ── */}
      {latestVital ? (
        <Card className="border-2 border-rose-200/60 dark:border-rose-900/40 bg-gradient-to-r from-rose-50/40 via-white to-amber-50/30 dark:from-rose-950/20 dark:via-slate-900 dark:to-amber-950/20 shadow-xs overflow-hidden">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">
                      Latest Bedside Reading
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono font-semibold bg-white dark:bg-slate-800">
                      {new Date(latestVital.recorded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Recorded {new Date(latestVital.recorded_at).toLocaleDateString()} by{" "}
                    <strong className="text-foreground">
                      {latestVital.custom_vitals?.recorded_by_name || latestVital.recordedByUser?.name || "Staff Nurse"}
                    </strong>
                  </p>
                </div>
              </div>

              {/* MEWS Badge */}
              {latestMews && (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${latestMews.borderColor} ${latestMews.bgColor}`}>
                  <ShieldAlert className={`h-4 w-4 ${latestMews.color}`} />
                  <div>
                    <span className={`text-xs font-extrabold ${latestMews.color}`}>
                      MEWS Score: {latestMews.score}
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      {latestMews.label}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-4">
              {/* Temperature */}
              <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-800/60 border border-border/80">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block flex items-center gap-1">
                  <Thermometer className="h-3 w-3 text-amber-500" /> Temperature
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-xl font-bold font-mono text-foreground">
                    {latestVital.temperature || "—"}
                  </span>
                  <span className="text-xs text-muted-foreground font-bold">
                    °{latestVital.temperature_unit || "F"}
                  </span>
                </div>
                {getTemperatureStatus(latestVital.temperature, latestVital.temperature_unit) && (
                  <span className={`text-[10px] mt-1 inline-block ${getTemperatureStatus(latestVital.temperature, latestVital.temperature_unit)?.color}`}>
                    {getTemperatureStatus(latestVital.temperature, latestVital.temperature_unit)?.label}
                  </span>
                )}
              </div>

              {/* Blood Pressure */}
              <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-800/60 border border-border/80">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block flex items-center gap-1">
                  <Activity className="h-3 w-3 text-rose-500" /> Blood Pressure
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-xl font-bold font-mono text-foreground">
                    {latestVital.blood_pressure_sys && latestVital.blood_pressure_dia
                      ? `${latestVital.blood_pressure_sys}/${latestVital.blood_pressure_dia}`
                      : "—"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">mmHg</span>
                </div>
                {getBloodPressureStatus(latestVital.blood_pressure_sys, latestVital.blood_pressure_dia) && (
                  <span className={`text-[10px] mt-1 inline-block ${getBloodPressureStatus(latestVital.blood_pressure_sys, latestVital.blood_pressure_dia)?.color}`}>
                    {getBloodPressureStatus(latestVital.blood_pressure_sys, latestVital.blood_pressure_dia)?.label}
                  </span>
                )}
              </div>

              {/* Pulse Rate */}
              <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-800/60 border border-border/80">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block flex items-center gap-1">
                  <HeartPulse className="h-3 w-3 text-rose-500" /> Pulse Rate
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-xl font-bold font-mono text-foreground">
                    {latestVital.pulse_rate || "—"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">bpm</span>
                </div>
                {getPulseStatus(latestVital.pulse_rate) && (
                  <span className={`text-[10px] mt-1 inline-block ${getPulseStatus(latestVital.pulse_rate)?.color}`}>
                    {getPulseStatus(latestVital.pulse_rate)?.label}
                  </span>
                )}
              </div>

              {/* SpO2 */}
              <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-800/60 border border-border/80">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block flex items-center gap-1">
                  <Activity className="h-3 w-3 text-cyan-500" /> SpO2 Oxygen
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-xl font-bold font-mono text-foreground">
                    {latestVital.oxygen_saturation || "—"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">%</span>
                </div>
                <span className="text-[10px] text-muted-foreground truncate block mt-0.5">
                  {latestVital.custom_vitals?.oxygen_supplement || "Room Air"}
                </span>
              </div>

              {/* Respiratory Rate */}
              <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-800/60 border border-border/80">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block flex items-center gap-1">
                  <Wind className="h-3 w-3 text-sky-500" /> Resp Rate
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-xl font-bold font-mono text-foreground">
                    {latestVital.respiratory_rate || "—"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">/min</span>
                </div>
                <span className="text-[10px] text-muted-foreground block mt-0.5">
                  {latestVital.custom_vitals?.avpu ? `AVPU: ${latestVital.custom_vitals.avpu}` : "Normal"}
                </span>
              </div>

              {/* Blood Glucose */}
              <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-800/60 border border-border/80">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block flex items-center gap-1">
                  <Droplet className="h-3 w-3 text-purple-500" /> Blood Sugar
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-xl font-bold font-mono text-foreground">
                    {latestVital.blood_glucose || "—"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">mg/dL</span>
                </div>
                {latestVital.blood_glucose && (
                  <span className="text-[10px] text-muted-foreground capitalize block mt-0.5">
                    {latestVital.glucose_type || "Random"}
                  </span>
                )}
              </div>

              {/* Dynamic Hospital Settings & Bedside Custom Metrics in Hero Banner */}
              {dynamicCustomKeys.map((key) => {
                const val = latestVital.custom_vitals?.[key]
                if (val === undefined || val === null || val === "") return null
                return (
                  <div
                    key={key}
                    className="p-3 rounded-xl bg-white/80 dark:bg-slate-800/60 border border-indigo-200 dark:border-indigo-900/40"
                  >
                    <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block truncate capitalize">
                      {key.replace(/_/g, " ")}
                    </span>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-xl font-bold font-mono text-foreground truncate">
                        {String(val)}
                      </span>
                    </div>
                    <span className="text-[10px] text-indigo-500/80 dark:text-indigo-400/80 block mt-0.5">
                      Custom Metric
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Bedside Remarks Callout */}
            {latestVital.custom_vitals?.remarks && (
              <div className="mt-3 text-xs bg-muted/40 p-2.5 rounded-lg border border-border/60 text-muted-foreground">
                <strong className="text-foreground">Bedside Nurse Remarks:</strong>{" "}
                {latestVital.custom_vitals.remarks}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-dashed border-border p-10 text-center">
          <HeartPulse className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
          <h5 className="font-bold text-base text-foreground">No Bedside Vitals Logged Yet</h5>
          <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
            No temperature, pulse, or blood pressure readings have been logged for this admission. Log the patient's baseline admission vitals.
          </p>
          {!isDischarged && (
            <Button
              onClick={onOpenRecordModal}
              className="mt-4 gap-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
              size="sm"
            >
              <Plus className="h-4 w-4" /> Log Baseline Vitals
            </Button>
          )}
        </Card>
      )}

      {/* ── VIEW 1: DAILY TIME-TO-TIME TPR FLOWSHEET TABLE ── */}
      {viewMode === "flowsheet" && vitals.length > 0 && (
        <div className="space-y-6">
          {groupedByDate.map(([dateLabel, dayVitals]) => (
            <Card key={dateLabel} className="border border-border shadow-xs overflow-hidden">
              {/* Day Header */}
              <div className="bg-muted/40 px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="font-bold text-sm text-foreground">{dateLabel}</span>
                  <Badge variant="secondary" className="text-xs font-mono">
                    {dayVitals.length} reading{dayVitals.length === 1 ? "" : "s"}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground font-mono">
                  Bed #{bedNumber || "—"}
                </span>
              </div>

              {/* Matrix Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/20 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      <th className="py-2.5 pl-4 pr-3 whitespace-nowrap min-w-[130px]">Time / Hour</th>
                      <th className="px-3 py-2.5 whitespace-nowrap min-w-[110px]">Temp (°F)</th>
                      <th className="px-3 py-2.5 whitespace-nowrap min-w-[130px]">BP (mmHg)</th>
                      <th className="px-3 py-2.5 whitespace-nowrap min-w-[100px]">Pulse (bpm)</th>
                      <th className="px-3 py-2.5 whitespace-nowrap min-w-[100px]">Resp (/min)</th>
                      <th className="px-3 py-2.5 whitespace-nowrap min-w-[120px]">SpO2 % (O2)</th>
                      <th className="px-3 py-2.5 whitespace-nowrap min-w-[110px]">Sugar (mg/dL)</th>
                      <th className="px-3 py-2.5 whitespace-nowrap min-w-[90px]">Pain (0-10)</th>
                      <th className="px-3 py-2.5 whitespace-nowrap min-w-[100px]">MEWS</th>
                      {/* Dynamic Custom Columns (from Hospital Settings & Bedside) */}
                      {dynamicCustomKeys.map((key) => (
                        <th
                          key={key}
                          className="px-3 py-2.5 whitespace-nowrap min-w-[120px] text-indigo-600 dark:text-indigo-400 capitalize font-bold"
                        >
                          {key.replace(/_/g, " ")}
                        </th>
                      ))}
                      <th className="px-3 py-2.5 whitespace-nowrap min-w-[130px]">Recorded By</th>
                      <th className="py-2.5 pl-3 pr-4 whitespace-nowrap min-w-[180px]">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {dayVitals.map((v) => {
                      const m = calculateMews({
                        respiratory_rate: v.respiratory_rate,
                        pulse_rate: v.pulse_rate,
                        blood_pressure_sys: v.blood_pressure_sys,
                        temperature: v.temperature,
                        temperature_unit: v.temperature_unit || "F",
                        avpu: v.custom_vitals?.avpu || "Alert",
                      })
                      const tempStat = getTemperatureStatus(v.temperature, v.temperature_unit)
                      const bpStat = getBloodPressureStatus(v.blood_pressure_sys, v.blood_pressure_dia)
                      const pulseStat = getPulseStatus(v.pulse_rate)
                      const spo2Stat = getSpo2Status(v.oxygen_saturation)

                      return (
                        <tr key={v.id} className="hover:bg-muted/20 transition-colors">
                          {/* Time */}
                          <td className="py-2.5 pl-4 pr-3 font-mono font-bold text-foreground whitespace-nowrap">
                            {new Date(v.recorded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </td>

                          {/* Temp */}
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            {v.temperature ? (
                              <span className={tempStat?.status === "critical" ? "text-rose-600 font-bold" : "text-foreground font-semibold"}>
                                {v.temperature}°{v.temperature_unit || "F"}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>

                          {/* BP */}
                          <td className="px-3 py-2.5 whitespace-nowrap font-mono font-semibold">
                            {v.blood_pressure_sys && v.blood_pressure_dia ? (
                              <span className={bpStat?.status === "critical" ? "text-rose-600 font-bold" : "text-foreground"}>
                                {v.blood_pressure_sys}/{v.blood_pressure_dia}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>

                          {/* Pulse */}
                          <td className="px-3 py-2.5 whitespace-nowrap font-mono">
                            {v.pulse_rate ? (
                              <span className={pulseStat?.status === "critical" ? "text-rose-600 font-bold" : "text-foreground font-semibold"}>
                                {v.pulse_rate}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>

                          {/* Resp */}
                          <td className="px-3 py-2.5 whitespace-nowrap font-mono font-semibold text-foreground">
                            {v.respiratory_rate || "—"}
                          </td>

                          {/* SpO2 */}
                          <td className="px-3 py-2.5 whitespace-nowrap font-mono">
                            {v.oxygen_saturation ? (
                              <span className={spo2Stat?.status === "critical" ? "text-rose-600 font-bold animate-pulse" : "text-foreground font-semibold"}>
                                {v.oxygen_saturation}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                            {v.custom_vitals?.oxygen_supplement && v.custom_vitals.oxygen_supplement !== "Room Air" && (
                              <span className="ml-1 text-[9px] px-1 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                O2
                              </span>
                            )}
                          </td>

                          {/* Blood Glucose */}
                          <td className="px-3 py-2.5 whitespace-nowrap font-mono">
                            {v.blood_glucose ? (
                              <span>
                                {v.blood_glucose}{" "}
                                <span className="text-[10px] text-muted-foreground">({v.glucose_type?.[0]?.toUpperCase() || "R"})</span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>

                          {/* Pain Score */}
                          <td className="px-3 py-2.5 whitespace-nowrap font-mono font-semibold">
                            {v.custom_vitals?.pain_score !== undefined ? (
                              <span>{v.custom_vitals.pain_score} / 10</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>

                          {/* MEWS Score */}
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                                m.risk === "high"
                                  ? "bg-rose-500/20 text-rose-600 border border-rose-500/30 animate-pulse"
                                  : m.risk === "medium"
                                  ? "bg-amber-500/20 text-amber-700 border border-amber-500/30"
                                  : "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20"
                              }`}
                            >
                              {m.score}
                            </span>
                          </td>

                          {/* Dynamic Custom Cells */}
                          {dynamicCustomKeys.map((key) => {
                            const customVal = v.custom_vitals?.[key]
                            return (
                              <td key={key} className="px-3 py-2.5 whitespace-nowrap font-mono">
                                {customVal !== undefined && customVal !== null && customVal !== "" ? (
                                  <span className="font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded text-xs border border-indigo-200/50 dark:border-indigo-800/40">
                                    {String(customVal)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                            )
                          })}

                          {/* Recorded By */}
                          <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground font-medium">
                            {v.custom_vitals?.recorded_by_name || v.recordedByUser?.name || "Duty Nurse"}
                          </td>

                          {/* Remarks */}
                          <td className="py-2.5 pl-3 pr-4 text-muted-foreground truncate max-w-[220px]">
                            {v.custom_vitals?.remarks || "—"}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── VIEW 2: VISUAL CLINICAL GRAPHICAL CURVES (FEVER & VITALS) ── */}
      {viewMode === "charts" && sortedAsc.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Chart 1: Temperature Fever Curve */}
          <Card className="border border-border shadow-xs">
            <CardContent className="p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                    <Thermometer className="h-4 w-4 text-amber-500" />
                    Clinical Temperature Curve (Fever Chart °F)
                  </h5>
                  <p className="text-[11px] text-muted-foreground">
                    Hospital temperature trajectory with fever threshold alerts
                  </p>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  {sortedAsc.length} points
                </Badge>
              </div>

              {/* Visual SVG Curve */}
              <div className="h-48 w-full relative pt-2">
                <SimpleTrendCurve
                  data={sortedAsc.map((v) => ({
                    time: new Date(v.recorded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                    val: v.temperature || 98.6,
                  }))}
                  unit="°F"
                  color="#f59e0b"
                  thresholdWarning={99.2}
                  thresholdDanger={100.4}
                  minVal={96}
                  maxVal={104}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/60">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Normal (97-99°F)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500" /> Low-grade Fever (&gt;99.2°F)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-500" /> High Fever (&gt;100.4°F)
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Chart 2: Blood Pressure Band */}
          <Card className="border border-border shadow-xs">
            <CardContent className="p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                    <Activity className="h-4 w-4 text-rose-500" />
                    Blood Pressure Band (Systolic & Diastolic)
                  </h5>
                  <p className="text-[11px] text-muted-foreground">
                    Systolic (top curve) vs Diastolic (bottom curve) mmHg
                  </p>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  Target: 120/80
                </Badge>
              </div>

              {/* Dual BP Curve */}
              <div className="h-48 w-full relative pt-2">
                <DualTrendCurve
                  data={sortedAsc.map((v) => ({
                    time: new Date(v.recorded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                    val1: v.blood_pressure_sys || 120,
                    val2: v.blood_pressure_dia || 80,
                  }))}
                  label1="Systolic"
                  label2="Diastolic"
                  color1="#e11d48"
                  color2="#0284c7"
                  minVal={50}
                  maxVal={200}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/60">
                <span className="flex items-center gap-1.5 font-bold text-rose-600">
                  <span className="h-2 w-2 rounded-full bg-rose-600" /> Systolic mmHg
                </span>
                <span className="flex items-center gap-1.5 font-bold text-sky-600">
                  <span className="h-2 w-2 rounded-full bg-sky-600" /> Diastolic mmHg
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Chart 3: Pulse Rate (bpm) */}
          <Card className="border border-border shadow-xs">
            <CardContent className="p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                    <HeartPulse className="h-4 w-4 text-rose-600" />
                    Heart Rate / Pulse Trajectory (bpm)
                  </h5>
                  <p className="text-[11px] text-muted-foreground">
                    Normal adult resting heart rate range: 60 - 100 bpm
                  </p>
                </div>
              </div>

              <div className="h-48 w-full relative pt-2">
                <SimpleTrendCurve
                  data={sortedAsc.map((v) => ({
                    time: new Date(v.recorded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                    val: v.pulse_rate || 72,
                  }))}
                  unit="bpm"
                  color="#e11d48"
                  thresholdWarning={100}
                  thresholdDanger={120}
                  minVal={40}
                  maxVal={150}
                />
              </div>
            </CardContent>
          </Card>

          {/* Chart 4: SpO2 Oxygenation Curve */}
          <Card className="border border-border shadow-xs">
            <CardContent className="p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                    <Wind className="h-4 w-4 text-cyan-600" />
                    Oxygen Saturation (SpO2 %) Curve
                  </h5>
                  <p className="text-[11px] text-muted-foreground">
                    Oxygen saturation stability over hospital stay
                  </p>
                </div>
              </div>

              <div className="h-48 w-full relative pt-2">
                <SimpleTrendCurve
                  data={sortedAsc.map((v) => ({
                    time: new Date(v.recorded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                    val: v.oxygen_saturation || 98,
                  }))}
                  unit="%"
                  color="#0891b2"
                  thresholdWarning={94}
                  thresholdDanger={90}
                  minVal={80}
                  maxVal={100}
                  invertThreshold
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

/**
 * Responsive Pure-SVG Trend Curve Component (Zero external dependencies)
 */
interface TrendPoint {
  time: string
  val: number
}

function SimpleTrendCurve({
  data,
  unit,
  color,
  thresholdWarning,
  thresholdDanger,
  minVal = 50,
  maxVal = 150,
}: {
  data: TrendPoint[]
  unit: string
  color: string
  thresholdWarning?: number
  thresholdDanger?: number
  minVal?: number
  maxVal?: number
  invertThreshold?: boolean
}) {
  if (data.length === 0) return null

  const width = 500
  const height = 160
  const paddingX = 30
  const paddingY = 20

  const getX = (idx: number) => {
    if (data.length === 1) return width / 2
    return paddingX + (idx / (data.length - 1)) * (width - 2 * paddingX)
  }

  const getY = (val: number) => {
    const clamped = Math.max(minVal, Math.min(maxVal, val))
    return height - paddingY - ((clamped - minVal) / (maxVal - minVal)) * (height - 2 * paddingY)
  }

  const points = data.map((d, i) => `${getX(i)},${getY(d.val)}`).join(" ")

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
      {/* Unit Indicator */}
      <text x={width - paddingX} y={paddingY - 6} textAnchor="end" className="text-[9px] font-mono fill-slate-400">
        Unit: {unit}
      </text>

      {/* Background Grid Lines */}
      <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="#e2e8f0" strokeDasharray="3 3" opacity={0.5} />
      <line x1={paddingX} y1={height / 2} x2={width - paddingX} y2={height / 2} stroke="#e2e8f0" strokeDasharray="3 3" opacity={0.5} />
      <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="#e2e8f0" strokeDasharray="3 3" opacity={0.5} />

      {/* Threshold Warning Line */}
      {thresholdWarning && (
        <line
          x1={paddingX}
          y1={getY(thresholdWarning)}
          x2={width - paddingX}
          y2={getY(thresholdWarning)}
          stroke="#f59e0b"
          strokeDasharray="4 2"
          strokeWidth="1.2"
          opacity="0.6"
        />
      )}

      {/* Threshold Danger Line */}
      {thresholdDanger && (
        <line
          x1={paddingX}
          y1={getY(thresholdDanger)}
          x2={width - paddingX}
          y2={getY(thresholdDanger)}
          stroke="#f43f5e"
          strokeDasharray="4 2"
          strokeWidth="1.5"
          opacity="0.6"
        />
      )}

      {/* Area Fill */}
      {data.length > 1 && (
        <polygon
          points={`${getX(0)},${height - paddingY} ${points} ${getX(data.length - 1)},${height - paddingY}`}
          fill={color}
          opacity="0.12"
        />
      )}

      {/* Trend Line */}
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />

      {/* Data Points with Tooltip Labels */}
      {data.map((d, i) => {
        const cx = getX(i)
        const cy = getY(d.val)
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r="4" fill="#ffffff" stroke={color} strokeWidth="2.5" />
            <text
              x={cx}
              y={cy - 8}
              textAnchor="middle"
              className="text-[9px] font-mono font-bold fill-slate-700 dark:fill-slate-200"
            >
              {d.val}
            </text>
            <text
              x={cx}
              y={height - 4}
              textAnchor="middle"
              className="text-[8px] font-mono fill-slate-400"
            >
              {d.time}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function DualTrendCurve({
  data,
  label1,
  label2,
  color1,
  color2,
  minVal = 50,
  maxVal = 200,
}: {
  data: { time: string; val1: number; val2: number }[]
  label1: string
  label2: string
  color1: string
  color2: string
  minVal?: number
  maxVal?: number
}) {
  if (data.length === 0) return null

  const width = 500
  const height = 160
  const paddingX = 30
  const paddingY = 20

  const getX = (idx: number) => {
    if (data.length === 1) return width / 2
    return paddingX + (idx / (data.length - 1)) * (width - 2 * paddingX)
  }

  const getY = (val: number) => {
    const clamped = Math.max(minVal, Math.min(maxVal, val))
    return height - paddingY - ((clamped - minVal) / (maxVal - minVal)) * (height - 2 * paddingY)
  }

  const points1 = data.map((d, i) => `${getX(i)},${getY(d.val1)}`).join(" ")
  const points2 = data.map((d, i) => `${getX(i)},${getY(d.val2)}`).join(" ")

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
      {/* Legend Labels */}
      <text x={paddingX} y={paddingY - 6} className="text-[9px] font-bold" fill={color1}>
        ● {label1}
      </text>
      <text x={width - paddingX} y={paddingY - 6} textAnchor="end" className="text-[9px] font-bold" fill={color2}>
        ● {label2}
      </text>

      <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="#e2e8f0" strokeDasharray="3 3" opacity={0.5} />
      <line x1={paddingX} y1={height / 2} x2={width - paddingX} y2={height / 2} stroke="#e2e8f0" strokeDasharray="3 3" opacity={0.5} />
      <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="#e2e8f0" strokeDasharray="3 3" opacity={0.5} />

      {/* Curve 1 (Systolic) */}
      <polyline fill="none" stroke={color1} strokeWidth="2.5" strokeLinecap="round" points={points1} />

      {/* Curve 2 (Diastolic) */}
      <polyline fill="none" stroke={color2} strokeWidth="2.5" strokeLinecap="round" points={points2} />

      {/* Points */}
      {data.map((d, i) => {
        const cx = getX(i)
        const cy1 = getY(d.val1)
        const cy2 = getY(d.val2)
        return (
          <g key={i}>
            <circle cx={cx} cy={cy1} r="3.5" fill="#ffffff" stroke={color1} strokeWidth="2" />
            <text x={cx} y={cy1 - 7} textAnchor="middle" className="text-[8px] font-mono font-bold fill-rose-600">
              {d.val1}
            </text>

            <circle cx={cx} cy={cy2} r="3.5" fill="#ffffff" stroke={color2} strokeWidth="2" />
            <text x={cx} y={cy2 + 13} textAnchor="middle" className="text-[8px] font-mono font-bold fill-sky-600">
              {d.val2}
            </text>

            <text x={cx} y={height - 4} textAnchor="middle" className="text-[8px] font-mono fill-slate-400">
              {d.time}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
