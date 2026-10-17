import React, { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  X,
  AlertTriangle,
  Search,
  ShieldAlert,
  Loader2,
  Barcode,
} from "lucide-react"
import { toast } from "sonner"
import { bloodBankService } from "@/services/bloodBankService"
import { patientService } from "@/services/patientService"
import { queryKeys } from "@/constants/queryKeys"
import type { ReactionType } from "@/types/bloodBank"

interface HemovigilanceReactionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export const HemovigilanceReactionModal: React.FC<HemovigilanceReactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient()

  // Patient search
  const [patientSearch, setPatientSearch] = useState("")
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null)

  // Unit barcode or ID
  const [unitBarcode, setUnitBarcode] = useState("")
  const [bloodUnitId, setBloodUnitId] = useState<number | null>(null)

  // Clinical data
  const [transfusionStartedAt, setTransfusionStartedAt] = useState("")
  const [reactionOccurredAt, setReactionOccurredAt] = useState("")
  const [volumeTransfused, setVolumeTransfused] = useState<number>(50)
  const [reactionType, setReactionType] = useState<ReactionType>("febrile_non_hemolytic")
  const [severity, setSeverity] = useState<"mild" | "moderate" | "severe" | "life_threatening" | "fatal">("moderate")
  const [symptoms, setSymptoms] = useState("")
  const [actionTaken, setActionTaken] = useState(
    "Transfusion stopped immediately. IV line flushed with 0.9% Normal Saline. Doctor notified. Antihistamine & steroid administered. Remnant blood bag sent to Blood Bank."
  )
  const [remnantBagReturned, setRemnantBagReturned] = useState(true)

  // Query Patients
  const { data: patientsData } = useQuery({
    queryKey: queryKeys.patients.list({ search: patientSearch }),
    queryFn: () => patientService.getPatients({ search: patientSearch, limit: 5 }),
    enabled: patientSearch.length >= 2 && !selectedPatient,
  })

  // Query units to match barcode
  const { data: unitsData } = useQuery({
    queryKey: queryKeys.bloodBank.units({ search: unitBarcode }),
    queryFn: () => bloodBankService.getBloodUnits({ search: unitBarcode, per_page: 5 }),
    enabled: unitBarcode.length >= 4 && !bloodUnitId,
  })

  const reactionMutation = useMutation({
    mutationFn: () => {
      if (!selectedPatient) throw new Error("Please select the recipient patient")
      if (!bloodUnitId) throw new Error("Please select or specify the transfused blood unit barcode")
      if (!symptoms.trim()) throw new Error("Please describe the clinical symptoms observed")

      return bloodBankService.recordReaction({
        patient_id: selectedPatient.id,
        blood_unit_id: bloodUnitId,
        transfusion_started_at: transfusionStartedAt || undefined,
        reaction_occurred_at: reactionOccurredAt || undefined,
        volume_transfused_ml: Number(volumeTransfused),
        reaction_type: reactionType,
        severity,
        clinical_symptoms: symptoms.trim(),
        action_taken: actionTaken.trim(),
        remnant_bag_returned: remnantBagReturned,
      })
    },
    onSuccess: () => {
      toast.warning(
        "Adverse transfusion reaction logged to HvPI registry! Companion donor units automatically quarantined."
      )
      queryClient.invalidateQueries({ queryKey: queryKeys.bloodBank.all })
      handleReset()
      onClose()
      if (onSuccess) onSuccess()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to log transfusion reaction")
    },
  })

  const handleReset = () => {
    setSelectedPatient(null)
    setPatientSearch("")
    setUnitBarcode("")
    setBloodUnitId(null)
    setSymptoms("")
    setVolumeTransfused(50)
    setReactionType("febrile_non_hemolytic")
    setSeverity("moderate")
    setRemnantBagReturned(true)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-red-700 via-rose-800 to-amber-700 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/15 backdrop-blur-md rounded-xl">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">
                Hemovigilance Adverse Transfusion Reaction (HvPI)
              </h2>
              <p className="text-xs text-red-100 flex items-center gap-2">
                <span>National Hemovigilance Programme of India</span>
                <span>•</span>
                <span>Pharmacovigilance & Transfusion Safety</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="bg-red-50 dark:bg-red-950/40 border-b border-red-200 dark:border-red-900 px-6 py-2.5 text-xs text-red-900 dark:text-red-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>
            Immediate quarantine protocol: Submitting this report triggers an automatic safety lockdown on all co-components derived from this donor unit.
          </span>
        </div>

        {/* Form Body */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            reactionMutation.mutate()
          }}
          className="flex-1 overflow-y-auto p-6 space-y-6"
        >
          {/* Section 1: Patient Selection */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              1. Patient Identification *
            </label>
            {selectedPatient ? (
              <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    {selectedPatient.name}
                  </span>
                  <span className="ml-2 font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">
                    {selectedPatient.uhid}
                  </span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Blood Group: {selectedPatient.blood_group || "Unknown"} • {selectedPatient.gender}, Age {selectedPatient.age}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPatient(null)}
                  className="text-xs text-red-600 font-semibold"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  placeholder="Search recipient patient by name or UHID..."
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500 outline-none"
                />
                {patientsData?.data && patientsData.data.length > 0 && !selectedPatient && (
                  <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900 shadow-md">
                    {patientsData.data.map((p: any) => (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPatient(p)}
                        className="p-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-xs"
                      >
                        <span className="font-semibold">{p.name} ({p.uhid})</span>
                        <span className="text-red-600 font-bold">Select</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Blood Unit Selection */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              2. Implicated Blood Unit Barcode *
            </label>
            {bloodUnitId ? (
              <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Barcode className="w-4 h-4 text-slate-500" />
                  <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                    {unitBarcode}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setBloodUnitId(null)
                    setUnitBarcode("")
                  }}
                  className="text-xs text-red-600 font-semibold"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={unitBarcode}
                  onChange={(e) => setUnitBarcode(e.target.value)}
                  placeholder="Scan or type Unit Barcode (e.g. BAG-2026-00001)..."
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500 outline-none"
                />
                {unitsData?.data && unitsData.data.length > 0 && !bloodUnitId && (
                  <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900 shadow-md">
                    {unitsData.data.map((u: any) => (
                      <div
                        key={u.id}
                        onClick={() => {
                          setBloodUnitId(u.id)
                          setUnitBarcode(u.unit_barcode)
                        }}
                        className="p-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-xs"
                      >
                        <span className="font-mono font-bold">{u.unit_barcode}</span>
                        <span className="text-slate-500">{u.blood_group} • {u.component_type}</span>
                        <span className="text-red-600 font-bold">Select Unit</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 3: Reaction Classification & Severity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Reaction Type (HvPI Category) *
              </label>
              <select
                value={reactionType}
                onChange={(e) => setReactionType(e.target.value as ReactionType)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500 outline-none"
              >
                <option value="febrile_non_hemolytic">FNHTR (Febrile Non-Hemolytic)</option>
                <option value="allergic">Allergic (Urticaria / Itching)</option>
                <option value="acute_hemolytic">AHTR (Acute Hemolytic Transfusion Reaction)</option>
                <option value="anaphylactic">Anaphylactic / Severe Allergic</option>
                <option value="trali">TRALI (Transfusion-Related Acute Lung Injury)</option>
                <option value="taco">TACO (Transfusion-Associated Circulatory Overload)</option>
                <option value="sepsis">Transfusion Transmitted Bacterial Sepsis</option>
                <option value="other">Other Adverse Event</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Severity Grade *
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as any)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500 outline-none"
              >
                <option value="mild">Grade 1: Mild (Transient, no vital compromise)</option>
                <option value="moderate">Grade 2: Moderate (Required pharmacological intervention)</option>
                <option value="severe">Grade 3: Severe (ICU admission / Intubation / Vasopressors)</option>
                <option value="life_threatening">Grade 4: Life Threatening</option>
                <option value="fatal">Grade 5: Fatal Transfusion Outcome</option>
              </select>
            </div>
          </div>

          {/* Section 4: Timestamps & Volume */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Transfusion Started At
              </label>
              <input
                type="datetime-local"
                value={transfusionStartedAt}
                onChange={(e) => setTransfusionStartedAt(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Reaction Noticed At
              </label>
              <input
                type="datetime-local"
                value={reactionOccurredAt}
                onChange={(e) => setReactionOccurredAt(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Volume Transfused (mL)
              </label>
              <input
                type="number"
                value={volumeTransfused}
                onChange={(e) => setVolumeTransfused(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>
          </div>

          {/* Section 5: Symptoms & Actions */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Clinical Signs & Symptoms Observed *
              </label>
              <textarea
                required
                rows={2}
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="e.g. Temperature rose from 98.6°F to 102.4°F with severe shivering, dyspnea, and back ache..."
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Immediate Clinical Interventions & Actions Taken *
              </label>
              <textarea
                required
                rows={2}
                value={actionTaken}
                onChange={(e) => setActionTaken(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900/50">
              <input
                type="checkbox"
                id="remnant"
                checked={remnantBagReturned}
                onChange={(e) => setRemnantBagReturned(e.target.checked)}
                className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
              />
              <label htmlFor="remnant" className="text-xs font-semibold text-amber-900 dark:text-amber-200 cursor-pointer">
                Remnant blood bag along with transfusion set returned to Blood Bank for culture & repeat crossmatch
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={reactionMutation.isPending}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 shadow-md flex items-center gap-2 transition"
            >
              {reactionMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Logging Reaction...
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4" />
                  Submit HvPI Adverse Reaction Report
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
