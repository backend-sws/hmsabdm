import React, { useState, useEffect, useMemo, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Stethoscope,
  ArrowLeft,
  CheckCircle2,
  Plus,
  Trash2,
  Search,
  Activity,
  Pill,
  CalendarCheck,
  History,
  RefreshCw,
  Edit3,
  Heart,
  Thermometer,
  Wind,
  Droplet,
  AlertCircle,
  Scale,
  Cigarette,
  Apple,
  Building2,
  Clock,
  UserCheck,
  Sliders,
  ShieldAlert,
  Printer,
  Sparkles,
  AlertTriangle,
  Loader2,
  Check,
  FlaskConical,
  X,
  Save,
  FileText,
  Eye,
  Calendar,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { useAuth } from "@/context/AuthContext"
import { opdService } from "@/services/opdService"
import { patientService } from "@/services/patientService"
import { settingsService } from "@/services/settingsService"
import { queryKeys } from "@/constants/queryKeys"
import { formatPatientAge, formatPatientGender } from "@/utils/patientUtils"
import { VitalAuditModal } from "./VitalAuditModal"
import { PrescriptionPrintModal } from "./PrescriptionPrintModal"
import { SaveRxPresetModal } from "./SaveRxPresetModal"
import { PastVisitDetailModal } from "./PastVisitDetailModal"
import { rxPresetService } from "@/services/rxPresetService"
import type {
  OpdVisit,
  PrescriptionItem,
  DiagnosisResult,
  MedicineResult,
  InvestigationResult,
  SavePrescriptionPayload,
  VitalRecord,
} from "@/types/opd"

import {
  FREQUENCY_OPTIONS,
  ROUTE_OPTIONS,
  detectMedicineFormAndDosage,
  GLOBAL_DOSAGE_OPTIONS,
  COMMON_ICD_PRESETS,
  COMMON_INVESTIGATION_PRESETS,
  COMMON_CHIEF_COMPLAINTS,
} from "@/constants/clinical.constants"

export { detectMedicineFormAndDosage } from "@/constants/clinical.constants"

interface DoctorConsultationWorkstationViewProps {
  visit: OpdVisit
  onBack: () => void
  onSuccess?: () => void
}

export const DoctorConsultationWorkstationView: React.FC<DoctorConsultationWorkstationViewProps> = ({
  visit,
  onBack,
  onSuccess,
}) => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const visitId = Number(visit.id || visit.visit_id || 0)
  const patientId = Number(visit.patient_id || visit.patient?.id || 0)
  const patient = visit.patient || ({} as any)

  // ─── 0. FETCH EXISTING PRESCRIPTION (DRAFT OR PREVIOUSLY SIGNED) ────
  const { data: existingRxData } = useQuery({
    queryKey: ["opd", "visit-prescription", visitId],
    queryFn: () => opdService.getVisitPrescription(visitId),
    enabled: Boolean(visitId > 0),
    staleTime: 0,
  })
  const existingRx = existingRxData as any

  const [existingRxId, setExistingRxId] = useState<number | null>(null)
  const [rxStatus, setRxStatus] = useState<"draft" | "active" | null>(null)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const hasLoadedExistingRxRef = useRef(false)

  // ─── 1. FETCH VISIT VITALS & AUDIT ──────────────────────────────────
  const { data: visitVitalsList = [], refetch: refetchVitals } = useQuery({
    queryKey: queryKeys.opd.visitVitals(visitId),
    queryFn: () => opdService.getVisitVitals(visitId),
    enabled: Boolean(visitId > 0),
    staleTime: 0,
    refetchOnMount: true,
  })

  const currentVital: VitalRecord | undefined =
    visitVitalsList?.[0] ||
    (visit as any)?.latestVital ||
    (visit as any)?.latest_vital ||
    (visit as any)?.vitals?.[0] ||
    (visit as any)?.patient?.latestVital
  const custom = currentVital?.custom_vitals || {}
  const triageStaff = currentVital?.recordedByUser

  // Hospital Triage Settings for resolving custom section titles & field labels
  const { data: triageSettingsData } = useQuery({
    queryKey: ["hospital", "settings", "triage_sections"],
    queryFn: () => settingsService.getSettings("triage_sections"),
    staleTime: 60000,
  })
  const triageConfig = (triageSettingsData?.value || triageSettingsData) as any

  // Audit modal
  const [auditModalOpen, setAuditModalOpen] = useState(false)

  // Visit-by-visit comparison toggle
  const [showHistoryCompare, setShowHistoryCompare] = useState(false)
  const [showAllPastVisits, setShowAllPastVisits] = useState(false)
  const [selectedPastVisitModal, setSelectedPastVisitModal] = useState<{
    visit: any
    prescription: any
  } | null>(null)
  const [pastVisitPrintData, setPastVisitPrintData] = useState<{
    visit: any
    vital: any
    prescriptionData: any
  } | null>(null)

  // Fetch full patient history for visit-by-visit comparison
  const { data: historyData } = useQuery({
    queryKey: ["patient", patientId, "history"],
    queryFn: () => patientService.getPatientHistory(patientId),
    enabled: Boolean(patientId > 0),
  })
  const history = historyData?.data || historyData || {}
  const pastOpdVisits = Array.isArray(history.opd_visits)
    ? history.opd_visits.filter((v: any) => v.id !== visitId)
    : []

  // ─── 2. DOCTOR QUICK IN-CABIN VITALS EDIT / RE-CHECK ────────────────
  const [isEditingVitals, setIsEditingVitals] = useState(false)
  const [doctorSbp, setDoctorSbp] = useState(currentVital?.blood_pressure_sys ? String(currentVital.blood_pressure_sys) : "")
  const [doctorDbp, setDoctorDbp] = useState(currentVital?.blood_pressure_dia ? String(currentVital.blood_pressure_dia) : "")
  const [doctorPulse, setDoctorPulse] = useState(currentVital?.pulse_rate ? String(currentVital.pulse_rate) : "")
  const [doctorTemp, setDoctorTemp] = useState(currentVital?.temperature ? String(currentVital.temperature) : "")
  const [doctorSpo2, setDoctorSpo2] = useState(currentVital?.oxygen_saturation ? String(currentVital.oxygen_saturation) : "")

  // Sync state if vitals load later
  useEffect(() => {
    if (currentVital) {
      if (currentVital.blood_pressure_sys) setDoctorSbp(String(currentVital.blood_pressure_sys))
      if (currentVital.blood_pressure_dia) setDoctorDbp(String(currentVital.blood_pressure_dia))
      if (currentVital.pulse_rate) setDoctorPulse(String(currentVital.pulse_rate))
      if (currentVital.temperature) setDoctorTemp(String(currentVital.temperature))
      if (currentVital.oxygen_saturation) setDoctorSpo2(String(currentVital.oxygen_saturation))
    }
  }, [currentVital])

  const saveDoctorVitalsMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        patient_id: patientId,
        opd_visit_id: visitId,
        blood_pressure_sys: doctorSbp ? parseInt(doctorSbp, 10) : undefined,
        blood_pressure_dia: doctorDbp ? parseInt(doctorDbp, 10) : undefined,
        pulse_rate: doctorPulse ? parseInt(doctorPulse, 10) : undefined,
        temperature: doctorTemp ? parseFloat(doctorTemp) : undefined,
        oxygen_saturation: doctorSpo2 ? parseFloat(doctorSpo2) : undefined,
        custom_vitals: {
          ...custom,
          rechecked_by_doctor: user?.name,
          rechecked_at: new Date().toISOString(),
        },
      }
      if (currentVital?.id) {
        return opdService.updateVital(currentVital.id, payload)
      } else {
        return opdService.recordVitals(payload)
      }
    },
    onSuccess: () => {
      toast.success("Cabin vitals re-checked and updated!")
      setIsEditingVitals(false)
      refetchVitals()
      queryClient.invalidateQueries({ queryKey: queryKeys.opd.queue })
    },
  })

  // ─── 3. CLINICAL EXAMINATION & NOTES ────────────────────────────────
  const [chiefComplaints, setChiefComplaints] = useState<string[]>(() => {
    const raw = custom.symptoms || visit.chief_complaint || visit.visit_reason || ""
    if (Array.isArray(raw)) return raw.filter(Boolean)
    if (typeof raw === "string" && raw.trim()) {
      return raw.split(/;\s*|,\s*|\n/).map((s: string) => s.trim()).filter(Boolean)
    }
    return []
  })
  const [complaintInput, setComplaintInput] = useState<string>("")

  const handleAddComplaint = (val?: string) => {
    const text = (val !== undefined ? val : complaintInput).trim()
    if (!text) return
    const items = text.split(/;\s*|,\s*|\n/).map((s) => s.trim()).filter(Boolean)
    setChiefComplaints((prev) => Array.from(new Set([...prev, ...items])))
    if (val === undefined) setComplaintInput("")
  }

  const handleRemoveComplaint = (index: number) => {
    setChiefComplaints((prev) => prev.filter((_, idx) => idx !== index))
  }
  const [clinicalNotes, setClinicalNotes] = useState<string>(visit.notes || "")
  const [cvsExam, setCvsExam] = useState<string>("S1 S2 Normal, No murmurs")
  const [rsExam, setRsExam] = useState<string>("B/L Air Entry Equal, Clear")
  const [cnsExam, setCnsExam] = useState<string>("Conscious, Oriented to Time, Place & Person")
  const [paExam, setPaExam] = useState<string>("Soft, Non-tender, No organomegaly")

  // ─── 4. WHO ICD-10 DIAGNOSES (94,765 CODES DATABASE) ───────────────
  const [diagnoses, setDiagnoses] = useState<DiagnosisResult[]>([])
  const [diagQuery, setDiagQuery] = useState("")
  const [diagSuggestions, setDiagSuggestions] = useState<DiagnosisResult[]>([])
  const [isSearchingDiag, setIsSearchingDiag] = useState(false)
  const [showDiagDropdown, setShowDiagDropdown] = useState(false)
  const diagTimeoutRef = useRef<any>(null)

  const handleDiagSearch = (q: string) => {
    setDiagQuery(q)
    if (diagTimeoutRef.current) clearTimeout(diagTimeoutRef.current)
    if (q.trim().length < 2) {
      setDiagSuggestions([])
      setIsSearchingDiag(false)
      setShowDiagDropdown(false)
      return
    }
    setIsSearchingDiag(true)
    setShowDiagDropdown(true)
    diagTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await opdService.searchDiagnosis(q)
        setDiagSuggestions(results)
      } catch (err) {
        console.error("Failed to search ICD-10 diagnoses", err)
      } finally {
        setIsSearchingDiag(false)
      }
    }, 200)
  }

  const addDiagnosisItem = (d: DiagnosisResult | any) => {
    const code = d.code_with_separator || d.code
    const name = d.name || d.short_description || d.description || code
    if (!diagnoses.some((x) => x.code === code)) {
      setDiagnoses((prev) => [...prev, { ...d, code, name }])
    }
    setDiagQuery("")
    setDiagSuggestions([])
    setShowDiagDropdown(false)
  }

  // ─── 5. INVESTIGATION ORDERS (LAB, RAD & CARDIO CATALOG) ─────────────
  const [investigations, setInvestigations] = useState<
    Array<{ name: string; category: string; urgency: "Routine" | "Urgent" | "STAT"; code?: string; standard_rate?: number }>
  >([])
  const [invInput, setInvInput] = useState("")
  const [invCategory, setInvCategory] = useState("All")
  const [invUrgency, setInvUrgency] = useState<"Routine" | "Urgent" | "STAT">("Routine")
  const [invSuggestions, setInvSuggestions] = useState<InvestigationResult[]>([])
  const [isSearchingInv, setIsSearchingInv] = useState(false)
  const [showInvDropdown, setShowInvDropdown] = useState(false)
  const invTimeoutRef = useRef<any>(null)

  const handleInvSearch = (q: string, cat: string = invCategory) => {
    setInvInput(q)
    if (invTimeoutRef.current) clearTimeout(invTimeoutRef.current)
    if (!q || q.trim().length < 2) {
      setInvSuggestions([])
      setIsSearchingInv(false)
      setShowInvDropdown(false)
      return
    }
    setIsSearchingInv(true)
    setShowInvDropdown(true)
    invTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await opdService.searchInvestigations(q, cat)
        setInvSuggestions(results)
      } catch (err) {
        console.error("Failed to search investigations", err)
      } finally {
        setIsSearchingInv(false)
      }
    }, 200)
  }

  const addInvestigation = (
    name: string,
    category: string = invCategory === "All" ? "Pathology" : invCategory,
    urgency: "Routine" | "Urgent" | "STAT" = invUrgency,
    code?: string,
    rate?: number
  ) => {
    if (!name.trim()) return
    const resolvedCat = category === "All" ? "Pathology" : category
    setInvestigations((prev) => [
      ...prev,
      { name: name.trim(), category: resolvedCat, urgency, code, standard_rate: rate },
    ])
    setInvInput("")
    setInvSuggestions([])
    setShowInvDropdown(false)
  }

  // ─── 6. E-PRESCRIPTION MEDICATIONS (200,000 MEDICINES MASTER) ─────────
  const [medicines, setMedicines] = useState<PrescriptionItem[]>([
    { medicine_name: "", dosage: "1 tab", frequency: "BD", duration: "5 days", route: "Oral", instructions: "After meals" },
  ])
  const [customDosageRows, setCustomDosageRows] = useState<Record<number, boolean>>({})
  const [activeMedRow, setActiveMedRow] = useState<number | null>(null)
  const [medSuggestions, setMedSuggestions] = useState<MedicineResult[]>([])
  const [isSearchingMed, setIsSearchingMed] = useState(false)
  const medTimeoutRef = useRef<any>(null)

  const handleMedNameChange = (val: string, index: number) => {
    // If dosage was default "1 tab" and doctor types syrup or inhaler, auto-tune default dosage
    setMedicines((prev) =>
      prev.map((m, i) => {
        if (i === index) {
          const updated: PrescriptionItem = { ...m, medicine_name: val }
          if (m.dosage === "1 tab" || m.dosage === "") {
            const detected = detectMedicineFormAndDosage(val, "")
            if (detected.type !== "Tablet") {
              updated.dosage = detected.defaultDosage
              updated.route = detected.defaultRoute
            }
          }
          return updated
        }
        return m
      })
    )
    setActiveMedRow(index)
    if (medTimeoutRef.current) clearTimeout(medTimeoutRef.current)
    if (!val || val.trim().length < 2) {
      setMedSuggestions([])
      setIsSearchingMed(false)
      return
    }
    setIsSearchingMed(true)
    medTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await opdService.searchMedicines(val)
        setMedSuggestions(results)
      } catch (err) {
        console.error("Failed to search medicines", err)
      } finally {
        setIsSearchingMed(false)
      }
    }, 200)
  }

  const handleSelectMedicine = (med: MedicineResult, index: number) => {
    const brandName = med.brand_name || med.name
    const detected = detectMedicineFormAndDosage(brandName, med.dosage_form)

    setMedicines((prev) =>
      prev.map((m, i) => {
        if (i === index) {
          return {
            ...m,
            medicine_id: med.id,
            medicine_name: brandName,
            dosage: detected.defaultDosage,
            route: detected.defaultRoute,
            instructions: detected.defaultInstructions || m.instructions || "After meals",
          }
        }
        return m
      })
    )
    // Reset custom dosage input mode for this row so it displays the detected dropdown option cleanly
    setCustomDosageRows((prev) => ({ ...prev, [index]: false }))
    setActiveMedRow(null)
    setMedSuggestions([])
  }

  // Close all autocomplete popups when clicking anywhere outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest(".autocomplete-dropdown-container")) {
        setShowDiagDropdown(false)
        setShowInvDropdown(false)
        setActiveMedRow(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // ─── 7. ADVICE & FOLLOW-UP ──────────────────────────────────────────
  const [advice, setAdvice] = useState<string>("")
  const [followUpDate, setFollowUpDate] = useState<string>("")

  // ─── 7.5 PATIENT DISPOSITION & NEXT ACTION ──────────────────────────
  const [disposition, setDisposition] = useState<"home" | "day_care" | "admit_ipd">("home")
  const [dispositionNotes, setDispositionNotes] = useState<string>("")
  const [admitPriority, setAdmitPriority] = useState<"routine" | "urgent" | "emergency">("routine")
  const [recommendedWard, setRecommendedWard] = useState<string>("")

  const setShortcutFollowUp = (days: number) => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    setFollowUpDate(d.toISOString().substring(0, 10))
  }

  // ─── 8. SAVE & COMPLETE CONSULTATION ────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [printModalOpen, setPrintModalOpen] = useState(false)
  const [closeAfterPrint, setCloseAfterPrint] = useState(false)

  // ─── 8. 3-TIER DYNAMIC RX PRESETS (MY PRESETS / DEPT / HOSPITAL) ───
  const [savePresetModalOpen, setSavePresetModalOpen] = useState(false)
  const [presetScopeTab, setPresetScopeTab] = useState<"all" | "doctor" | "department" | "hospital">("all")

  const { data: allRxPresets = [] } = useQuery({
    queryKey: ["settings", "rx_presets"],
    queryFn: () => rxPresetService.getPresets(),
  })

  const currentDoctorId = Number(visit.doctor_id || visit.doctor?.id || user?.id || 0)
  const currentDoctorName = visit.doctor_name || visit.doctor?.name || user?.name || ""
  const currentDeptId = Number(visit.department_id || visit.department?.id || 0)
  const currentDeptName = visit.department_name || visit.department?.name || (user as any)?.department || ""

  const myPresets = useMemo(() => {
    return allRxPresets.filter(
      (p) =>
        p.scope === "doctor" &&
        (Number(p.doctor_id) === currentDoctorId ||
          (p.doctor_name && currentDoctorName && p.doctor_name.toLowerCase().includes(currentDoctorName.toLowerCase())) ||
          (currentDoctorName && p.name.toLowerCase().includes(currentDoctorName.toLowerCase())))
    )
  }, [allRxPresets, currentDoctorId, currentDoctorName])

  const deptPresets = useMemo(() => {
    return allRxPresets.filter(
      (p) =>
        p.scope === "department" &&
        (Number(p.department_id) === currentDeptId ||
          !currentDeptName ||
          (p.department_name && currentDeptName && (
            p.department_name.toLowerCase().includes(currentDeptName.toLowerCase()) ||
            currentDeptName.toLowerCase().includes(p.department_name.toLowerCase())
          )))
    )
  }, [allRxPresets, currentDeptId, currentDeptName])

  const hospitalPresets = useMemo(() => {
    return allRxPresets.filter((p) => p.scope === "hospital")
  }, [allRxPresets])

  const displayedPresets = useMemo(() => {
    if (presetScopeTab === "doctor") return myPresets
    if (presetScopeTab === "department") return deptPresets
    if (presetScopeTab === "hospital") return hospitalPresets
    return [...myPresets, ...deptPresets, ...hospitalPresets]
  }, [presetScopeTab, myPresets, deptPresets, hospitalPresets])

  // ─── 8. PRE-FILL FROM EXISTING PRESCRIPTION (IF EDITING OR DRAFT) ───
  useEffect(() => {
    if (!existingRx || hasLoadedExistingRxRef.current) return

    if (existingRx.id) {
      setExistingRxId(existingRx.id)
      setRxStatus(existingRx.status || "active")
      hasLoadedExistingRxRef.current = true

      // Pre-fill chief complaints
      if (existingRx.chief_complaints) {
        if (Array.isArray(existingRx.chief_complaints)) {
          setChiefComplaints(existingRx.chief_complaints.filter(Boolean))
        } else if (typeof existingRx.chief_complaints === "string") {
          setChiefComplaints(
            existingRx.chief_complaints
              .split(/[\r\n,;]+/)
              .map((c: string) => c.trim())
              .filter(Boolean)
          )
        }
      }

      // Pre-fill clinical examination & notes
      if (existingRx.clinical_notes) {
        const lines = String(existingRx.clinical_notes).split("\n")
        const otherLines: string[] = []
        lines.forEach((l) => {
          const trimmed = l.trim()
          if (trimmed.startsWith("CVS:")) setCvsExam(trimmed.replace(/^CVS:\s*/, ""))
          else if (trimmed.startsWith("RS:")) setRsExam(trimmed.replace(/^RS:\s*/, ""))
          else if (trimmed.startsWith("CNS:")) setCnsExam(trimmed.replace(/^CNS:\s*/, ""))
          else if (trimmed.startsWith("P/A:")) setPaExam(trimmed.replace(/^P\/A:\s*/, ""))
          else if (!trimmed.startsWith("Investigations Ordered:")) otherLines.push(l)
        })
        const cleanNotes = otherLines.join("\n").trim()
        if (cleanNotes) setClinicalNotes(cleanNotes)
      }

      // Pre-fill advice
      if (existingRx.diet_advice || existingRx.general_advice) {
        setAdvice(existingRx.diet_advice || existingRx.general_advice || "")
      }

      // Pre-fill follow-up date
      if (existingRx.follow_up_date) {
        setFollowUpDate(String(existingRx.follow_up_date).substring(0, 10))
      }

      // Pre-fill diagnoses
      if (Array.isArray(existingRx.diagnoses) && existingRx.diagnoses.length > 0) {
        setDiagnoses(
          existingRx.diagnoses.map((d: any) => ({
            id: d.icd10_id || d.id,
            code: d.icd_code || d.code || "",
            code_with_separator: d.icd_code || d.code || "",
            name: d.diagnosis_name || d.name || "",
            short_description: d.diagnosis_name || d.name || "",
            type: d.diagnosis_type || "provisional",
          }))
        )
      }

      // Pre-fill medicines
      if (Array.isArray(existingRx.items) && existingRx.items.length > 0) {
        setMedicines(
          existingRx.items.map((item: any) => ({
            medicine_id: item.medicine_id,
            medicine_name: item.medicine_name || "",
            dosage: item.dosage || "1 tab",
            frequency: item.frequency || "BD",
            duration: item.duration_days ? `${item.duration_days} days` : "5 days",
            route:
              item.dosage_form === "Eye Drops"
                ? "Eye Drops"
                : item.dosage_form === "Inhaler / Respule"
                ? "Inhaled"
                : item.dosage_form === "Topical"
                ? "Topical"
                : "Oral",
            instructions: item.instructions || item.timing || "After meals",
          }))
        )
      }

      // Pre-fill investigations
      if (Array.isArray(existingRx.investigations) && existingRx.investigations.length > 0) {
        setInvestigations(
          existingRx.investigations.map((i: any) => ({
            name: i.test_name || i.name,
            category: i.category || "Pathology",
            urgency: i.urgency
              ? (i.urgency.charAt(0).toUpperCase() + i.urgency.slice(1).toLowerCase() as any)
              : "Routine",
            code: i.test_code || i.code,
            standard_rate: i.standard_rate ? Number(i.standard_rate) : undefined,
          }))
        )
      }

      // Pre-fill disposition & admission recommendation
      if (existingRx.disposition) {
        setDisposition(existingRx.disposition)
      }
      if (existingRx.disposition_notes) {
        setDispositionNotes(existingRx.disposition_notes)
      }
      if (existingRx.admit_priority) {
        setAdmitPriority(existingRx.admit_priority)
      }
      if (existingRx.recommended_ward) {
        setRecommendedWard(existingRx.recommended_ward)
      }
    }
  }, [existingRx])

  // ─── 9. SAVE PRESCRIPTION (DRAFT OR COMPLETE SIGN-OFF) ───────────────
  const handleSavePrescription = async (targetStatus: "draft" | "active", andPrint = false) => {
    if (targetStatus === "draft") {
      setIsSavingDraft(true)
    } else {
      setIsSubmitting(true)
    }

    try {
      // Clean previous system examination tags to avoid infinite stacking
      const cleanBaseClinicalNotes = clinicalNotes
        .split("\n")
        .filter(
          (line) =>
            !line.startsWith("CVS:") &&
            !line.startsWith("RS:") &&
            !line.startsWith("CNS:") &&
            !line.startsWith("P/A:") &&
            !line.startsWith("Investigations Ordered:")
        )
        .join("\n")
        .trim()

      const fullExamNotes = [
        cleanBaseClinicalNotes,
        cvsExam ? `CVS: ${cvsExam}` : "",
        rsExam ? `RS: ${rsExam}` : "",
        cnsExam ? `CNS: ${cnsExam}` : "",
        paExam ? `P/A: ${paExam}` : "",
        investigations.length > 0
          ? `Investigations Ordered: ${investigations.map((i) => `${i.name} (${i.urgency})`).join(", ")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n")

      const finalComplaints = [...chiefComplaints]
      if (complaintInput.trim()) {
        const extra = complaintInput.split(/;\s*|,\s*|\n/).map((s) => s.trim()).filter(Boolean)
        extra.forEach((e) => {
          if (!finalComplaints.includes(e)) finalComplaints.push(e)
        })
      }

      const doctorId =
        visit.doctor_id ||
        visit.doctor?.id ||
        (user && ((user.role && String(user.role).includes("DOCTOR")) || (user as any).is_doctor) ? user.id : undefined)

      const payload: SavePrescriptionPayload = {
        visit_id: visitId,
        opd_visit_id: visitId,
        patient_id: patientId,
        doctor_id: doctorId ? Number(doctorId) : undefined,
        status: targetStatus,
        chief_complaints: finalComplaints,
        clinical_notes: fullExamNotes,
        diagnosis_codes: diagnoses,
        medicines: medicines.filter((m) => m.medicine_name.trim() !== ""),
        investigations: investigations.map((inv) => ({
          test_name: inv.name,
          test_code: inv.code,
          category: inv.category,
          urgency: inv.urgency ? (inv.urgency.toLowerCase() as any) : "routine",
          standard_rate: inv.standard_rate,
        })),
        disposition,
        disposition_notes: dispositionNotes || undefined,
        admit_priority: disposition === "admit_ipd" ? admitPriority : undefined,
        recommended_ward: disposition === "admit_ipd" ? (recommendedWard || undefined) : undefined,
        follow_up_date: followUpDate || undefined,
        advice: advice || undefined,
      }

      let res: any = null
      if (existingRxId) {
        res = await opdService.updatePrescription(existingRxId, payload)
      } else {
        res = await opdService.savePrescription(payload)
      }

      const savedId = res?.id || res?.data?.id
      if (savedId) {
        setExistingRxId(savedId)
      }
      setRxStatus(targetStatus)

      if (targetStatus === "draft") {
        toast.success("Prescription draft saved successfully!")
        queryClient.invalidateQueries({ queryKey: queryKeys.opd.queue })
        queryClient.invalidateQueries({ queryKey: ["opd", "visit-prescription", visitId] })
      } else {
        // Active mode: mark visit as complete (idempotent, safe)
        await opdService.completeConsultation(visitId)

        toast.success(
          existingRxId && rxStatus === "active"
            ? "Prescription updated successfully!"
            : `Consultation completed & signed for ${visit.patient_name || patient.name}!`
        )
        queryClient.invalidateQueries({ queryKey: queryKeys.opd.queue })
        queryClient.invalidateQueries({ queryKey: ["opd", "visit-prescription", visitId] })

        if (andPrint) {
          setCloseAfterPrint(true)
          setPrintModalOpen(true)
        } else {
          if (onSuccess) onSuccess()
          onBack()
        }
      }
    } catch (err: any) {
      toast.error(err.message || (targetStatus === "draft" ? "Failed to save draft" : "Failed to complete consultation"))
    } finally {
      setIsSavingDraft(false)
      setIsSubmitting(false)
    }
  }

  // ─── CLINICAL VITALS CLASSIFICATION LOGIC & HELPERS ─────────────────
  const hrVal = currentVital?.pulse_rate ? Number(currentVital.pulse_rate) : null
  const hrBadge = useMemo(() => {
    if (!hrVal) return null
    if (hrVal < 60) return { text: "Bradycardia (<60)", cls: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30" }
    if (hrVal <= 100) return { text: "Normal (60–100)", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" }
    return { text: "Tachycardia (>100)", cls: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30" }
  }, [hrVal])

  const sbpVal = currentVital?.blood_pressure_sys ? Number(currentVital.blood_pressure_sys) : null
  const dbpVal = currentVital?.blood_pressure_dia ? Number(currentVital.blood_pressure_dia) : null
  const bpBadge = useMemo(() => {
    if (!sbpVal || !dbpVal) return null
    if (sbpVal < 120 && dbpVal < 80) return { text: "Optimal (<120/80)", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" }
    if (sbpVal <= 129 && dbpVal < 80) return { text: "Elevated BP", cls: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30" }
    if (sbpVal <= 139 || dbpVal <= 89) return { text: "Stage 1 HTN", cls: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30" }
    return { text: "Stage 2 HTN", cls: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30" }
  }, [sbpVal, dbpVal])

  const tempVal = currentVital?.temperature ? Number(currentVital.temperature) : null
  const tempBadge = useMemo(() => {
    if (!tempVal) return null
    if (tempVal < 97.0) return { text: "Hypothermia", cls: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30" }
    if (tempVal <= 99.0) return { text: "Normal (97–99°)", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" }
    if (tempVal <= 100.4) return { text: "Low Fever", cls: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30" }
    return { text: "High Fever", cls: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30" }
  }, [tempVal])

  const rrVal = currentVital?.respiratory_rate ? Number(currentVital.respiratory_rate) : null
  const rrBadge = useMemo(() => {
    if (!rrVal) return null
    if (rrVal < 12) return { text: "Bradypnea (<12)", cls: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30" }
    if (rrVal <= 20) return { text: "Normal (12–20)", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" }
    return { text: "Tachypnea (>20)", cls: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30" }
  }, [rrVal])

  const spo2Val = currentVital?.oxygen_saturation ? Number(currentVital.oxygen_saturation) : null
  const spo2Badge = useMemo(() => {
    if (!spo2Val) return null
    if (spo2Val >= 95) return { text: "Optimal (≥95%)", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" }
    if (spo2Val >= 90) return { text: "Hypoxia Watch", cls: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30" }
    return { text: "Critical (<90%)", cls: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30" }
  }, [spo2Val])

  const painVal = custom.pain_score !== undefined && custom.pain_score !== null && custom.pain_score !== "" ? Number(custom.pain_score) : null
  const painBadge = useMemo(() => {
    if (painVal === null || painVal === 0) return { text: "0 / No Pain", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" }
    if (painVal <= 3) return { text: "Mild (1–3)", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" }
    if (painVal <= 6) return { text: "Moderate (4–6)", cls: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30" }
    return { text: "Severe (7–10)", cls: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30" }
  }, [painVal])

  const bmiVal = currentVital?.bmi ? Number(currentVital.bmi) : null
  const bmiBadge = useMemo(() => {
    if (!bmiVal) return null
    if (bmiVal < 18.5) return { text: "Underweight (<18.5)", cls: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30" }
    if (bmiVal <= 24.9) return { text: "Normal (18.5–24.9)", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" }
    if (bmiVal <= 29.9) return { text: "Overweight (25–29.9)", cls: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30" }
    return { text: "Obese (≥30)", cls: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30" }
  }, [bmiVal])

  // Split and sanitize symptoms for high-contrast pills
  const parsedSymptoms = useMemo(() => {
    const raw = custom.symptoms || visit.chief_complaint || visit.visit_reason || ""
    if (!raw.trim()) return []
    return raw
      .split(/;\s*|,\s*|\n/)
      .map((s: string) => s.trim())
      .filter(Boolean)
  }, [custom.symptoms, visit.chief_complaint, visit.visit_reason])

  const isUrgentSymptom = (sym: string) => {
    const u = sym.toUpperCase()
    return (
      u.includes("CHEST PAIN") ||
      u.includes("BREATHLESS") ||
      u.includes("DYSPNEA") ||
      u.includes("UNCONSCIOUS") ||
      u.includes("BLEEDING") ||
      u.includes("SEVERE") ||
      u.includes("ACUTE")
    )
  }

  const isWarningSymptom = (sym: string) => {
    const u = sym.toUpperCase()
    return (
      u.includes("FEVER") ||
      u.includes("VOMIT") ||
      u.includes("VERTIGO") ||
      u.includes("DIZZINESS") ||
      u.includes("ABDOMINAL") ||
      u.includes("HEADACHE")
    )
  }

  // Resolve custom sections data into human readable labels and section titles
  const resolvedCustomSections = useMemo(() => {
    const rawData = custom.custom_sections_data
    if (!rawData || typeof rawData !== "object" || Object.keys(rawData).length === 0) return []

    const customSectionsConfig: any[] = Array.isArray(triageConfig?.custom_sections)
      ? triageConfig.custom_sections
      : []

    const sectionsMap = new Map<string, { title: string; description?: string; fields: Array<{ label: string; value: string }> }>()

    Object.entries(rawData).forEach(([key, val]) => {
      if (typeof val === "object" && val !== null && !Array.isArray(val)) {
        const secCfg = customSectionsConfig.find((s) => s.id === key)
        const secTitle = secCfg?.title || (key.startsWith("sec_") ? "Hospital Custom Intake" : key.replace(/_/g, " "))
        const secDesc = secCfg?.description

        if (!sectionsMap.has(key)) {
          sectionsMap.set(key, { title: secTitle, description: secDesc, fields: [] })
        }
        const sectionEntry = sectionsMap.get(key)!

        Object.entries(val).forEach(([fId, fVal]) => {
          if (fVal !== undefined && fVal !== null && String(fVal).trim() !== "") {
            const fieldCfg =
              secCfg?.fields?.find((f: any) => f.id === fId) ||
              customSectionsConfig.flatMap((s) => s.fields || []).find((f: any) => f.id === fId)
            const fieldLabel = fieldCfg?.label || (fId.startsWith("f_") ? "Parameter" : fId.replace(/_/g, " "))
            sectionEntry.fields.push({ label: fieldLabel, value: String(fVal) })
          }
        })
      } else if (val !== undefined && val !== null && String(val).trim() !== "") {
        const fieldCfg = customSectionsConfig.flatMap((s) => s.fields || []).find((f: any) => f.id === key)
        const fieldLabel = fieldCfg?.label || (key.startsWith("f_") ? "Parameter" : key.replace(/_/g, " "))
        const defaultSecKey = "general_custom"
        if (!sectionsMap.has(defaultSecKey)) {
          sectionsMap.set(defaultSecKey, { title: "Custom Intake Parameters", fields: [] })
        }
        sectionsMap.get(defaultSecKey)!.fields.push({ label: fieldLabel, value: String(val) })
      }
    })

    return Array.from(sectionsMap.entries())
      .filter(([_, sec]) => sec.fields.length > 0)
      .map(([id, sec]) => ({ id, ...sec }))
  }, [custom.custom_sections_data, triageConfig])

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-200">
      {/* ────────────────────────────────────────────────────────────────
          1. TOP NAVIGATION & PATIENT CLINICAL BANNER
         ──────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-2xl border border-primary/20 bg-primary/5 shadow-xs">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="h-9 gap-1.5 text-xs rounded-xl border-primary/30 hover:bg-primary/10 text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Doctor Queue
          </Button>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-extrabold text-foreground">
                {visit.patient_name || patient.name || "Patient"}
              </span>
              <Badge className="bg-primary text-primary-foreground font-mono text-[11px] px-2 py-0.5">
                Token #{visit.token_no || visit.queue_token || visit.opd_number}
              </Badge>
              <Badge variant="outline" className="font-mono text-[11px] text-muted-foreground border-border">
                UHID: {visit.uhid || patient.uhid || "—"}
              </Badge>
              <Badge variant="outline" className="text-primary bg-primary/10 text-[10px]">
                Doctor Consultation Cabin
              </Badge>
              {rxStatus === "draft" && (
                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-semibold text-[10px] gap-1 px-2">
                  <FileText className="h-3 w-3" /> Draft Saved
                </Badge>
              )}
              {(rxStatus === "active" || visit.status === "done" || (visit as any).status === "completed") && (
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-semibold text-[10px] gap-1 px-2">
                  <CheckCircle2 className="h-3 w-3" /> Signed & Completed (Edit Mode)
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatPatientAge(visit.age || patient.age, visit.dob || patient.dob)} /{" "}
              {formatPatientGender(visit.gender || patient.gender)} • Blood:{" "}
              <strong className="text-foreground">{patient.blood_group || "—"}</strong> • Dept:{" "}
              <strong>{visit.department_name || visit.department?.name || "General"}</strong> • Consultant:{" "}
              <strong>Dr. {visit.doctor_name || visit.doctor?.name || user?.name || "Doctor"}</strong>
            </p>
          </div>
        </div>

        {/* Doctor Context */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistoryCompare(!showHistoryCompare)}
            className="gap-1.5 text-xs h-9 rounded-xl border-primary/30"
          >
            <History className="h-4 w-4 text-primary" />
            {showHistoryCompare ? "Hide History" : `Compare Past Visits (${pastOpdVisits.length})`}
          </Button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────
          2. PRE-CONSULTATION NURSE TRIAGE ASSESSMENT REVIEW PANEL
         ──────────────────────────────────────────────────────────────── */}
      <Card className="p-4 rounded-2xl border shadow-xs bg-card space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 border-b border-border/70 gap-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="h-8 w-8 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Pre-Consultation Nurse Triage & Physiological Baseline
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                {triageStaff && (
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <UserCheck className="h-3 w-3 text-teal-600" />
                    Triaged by: <strong className="text-foreground">{triageStaff.name}</strong> on{" "}
                    {currentVital?.recorded_at
                      ? new Date(currentVital.recorded_at).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })
                      : "Today"}
                  </span>
                )}
                {custom.rechecked_by_doctor && (
                  <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30">
                    Cabin Re-check: {custom.rechecked_by_doctor}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={() => setIsEditingVitals(!isEditingVitals)}
              className="text-xs gap-1.5 text-teal-700 dark:text-teal-400 border-teal-500/30 hover:bg-teal-500/10 h-8 rounded-lg"
            >
              <Edit3 className="h-3.5 w-3.5" />
              {isEditingVitals ? "Cancel Cabin Edit" : "Re-Check Vitals in Cabin"}
            </Button>

            {currentVital && (
              <Button
                type="button"
                size="xs"
                variant="ghost"
                onClick={() => setAuditModalOpen(true)}
                className="text-xs text-muted-foreground hover:text-foreground gap-1.5 h-8"
              >
                <History className="h-3.5 w-3.5" /> Audit Log
              </Button>
            )}
          </div>
        </div>

        {/* Doctor In-Cabin Vitals Quick Editor */}
        {isEditingVitals ? (
          <div className="p-4 rounded-xl border border-teal-500/30 bg-teal-500/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
                <Edit3 className="h-3.5 w-3.5 text-teal-600" />
                Cabin Re-measurement (Doctor Desk Entry)
              </span>
              <span className="text-[10px] text-muted-foreground">Updates baseline vital record with doctor attribution</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
              <div>
                <Label className="text-[10px] text-muted-foreground font-semibold">SBP (mmHg)</Label>
                <Input
                  type="number"
                  placeholder="120"
                  value={doctorSbp}
                  onChange={(e) => setDoctorSbp(e.target.value)}
                  className="h-8 text-xs font-mono font-bold"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground font-semibold">DBP (mmHg)</Label>
                <Input
                  type="number"
                  placeholder="80"
                  value={doctorDbp}
                  onChange={(e) => setDoctorDbp(e.target.value)}
                  className="h-8 text-xs font-mono font-bold"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground font-semibold">Pulse (bpm)</Label>
                <Input
                  type="number"
                  placeholder="72"
                  value={doctorPulse}
                  onChange={(e) => setDoctorPulse(e.target.value)}
                  className="h-8 text-xs font-mono font-bold"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground font-semibold">Temp (°F)</Label>
                <Input
                  type="number"
                  placeholder="98.6"
                  value={doctorTemp}
                  onChange={(e) => setDoctorTemp(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground font-semibold">SpO2 (%)</Label>
                <Input
                  type="number"
                  placeholder="98"
                  value={doctorSpo2}
                  onChange={(e) => setDoctorSpo2(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                size="xs"
                variant="outline"
                onClick={() => setIsEditingVitals(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="xs"
                disabled={saveDoctorVitalsMutation.isPending}
                onClick={() => saveDoctorVitalsMutation.mutate()}
                className="bg-teal-600 hover:bg-teal-700 text-white text-xs gap-1.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Save Re-check
              </Button>
            </div>
          </div>
        ) : !currentVital ? (
          <div className="p-5 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 text-center space-y-2.5">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              ⚠️ Pre-consultation vitals have not yet been recorded by Nurse Triage for this token.
            </p>
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={() => setIsEditingVitals(true)}
              className="text-xs border-amber-500/50 text-amber-800 dark:text-amber-300 hover:bg-amber-500/10"
            >
              <Edit3 className="h-3.5 w-3.5 mr-1" /> Record Vitals Directly in Cabin
            </Button>
          </div>
        ) : (
          <div className="space-y-3.5">
            {/* Top 8 High-Contrast Physiological Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
              {/* 1. Pulse / Heart Rate */}
              <div className="group relative overflow-hidden rounded-xl border border-rose-200/90 dark:border-rose-900/50 bg-gradient-to-b from-rose-500/10 via-rose-500/5 to-background p-2.5 flex flex-col justify-between transition-all hover:shadow-xs hover:border-rose-300">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold text-rose-900/70 dark:text-rose-200 uppercase tracking-wider flex items-center gap-1">
                    <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500/20" /> Pulse
                  </span>
                  <span className="text-[9px] text-muted-foreground font-mono">HR</span>
                </div>
                <div className="my-1.5 flex items-baseline gap-1">
                  <span className="font-mono text-2xl font-black tracking-tight text-foreground">
                    {currentVital.pulse_rate || "—"}
                  </span>
                  {currentVital.pulse_rate && <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">bpm</span>}
                </div>
                <div className="pt-0.5">
                  {hrBadge ? (
                    <Badge variant="outline" className={`text-[9px] font-bold px-1.5 py-0 rounded-md border ${hrBadge.cls}`}>
                      {hrBadge.text}
                    </Badge>
                  ) : (
                    <span className="text-[9px] text-muted-foreground">Heart Rate</span>
                  )}
                </div>
              </div>

              {/* 2. Blood Pressure */}
              <div className="group relative overflow-hidden rounded-xl border border-indigo-200/90 dark:border-indigo-900/50 bg-gradient-to-b from-indigo-500/10 via-indigo-500/5 to-background p-2.5 flex flex-col justify-between transition-all hover:shadow-xs hover:border-indigo-300">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold text-indigo-900/70 dark:text-indigo-200 uppercase tracking-wider flex items-center gap-1">
                    <Activity className="h-3.5 w-3.5 text-indigo-500" /> BP
                  </span>
                  <span className="text-[9px] text-muted-foreground font-mono">SYS/DIA</span>
                </div>
                <div className="my-1.5 flex items-baseline gap-1">
                  <span className="font-mono text-2xl font-black tracking-tight text-foreground">
                    {currentVital.blood_pressure_sys && currentVital.blood_pressure_dia
                      ? `${currentVital.blood_pressure_sys}/${currentVital.blood_pressure_dia}`
                      : "—"}
                  </span>
                  {currentVital.blood_pressure_sys && <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">mmHg</span>}
                </div>
                <div className="pt-0.5">
                  {bpBadge ? (
                    <Badge variant="outline" className={`text-[9px] font-bold px-1.5 py-0 rounded-md border ${bpBadge.cls}`}>
                      {bpBadge.text}
                    </Badge>
                  ) : (
                    <span className="text-[9px] text-muted-foreground">Blood Pressure</span>
                  )}
                </div>
              </div>

              {/* 3. Mean Arterial Pressure (MAP) */}
              <div className="group relative overflow-hidden rounded-xl border border-purple-200/90 dark:border-purple-900/50 bg-gradient-to-b from-purple-500/10 via-purple-500/5 to-background p-2.5 flex flex-col justify-between transition-all hover:shadow-xs hover:border-purple-300">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold text-purple-900/70 dark:text-purple-200 uppercase tracking-wider flex items-center gap-1">
                    <Activity className="h-3.5 w-3.5 text-purple-500" /> MAP
                  </span>
                  <span className="text-[9px] text-muted-foreground font-mono">Mean</span>
                </div>
                <div className="my-1.5 flex items-baseline gap-1">
                  <span className="font-mono text-2xl font-black tracking-tight text-foreground">
                    {custom.mean_arterial_pressure || "—"}
                  </span>
                  {custom.mean_arterial_pressure && <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">mmHg</span>}
                </div>
                <div className="pt-0.5">
                  <span className="text-[9px] font-medium text-muted-foreground">Target: 70–100</span>
                </div>
              </div>

              {/* 4. Temperature */}
              <div className="group relative overflow-hidden rounded-xl border border-amber-200/90 dark:border-amber-900/50 bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-background p-2.5 flex flex-col justify-between transition-all hover:shadow-xs hover:border-amber-300">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold text-amber-900/70 dark:text-amber-200 uppercase tracking-wider flex items-center gap-1">
                    <Thermometer className="h-3.5 w-3.5 text-amber-500" /> Temp
                  </span>
                  <span className="text-[9px] text-muted-foreground font-mono">°{currentVital.temperature_unit || "F"}</span>
                </div>
                <div className="my-1.5 flex items-baseline gap-0.5">
                  <span className="font-mono text-2xl font-black tracking-tight text-foreground">
                    {currentVital.temperature || "—"}
                  </span>
                  {currentVital.temperature && <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">°{currentVital.temperature_unit || "F"}</span>}
                </div>
                <div className="pt-0.5">
                  {tempBadge ? (
                    <Badge variant="outline" className={`text-[9px] font-bold px-1.5 py-0 rounded-md border ${tempBadge.cls}`}>
                      {tempBadge.text}
                    </Badge>
                  ) : (
                    <span className="text-[9px] text-muted-foreground">Body Temperature</span>
                  )}
                </div>
              </div>

              {/* 5. Respiratory Rate */}
              <div className="group relative overflow-hidden rounded-xl border border-teal-200/90 dark:border-teal-900/50 bg-gradient-to-b from-teal-500/10 via-teal-500/5 to-background p-2.5 flex flex-col justify-between transition-all hover:shadow-xs hover:border-teal-300">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold text-teal-900/70 dark:text-teal-200 uppercase tracking-wider flex items-center gap-1">
                    <Wind className="h-3.5 w-3.5 text-teal-500" /> Resp
                  </span>
                  <span className="text-[9px] text-muted-foreground font-mono">RR</span>
                </div>
                <div className="my-1.5 flex items-baseline gap-1">
                  <span className="font-mono text-2xl font-black tracking-tight text-foreground">
                    {currentVital.respiratory_rate || "—"}
                  </span>
                  {currentVital.respiratory_rate && <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400">bpm</span>}
                </div>
                <div className="pt-0.5">
                  {rrBadge ? (
                    <Badge variant="outline" className={`text-[9px] font-bold px-1.5 py-0 rounded-md border ${rrBadge.cls}`}>
                      {rrBadge.text}
                    </Badge>
                  ) : (
                    <span className="text-[9px] text-muted-foreground">Resp Rate</span>
                  )}
                </div>
              </div>

              {/* 6. SpO2 Oxygen Saturation */}
              <div className="group relative overflow-hidden rounded-xl border border-sky-200/90 dark:border-sky-900/50 bg-gradient-to-b from-sky-500/10 via-sky-500/5 to-background p-2.5 flex flex-col justify-between transition-all hover:shadow-xs hover:border-sky-300">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold text-sky-900/70 dark:text-sky-200 uppercase tracking-wider flex items-center gap-1">
                    <Droplet className="h-3.5 w-3.5 text-sky-500 fill-sky-500/20" /> SpO2
                  </span>
                  <span className="text-[9px] text-muted-foreground font-mono">O₂ Sat</span>
                </div>
                <div className="my-1.5 flex items-baseline gap-0.5">
                  <span className="font-mono text-2xl font-black tracking-tight text-sky-600 dark:text-sky-400">
                    {currentVital.oxygen_saturation || "—"}
                  </span>
                  {currentVital.oxygen_saturation && <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400">%</span>}
                </div>
                <div className="pt-0.5">
                  {spo2Badge ? (
                    <Badge variant="outline" className={`text-[9px] font-bold px-1.5 py-0 rounded-md border ${spo2Badge.cls}`}>
                      {spo2Badge.text}
                    </Badge>
                  ) : (
                    <span className="text-[9px] text-muted-foreground">Oxygen Saturation</span>
                  )}
                </div>
              </div>

              {/* 7. Pain Score */}
              <div className="group relative overflow-hidden rounded-xl border border-orange-200/90 dark:border-orange-900/50 bg-gradient-to-b from-orange-500/10 via-orange-500/5 to-background p-2.5 flex flex-col justify-between transition-all hover:shadow-xs hover:border-orange-300">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold text-orange-900/70 dark:text-orange-200 uppercase tracking-wider flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 text-orange-500" /> Pain
                  </span>
                  <span className="text-[9px] text-muted-foreground font-mono">0-10</span>
                </div>
                <div className="my-1.5 flex items-baseline gap-1">
                  <span className="font-mono text-2xl font-black tracking-tight text-foreground">
                    {painVal !== null ? painVal : "0"}
                  </span>
                  <span className="text-[11px] font-semibold text-muted-foreground">/10</span>
                </div>
                <div className="pt-0.5">
                  <Badge variant="outline" className={`text-[9px] font-bold px-1.5 py-0 rounded-md border ${painBadge.cls}`}>
                    {painBadge.text}
                  </Badge>
                </div>
              </div>

              {/* 8. Anthropometry (Ht/Wt) */}
              <div className="group relative overflow-hidden rounded-xl border border-blue-200/90 dark:border-blue-900/50 bg-gradient-to-b from-blue-500/10 via-blue-500/5 to-background p-2.5 flex flex-col justify-between transition-all hover:shadow-xs hover:border-blue-300">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold text-blue-900/70 dark:text-blue-200 uppercase tracking-wider flex items-center gap-1">
                    <Scale className="h-3.5 w-3.5 text-blue-500" /> Ht / Wt
                  </span>
                  <span className="text-[9px] text-muted-foreground font-mono">Build</span>
                </div>
                <div className="my-1.5">
                  <span className="font-mono text-sm font-black tracking-tight text-foreground block">
                    {currentVital.height ? `${currentVital.height}cm` : "—"}{" "}
                    <span className="text-muted-foreground font-normal">/</span>{" "}
                    {currentVital.weight ? `${currentVital.weight}kg` : "—"}
                  </span>
                </div>
                <div className="pt-0.5">
                  <span className="text-[9px] font-semibold text-blue-700 dark:text-blue-300 truncate block">
                    {custom.body_surface_area ? `BSA ${custom.body_surface_area} m²` : "Anthropometry"}
                  </span>
                </div>
              </div>
            </div>

            {/* Row 2: Secondary Metabolic & Lab Baselines */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* BMI */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border/80 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs">
                    BMI
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-medium">Body Mass Index</span>
                    <span className="font-mono font-bold text-sm text-foreground">
                      {currentVital.bmi ? `${currentVital.bmi}` : "—"}
                    </span>
                  </div>
                </div>
                {bmiBadge && (
                  <Badge variant="outline" className={`text-[10px] font-bold py-0.5 px-2 rounded-md ${bmiBadge.cls}`}>
                    {bmiBadge.text}
                  </Badge>
                )}
              </div>

              {/* Blood Glucose */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border/80 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold text-xs">
                    BS
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-medium">Blood Glucose</span>
                    <span className="font-mono font-bold text-sm text-foreground">
                      {currentVital.blood_glucose ? `${currentVital.blood_glucose} mg/dL` : "—"}
                    </span>
                  </div>
                </div>
                {currentVital.blood_glucose && (
                  <Badge variant="outline" className="text-[10px] font-semibold py-0.5 px-2 rounded-md uppercase bg-muted/60 text-foreground">
                    {currentVital.glucose_type || "Random"}
                  </Badge>
                )}
              </div>

              {/* Creatinine & eGFR */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border/80 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold text-xs">
                    Cr
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-medium">Creatinine / Renal</span>
                    <span className="font-mono font-bold text-sm text-foreground">
                      {custom.creatinine ? `${custom.creatinine} mg/dL` : "—"}
                    </span>
                  </div>
                </div>
                {custom.egfr && (
                  <Badge variant="outline" className="text-[10px] font-mono font-bold py-0.5 px-2 rounded-md bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30">
                    eGFR: {custom.egfr}
                  </Badge>
                )}
              </div>

              {/* BSA */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border/80 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold text-xs">
                    BSA
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-medium">Body Surface Area</span>
                    <span className="font-mono font-bold text-sm text-foreground">
                      {custom.body_surface_area ? `${custom.body_surface_area} m²` : "—"}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">Mosteller</span>
              </div>
            </div>

            {/* Assessment Sections (Symptoms, Past Medical, Surgical, Addictions, Personal) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-border/60">
              {/* Symptoms / Complaints as High-Contrast Badges */}
              <div className="p-3.5 rounded-xl bg-muted/15 border border-border/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-primary" />
                    Triaged Chief Complaints & Symptoms
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {parsedSymptoms.length} symptom{parsedSymptoms.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {parsedSymptoms.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Routine consultation / No acute complaints reported</p>
                ) : (
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {parsedSymptoms.map((sym: string, sIdx: number) => {
                      const isUrgent = isUrgentSymptom(sym)
                      const isWarning = isWarningSymptom(sym)
                      return (
                        <Badge
                          key={sIdx}
                          variant="outline"
                          className={`px-2.5 py-1 text-xs rounded-lg font-semibold flex items-center gap-1.5 transition-all shadow-2xs ${
                            isUrgent
                              ? "bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-500/40 ring-1 ring-rose-500/20"
                              : isWarning
                              ? "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/40 ring-1 ring-amber-500/20"
                              : "bg-primary/10 text-primary border-primary/25"
                          }`}
                        >
                          {isUrgent && <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />}
                          {sym}
                        </Badge>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Past Medical History */}
              <div className="p-3.5 rounded-xl bg-muted/15 border border-border/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                    Past Medical History (Chronic Illnesses)
                  </span>
                  {Array.isArray(custom.past_medical_history) && (
                    <span className="text-[10px] text-muted-foreground">
                      {custom.past_medical_history.length} documented
                    </span>
                  )}
                </div>

                {Array.isArray(custom.past_medical_history) && custom.past_medical_history.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {custom.past_medical_history.map((m: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border/80 shadow-2xs text-xs"
                      >
                        <span className="font-bold text-foreground">{m.disease}</span>
                        {m.duration && (
                          <Badge variant="outline" className="font-mono text-[10px] py-0 px-1.5 text-muted-foreground bg-muted/30">
                            <Clock className="h-2.5 w-2.5 mr-1 text-muted-foreground" />
                            {m.duration}
                          </Badge>
                        )}
                        {m.medication && (
                          <span className="text-[11px] text-teal-700 dark:text-teal-400 font-medium flex items-center gap-1">
                            <Pill className="h-3 w-3" /> {m.medication}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No past chronic medical illnesses reported</p>
                )}
              </div>

              {/* Past Surgical History */}
              {Array.isArray(custom.past_surgical_history) && custom.past_surgical_history.length > 0 && (
                <div className="p-3.5 rounded-xl bg-muted/15 border border-border/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5 text-indigo-600" />
                      Past Surgical History & Procedures
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {custom.past_surgical_history.length} procedures
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {custom.past_surgical_history.map((s: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-center flex-wrap gap-2 p-2 rounded-lg bg-card border border-border/80 shadow-2xs text-xs"
                      >
                        <span className="font-bold text-foreground">{s.name}</span>
                        {s.date && (
                          <Badge variant="outline" className="font-mono text-[10px] py-0 px-1.5 text-muted-foreground bg-muted/30">
                            {s.date}
                          </Badge>
                        )}
                        {s.surgeon && (
                          <span className="text-[11px] text-foreground font-medium">Dr. {s.surgeon}</span>
                        )}
                        {s.hospital && (
                          <Badge variant="secondary" className="text-[10px] py-0 px-1.5 gap-1">
                            <Building2 className="h-2.5 w-2.5" /> {s.hospital}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Addictions & Substance Habits */}
              {Array.isArray(custom.addictions) && custom.addictions.length > 0 && (
                <div className="p-3.5 rounded-xl bg-muted/15 border border-border/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Cigarette className="h-3.5 w-3.5 text-amber-600" />
                      Addictions & Substance Habits
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {custom.addictions.length} logged
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {custom.addictions.map((a: any, i: number) => {
                      const isOngoing = String(a.action || "").toUpperCase().includes("ONGOING")
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border/80 shadow-2xs text-xs"
                        >
                          <Badge variant="outline" className="font-bold text-[10px] py-0 bg-muted/40">
                            {a.type}
                          </Badge>
                          <span className="font-mono text-muted-foreground text-[11px]">
                            {a.duration} • {a.units} units ({a.frequency})
                          </span>
                          <Badge
                            className={`text-[9px] font-bold py-0 px-1.5 ${
                              isOngoing
                                ? "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30"
                                : "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/30"
                            }`}
                          >
                            {a.action || "LOGGED"}
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Personal History & Physiological Functions */}
              {custom.personal_history && (
                <div className="col-span-full p-3.5 rounded-xl bg-muted/15 border border-border/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Apple className="h-3.5 w-3.5 text-emerald-600" />
                      Personal Physiological Profile & Functions
                    </span>
                    <span className="text-[10px] text-muted-foreground">Triage Baseline</span>
                  </div>

                  {/* 5 Functions Micro-cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-card border border-border/70 text-center">
                      <span className="text-[10px] text-muted-foreground block font-medium">Diet</span>
                      <strong className="text-foreground text-xs">{custom.personal_history.diet || "—"}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-card border border-border/70 text-center">
                      <span className="text-[10px] text-muted-foreground block font-medium">Appetite</span>
                      <strong className="text-foreground text-xs">{custom.personal_history.appetite || "—"}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-card border border-border/70 text-center">
                      <span className="text-[10px] text-muted-foreground block font-medium">Sleep</span>
                      <strong className="text-foreground text-xs">{custom.personal_history.sleep || "—"}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-card border border-border/70 text-center">
                      <span className="text-[10px] text-muted-foreground block font-medium">Bladder</span>
                      <strong className="text-foreground text-xs">{custom.personal_history.bladder || "—"}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-card border border-border/70 text-center">
                      <span className="text-[10px] text-muted-foreground block font-medium">Bowel</span>
                      <strong className="text-foreground text-xs">{custom.personal_history.bowel || "—"}</strong>
                    </div>
                  </div>

                  {/* Current Treatment Alert Box */}
                  {custom.personal_history.current_treatment && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2 text-xs">
                      <Pill className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-amber-900 dark:text-amber-200">Patient's Current Treatment / Self-Medication:</span>
                        <p className="text-amber-950 dark:text-amber-100 font-medium mt-0.5">
                          {custom.personal_history.current_treatment}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Nurse Comments Box */}
                  {custom.personal_history.comments && (
                    <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/25 flex items-start gap-2 text-xs">
                      <UserCheck className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-teal-900 dark:text-teal-200">Nurse Triage Clinical Observations:</span>
                        <p className="text-teal-950 dark:text-teal-100 font-medium mt-0.5">
                          {custom.personal_history.comments}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Resolved Custom Intake Sections Data (From Settings) */}
              {resolvedCustomSections.length > 0 && (
                <div className="col-span-full space-y-2.5">
                  {resolvedCustomSections.map((sec) => (
                    <div
                      key={sec.id}
                      className="p-3.5 rounded-xl bg-teal-500/5 border border-teal-500/25 space-y-2"
                    >
                      <div className="flex items-center justify-between pb-1 border-b border-teal-500/20">
                        <span className="text-xs font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                          <Sliders className="h-3.5 w-3.5 text-teal-600" />
                          {sec.title}
                        </span>
                        {sec.description && (
                          <span className="text-[10px] text-muted-foreground">{sec.description}</span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        {sec.fields.map((f, fIdx) => (
                          <div
                            key={fIdx}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background border border-border/80 shadow-2xs text-xs"
                          >
                            <span className="text-muted-foreground font-medium text-[11px]">{f.label}:</span>
                            <strong className="text-foreground font-bold font-mono text-[11px]">{f.value}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* ────────────────────────────────────────────────────────────────
          3. VISIT-BY-VISIT HISTORY COMPARISON DRAWER / PANEL
         ──────────────────────────────────────────────────────────────── */}
      {showHistoryCompare && (
        <Card className="p-4 rounded-2xl border border-primary/30 bg-primary/2 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border/70 flex-wrap gap-2">
            <span className="font-bold text-xs text-foreground flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              Visit-By-Visit Longitudinal History Comparison
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground font-mono">
                {pastOpdVisits.length} prior consultation records
              </span>
              {pastOpdVisits.length > 3 && (
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={() => setShowAllPastVisits(!showAllPastVisits)}
                  className="text-xs h-6 px-2.5 text-primary border-primary/30 hover:bg-primary/10 font-semibold"
                >
                  {showAllPastVisits ? "Show Recent 3" : `View All (${pastOpdVisits.length})`}
                </Button>
              )}
            </div>
          </div>

          {pastOpdVisits.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-2">
              This is the patient's first registered visit at this facility.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {(showAllPastVisits ? pastOpdVisits : pastOpdVisits.slice(0, 3)).map((past: any, idx: number) => {
                // Find matching prescription from attached relation or patient history prescriptions array
                const pastRx =
                  past.prescription ||
                  (Array.isArray(history.prescriptions)
                    ? history.prescriptions.find(
                        (r: any) => r.opd_visit_id === past.id || r.id === past.prescription_id
                      )
                    : null)

                // Diagnoses
                const pastDiagnoses: string[] = []
                if (Array.isArray(pastRx?.diagnoses) && pastRx.diagnoses.length > 0) {
                  pastRx.diagnoses.forEach((d: any) => {
                    pastDiagnoses.push(
                      d.icd_code
                        ? `[${d.icd_code}] ${d.diagnosis_name || d.name}`
                        : d.diagnosis_name || d.name
                    )
                  })
                } else if (past.diagnosis) {
                  pastDiagnoses.push(past.diagnosis)
                }

                // Medicines count & names
                const pastMeds: any[] = Array.isArray(pastRx?.items)
                  ? pastRx.items
                  : Array.isArray(pastRx?.medicines)
                  ? pastRx.medicines
                  : []

                // Tests count
                const pastTests: any[] = Array.isArray(pastRx?.investigations)
                  ? pastRx.investigations
                  : Array.isArray(past.investigations)
                  ? past.investigations
                  : []

                // Vital
                const pastVital =
                  past.latestVital ||
                  past.latest_vital ||
                  (Array.isArray(past.vitals) && past.vitals.length > 0 ? past.vitals[0] : null)

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedPastVisitModal({ visit: past, prescription: pastRx })}
                    className="group relative p-3.5 rounded-xl bg-card border border-border/80 hover:border-primary/60 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-2.5 text-xs shadow-2xs"
                  >
                    <div>
                      {/* Top Row: Date, Token & Doctor */}
                      <div className="flex items-center justify-between pb-2 border-b border-border/60">
                        <div className="flex items-center gap-1.5 font-bold font-mono text-primary text-xs">
                          <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span>
                            {past.visit_date
                              ? new Date(past.visit_date).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "Past Visit"}
                          </span>
                          {(past.queue_token || past.token_no) && (
                            <span className="text-[10px] text-muted-foreground font-normal">
                              (#{past.queue_token || past.token_no})
                            </span>
                          )}
                        </div>
                        <Badge variant="outline" className="text-[10px] max-w-[130px] truncate font-medium">
                          Dr. {past.doctor?.name || past.doctor_name || "Doctor"}
                        </Badge>
                      </div>

                      {/* Vitals micro-bar if recorded */}
                      {pastVital && (
                        <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground font-mono bg-muted/40 px-2 py-1 rounded-md border border-border/40 flex-wrap">
                          {pastVital.blood_pressure_sys && pastVital.blood_pressure_dia && (
                            <span className="font-semibold text-foreground">
                              BP: {pastVital.blood_pressure_sys}/{pastVital.blood_pressure_dia}
                            </span>
                          )}
                          {pastVital.pulse && <span>• HR: {pastVital.pulse}</span>}
                          {pastVital.spo2 && <span>• SpO2: {pastVital.spo2}%</span>}
                          {pastVital.temperature && <span>• {pastVital.temperature}°F</span>}
                        </div>
                      )}

                      {/* Complaint */}
                      <div className="mt-2 space-y-0.5">
                        <span className="text-[10px] text-muted-foreground font-semibold block uppercase">
                          Complaint:
                        </span>
                        <p className="font-medium text-foreground line-clamp-1">
                          {past.chief_complaint ||
                            (Array.isArray(pastRx?.chief_complaints)
                              ? pastRx.chief_complaints.join("; ")
                              : "—")}
                        </p>
                      </div>

                      {/* Diagnosis */}
                      <div className="mt-2 space-y-0.5">
                        <span className="text-[10px] text-muted-foreground font-semibold block uppercase">
                          Diagnosis:
                        </span>
                        {pastDiagnoses.length > 0 ? (
                          <div className="space-y-0.5">
                            {pastDiagnoses.slice(0, 2).map((diag, dIdx) => (
                              <p
                                key={dIdx}
                                className="font-semibold text-emerald-700 dark:text-emerald-400 text-xs line-clamp-1"
                              >
                                {diag}
                              </p>
                            ))}
                            {pastDiagnoses.length > 2 && (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                +{pastDiagnoses.length - 2} more diagnosis
                              </span>
                            )}
                          </div>
                        ) : (
                          <p className="text-muted-foreground italic text-[11px]">—</p>
                        )}
                      </div>

                      {/* Prescribed Medicines Summary */}
                      {pastMeds.length > 0 && (
                        <div className="mt-2 p-2 rounded-lg bg-primary/5 border border-primary/20 space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold text-primary flex items-center gap-1">
                              <Pill className="h-3 w-3" /> {pastMeds.length} Medicines Prescribed:
                            </span>
                          </div>
                          <p className="text-[11px] text-foreground font-medium line-clamp-1">
                            {pastMeds
                              .map((m: any) => m.medicine_name || m.name)
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                        </div>
                      )}

                      {/* Advised Tests Summary */}
                      {pastTests.length > 0 && (
                        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <FlaskConical className="h-3 w-3 text-purple-500 shrink-0" />
                          <span className="font-medium text-foreground">
                            {pastTests.length} Test(s):
                          </span>
                          <span className="truncate">
                            {pastTests
                              .map((t: any) => t.test_name || t.name)
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        </div>
                      )}

                      {/* Treatment Notes preview if present and no meds */}
                      {pastMeds.length === 0 && past.notes && (
                        <div className="mt-2">
                          <span className="text-[10px] text-muted-foreground font-semibold block uppercase">
                            Treatment Notes:
                          </span>
                          <p className="text-muted-foreground text-[11px] line-clamp-2 italic">
                            {past.notes}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Bar on card */}
                    <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px]">
                      <span className="text-primary font-semibold flex items-center gap-1 group-hover:underline">
                        <Eye className="h-3.5 w-3.5" /> View Full Clinical Details & Rx
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        Modal ↗
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      )}

      {/* ────────────────────────────────────────────────────────────────
          4. SECTION A: CLINICAL EXAMINATION & DOCTOR FINDINGS
         ──────────────────────────────────────────────────────────────── */}
      <Card className="p-4 rounded-2xl border shadow-xs bg-card space-y-3">
        <div className="pb-2 border-b border-border/70 flex items-center justify-between">
          <span className="font-bold text-xs text-foreground flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-primary" />
            Clinical Examination Findings & Systemic Observations
          </span>

          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={() => {
              setCvsExam("S1 S2 Normal, No murmurs")
              setRsExam("B/L Air Entry Equal, Clear, No wheeze/crepts")
              setCnsExam("Conscious, Oriented to Time, Place & Person")
              setPaExam("Soft, Non-tender, No organomegaly")
              toast.success("Normal systemic examination baseline applied!")
            }}
            className="text-xs h-7 gap-1.5 text-primary border-primary/30 hover:bg-primary/10 font-semibold"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Set All Normal Baseline
          </Button>
        </div>

        <div className="space-y-3 text-xs">
          {/* Chief Complaints (Array of Strings) */}
          <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-bold text-foreground">
                  Chief Complaints / HPI (Array Format)
                </Label>
                <Badge variant="outline" className="text-[10px] font-mono text-primary border-primary/30 bg-primary/5">
                  {chiefComplaints.length} Added
                </Badge>
              </div>
              <span className="text-[10px] text-muted-foreground">
                Type & press <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[9px] border">Enter</kbd> or comma
              </span>
            </div>

            {/* Input & Add Button */}
            <div className="flex items-center gap-2">
              <Input
                value={complaintInput}
                onChange={(e) => setComplaintInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault()
                    handleAddComplaint()
                  }
                }}
                placeholder="Type presenting complaint (e.g. Fever x 3 days, dry cough, severe headache) & press Enter..."
                className="text-xs bg-background h-8"
              />
              <Button
                type="button"
                size="sm"
                onClick={() => handleAddComplaint()}
                className="text-xs h-8 px-3.5 font-bold shrink-0 bg-primary/90 hover:bg-primary"
              >
                + Add Tag
              </Button>
            </div>

            {/* Active Complaints Chips (Array Items) */}
            {chiefComplaints.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {chiefComplaints.map((c, idx) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="gap-1.5 text-xs py-1 px-2.5 bg-primary/10 text-primary border border-primary/25 hover:bg-primary/20 transition-all font-medium"
                  >
                    <span>{c}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveComplaint(idx)}
                      className="ml-1 text-primary/70 hover:text-destructive hover:scale-110 font-bold transition-all"
                      title="Remove complaint"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Quick 1-Click Suggestion Chips */}
            <div className="pt-1 border-t border-border/50">
              <span className="text-[10px] text-muted-foreground block mb-1 font-medium">
                ⚡ Quick 1-Click Symptom Presets:
              </span>
              <div className="flex flex-wrap gap-1">
                {COMMON_CHIEF_COMPLAINTS.map((sym) => {
                  const isSelected = chiefComplaints.includes(sym)
                  return (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setChiefComplaints(chiefComplaints.filter((x) => x !== sym))
                        } else {
                          handleAddComplaint(sym)
                        }
                      }}
                      className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                          : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border/80"
                      }`}
                    >
                      {isSelected ? "✓ " : "+ "}
                      {sym}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            <div>
              <Label className="text-[10px] text-muted-foreground font-semibold">CVS Examination</Label>
              <Input
                value={cvsExam}
                onChange={(e) => setCvsExam(e.target.value)}
                placeholder="S1 S2 Normal..."
                className="mt-1 text-xs h-8"
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground font-semibold">RS Examination</Label>
              <Input
                value={rsExam}
                onChange={(e) => setRsExam(e.target.value)}
                placeholder="B/L Clear, No crepts..."
                className="mt-1 text-xs h-8"
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground font-semibold">CNS Examination</Label>
              <Input
                value={cnsExam}
                onChange={(e) => setCnsExam(e.target.value)}
                placeholder="Conscious, Oriented..."
                className="mt-1 text-xs h-8"
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground font-semibold">P/A (Abdomen)</Label>
              <Input
                value={paExam}
                onChange={(e) => setPaExam(e.target.value)}
                placeholder="Soft, Non-tender..."
                className="mt-1 text-xs h-8"
              />
            </div>
          </div>

          <div>
            <Label className="text-[11px] text-muted-foreground">General Doctor Observations & Clinical Notes</Label>
            <textarea
              rows={2}
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="Detailed physical examination notes, throat congestion, skin rashes, heart sounds..."
              className="mt-1 w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:outline-none"
            />
          </div>
        </div>
      </Card>

      {/* ────────────────────────────────────────────────────────────────
          5. SECTION B: WHO ICD-10 DIAGNOSES
         ──────────────────────────────────────────────────────────────── */}
      <Card className="p-4 rounded-2xl border shadow-xs bg-card space-y-3">
        <div className="pb-2 border-b border-border/70 flex items-center justify-between">
          <span className="font-bold text-xs text-foreground flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            WHO ICD-10 Diagnosis (ABDM & M2 Compliant)
          </span>
          <Badge variant="outline" className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 border-emerald-500/30 bg-emerald-500/10">
            94,765 Codes Database
          </Badge>
        </div>

        <div className="relative autocomplete-dropdown-container">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={diagQuery}
            onChange={(e) => handleDiagSearch(e.target.value)}
            onFocus={() => { if (diagSuggestions.length > 0) setShowDiagDropdown(true) }}
            placeholder="Search WHO ICD-10 codes by disease name or code (e.g. fever, hypertension, bronchitis, malaria, diabetes, A01, E11)..."
            className="pl-9 pr-9 text-xs"
          />
          {isSearchingDiag && (
            <Loader2 className="absolute right-3 top-2.5 h-3.5 w-3.5 text-muted-foreground animate-spin" />
          )}

          {showDiagDropdown && diagSuggestions.length > 0 && (
            <div className="absolute z-50 left-0 right-0 top-full mt-1 max-h-60 overflow-y-auto rounded-xl border border-border bg-popover shadow-xl py-1 divide-y divide-border/50">
              {diagSuggestions.map((d) => {
                const code = (d as any).code_with_separator || d.code
                const name = d.name || (d as any).short_description || d.description || code
                const isSelected = diagnoses.some((x) => x.code === code)
                return (
                  <button
                    key={d.code}
                    type="button"
                    className={`w-full text-left px-3.5 py-2.5 text-xs hover:bg-accent/80 transition-colors flex items-center justify-between gap-3 ${
                      isSelected ? "bg-emerald-500/10 text-emerald-900 dark:text-emerald-200" : ""
                    }`}
                    onClick={() => addDiagnosisItem(d)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-foreground truncate">{name}</div>
                      {(d as any).short_description && (d as any).short_description !== name && (
                        <div className="text-[11px] text-muted-foreground truncate font-normal">
                          {(d as any).short_description}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant="outline" className="font-mono text-[10px] font-bold bg-muted/50 border-emerald-500/40 text-emerald-700 dark:text-emerald-300">
                        {code}
                      </Badge>
                      {isSelected && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick ICD-10 Presets */}
        <div className="pt-0.5">
          <span className="text-[10px] text-muted-foreground block mb-1 font-medium">
            ⚡ Common Diagnostic Codes (1-Click Add):
          </span>
          <div className="flex flex-wrap gap-1">
            {COMMON_ICD_PRESETS.map((item) => {
              const isSelected = diagnoses.some((x) => x.code === item.code)
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      setDiagnoses(diagnoses.filter((x) => x.code !== item.code))
                    } else {
                      addDiagnosisItem(item)
                    }
                  }}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-all flex items-center gap-1 ${
                    isSelected
                      ? "bg-emerald-600 text-white border-emerald-600 font-bold shadow-xs"
                      : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border/80"
                  }`}
                >
                  <span className="font-mono font-semibold">{item.code}</span>
                  <span className="truncate max-w-[130px]">{item.name.split(",")[0]}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected Diagnoses Badges */}
        {diagnoses.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1 border-t border-border/50">
            {diagnoses.map((d) => (
              <Badge
                key={d.code}
                variant="outline"
                className="gap-1.5 border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 py-1 pr-2 text-xs font-medium shadow-2xs"
              >
                <span className="font-mono text-[10px] font-bold bg-emerald-500/20 px-1 py-0.5 rounded">{d.code}</span>
                <span className="font-semibold">{d.name}</span>
                <button
                  type="button"
                  onClick={() => setDiagnoses(diagnoses.filter((x) => x.code !== d.code))}
                  className="ml-1 hover:text-destructive rounded-full hover:bg-destructive/10 p-0.5"
                  title="Remove diagnosis"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </Card>

      {/* ────────────────────────────────────────────────────────────────
          6. SECTION C: LABORATORY & RADIOLOGY INVESTIGATION ORDERS
         ──────────────────────────────────────────────────────────────── */}
      <Card className="p-4 rounded-2xl border shadow-xs bg-card space-y-3">
        <div className="pb-2 border-b border-border/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-purple-600" />
            <span className="font-bold text-xs text-foreground">
              Diagnostic Investigation Orders (Lab & Radiology)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-mono text-purple-700 dark:text-purple-300 border-purple-500/30 bg-purple-500/10">
              Hospital Master & Catalog
            </Badge>
            <span className="text-[11px] text-muted-foreground">{investigations.length} tests ordered</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 relative autocomplete-dropdown-container">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search test by name or code (e.g. CBC, LFT, KFT, X-Ray Chest, USG, ECG, Lipid, HbA1c)..."
              value={invInput}
              onChange={(e) => handleInvSearch(e.target.value)}
              onFocus={() => { if (invSuggestions.length > 0) setShowInvDropdown(true) }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addInvestigation(invInput)
                }
              }}
              className="pl-9 pr-9 text-xs"
            />
            {isSearchingInv && (
              <Loader2 className="absolute right-3 top-2.5 h-3.5 w-3.5 text-muted-foreground animate-spin" />
            )}

            {/* Dropdown for Investigation Search */}
            {showInvDropdown && invSuggestions.length > 0 && (
              <div className="absolute z-50 left-0 right-0 top-full mt-1 max-h-60 overflow-y-auto rounded-xl border border-border bg-popover shadow-xl py-1 divide-y divide-border/50">
                {invSuggestions.map((item, idx) => {
                  const isPath = item.category === "Pathology"
                  const isRad = item.category === "Radiology"
                  const isCard = item.category === "Cardiology"
                  return (
                    <button
                      key={idx}
                      type="button"
                      className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-accent/80 transition-colors flex items-center justify-between gap-3"
                      onClick={() => addInvestigation(item.name, item.category, invUrgency, item.code, item.standard_rate)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-foreground truncate">{item.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {item.code && (
                            <span className="font-mono text-[10px] text-muted-foreground">{item.code}</span>
                          )}
                          {item.standard_rate && (
                            <span className="text-[10px] font-semibold text-foreground/80">₹{item.standard_rate}</span>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] shrink-0 font-medium ${
                          isPath
                            ? "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30"
                            : isRad
                            ? "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30"
                            : isCard
                            ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
                            : "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {item.category}
                      </Badge>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <select
            value={invCategory}
            onChange={(e) => {
              const cat = e.target.value
              setInvCategory(cat)
              if (invInput.trim()) handleInvSearch(invInput, cat)
            }}
            className="h-9 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="All">All Categories</option>
            <option value="Pathology">Pathology</option>
            <option value="Radiology">Radiology</option>
            <option value="Cardiology">Cardiology</option>
          </select>

          <select
            value={invUrgency}
            onChange={(e) => setInvUrgency(e.target.value as any)}
            className="h-9 rounded-md border border-input bg-background px-2 text-xs font-semibold"
          >
            <option value="Routine">Routine</option>
            <option value="Urgent">Urgent</option>
            <option value="STAT">STAT / Emergency</option>
          </select>

          <Button
            type="button"
            size="sm"
            onClick={() => addInvestigation(invInput)}
            className="text-xs gap-1 shrink-0"
          >
            <Plus className="h-3.5 w-3.5" /> Order Test
          </Button>
        </div>

        {/* Quick Investigation Presets */}
        <div className="pt-0.5">
          <span className="text-[10px] text-muted-foreground block mb-1 font-medium">
            ⚡ Common Diagnostic Panels (1-Click Order):
          </span>
          <div className="flex flex-wrap gap-1">
            {COMMON_INVESTIGATION_PRESETS.map((p, pIdx) => {
              const isOrdered = investigations.some((i) => i.name === p.name)
              return (
                <button
                  key={pIdx}
                  type="button"
                  onClick={() => {
                    if (isOrdered) {
                      setInvestigations(investigations.filter((i) => i.name !== p.name))
                    } else {
                      addInvestigation(p.name, p.category, invUrgency, p.code)
                    }
                  }}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-all flex items-center gap-1 ${
                    isOrdered
                      ? "bg-purple-600 text-white border-purple-600 font-bold shadow-xs"
                      : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border/80"
                  }`}
                >
                  <span>{isOrdered ? "✓" : "+"}</span>
                  <span>{p.name}</span>
                  <span className="text-[8px] opacity-75 font-mono">({p.category[0]})</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Ordered Investigations Badges */}
        {investigations.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1 border-t border-border/50">
            {investigations.map((inv, idx) => (
              <Badge
                key={idx}
                variant="outline"
                className="gap-1.5 py-1 pr-2 text-xs bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30 font-medium shadow-2xs"
              >
                <FlaskConical className="h-3 w-3 text-purple-600" />
                <span className="font-semibold">{inv.name}</span>
                <span className="text-[9px] font-mono px-1 bg-purple-500/20 rounded font-semibold">{inv.category}</span>
                <span className={`text-[9px] font-mono px-1 rounded font-bold ${
                  inv.urgency === "STAT" ? "bg-red-500/20 text-red-700 dark:text-red-300" : "bg-purple-500/20"
                }`}>
                  {inv.urgency}
                </span>
                <button
                  type="button"
                  onClick={() => setInvestigations(investigations.filter((_, i) => i !== idx))}
                  className="ml-1 hover:text-destructive rounded-full hover:bg-destructive/10 p-0.5"
                  title="Remove test"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </Card>

      {/* ────────────────────────────────────────────────────────────────
          7. SECTION D: E-PRESCRIPTION MEDICATIONS
         ──────────────────────────────────────────────────────────────── */}
      {/* Clinical Red-Flag & Safety Alert Notice */}
      {((hrVal && (hrVal < 60 || hrVal > 100)) ||
        (sbpVal && sbpVal >= 140) ||
        (tempVal && tempVal >= 100.4) ||
        (spo2Val && spo2Val < 94) ||
        Boolean(custom.allergies || (patient as any)?.allergies)) && (
        <div className="p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5 flex-1">
            <span className="font-bold">⚠️ Encounter Clinical Alerts:</span>
            <div className="flex flex-wrap gap-2 text-[11px] pt-0.5">
              {sbpVal && sbpVal >= 140 && (
                <Badge variant="outline" className="bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-500/30">
                  Elevated BP: {sbpVal}/{dbpVal} mmHg
                </Badge>
              )}
              {tempVal && tempVal >= 100.4 && (
                <Badge variant="outline" className="bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-500/30">
                  High Fever: {tempVal}°F
                </Badge>
              )}
              {spo2Val && spo2Val < 94 && (
                <Badge variant="outline" className="bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-500/30">
                  Low Oxygen SpO2: {spo2Val}%
                </Badge>
              )}
              {(custom.allergies || (patient as any)?.allergies) && (
                <Badge variant="outline" className="bg-rose-500/20 text-rose-900 dark:text-rose-100 border-rose-500/50 font-bold">
                  🚨 Known Allergy: {String(custom.allergies || (patient as any)?.allergies)}
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}

      <Card className="p-4 rounded-2xl border shadow-xs bg-card space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-border/70 gap-2">
          <div className="flex items-center gap-2">
            <Pill className="h-4 w-4 text-emerald-600" />
            <span className="font-bold text-xs text-foreground">
              E-Prescription Medicines & Dosages (Hospital Formulary)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 border-emerald-500/30 bg-emerald-500/10">
              200,000 Medicines Master
            </Badge>
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={() =>
                setMedicines([
                  ...medicines,
                  { medicine_name: "", dosage: "1 tab", frequency: "BD", duration: "5 days", route: "Oral", instructions: "After meals" },
                ])
              }
              className="text-xs gap-1 h-7"
            >
              <Plus className="h-3.5 w-3.5" /> Add Medicine
            </Button>
          </div>
        </div>

        {/* 1-Click Fast Presets (3-Tier: Doctor, Department, Hospital) */}
        <div className="space-y-1.5 pb-2 border-b border-border/50">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-foreground flex items-center gap-1 mr-1">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Quick Presets:
              </span>

              {/* 3-Tier Filter Pills */}
              <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/40 gap-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setPresetScopeTab("all")}
                  className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                    presetScopeTab === "all"
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All ({allRxPresets.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPresetScopeTab("doctor")}
                  className={`px-2 py-0.5 rounded-md font-medium transition-all flex items-center gap-1 ${
                    presetScopeTab === "doctor"
                      ? "bg-amber-600 text-white font-bold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  ⭐ My Presets ({myPresets.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPresetScopeTab("department")}
                  className={`px-2 py-0.5 rounded-md font-medium transition-all flex items-center gap-1 ${
                    presetScopeTab === "department"
                      ? "bg-purple-600 text-white font-bold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  🏢 Dept ({deptPresets.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPresetScopeTab("hospital")}
                  className={`px-2 py-0.5 rounded-md font-medium transition-all flex items-center gap-1 ${
                    presetScopeTab === "hospital"
                      ? "bg-blue-600 text-white font-bold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  🏥 Hospital ({hospitalPresets.length})
                </button>
              </div>
            </div>

            {/* "+ Save as Preset" Button */}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setSavePresetModalOpen(true)}
              disabled={medicines.filter((m) => m.medicine_name.trim() !== "").length === 0}
              className="h-7 text-xs gap-1 border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 font-semibold"
              title={
                medicines.filter((m) => m.medicine_name.trim() !== "").length === 0
                  ? "Add medicines below to save as preset"
                  : "Save current prescription medicines as 1-click Preset"
              }
            >
              <Sparkles className="h-3.5 w-3.5" /> + Save as Preset
            </Button>
          </div>

          {/* Preset Buttons Grid / Chips */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            {displayedPresets.length === 0 ? (
              <span className="text-xs text-muted-foreground italic py-0.5">
                No presets found under this category. Click "+ Save as Preset" to create one.
              </span>
            ) : (
              displayedPresets.map((preset) => (
                <Button
                  key={preset.id || preset.name}
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setMedicines((prev) => [
                      ...prev.filter((m) => m.medicine_name.trim() !== ""),
                      ...preset.meds,
                    ])
                    toast.info(`Applied preset "${preset.name}" (${preset.meds.length} medicines)`)
                  }}
                  className={`text-xs h-7 px-2.5 gap-1.5 border shadow-2xs transition-all ${
                    preset.scope === "doctor"
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-300 hover:bg-amber-500 hover:text-white"
                      : preset.scope === "department"
                      ? "border-purple-500/30 bg-purple-500/10 text-purple-900 dark:text-purple-300 hover:bg-purple-500 hover:text-white"
                      : "border-border hover:bg-primary hover:text-primary-foreground"
                  }`}
                  title={`${preset.name}: ${preset.meds.map((m) => m.medicine_name).join(", ")}`}
                >
                  <span>{preset.icon || "💊"}</span>
                  <span className="font-semibold">{preset.name}</span>
                  {presetScopeTab === "all" && (
                    <span className="text-[10px] opacity-75 font-normal">
                      {preset.scope === "doctor" ? "⭐ My" : preset.scope === "department" ? "🏢 Dept" : "🏥 Common"}
                    </span>
                  )}
                </Button>
              ))
            )}
          </div>
        </div>

        <div className="space-y-2">
          {medicines.map((med, idx) => (
            <div
              key={idx}
              className="grid grid-cols-12 gap-2 items-start rounded-xl border border-border/80 bg-muted/15 p-2.5 text-xs"
            >
              {/* Medicine Name with Database Autocomplete */}
              <div className="col-span-12 sm:col-span-4 relative autocomplete-dropdown-container">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] text-muted-foreground font-semibold">Medicine Name *</Label>
                  <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">Master Search</span>
                </div>
                <div className="relative mt-0.5">
                  <Input
                    value={med.medicine_name}
                    onChange={(e) => handleMedNameChange(e.target.value, idx)}
                    onFocus={() => {
                      if (med.medicine_name && med.medicine_name.trim().length >= 2) {
                        handleMedNameChange(med.medicine_name, idx)
                      }
                    }}
                    placeholder="Type brand or salt name (e.g. Augmentin, Paracetamol, Pan-D)..."
                    className="text-xs pr-7"
                  />
                  {activeMedRow === idx && isSearchingMed && (
                    <Loader2 className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground animate-spin" />
                  )}
                </div>

                {/* Floating Autocomplete Dropdown */}
                {activeMedRow === idx && medSuggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 sm:min-w-[360px] top-full mt-1 max-h-60 overflow-y-auto rounded-xl border border-border bg-popover shadow-2xl py-1 divide-y divide-border/50">
                    {medSuggestions.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-xs hover:bg-accent/80 transition-colors flex flex-col gap-0.5 group"
                        onClick={() => handleSelectMedicine(m, idx)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-foreground group-hover:text-primary transition-colors">
                            {m.brand_name || m.name}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {m.dosage_form && (
                              <Badge variant="outline" className="text-[9px] font-mono px-1 py-0 bg-primary/5 border-primary/30 text-primary">
                                {m.dosage_form}
                              </Badge>
                            )}
                            {m.mrp && (
                              <span className="text-[10px] font-mono text-muted-foreground font-semibold">
                                ₹{m.mrp}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Salt / Generic Composition */}
                        {m.salt_composition && (
                          <p className="text-[10px] text-muted-foreground line-clamp-1 italic">
                            {m.salt_composition}
                          </p>
                        )}
                        {m.manufacturer && (
                          <span className="text-[9px] text-muted-foreground/75 truncate">
                            Mfg: {m.manufacturer}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Dosage with Smart Dropdown + Manual Typing Option */}
              <div className="col-span-4 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] text-muted-foreground font-semibold">Dosage *</Label>
                  <button
                    type="button"
                    onClick={() =>
                      setCustomDosageRows((prev) => ({ ...prev, [idx]: !prev[idx] }))
                    }
                    className="text-[9px] text-primary hover:underline font-mono"
                    title={customDosageRows[idx] ? "Switch to dropdown" : "Type custom dosage"}
                  >
                    {customDosageRows[idx] ? "📋 Dropdown" : "✏️ Custom"}
                  </button>
                </div>

                {customDosageRows[idx] ? (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Input
                      value={med.dosage}
                      onChange={(e) => {
                        const val = e.target.value
                        setMedicines((prev) => prev.map((m, i) => (i === idx ? { ...m, dosage: val } : m)))
                      }}
                      placeholder="e.g. 2.5 ml, 2 puffs, 1 tab"
                      className="text-xs h-9 font-mono"
                      autoFocus
                    />
                  </div>
                ) : (
                  (() => {
                    const detected = detectMedicineFormAndDosage(med.medicine_name, (med as any).dosage_form)
                    const otherDosages = GLOBAL_DOSAGE_OPTIONS.filter(
                      (d) => !detected.suggestedDosages.includes(d)
                    )
                    const isKnownValue =
                      detected.suggestedDosages.includes(med.dosage) ||
                      otherDosages.includes(med.dosage)

                    return (
                      <select
                        value={isKnownValue ? med.dosage : med.dosage ? "__custom_val__" : detected.defaultDosage}
                        onChange={(e) => {
                          const val = e.target.value
                          if (val === "__custom__") {
                            setCustomDosageRows((prev) => ({ ...prev, [idx]: true }))
                          } else if (val === "__custom_val__") {
                            // keep custom
                          } else {
                            setMedicines((prev) =>
                              prev.map((m, i) => (i === idx ? { ...m, dosage: val } : m))
                            )
                          }
                        }}
                        className="mt-0.5 flex h-9 w-full rounded-md border border-input bg-background px-2 text-xs font-mono font-medium focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        {!isKnownValue && med.dosage && (
                          <option value="__custom_val__">{med.dosage} (Custom)</option>
                        )}
                        <optgroup label={`⭐ Suggested (${detected.type})`}>
                          {detected.suggestedDosages.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Other Standard Dosages">
                          {otherDosages.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </optgroup>
                        <option value="__custom__">✏️ Custom / Type manual...</option>
                      </select>
                    )
                  })()
                )}
              </div>

              {/* Frequency */}
              <div className="col-span-4 sm:col-span-2">
                <Label className="text-[10px] text-muted-foreground">Frequency</Label>
                <select
                  value={med.frequency}
                  onChange={(e) => {
                    const val = e.target.value
                    setMedicines((prev) => prev.map((m, i) => (i === idx ? { ...m, frequency: val } : m)))
                  }}
                  className="mt-0.5 flex h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                >
                  {FREQUENCY_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              {/* Duration */}
              <div className="col-span-4 sm:col-span-2">
                <Label className="text-[10px] text-muted-foreground">Duration</Label>
                <Input
                  value={med.duration}
                  onChange={(e) => {
                    const val = e.target.value
                    setMedicines((prev) => prev.map((m, i) => (i === idx ? { ...m, duration: val } : m)))
                  }}
                  placeholder="e.g. 5 days"
                  className="text-xs mt-0.5"
                />
              </div>

              {/* Route & Action */}
              <div className="col-span-12 sm:col-span-2 flex items-end gap-1">
                <div className="flex-1">
                  <Label className="text-[10px] text-muted-foreground">Route</Label>
                  <select
                    value={med.route || "Oral"}
                    onChange={(e) => {
                      const val = e.target.value
                      setMedicines((prev) => prev.map((m, i) => (i === idx ? { ...m, route: val } : m)))
                    }}
                    className="mt-0.5 flex h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                  >
                    {ROUTE_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setMedicines((prev) => prev.filter((_, i) => i !== idx))}
                  className="h-9 w-9 p-0 text-destructive hover:bg-destructive/10 shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ────────────────────────────────────────────────────────────────
          8. SECTION E: CLINICAL ADVICE & FOLLOW-UP DATE
         ──────────────────────────────────────────────────────────────── */}
      <Card className="p-4 rounded-2xl border shadow-xs bg-card space-y-3">
        <div className="pb-2 border-b border-border/70">
          <span className="font-bold text-xs text-foreground flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-primary" />
            General Clinical Advice & Next Follow-Up Schedule
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <Label className="text-[11px] text-muted-foreground">Dietary & Lifestyle Advice</Label>
            <Input
              value={advice}
              onChange={(e) => setAdvice(e.target.value)}
              placeholder="e.g. Drink plenty of warm water, light diet, avoid spicy food..."
              className="mt-1 text-xs"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label className="text-[11px] text-muted-foreground">Next Follow-Up Date</Label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShortcutFollowUp(3)}
                  className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded hover:bg-primary/20"
                >
                  +3d
                </button>
                <button
                  type="button"
                  onClick={() => setShortcutFollowUp(7)}
                  className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded hover:bg-primary/20"
                >
                  +7d
                </button>
                <button
                  type="button"
                  onClick={() => setShortcutFollowUp(15)}
                  className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded hover:bg-primary/20"
                >
                  +15d
                </button>
              </div>
            </div>
            <Input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="mt-1 text-xs font-mono"
            />
          </div>
        </div>
      </Card>

      {/* ────────────────────────────────────────────────────────────────
          8.5 SECTION F: PATIENT DISPOSITION & NEXT ACTION PLAN
         ──────────────────────────────────────────────────────────────── */}
      <Card className="p-4 rounded-2xl border shadow-xs bg-card space-y-3.5">
        <div className="pb-2 border-b border-border/70 flex items-center justify-between">
          <span className="font-bold text-xs text-foreground flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Patient Disposition & Next Clinical Action
          </span>
          <Badge
            variant="outline"
            className={`text-[10px] font-bold uppercase tracking-wider ${
              disposition === "home"
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                : disposition === "day_care"
                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30"
            }`}
          >
            {disposition === "home" ? "Routine OPD Discharge" : disposition === "day_care" ? "Day Care Observation" : "Admit to IPD"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 1. Routine Home */}
          <div
            onClick={() => setDisposition("home")}
            className={`cursor-pointer rounded-xl border p-3 transition-all ${
              disposition === "home"
                ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/40"
                : "border-border/70 bg-muted/10 hover:bg-muted/20"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className={`p-1.5 rounded-lg ${disposition === "home" ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"}`}>
                <Check className="h-3.5 w-3.5" />
              </div>
              <span className="font-bold text-xs text-foreground">Discharge (Home)</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Standard OPD discharge with prescribed oral medicines, lifestyle advice and scheduled follow-up.
            </p>
          </div>

          {/* 2. Day Care Observation */}
          <div
            onClick={() => setDisposition("day_care")}
            className={`cursor-pointer rounded-xl border p-3 transition-all ${
              disposition === "day_care"
                ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/40"
                : "border-border/70 bg-muted/10 hover:bg-muted/20"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className={`p-1.5 rounded-lg ${disposition === "day_care" ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground"}`}>
                <Clock className="h-3.5 w-3.5" />
              </div>
              <span className="font-bold text-xs text-foreground">Day Care Observation</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Short-stay monitoring (2–6 hrs) for IV fluid hydration, nebulization, injections or post-procedure recovery.
            </p>
          </div>

          {/* 3. Recommend IPD Admission */}
          <div
            onClick={() => setDisposition("admit_ipd")}
            className={`cursor-pointer rounded-xl border p-3 transition-all ${
              disposition === "admit_ipd"
                ? "border-rose-500 bg-rose-500/10 ring-1 ring-rose-500/40"
                : "border-border/70 bg-muted/10 hover:bg-muted/20"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className={`p-1.5 rounded-lg ${disposition === "admit_ipd" ? "bg-rose-500 text-white" : "bg-muted text-muted-foreground"}`}>
                <Building2 className="h-3.5 w-3.5" />
              </div>
              <span className="font-bold text-xs text-foreground">Recommend IPD Admission</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Patient requires full inpatient admission. Routes referral directly to IPD Bed Allocation Desk.
            </p>
          </div>
        </div>

        {/* Extended inputs for Day Care or IPD Admission */}
        {disposition === "day_care" && (
          <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2">
            <Label className="text-[11px] text-foreground font-semibold flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-600" />
              Day Care Observation & Short-Stay Instructions
            </Label>
            <Input
              value={dispositionNotes}
              onChange={(e) => setDispositionNotes(e.target.value)}
              placeholder="e.g. IV DNS 500ml with Inj Pantop 40mg, monitor vitals q1h for 3 hours..."
              className="text-xs bg-background"
            />
          </div>
        )}

        {disposition === "admit_ipd" && (
          <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] text-foreground font-semibold">Admission Priority</Label>
                <div className="flex items-center gap-2 mt-1">
                  {(["routine", "urgent", "emergency"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setAdmitPriority(p)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-semibold uppercase tracking-wider transition-all ${
                        admitPriority === p
                          ? p === "emergency"
                            ? "bg-rose-600 text-white shadow-xs"
                            : p === "urgent"
                            ? "bg-amber-600 text-white shadow-xs"
                            : "bg-emerald-600 text-white shadow-xs"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-[11px] text-foreground font-semibold">Recommended Ward / Unit</Label>
                <select
                  value={recommendedWard}
                  onChange={(e) => setRecommendedWard(e.target.value)}
                  className="mt-1 w-full h-8 text-xs px-2 rounded-lg border border-border bg-background text-foreground"
                >
                  <option value="">Select Ward / Unit...</option>
                  <option value="ICU (Intensive Care Unit)">ICU (Intensive Care Unit)</option>
                  <option value="CCU (Cardiac Care Unit)">CCU (Cardiac Care Unit)</option>
                  <option value="General Ward (Male)">General Ward (Male)</option>
                  <option value="General Ward (Female)">General Ward (Female)</option>
                  <option value="Private AC Room">Private AC Room</option>
                  <option value="Semi-Private Room">Semi-Private Room</option>
                  <option value="NICU / PICU">NICU / PICU</option>
                  <option value="Post-Operative Ward">Post-Operative Ward</option>
                  <option value="Emergency Observation">Emergency Observation</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="text-[11px] text-foreground font-semibold">
                Admission Indication & Clinical Referral Notes
              </Label>
              <Input
                value={dispositionNotes}
                onChange={(e) => setDispositionNotes(e.target.value)}
                placeholder="e.g. Unstable vitals, persistent vomiting with dehydration, for IV antibiotic protocol and bedside monitoring..."
                className="mt-1 text-xs bg-background"
              />
            </div>
          </div>
        )}
      </Card>

      {/* ────────────────────────────────────────────────────────────────
          9. STICKY ACTION BAR (DOCTOR SIGN-OFF & COMPLETE)
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
            {rxStatus === "active" || visit.status === "done" || (visit as any).status === "completed"
              ? "Prescription is signed. Any edits will update the active prescription."
              : "Draft keeps visit in consultation. Signing prescription marks token Done."}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setCloseAfterPrint(false)
              setPrintModalOpen(true)
            }}
            className="text-xs gap-1.5 h-9 rounded-xl border-primary/30 text-primary hover:bg-primary/10 font-semibold"
          >
            <Printer className="h-4 w-4" /> Preview Slip
          </Button>

          {/* 💾 SAVE DRAFT BUTTON */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isSavingDraft || isSubmitting}
            onClick={() => handleSavePrescription("draft")}
            className="border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 gap-1.5 text-xs font-bold rounded-xl h-9 px-4 shadow-xs"
            title="Save prescription as draft without completing visit"
          >
            {isSavingDraft ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" /> Saving Draft...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Save Draft
              </>
            )}
          </Button>

          {/* ✓ SIGN & COMPLETE / UPDATE PRESCRIPTION */}
          <Button
            type="button"
            size="sm"
            disabled={isSubmitting || isSavingDraft}
            onClick={() => handleSavePrescription("active", false)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs font-bold rounded-xl shadow-md h-9 px-5"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" /> Saving...
              </>
            ) : rxStatus === "active" || visit.status === "done" || (visit as any).status === "completed" ? (
              <>
                <CheckCircle2 className="h-4 w-4" /> Update Prescription
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" /> Sign & Complete
              </>
            )}
          </Button>

          {/* 🖨️ SIGN / UPDATE & PRINT RX */}
          <Button
            type="button"
            size="sm"
            disabled={isSubmitting || isSavingDraft}
            onClick={() => handleSavePrescription("active", true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 text-xs font-bold rounded-xl shadow-md h-9 px-5"
          >
            <Printer className="h-4 w-4" />
            {rxStatus === "active" || visit.status === "done" || (visit as any).status === "completed"
              ? "Update & Print Rx"
              : "Sign & Print Rx"}
          </Button>
        </div>
      </div>

      {/* Prescription Print Modal */}
      <PrescriptionPrintModal
        open={printModalOpen}
        onClose={() => {
          setPrintModalOpen(false)
          if (closeAfterPrint) {
            if (onSuccess) onSuccess()
            onBack()
          }
        }}
        visit={visit}
        vital={currentVital}
        prescriptionData={{
          chief_complaints: chiefComplaints,
          clinical_notes: [
            clinicalNotes,
            cvsExam ? `CVS: ${cvsExam}` : "",
            rsExam ? `RS: ${rsExam}` : "",
            cnsExam ? `CNS: ${cnsExam}` : "",
            paExam ? `P/A: ${paExam}` : "",
          ].filter(Boolean).join("\n"),
          diagnosis_codes: diagnoses,
          medicines: medicines.filter((m) => m.medicine_name.trim() !== ""),
          investigations: investigations,
          advice: advice,
          follow_up_date: followUpDate,
          doctor_name: user?.name,
        }}
      />

      {/* Audit Log Modal */}
      {currentVital && (
        <VitalAuditModal
          open={auditModalOpen}
          onClose={() => setAuditModalOpen(false)}
          vital={currentVital}
          patientName={visit.patient_name || patient.name}
        />
      )}

      {/* 3-Tier Rx Preset Modal */}
      <SaveRxPresetModal
        isOpen={savePresetModalOpen}
        onClose={() => setSavePresetModalOpen(false)}
        medicines={medicines}
        doctorId={currentDoctorId}
        doctorName={currentDoctorName}
        departmentId={currentDeptId}
        departmentName={currentDeptName}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["settings", "rx_presets"] })}
      />

      {/* Past Visit Full Clinical Details Modal */}
      <PastVisitDetailModal
        open={Boolean(selectedPastVisitModal)}
        onClose={() => setSelectedPastVisitModal(null)}
        visit={selectedPastVisitModal?.visit}
        prescription={selectedPastVisitModal?.prescription}
        patient={patient || visit.patient}
        onCopyMedicines={(medsToCopy) => {
          setMedicines((prev) => {
            const nonEmpty = prev.filter((m) => m.medicine_name.trim() !== "")
            const newRows = medsToCopy.map((m: any) => ({
              medicine_id: m.medicine_id,
              medicine_name: m.medicine_name || m.name || "",
              dosage: m.dosage || "1 tab",
              frequency: m.frequency || "BD",
              duration: m.duration || "5 days",
              route: m.route || "Oral",
              instructions: m.instructions || "After meals",
            }))
            return [...nonEmpty, ...newRows]
          })
          toast.success(
            `Copied ${medsToCopy.length} medication(s) from past visit into your active prescription!`
          )
          setSelectedPastVisitModal(null)
        }}
        onPrintPrescription={(pastVisit, pastRx) => {
          const pastVital =
            pastVisit.latestVital ||
            pastVisit.latest_vital ||
            (Array.isArray(pastVisit.vitals) && pastVisit.vitals.length > 0 ? pastVisit.vitals[0] : null)

          setPastVisitPrintData({
            visit: pastVisit,
            vital: pastVital,
            prescriptionData: {
              chief_complaints: pastRx?.chief_complaints || pastVisit.chief_complaint,
              clinical_notes: pastRx?.clinical_notes || pastVisit.notes,
              diagnosis_codes:
                pastRx?.diagnoses ||
                (pastVisit.diagnosis ? [{ name: pastVisit.diagnosis, is_primary: true }] : []),
              medicines: pastRx?.items || pastRx?.medicines || [],
              investigations: pastRx?.investigations || pastVisit.investigations || [],
              advice: pastRx?.general_advice || pastRx?.advice || pastVisit.advice,
              follow_up_date: pastRx?.follow_up_date || pastVisit.follow_up_date,
              doctor_name: pastVisit.doctor?.name || pastVisit.doctor_name || pastRx?.doctor?.name,
              disposition: pastRx?.disposition || pastVisit.disposition,
              disposition_notes: pastRx?.disposition_notes || pastVisit.disposition_notes,
              admit_priority: pastRx?.admit_priority || pastVisit.admit_priority,
              recommended_ward: pastRx?.recommended_ward || pastVisit.recommended_ward,
            },
          })
        }}
      />

      {/* Past Visit Prescription Print Modal */}
      {pastVisitPrintData && (
        <PrescriptionPrintModal
          open={Boolean(pastVisitPrintData)}
          onClose={() => setPastVisitPrintData(null)}
          visit={pastVisitPrintData.visit}
          vital={pastVisitPrintData.vital}
          prescriptionData={pastVisitPrintData.prescriptionData}
        />
      )}
    </div>
  )
}
