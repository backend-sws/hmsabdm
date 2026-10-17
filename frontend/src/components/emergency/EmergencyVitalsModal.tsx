import React, { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  HeartPulse,
  Activity,
  Plus,
  Clock,
  RefreshCw,
  Gauge,
  Flame,
  Wind,
  Droplets,
  ShieldAlert,
} from "lucide-react"

import { FormContainer } from "@/components/formContainer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { emergencyService } from "@/services/emergencyService"
import { queryKeys } from "@/constants/queryKeys"
import type { EmergencyTriage, RecordEmergencyVitalPayload } from "@/types/emergency"

export interface EmergencyVitalsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedTriage: EmergencyTriage | null
}

const initialFormState: RecordEmergencyVitalPayload = {
  bp_systolic: undefined,
  bp_diastolic: undefined,
  pulse: undefined,
  temperature: undefined,
  spo2: undefined,
  respiratory_rate: undefined,
  blood_glucose: undefined,
  gcs_score: 15,
  consciousness_level: "alert",
  pain_score: 0,
  notes: "",
}

export const EmergencyVitalsModal: React.FC<EmergencyVitalsModalProps> = ({
  open,
  onOpenChange,
  selectedTriage,
}) => {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<RecordEmergencyVitalPayload>(initialFormState)
  const [showAddForm, setShowAddForm] = useState(false)

  // Fetch continuous vitals history
  const { data: vitalsData, isLoading } = useQuery({
    queryKey: ["emergency", "vitals", selectedTriage?.id],
    queryFn: () => emergencyService.getVitals(selectedTriage!.id),
    enabled: open && !!selectedTriage?.id,
  })

  const history = vitalsData?.history || []

  const recordMutation = useMutation({
    mutationFn: () => {
      if (!selectedTriage) throw new Error("No triage selected")
      return emergencyService.recordVitals(selectedTriage.id, formData)
    },
    onSuccess: () => {
      toast.success("Emergency bedside vitals recorded successfully!")
      queryClient.invalidateQueries({ queryKey: ["emergency", "vitals", selectedTriage?.id] })
      queryClient.invalidateQueries({ queryKey: queryKeys.emergency.all })
      setFormData(initialFormState)
      setShowAddForm(false)
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to log vitals")
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    recordMutation.mutate()
  }

  // Clinical warning triggers
  const isSpo2Low = formData.spo2 !== undefined && formData.spo2 < 90
  const isBpCritical =
    (formData.bp_systolic !== undefined && formData.bp_systolic < 90) ||
    (formData.bp_systolic !== undefined && formData.bp_systolic > 180)

  return (
    <FormContainer
      open={open}
      onOpenChange={onOpenChange}
      title="Continuous Bedside Vitals Monitoring"
      description={`Triage #${selectedTriage?.triage_number} • Patient: ${selectedTriage?.patient_name} (${selectedTriage?.gender || "O"} / ${selectedTriage?.approximate_age || "--"} Y)`}
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {!showAddForm && (
            <Button
              size="sm"
              onClick={() => setShowAddForm(true)}
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold gap-1.5"
            >
              <Plus className="h-4 w-4" /> Log Repeat Vitals
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {/* Patient Status Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border border-slate-200/80 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-foreground">
                  {selectedTriage?.patient_name}
                </span>
                <Badge
                  className={
                    selectedTriage?.priority_level === "red"
                      ? "bg-rose-600 text-white"
                      : selectedTriage?.priority_level === "yellow"
                      ? "bg-amber-600 text-white"
                      : "bg-emerald-600 text-white"
                  }
                >
                  {selectedTriage?.priority_level?.toUpperCase()} PRIORITY
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Location: {selectedTriage?.ward?.name || "Casualty Resuscitation Bay"} • Bed #{selectedTriage?.bed?.bed_number || "ER-Bay"}
              </p>
            </div>
          </div>
          <div className="text-right text-xs">
            <span className="text-muted-foreground block text-[10px]">TOTAL READINGS</span>
            <span className="font-mono font-bold text-sm text-foreground">
              {history.length + (selectedTriage?.initial_vitals ? 1 : 0)} Recorded
            </span>
          </div>
        </div>

        {/* Quick Log Form Accordion / Box */}
        {showAddForm && (
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-teal-500/30 bg-teal-50/30 dark:bg-teal-950/20 p-4 space-y-4 animate-in fade-in-50"
          >
            <div className="flex items-center justify-between border-b border-teal-500/20 pb-2">
              <span className="font-bold text-xs text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-teal-600" /> Bedside Observation Entry
              </span>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setShowAddForm(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
            </div>

            {/* Critical Clinical Alerts */}
            {(isSpo2Low || isBpCritical) && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-800 text-xs font-semibold dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-300 animate-pulse">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>
                  CRITICAL WARNING:{" "}
                  {isSpo2Low && "Hypoxia detected (SpO2 < 90%). Administer High-Flow O2. "}
                  {isBpCritical && "Abnormal Blood Pressure reading. Notify CMO immediately."}
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* BP Systolic */}
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  <Gauge className="h-3.5 w-3.5 text-muted-foreground" /> BP Systolic (mmHg)
                </Label>
                <Input
                  type="number"
                  placeholder="120"
                  value={formData.bp_systolic ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bp_systolic: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className="h-9 text-xs font-mono"
                />
              </div>

              {/* BP Diastolic */}
              <div className="space-y-1">
                <Label className="text-xs">BP Diastolic (mmHg)</Label>
                <Input
                  type="number"
                  placeholder="80"
                  value={formData.bp_diastolic ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bp_diastolic: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className="h-9 text-xs font-mono"
                />
              </div>

              {/* Pulse Rate */}
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  <HeartPulse className="h-3.5 w-3.5 text-rose-500" /> Pulse (bpm)
                </Label>
                <Input
                  type="number"
                  placeholder="72"
                  value={formData.pulse ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pulse: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className="h-9 text-xs font-mono"
                />
              </div>

              {/* SpO2 */}
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  <Wind className="h-3.5 w-3.5 text-cyan-500" /> SpO2 (%)
                </Label>
                <Input
                  type="number"
                  placeholder="98"
                  value={formData.spo2 ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      spo2: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className={`h-9 text-xs font-mono ${
                    isSpo2Low ? "border-rose-500 bg-rose-50 dark:bg-rose-950/40" : ""
                  }`}
                />
              </div>

              {/* Temperature */}
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  <Flame className="h-3.5 w-3.5 text-amber-500" /> Temp (°F)
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="98.6"
                  value={formData.temperature ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      temperature: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className="h-9 text-xs font-mono"
                />
              </div>

              {/* Respiratory Rate */}
              <div className="space-y-1">
                <Label className="text-xs">Resp Rate (/min)</Label>
                <Input
                  type="number"
                  placeholder="16"
                  value={formData.respiratory_rate ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      respiratory_rate: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className="h-9 text-xs font-mono"
                />
              </div>

              {/* Blood Glucose */}
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  <Droplets className="h-3.5 w-3.5 text-purple-500" /> RBS (mg/dL)
                </Label>
                <Input
                  type="number"
                  placeholder="110"
                  value={formData.blood_glucose ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      blood_glucose: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className="h-9 text-xs font-mono"
                />
              </div>

              {/* GCS Score */}
              <div className="space-y-1">
                <Label className="text-xs">GCS (/15)</Label>
                <Input
                  type="number"
                  min="3"
                  max="15"
                  placeholder="15"
                  value={formData.gcs_score ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      gcs_score: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            {/* Pain Scale & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <Label className="text-xs">Pain Score (0 - 10): {formData.pain_score}</Label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={formData.pain_score ?? 0}
                  onChange={(e) => setFormData({ ...formData, pain_score: Number(e.target.value) })}
                  className="w-full accent-teal-600"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Clinical Observation Notes</Label>
                <Input
                  type="text"
                  placeholder="e.g. Patient conscious, oriented, on 4L O2 via nasal prongs"
                  value={formData.notes ?? ""}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="submit"
                disabled={recordMutation.isPending}
                size="sm"
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold"
              >
                {recordMutation.isPending && <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" />}
                Save Vitals Record
              </Button>
            </div>
          </form>
        )}

        {/* Vitals History Timeline */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Vitals Observation Timeline
            </h4>
            {isLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          </div>

          {history.length === 0 && !selectedTriage?.initial_vitals ? (
            <div className="text-center py-8 border border-dashed rounded-xl text-muted-foreground text-xs">
              No continuous vitals recorded yet. Click "Log Repeat Vitals" above to start tracking.
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {/* Historical records */}
              {history.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-background hover:bg-muted/30 transition text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 font-mono font-bold text-xs">
                      #{history.length - idx}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 font-mono">
                        {item.blood_pressure_sys && (
                          <span className="font-bold text-foreground">
                            BP: {item.blood_pressure_sys}/{item.blood_pressure_dia}
                          </span>
                        )}
                        {item.pulse_rate && (
                          <span className="text-rose-600 dark:text-rose-400">
                            HR: {item.pulse_rate} bpm
                          </span>
                        )}
                        {item.oxygen_saturation && (
                          <span
                            className={
                              item.oxygen_saturation < 90
                                ? "text-rose-600 font-bold"
                                : "text-cyan-600 dark:text-cyan-400"
                            }
                          >
                            SpO2: {item.oxygen_saturation}%
                          </span>
                        )}
                        {item.temperature && (
                          <span className="text-amber-600 dark:text-amber-400">
                            Temp: {item.temperature}°F
                          </span>
                        )}
                        {item.respiratory_rate && (
                          <span className="text-muted-foreground">
                            RR: {item.respiratory_rate}/m
                          </span>
                        )}
                        {item.blood_glucose && (
                          <span className="text-purple-600 dark:text-purple-400">
                            RBS: {item.blood_glucose} mg/dL
                          </span>
                        )}
                      </div>
                      {item.custom_vitals?.notes && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 italic">
                          "{item.custom_vitals.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right text-[11px] text-muted-foreground font-mono">
                    <div className="flex items-center gap-1 justify-end">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(item.recorded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <span>{new Date(item.recorded_at).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                  </div>
                </div>
              ))}

              {/* Initial Admission Vitals */}
              {selectedTriage?.initial_vitals && (
                <div className="flex items-center justify-between p-3 rounded-xl border border-blue-500/30 bg-blue-500/5 text-xs">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                      INITIAL
                    </Badge>
                    <div className="flex flex-wrap items-center gap-2 font-mono">
                      {selectedTriage.initial_vitals.bp_systolic && (
                        <span className="font-bold text-foreground">
                          BP: {selectedTriage.initial_vitals.bp_systolic}/
                          {selectedTriage.initial_vitals.bp_diastolic || "--"}
                        </span>
                      )}
                      {selectedTriage.initial_vitals.pulse && (
                        <span className="text-rose-600 dark:text-rose-400">
                          HR: {selectedTriage.initial_vitals.pulse} bpm
                        </span>
                      )}
                      {selectedTriage.initial_vitals.spo2 && (
                        <span className="text-cyan-600 dark:text-cyan-400">
                          SpO2: {selectedTriage.initial_vitals.spo2}%
                        </span>
                      )}
                      {selectedTriage.initial_vitals.temperature && (
                        <span className="text-amber-600 dark:text-amber-400">
                          Temp: {selectedTriage.initial_vitals.temperature}°F
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-muted-foreground font-mono">
                    Triage Arrival
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </FormContainer>
  )
}
