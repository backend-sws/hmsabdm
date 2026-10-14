import React, { useState } from "react"
import { useParams, useNavigate } from "react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  ArrowLeft,
  Stethoscope,
  Activity,
  Droplet,
  Pill,
  ArrowRightLeft,
  DollarSign,
  Plus,
  RefreshCw,
  CheckCircle2,
  Receipt,
  Printer,
  ClipboardList,
  PackageOpen,
  Zap,
  Clock,
  XCircle,
  FlaskConical,
  Syringe,
  Thermometer,
  FileText,
  Scissors,
  ShieldCheck,
} from "lucide-react"

import { SectionCard } from "@/components/SectionCard"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { FormContainer } from "@/components/formContainer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import { ipdService } from "@/services/ipdService"
import { labService } from "@/services/labService"
import { otService } from "@/services/otService"
import { queryKeys } from "@/constants/queryKeys"
import { useWardIndents } from "@/hooks/usePharmacy"
import { CreateWardIndentModal } from "@/components/pharmacy/CreateWardIndentModal"
import { CreateIpdLabOrderModal } from "@/components/lab/CreateIpdLabOrderModal"
import { DiagnosticReportPrintModal } from "@/components/lab/DiagnosticReportPrintModal"
import { IpdVitalsFlowsheetTab } from "@/components/ipd/IpdVitalsFlowsheetTab"
import { RecordIpdVitalModal } from "@/components/ipd/RecordIpdVitalModal"
import { CreateDischargeSummaryModal } from "@/components/ipd/CreateDischargeSummaryModal"
import { PrintDischargeSummaryModal } from "@/components/ipd/PrintDischargeSummaryModal"
import { ScheduleSurgeryModal } from "@/components/ot/ScheduleSurgeryModal"
import { WhoSurgicalSafetyModal } from "@/components/ot/WhoSurgicalSafetyModal"
import { PrintOtChecklistModal } from "@/components/ot/PrintOtChecklistModal"
import { calculateMews } from "@/utils/mewsCalculator"
import type { LabOrder } from "@/types/lab"
import type { OtSchedule } from "@/types/ot"
import type { VitalRecord } from "@/types/opd"
import type {
  DoctorRoundPayload,
  IntakeOutputPayload,
  MarRecordPayload,
  NursingProcedurePayload,
  ShiftHandoverPayload,
  SettleDischargePayload,
  GatePass,
  DischargeEstimate,
} from "@/types/ipd"

