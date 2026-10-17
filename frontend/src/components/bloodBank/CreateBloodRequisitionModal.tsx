import React, { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  X,
  FileSpreadsheet,
  AlertOctagon,
  Search,
  User,
  Flame,
  CheckCircle2,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { bloodBankService } from "@/services/bloodBankService"
import { patientService } from "@/services/patientService"
import { doctorService } from "@/services/doctorService"
import { queryKeys } from "@/constants/queryKeys"
import type { BloodGroup, BloodComponentType, RequisitionUrgency } from "@/types/bloodBank"

interface CreateBloodRequisitionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export const CreateBloodRequisitionModal: React.FC<CreateBloodRequisitionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient()

  // Patient Search State
  const [patientSearch, setPatientSearch] = useState("")
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null)

  // Form Fields
  const [doctorId, setDoctorId] = useState<string>("")
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>("O+")
  const [componentNeeded, setComponentNeeded] = useState<BloodComponentType>("prbc")
  const [unitsRequested, setUnitsRequested] = useState<number>(1)
  const [urgency, setUrgency] = useState<RequisitionUrgency>("routine")
  const [clinicalIndication, setClinicalIndication] = useState("")
  const [hbLevel, setHbLevel] = useState<string>("8.2")
  const [dateNeeded, setDateNeeded] = useState("")
  const [waiverSigned, setWaiverSigned] = useState(false)

  // Query Patients
  const { data: patientsData, isLoading: searchingPatients } = useQuery({
    queryKey: queryKeys.patients.list({ search: patientSearch }),
    queryFn: () => patientService.getPatients({ search: patientSearch, limit: 5 }),
    enabled: patientSearch.length >= 2 && !selectedPatient,
  })

  // Query Doctors
  const { data: doctorsData } = useQuery({
    queryKey: queryKeys.doctors.list(),
    queryFn: () => doctorService.getDoctors({ page: 1, limit: 50 }),
    enabled: isOpen,
  })

  // Auto-set blood group if patient has one
  const handleSelectPatient = (patient: any) => {
    setSelectedPatient(patient)
    if (patient.blood_group) {
      setBloodGroup(patient.blood_group as BloodGroup)
    }
  }

  const createMutation = useMutation({
    mutationFn: () => {
      if (!selectedPatient) throw new Error("Please select an admitted or registered patient")
      if (!doctorId) throw new Error("Please select the ordering physician/doctor")
      if (urgency === "emergency_un_crossmatched" && !waiverSigned) {
        throw new Error("Emergency un-crossmatched release requires the Consultant Clinical Waiver to be checked.")
      }

      return bloodBankService.createRequisition({
        patient_id: selectedPatient.id,
        doctor_id: Number(doctorId),
        blood_group_needed: bloodGroup,
        component_needed: componentNeeded,
        units_requested: Number(unitsRequested),
        urgency,
        clinical_indication: clinicalIndication,
        hb_level: hbLevel ? Number(hbLevel) : undefined,
        date_needed: dateNeeded || undefined,
        emergency_consultant_waiver_signed: waiverSigned,
      })
    },
    onSuccess: (req) => {
      toast.success(
        `Blood Requisition ${req.requisition_number} created successfully! Crossmatch sample requested.`
      )
      queryClient.invalidateQueries({ queryKey: queryKeys.bloodBank.all })
      handleReset()
      onClose()
      if (onSuccess) onSuccess()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to create blood requisition")
    },
  })

  const handleReset = () => {
    setSelectedPatient(null)
    setPatientSearch("")
    setDoctorId("")
    setBloodGroup("O+")
    setComponentNeeded("prbc")
    setUnitsRequested(1)
    setUrgency("routine")
    setClinicalIndication("")
    setHbLevel("8.2")
    setDateNeeded("")
    setWaiverSigned(false)
  }

  if (!isOpen) return null

  const isEmergency = urgency === "emergency_un_crossmatched" || urgency === "mtp"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className={`px-6 py-4 flex items-center justify-between shadow-md text-white ${
          isEmergency
            ? "bg-gradient-to-r from-red-600 via-rose-600 to-orange-600 animate-pulse-subtle"
            : "bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-800"
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/15 backdrop-blur-md rounded-xl">
              {isEmergency ? (
                <Flame className="w-6 h-6 text-white" />
              ) : (
                <FileSpreadsheet className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">
                {isEmergency ? "EMERGENCY BLOOD REQUISITION / MTP" : "Order Blood & Components Requisition"}
              </h2>
              <p className="text-xs text-blue-100 flex items-center gap-2">
                <span>OT / ICU / Ward Transfusion Indent</span>
                <span>•</span>
                <span>Crossmatch & Pre-transfusion Testing</span>
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

        {/* Form Body */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            createMutation.mutate()
          }}
          className="flex-1 overflow-y-auto p-6 space-y-6"
        >
          {/* Section 1: Patient Selection */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              Recipient Patient Selection *
            </label>

            {selectedPatient ? (
              <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border border-blue-200 dark:border-blue-900 shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {selectedPatient.name}
                    </span>
                    <span className="text-xs font-mono bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                      {selectedPatient.uhid}
                    </span>
                    {selectedPatient.blood_group && (
                      <span className="text-xs font-bold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 px-2 py-0.5 rounded">
                        {selectedPatient.blood_group}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Gender: {selectedPatient.gender} • Age: {selectedPatient.age || "N/A"} • Phone: {selectedPatient.mobile || selectedPatient.phone || "N/A"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPatient(null)}
                  className="text-xs text-red-600 hover:text-red-700 font-semibold px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    placeholder="Search patient by UHID, full name, or mobile number..."
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {searchingPatients && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 p-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                    Searching patient directory...
                  </div>
                )}

                {patientsData?.data && patientsData.data.length > 0 && !selectedPatient && (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                    {patientsData.data.map((p: any) => (
                      <div
                        key={p.id}
                        onClick={() => handleSelectPatient(p)}
                        className="p-2.5 flex items-center justify-between hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer transition text-xs"
                      >
                        <div>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{p.name}</span>
                          <span className="ml-2 font-mono text-slate-500">({p.uhid})</span>
                          <span className="ml-2 text-slate-400">| {p.gender}, Age {p.age}</span>
                        </div>
                        <span className="text-blue-600 font-semibold">Select</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Urgency Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Clinical Urgency & Priority *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "routine", label: "Routine", desc: "4 - 6 Hours", color: "blue" },
                { id: "urgent", label: "Urgent", desc: "1 - 2 Hours", color: "amber" },
                { id: "emergency_un_crossmatched", label: "Emergency", desc: "Immediate (Uncrossmatched)", color: "red" },
                { id: "mtp", label: "MTP Protocol", desc: "Massive Bleed (1:1:1)", color: "rose" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setUrgency(opt.id as RequisitionUrgency)}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                    urgency === opt.id
                      ? opt.id === "emergency_un_crossmatched" || opt.id === "mtp"
                        ? "border-red-500 bg-red-50 dark:bg-red-950/30 ring-2 ring-red-500 text-red-950 dark:text-red-100"
                        : "border-blue-500 bg-blue-50 dark:bg-blue-950/30 ring-2 ring-blue-500 text-blue-950 dark:text-blue-100"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                  }`}
                >
                  <span className="font-bold text-xs">{opt.label}</span>
                  <span className="text-[10px] text-slate-500 mt-1">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Urgency Alert if Emergency */}
          {urgency === "emergency_un_crossmatched" && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 flex items-start gap-3">
              <AlertOctagon className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <p className="text-xs font-bold text-red-900 dark:text-red-200">
                  STAT EMERGENCY ISSUE PROTOCOL - O-NEGATIVE OR GROUP-SPECIFIC
                </p>
                <p className="text-[11px] text-red-800 dark:text-red-300">
                  Blood bank will release uncrossmatched units immediately under emergency waiver. Full cross-match testing will continue concurrently in the lab.
                </p>
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={waiverSigned}
                    onChange={(e) => setWaiverSigned(e.target.checked)}
                    className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                  />
                  <span className="text-xs font-semibold text-red-900 dark:text-red-100">
                    Consultant Physician Emergency Waiver Acknowledged & Signed *
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Section 3: Component & Blood Group */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Ordering Physician / Consultant *
              </label>
              <select
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Select Doctor</option>
                {doctorsData?.data?.map((doc: any) => (
                  <option key={doc.id} value={doc.id}>
                    Dr. {doc.name || doc.user?.name} ({doc.specialization || "General"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Target Blood Group *
              </label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value as BloodGroup)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as BloodGroup[]).map((grp) => (
                  <option key={grp} value={grp}>
                    {grp}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Blood Component *
              </label>
              <select
                value={componentNeeded}
                onChange={(e) => setComponentNeeded(e.target.value as BloodComponentType)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="prbc">Packed Red Blood Cells (PRBC)</option>
                <option value="ffp">Fresh Frozen Plasma (FFP)</option>
                <option value="platelets">Platelet Concentrate (RDP)</option>
                <option value="whole_blood">Whole Blood</option>
                <option value="cryo">Cryoprecipitate</option>
                <option value="sdp">Single Donor Platelet (SDP)</option>
              </select>
            </div>
          </div>

          {/* Section 4: Units & Clinical Indication */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Units Requested *
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={unitsRequested}
                onChange={(e) => setUnitsRequested(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Patient Current Hb (g/dL)
              </label>
              <input
                type="number"
                step="0.1"
                value={hbLevel}
                onChange={(e) => setHbLevel(e.target.value)}
                placeholder="e.g. 7.4"
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Required By (Date & Time)
              </label>
              <input
                type="datetime-local"
                value={dateNeeded}
                onChange={(e) => setDateNeeded(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Clinical Indication / Diagnosis / Surgical Procedure *
            </label>
            <input
              type="text"
              required
              value={clinicalIndication}
              onChange={(e) => setClinicalIndication(e.target.value)}
              placeholder="e.g. Postpartum hemorrhage (PPH) with active bleeding / Total knee replacement"
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Footer Controls */}
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
              disabled={createMutation.isPending}
              className={`px-6 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md flex items-center gap-2 transition ${
                isEmergency
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Placing Requisition...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Submit Blood Requisition
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
