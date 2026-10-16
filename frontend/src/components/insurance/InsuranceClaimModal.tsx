import React, { useState, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Receipt,
  Plus,
  Search,
  RefreshCw,
  Landmark,
  FileText,
  ShieldAlert,
  Eye,
  Printer,
  ExternalLink,
  Scale,
  Building2,
  PhoneCall,
  PhoneForwarded,
  Calendar,
  Send,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { insuranceService } from "@/services/insuranceService"
import { PatientAdmissionPicker } from "./PatientAdmissionPicker"

interface Props {
  embedded?: boolean
  onClose?: () => void
  onRefresh?: () => void
  initialData?: any
}

const CLAIM_STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20" },
  submitted: { label: "Submitted", color: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25" },
  under_review: { label: "Under Review", color: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25" },
  additional_docs_needed: { label: "Docs Needed", color: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30" },
  approved: { label: "Approved", color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25" },
  partially_approved: { label: "Partial Approved", color: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/25" },
  settled: { label: "Settled", color: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/30" },
  rejected: { label: "Rejected", color: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25" },
  grievance_raised: { label: "Grievance Raised", color: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/25" },
  resubmitted: { label: "Resubmitted", color: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/25" },
  written_off: { label: "Written Off", color: "bg-neutral-500/10 text-neutral-700 dark:text-neutral-400 border-neutral-500/20" },
}

export const InsuranceClaimModal: React.FC<Props> = ({ embedded, onClose, onRefresh, initialData }) => {
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showSettleModal, setShowSettleModal] = useState<any>(null)
  const [showGrievanceModal, setShowGrievanceModal] = useState<any>(null)
  const [showDossierModal, setShowDossierModal] = useState<any>(null)

  // Settle form state
  const [settleAmount, setSettleAmount] = useState("")
  const [settleUtr, setSettleUtr] = useState("")
  const [settleNotes, setSettleNotes] = useState("")

  // Grievance form state
  const [grievanceNotes, setGrievanceNotes] = useState("")
  const [grievanceReason, setGrievanceReason] = useState("unwarranted_deduction")
  const [grievanceAmount, setGrievanceAmount] = useState("")
  const [grievanceCitation, setGrievanceCitation] = useState("IRDAI Master Circular IRDAI/HLT/REG/CIR/068/03/2020")
  const [printDisputeClaim, setPrintDisputeClaim] = useState<any>(null)

  // Follow-up state
  const [activeClaimFollowup, setActiveClaimFollowup] = useState<number | null>(null)
  const [claimFollowupForm, setClaimFollowupForm] = useState({
    contact_person: "",
    channel: "Phone Call",
    status_discussed: "Promised Settlement",
    notes: "",
    next_followup_date: "",
  })

  // Create claim form state
  const [newClaim, setNewClaim] = useState({
    payer_id: "",
    patient_insurance_id: "",
    admission_id: "",
    preauth_id: "",
    claim_type: "cashless",
    total_bill_amount: "",
    non_payable_amount: "0",
    tpa_claim_number: "",
    nhcx_claim_id: "",
    tms_transaction_id: "",
    auto_submit: true,
  })

  // Pre-fill from approved pre-auth (1-Click Claim Conversion)
  useEffect(() => {
    if (initialData) {
      setNewClaim({
        payer_id: String(initialData.payer_id || initialData.payer?.id || ""),
        patient_insurance_id: String(initialData.patient_insurance_id || ""),
        admission_id: String(initialData.admission_id || ""),
        preauth_id: String(initialData.id || ""),
        claim_type: "cashless",
        total_bill_amount: String(initialData.approved_amount || initialData.estimated_amount || ""),
        non_payable_amount: "0",
        tpa_claim_number: initialData.tpa_preauth_number || "",
        nhcx_claim_id: "",
        tms_transaction_id: "",
        auto_submit: true,
      })
      setShowCreateForm(true)
    }
  }, [initialData])

  // Queries
  const { data: claims, isLoading, refetch } = useQuery({
    queryKey: ["insurance", "claims", statusFilter, search],
    queryFn: () => insuranceService.getClaims({ status: statusFilter, search }),
  })

  const { data: payers = [] } = useQuery({
    queryKey: ["insurance", "payers"],
    queryFn: () => insuranceService.getPayers(),
  })

  // Mutations
  const createClaimMutation = useMutation({
    mutationFn: (data: any) => insuranceService.createClaim(data),
    onSuccess: () => {
      toast.success("Claim created successfully")
      setShowCreateForm(false)
      refetch()
      onRefresh?.()
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to create claim")
    },
  })

  const settleMutation = useMutation({
    mutationFn: ({ id, data }: any) => insuranceService.settleClaim(id, data),
    onSuccess: () => {
      toast.success("Settlement recorded and added to AR Ledger")
      setShowSettleModal(null)
      refetch()
      onRefresh?.()
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to record settlement")
    },
  })

  const grievanceMutation = useMutation({
    mutationFn: ({ id, notes }: any) => insuranceService.raiseGrievance(id, notes),
    onSuccess: () => {
      toast.success("Grievance raised successfully")
      setShowGrievanceModal(null)
      refetch()
      onRefresh?.()
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to raise grievance")
    },
  })

  const resubmitMutation = useMutation({
    mutationFn: (id: number) => insuranceService.resubmitClaim(id),
    onSuccess: () => {
      toast.success("Claim resubmitted")
      refetch()
      onRefresh?.()
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to resubmit claim")
    },
  })

  const claimFollowupMutation = useMutation({
    mutationFn: ({ id, data }: any) => insuranceService.addClaimFollowup(id, data),
    onSuccess: () => {
      toast.success("Claim follow-up note saved")
      refetch()
      setClaimFollowupForm({
        contact_person: "",
        channel: "Phone Call",
        status_discussed: "Promised Settlement",
        notes: "",
        next_followup_date: "",
      })
    },
    onError: () => toast.error("Failed to save claim follow-up note"),
  })

  const claimList = Array.isArray(claims?.data) ? claims.data : Array.isArray(claims) ? claims : []

  return (
    <div className={embedded ? "space-y-4" : "bg-background rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col"}>
      {!embedded && (
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2">
              <Receipt className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Claims & Cashless Settlements</h2>
              <p className="text-xs text-muted-foreground">IRDAI compliant claim submission, COB, settlement reconciliation</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground">✕</button>
        </div>
      )}

      <div className={embedded ? "" : "flex-1 overflow-y-auto p-4"}>
        {/* Top Controls */}
        <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
          <div className="flex items-center gap-2 flex-1 min-w-64">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="pl-9 h-9"
                placeholder="Search claim #, patient, TPA..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button size="sm" variant="ghost" onClick={() => refetch()}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={() => setShowCreateForm(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Create Claim
            </Button>
          </div>
        </div>

        {/* Status Filters */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3.5">
          {[
            { id: "all", label: "All Claims" },
            { id: "submitted", label: "Submitted" },
            { id: "under_review", label: "Under Review" },
            { id: "approved", label: "Approved" },
            { id: "settled", label: "Settled" },
            { id: "rejected", label: "Rejected" },
            { id: "grievance_raised", label: "Grievances" },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setStatusFilter(s.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === s.id
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Claims List */}
        <div className="space-y-3">
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 rounded-2xl border border-border bg-muted/30 animate-pulse" />
            ))}

          {!isLoading && !claimList.length && (
            <div className="text-center py-12 rounded-2xl border border-dashed border-border/80 text-muted-foreground p-8">
              <Receipt className="h-10 w-10 mx-auto mb-2 opacity-30 text-primary" />
              <p className="text-sm font-bold text-foreground">No claims found in this view</p>
              <p className="text-xs mt-1 text-muted-foreground font-medium">Submit a cashless claim from an IPD discharge or OPD treatment.</p>
            </div>
          )}

          {claimList.map((claim: any) => {
            const statusCfg = CLAIM_STATUS_MAP[claim.status] || CLAIM_STATUS_MAP.draft
            const isOutstanding = claim.status !== "settled" && claim.status !== "written_off"

            return (
              <div
                key={claim.id}
                className="rounded-2xl border border-border/80 bg-card p-5 shadow-[0_1px_3px_0_rgba(15,23,42,0.04),0_6px_16px_-4px_rgba(15,23,42,0.05)] hover:shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05),0_14px_28px_-6px_rgba(15,23,42,0.08)] hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold font-mono tracking-tight text-sm text-foreground">{claim.claim_number}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border tracking-wider flex items-center gap-1.5 shadow-2xs ${statusCfg.color}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current shrink-0 animate-pulse" />
                        {statusCfg.label}
                      </span>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                        {claim.claim_type?.replace("_", " ")}
                      </Badge>
                      {claim.tpa_claim_number && (
                        <span className="text-xs font-mono text-muted-foreground">TPA Ref: {claim.tpa_claim_number}</span>
                      )}
                      {claim.payer?.portal_url && (
                        <a
                          href={claim.payer.portal_url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-muted/80 hover:bg-muted text-foreground border border-border/80 transition-colors"
                          title={`Open ${claim.payer.name} Portal`}
                        >
                          <ExternalLink className="h-2.5 w-2.5 text-primary" /> {claim.payer.code || "TPA Portal"}
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Payer: <strong className="text-foreground font-semibold">{claim.payer?.name || "—"}</strong>
                      {claim.patient_insurance?.insured_name && ` · Insured: ${claim.patient_insurance.insured_name}`}
                      {claim.submission_date && ` · Submitted: ${claim.submission_date}`}
                    </p>
                  </div>

                  {/* Financial Breakdown Strip */}
                  <div className="flex items-center gap-3 bg-muted/30 rounded-xl px-3.5 py-2 border border-border/60 shadow-2xs">
                    <div className="text-right">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total Bill</p>
                      <p className="text-xs sm:text-sm font-bold font-mono tabular-nums text-foreground">₹{Number(claim.total_bill_amount || 0).toLocaleString("en-IN")}</p>
                    </div>
                    <div className="h-6 w-px bg-border/80" />
                    <div className="text-right">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Claimed</p>
                      <p className="text-xs sm:text-sm font-black font-mono tabular-nums text-primary">
                        ₹{Number(claim.claimed_amount || 0).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="h-6 w-px bg-border/80" />
                    <div className="text-right">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Settled</p>
                      <p className="text-xs sm:text-sm font-black font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                        ₹{Number(claim.settled_amount || 0).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sub row with deductions / non-payables */}
                <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
                  <div className="flex gap-4">
                    <span>Non-Payable: <strong className="text-foreground">₹{Number(claim.non_payable_amount || 0).toLocaleString("en-IN")}</strong></span>
                    <span>Copay: <strong className="text-foreground">₹{Number(claim.copay_amount || 0).toLocaleString("en-IN")}</strong></span>
                    {Number(claim.deducted_amount) > 0 && (
                      <span className="text-red-500">Deductions: ₹{Number(claim.deducted_amount).toLocaleString("en-IN")}</span>
                    )}
                    {claim.settlement_utr && (
                      <span className="text-emerald-700 font-mono">UTR: {claim.settlement_utr}</span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5">
                    {claim.status === "approved" || claim.status === "partially_approved" || claim.status === "submitted" || claim.status === "grievance_raised" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                        onClick={() => {
                          setSettleAmount(String(claim.approved_amount || claim.claimed_amount || ""))
                          setShowSettleModal(claim)
                        }}
                      >
                        <Landmark className="h-3 w-3 mr-1" /> Settle Claim
                      </Button>
                    ) : null}

                    {claim.status === "rejected" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-amber-300 text-amber-700"
                        onClick={() => resubmitMutation.mutate(claim.id)}
                      >
                        Resubmit
                      </Button>
                    )}

                    {isOutstanding && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-purple-700 hover:bg-purple-50"
                        onClick={() => {
                          setGrievanceAmount(String(claim.deducted_amount || Math.max(0, (claim.claimed_amount || 0) - (claim.settled_amount || claim.approved_amount || 0))))
                          setGrievanceNotes(
                            `Arbitrary deduction of ₹${claim.deducted_amount || 0} applied on room rent, doctor visits, and OT consumables without clinical justification. Under IRDAI Master Circular IRDAI/HLT/REG/CIR/068, deductions cannot be imposed arbitrarily without clinical guidelines.`
                          )
                          setShowGrievanceModal(claim)
                        }}
                      >
                        <ShieldAlert className="h-3 w-3 mr-1" /> Grievance
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => {
                        insuranceService.getClaimDossier(claim.id).then(setShowDossierModal)
                      }}
                    >
                      <Eye className="h-3 w-3 mr-1" /> Dossier
                    </Button>
                  </div>
                </div>

                {/* ── Active Grievance Banner ── */}
                {claim.status === "grievance_raised" && (
                  <div className="mt-3 p-3 rounded-xl bg-purple-50/90 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="font-semibold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                        <Scale className="h-4 w-4 text-purple-700" /> Formal IRDAI Grievance Active
                      </span>
                      {claim.grievance_raised_at && (
                        <span className="text-[11px] text-purple-700 dark:text-purple-300">
                          Filed: {new Date(claim.grievance_raised_at).toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>
                    {claim.grievance_notes && (
                      <p className="text-purple-950 dark:text-purple-100 bg-background/90 p-2.5 rounded-lg border border-purple-100 dark:border-purple-900 text-xs whitespace-pre-wrap leading-relaxed">
                        {claim.grievance_notes}
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                      <span className="text-[10px] text-purple-700/80 dark:text-purple-300/80">
                        Dispatched to {claim.payer?.name || "TPA"} Grievance Redressal Officer (GRO) & Hospital AR Audit Ledger
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[11px] border-purple-300 text-purple-800 hover:bg-purple-100 dark:border-purple-700 dark:text-purple-200"
                        onClick={(e) => {
                          e.stopPropagation()
                          setPrintDisputeClaim({
                            ...claim,
                            dispute_notes: claim.grievance_notes,
                            disputed_amount: claim.deducted_amount || 0,
                            citation: "IRDAI Master Circular IRDAI/HLT/REG/CIR/068/03/2020",
                          })
                        }}
                      >
                        <Printer className="h-3 w-3 mr-1" /> Print Dispute Notice
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── Claim TPA Calling & Follow-up Log Accordion ── */}
                <div className="border border-border rounded-xl p-3 bg-muted/20 space-y-2 mt-3">
                  <div
                    className="flex items-center justify-between cursor-pointer select-none text-xs font-semibold text-foreground/80 hover:text-foreground"
                    onClick={() => setActiveClaimFollowup(activeClaimFollowup === claim.id ? null : claim.id)}
                  >
                    <div className="flex items-center gap-1.5">
                      <PhoneCall className="h-3.5 w-3.5 text-blue-600" />
                      <span>Claim Settlement & TPA Calling Log</span>
                      <span className="rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 text-[10px] font-bold px-1.5 py-0.2">
                        {(claim.followup_notes || []).length}
                      </span>
                    </div>
                    <span className="text-[11px] text-primary">
                      {activeClaimFollowup === claim.id ? "▲ Close Log" : "▼ Open Log & Add Note"}
                    </span>
                  </div>

                  {activeClaimFollowup === claim.id && (
                    <div className="pt-2 space-y-3 border-t border-border/60">
                      {Array.isArray(claim.followup_notes) && claim.followup_notes.length > 0 ? (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {claim.followup_notes.map((fn: any, idx: number) => (
                            <div
                              key={fn.id || idx}
                              className="rounded-lg bg-background p-2.5 border border-border text-xs space-y-1 shadow-xs"
                            >
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-semibold text-foreground flex items-center gap-1">
                                  <PhoneForwarded className="h-3 w-3 text-blue-600" />
                                  {fn.contact_person || "TPA Settlement Desk"} · <span className="text-muted-foreground">{fn.channel || "Phone Call"}</span>
                                </span>
                                <span className="text-muted-foreground text-[10px]">
                                  {fn.timestamp ? new Date(fn.timestamp).toLocaleString("en-IN") : "Just now"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                {fn.status_discussed && (
                                  <span className="rounded bg-primary/10 text-primary text-[10px] font-medium px-1.5 py-0.5">
                                    {fn.status_discussed}
                                  </span>
                                )}
                                <span className="text-muted-foreground text-[10px]">
                                  Logged by: <strong>{fn.caller_name || "Staff"}</strong>
                                </span>
                                {fn.next_followup_date && (
                                  <span className="text-[10px] text-amber-700 dark:text-amber-300 font-medium flex items-center gap-1">
                                    <Calendar className="h-2.5 w-2.5" /> Next: {fn.next_followup_date}
                                  </span>
                                )}
                              </div>
                              <p className="text-foreground/90 whitespace-pre-wrap text-[11px] bg-muted/30 p-1.5 rounded">
                                {fn.notes}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground italic text-center py-2">
                          No settlement follow-up calls logged yet for this claim.
                        </p>
                      )}

                      {/* Quick Add Form */}
                      <div className="bg-background rounded-lg border border-border p-3 space-y-2">
                        <p className="text-[11px] font-semibold text-foreground">Log TPA Settlement Interaction:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <Input
                              className="h-7 text-xs"
                              placeholder="Officer Name / RM"
                              value={claimFollowupForm.contact_person}
                              onChange={(e) => setClaimFollowupForm((prev) => ({ ...prev, contact_person: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Select
                              value={claimFollowupForm.channel}
                              onValueChange={(val) => setClaimFollowupForm((prev) => ({ ...prev, channel: val }))}
                            >
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue placeholder="Channel" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Phone Call">📞 Phone Call</SelectItem>
                                <SelectItem value="TPA Portal">🌐 TPA Portal</SelectItem>
                                <SelectItem value="Email">✉️ Email</SelectItem>
                                <SelectItem value="Bank Advice">🏦 Bank Advice</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Select
                              value={claimFollowupForm.status_discussed}
                              onValueChange={(val) => setClaimFollowupForm((prev) => ({ ...prev, status_discussed: val }))}
                            >
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue placeholder="Topic" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Promised Settlement">Promised Settlement</SelectItem>
                                <SelectItem value="UTR Number Shared">UTR Number Shared</SelectItem>
                                <SelectItem value="Audit Deduction Discussed">Audit Deduction Discussed</SelectItem>
                                <SelectItem value="Dispute Filed">Dispute Filed</SelectItem>
                                <SelectItem value="Cheque in Transit">Cheque in Transit</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                          <div className="sm:col-span-3">
                            <Input
                              className="h-7 text-xs"
                              placeholder="Notes on settlement date, promise, or deduction discussion..."
                              value={claimFollowupForm.notes}
                              onChange={(e) => setClaimFollowupForm((prev) => ({ ...prev, notes: e.target.value }))}
                            />
                          </div>
                          <div className="flex gap-1">
                            <Input
                              type="date"
                              className="h-7 text-[11px] flex-1"
                              value={claimFollowupForm.next_followup_date}
                              onChange={(e) => setClaimFollowupForm((prev) => ({ ...prev, next_followup_date: e.target.value }))}
                            />
                            <Button
                              size="sm"
                              disabled={!claimFollowupForm.notes.trim() || claimFollowupMutation.isPending}
                              className="h-7 text-xs px-3 bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={() =>
                                claimFollowupMutation.mutate({
                                  id: claim.id,
                                  data: claimFollowupForm,
                                })
                              }
                            >
                              <Send className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── CREATE CLAIM MODAL ─────────────────────────────────────── */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl p-6 space-y-4 max-h-[92vh] overflow-y-auto border border-border animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-primary/10 p-2 text-primary">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-base">Create Insurance Claim</h3>
                  <p className="text-xs text-muted-foreground">IRDAI compliant claim submission & settlement registration</p>
                </div>
              </div>
              <button onClick={() => setShowCreateForm(false)} className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground">✕</button>
            </div>

            <div className="space-y-4 text-xs">
              {/* 1. Inpatient & Policy Selection */}
              <PatientAdmissionPicker
                selectedAdmissionId={newClaim.admission_id}
                selectedPolicyId={newClaim.patient_insurance_id}
                onSelectionChange={({ admission, policy, payerId }) => {
                  setNewClaim((c) => ({
                    ...c,
                    admission_id: admission ? String(admission.id) : "",
                    patient_insurance_id: policy ? String(policy.id) : "",
                    payer_id: payerId ? String(payerId) : c.payer_id,
                  }))
                }}
              />

              {/* 2. Payer & Claim Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Payer / Insurer *</Label>
                  <Select
                    value={newClaim.payer_id}
                    onValueChange={(v) => setNewClaim((c) => ({ ...c, payer_id: v }))}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select Payer" />
                    </SelectTrigger>
                    <SelectContent>
                      {payers.map((p: any) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name} ({p.payer_type?.toUpperCase()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Claim Type</Label>
                  <Select
                    value={newClaim.claim_type}
                    onValueChange={(v) => setNewClaim((c) => ({ ...c, claim_type: v }))}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cashless">Cashless Claim</SelectItem>
                      <SelectItem value="reimbursement">Reimbursement</SelectItem>
                      <SelectItem value="corporate_billing">Corporate Direct</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 3. Amounts & References */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Total Bill Amount (₹) *</Label>
                  <Input
                    type="number"
                    className="h-9 text-xs font-semibold text-emerald-700 dark:text-emerald-400"
                    placeholder="0.00"
                    value={newClaim.total_bill_amount}
                    onChange={(e) => setNewClaim((c) => ({ ...c, total_bill_amount: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Non-Payable / Consumables (₹)</Label>
                  <Input
                    type="number"
                    className="h-9 text-xs"
                    placeholder="0.00"
                    value={newClaim.non_payable_amount}
                    onChange={(e) => setNewClaim((c) => ({ ...c, non_payable_amount: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">TPA Claim Ref #</Label>
                  <Input
                    className="h-9 text-xs font-mono"
                    placeholder="e.g. TPA-CLM-8921"
                    value={newClaim.tpa_claim_number}
                    onChange={(e) => setNewClaim((c) => ({ ...c, tpa_claim_number: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">NHCX Claim ID (Optional)</Label>
                  <Input
                    className="h-9 text-xs font-mono"
                    placeholder="e.g. NHCX-IN-0992"
                    value={newClaim.nhcx_claim_id}
                    onChange={(e) => setNewClaim((c) => ({ ...c, nhcx_claim_id: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="outline" onClick={() => setShowCreateForm(false)} className="text-xs h-9">
                Cancel
              </Button>
              <Button
                disabled={!newClaim.payer_id || !newClaim.patient_insurance_id || !newClaim.total_bill_amount || createClaimMutation.isPending}
                className="text-xs h-9 bg-primary"
                onClick={() =>
                  createClaimMutation.mutate({
                    ...newClaim,
                    payer_id: Number(newClaim.payer_id),
                    patient_insurance_id: Number(newClaim.patient_insurance_id),
                    admission_id: newClaim.admission_id ? Number(newClaim.admission_id) : undefined,
                    total_bill_amount: Number(newClaim.total_bill_amount),
                    non_payable_amount: Number(newClaim.non_payable_amount || 0),
                  })
                }
              >
                {createClaimMutation.isPending ? "Submitting..." : "Submit Claim"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── SETTLE CLAIM MODAL ─────────────────────────────────────── */}
      {showSettleModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <Landmark className="h-4 w-4 text-emerald-600" /> Record Claim Settlement
            </h3>
            <p className="text-xs text-muted-foreground">
              Recording payment received from <strong>{showSettleModal.payer?.name}</strong> for Claim{" "}
              <strong>{showSettleModal.claim_number}</strong>.
            </p>

            <div className="space-y-3 text-sm">
              <div className="space-y-1">
                <Label>Settled Amount (₹) *</Label>
                <Input
                  type="number"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  placeholder="Amount credited to bank"
                />
              </div>
              <div className="space-y-1">
                <Label>Bank UTR / NEFT Reference</Label>
                <Input
                  value={settleUtr}
                  onChange={(e) => setSettleUtr(e.target.value)}
                  placeholder="e.g. HDFC20261015998231"
                />
              </div>
              <div className="space-y-1">
                <Label>Settlement Notes</Label>
                <Input
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  placeholder="Deduction reasons / remarks"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="outline" onClick={() => setShowSettleModal(null)}>Cancel</Button>
              <Button
                disabled={!settleAmount || settleMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() =>
                  settleMutation.mutate({
                    id: showSettleModal.id,
                    data: {
                      settled_amount: Number(settleAmount),
                      settlement_utr: settleUtr || undefined,
                      notes: settleNotes || undefined,
                    },
                  })
                }
              >
                {settleMutation.isPending ? "Saving..." : "Confirm Settlement"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── GRIEVANCE MODAL ────────────────────────────────────────── */}
      {showGrievanceModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-xl p-6 space-y-4 max-h-[92vh] overflow-y-auto border border-border animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-purple-100 dark:bg-purple-950/60 p-2 text-purple-700 dark:text-purple-300">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-purple-900 dark:text-purple-200">
                    Raise IRDAI Formal Dispute & Grievance
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Claim: <strong className="text-foreground">{showGrievanceModal.claim_number}</strong> · {showGrievanceModal.payer?.name}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowGrievanceModal(null)} className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground">✕</button>
            </div>

            {/* Recipient & Routing Transparency Info Box ("Kisko Dikhega") */}
            <div className="rounded-xl border border-purple-200 bg-purple-50/70 dark:bg-purple-950/30 p-3.5 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-purple-900 dark:text-purple-200">
                <Building2 className="h-4 w-4 text-purple-700" />
                <span>Notice Routing & Visibility:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-purple-950 dark:text-purple-100">
                <div className="bg-background/80 p-2 rounded border border-purple-100 dark:border-purple-900">
                  <p className="font-bold text-purple-800 dark:text-purple-300">1. TPA / Insurer GRO</p>
                  <p className="text-muted-foreground mt-0.5">Sent to Nodal Grievance Redressal Officer (Mandatory 15-day SLA).</p>
                </div>
                <div className="bg-background/80 p-2 rounded border border-purple-100 dark:border-purple-900">
                  <p className="font-bold text-purple-800 dark:text-purple-300">2. Hospital AR Ledger</p>
                  <p className="text-muted-foreground mt-0.5">Logged in internal Accounts Receivable Dispute Audit Trail.</p>
                </div>
                <div className="bg-background/80 p-2 rounded border border-purple-100 dark:border-purple-900">
                  <p className="font-bold text-purple-800 dark:text-purple-300">3. IRDAI Bima Bharosa</p>
                  <p className="text-muted-foreground mt-0.5">Unresolved cases escalate to IRDAI Insurance Ombudsman.</p>
                </div>
              </div>
            </div>

            {/* Grounds Category & Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Grievance Grounds Category *</Label>
                <Select
                  value={grievanceReason}
                  onValueChange={(val) => {
                    setGrievanceReason(val)
                    if (val === "unwarranted_deduction") {
                      setGrievanceNotes(
                        `Arbitrary deduction applied on room rent, doctor visits, and OT charges without medical basis. Under IRDAI Master Circular IRDAI/HLT/REG/CIR/068, deductions cannot be imposed arbitrarily without clinical justification.`
                      )
                    } else if (val === "tat_breach") {
                      setGrievanceNotes(
                        `Violation of IRDAI mandated 3-hour Cashless Authorization TAT. Hospital submitted complete discharge summary and final bill, but approval was delayed causing distress to patient.`
                      )
                    } else if (val === "consumables_denial") {
                      setGrievanceNotes(
                        `Wrongful deduction on essential surgical safety packs, gloves, and irrigation fluids directly involved in the operative procedure under IRDAI Circular IRDAI/HLT/REG/CIR/194.`
                      )
                    } else if (val === "package_dispute") {
                      setGrievanceNotes(
                        `Settlement amount violated the pre-agreed empanelment package tariff rate agreed between the hospital and ${showGrievanceModal.payer?.name}.`
                      )
                    } else if (val === "wrongful_rejection") {
                      setGrievanceNotes(
                        `Unjustified claim rejection citing Pre-Existing Condition (PED) or waiting period clause without clinical correlation or documentary proof from treating doctor.`
                      )
                    }
                  }}
                >
                  <SelectTrigger className="h-8 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unwarranted_deduction">Unwarranted Deductions on Room/OT</SelectItem>
                    <SelectItem value="tat_breach">Breach of IRDAI 3-Hour TAT</SelectItem>
                    <SelectItem value="consumables_denial">Denied Essential Consumables</SelectItem>
                    <SelectItem value="package_dispute">Tariff / Package Rate Mismatch</SelectItem>
                    <SelectItem value="wrongful_rejection">Wrongful Rejection under PED</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Disputed Amount (₹) *</Label>
                <Input
                  type="number"
                  className="h-8 text-xs mt-1"
                  placeholder="e.g. 15000"
                  value={grievanceAmount}
                  onChange={(e) => setGrievanceAmount(e.target.value)}
                />
              </div>
            </div>

            {/* Circular Presets */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">IRDAI Statutory Circular Reference</Label>
              <div className="flex gap-1.5 flex-wrap">
                {[
                  "IRDAI/HLT/REG/CIR/068/03/2020 (Master Circular - Health Claims)",
                  "IRDAI/HLT/REG/CIR/194/07/2020 (Consumables & Exclusions)",
                  "IRDAI 100% Cashless Mandate (May 2024)",
                ].map((cit) => (
                  <button
                    key={cit}
                    type="button"
                    onClick={() => setGrievanceCitation(cit)}
                    className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors ${
                      grievanceCitation === cit
                        ? "bg-purple-700 text-white border-purple-700 font-semibold"
                        : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                    }`}
                  >
                    {cit}
                  </button>
                ))}
              </div>
            </div>

            {/* Grievance Statement */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Formal Dispute Statement & Justification *</Label>
              <textarea
                className="w-full text-xs rounded-lg border border-border bg-background p-2.5 resize-none h-28 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                placeholder="State detailed clinical justification, case summary, and dispute grounds..."
                value={grievanceNotes}
                onChange={(e) => setGrievanceNotes(e.target.value)}
              />
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-8 text-xs border-purple-300 text-purple-800 hover:bg-purple-100 dark:border-purple-700 dark:text-purple-200"
                onClick={() => {
                  setPrintDisputeClaim({
                    ...showGrievanceModal,
                    dispute_notes: grievanceNotes,
                    disputed_amount: grievanceAmount,
                    citation: grievanceCitation,
                  })
                }}
              >
                <Printer className="h-3.5 w-3.5 mr-1" /> Preview & Print Dispute Notice
              </Button>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowGrievanceModal(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={!grievanceNotes || grievanceMutation.isPending}
                  className="bg-purple-700 hover:bg-purple-800 text-white h-8 text-xs px-4"
                  onClick={() =>
                    grievanceMutation.mutate({
                      id: showGrievanceModal.id,
                      notes: `[Disputed: ₹${grievanceAmount || 0} | ${grievanceCitation}] ${grievanceNotes}`,
                    })
                  }
                >
                  {grievanceMutation.isPending ? "Submitting..." : "Submit Grievance to AR Ledger & TPA"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PRINTABLE FORMAL DISPUTE NOTICE MODAL ───────────────────── */}
      {printDisputeClaim && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-3 sm:p-6 backdrop-blur-xs">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl p-6 sm:p-8 space-y-4 max-h-[92vh] overflow-y-auto border border-border">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Print-Ready Legal Notice
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-primary text-primary-foreground h-8 text-xs"
                  onClick={() => window.print()}
                >
                  <Printer className="h-3.5 w-3.5 mr-1" /> Print Formal Notice
                </Button>
                <button
                  onClick={() => setPrintDisputeClaim(null)}
                  className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Letter Body (Printable Paper Layout) */}
            <div className="bg-card p-6 rounded-xl border border-border/80 text-foreground space-y-4 text-xs font-serif leading-relaxed">
              {/* Header */}
              <div className="border-b-2 border-primary/30 pb-3 text-center">
                <h2 className="text-base font-bold font-sans tracking-wide text-primary">
                  HOSPITAL CASHLESS & INSURANCE ADMISSIONS DESK
                </h2>
                <p className="text-[11px] text-muted-foreground font-sans">
                  Formal Dispute Notice under IRDAI (Protection of Policyholders' Interests) Regulations
                </p>
                <p className="text-[10px] text-muted-foreground font-sans mt-0.5">
                  Ref: DISPUTE/{printDisputeClaim.claim_number}/{new Date().getFullYear()} · Date: {new Date().toLocaleDateString("en-IN")}
                </p>
              </div>

              {/* To Address */}
              <div className="space-y-0.5">
                <p className="font-bold">To,</p>
                <p className="font-semibold">The Grievance Redressal Officer (GRO) & Claims Head,</p>
                <p>{printDisputeClaim.payer?.name || "Third Party Administrator / Insurance Co."}</p>
                {printDisputeClaim.payer?.contact_email && <p>Email: {printDisputeClaim.payer.contact_email}</p>}
                {printDisputeClaim.payer?.portal_url && <p>Portal: {printDisputeClaim.payer.portal_url}</p>}
              </div>

              {/* Subject */}
              <div className="bg-muted/40 p-2.5 rounded border border-border/50 font-sans font-semibold text-xs">
                Subject: Formal Dispute & Grievance against Unwarranted Deductions on Claim Ref: {printDisputeClaim.claim_number}
              </div>

              {/* Patient & Admission Details Table */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-sans text-[11px] bg-muted/20 p-3 rounded-lg border border-border/50">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Patient Name:</span>
                  <strong>{printDisputeClaim.patient_insurance?.insured_name || printDisputeClaim.admission?.patient?.name || "Patient Record"}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Policy / Card No:</span>
                  <strong>{printDisputeClaim.patient_insurance?.policy_number || "—"}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">TPA Claim Reference:</span>
                  <strong>{printDisputeClaim.tpa_claim_number || "Pending"}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Total Bill Amount:</span>
                  <strong>₹{Number(printDisputeClaim.total_bill_amount || 0).toLocaleString("en-IN")}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Claimed Amount:</span>
                  <strong>₹{Number(printDisputeClaim.claimed_amount || 0).toLocaleString("en-IN")}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Disputed Deduction:</span>
                  <strong className="text-red-600">₹{Number(printDisputeClaim.disputed_amount || printDisputeClaim.deducted_amount || 0).toLocaleString("en-IN")}</strong>
                </div>
              </div>

              {/* Regulatory Citation */}
              <div className="font-sans text-[11px] space-y-1">
                <p className="font-semibold text-primary">Statutory Authority & Regulatory Grounds:</p>
                <p className="italic text-muted-foreground">
                  Reference: {printDisputeClaim.citation || "IRDAI Master Circular on Health Insurance Claims (IRDAI/HLT/REG/CIR/068)"}
                </p>
              </div>

              {/* Justification Grounds */}
              <div className="space-y-1.5 font-sans text-xs">
                <p className="font-semibold">Clinical & Administrative Representation:</p>
                <p className="bg-muted/30 p-3 rounded-lg border border-border/60 whitespace-pre-wrap leading-relaxed text-[11px]">
                  {printDisputeClaim.dispute_notes || printDisputeClaim.grievance_notes}
                </p>
              </div>

              {/* Demanded Action & SLA */}
              <div className="font-sans text-[11px] text-muted-foreground border-l-2 border-primary pl-3 py-1">
                You are requested to re-adjudicate this claim and reverse the deductions within the statutory 15 days prescribed under IRDAI Regulations. In the absence of satisfactory resolution, this grievance will be escalated to the IRDAI Bima Bharosa Portal and the Insurance Ombudsman.
              </div>

              {/* Signatures */}
              <div className="pt-6 grid grid-cols-2 gap-8 text-center font-sans text-xs">
                <div className="border-t border-border pt-2">
                  <p className="font-semibold">Treating Consultant / Surgeon</p>
                  <p className="text-[10px] text-muted-foreground">Clinical Verification</p>
                </div>
                <div className="border-t border-border pt-2">
                  <p className="font-semibold">Authorized Signatory</p>
                  <p className="text-[10px] text-muted-foreground">Hospital Insurance & TPA Desk</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CLAIM DOSSIER MODAL ────────────────────────────────────── */}
      {showDossierModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Claim Dossier Completeness Check
              </h3>
              <button onClick={() => setShowDossierModal(null)} className="rounded-lg p-1 hover:bg-muted text-muted-foreground">✕</button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border">
                <div>
                  <p className="text-xs text-muted-foreground">Audit Checklist</p>
                  <p className="text-sm font-semibold">Ready for IRDAI / TPA Audit</p>
                </div>
                <Badge variant={showDossierModal.is_complete ? "default" : "destructive"}>
                  {showDossierModal.is_complete ? "Complete" : "Incomplete"}
                </Badge>
              </div>

              <div className="space-y-2">
                {showDossierModal.checklist?.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg border border-border/70">
                    <span className="font-medium">{item.label}</span>
                    <span className={item.present ? "text-emerald-600 font-bold" : "text-red-500 font-bold"}>
                      {item.present ? "✓ Ready" : "✗ Missing"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t">
              <Button onClick={() => setShowDossierModal(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
