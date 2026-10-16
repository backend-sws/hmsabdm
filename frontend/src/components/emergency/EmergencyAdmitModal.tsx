import React, { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { RefreshCw, ShieldAlert } from "lucide-react"

import { FormContainer } from "@/components/formContainer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { emergencyService } from "@/services/emergencyService"
import { doctorService } from "@/services/doctorService"
import { ipdService } from "@/services/ipdService"
import { queryKeys } from "@/constants/queryKeys"
import type { TriageAdmissionPayload } from "@/types/emergency"

export interface EmergencyAdmitModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const initialAdmitState: TriageAdmissionPayload = {
  is_unknown_patient: false,
  patient_name: "",
  gender: "M",
  approximate_age: undefined,
  brought_by: "Ambulance",
  brought_by_contact: "",
  priority_level: "red",
  triage_category: "Trauma",
  chief_complaint: "",
  consciousness_level: "alert",
  gcs_score: 15,
  initial_vitals: {
    bp_systolic: undefined,
    bp_diastolic: undefined,
    pulse: undefined,
    spo2: undefined,
    temperature: undefined,
    respiratory_rate: undefined,
  },
  is_mlc: false,
  police_station: "",
  police_officer_name: "",
  police_buckle_number: "",
  incident_place: "",
  mlc_injuries_details: "",
  doctor_id: undefined,
  ward_id: undefined,
  bed_id: undefined,
  advance_deposit: 0,
  clinical_notes: "",
}

export const EmergencyAdmitModal: React.FC<EmergencyAdmitModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const queryClient = useQueryClient()
  const [admitPayload, setAdmitPayload] = useState<TriageAdmissionPayload>(initialAdmitState)
  const [selectedWardId, setSelectedWardId] = useState<number | undefined>(undefined)

  // Master Queries
  const { data: doctorsData } = useQuery({
    queryKey: queryKeys.doctors.list(),
    queryFn: () => doctorService.getDoctors({ limit: 100 }),
    enabled: open,
  })
  const doctorsList = doctorsData?.data || []

  const { data: wards = [] } = useQuery({
    queryKey: queryKeys.ipd.wards,
    queryFn: () => ipdService.getWards(),
    enabled: open,
  })

  const { data: availableBeds = [] } = useQuery({
    queryKey: queryKeys.ipd.availableBeds(selectedWardId),
    queryFn: () => ipdService.getAvailableBeds(selectedWardId),
    enabled: open && !!selectedWardId,
  })

  const admitMutation = useMutation({
    mutationFn: () => {
      if (!admitPayload.is_unknown_patient && !admitPayload.patient_name?.trim()) {
        throw new Error("Patient name is required when not unidentified.")
      }
      if (!admitPayload.chief_complaint?.trim()) {
        throw new Error("Chief complaint is required for emergency triage.")
      }
      return emergencyService.admitTriage(admitPayload)
    },
    onSuccess: (res) => {
      toast.success(
        `Emergency Casualty Admitted! Triage #${res.triage_number} | UHID: ${res.uhid || res.patient?.uhid}`
      )
      queryClient.invalidateQueries({ queryKey: queryKeys.emergency.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.ipd.bedMatrix })
      onOpenChange(false)
      setAdmitPayload(initialAdmitState)
      if (onSuccess) onSuccess()
    },
    onError: (err: any) => {
      toast.error(err.message || "Emergency admission failed.")
    },
  })

  return (
    <FormContainer
      open={open}
      onOpenChange={onOpenChange}
      title="⚡ Fast-Track 5-Second ER Casualty Admission"
      description="Immediate admission for trauma/emergency. Generates temporary UHID (EMG-2026-XXXXX) for unknown patients."
      size="xl"
      footer={
        <div className="flex justify-between items-center w-full">
          <span className="text-[11px] text-muted-foreground">
            * Red priority cases bypass standard registration queues
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => admitMutation.mutate()}
              disabled={admitMutation.isPending}
              className="gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {admitMutation.isPending && <RefreshCw className="h-4 w-4 animate-spin" />}
              ⚡ Instant Admit & Triage
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5 text-xs">
        {/* ESI Priority Visual Selector */}
        <div>
          <Label className="font-bold text-xs uppercase tracking-wider mb-2 block">
            1. ESI Triage Priority Level *
          </Label>
          <div className="grid grid-cols-3 gap-3">
            {/* RED */}
            <div
              onClick={() => setAdmitPayload({ ...admitPayload, priority_level: "red" })}
              className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                admitPayload.priority_level === "red"
                  ? "border-rose-600 bg-rose-500/15 ring-2 ring-rose-500/30"
                  : "border-border bg-card hover:border-rose-500/50"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-600 animate-pulse"></span>
                <span className="font-bold text-sm text-rose-600 dark:text-rose-400">
                  🔴 RED (Immediate)
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Resuscitation. Life or limb threat. Immediate intervention.
              </p>
            </div>

            {/* YELLOW */}
            <div
              onClick={() => setAdmitPayload({ ...admitPayload, priority_level: "yellow" })}
              className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                admitPayload.priority_level === "yellow"
                  ? "border-amber-600 bg-amber-500/15 ring-2 ring-amber-500/30"
                  : "border-border bg-card hover:border-amber-500/50"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-amber-500"></span>
                <span className="font-bold text-sm text-amber-600 dark:text-amber-400">
                  🟡 YELLOW (Urgent)
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Emergent condition. High risk. Severe pain or distress.
              </p>
            </div>

            {/* GREEN */}
            <div
              onClick={() => setAdmitPayload({ ...admitPayload, priority_level: "green" })}
              className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                admitPayload.priority_level === "green"
                  ? "border-emerald-600 bg-emerald-500/15 ring-2 ring-emerald-500/30"
                  : "border-border bg-card hover:border-emerald-500/50"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-500"></span>
                <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                  🟢 GREEN (Stable)
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Non-urgent condition. Normal vitals. Walking wounded.
              </p>
            </div>
          </div>
        </div>

        {/* Patient Identification Mode */}
        <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="font-bold text-xs uppercase tracking-wider">
              2. Casualty Patient Identification
            </Label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={admitPayload.is_unknown_patient}
                onChange={(e) =>
                  setAdmitPayload({
                    ...admitPayload,
                    is_unknown_patient: e.target.checked,
                    patient_name: e.target.checked ? "" : admitPayload.patient_name,
                  })
                }
                className="rounded border-input text-rose-600 focus:ring-rose-500 h-4 w-4"
              />
              <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                Unidentified / Unknown Patient (Auto-assign Temp UHID)
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <Label>Patient Name</Label>
              <Input
                value={admitPayload.patient_name || ""}
                onChange={(e) => setAdmitPayload({ ...admitPayload, patient_name: e.target.value })}
                placeholder={
                  admitPayload.is_unknown_patient
                    ? "Auto-generated: Unknown Male/Female (EMG-...)"
                    : "Enter patient name if known"
                }
                disabled={admitPayload.is_unknown_patient}
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <Label>Gender</Label>
              <select
                value={admitPayload.gender || "M"}
                onChange={(e) => setAdmitPayload({ ...admitPayload, gender: e.target.value as any })}
                className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1"
              >
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
              </select>
            </div>

            <div>
              <Label>Approximate Age (Years)</Label>
              <Input
                type="number"
                value={admitPayload.approximate_age || ""}
                onChange={(e) =>
                  setAdmitPayload({
                    ...admitPayload,
                    approximate_age: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                placeholder="e.g. 35"
                className="mt-1 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div>
              <Label>Brought By</Label>
              <select
                value={admitPayload.brought_by || "Ambulance"}
                onChange={(e) => setAdmitPayload({ ...admitPayload, brought_by: e.target.value })}
                className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1"
              >
                <option value="Ambulance">108 / Private Ambulance</option>
                <option value="Police">Police PCR Van</option>
                <option value="Relative">Relative / Family Member</option>
                <option value="Good Samaritan">Good Samaritan / Bystander</option>
                <option value="Self">Self / Walk-in</option>
              </select>
            </div>

            <div>
              <Label>Brought By Contact / Phone</Label>
              <Input
                value={admitPayload.brought_by_contact || ""}
                onChange={(e) => setAdmitPayload({ ...admitPayload, brought_by_contact: e.target.value })}
                placeholder="Mobile number of driver or relative"
                className="mt-1 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Clinical & Triage Details */}
        <div className="space-y-3">
          <Label className="font-bold text-xs uppercase tracking-wider block">
            3. Clinical Triage & Presentation
          </Label>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Triage Category</Label>
              <select
                value={admitPayload.triage_category || "Trauma"}
                onChange={(e) => setAdmitPayload({ ...admitPayload, triage_category: e.target.value })}
                className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1"
              >
                <option value="Trauma">Trauma / RTA / Fall</option>
                <option value="Cardiac">Chest Pain / Acute Coronary / Cardiac</option>
                <option value="Respiratory">Severe Breathlessness / Asthma</option>
                <option value="Neurological">Stroke / Seizure / Altered Sensorium</option>
                <option value="Poisoning">Poisoning / Snake Bite / Overdose</option>
                <option value="Burn">Burn / Electrical Injury</option>
                <option value="Sepsis">Severe Sepsis / Shock</option>
                <option value="Other">General Emergency</option>
              </select>
            </div>

            <div>
              <Label>Consciousness (AVPU)</Label>
              <select
                value={admitPayload.consciousness_level || "alert"}
                onChange={(e) =>
                  setAdmitPayload({
                    ...admitPayload,
                    consciousness_level: e.target.value as any,
                  })
                }
                className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1"
              >
                <option value="alert">Alert (Fully conscious)</option>
                <option value="voice">Responds to Voice</option>
                <option value="pain">Responds to Pain only</option>
                <option value="unresponsive">Unresponsive / Comatose</option>
              </select>
            </div>

            <div>
              <Label>Glasgow Coma Scale (GCS 3–15)</Label>
              <Input
                type="number"
                min={3}
                max={15}
                value={admitPayload.gcs_score ?? 15}
                onChange={(e) =>
                  setAdmitPayload({
                    ...admitPayload,
                    gcs_score: Number(e.target.value),
                  })
                }
                placeholder="3 to 15"
                className="mt-1 text-xs"
              />
            </div>
          </div>

          <div>
            <Label>Chief Complaint & Circumstances of Injury *</Label>
            <Input
              value={admitPayload.chief_complaint || ""}
              onChange={(e) => setAdmitPayload({ ...admitPayload, chief_complaint: e.target.value })}
              placeholder="e.g. Unconscious male found on roadside, bleeding from forehead and ear, suspected RTA"
              className="mt-1 text-xs"
            />
          </div>

          {/* Initial Vitals Strip */}
          <div className="p-3 rounded-lg border border-border bg-muted/10 space-y-2">
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase">
              Rapid Vitals Baseline
            </Label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              <div>
                <span className="text-[10px] text-muted-foreground block">BP Systolic</span>
                <Input
                  type="number"
                  value={admitPayload.initial_vitals?.bp_systolic || ""}
                  onChange={(e) =>
                    setAdmitPayload({
                      ...admitPayload,
                      initial_vitals: {
                        ...admitPayload.initial_vitals,
                        bp_systolic: e.target.value ? Number(e.target.value) : undefined,
                      },
                    })
                  }
                  placeholder="mmHg"
                  className="text-xs h-7 mt-0.5"
                />
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">BP Diastolic</span>
                <Input
                  type="number"
                  value={admitPayload.initial_vitals?.bp_diastolic || ""}
                  onChange={(e) =>
                    setAdmitPayload({
                      ...admitPayload,
                      initial_vitals: {
                        ...admitPayload.initial_vitals,
                        bp_diastolic: e.target.value ? Number(e.target.value) : undefined,
                      },
                    })
                  }
                  placeholder="mmHg"
                  className="text-xs h-7 mt-0.5"
                />
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">Pulse (BPM)</span>
                <Input
                  type="number"
                  value={admitPayload.initial_vitals?.pulse || ""}
                  onChange={(e) =>
                    setAdmitPayload({
                      ...admitPayload,
                      initial_vitals: {
                        ...admitPayload.initial_vitals,
                        pulse: e.target.value ? Number(e.target.value) : undefined,
                      },
                    })
                  }
                  placeholder="bpm"
                  className="text-xs h-7 mt-0.5"
                />
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">SpO2 (%)</span>
                <Input
                  type="number"
                  value={admitPayload.initial_vitals?.spo2 || ""}
                  onChange={(e) =>
                    setAdmitPayload({
                      ...admitPayload,
                      initial_vitals: {
                        ...admitPayload.initial_vitals,
                        spo2: e.target.value ? Number(e.target.value) : undefined,
                      },
                    })
                  }
                  placeholder="%"
                  className="text-xs h-7 mt-0.5"
                />
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">Temp (°F)</span>
                <Input
                  type="number"
                  step="0.1"
                  value={admitPayload.initial_vitals?.temperature || ""}
                  onChange={(e) =>
                    setAdmitPayload({
                      ...admitPayload,
                      initial_vitals: {
                        ...admitPayload.initial_vitals,
                        temperature: e.target.value ? Number(e.target.value) : undefined,
                      },
                    })
                  }
                  placeholder="°F"
                  className="text-xs h-7 mt-0.5"
                />
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">Resp Rate (/min)</span>
                <Input
                  type="number"
                  value={admitPayload.initial_vitals?.respiratory_rate || ""}
                  onChange={(e) =>
                    setAdmitPayload({
                      ...admitPayload,
                      initial_vitals: {
                        ...admitPayload.initial_vitals,
                        respiratory_rate: e.target.value ? Number(e.target.value) : undefined,
                      },
                    })
                  }
                  placeholder="/min"
                  className="text-xs h-7 mt-0.5"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Allocation & Doctor */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>Attending Casualty Doctor</Label>
            <select
              value={admitPayload.doctor_id || ""}
              onChange={(e) =>
                setAdmitPayload({
                  ...admitPayload,
                  doctor_id: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1"
            >
              <option value="">Auto-assign Duty CMO</option>
              {doctorsList.map((doc: any) => (
                <option key={doc.id} value={doc.id}>
                  Dr. {doc.name} ({doc.specialization || "Casualty"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Immediate Bed Ward (Optional)</Label>
            <select
              value={selectedWardId || ""}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : undefined
                setSelectedWardId(val)
                setAdmitPayload({ ...admitPayload, ward_id: val, bed_id: undefined })
              }}
              className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1"
            >
              <option value="">Allocate Casualty Bay Bed</option>
              {wards.map((w: any) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Available Bed</Label>
            <select
              value={admitPayload.bed_id || ""}
              onChange={(e) =>
                setAdmitPayload({
                  ...admitPayload,
                  bed_id: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              disabled={!selectedWardId}
              className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1 disabled:opacity-50"
            >
              <option value="">Select Bed</option>
              {availableBeds.map((b: any) => (
                <option key={b.id} value={b.id}>
                  Bed #{b.bed_number}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* MLC (Medico-Legal Case) Intimation Section */}
        <div className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-purple-600" />
              <span className="font-bold text-xs uppercase tracking-wider text-purple-800 dark:text-purple-300">
                4. Medico-Legal Case (MLC) Police Intimation
              </span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={admitPayload.is_mlc}
                onChange={(e) => setAdmitPayload({ ...admitPayload, is_mlc: e.target.checked })}
                className="rounded border-input text-purple-600 focus:ring-purple-500 h-4 w-4"
              />
              <span className="text-xs font-bold text-purple-700 dark:text-purple-300">
                Register as MLC Case
              </span>
            </label>
          </div>

          {admitPayload.is_mlc && (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label>Police Station Jurisdiction</Label>
                  <Input
                    value={admitPayload.police_station || ""}
                    onChange={(e) => setAdmitPayload({ ...admitPayload, police_station: e.target.value })}
                    placeholder="e.g. Connaught Place PS"
                    className="mt-1 text-xs"
                  />
                </div>

                <div>
                  <Label>Reporting Police Officer</Label>
                  <Input
                    value={admitPayload.police_officer_name || ""}
                    onChange={(e) =>
                      setAdmitPayload({ ...admitPayload, police_officer_name: e.target.value })
                    }
                    placeholder="e.g. SI Kuldeep Singh"
                    className="mt-1 text-xs"
                  />
                </div>

                <div>
                  <Label>Officer Buckle / Badge No.</Label>
                  <Input
                    value={admitPayload.police_buckle_number || ""}
                    onChange={(e) =>
                      setAdmitPayload({ ...admitPayload, police_buckle_number: e.target.value })
                    }
                    placeholder="e.g. CP-4421"
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Place of Incident</Label>
                  <Input
                    value={admitPayload.incident_place || ""}
                    onChange={(e) => setAdmitPayload({ ...admitPayload, incident_place: e.target.value })}
                    placeholder="e.g. Outer Ring Road near Flyover"
                    className="mt-1 text-xs"
                  />
                </div>

                <div>
                  <Label>Nature & Location of Injuries</Label>
                  <Input
                    value={admitPayload.mlc_injuries_details || ""}
                    onChange={(e) =>
                      setAdmitPayload({ ...admitPayload, mlc_injuries_details: e.target.value })
                    }
                    placeholder="e.g. 5cm laceration on forehead, fracture right tibia"
                    className="mt-1 text-xs"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </FormContainer>
  )
}
