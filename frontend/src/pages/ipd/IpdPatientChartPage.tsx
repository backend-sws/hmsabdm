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
import { queryKeys } from "@/constants/queryKeys"
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
    "soap" | "fluid" | "mar" | "procedures" | "handover" | "financials"
  >("soap")

  // Modals state
  const [soapModalOpen, setSoapModalOpen] = useState(false)
  const [ioModalOpen, setIoModalOpen] = useState(false)
  const [marModalOpen, setMarModalOpen] = useState(false)
  const [procedureModalOpen, setProcedureModalOpen] = useState(false)
  const [handoverModalOpen, setHandoverModalOpen] = useState(false)
  const [settleModalOpen, setSettleModalOpen] = useState(false)
  const [gatePassModalOpen, setGatePassModalOpen] = useState(false)
  const [gatePassData, setGatePassData] = useState<GatePass | null>(null)

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
      </Card>

      {/* ── 6 Bedside Navigation Tabs ── */}
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
    </div>
  )
}

export default IpdPatientChartPage