export const IpdPatientChartPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const admissionId = Number(id)

  const [activeTab, setActiveTab] = useState<
    "soap" | "vitals" | "fluid" | "mar" | "procedures" | "handover" | "financials" | "indents" | "labs" | "ot"
  >("soap")

  // Modals state
  const [vitalsModalOpen, setVitalsModalOpen] = useState(false)
  const [soapModalOpen, setSoapModalOpen] = useState(false)
  const [ioModalOpen, setIoModalOpen] = useState(false)
  const [marModalOpen, setMarModalOpen] = useState(false)
  const [procedureModalOpen, setProcedureModalOpen] = useState(false)
  const [handoverModalOpen, setHandoverModalOpen] = useState(false)
  const [settleModalOpen, setSettleModalOpen] = useState(false)
  const [gatePassModalOpen, setGatePassModalOpen] = useState(false)
  const [gatePassData, setGatePassData] = useState<GatePass | null>(null)
  const [indentModalOpen, setIndentModalOpen] = useState(false)
  const [labOrderModalOpen, setLabOrderModalOpen] = useState(false)
  const [selectedReportOrderId, setSelectedReportOrderId] = useState<number | null>(null)
  const [dischargeSummaryModalOpen, setDischargeSummaryModalOpen] = useState(false)
  const [printDischargeModalOpen, setPrintDischargeModalOpen] = useState(false)
  const [otBookingModalOpen, setOtBookingModalOpen] = useState(false)
  const [selectedOtSchedule, setSelectedOtSchedule] = useState<OtSchedule | null>(null)
  const [otChecklistModalOpen, setOtChecklistModalOpen] = useState(false)
  const [otPrintModalOpen, setOtPrintModalOpen] = useState(false)

  // ─── Query ──────────────────────────────────────────────────────────
  const {
    data: chartData,
    isLoading: chartLoading,
    refetch: refetchChart,
    isRefetching,
  } = useQuery({
    queryKey: queryKeys.ipd.chart(admissionId),
    queryFn: () => ipdService.getInpatientChart(admissionId),
    enabled: !!admissionId,
  })

  // OT / Surgical Bookings for this inpatient admission
  const { data: patientSurgeries = [], refetch: refetchSurgeries } = useQuery({
    queryKey: ["ot", "schedules", "admission", admissionId],
    queryFn: () => otService.getSchedules({ ipd_admission_id: admissionId }),
    enabled: !!admissionId,
    refetchInterval: 15_000,
  })

  // Ward Indents for this patient
  const { data: indentsResponse, refetch: refetchIndents } = useWardIndents({
    ipd_admission_id: admissionId,
  })
  const patientIndents: any[] = indentsResponse?.data || []

  // Bedside Lab Requisitions for this inpatient admission
  const { data: labOrdersResponse, refetch: refetchLabOrders } = useQuery({
    queryKey: ["lab", "orders", "ipd", admissionId],
    queryFn: () => labService.getOrders({ ipd_admission_id: admissionId, per_page: 50 }),
    enabled: !!admissionId,
    refetchInterval: 15_000,
  })
  const patientLabOrders: LabOrder[] = React.useMemo(() => {
    if (Array.isArray(labOrdersResponse)) return labOrdersResponse
    if (labOrdersResponse && Array.isArray((labOrdersResponse as any).data)) return (labOrdersResponse as any).data
    return []
  }, [labOrdersResponse])

  // ─── IPD Bedside Time-to-Time Vitals ────────────────────────────────
  const {
    data: ipdVitalsRaw,
    refetch: refetchVitals,
  } = useQuery({
    queryKey: ["ipd", "vitals", admissionId],
    queryFn: () => ipdService.getIpdVitals(admissionId),
    enabled: !!admissionId,
    refetchInterval: 15_000,
  })

  const ipdVitals: VitalRecord[] = React.useMemo(() => {
    if (Array.isArray(ipdVitalsRaw)) return ipdVitalsRaw
    if (ipdVitalsRaw && Array.isArray((ipdVitalsRaw as any).data)) return (ipdVitalsRaw as any).data
    return []
  }, [ipdVitalsRaw])

  const latestVital = React.useMemo(() => {
    if (!ipdVitals.length) return null
    return [...ipdVitals].sort(
      (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
    )[0]
  }, [ipdVitals])

  const latestMews = React.useMemo(() => {
    if (!latestVital) return null
    return calculateMews({
      respiratory_rate: latestVital.respiratory_rate,
      pulse_rate: latestVital.pulse_rate,
      blood_pressure_sys: latestVital.blood_pressure_sys,
      temperature: latestVital.temperature,
      avpu: latestVital.custom_vitals?.avpu,
    })
  }, [latestVital])

  const { data: estimateData, refetch: fetchEstimate } = useQuery<DischargeEstimate>({
    queryKey: queryKeys.ipd.dischargeEstimate(admissionId),
    queryFn: () => ipdService.getDischargeEstimate(admissionId),
    enabled: settleModalOpen,
  })

  // ─── Mutations ──────────────────────────────────────────────────────
  // 1. SOAP Round Mutation
  const [soapData, setSoapData] = useState<DoctorRoundPayload>({
    round_type: "routine",
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
    diet_advice: "Regular",
    clinical_condition: "stable",
  })
  const recordRoundMutation = useMutation({
    mutationFn: () => ipdService.recordDoctorRound(admissionId, soapData),
    onSuccess: () => {
      toast.success("Doctor SOAP round recorded successfully!")
      queryClient.invalidateQueries({ queryKey: queryKeys.ipd.chart(admissionId) })
      setSoapModalOpen(false)
      setSoapData({
        round_type: "routine",
        subjective: "",
        objective: "",
        assessment: "",
        plan: "",
        diet_advice: "Regular",
        clinical_condition: "stable",
      })
    },
    onError: (err: any) => toast.error(err.message || "Failed to record doctor round"),
  })

  // 2. Intake / Output Mutation
  const [ioData, setIoData] = useState<IntakeOutputPayload>({
    entry_type: "intake",
    category: "iv_fluid",
    item_name: "Normal Saline (0.9% NaCl)",
    quantity_ml: 500,
    route: "IV",
  })
  const recordIoMutation = useMutation({
    mutationFn: () => ipdService.recordIntakeOutput(admissionId, ioData),
    onSuccess: () => {
      toast.success("Fluid entry logged successfully!")
      queryClient.invalidateQueries({ queryKey: queryKeys.ipd.chart(admissionId) })
      setIoModalOpen(false)
    },
    onError: (err: any) => toast.error(err.message || "Failed to log fluid entry"),
  })

  // 3. MAR Mutation
  const [marData, setMarData] = useState<MarRecordPayload>({
    medicine_name: "",
    dosage: "",
    route: "IV",
    status: "given",
    administered_by_name: "Duty Nurse",
  })
  const recordMarMutation = useMutation({
    mutationFn: () => ipdService.recordMar(admissionId, marData),
    onSuccess: () => {
      toast.success("Medication administration recorded!")
      queryClient.invalidateQueries({ queryKey: queryKeys.ipd.chart(admissionId) })
      setMarModalOpen(false)
    },
    onError: (err: any) => toast.error(err.message || "Failed to record MAR"),
  })

  // 4. Procedure Mutation
  const [procData, setProcData] = useState<NursingProcedurePayload>({
    procedure_name: "IV Cannulation",
    charge_amount: 150,
    notes: "",
  })
  const recordProcedureMutation = useMutation({
    mutationFn: () => ipdService.recordNursingProcedure(admissionId, procData),
    onSuccess: () => {
      toast.success("Nursing procedure logged and fee posted to bill!")
      queryClient.invalidateQueries({ queryKey: queryKeys.ipd.chart(admissionId) })
      setProcedureModalOpen(false)
    },
    onError: (err: any) => toast.error(err.message || "Failed to log procedure"),
  })

  // 5. Shift Handover Mutation
  const [handoverData, setHandoverData] = useState<ShiftHandoverPayload>({
    shift_name: "morning",
    outgoing_nurse_name: "Duty Nurse",
    patient_condition: "stable",
    handover_notes: "",
    critical_alerts: "",
    pending_tasks: "",
  })
  const recordHandoverMutation = useMutation({
    mutationFn: () => ipdService.recordShiftHandover(admissionId, handoverData),
    onSuccess: () => {
      toast.success("Shift handover recorded!")
      queryClient.invalidateQueries({ queryKey: queryKeys.ipd.chart(admissionId) })
      setHandoverModalOpen(false)
    },
    onError: (err: any) => toast.error(err.message || "Failed to record handover"),
  })

  const ackHandoverMutation = useMutation({
    mutationFn: (handoverId: number) =>
      ipdService.acknowledgeShiftHandover(handoverId, "Incoming Duty Nurse"),
    onSuccess: () => {
      toast.success("Shift handover acknowledged!")
      queryClient.invalidateQueries({ queryKey: queryKeys.ipd.chart(admissionId) })
    },
    onError: (err: any) => toast.error(err.message || "Failed to acknowledge"),
  })

  // 6. Settle & Discharge Mutation
  const [settlePayload, setSettlePayload] = useState<SettleDischargePayload>({
    discharge_type: "normal",
    final_diagnosis: "",
    discharge_summary: "",
    discharge_advice: "",
    discount_amount: 0,
    payment_method: "cash",
  })
  const settleDischargeMutation = useMutation({
    mutationFn: () => ipdService.settleDischarge(admissionId, settlePayload),
    onSuccess: async () => {
      toast.success("Bill settled and patient discharged successfully!")
      queryClient.invalidateQueries({ queryKey: queryKeys.ipd.chart(admissionId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.ipd.bedMatrix })
      setSettleModalOpen(false)
      // Fetch and open Gate Pass
      try {
        const pass = await ipdService.getGatePass(admissionId)
        setGatePassData(pass)
        setGatePassModalOpen(true)
      } catch {
        // Fallback
      }
    },
    onError: (err: any) => toast.error(err.message || "Settlement failed"),
  })

  if (chartLoading) {
    return (
      <div className="py-24 flex justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!chartData) {
    return (
      <div className="p-12 text-center">
        <p className="text-muted-foreground">Inpatient record not found.</p>
        <Button onClick={() => navigate("/ipd")} className="mt-4">
          Back to IPD Desk
        </Button>
      </div>
    )
  }

  const {
    admission,
    patient,
    doctor_rounds = [],
    nursing_procedures = [],
    fluid_balance_summary,
    intake_outputs = [],
    mar_administrations = [],
    shift_handovers = [],
    financial_summary,
  } = chartData

  const isDischarged = admission.status === "discharged"

  return (
    <div className="space-y-6 pb-16">
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/ipd")}
          className="gap-2 text-xs"
        >
          <ArrowLeft className="h-4 w-4" /> Back to IPD Desk
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchChart()}
            disabled={isRefetching}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh Chart
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs bg-card hover:bg-accent border-blue-200 dark:border-blue-900/60 font-semibold shadow-2xs"
            onClick={() => setDischargeSummaryModalOpen(true)}
          >
            <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Clinical Discharge Summary
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs bg-card hover:bg-accent border-purple-200 dark:border-purple-900/60 font-semibold shadow-2xs"
            onClick={() => setPrintDischargeModalOpen(true)}
          >
            <Printer className="h-4 w-4 text-purple-600 dark:text-purple-400" /> Discharge Card
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs bg-card hover:bg-accent border-purple-300 dark:border-purple-800 font-semibold shadow-2xs text-purple-700 dark:text-purple-300"
            onClick={() => setOtBookingModalOpen(true)}
          >
            <Scissors className="h-4 w-4" /> Book OT Surgery
          </Button>

          {!isDischarged && (
            <Button
              size="sm"
              variant="default"
              className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
              onClick={() => {
                fetchEstimate()
                setSettleModalOpen(true)
              }}
            >
              <Receipt className="h-4 w-4" /> Discharge & Settle Bill
            </Button>
          )}

          {isDischarged && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={async () => {
                const pass = await ipdService.getGatePass(admissionId)
                setGatePassData(pass)
                setGatePassModalOpen(true)
              }}
            >
              <Printer className="h-4 w-4" /> View Gate Pass
            </Button>
          )}
        </div>
      </div>

      {/* ── Patient 360 Bedside Strip ── */}
      <Card className="overflow-hidden border-2 border-primary/20 shadow-sm bg-card">
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-600 p-4 sm:p-5 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-bold text-xl border border-white/30 text-white">
                {patient?.name?.charAt(0) || "P"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold">{patient?.name}</h3>
                  <Badge className="bg-white/20 text-white border-white/30 text-xs font-mono">
                    {admission.ipd_number}
                  </Badge>
                  {isDischarged ? (
                    <Badge variant="secondary" className="text-xs">
                      Discharged
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-500 text-white text-xs">Admitted</Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-white/80 mt-1">
                  <span>UHID: {patient?.uhid}</span>
                  <span>• {patient?.gender === "M" ? "Male" : patient?.gender === "F" ? "Female" : patient?.gender}</span>
                  {patient?.blood_group && <span>• Blood: {patient.blood_group}</span>}
                  <span>• +91 {patient?.mobile || "N/A"}</span>
                </div>
              </div>
            </div>

            {/* Bed & Doctor Info */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-xl bg-white/10 backdrop-blur-xs px-3.5 py-2 border border-white/20 text-right">
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-80 block">
                  Location
                </span>
                <span className="font-bold text-sm">
                  {admission.ward?.name || "Ward"} • Bed #{admission.bed?.bed_number}
                </span>
              </div>

              <div className="rounded-xl bg-white/10 backdrop-blur-xs px-3.5 py-2 border border-white/20 text-right">
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-80 block">
                  Stay Duration
                </span>
                <span className="font-bold text-sm">{admission.elapsed_days} Days Admitted</span>
              </div>
            </div>
          </div>
        </div>

        {/* Doctor and Financial Strip */}
        <div className="px-5 py-3 bg-accent/20 border-b border-border flex flex-wrap items-center justify-between text-xs gap-3">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <Stethoscope className="h-4 w-4 text-primary" />
              Consultant: {admission.doctor?.name || "Attending Doctor"} (
              {admission.doctor?.specialization || "General"})
            </span>
            {admission.admission_reason && (
              <span className="text-muted-foreground truncate max-w-md">
                Reason: {admission.admission_reason}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 font-mono">
            <span>Total Charged: ₹{financial_summary?.total_charged || 0}</span>
            <span>Advance: ₹{financial_summary?.advance_deposit || 0}</span>
            <span className="font-bold text-rose-600 dark:text-rose-400">
              Net Due: ₹{financial_summary?.net_balance_due || 0}
            </span>
          </div>
        </div>

        {/* Latest Bedside Vitals Strip */}
        <div className="px-5 py-2.5 bg-background/60 border-b border-border flex flex-wrap items-center justify-between text-xs gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Thermometer className="h-3.5 w-3.5 text-rose-500" />
              Latest Bedside Vitals:
            </span>
            {latestVital ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-semibold px-2 py-0.5 rounded-md bg-muted text-foreground border border-border/60">
                  🌡️ {latestVital.temperature ? `${latestVital.temperature}°F` : "—"}
                </span>
                <span className="font-mono font-semibold px-2 py-0.5 rounded-md bg-muted text-foreground border border-border/60">
                  💓 {latestVital.pulse_rate ? `${latestVital.pulse_rate} bpm` : "—"}
                </span>
                <span className="font-mono font-semibold px-2 py-0.5 rounded-md bg-muted text-foreground border border-border/60">
                  🩸 {latestVital.blood_pressure_sys && latestVital.blood_pressure_dia ? `${latestVital.blood_pressure_sys}/${latestVital.blood_pressure_dia}` : "—"}
                </span>
                <span className="font-mono font-semibold px-2 py-0.5 rounded-md bg-muted text-foreground border border-border/60">
                  🫁 {latestVital.oxygen_saturation ? `${latestVital.oxygen_saturation}%` : "—"}
                </span>
                {latestVital.blood_glucose && (
                  <span className="font-mono font-semibold px-2 py-0.5 rounded-md bg-muted text-foreground border border-border/60">
                    🍬 {latestVital.blood_glucose} mg/dL
                  </span>
                )}
                {latestMews && (
                  <Badge
                    variant={latestMews.score >= 5 ? "destructive" : latestMews.score >= 3 ? "secondary" : "outline"}
                    className={`font-mono text-[10px] font-bold ${
                      latestMews.score >= 5
                        ? "bg-rose-600 text-white animate-pulse"
                        : latestMews.score >= 3
                        ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300"
                        : "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
                    }`}
                  >
                    MEWS: {latestMews.score} ({latestMews.risk.toUpperCase()})
                  </Badge>
                )}
                <span className="text-[10px] text-muted-foreground font-mono">
                  ({new Date(latestVital.recorded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})
                </span>
              </div>
            ) : (
              <span className="text-muted-foreground italic text-xs">No bedside vitals logged yet</span>
            )}
          </div>

          {!isDischarged && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px] gap-1 text-primary hover:bg-primary/10 border-primary/30"
              onClick={() => setVitalsModalOpen(true)}
            >
              <Plus className="h-3 w-3" /> Quick Log Vital
            </Button>
          )}
        </div>
      </Card>

      {/* ── Bedside Navigation Tabs ── */}
      <div className="flex overflow-x-auto border-b border-border bg-card/60 p-1.5 rounded-xl shadow-xs gap-2">
        <button
          onClick={() => setActiveTab("soap")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
            activeTab === "soap"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          <Stethoscope className="h-3.5 w-3.5" />
          Doctor Daily Rounds ({doctor_rounds.length})
        </button>

        <button
          onClick={() => setActiveTab("vitals")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
            activeTab === "vitals"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          <Thermometer className="h-3.5 w-3.5 text-rose-500" />
          Vitals & TPR Flowsheet ({ipdVitals.length})
          {latestMews && latestMews.score >= 3 && (
            <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("fluid")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
            activeTab === "fluid"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          <Droplet className="h-3.5 w-3.5" />
          Fluid Balance (I/O)
        </button>

        <button
          onClick={() => setActiveTab("mar")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
            activeTab === "mar"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          <Pill className="h-3.5 w-3.5" />
          MAR Drug Chart ({mar_administrations.length})
        </button>

        <button
          onClick={() => setActiveTab("procedures")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
            activeTab === "procedures"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          <Activity className="h-3.5 w-3.5" />
          Nursing Procedures ({nursing_procedures.length})
        </button>

        <button
          onClick={() => setActiveTab("handover")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
            activeTab === "handover"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          <ArrowRightLeft className="h-3.5 w-3.5" />
          Shift Handover ({shift_handovers.length})
        </button>

        <button
          onClick={() => setActiveTab("indents")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
            activeTab === "indents"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          <ClipboardList className="h-3.5 w-3.5" />
          Pharmacy Indents ({patientIndents.length})
          {patientIndents.some((i: any) => i.status === "PENDING") && (
            <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("labs")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
            activeTab === "labs"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          <FlaskConical className="h-3.5 w-3.5" />
          Lab Investigations ({patientLabOrders.length})
          {patientLabOrders.some(
            (o) => o.urgency === "STAT" && o.status !== "authorized" && o.status !== "cancelled"
          ) && (
            <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("ot")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
            activeTab === "ot"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          <Scissors className="h-3.5 w-3.5 text-purple-400" />
          Surgeries & OT ({patientSurgeries.length})
        </button>

        <button
          onClick={() => setActiveTab("financials")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
            activeTab === "financials"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          <DollarSign className="h-3.5 w-3.5" />
          Financial Ledger & Billing
        </button>
      </div>

      {/* ────────────────────────────────────────────────────────────────
          TAB 1: DOCTOR DAILY ROUNDS (SOAP NOTES)
         ──────────────────────────────────────────────────────────────── */}
      {activeTab === "soap" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-foreground">Doctor Bedside SOAP Notes</h4>
            {!isDischarged && (
              <Button
                size="sm"
                onClick={() => setSoapModalOpen(true)}
                className="gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" /> Record Doctor Round
              </Button>
            )}
          </div>

          {doctor_rounds.length === 0 ? (
            <div className="p-8 text-center border border-dashed rounded-xl text-muted-foreground text-xs">
              No doctor rounds recorded yet. Click "+ Record Doctor Round" to document SOAP progress notes.
            </div>
          ) : (
            <div className="space-y-3">
              {doctor_rounds.map((round: any) => (
                <Card key={round.id} className="shadow-xs border border-border">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center gap-2">
                        <Stethoscope className="h-4 w-4 text-primary" />
                        <span className="font-bold text-sm text-foreground">
                          {round.doctor?.name || "Consultant"}
                        </span>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {round.round_type}
                        </Badge>
                        <Badge
                          variant={
                            round.clinical_condition === "improving"
                              ? "default"
                              : round.clinical_condition === "critical"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-[10px] capitalize"
                        >
                          {round.clinical_condition}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">
                        {round.round_date} {round.round_time || ""}
                      </span>
                    </div>

                    {/* SOAP Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-2.5 rounded-lg bg-accent/20 border border-border">
                        <span className="font-bold text-primary block mb-0.5">S (Subjective)</span>
                        <p className="text-muted-foreground">{round.subjective || "No complaints"}</p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-accent/20 border border-border">
                        <span className="font-bold text-primary block mb-0.5">O (Objective)</span>
                        <p className="text-muted-foreground">{round.objective || "Vitals stable"}</p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-accent/20 border border-border">
                        <span className="font-bold text-primary block mb-0.5">A (Assessment)</span>
                        <p className="text-muted-foreground">{round.assessment || "Progress satisfactory"}</p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-accent/20 border border-border">
                        <span className="font-bold text-primary block mb-0.5">P (Plan)</span>
                        <p className="text-muted-foreground">{round.plan || "Continue treatment"}</p>
                      </div>
                    </div>

                    {round.diet_advice && (
                      <p className="text-xs text-muted-foreground pt-1">
                        <span className="font-semibold text-foreground">Diet Advice:</span>{" "}
                        {round.diet_advice}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────
          TAB: IPD BEDSIDE TIME-TO-TIME VITALS & TPR FLOWSHEET
         ──────────────────────────────────────────────────────────────── */}
      {activeTab === "vitals" && (
        <IpdVitalsFlowsheetTab
          vitals={ipdVitals}
          onOpenRecordModal={() => setVitalsModalOpen(true)}
          isDischarged={isDischarged}
          patientName={patient?.name}
          bedNumber={admission.bed?.bed_number}
        />
      )}

      {/* ────────────────────────────────────────────────────────────────
          TAB 2: FLUID BALANCE (INTAKE / OUTPUT)
         ──────────────────────────────────────────────────────────────── */}
      {activeTab === "fluid" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-foreground">Fluid Balance (Intake / Output Chart)</h4>
            {!isDischarged && (
              <Button
                size="sm"
                onClick={() => setIoModalOpen(true)}
                className="gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" /> Log Fluid Entry
              </Button>
            )}
          </div>

          {/* Balance Summary Box */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/10 text-center">
              <p className="text-xs text-muted-foreground font-semibold">Total Intake</p>
              <h3 className="text-xl font-bold font-mono text-blue-700 dark:text-blue-400">
                {fluid_balance_summary?.total_intake_ml || 0} ml
              </h3>
            </div>
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-center">
              <p className="text-xs text-muted-foreground font-semibold">Total Output</p>
              <h3 className="text-xl font-bold font-mono text-amber-700 dark:text-amber-400">
                {fluid_balance_summary?.total_output_ml || 0} ml
              </h3>
            </div>
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-center">
              <p className="text-xs text-muted-foreground font-semibold">Net Balance</p>
              <h3
                className={`text-xl font-bold font-mono ${
                  (fluid_balance_summary?.net_balance_ml || 0) >= 0
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {fluid_balance_summary?.net_balance_ml || 0} ml
              </h3>
            </div>
          </div>

          {/* Chronological Table */}
          {intake_outputs.length === 0 ? (
            <div className="p-8 text-center border border-dashed rounded-xl text-muted-foreground text-xs">
              No fluid records found. Use "+ Log Fluid Entry" to record IV fluids or urine output.
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="p-3">Type</th>
                    <th className="p-3">Item / Category</th>
                    <th className="p-3">Quantity</th>
                    <th className="p-3">Route</th>
                    <th className="p-3">Recorded By</th>
                    <th className="p-3">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {intake_outputs.map((io: any) => (
                    <tr key={io.id} className="hover:bg-accent/30">
                      <td className="p-3">
                        <Badge
                          variant={io.entry_type === "intake" ? "default" : "secondary"}
                          className="text-[10px] uppercase font-mono"
                        >
                          {io.entry_type}
                        </Badge>
                      </td>
                      <td className="p-3 font-medium text-foreground">{io.item_name}</td>
                      <td className="p-3 font-mono font-bold text-foreground">
                        {io.quantity_ml} ml
                      </td>
                      <td className="p-3">{io.route || "N/A"}</td>
                      <td className="p-3 text-muted-foreground">{io.recorded_by_name || "Nurse"}</td>
                      <td className="p-3 font-mono text-muted-foreground">
                        {io.recorded_at ? new Date(io.recorded_at).toLocaleTimeString("en-IN") : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────
          TAB 3: MAR (DRUG CHART)
         ──────────────────────────────────────────────────────────────── */}
      {activeTab === "mar" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-foreground">
              Medication Administration Record (MAR)
            </h4>
            {!isDischarged && (
              <Button
                size="sm"
                onClick={() => setMarModalOpen(true)}
                className="gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" /> Administer Medication
              </Button>
            )}
          </div>

          {mar_administrations.length === 0 ? (
            <div className="p-8 text-center border border-dashed rounded-xl text-muted-foreground text-xs">
              Drug administration chart is empty. Click "+ Administer Dose" to record administered medication.
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="p-3">Medicine</th>
                    <th className="p-3">Dosage & Route</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Administered By</th>
                    <th className="p-3">Time</th>
                    <th className="p-3">Charge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {mar_administrations.map((m: any) => (
                    <tr key={m.id} className="hover:bg-accent/30">
                      <td className="p-3 font-bold text-foreground">{m.medicine_name}</td>
                      <td className="p-3 text-muted-foreground">
                        {m.dosage} • {m.route || "Oral"}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={m.status === "given" ? "default" : "destructive"}
                          className="text-[10px] uppercase font-mono"
                        >
                          {m.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">{m.administered_by_name || "Nurse"}</td>
                      <td className="p-3 font-mono text-muted-foreground">
                        {m.administered_at ? new Date(m.administered_at).toLocaleTimeString("en-IN") : ""}
                      </td>
                      <td className="p-3 font-mono">₹{m.charge_amount || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────
          TAB 4: NURSING PROCEDURES
         ──────────────────────────────────────────────────────────────── */}
      {activeTab === "procedures" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-foreground">Bedside Nursing Procedures</h4>
            {!isDischarged && (
              <Button
                size="sm"
                onClick={() => setProcedureModalOpen(true)}
                className="gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" /> Log Procedure
              </Button>
            )}
          </div>

          {nursing_procedures.length === 0 ? (
            <div className="p-8 text-center border border-dashed rounded-xl text-muted-foreground text-xs">
              No nursing procedures logged yet. Click "+ Log Procedure" to record dressing, cannulation, or nebulization.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {nursing_procedures.map((p: any) => (
                <Card key={p.id} className="shadow-xs border border-border">
                  <CardContent className="p-3.5 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">{p.procedure_name}</span>
                      <Badge variant="outline" className="font-mono">
                        ₹{p.charge_amount}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-[11px]">
                      Nurse: {p.performed_by_name || "Staff Nurse"}
                    </p>
                    {p.notes && <p className="text-muted-foreground text-[11px] italic">{p.notes}</p>}
                    <span className="block text-[10px] text-muted-foreground font-mono pt-1">
                      {p.performed_at ? new Date(p.performed_at).toLocaleString("en-IN") : ""}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────
          TAB 5: SHIFT HANDOVER
         ──────────────────────────────────────────────────────────────── */}
      {activeTab === "handover" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-foreground">Nurse Shift Handover Register</h4>
            {!isDischarged && (
              <Button
                size="sm"
                onClick={() => setHandoverModalOpen(true)}
                className="gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" /> New Shift Note
              </Button>
            )}
          </div>

          {shift_handovers.length === 0 ? (
            <div className="p-8 text-center border border-dashed rounded-xl text-muted-foreground text-xs">
              No shift handover notes logged yet. Click "+ New Shift Note" to add transition details.
            </div>
          ) : (
            <div className="space-y-3">
              {shift_handovers.map((sh: any) => (
                <Card key={sh.id} className="shadow-xs border border-border">
                  <CardContent className="p-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center gap-2">
                        <Badge className="capitalize text-[10px]">{sh.shift_name} Shift</Badge>
                        <span className="font-medium text-foreground">
                          Outgoing: {sh.outgoing_nurse_name}
                        </span>
                        {sh.incoming_nurse_name && (
                          <span className="text-muted-foreground">
                            ➔ Incoming: {sh.incoming_nurse_name}
                          </span>
                        )}
                      </div>
                      <span className="text-muted-foreground font-mono">{sh.shift_date}</span>
                    </div>

                    <p className="text-foreground leading-relaxed">{sh.handover_notes}</p>

                    {sh.critical_alerts && (
                      <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400">
                        <span className="font-bold">Alert:</span> {sh.critical_alerts}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[11px] text-muted-foreground">
                        Patient condition: <strong className="capitalize">{sh.patient_condition || "Stable"}</strong>
                      </span>

                      {!sh.acknowledged_at ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => ackHandoverMutation.mutate(sh.id)}
                          className="h-7 text-xs gap-1 border-primary/40 text-primary"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Acknowledge Handover
                        </Button>
                      ) : (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-300">
                          Acknowledged
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────
          TAB 6: FINANCIAL LEDGER & DISCHARGE ESTIMATE
         ──────────────────────────────────────────────────────────────── */}
      {activeTab === "financials" && (
        <div className="space-y-6">
          {/* Summary Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="shadow-xs border border-border">
              <CardContent className="p-4">
                <span className="text-xs text-muted-foreground">Total Bill Charges</span>
                <h3 className="text-2xl font-bold font-mono text-foreground mt-1">
                  ₹{financial_summary?.total_charged || 0}
                </h3>
              </CardContent>
            </Card>

            <Card className="shadow-xs border border-border">
              <CardContent className="p-4">
                <span className="text-xs text-muted-foreground">Advance Deposit Paid</span>
                <h3 className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                  ₹{financial_summary?.advance_deposit || 0}
                </h3>
              </CardContent>
            </Card>

            <Card className="shadow-xs border border-border">
              <CardContent className="p-4">
                <span className="text-xs text-muted-foreground">Estimated Net Due</span>
                <h3 className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
                  ₹{financial_summary?.net_balance_due || 0}
                </h3>
              </CardContent>
            </Card>
          </div>

          {/* Category Breakdown */}
          <SectionCard title="Running Tariff Category Breakdown" description="Incurred during current IPD stay">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {financial_summary?.category_breakdown?.map((cat: any, i: number) => (
                <div key={i} className="p-3 rounded-lg border border-border bg-accent/20 space-y-1">
                  <span className="text-xs text-muted-foreground capitalize font-medium">
                    {cat.category.replace(/_/g, " ")} ({cat.count})
                  </span>
                  <p className="text-sm font-bold font-mono text-foreground">
                    ₹{cat.total_amount}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────
          TAB 7: PHARMACY INDENTS & BEDSIDE DRUG REQUISITIONS
         ──────────────────────────────────────────────────────────────── */}
      {activeTab === "indents" && (
        <div className="space-y-6">
          {/* Header & Actions Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="font-bold text-base text-foreground flex items-center gap-2">
                <PackageOpen className="h-5 w-5 text-primary" />
                Bedside Drug Requisitions (Pharmacy Indents)
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Request routine, urgent, or STAT emergency medications directly from Central Pharmacy with auto-IPD billing
              </p>
            </div>

            {!isDischarged && (
              <Button
                size="sm"
                onClick={() => setIndentModalOpen(true)}
                className="gap-2 text-xs font-bold bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25"
              >
                <Plus className="h-4 w-4" />
                Request Medicines (New Indent)
              </Button>
            )}
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="border border-border/80 shadow-xs">
              <CardContent className="p-3.5">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Total Requisitions
                </span>
                <span className="text-2xl font-bold font-mono text-foreground mt-1 block">
                  {patientIndents.length}
                </span>
              </CardContent>
            </Card>

            <Card className="border border-border/80 shadow-xs">
              <CardContent className="p-3.5">
                <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider block flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Pending Pharmacy
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-bold font-mono text-amber-700 dark:text-amber-300">
                    {patientIndents.filter((i) => i.status === "PENDING").length}
                  </span>
                  {patientIndents.filter((i) => i.status === "PENDING").length > 0 && (
                    <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/80 shadow-xs">
              <CardContent className="p-3.5">
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Dispensed & Billed
                </span>
                <span className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-300 mt-1 block">
                  {patientIndents.filter((i) => i.status === "DISPENSED").length}
                </span>
              </CardContent>
            </Card>

            <Card className="border border-border/80 shadow-xs">
              <CardContent className="p-3.5">
                <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider block flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5" />
                  STAT Emergency
                </span>
                <span className="text-2xl font-bold font-mono text-rose-700 dark:text-rose-300 mt-1 block">
                  {patientIndents.filter((i) => i.priority === "STAT" || i.priority === "URGENT").length}
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Indents List */}
          {patientIndents.length === 0 ? (
            <Card className="border border-dashed border-border p-12 text-center">
              <PackageOpen className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
              <h5 className="font-bold text-base text-foreground">No Bedside Drug Requisitions Yet</h5>
              <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
                No medication indents have been raised for this inpatient admission. You can send immediate requests to the central pharmacy for bedside delivery.
              </p>
              {!isDischarged && (
                <Button
                  onClick={() => setIndentModalOpen(true)}
                  className="mt-4 gap-2 text-xs font-bold"
                  size="sm"
                >
                  <Plus className="h-4 w-4" /> Raise First Indent
                </Button>
              )}
            </Card>
          ) : (
            <div className="space-y-4">
              {patientIndents.map((indent: any) => {
                const totalIndentCost = (indent.items || []).reduce(
                  (sum: number, it: any) => sum + (it.total_amount || 0),
                  0
                )

                return (
                  <Card key={indent.id} className="border border-border shadow-xs overflow-hidden">
                    {/* Indent Card Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono font-bold text-sm text-foreground">
                          {indent.indent_number}
                        </span>

                        {/* Priority Badge */}
                        {indent.priority === "STAT" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-bold text-rose-600 dark:text-rose-400 border border-rose-500/20 animate-pulse">
                            <Zap className="h-3 w-3" /> STAT (Emergency)
                          </span>
                        ) : indent.priority === "URGENT" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <Clock className="h-3 w-3" /> Urgent
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            Routine
                          </span>
                        )}

                        <span className="text-xs text-muted-foreground font-medium">
                          • {indent.ward_name} ({indent.bed_number})
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Status Badge */}
                        {indent.status === "DISPENSED" ? (
                          <Badge className="bg-emerald-600 text-white font-bold gap-1 text-xs">
                            <CheckCircle2 className="h-3 w-3" /> Dispensed & Billed
                          </Badge>
                        ) : indent.status === "PENDING" ? (
                          <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 font-bold gap-1 text-xs">
                            <Clock className="h-3 w-3 animate-spin" /> Pending Pharmacy
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="font-bold gap-1 text-xs">
                            <XCircle className="h-3 w-3" /> Rejected
                          </Badge>
                        )}

                        <span className="text-[11px] text-muted-foreground font-mono">
                          {new Date(indent.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <CardContent className="p-4 space-y-3">
                      {/* Items Table */}
                      <div className="overflow-x-auto rounded-xl border border-border">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                            <tr>
                              <th className="py-2.5 pl-4 pr-2">Medication</th>
                              <th className="px-2 py-2.5">Bedside Dosage Instruction</th>
                              <th className="px-2 py-2.5 text-center">Req Qty</th>
                              <th className="px-2 py-2.5 text-center">Disp Qty</th>
                              <th className="px-2 py-2.5">Batch / Expiry</th>
                              <th className="py-2.5 pl-2 pr-4 text-right">Line Total (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/60">
                            {(indent.items || []).map((item: any) => (
                              <tr key={item.id} className="hover:bg-muted/20">
                                <td className="py-2.5 pl-4 pr-2 font-bold text-foreground">
                                  {item.medicine?.brand_name || "Medicine"}
                                  {item.medicine?.dosage_form && (
                                    <span className="ml-1.5 font-normal text-[10px] text-muted-foreground">
                                      ({item.medicine?.dosage_form})
                                    </span>
                                  )}
                                  {item.medicine?.generic_name && (
                                    <p className="text-[10px] font-normal text-muted-foreground">
                                      {item.medicine.generic_name}
                                    </p>
                                  )}
                                </td>
                                <td className="px-2 py-2.5 text-foreground font-medium">
                                  {item.dosage_instruction || "—"}
                                </td>
                                <td className="px-2 py-2.5 text-center font-mono font-bold">
                                  {item.requested_quantity}
                                </td>
                                <td className="px-2 py-2.5 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                  {item.dispensed_quantity || 0}
                                </td>
                                <td className="px-2 py-2.5 text-xs font-mono text-muted-foreground">
                                  {item.batch ? (
                                    <span>
                                      #{item.batch.batch_number} (Exp: {item.batch.expiry_date})
                                    </span>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                                <td className="py-2.5 pl-2 pr-4 text-right font-mono font-bold text-foreground">
                                  ₹{(item.total_amount || 0).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Clinical Notes & Requester Info */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground pt-1">
                        <div>
                          {indent.notes && (
                            <span>
                              <strong className="text-foreground">Bedside Remarks:</strong> {indent.notes}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px]">
                          <span>
                            Requested by: <strong className="text-foreground">{indent.requested_by?.name || "Staff"}</strong>
                          </span>
                          {indent.dispensed_by?.name && (
                            <span>
                              Dispensed by: <strong className="text-emerald-600 dark:text-emerald-400">{indent.dispensed_by.name}</strong>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Financial Integration Status Banner */}
                      {indent.status === "DISPENSED" && (
                        <div className="flex items-center justify-between rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3 text-xs text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
                          <span className="flex items-center gap-2 font-medium">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            Inventory decremented & charges automatically posted to IPD Ledger (Tariff: Pharmacy).
                          </span>
                          <span className="font-mono font-bold text-sm text-emerald-700 dark:text-emerald-400">
                            Total Billed: ₹{totalIndentCost.toFixed(2)}
                          </span>
                        </div>
                      )}

                      {indent.status === "PENDING" && (
                        <div className="flex items-center gap-2 rounded-xl border border-amber-200/80 bg-amber-50/70 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
                          <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 animate-spin" />
                          <span>
                            Requisition currently active on the Central Pharmacy Desk queue. Once prepared by the pharmacist, medicines will be delivered to Bed {indent.bed_number} ({indent.ward_name}).
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────
          TAB 8: LAB INVESTIGATIONS & BEDSIDE DIAGNOSTIC REQUISITIONS
         ──────────────────────────────────────────────────────────────── */}
      {activeTab === "labs" && (
        <div className="space-y-6">
          {/* Header & Actions Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="font-bold text-base text-foreground flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Bedside Lab & Diagnostic Investigations
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Inpatient laboratory requisitions (CBC, LFT, KFT, Cultures, ABG) with bedside phlebotomy tracking, auto-IPD billing & live report viewer
              </p>
            </div>

            {!isDischarged && (
              <Button
                size="sm"
                onClick={() => setLabOrderModalOpen(true)}
                className="gap-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25"
              >
                <Plus className="h-4 w-4" />
                Order Lab Tests (Bedside Requisition)
              </Button>
            )}
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="border border-border/80 shadow-xs">
              <CardContent className="p-3.5">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Total Diagnostic Orders
                </span>
                <span className="text-2xl font-bold font-mono text-foreground mt-1 block">
                  {patientLabOrders.length}
                </span>
              </CardContent>
            </Card>

            <Card className="border border-border/80 shadow-xs">
              <CardContent className="p-3.5">
                <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider block flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Awaiting Phlebotomy
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-bold font-mono text-amber-700 dark:text-amber-300">
                    {patientLabOrders.filter((o) => o.status === "pending_sample").length}
                  </span>
                  {patientLabOrders.filter((o) => o.status === "pending_sample").length > 0 && (
                    <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/80 shadow-xs">
              <CardContent className="p-3.5">
                <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5" />
                  Sample In Testing
                </span>
                <span className="text-2xl font-bold font-mono text-indigo-700 dark:text-indigo-300 mt-1 block">
                  {patientLabOrders.filter((o) => ["sample_collected", "in_progress", "result_entered", "completed"].includes(o.status)).length}
                </span>
              </CardContent>
            </Card>

            <Card className="border border-border/80 shadow-xs">
              <CardContent className="p-3.5">
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Reports Authorized
                </span>
                <span className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-300 mt-1 block">
                  {patientLabOrders.filter((o) => o.status === "authorized" || o.status === "partially_authorized").length}
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Lab Orders List */}
          {patientLabOrders.length === 0 ? (
            <Card className="border border-dashed border-border p-12 text-center">
              <FlaskConical className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
              <h5 className="font-bold text-base text-foreground">No Laboratory Investigations Ordered Yet</h5>
              <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
                No diagnostic blood or pathology tests have been requisitioned for this admission. You can order routine or STAT emergency bedside investigations directly.
              </p>
              {!isDischarged && (
                <Button
                  onClick={() => setLabOrderModalOpen(true)}
                  className="mt-4 gap-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  <Plus className="h-4 w-4" /> Order First Lab Investigation
                </Button>
              )}
            </Card>
          ) : (
            <div className="space-y-4">
              {patientLabOrders.map((order) => {
                const totalOrderCost = (order.items || []).reduce(
                  (sum: number, it) => sum + (Number(it.rate) || 0),
                  0
                )
                const isReady = ["completed", "partially_authorized", "authorized"].includes(order.status)

                return (
                  <Card key={order.id} className="border border-border shadow-xs overflow-hidden">
                    {/* Order Card Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono font-bold text-sm text-foreground">
                          {order.order_number}
                        </span>

                        {/* Priority Badge */}
                        {order.urgency === "STAT" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-bold text-rose-600 dark:text-rose-400 border border-rose-500/20 animate-pulse">
                            <Zap className="h-3 w-3" /> STAT (Emergency)
                          </span>
                        ) : order.urgency === "Urgent" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <Clock className="h-3 w-3" /> Urgent
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            Routine
                          </span>
                        )}

                        {order.is_bedside_collection && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                            <Syringe className="h-3 w-3" /> Bedside Draw (Bed #{admission.bed?.bed_number})
                          </span>
                        )}

                        {order.token_number && (
                          <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {order.token_number}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Status Badge */}
                        {order.status === "authorized" ? (
                          <Badge className="bg-emerald-600 text-white font-bold gap-1 text-xs">
                            <CheckCircle2 className="h-3 w-3" /> Authorized & Ready
                          </Badge>
                        ) : order.status === "partially_authorized" ? (
                          <Badge className="bg-teal-600 text-white font-bold gap-1 text-xs">
                            <CheckCircle2 className="h-3 w-3" /> Partial Authorized
                          </Badge>
                        ) : order.status === "completed" || order.status === "result_entered" ? (
                          <Badge className="bg-indigo-600 text-white font-semibold gap-1 text-xs">
                            <Activity className="h-3 w-3" /> Results Recorded
                          </Badge>
                        ) : order.status === "sample_collected" ? (
                          <Badge className="bg-blue-600 text-white font-semibold gap-1 text-xs">
                            <Syringe className="h-3 w-3" /> Sample Collected
                          </Badge>
                        ) : order.status === "in_progress" ? (
                          <Badge className="bg-purple-600 text-white font-semibold gap-1 text-xs">
                            <Activity className="h-3 w-3 animate-spin" /> In Testing
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 gap-1 text-xs">
                            <Clock className="h-3 w-3 animate-pulse" /> Awaiting Phlebotomy
                          </Badge>
                        )}

                        {/* View/Print Report Action Button */}
                        {isReady && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => setSelectedReportOrderId(order.id)}
                            className="gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            View / Print Report
                          </Button>
                        )}
                      </div>
                    </div>

                    <CardContent className="p-4 space-y-4">
                      {/* Ordered Tests Table */}
                      <div className="overflow-x-auto rounded-lg border border-border/80">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/80">
                            <tr>
                              <th className="py-2.5 pl-4 pr-2">Test / Investigation</th>
                              <th className="px-2 py-2.5">Category</th>
                              <th className="px-2 py-2.5">Vial / Sample</th>
                              <th className="px-2 py-2.5 text-center">Status</th>
                              <th className="py-2.5 pl-2 pr-4 text-right">Standard Rate</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/60">
                            {(order.items || []).map((item) => (
                              <tr key={item.id} className="hover:bg-muted/20">
                                <td className="py-2.5 pl-4 pr-2 font-semibold text-foreground">
                                  {item.test_name}
                                  {item.test_code && (
                                    <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">
                                      ({item.test_code})
                                    </span>
                                  )}
                                </td>
                                <td className="px-2 py-2.5 text-muted-foreground">
                                  {item.category || item.test_template?.category || "Pathology"}
                                </td>
                                <td className="px-2 py-2.5 text-muted-foreground">
                                  {item.test_template?.container_color ? (
                                    <span className="font-medium text-foreground">
                                      {item.test_template.container_color}
                                    </span>
                                  ) : (
                                    item.test_template?.sample_type || "Blood/Serum"
                                  )}
                                </td>
                                <td className="px-2 py-2.5 text-center">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                                    item.status === "authorized"
                                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                      : item.status === "sample_collected"
                                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                      : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                  }`}>
                                    {item.status.replace("_", " ")}
                                  </span>
                                </td>
                                <td className="py-2.5 pl-2 pr-4 text-right font-mono font-bold text-foreground">
                                  ₹{Number(item.rate || 0).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Phlebotomy Details & Barcode Accession */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground pt-1">
                        <div className="flex items-center gap-3">
                          {order.sample_accession_number ? (
                            <span className="flex items-center gap-1 font-mono font-bold text-foreground bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                              Accession Barcode: {order.sample_accession_number}
                            </span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400">
                              Barcode will be generated upon sample accessioning
                            </span>
                          )}
                          {order.sample_collected_at && (
                            <span>
                              Collected: {new Date(order.sample_collected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px]">
                          <span>
                            Ordered at: <strong className="text-foreground">{new Date(order.created_at).toLocaleString()}</strong>
                          </span>
                          {order.authorizing_doctor && (
                            <span>
                              Authorized by: <strong className="text-emerald-600 dark:text-emerald-400">Dr. {order.authorizing_doctor.name}</strong>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Clinical Indication Notes */}
                      {order.clinical_notes && (
                        <div className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/60">
                          <strong className="text-foreground">Clinical Indication:</strong> {order.clinical_notes}
                        </div>
                      )}

                      {/* Billing Integration Callout */}
                      <div className="flex items-center justify-between rounded-xl border border-blue-200/80 bg-blue-50/70 p-3 text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-300">
                        <span className="flex items-center gap-2 font-medium">
                          <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                          Diagnostic charges automatically debited to IPD Ledger (Tariff: Investigation). Settled at discharge.
                        </span>
                        <span className="font-mono font-bold text-sm text-blue-700 dark:text-blue-400">
                          Total Requisition: ₹{totalOrderCost.toFixed(2)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────
          TAB: SURGICAL CASE BOOKINGS & WHO SAFETY CHECKLISTS
         ──────────────────────────────────────────────────────────────── */}
      {activeTab === "ot" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-card shadow-2xs">
            <div>
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Scissors className="h-4 w-4 text-purple-600" />
                Inpatient Surgical Bookings & OT Records
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Surgeries scheduled for this inpatient admission, theatre allocations, and WHO safety sign-off.
              </p>
            </div>

            {!isDischarged && (
              <Button
                size="sm"
                onClick={() => setOtBookingModalOpen(true)}
                className="gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-xs"
              >
                <Plus className="h-4 w-4" /> Book Surgery (OT)
              </Button>
            )}
          </div>

          {patientSurgeries.length === 0 ? (
            <Card className="border-2 border-dashed border-border/80">
              <CardContent className="p-12 text-center text-muted-foreground space-y-3">
                <Scissors className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                <p className="text-sm font-semibold text-foreground">No surgeries scheduled yet</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  If this patient requires an operative procedure, click below to schedule the Operation Theatre and initiate the WHO Pre-Op Checklist.
                </p>
                {!isDischarged && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setOtBookingModalOpen(true)}
                    className="gap-1.5 text-xs text-purple-600 border-purple-300 dark:border-purple-800"
                  >
                    <Plus className="h-4 w-4" /> Schedule Surgery Now
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {patientSurgeries.map((s) => {
                const checklist = s.checklist_record
                const signInDone = checklist?.sign_in_completed
                const timeOutDone = checklist?.time_out_completed
                const signOutDone = checklist?.sign_out_completed

                return (
                  <Card key={s.id} className="border-2 border-border/80 hover:border-purple-400/40 transition-all shadow-2xs">
                    <div className="p-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-foreground">
                            {s.booking_number}
                          </span>
                          <Badge
                            className={`text-[10px] uppercase font-bold tracking-wider ${
                              s.status === "in_theatre"
                                ? "bg-amber-600 text-white animate-pulse"
                                : s.status === "recovery"
                                ? "bg-indigo-600 text-white"
                                : s.status === "completed"
                                ? "bg-emerald-600 text-white"
                                : "bg-purple-600 text-white"
                            }`}
                          >
                            {s.status.replace("_", " ")}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {s.priority}
                          </Badge>
                        </div>
                        <h4 className="text-base font-bold text-foreground">{s.procedure_name}</h4>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1.5 border-purple-200 dark:border-purple-900 text-purple-600 dark:text-purple-400"
                          onClick={() => {
                            setSelectedOtSchedule(s)
                            setOtPrintModalOpen(true)
                          }}
                        >
                          <Printer className="h-3.5 w-3.5" /> Printable Dossier
                        </Button>

                        <Button
                          size="sm"
                          className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                          onClick={() => {
                            setSelectedOtSchedule(s)
                            setOtChecklistModalOpen(true)
                          }}
                        >
                          <ShieldCheck className="h-3.5 w-3.5" /> WHO Safety Checklist
                        </Button>
                      </div>
                    </div>

                    <CardContent className="p-4 space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase">Operation Theatre</span>
                          <span className="font-bold text-purple-700 dark:text-purple-400">
                            {s.operation_theatre?.name || "Unassigned OT"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase">Surgery Date & Time</span>
                          <span className="font-semibold font-mono">
                            {s.surgery_date} • {s.scheduled_start_time || "09:00"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase">Primary Surgeon</span>
                          <span className="font-bold">Dr. {s.primary_surgeon?.name || "-"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase">Anesthesia</span>
                          <span className="font-bold uppercase">{s.anesthesia_type}</span>
                        </div>
                      </div>

                      {/* Checklist Status Banner */}
                      <div className="p-3 rounded-lg border border-border bg-muted/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-muted-foreground">WHO Safety Protocol:</span>
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${signInDone ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>
                              1. Sign In {signInDone ? "✓" : "○"}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${timeOutDone ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>
                              2. Time Out {timeOutDone ? "✓" : "○"}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${signOutDone ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>
                              3. Sign Out {signOutDone ? "✓" : "○"}
                            </span>
                          </div>
                        </div>

                        {signInDone && timeOutDone && signOutDone ? (
                          <Badge className="bg-emerald-600 text-white text-[10px] gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Fully Compliant
                          </Badge>
                        ) : (
                          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                            Checklist verification in progress
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────
          MODAL: RECORD DOCTOR SOAP ROUND
         ──────────────────────────────────────────────────────────────── */}
      <FormContainer
        open={soapModalOpen}
        onOpenChange={setSoapModalOpen}
        title="Record Doctor Daily Bedside Round"
        description="Clinical progress notes with SOAP format & auto-charging"
        size="lg"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setSoapModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => recordRoundMutation.mutate()}
              disabled={recordRoundMutation.isPending}
            >
              {recordRoundMutation.isPending ? "Saving..." : "Save SOAP Round"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Clinical Condition</Label>
              <select
                value={soapData.clinical_condition}
                onChange={(e) =>
                  setSoapData({ ...soapData, clinical_condition: e.target.value as any })
                }
                className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1"
              >
                <option value="improving">Improving</option>
                <option value="stable">Stable</option>
                <option value="deteriorating">Deteriorating</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <Label>Diet Advice</Label>
              <Input
                value={soapData.diet_advice}
                onChange={(e) => setSoapData({ ...soapData, diet_advice: e.target.value })}
                placeholder="e.g. Soft diet, Diabetic, NPO"
                className="text-xs mt-1"
              />
            </div>
          </div>

          <div>
            <Label>Subjective (Patient complaints / symptoms)</Label>
            <Input
              value={soapData.subjective}
              onChange={(e) => setSoapData({ ...soapData, subjective: e.target.value })}
              placeholder="e.g. Mild pain relieved with analgesics"
              className="text-xs mt-1"
            />
          </div>

          <div>
            <Label>Objective (Vitals, physical examination, wound inspection)</Label>
            <Input
              value={soapData.objective}
              onChange={(e) => setSoapData({ ...soapData, objective: e.target.value })}
              placeholder="e.g. Abdomen soft, dressings clean and dry"
              className="text-xs mt-1"
            />
          </div>

          <div>
            <Label>Assessment (Diagnosis & current status)</Label>
            <Input
              value={soapData.assessment}
              onChange={(e) => setSoapData({ ...soapData, assessment: e.target.value })}
              placeholder="e.g. Post-op Day 2 recovery on track"
              className="text-xs mt-1"
            />
          </div>

          <div>
            <Label>Plan (Medications, investigations, step-down)</Label>
            <Input
              value={soapData.plan}
              onChange={(e) => setSoapData({ ...soapData, plan: e.target.value })}
              placeholder="e.g. Taper IV fluids, plan soft diet tomorrow"
              className="text-xs mt-1"
            />
          </div>
        </div>
      </FormContainer>

      {/* ────────────────────────────────────────────────────────────────
          MODAL: FLUID BALANCE ENTRY
         ──────────────────────────────────────────────────────────────── */}
      <FormContainer
        open={ioModalOpen}
        onOpenChange={setIoModalOpen}
        title="Record Fluid Balance Entry"
        description="Log Intake or Output for fluid chart calculation"
        size="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setIoModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => recordIoMutation.mutate()} disabled={recordIoMutation.isPending}>
              {recordIoMutation.isPending ? "Logging..." : "Log Entry"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Entry Type *</Label>
              <select
                value={ioData.entry_type}
                onChange={(e) => setIoData({ ...ioData, entry_type: e.target.value as any })}
                className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1"
              >
                <option value="intake">Intake (Fluid in)</option>
                <option value="output">Output (Fluid out)</option>
              </select>
            </div>
            <div>
              <Label>Quantity (ml) *</Label>
              <Input
                type="number"
                value={ioData.quantity_ml}
                onChange={(e) => setIoData({ ...ioData, quantity_ml: Number(e.target.value) })}
                className="text-xs mt-1 font-mono"
              />
            </div>
          </div>

          <div>
            <Label>Item / Fluid Name *</Label>
            <Input
              value={ioData.item_name}
              onChange={(e) => setIoData({ ...ioData, item_name: e.target.value })}
              placeholder="e.g. Normal Saline, Ringer Lactate, Urine, RT Aspirate"
              className="text-xs mt-1"
            />
          </div>

          <div>
            <Label>Route</Label>
            <Input
              value={ioData.route}
              onChange={(e) => setIoData({ ...ioData, route: e.target.value })}
              placeholder="e.g. IV, Oral, Catheter"
              className="text-xs mt-1"
            />
          </div>
        </div>
      </FormContainer>

      {/* ────────────────────────────────────────────────────────────────
          MODAL: ADMINISTER MEDICATION (MAR)
         ──────────────────────────────────────────────────────────────── */}
      <FormContainer
        open={marModalOpen}
        onOpenChange={setMarModalOpen}
        title="Administer Inpatient Medication"
        description="Bedside drug administration log & nurse verification"
        size="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setMarModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => recordMarMutation.mutate()} disabled={recordMarMutation.isPending}>
              {recordMarMutation.isPending ? "Recording..." : "Record Dose"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2 text-xs">
          <div>
            <Label>Medicine Name *</Label>
            <Input
              value={marData.medicine_name}
              onChange={(e) => setMarData({ ...marData, medicine_name: e.target.value })}
              placeholder="e.g. Inj Pantoprazole 40mg"
              className="text-xs mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Dosage *</Label>
              <Input
                value={marData.dosage}
                onChange={(e) => setMarData({ ...marData, dosage: e.target.value })}
                placeholder="e.g. 40 mg, 1 ampoule"
                className="text-xs mt-1"
              />
            </div>
            <div>
              <Label>Route</Label>
              <select
                value={marData.route}
                onChange={(e) => setMarData({ ...marData, route: e.target.value })}
                className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1"
              >
                <option value="IV">IV</option>
                <option value="Oral">Oral</option>
                <option value="IM">IM</option>
                <option value="SC">SC</option>
                <option value="Inhaled">Inhaled</option>
              </select>
            </div>
          </div>

          <div>
            <Label>Status</Label>
            <select
              value={marData.status}
              onChange={(e) => setMarData({ ...marData, status: e.target.value as any })}
              className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1"
            >
              <option value="given">Given</option>
              <option value="omitted">Omitted</option>
              <option value="refused">Refused</option>
              <option value="held">Held</option>
            </select>
          </div>
        </div>
      </FormContainer>

      {/* ────────────────────────────────────────────────────────────────
          MODAL: RECORD NURSING PROCEDURE
         ──────────────────────────────────────────────────────────────── */}
      <FormContainer
        open={procedureModalOpen}
        onOpenChange={setProcedureModalOpen}
        title="Record Bedside Nursing Procedure"
        description="Posts procedure and charge to patient's running bill"
        size="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setProcedureModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => recordProcedureMutation.mutate()}
              disabled={recordProcedureMutation.isPending}
            >
              {recordProcedureMutation.isPending ? "Logging..." : "Log Procedure"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2 text-xs">
          <div>
            <Label>Procedure Name *</Label>
            <select
              value={procData.procedure_name}
              onChange={(e) => {
                const name = e.target.value
                const cost =
                  name === "IV Cannulation"
                    ? 150
                    : name === "Wound Dressing"
                    ? 200
                    : name === "Catheterization"
                    ? 300
                    : 250
                setProcData({ ...procData, procedure_name: name, charge_amount: cost })
              }}
              className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1"
            >
              <option value="IV Cannulation">IV Cannulation (₹150)</option>
              <option value="Wound Dressing">Wound Dressing (₹200)</option>
              <option value="Catheterization">Urinary Catheterization (₹300)</option>
              <option value="Ryle's Tube Insertion">Ryle's Tube Insertion (₹250)</option>
              <option value="Nebulization">Nebulization Session (₹100)</option>
            </select>
          </div>

          <div>
            <Label>Charge Amount (₹)</Label>
            <Input
              type="number"
              value={procData.charge_amount}
              onChange={(e) => setProcData({ ...procData, charge_amount: Number(e.target.value) })}
              className="text-xs mt-1 font-mono"
            />
          </div>

          <div>
            <Label>Clinical Notes</Label>
            <Input
              value={procData.notes}
              onChange={(e) => setProcData({ ...procData, notes: e.target.value })}
              placeholder="e.g. 18G cannula inserted left forearm"
              className="text-xs mt-1"
            />
          </div>
        </div>
      </FormContainer>

      {/* ────────────────────────────────────────────────────────────────
          MODAL: SHIFT HANDOVER
         ──────────────────────────────────────────────────────────────── */}
      <FormContainer
        open={handoverModalOpen}
        onOpenChange={setHandoverModalOpen}
        title="Record Nurse Shift Handover"
        description="Bedside SBAR clinical handover to incoming nurse"
        size="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setHandoverModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => recordHandoverMutation.mutate()}
              disabled={recordHandoverMutation.isPending}
            >
              {recordHandoverMutation.isPending ? "Saving..." : "Save Handover"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Shift Name</Label>
              <select
                value={handoverData.shift_name}
                onChange={(e) =>
                  setHandoverData({ ...handoverData, shift_name: e.target.value as any })
                }
                className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1"
              >
                <option value="morning">Morning Shift</option>
                <option value="evening">Evening Shift</option>
                <option value="night">Night Shift</option>
              </select>
            </div>
            <div>
              <Label>Patient Condition</Label>
              <select
                value={handoverData.patient_condition}
                onChange={(e) =>
                  setHandoverData({ ...handoverData, patient_condition: e.target.value as any })
                }
                className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1"
              >
                <option value="stable">Stable</option>
                <option value="critical">Critical</option>
                <option value="deteriorating">Deteriorating</option>
                <option value="post_op">Post-Op</option>
              </select>
            </div>
          </div>

          <div>
            <Label>Handover Clinical Notes *</Label>
            <Input
              value={handoverData.handover_notes}
              onChange={(e) => setHandoverData({ ...handoverData, handover_notes: e.target.value })}
              placeholder="e.g. Vitals stable, morning dose administered, pending blood test"
              className="text-xs mt-1"
            />
          </div>

          <div>
            <Label>Critical Alerts (Optional)</Label>
            <Input
              value={handoverData.critical_alerts}
              onChange={(e) => setHandoverData({ ...handoverData, critical_alerts: e.target.value })}
              placeholder="e.g. Low platelet warning, monitor BP hourly"
              className="text-xs mt-1"
            />
          </div>
        </div>
      </FormContainer>

      {/* ────────────────────────────────────────────────────────────────
          MODAL: SETTLE BILL & DISCHARGE PATIENT
         ──────────────────────────────────────────────────────────────── */}
      <FormContainer
        open={settleModalOpen}
        onOpenChange={setSettleModalOpen}
        title="Final Bill Settlement & Discharge"
        description="Settle running account, factor advance deposit, free bed, and generate Gate Pass"
        size="lg"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setSettleModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => settleDischargeMutation.mutate()}
              disabled={settleDischargeMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {settleDischargeMutation.isPending ? "Settling..." : "Confirm Settlement & Discharge"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2 text-xs">
          {/* Billing Preview Box */}
          <div className="p-4 rounded-xl border border-border bg-accent/20 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Inpatient Charges:</span>
              <span className="font-mono font-bold">₹{estimateData?.total_charges || financial_summary?.total_charged || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Advance Deposit Paid:</span>
              <span className="font-mono font-bold text-emerald-600">
                - ₹{estimateData?.advance_deposit_paid || financial_summary?.advance_deposit || 0}
              </span>
            </div>
            <div className="flex justify-between border-t pt-2 text-sm font-bold">
              <span>Net Payable Balance:</span>
              <span className="font-mono text-rose-600 dark:text-rose-400">
                ₹{estimateData?.net_balance_due || financial_summary?.net_balance_due || 0}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Discharge Type</Label>
              <select
                value={settlePayload.discharge_type}
                onChange={(e) =>
                  setSettlePayload({ ...settlePayload, discharge_type: e.target.value as any })
                }
                className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1"
              >
                <option value="normal">Normal Recovery</option>
                <option value="lama">LAMA (Against Medical Advice)</option>
                <option value="transfer">Transferred to other Center</option>
                <option value="referred">Referred</option>
              </select>
            </div>
            <div>
              <Label>Payment Mode for Balance</Label>
              <select
                value={settlePayload.payment_method}
                onChange={(e) =>
                  setSettlePayload({ ...settlePayload, payment_method: e.target.value })
                }
                className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1"
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI / Online</option>
                <option value="card">Card</option>
                <option value="insurance">Insurance Claim</option>
              </select>
            </div>
          </div>

          <div>
            <Label>Final Diagnosis</Label>
            <Input
              value={settlePayload.final_diagnosis}
              onChange={(e) => setSettlePayload({ ...settlePayload, final_diagnosis: e.target.value })}
              placeholder="e.g. Acute Appendicitis status post Lap Appendectomy (ICD-10 K35)"
              className="text-xs mt-1"
            />
          </div>

          <div>
            <Label>Discharge Advice & Follow-up</Label>
            <Input
              value={settlePayload.discharge_advice}
              onChange={(e) => setSettlePayload({ ...settlePayload, discharge_advice: e.target.value })}
              placeholder="e.g. Suture removal in 7 days, tab Paracetamol SOS"
              className="text-xs mt-1"
            />
          </div>
        </div>
      </FormContainer>

      {/* ────────────────────────────────────────────────────────────────
          MODAL: OFFICIAL GATE PASS DISPLAY
         ──────────────────────────────────────────────────────────────── */}
      <FormContainer
        open={gatePassModalOpen}
        onOpenChange={setGatePassModalOpen}
        title="Official Security Clearance Gate Pass"
        description="Patient Discharge & Security Verification Pass"
        size="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setGatePassModalOpen(false)}>
              Close
            </Button>
            <Button onClick={() => window.print()} className="gap-2">
              <Printer className="h-4 w-4" /> Print Gate Pass
            </Button>
          </div>
        }
      >
        {gatePassData && (
          <div className="p-6 border-2 border-dashed border-emerald-500/40 rounded-2xl bg-emerald-500/5 space-y-4 text-xs font-mono">
            <div className="text-center pb-3 border-b border-border/80">
              <h3 className="font-bold text-base text-foreground uppercase tracking-widest">
                Hospital Security Gate Pass
              </h3>
              <p className="text-[11px] text-muted-foreground">Clearance Stamp for Inpatient Exit</p>
              <Badge className="bg-emerald-600 text-white font-mono mt-2">
                {gatePassData.gate_pass_number}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground block text-[10px]">PATIENT NAME:</span>
                <span className="font-bold text-foreground">{gatePassData.patient_name}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">UHID / IPD NO:</span>
                <span className="font-bold text-foreground">
                  {gatePassData.uhid} / {gatePassData.ipd_number}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">WARD & BED:</span>
                <span className="font-bold text-foreground">
                  {gatePassData.ward_name} • Bed #{gatePassData.bed_number}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">DOCTOR:</span>
                <span className="font-bold text-foreground">{gatePassData.doctor_name}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-center font-bold text-emerald-800 dark:text-emerald-300">
              STATUS: {gatePassData.clearance_status}
            </div>

            <div className="flex justify-between text-[10px] text-muted-foreground pt-2">
              <span>ISSUED AT: {gatePassData.issued_at}</span>
              <span>BY: {gatePassData.issued_by}</span>
            </div>
          </div>
        )}
      </FormContainer>

      {/* ────────────────────────────────────────────────────────────────
          MODAL: BEDSIDE PHARMACY DRUG REQUISITION (INDENT)
         ──────────────────────────────────────────────────────────────── */}
      <CreateWardIndentModal
        isOpen={indentModalOpen}
        onClose={() => setIndentModalOpen(false)}
        onSuccess={() => {
          refetchIndents()
          refetchChart()
        }}
        prefillAdmissionId={admission.id}
        prefillWardName={admission.ward?.name}
        prefillBedNumber={admission.bed?.bed_number}
        prefillPatientName={patient?.name}
        prefillUhid={patient?.uhid}
      />

      {/* ────────────────────────────────────────────────────────────────
          MODAL: BEDSIDE LAB & DIAGNOSTIC REQUISITION
         ──────────────────────────────────────────────────────────────── */}
      <CreateIpdLabOrderModal
        isOpen={labOrderModalOpen}
        onClose={() => setLabOrderModalOpen(false)}
        onSuccess={() => {
          refetchLabOrders()
          refetchChart()
        }}
        admissionId={admission.id}
        patientName={patient?.name || "Patient"}
        uhid={patient?.uhid || ""}
        wardName={admission.ward?.name}
        bedNumber={admission.bed?.bed_number}
        doctorId={admission.doctor?.id ? Number(admission.doctor.id) : null}
        doctorName={admission.doctor?.name}
      />

      {/* ────────────────────────────────────────────────────────────────
          MODAL: DIAGNOSTIC LAB REPORT VIEWER & PRINT MODAL
         ──────────────────────────────────────────────────────────────── */}
      {selectedReportOrderId && (
        <DiagnosticReportPrintModal
          orderId={selectedReportOrderId}
          onClose={() => setSelectedReportOrderId(null)}
        />
      )}

      {/* ────────────────────────────────────────────────────────────────
          MODAL: RECORD BEDSIDE VITAL READING (TPR + MEWS)
         ──────────────────────────────────────────────────────────────── */}
      <RecordIpdVitalModal
        isOpen={vitalsModalOpen}
        onClose={() => setVitalsModalOpen(false)}
        onSuccess={() => {
          refetchVitals()
          refetchChart()
        }}
        admissionId={admission.id}
        patientId={patient?.id || 0}
        patientName={patient?.name || "Patient"}
        uhid={patient?.uhid || ""}
        wardName={admission.ward?.name}
        bedNumber={admission.bed?.bed_number}
      />

      {/* ────────────────────────────────────────────────────────────────
          MODAL: CLINICAL DISCHARGE SUMMARY & PROPOSAL
         ──────────────────────────────────────────────────────────────── */}
      <CreateDischargeSummaryModal
        isOpen={dischargeSummaryModalOpen}
        onClose={() => setDischargeSummaryModalOpen(false)}
        admissionId={admission.id}
        patientName={patient?.name || "Patient"}
        uhid={patient?.uhid || ""}
        onSuccess={() => {
          refetchChart()
        }}
        onOpenPrint={() => {
          setDischargeSummaryModalOpen(false)
          setPrintDischargeModalOpen(true)
        }}
      />

      {/* ────────────────────────────────────────────────────────────────
          MODAL: PRINTABLE NABH DISCHARGE CARD
         ──────────────────────────────────────────────────────────────── */}
      <PrintDischargeSummaryModal
        isOpen={printDischargeModalOpen}
        onClose={() => setPrintDischargeModalOpen(false)}
        admissionId={admission.id}
      />

      {/* ────────────────────────────────────────────────────────────────
          MODAL: SCHEDULE / BOOK SURGERY (OT)
         ──────────────────────────────────────────────────────────────── */}
      <ScheduleSurgeryModal
        isOpen={otBookingModalOpen}
        onClose={() => setOtBookingModalOpen(false)}
        prefillPatientId={patient?.id ? Number(patient.id) : undefined}
        prefillPatientName={patient?.name}
        prefillUhid={patient?.uhid}
        prefillAdmissionId={admission.id}
        prefillDoctorId={admission.doctor?.id ? Number(admission.doctor.id) : undefined}
        prefillDepartmentId={admission.department?.id ? Number(admission.department.id) : undefined}
        onSuccess={() => {
          refetchSurgeries()
          refetchChart()
        }}
      />

      {/* ────────────────────────────────────────────────────────────────
          MODAL: WHO SURGICAL SAFETY CHECKLIST (SIGN IN, TIME OUT, SIGN OUT)
         ──────────────────────────────────────────────────────────────── */}
      {selectedOtSchedule && (
        <WhoSurgicalSafetyModal
          isOpen={otChecklistModalOpen}
          onClose={() => setOtChecklistModalOpen(false)}
          schedule={selectedOtSchedule}
          onSuccess={() => {
            refetchSurgeries()
            refetchChart()
          }}
          onOpenPrint={() => {
            setOtChecklistModalOpen(false)
            setOtPrintModalOpen(true)
          }}
        />
      )}

      {/* ────────────────────────────────────────────────────────────────
          MODAL: PRINTABLE NABH SURGICAL SAFETY DOSSIER
         ──────────────────────────────────────────────────────────────── */}
      {selectedOtSchedule && (
        <PrintOtChecklistModal
          isOpen={otPrintModalOpen}
          onClose={() => setOtPrintModalOpen(false)}
          scheduleId={selectedOtSchedule.id}
        />
      )}
    </div>
  )
}

export default IpdPatientChartPage
