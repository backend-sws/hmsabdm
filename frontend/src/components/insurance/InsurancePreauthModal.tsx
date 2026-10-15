import React, { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  FileCheck2, Search, Clock, CheckCircle2,
  AlertCircle, XCircle, MessageSquare, RefreshCw, Plus,
  TrendingUp, Stethoscope, Scissors, Tag,
  ExternalLink, Paperclip, FileText, Upload, Trash2, CheckCircle,
  Printer, Receipt, PhoneCall, PhoneForwarded, Calendar, Send,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { insuranceService } from "@/services/insuranceService"
import type { InsurancePreauth } from "@/types/insurance"
import { PatientAdmissionPicker } from "./PatientAdmissionPicker"
import { PrintPreauthSanctionModal } from "./PrintPreauthSanctionModal"

interface Props {
  embedded?: boolean
  onClose?: () => void
  onRefresh?: () => void
  onFileClaim?: (preauth: InsurancePreauth) => void
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: "Draft", color: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20", icon: Clock },
  submitted: { label: "Submitted", color: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25", icon: Clock },
  approved: { label: "Approved", color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25", icon: CheckCircle2 },
  queried: { label: "TPA Query", color: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30", icon: MessageSquare },
  query_responded: { label: "Responded", color: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25", icon: MessageSquare },
  denied: { label: "Denied", color: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25", icon: XCircle },
  cancelled: { label: "Cancelled", color: "bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20", icon: XCircle },
  expired: { label: "Expired", color: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25", icon: AlertCircle },
}

export const InsurancePreauthModal: React.FC<Props> = ({ embedded, onClose, onRefresh, onFileClaim }) => {
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<any>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [enhancementTarget, setEnhancementTarget] = useState<any>(null)
  const [sanctionPrintTarget, setSanctionPrintTarget] = useState<any>(null)
  const [activeFollowupPa, setActiveFollowupPa] = useState<number | null>(null)
  const [followupForm, setFollowupForm] = useState({
    contact_person: "",
    channel: "Phone Call",
    status_discussed: "Promised Sanction",
    notes: "",
    next_followup_date: "",
  })

  // New Pre-auth Form State
  const [newPa, setNewPa] = useState({
    payer_id: "",
    patient_insurance_id: "",
    admission_id: "",
    preauth_type: "initial",
    primary_diagnosis: "",
    proposed_treatment: "",
    estimated_amount: "",
    estimated_los_days: "3",
    room_rent_per_day: "",
    auto_submit: true,
  })

  // ICD-10 Search state
  const [diagSearch, setDiagSearch] = useState("")
  const [showDiagResults, setShowDiagResults] = useState(false)
  const [selectedTariffId, setSelectedTariffId] = useState<string>("")

  // Status Action Modal State (Replaces prompt dialogs)
  const [statusActionModal, setStatusActionModal] = useState<{
    isOpen: boolean
    type: "approve" | "query" | "deny" | null
    preauth: any | null
  }>({ isOpen: false, type: null, preauth: null })

  const [statusActionData, setStatusActionData] = useState({
    approved_amount: "",
    valid_till: "",
    tpa_query: "",
    denial_reason: "",
  })

  // Enhancement Form State
  const [enhancementData, setEnhancementData] = useState({
    estimated_amount: "",
    estimated_los_days: "2",
    reason_for_enhancement: "",
    primary_diagnosis: "",
    proposed_treatment: "",
  })

  // Query Response state per preauth
  const [queryResponses, setQueryResponses] = useState<Record<number, string>>({})
  const [queryDocs, setQueryDocs] = useState<Record<number, Array<{ name: string; size?: string; type: string }>>>({})

  const handleFileUpload = (paId: number, files: FileList | null) => {
    if (!files) return
    const newDocs = Array.from(files).map((f) => ({
      name: f.name,
      size: `${(f.size / 1024).toFixed(0)} KB`,
      type: f.type || "application/pdf",
    }))
    setQueryDocs((prev) => ({
      ...prev,
      [paId]: [...(prev[paId] || []), ...newDocs],
    }))
  }

  const addQuickDoc = (paId: number, docTitle: string) => {
    const defaultDoc = {
      name: `${docTitle}_${new Date().toISOString().split("T")[0]}.pdf`,
      size: "Verified EHR Document",
      type: "application/pdf",
    }
    setQueryDocs((prev) => ({
      ...prev,
      [paId]: [...(prev[paId] || []), defaultDoc],
    }))
  }

  const removeDoc = (paId: number, index: number) => {
    setQueryDocs((prev) => ({
      ...prev,
      [paId]: (prev[paId] || []).filter((_, i) => i !== index),
    }))
  }

  const { data: payers = [] } = useQuery({
    queryKey: ["insurance", "payers"],
    queryFn: () => insuranceService.getPayers(),
  })

  // Tariffs for Selected Payer
  const { data: payerTariffs = [] } = useQuery({
    queryKey: ["insurance", "tariffs", newPa.payer_id],
    queryFn: () => (newPa.payer_id ? insuranceService.getPayerTariffs(Number(newPa.payer_id)) : Promise.resolve([])),
    enabled: !!newPa.payer_id,
  })

  // ICD-10 Diagnosis Search Query
  const { data: icdResults = [], isLoading: icdLoading } = useQuery({
    queryKey: ["insurance", "icd10-search", diagSearch],
    queryFn: () => insuranceService.searchIcd10(diagSearch),
    enabled: diagSearch.trim().length >= 2,
  })

  const { data: preauths, isLoading, refetch } = useQuery({
    queryKey: ["insurance", "preauths", statusFilter, search, page],
    queryFn: () => insuranceService.getPreauths({ status: statusFilter, search, page }),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => insuranceService.createPreauth(data),
    onSuccess: () => {
      toast.success("Pre-authorization created successfully")
      setShowCreateModal(false)
      refetch()
      onRefresh?.()
    },
    onError: (err: any) => toast.error(err?.message || "Failed to create pre-auth"),
  })

  const enhancementMutation = useMutation({
    mutationFn: ({ id, data }: any) => insuranceService.createEnhancement(id, data),
    onSuccess: () => {
      toast.success("Enhancement request submitted to TPA")
      setEnhancementTarget(null)
      refetch()
      onRefresh?.()
    },
    onError: (err: any) => toast.error(err?.message || "Failed to submit enhancement"),
  })

  const respondMutation = useMutation({
    mutationFn: ({ id, data }: any) => insuranceService.respondToQuery(id, data),
    onSuccess: () => { toast.success("Query response submitted"); refetch(); setSelected(null) },
    onError: () => toast.error("Failed to submit response"),
  })

  const statusUpdateMutation = useMutation({
    mutationFn: ({ id, status, data }: any) =>
      insuranceService.updatePreauthStatus(id, { status, ...data }),
    onSuccess: () => { toast.success("Pre-auth status updated"); refetch(); setSelected(null); onRefresh?.() },
    onError: () => toast.error("Failed to update status"),
  })

  const followupMutation = useMutation({
    mutationFn: ({ id, data }: any) => insuranceService.addPreauthFollowup(id, data),
    onSuccess: () => {
      toast.success("TPA follow-up log saved")
      refetch()
      setFollowupForm({
        contact_person: "",
        channel: "Phone Call",
        status_discussed: "Promised Sanction",
        notes: "",
        next_followup_date: "",
      })
    },
    onError: () => toast.error("Failed to save follow-up log"),
  })

  const getIrdaiTatInfo = (pa: any) => {
    const referenceTime = pa.query_responded_at || pa.submitted_at
    if (!referenceTime || ["approved", "denied", "cancelled", "expired"].includes(pa.status)) {
      return null
    }
    const elapsedMinutes = Math.floor((Date.now() - new Date(referenceTime).getTime()) / 60000)
    const mandateMinutes = 180 // 3 hours IRDAI mandate
    const remaining = mandateMinutes - elapsedMinutes

    if (remaining > 60) {
      return {
        status: "safe",
        badge: `${Math.floor(remaining / 60)}h ${remaining % 60}m left`,
        text: "IRDAI 3h SLA Active",
        className: "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300",
      }
    } else if (remaining > 0) {
      return {
        status: "warning",
        badge: `${remaining}m left`,
        text: "IRDAI SLA Alert",
        className: "bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 animate-pulse font-bold",
      }
    } else {
      const overdue = Math.abs(remaining)
      return {
        status: "breached",
        badge: `+${Math.floor(overdue / 60)}h ${overdue % 60}m overdue`,
        text: "IRDAI SLA Breached",
        className: "bg-red-50 text-red-800 border-red-300 dark:bg-red-950/40 dark:text-red-300 font-bold",
      }
    }
  }

  const items = preauths?.data || preauths || []

  return (
    <div className={embedded ? "space-y-3" : "bg-background rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"}>
      {!embedded && (
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-semibold flex items-center gap-2">
            <FileCheck2 className="h-4 w-4 text-primary" /> Pre-Authorization Manager
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground">✕</button>
        </div>
      )}

      <div className={embedded ? "" : "flex-1 overflow-y-auto p-4"}>
        {/* Controls */}
        <div className="flex gap-2 flex-wrap mb-3 items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-64">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input className="pl-9 h-9" placeholder="Search pre-auth number, diagnosis..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Button size="sm" onClick={() => refetch()} variant="ghost">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>

          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> New Pre-Auth
          </Button>
        </div>

        {/* Status Filters */}
        <div className="flex gap-1.5 flex-wrap mb-3.5">
          {["all", "submitted", "approved", "queried", "denied"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === s
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {s === "all" ? "All" : STATUS_CONFIG[s]?.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="space-y-3">
          {isLoading && Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl border border-border bg-muted/30 animate-pulse" />
          ))}

          {!isLoading && !items.length && (
            <div className="text-center py-12 text-muted-foreground border border-dashed rounded-2xl border-border/80 p-8">
              <FileCheck2 className="h-10 w-10 mx-auto mb-2 opacity-30 text-primary" />
              <p className="text-sm font-bold text-foreground">No pre-authorizations found</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto mb-4 font-medium">
                Pre-authorizations appear here once submitted for an admitted inpatient. Click below to submit your first pre-auth request.
              </p>
              <Button size="sm" onClick={() => setShowCreateModal(true)} className="text-xs rounded-xl">
                <Plus className="h-3.5 w-3.5 mr-1" /> New Pre-Auth Request
              </Button>
            </div>
          )}

          {items.map((pa: any) => {
            const cfg = STATUS_CONFIG[pa.status] || STATUS_CONFIG.draft
            const Icon = cfg.icon
            const isQueried = pa.status === "queried"
            const isExpiring = pa.is_expired === false && pa.valid_till &&
              new Date(pa.valid_till) <= new Date(Date.now() + 2 * 86400000)

            return (
              <div
                key={pa.id}
                className={`rounded-2xl border bg-card p-4 sm:p-5 transition-all duration-200 ${
                  isQueried ? "border-amber-400 bg-amber-50/20 dark:bg-amber-900/10 shadow-[0_4px_16px_-4px_rgba(245,158,11,0.2)] ring-1 ring-amber-400/30" :
                  isExpiring ? "border-orange-300 bg-orange-50/30 dark:bg-orange-900/10 shadow-xs" :
                  "border-border/80 shadow-[0_1px_3px_0_rgba(15,23,42,0.04),0_6px_16px_-4px_rgba(15,23,42,0.05)] hover:shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05),0_14px_28px_-6px_rgba(15,23,42,0.08)] hover:border-primary/40 hover:-translate-y-0.5"
                }`}
              >
                {/* Header row toggles expansion */}
                <div
                  className="flex items-start justify-between cursor-pointer select-none"
                  onClick={() => setSelected(selected?.id === pa.id ? null : pa)}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-bold font-mono tracking-tight text-foreground">{pa.preauth_number}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border tracking-wider flex items-center gap-1.5 shadow-2xs ${cfg.color}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current shrink-0 animate-pulse" />
                        <Icon className="h-2.5 w-2.5" /> {cfg.label}
                      </span>
                      {isQueried && <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold animate-pulse px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30">⚡ Shortfall Action Required</span>}
                      {isExpiring && <span className="text-[10px] text-orange-700 dark:text-orange-300 font-bold px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30">⏰ Expiring Soon</span>}
                      {(() => {
                        const tat = getIrdaiTatInfo(pa)
                        if (!tat) return null
                        return (
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border flex items-center gap-1.5 shadow-2xs ${tat.className}`}
                            title="IRDAI Mandate: Cashless decision within 3 hours"
                          >
                            <Clock className="h-2.5 w-2.5 shrink-0" />
                            <span>{tat.text}:</span>
                            <span className="font-mono">{tat.badge}</span>
                          </span>
                        )
                      })()}
                      {pa.payer?.portal_url && (
                        <a
                          href={pa.payer.portal_url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-muted/80 hover:bg-muted text-foreground border border-border/80 transition-colors"
                          title={`Open ${pa.payer.name} Portal`}
                        >
                          <ExternalLink className="h-2.5 w-2.5 text-primary" /> {pa.payer.code || "TPA Portal"}
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground font-semibold">{pa.admission?.patient?.name || pa.patientInsurance?.patient?.name || `Patient #${pa.patient_insurance_id}`}</strong>
                      {pa.admission?.ipd_number && <span className="ml-1.5 font-mono text-[11px] font-medium text-primary">({pa.admission.ipd_number})</span>}
                      {" · "}<span className="font-medium text-foreground/80">{pa.payer?.name}</span>
                    </p>
                    <p className="text-xs text-foreground/85 mt-0.5 line-clamp-1 font-medium">{pa.primary_diagnosis}</p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-base font-black font-mono tabular-nums text-foreground">₹{Number(pa.approved_amount ?? pa.estimated_amount ?? 0).toLocaleString('en-IN')}</p>
                    <p className="text-xs text-muted-foreground capitalize font-medium">{pa.preauth_type}</p>
                    {pa.valid_till && (
                      <p className="text-[11px] text-muted-foreground font-mono mt-0.5">Valid: {pa.valid_till}</p>
                    )}
                  </div>
                </div>

                {/* Expanded Actions */}
                {selected?.id === pa.id && (
                  <div
                    className="mt-3 pt-3 border-t border-border/50 space-y-3 cursor-default"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* ── TPA Shortfall & Document Submission Studio ── */}
                    {isQueried && (
                      <div className="rounded-xl border-2 border-amber-400 bg-amber-50/80 dark:bg-amber-950/30 p-4 space-y-3 shadow-xs">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded-lg bg-amber-500 text-white">
                              <MessageSquare className="h-4 w-4" />
                            </span>
                            <div>
                              <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                                TPA Shortfall / Query Received
                              </h4>
                              {pa.query_raised_at && (
                                <p className="text-[10px] text-amber-700/80 dark:text-amber-300/80">
                                  Raised on: {new Date(pa.query_raised_at).toLocaleString("en-IN")}
                                </p>
                              )}
                            </div>
                          </div>
                          {pa.payer?.portal_url && (
                            <a
                              href={pa.payer.portal_url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-400 underline shrink-0 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-800"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Open {pa.payer.name?.split(" ")[0] || "TPA"} Portal
                            </a>
                          )}
                        </div>

                        {/* Query Text Box */}
                        <div className="rounded-lg bg-background/90 p-3 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-950 dark:text-amber-100 font-medium whitespace-pre-wrap">
                          <strong className="text-amber-900 dark:text-amber-300">TPA Query: </strong>
                          {pa.tpa_query || "Please provide supporting medical reports and treating doctor justification."}
                        </div>

                        {/* Clinical Response Textarea */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                            <span>Clinical / Justification Response</span>
                            <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            className="w-full text-xs rounded-lg border border-amber-300/80 bg-background p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                            rows={3}
                            placeholder="Type treating doctor's clinical reply, findings, and explanation for the TPA query..."
                            value={queryResponses[pa.id] ?? ""}
                            onClick={(e) => e.stopPropagation()}
                            onFocus={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              const val = e.target.value
                              setQueryResponses((prev) => ({ ...prev, [pa.id]: val }))
                            }}
                          />
                        </div>

                        {/* Document & Report Attachments */}
                        <div className="space-y-2 pt-1 border-t border-amber-200/60 dark:border-amber-800/40">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <label className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                              <Paperclip className="h-3.5 w-3.5 text-amber-600" />
                              <span>Attach Diagnostic Reports & Documents</span>
                              <span className="text-[10px] text-muted-foreground font-normal">
                                (Scans, Lab, OT Notes, Doctor Certificate)
                              </span>
                            </label>

                            <input
                              type="file"
                              id={`query-file-${pa.id}`}
                              multiple
                              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                              className="hidden"
                              onChange={(e) => handleFileUpload(pa.id, e.target.files)}
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-6 text-[11px] border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200"
                              onClick={(e) => {
                                e.stopPropagation()
                                document.getElementById(`query-file-${pa.id}`)?.click()
                              }}
                            >
                              <Upload className="h-3 w-3 mr-1" /> Browse / Upload Reports
                            </Button>
                          </div>

                          {/* Quick Document Presets */}
                          <div className="flex gap-1.5 flex-wrap items-center">
                            <span className="text-[10px] text-muted-foreground">Quick Add from EHR:</span>
                            {[
                              { label: "🩻 USG / Radiology", name: "Radiology_USG_Report" },
                              { label: "🔬 Lab / Pathology", name: "Pathology_Lab_Report" },
                              { label: "🩺 Doctor Certificate", name: "Physician_Clinical_Certificate" },
                              { label: "📋 ICP Vitals Chart", name: "Indoor_Case_Paper_Chart" },
                            ].map((preset) => (
                              <button
                                key={preset.name}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  addQuickDoc(pa.id, preset.name)
                                }}
                                className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition-colors dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700"
                              >
                                + {preset.label}
                              </button>
                            ))}
                          </div>

                          {/* Attached Document Chips */}
                          {(queryDocs[pa.id] || []).length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                              {(queryDocs[pa.id] || []).map((doc, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between gap-1 px-2.5 py-1.5 rounded-lg bg-background border border-amber-200 dark:border-amber-800 text-xs shadow-xs"
                                >
                                  <div className="flex items-center gap-1.5 truncate">
                                    <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                                    <span className="truncate font-medium text-[11px]">{doc.name}</span>
                                    {doc.size && (
                                      <span className="text-[9px] text-muted-foreground shrink-0">
                                        ({doc.size})
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      removeDoc(pa.id, idx)
                                    }}
                                    className="text-muted-foreground hover:text-red-500 p-0.5"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Submit Button */}
                        <div className="flex items-center justify-between pt-1">
                          <p className="text-[10px] text-muted-foreground">
                            IRDAI Compliance: Responses are timestamped and logged for audit.
                          </p>
                          <Button
                            size="sm"
                            disabled={
                              !queryResponses[pa.id]?.trim() || respondMutation.isPending
                            }
                            className="bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs h-8 px-4"
                            onClick={(e) => {
                              e.stopPropagation()
                              respondMutation.mutate({
                                id: pa.id,
                                data: {
                                  response: queryResponses[pa.id],
                                  documents: queryDocs[pa.id] || [],
                                },
                              })
                            }}
                          >
                            {respondMutation.isPending
                              ? "Submitting..."
                              : `Submit Response & Documents (${(queryDocs[pa.id] || []).length})`}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* ── Query Responded History ── */}
                    {pa.status === "query_responded" && (
                      <div className="rounded-xl border border-cyan-300 bg-cyan-50/70 dark:bg-cyan-950/30 p-3.5 space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="text-xs font-bold text-cyan-900 dark:text-cyan-200 flex items-center gap-1.5">
                            <CheckCircle className="h-3.5 w-3.5 text-cyan-600" /> Query Response Submitted to TPA
                          </span>
                          {pa.query_responded_at && (
                            <span className="text-[10px] text-cyan-700 dark:text-cyan-300">
                              Responded: {new Date(pa.query_responded_at).toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>
                        {pa.query_response && (
                          <div className="rounded bg-background p-2 border border-cyan-200 text-xs">
                            <p className="text-[10px] font-semibold text-muted-foreground">Response Sent:</p>
                            <p className="text-foreground mt-0.5">{pa.query_response}</p>
                          </div>
                        )}
                        {Array.isArray(pa.query_documents) && pa.query_documents.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-[10px] font-semibold text-muted-foreground">Attached Reports / Documents:</p>
                            <div className="flex flex-wrap gap-1">
                              {pa.query_documents.map((d: any, idx: number) => (
                                <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-background border border-cyan-200 font-mono">
                                  <FileText className="h-3 w-3 text-cyan-600" />
                                  {typeof d === "string" ? d : d.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        <p className="text-[10px] text-cyan-800 dark:text-cyan-300 italic">
                          Awaiting TPA review. You can Mark Approved or update status once TPA responds.
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2 flex-wrap">
                      {pa.status === "draft" && (
                        <Button size="sm" className="h-7 text-xs" onClick={(e) => {
                          e.stopPropagation()
                          statusUpdateMutation.mutate({ id: pa.id, status: "submitted" })
                        }}>
                          Submit to TPA
                        </Button>
                      )}
                      {(pa.status === "submitted" || pa.status === "query_responded") && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300"
                            onClick={(e) => {
                              e.stopPropagation()
                              setStatusActionData({
                                approved_amount: String(pa.approved_amount || pa.estimated_amount || ""),
                                valid_till: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
                                tpa_query: "",
                                denial_reason: "",
                              })
                              setStatusActionModal({ isOpen: true, type: "approve", preauth: pa })
                            }}
                          >
                            ✓ Mark Approved
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300"
                            onClick={(e) => {
                              e.stopPropagation()
                              setStatusActionData({
                                approved_amount: "",
                                valid_till: "",
                                tpa_query: "",
                                denial_reason: "",
                              })
                              setStatusActionModal({ isOpen: true, type: "query", preauth: pa })
                            }}
                          >
                            Query / Shortfall
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-300"
                            onClick={(e) => {
                              e.stopPropagation()
                              setStatusActionData({
                                approved_amount: "",
                                valid_till: "",
                                tpa_query: "",
                                denial_reason: "",
                              })
                              setStatusActionModal({ isOpen: true, type: "deny", preauth: pa })
                            }}
                          >
                            ✗ Mark Denied
                          </Button>
                        </>
                      )}
                      {pa.status === "approved" && (
                        <div className="flex gap-2 flex-wrap items-center">
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (onFileClaim) {
                                onFileClaim(pa)
                              } else {
                                toast.info("Navigate to Claims tab to file final cashless claim.")
                              }
                            }}
                          >
                            <Receipt className="h-3 w-3 mr-1" /> File Final Cashless Claim
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-200"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSanctionPrintTarget(pa)
                            }}
                          >
                            <Printer className="h-3 w-3 mr-1" /> Print Sanction Slip
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-blue-700 border-blue-300"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEnhancementData({
                                estimated_amount: String(pa.approved_amount || ""),
                                estimated_los_days: "2",
                                reason_for_enhancement: "",
                                primary_diagnosis: pa.primary_diagnosis || "",
                                proposed_treatment: pa.proposed_treatment || "",
                              })
                              setEnhancementTarget(pa)
                            }}
                          >
                            <TrendingUp className="h-3 w-3 mr-1" /> Raise Enhancement
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* ── TPA Calling & Communication Log Accordion ── */}
                    <div className="border border-border rounded-xl p-3 bg-muted/20 space-y-2 mt-2">
                      <div
                        className="flex items-center justify-between cursor-pointer select-none text-xs font-semibold text-foreground/80 hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveFollowupPa(activeFollowupPa === pa.id ? null : pa.id)
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          <PhoneCall className="h-3.5 w-3.5 text-blue-600" />
                          <span>TPA Tele-Calling & Follow-up Log</span>
                          <span className="rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 text-[10px] font-bold px-1.5 py-0.2">
                            {(pa.followup_notes || []).length}
                          </span>
                        </div>
                        <span className="text-[11px] text-primary">
                          {activeFollowupPa === pa.id ? "▲ Close Log" : "▼ Open Log & Add Note"}
                        </span>
                      </div>

                      {activeFollowupPa === pa.id && (
                        <div className="pt-2 space-y-3 border-t border-border/60">
                          {/* Past Logs */}
                          {Array.isArray(pa.followup_notes) && pa.followup_notes.length > 0 ? (
                            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                              {pa.followup_notes.map((fn: any, idx: number) => (
                                <div
                                  key={fn.id || idx}
                                  className="rounded-lg bg-background p-2.5 border border-border text-xs space-y-1 shadow-xs"
                                >
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-semibold text-foreground flex items-center gap-1">
                                      <PhoneForwarded className="h-3 w-3 text-blue-600" />
                                      {fn.contact_person || "TPA Desk Officer"} · <span className="text-muted-foreground">{fn.channel || "Phone Call"}</span>
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
                              No follow-up calls logged yet for this pre-auth.
                            </p>
                          )}

                          {/* Quick Add Follow-up Form */}
                          <div className="bg-background rounded-lg border border-border p-3 space-y-2">
                            <p className="text-[11px] font-semibold text-foreground">Log New TPA Call / Communication:</p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div>
                                <Input
                                  className="h-7 text-xs"
                                  placeholder="Contact Person (e.g. Mr. Sharma, RM)"
                                  value={followupForm.contact_person}
                                  onChange={(e) => setFollowupForm((prev) => ({ ...prev, contact_person: e.target.value }))}
                                />
                              </div>
                              <div>
                                <Select
                                  value={followupForm.channel}
                                  onValueChange={(val) => setFollowupForm((prev) => ({ ...prev, channel: val }))}
                                >
                                  <SelectTrigger className="h-7 text-xs">
                                    <SelectValue placeholder="Channel" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Phone Call">📞 Phone Call</SelectItem>
                                    <SelectItem value="TPA Portal">🌐 TPA Portal</SelectItem>
                                    <SelectItem value="Email">✉️ Email</SelectItem>
                                    <SelectItem value="WhatsApp">💬 WhatsApp</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Select
                                  value={followupForm.status_discussed}
                                  onValueChange={(val) => setFollowupForm((prev) => ({ ...prev, status_discussed: val }))}
                                >
                                  <SelectTrigger className="h-7 text-xs">
                                    <SelectValue placeholder="Discussion Topic" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Promised Sanction">Promised Sanction</SelectItem>
                                    <SelectItem value="Doctor Panel Review">Doctor Panel Review</SelectItem>
                                    <SelectItem value="Shortfall Clarification">Shortfall Clarification</SelectItem>
                                    <SelectItem value="Awaiting Final Bill">Awaiting Final Bill</SelectItem>
                                    <SelectItem value="Escalated to Nodal Officer">Escalated to Nodal Officer</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                              <div className="sm:col-span-3">
                                <Input
                                  className="h-7 text-xs"
                                  placeholder="Call discussion notes & commitment..."
                                  value={followupForm.notes}
                                  onChange={(e) => setFollowupForm((prev) => ({ ...prev, notes: e.target.value }))}
                                />
                              </div>
                              <div className="flex gap-1">
                                <Input
                                  type="date"
                                  className="h-7 text-[11px] flex-1"
                                  title="Next Follow-up Date"
                                  value={followupForm.next_followup_date}
                                  onChange={(e) => setFollowupForm((prev) => ({ ...prev, next_followup_date: e.target.value }))}
                                />
                                <Button
                                  size="sm"
                                  disabled={!followupForm.notes.trim() || followupMutation.isPending}
                                  className="h-7 text-xs px-3 bg-blue-600 hover:bg-blue-700 text-white"
                                  onClick={() =>
                                    followupMutation.mutate({
                                      id: pa.id,
                                      data: followupForm,
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
                )}
              </div>
            )
          })}
        </div>

        {/* Pagination */}
        {preauths?.last_page > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</Button>
            <span className="text-xs text-muted-foreground">Page {preauths.current_page} of {preauths.last_page}</span>
            <Button size="sm" variant="ghost" disabled={page >= preauths.last_page} onClick={() => setPage(p => p + 1)}>Next →</Button>
          </div>
        )}
      </div>

      {/* ── CREATE PRE-AUTH MODAL ───────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl p-6 space-y-4 max-h-[92vh] overflow-y-auto border border-border animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-primary/10 p-2 text-primary">
                  <FileCheck2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-base">New Pre-Authorization Request</h3>
                  <p className="text-xs text-muted-foreground">Submit cashless treatment request to TPA / Ayushman Bharat</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setShowDiagResults(false)
                }}
                className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* 1. Inpatient & Policy Selection */}
              <PatientAdmissionPicker
                selectedAdmissionId={newPa.admission_id}
                selectedPolicyId={newPa.patient_insurance_id}
                onSelectionChange={({ admission, policy, payerId }) => {
                  setNewPa((p) => ({
                    ...p,
                    admission_id: admission ? String(admission.id) : "",
                    patient_insurance_id: policy ? String(policy.id) : "",
                    payer_id: payerId ? String(payerId) : p.payer_id,
                  }))
                }}
              />

              {/* 2. Payer & Pre-Auth Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Payer / TPA / Insurer *</Label>
                  <Select
                    value={newPa.payer_id}
                    onValueChange={(v) => {
                      setNewPa((p) => ({ ...p, payer_id: v }))
                      setSelectedTariffId("")
                    }}
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
                  <Label className="text-xs">Pre-Auth Type</Label>
                  <Select
                    value={newPa.preauth_type}
                    onValueChange={(v) => setNewPa((p) => ({ ...p, preauth_type: v }))}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="initial">Initial Cashless</SelectItem>
                      <SelectItem value="emergency">Emergency Cashless</SelectItem>
                      <SelectItem value="enhancement">Enhancement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 3. Primary Diagnosis with WHO ICD-10 Autocomplete */}
              <div className="space-y-1 relative">
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center gap-1">
                    <Stethoscope className="h-3.5 w-3.5 text-primary" />
                    Primary Diagnosis (WHO ICD-10 Search) *
                  </Label>
                  {newPa.primary_diagnosis && (
                    <button
                      type="button"
                      className="text-[11px] text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setNewPa((p) => ({ ...p, primary_diagnosis: "" }))
                        setDiagSearch("")
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="relative">
                  <Input
                    className="h-9 text-xs"
                    placeholder="Type disease name or ICD-10 code (e.g. Appendicitis, K35, Fever, Diabetes)..."
                    value={newPa.primary_diagnosis || diagSearch}
                    onChange={(e) => {
                      const val = e.target.value
                      setDiagSearch(val)
                      setNewPa((p) => ({ ...p, primary_diagnosis: val }))
                      setShowDiagResults(val.trim().length >= 2)
                    }}
                    onFocus={() => {
                      if ((diagSearch || newPa.primary_diagnosis).trim().length >= 2) {
                        setShowDiagResults(true)
                      }
                    }}
                  />
                  {icdLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px]">
                      Searching ICD-10...
                    </div>
                  )}
                </div>

                {/* ICD-10 Autocomplete dropdown */}
                {showDiagResults && icdResults.length > 0 && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setShowDiagResults(false)}
                    />
                    <div className="absolute top-full left-0 right-0 mt-1 max-h-52 overflow-y-auto rounded-xl border border-border bg-popover shadow-xl z-40 divide-y divide-border/60">
                      {icdResults.map((item: any) => {
                        const code = item.code || item.code_with_separator
                        const desc = item.short_description || item.description || item.long_description
                        return (
                          <div
                            key={item.id || code}
                            onClick={() => {
                              const formatted = `${desc} (ICD-10: ${code})`
                              setNewPa((p) => ({ ...p, primary_diagnosis: formatted }))
                              setDiagSearch(formatted)
                              setShowDiagResults(false)
                            }}
                            className="p-2.5 hover:bg-muted/70 cursor-pointer transition-colors flex items-center justify-between text-xs"
                          >
                            <span className="font-medium text-foreground">{desc}</span>
                            <Badge variant="outline" className="font-mono text-[10px] text-primary border-primary/30">
                              {code}
                            </Badge>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* 4. Surgery / Treatment & Negotiated Tariff Selector */}
              <div className="space-y-2 rounded-xl border border-border/80 bg-muted/10 p-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Scissors className="h-3.5 w-3.5 text-primary" />
                    Proposed Treatment / Surgery *
                  </Label>
                  {payerTariffs.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      <Tag className="h-3 w-3 mr-1" />
                      {payerTariffs.length} Negotiated Tariffs Available
                    </Badge>
                  )}
                </div>

                {/* Tariff package selector dropdown if payer tariffs exist */}
                {payerTariffs.length > 0 && (
                  <div className="space-y-1">
                    <Select
                      value={selectedTariffId}
                      onValueChange={(val) => {
                        setSelectedTariffId(val)
                        if (val === "custom") {
                          return
                        }
                        const t = payerTariffs.find((item: any) => String(item.id) === String(val))
                        if (t) {
                          setNewPa((p) => ({
                            ...p,
                            proposed_treatment: t.procedure_name,
                            estimated_amount: String(t.approved_rate),
                            estimated_los_days: String(t.max_los_days || 3),
                            room_rent_per_day: t.room_rent_cap_per_day ? String(t.room_rent_cap_per_day) : p.room_rent_per_day,
                          }))
                        }
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs bg-background">
                        <SelectValue placeholder="⚡ Select Negotiated Package (Auto-fills Rate & LOS)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">✏️ Custom / Other Surgery (Manual Entry)</SelectItem>
                        {payerTariffs.map((t: any) => (
                          <SelectItem key={t.id} value={String(t.id)}>
                            {t.procedure_name} — ₹{Number(t.approved_rate).toLocaleString("en-IN")} ({t.max_los_days || 3}d LOS)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Input
                  className="h-9 text-xs bg-background"
                  placeholder="e.g. Laparoscopic Appendectomy under General Anaesthesia"
                  value={newPa.proposed_treatment}
                  onChange={(e) => setNewPa((p) => ({ ...p, proposed_treatment: e.target.value }))}
                />
              </div>

              {/* 5. Financials Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Est. Amount (₹) *</Label>
                  <Input
                    type="number"
                    className="h-9 text-xs font-semibold text-emerald-700 dark:text-emerald-400"
                    placeholder="50000"
                    value={newPa.estimated_amount}
                    onChange={(e) => setNewPa((p) => ({ ...p, estimated_amount: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Expected LOS (Days)</Label>
                  <Input
                    type="number"
                    className="h-9 text-xs"
                    value={newPa.estimated_los_days}
                    onChange={(e) => setNewPa((p) => ({ ...p, estimated_los_days: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Room Rent Cap / Day (₹)</Label>
                  <Input
                    type="number"
                    className="h-9 text-xs"
                    placeholder="3000"
                    value={newPa.room_rent_per_day}
                    onChange={(e) => setNewPa((p) => ({ ...p, room_rent_per_day: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="outline" onClick={() => setShowCreateModal(false)} className="text-xs h-9">
                Cancel
              </Button>
              <Button
                disabled={
                  !newPa.payer_id ||
                  !newPa.patient_insurance_id ||
                  !newPa.primary_diagnosis ||
                  !newPa.proposed_treatment ||
                  !newPa.estimated_amount ||
                  createMutation.isPending
                }
                className="text-xs h-9 bg-primary"
                onClick={() =>
                  createMutation.mutate({
                    ...newPa,
                    payer_id: Number(newPa.payer_id),
                    patient_insurance_id: Number(newPa.patient_insurance_id),
                    admission_id: newPa.admission_id ? Number(newPa.admission_id) : undefined,
                    estimated_amount: Number(newPa.estimated_amount),
                    estimated_los_days: Number(newPa.estimated_los_days || 1),
                    room_rent_per_day: newPa.room_rent_per_day ? Number(newPa.room_rent_per_day) : undefined,
                  })
                }
              >
                {createMutation.isPending ? "Submitting..." : "Submit Pre-Auth to TPA"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── RAISE ENHANCEMENT MODAL ─────────────────────────────────── */}
      {enhancementTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-semibold text-base flex items-center gap-2 text-blue-700">
              <TrendingUp className="h-4 w-4" /> Request Cashless Enhancement
            </h3>
            <p className="text-xs text-muted-foreground">
              Requesting cost/stay enhancement for Pre-Auth <strong>{enhancementTarget.preauth_number}</strong> (Current Sanction: ₹{Number(enhancementTarget.approved_amount || 0).toLocaleString("en-IN")}).
            </p>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>New Est. Amount (₹) *</Label>
                  <Input
                    type="number"
                    value={enhancementData.estimated_amount}
                    onChange={(e) => setEnhancementData(d => ({ ...d, estimated_amount: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Additional Days</Label>
                  <Input
                    type="number"
                    value={enhancementData.estimated_los_days}
                    onChange={(e) => setEnhancementData(d => ({ ...d, estimated_los_days: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Clinical Reason for Enhancement *</Label>
                <textarea
                  className="w-full text-xs rounded-lg border border-border bg-background p-2.5 resize-none h-24"
                  placeholder="e.g. Patient developed postoperative fever; stay extended for IV antibiotic therapy and ICU monitoring..."
                  value={enhancementData.reason_for_enhancement}
                  onChange={(e) => setEnhancementData(d => ({ ...d, reason_for_enhancement: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="outline" onClick={() => setEnhancementTarget(null)}>Cancel</Button>
              <Button
                disabled={!enhancementData.estimated_amount || !enhancementData.reason_for_enhancement || enhancementMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() =>
                  enhancementMutation.mutate({
                    id: enhancementTarget.id,
                    data: {
                      ...enhancementData,
                      estimated_amount: Number(enhancementData.estimated_amount),
                      estimated_los_days: Number(enhancementData.estimated_los_days || 1),
                    },
                  })
                }
              >
                {enhancementMutation.isPending ? "Submitting..." : "Send to TPA"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── STATUS ACTION MODAL (Replaces prompt()) ────────────────── */}
      {statusActionModal.isOpen && statusActionModal.preauth && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-border animate-in fade-in zoom-in-95 duration-150">
            {/* APPROVE */}
            {statusActionModal.type === "approve" && (
              <>
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="font-semibold text-base flex items-center gap-2 text-emerald-600">
                    <CheckCircle2 className="h-5 w-5" /> Sanction Pre-Authorization
                  </h3>
                  <button onClick={() => setStatusActionModal({ isOpen: false, type: null, preauth: null })} className="rounded-lg p-1 hover:bg-muted text-muted-foreground">✕</button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Record cashless sanction received from <strong>{statusActionModal.preauth.payer?.name}</strong> for <strong>{statusActionModal.preauth.preauth_number}</strong>.
                </p>
                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <Label className="text-xs">Approved Sanction Amount (₹) *</Label>
                    <Input
                      type="number"
                      className="h-9 font-semibold text-emerald-700"
                      value={statusActionData.approved_amount}
                      onChange={(e) => setStatusActionData(d => ({ ...d, approved_amount: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Sanction Valid Till (Date) *</Label>
                    <Input
                      type="date"
                      className="h-9"
                      value={statusActionData.valid_till}
                      onChange={(e) => setStatusActionData(d => ({ ...d, valid_till: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t">
                  <Button variant="outline" size="sm" onClick={() => setStatusActionModal({ isOpen: false, type: null, preauth: null })}>Cancel</Button>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={!statusActionData.approved_amount || statusUpdateMutation.isPending}
                    onClick={() => {
                      statusUpdateMutation.mutate({
                        id: statusActionModal.preauth.id,
                        status: "approved",
                        data: {
                          approved_amount: Number(statusActionData.approved_amount),
                          valid_till: statusActionData.valid_till || undefined,
                        },
                      })
                      setStatusActionModal({ isOpen: false, type: null, preauth: null })
                    }}
                  >
                    Confirm Sanction
                  </Button>
                </div>
              </>
            )}

            {/* QUERY */}
            {statusActionModal.type === "query" && (
              <>
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="font-semibold text-base flex items-center gap-2 text-amber-600">
                    <MessageSquare className="h-5 w-5" /> Record TPA Query / Shortfall
                  </h3>
                  <button onClick={() => setStatusActionModal({ isOpen: false, type: null, preauth: null })} className="rounded-lg p-1 hover:bg-muted text-muted-foreground">✕</button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Record query or additional documents demanded by <strong>{statusActionModal.preauth.payer?.name}</strong>.
                </p>
                <div className="space-y-1 text-xs">
                  <Label className="text-xs">TPA Query Details / Required Documents *</Label>
                  <textarea
                    className="w-full text-xs rounded-lg border border-border bg-background p-2.5 resize-none h-28"
                    placeholder="e.g. Please provide previous USG report, 1st symptom date, and surgeon fitness certificate..."
                    value={statusActionData.tpa_query}
                    onChange={(e) => setStatusActionData(d => ({ ...d, tpa_query: e.target.value }))}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t">
                  <Button variant="outline" size="sm" onClick={() => setStatusActionModal({ isOpen: false, type: null, preauth: null })}>Cancel</Button>
                  <Button
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                    disabled={!statusActionData.tpa_query || statusUpdateMutation.isPending}
                    onClick={() => {
                      statusUpdateMutation.mutate({
                        id: statusActionModal.preauth.id,
                        status: "queried",
                        data: {
                          tpa_query: statusActionData.tpa_query,
                        },
                      })
                      setStatusActionModal({ isOpen: false, type: null, preauth: null })
                    }}
                  >
                    Save TPA Query
                  </Button>
                </div>
              </>
            )}

            {/* DENY */}
            {statusActionModal.type === "deny" && (
              <>
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="font-semibold text-base flex items-center gap-2 text-red-600">
                    <XCircle className="h-5 w-5" /> Record Pre-Auth Denial
                  </h3>
                  <button onClick={() => setStatusActionModal({ isOpen: false, type: null, preauth: null })} className="rounded-lg p-1 hover:bg-muted text-muted-foreground">✕</button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Mark Pre-Auth <strong>{statusActionModal.preauth.preauth_number}</strong> as denied by insurer.
                </p>
                <div className="space-y-1 text-xs">
                  <Label className="text-xs">Denial Reason / Exclusion Clause *</Label>
                  <textarea
                    className="w-full text-xs rounded-lg border border-border bg-background p-2.5 resize-none h-24"
                    placeholder="e.g. Pre-existing condition clause 4.1 applied; 48-month waiting period not completed..."
                    value={statusActionData.denial_reason}
                    onChange={(e) => setStatusActionData(d => ({ ...d, denial_reason: e.target.value }))}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t">
                  <Button variant="outline" size="sm" onClick={() => setStatusActionModal({ isOpen: false, type: null, preauth: null })}>Cancel</Button>
                  <Button
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 text-white"
                    disabled={!statusActionData.denial_reason || statusUpdateMutation.isPending}
                    onClick={() => {
                      statusUpdateMutation.mutate({
                        id: statusActionModal.preauth.id,
                        status: "denied",
                        data: {
                          denial_reason: statusActionData.denial_reason,
                        },
                      })
                      setStatusActionModal({ isOpen: false, type: null, preauth: null })
                    }}
                  >
                    Confirm Denial
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── PRINT PRE-AUTH SANCTION LETTER MODAL ── */}
      {sanctionPrintTarget && (
        <PrintPreauthSanctionModal
          preauth={sanctionPrintTarget}
          onClose={() => setSanctionPrintTarget(null)}
        />
      )}
    </div>
  )
}
