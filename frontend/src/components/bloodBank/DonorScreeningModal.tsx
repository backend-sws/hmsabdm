import React, { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Stethoscope,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  HeartHandshake,
  SlidersHorizontal,
  Clock,
} from "lucide-react"

import { FormContainer } from "@/components/formContainer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

import { bloodBankService } from "@/services/bloodBankService"
import { queryKeys } from "@/constants/queryKeys"
import { ScreeningConfigModal } from "./ScreeningConfigModal"
import type { BloodDonor, ScreeningQuestionItem } from "@/types/bloodBank"

interface DonorScreeningModalProps {
  isOpen: boolean
  onClose: () => void
  donor: BloodDonor | null
  onSuccess?: () => void
}

export const DonorScreeningModal: React.FC<DonorScreeningModalProps> = ({
  isOpen,
  onClose,
  donor,
  onSuccess,
}) => {
  const queryClient = useQueryClient()

  // State to open configuration modal
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false)

  // Vitals
  const [weight, setWeight] = useState<number>(65)
  const [hemoglobin, setHemoglobin] = useState<number>(13.5)
  const [bpSystolic, setBpSystolic] = useState<number>(120)
  const [bpDiastolic, setBpDiastolic] = useState<number>(80)
  const [pulse, setPulse] = useState<number>(74)
  const [temperature, setTemperature] = useState<number>(37.0)

  // Dynamic Questionnaire responses map [question_id -> boolean]
  const [answers, setAnswers] = useState<Record<string, boolean>>({})

  // Phlebotomy Parameters
  const [volume, setVolume] = useState<number>(350)
  const [componentType, setComponentType] = useState<string>("whole_blood")
  const [bagType, setBagType] = useState<string>("triple")
  const [storageLocation, setStorageLocation] = useState<string>("Quarantine Fridge Q-1")
  const [signatureChecked, setSignatureChecked] = useState<boolean>(true)

  // 1. Fetch Dynamic Screening Configuration (Questions & Vital Limits)
  const { data: configData } = useQuery({
    queryKey: queryKeys.bloodBank.screeningConfig,
    queryFn: () => bloodBankService.getScreeningConfig(),
    enabled: isOpen,
  })

  // Dynamic vital limits (fallback to DGHS standard if not loaded yet)
  const vitalRules = configData?.vital_rules
  const minWeight = vitalRules?.min_weight_kg ?? 45.0
  const minHb = vitalRules?.min_hemoglobin_g_dl ?? 12.5
  const minSys = vitalRules?.min_bp_systolic ?? 100
  const maxSys = vitalRules?.max_bp_systolic ?? 140
  const minDia = vitalRules?.min_bp_diastolic ?? 60
  const maxDia = vitalRules?.max_bp_diastolic ?? 90
  const minPulse = vitalRules?.min_pulse ?? 60
  const maxPulse = vitalRules?.max_pulse ?? 100
  const maxTemp = vitalRules?.max_temperature ?? 37.5

  // Active Questions from Config
  const activeQuestions: ScreeningQuestionItem[] = (configData?.questions || [
    { id: "jaundice_hepatitis", label: "History of Jaundice, Hepatitis B or Hepatitis C", category: "Infectious", deferral_type: "permanent", is_active: true, is_custom: false },
    { id: "hiv_risk", label: "High risk exposure or history of HIV/AIDS", category: "Infectious", deferral_type: "permanent", is_active: true, is_custom: false },
    { id: "cardiac_disease", label: "Heart disease, chest pain, or cardiac surgery", category: "Cardiovascular", deferral_type: "permanent", is_active: true, is_custom: false },
    { id: "insulin_diabetes", label: "Diabetes Mellitus requiring daily insulin injections", category: "Metabolic", deferral_type: "permanent", is_active: true, is_custom: false },
    { id: "cancer_history", label: "History of Malignancy, Cancer, or Blood disorder", category: "Oncology", deferral_type: "permanent", is_active: true, is_custom: false },
    { id: "recent_malaria_3m", label: "Malaria, Dengue, or unexplained fever in last 3 months", category: "Vector-Borne", deferral_type: "temporary", deferral_days: 90, is_active: true, is_custom: false },
    { id: "tattoo_piercing_12m", label: "Tattoo, body piercing, or acupuncture in last 12 months", category: "High Risk", deferral_type: "temporary", deferral_days: 365, is_active: true, is_custom: false },
    { id: "surgery_6m", label: "Major dental or surgical operation in last 6 months", category: "Surgical", deferral_type: "temporary", deferral_days: 180, is_active: true, is_custom: false },
    { id: "alcohol_24h", label: "Alcohol consumption within the last 24 hours", category: "Lifestyle", deferral_type: "temporary", deferral_days: 1, is_active: true, is_custom: false },
    { id: "antibiotics_14d", label: "Antibiotics or immunosuppressant intake in last 14 days", category: "Medication", deferral_type: "temporary", deferral_days: 14, is_active: true, is_custom: false },
    { id: "pregnancy_lactation", label: "Pregnancy, abortion in 6 months, or active lactation", category: "Obstetric", deferral_type: "temporary", deferral_days: 180, is_active: true, is_custom: false },
  ]).filter((q) => q.is_active)

  // Live validation calculations based on active config
  const isHbLow = hemoglobin < minHb
  const isWeightLow = weight < minWeight
  const isBpAbnormal = bpSystolic < minSys || bpSystolic > maxSys || bpDiastolic < minDia || bpDiastolic > maxDia
  const isPulseAbnormal = pulse < minPulse || pulse > maxPulse
  const isTempHigh = temperature > maxTemp
  const hasMedicalDeferral = activeQuestions.some((q) => !!answers[q.id])

  const isEligiblePredicted =
    !isHbLow && !isWeightLow && !isBpAbnormal && !isPulseAbnormal && !isTempHigh && !hasMedicalDeferral

  const screeningMutation = useMutation({
    mutationFn: () => {
      if (!donor) throw new Error("No donor selected")
      if (!signatureChecked) throw new Error("Donor informed consent declaration is required")

      return bloodBankService.screenDonor(donor.id, {
        weight_kg: Number(weight),
        hemoglobin_g_dl: Number(hemoglobin),
        bp_systolic: Number(bpSystolic),
        bp_diastolic: Number(bpDiastolic),
        pulse: Number(pulse),
        temperature: Number(temperature),
        medical_history_answers: answers,
        donor_signature_data: "CONFIRMED_INFORMED_CONSENT_DIGITAL_STUB",
        component_type: componentType,
        volume_ml: Number(volume),
        bag_type: bagType,
        storage_location: storageLocation,
      })
    },
    meta: {
      errorTitle: "Donor Screening Deferral",
    },
    onSuccess: (res) => {
      if (res.eligible) {
        toast.success(`Screening passed! Blood unit ${res.blood_unit?.unit_barcode} created in Quarantine.`)
      } else {
        toast.warning(`Donor deferred: ${res.rejection_reason}`)
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.bloodBank.all })
      onClose()
      if (onSuccess) onSuccess()
    },
    onError: () => {
      // Invalidate queries so donor status is refreshed; mutationCache automatically displays formatted clinical error toast
      queryClient.invalidateQueries({ queryKey: queryKeys.bloodBank.all })
      onClose()
      if (onSuccess) onSuccess()
    },
  })

  const toggleAnswer = (key: string) => {
    setAnswers((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <>
      <FormContainer
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) onClose()
        }}
        title="Pre-Donation Medical Examination & Health Consent"
        description={`Clinical screening for Donor: ${donor?.name || "..."} (${donor?.blood_group})`}
        size="xl"
        footer={
          <div className="flex justify-between items-center w-full">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              className={`gap-2 text-white font-semibold transition ${
                isEligiblePredicted
                  ? "bg-rose-600 hover:bg-rose-700"
                  : "bg-amber-600 hover:bg-amber-700"
              }`}
              onClick={() => screeningMutation.mutate()}
              disabled={screeningMutation.isPending || !signatureChecked}
            >
              {isEligiblePredicted ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  {screeningMutation.isPending ? "Processing..." : "Approve & Collect Blood Bag"}
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4" />
                  {screeningMutation.isPending ? "Processing..." : "Submit Deferral Record"}
                </>
              )}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs font-sans">
          {/* Donor Banner */}
          {donor && (
            <div className="p-3 bg-muted/40 border rounded-xl flex items-center justify-between">
              <div>
                <div className="font-bold text-sm text-foreground flex items-center gap-2">
                  {donor.name}
                  <Badge className="bg-rose-600 text-white font-mono">{donor.blood_group}</Badge>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {donor.donor_number}
                  </Badge>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Age: {donor.age} • Gender: {donor.gender} • Type: <strong className="uppercase">{donor.donor_type}</strong>
                  {donor.patient_uhid && <span> • In Exchange For Patient: {donor.patient_uhid}</span>}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-muted-foreground uppercase block font-mono">Total Lifetime Donations</span>
                <span className="font-mono font-bold text-sm text-foreground">{donor.total_donations} Units</span>
              </div>
            </div>
          )}

          {/* Real-time Eligibility Status Banner */}
          <div
            className={`p-3 rounded-xl border flex items-center justify-between ${
              isEligiblePredicted
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-400"
                : "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-400"
            }`}
          >
            <div className="flex items-center gap-2">
              {isEligiblePredicted ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              )}
              <div>
                <div className="font-bold text-xs">
                  {isEligiblePredicted
                    ? "Donor Meets All Hospital Physical & Clinical Criteria"
                    : "Clinical Deferral Detected (Donor will be recorded as deferred)"}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {isHbLow && `• Hemoglobin < ${minHb} g/dL. `}
                  {isWeightLow && `• Weight < ${minWeight} kg. `}
                  {isBpAbnormal && `• Blood pressure outside ${minSys}-${maxSys}/${minDia}-${maxDia} mmHg. `}
                  {isPulseAbnormal && `• Pulse outside ${minPulse}-${maxPulse} bpm. `}
                  {isTempHigh && `• Temperature > ${maxTemp} °C. `}
                  {hasMedicalDeferral && "• Positive answer on past medical/lifestyle risk checklist."}
                </div>
              </div>
            </div>
            <Badge variant={isEligiblePredicted ? "default" : "destructive"}>
              {isEligiblePredicted ? "ELIGIBLE TO DONATE" : "DEFERRED"}
            </Badge>
          </div>

          {/* Section 1: Physical Examination & Vitals */}
          <div className="p-3 bg-card border rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <Stethoscope className="h-4 w-4 text-rose-600" />
                <span>1. Mandatory Physical Vitals (Checked On-the-Spot)</span>
              </div>
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(true)}
                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                title="Configure vital boundaries"
              >
                <SlidersHorizontal className="w-3 h-3" />
                Customize Thresholds
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              <div>
                <Label className="text-[11px] font-semibold">Weight (kg) *</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className={`mt-1 text-xs font-mono font-bold ${weight < minWeight ? "border-rose-500 text-rose-600" : ""}`}
                />
                <span className="text-[9px] text-muted-foreground block mt-0.5">Min: {minWeight} kg</span>
              </div>

              <div>
                <Label className="text-[11px] font-semibold">Hemoglobin (g/dL) *</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={hemoglobin}
                  onChange={(e) => setHemoglobin(Number(e.target.value))}
                  className={`mt-1 text-xs font-mono font-bold ${hemoglobin < minHb ? "border-rose-500 text-rose-600" : "text-emerald-600"}`}
                />
                <span className="text-[9px] text-muted-foreground block mt-0.5">Min: {minHb} g/dL</span>
              </div>

              <div>
                <Label className="text-[11px]">BP Systolic</Label>
                <Input
                  type="number"
                  value={bpSystolic}
                  onChange={(e) => setBpSystolic(Number(e.target.value))}
                  className={`mt-1 text-xs font-mono ${bpSystolic < minSys || bpSystolic > maxSys ? "border-rose-500 text-rose-600" : ""}`}
                />
                <span className="text-[9px] text-muted-foreground block mt-0.5">{minSys}-{maxSys} mmHg</span>
              </div>

              <div>
                <Label className="text-[11px]">BP Diastolic</Label>
                <Input
                  type="number"
                  value={bpDiastolic}
                  onChange={(e) => setBpDiastolic(Number(e.target.value))}
                  className={`mt-1 text-xs font-mono ${bpDiastolic < minDia || bpDiastolic > maxDia ? "border-rose-500 text-rose-600" : ""}`}
                />
                <span className="text-[9px] text-muted-foreground block mt-0.5">{minDia}-{maxDia} mmHg</span>
              </div>

              <div>
                <Label className="text-[11px]">Pulse Rate</Label>
                <Input
                  type="number"
                  value={pulse}
                  onChange={(e) => setPulse(Number(e.target.value))}
                  className={`mt-1 text-xs font-mono ${pulse < minPulse || pulse > maxPulse ? "border-rose-500 text-rose-600" : ""}`}
                />
                <span className="text-[9px] text-muted-foreground block mt-0.5">{minPulse}-{maxPulse} bpm</span>
              </div>

              <div>
                <Label className="text-[11px]">Temp (°C)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className={`mt-1 text-xs font-mono ${temperature > maxTemp ? "border-rose-500 text-rose-600" : ""}`}
                />
                <span className="text-[9px] text-muted-foreground block mt-0.5">&lt; {maxTemp} °C</span>
              </div>
            </div>
          </div>

          {/* Section 2: Configurable Past Medical History Declaration */}
          <div className="p-3 bg-card border rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-foreground">
                  2. Past Medical History & High-Risk Lifestyle Declaration
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  Select any condition that applies to donor ({activeQuestions.length} active questions)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(true)}
                className="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 rounded-md border border-indigo-200 dark:border-indigo-900 hover:bg-indigo-100 flex items-center gap-1 transition"
              >
                <SlidersHorizontal className="w-3 h-3" />
                + Add / Configure Questions
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 max-h-72 overflow-y-auto pr-1">
              {activeQuestions.map((q) => {
                const isChecked = !!answers[q.id]
                return (
                  <div
                    key={q.id}
                    onClick={() => toggleAnswer(q.id)}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between select-none transition-all ${
                      isChecked
                        ? "bg-rose-50/90 dark:bg-rose-950/40 border-rose-500 font-semibold text-rose-900 dark:text-rose-200 shadow-2xs"
                        : "bg-muted/30 hover:bg-muted text-foreground"
                    }`}
                  >
                    <div className="pr-2 min-w-0">
                      <span className="text-[11px] leading-tight block truncate">{q.label}</span>
                      <div className="flex items-center gap-1.5 mt-1 text-[9px]">
                        <span className="text-muted-foreground">{q.category}</span>
                        {q.deferral_type === "permanent" ? (
                          <span className="text-rose-600 font-bold">• Permanent</span>
                        ) : (
                          <span className="text-amber-600 font-medium flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {q.deferral_days ? `${q.deferral_days}d` : "Temp"}
                          </span>
                        )}
                        {q.is_custom && (
                          <span className="text-indigo-600 font-semibold">• Custom</span>
                        )}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="h-4 w-4 rounded accent-rose-600 shrink-0"
                    />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Section 3: Phlebotomy Collection Parameters (If eligible) */}
          {isEligiblePredicted && (
            <div className="p-3 bg-muted/30 border rounded-xl space-y-3">
              <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                <HeartHandshake className="h-4 w-4 text-rose-600" />
                <span>3. Phlebotomy Collection Parameters</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <Label className="text-[11px]">Bag Volume</Label>
                  <select
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="w-full text-xs rounded-md border border-input bg-background px-2.5 py-1.5 mt-1 font-mono font-semibold"
                  >
                    <option value={350}>350 mL (Standard)</option>
                    <option value={450}>450 mL (If weight &gt; 55kg)</option>
                  </select>
                </div>

                <div>
                  <Label className="text-[11px]">Component Type</Label>
                  <select
                    value={componentType}
                    onChange={(e) => setComponentType(e.target.value)}
                    className="w-full text-xs rounded-md border border-input bg-background px-2.5 py-1.5 mt-1 font-semibold"
                  >
                    <option value="whole_blood">Whole Blood (WB)</option>
                    <option value="platelets">Platelet Concentrate</option>
                    <option value="sdp">Single Donor Platelet (SDP)</option>
                  </select>
                </div>

                <div>
                  <Label className="text-[11px]">Blood Bag Type</Label>
                  <select
                    value={bagType}
                    onChange={(e) => setBagType(e.target.value)}
                    className="w-full text-xs rounded-md border border-input bg-background px-2.5 py-1.5 mt-1 font-semibold"
                  >
                    <option value="triple">Triple Bag (with SAGM)</option>
                    <option value="quadruple">Quadruple Bag (with SAGM)</option>
                    <option value="double">Double Bag</option>
                    <option value="single">Single Bag (Whole Blood)</option>
                    <option value="apheresis">Apheresis Kit</option>
                  </select>
                </div>

                <div>
                  <Label className="text-[11px]">Storage Target</Label>
                  <input
                    type="text"
                    value={storageLocation}
                    onChange={(e) => setStorageLocation(e.target.value)}
                    className="w-full text-xs rounded-md border border-input bg-background px-2.5 py-1.5 mt-1 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Statutory Informed Consent */}
          <div className="p-3 bg-muted/40 border rounded-xl space-y-1">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={signatureChecked}
                onChange={(e) => setSignatureChecked(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded accent-rose-600"
              />
              <span className="text-[11px] text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Statutory Informed Consent:</strong> I confirm that I have answered all questions truthfully and understand that my blood will be screened for HIV, Hepatitis B/C, Syphilis, and Malaria. I authorize Metro Hospital Blood Bank to separate components, store, and transfuse this donation to any needy patient.
              </span>
            </label>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-1">
              <ShieldCheck className="h-3.5 w-3.5 text-sky-600" />
              <span>Digital Audit Fingerprint logged by Medical Officer</span>
            </div>
          </div>
        </div>
      </FormContainer>

      {/* Protocol & Questionnaire Configuration Modal */}
      <ScreeningConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
      />
    </>
  )
}
