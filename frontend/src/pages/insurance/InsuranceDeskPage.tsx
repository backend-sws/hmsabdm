import React, { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ShieldCheck,
  Building2,
  FileCheck2,
  Receipt,
  TrendingUp,
  Clock,
  Plus,
  RefreshCw,
  Search,
  ChevronRight,
  BadgeAlert,
  HeartHandshake,
  Landmark,
  Users2,
  MessageSquareWarning,
} from "lucide-react"
import { PageHeader } from "@/components/common/PageHeader"
import { StatCardsRow } from "@/components/common/stat-cards-row"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { insuranceService } from "@/services/insuranceService"
import type {
  InsuranceDashboardStats,
  InsurancePayer,
  InsurancePreauth,
  InsuranceClaim,
  LiveCashlessAdmission,
  PayerWiseOutstanding,
  PayerType,
} from "@/types/insurance"
import { InsurancePayerModal } from "@/components/insurance/InsurancePayerModal"
import { InsurancePreauthModal } from "@/components/insurance/InsurancePreauthModal"
import { InsuranceClaimModal } from "@/components/insurance/InsuranceClaimModal"
import { InsuranceArLedgerPanel } from "@/components/insurance/InsuranceArLedgerPanel"
import { InsuranceNonPayablesPanel } from "@/components/insurance/InsuranceNonPayablesPanel"
import { InsurancePmjayPanel } from "@/components/insurance/InsurancePmjayPanel"
import { InsuranceImplantModal } from "@/components/insurance/InsuranceImplantModal"
import { InsuranceTariffModal } from "@/components/insurance/InsuranceTariffModal"

type ActiveTab = "dashboard" | "payers" | "preauth" | "claims" | "ar" | "nonpayables" | "pmjay" | "implants"

export const InsuranceDeskPage: React.FC = () => {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard")
  const [payerSearch, setPayerSearch] = useState("")
  const [showPayerModal, setShowPayerModal] = useState(false)
  const [showPreauthModal, setShowPreauthModal] = useState(false)
  const [showClaimModal, setShowClaimModal] = useState(false)
  const [showImplantModal, setShowImplantModal] = useState(false)
  const [editingPayer, setEditingPayer] = useState<InsurancePayer | null>(null)
  const [selectedTariffPayer, setSelectedTariffPayer] = useState<InsurancePayer | null>(null)
  const [initialClaimData, setInitialClaimData] = useState<Partial<InsuranceClaim> | Partial<InsurancePreauth> | null>(null)

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<InsuranceDashboardStats>({
    queryKey: ["insurance", "dashboard"],
    queryFn: () => insuranceService.getDashboard(),
    refetchInterval: 60000,
  })

  const { data: payers = [], isLoading: payersLoading } = useQuery<InsurancePayer[]>({
    queryKey: ["insurance", "payers", payerSearch],
    queryFn: () => insuranceService.getPayers({ search: payerSearch }),
  })

  const TABS = [
    { id: "dashboard", label: "Dashboard", icon: TrendingUp },
    { id: "payers", label: "Payer Master", icon: Building2 },
    { id: "preauth", label: "Pre-Authorization", icon: FileCheck2 },
    { id: "claims", label: "Claims", icon: Receipt },
    { id: "ar", label: "AR Ledger", icon: Landmark },
    { id: "nonpayables", label: "Non-Payables", icon: BadgeAlert },
    { id: "pmjay", label: "PMJAY / Govt", icon: HeartHandshake },
    { id: "implants", label: "Implants", icon: ShieldCheck },
  ] as const

  const agingBuckets = stats?.aging_breakdown || {}
  const agingColors: Record<string, string> = {
    "0-30": "text-emerald-600 bg-emerald-50 border-emerald-200",
    "31-60": "text-yellow-600 bg-yellow-50 border-yellow-200",
    "61-90": "text-orange-600 bg-orange-50 border-orange-200",
    "90+": "text-red-600 bg-red-50 border-red-200",
  }

  const payerTypeColors: Record<PayerType, string> = {
    tpa: "bg-blue-100 text-blue-700",
    insurance_company: "bg-purple-100 text-purple-700",
    corporate: "bg-cyan-100 text-cyan-700",
    cghs: "bg-green-100 text-green-700",
    esic: "bg-teal-100 text-teal-700",
    pmjay: "bg-orange-100 text-orange-700",
    other: "bg-gray-100 text-gray-700",
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Insurance & TPA Desk"
        subtitle="Enterprise multi-payer management — Pre-Auth, Claims, AR Ledger, IRDAI Compliance"
        badgeText="Ayushman Bharat & TPA"
        badgeVariant="info"
        icon={ShieldCheck}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => refetchStats()}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
            </Button>
            <Button size="sm" onClick={() => setShowPreauthModal(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> New Pre-Auth
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowClaimModal(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> New Claim
            </Button>
          </div>
        }
      />

      {/* ── Modern Pill Navigation Tabs ──────────────────────────────── */}
      <div className="border-b border-border/80 bg-card/60 backdrop-blur-md px-4 overflow-x-auto shadow-2xs">
        <div className="flex gap-1.5 min-w-max py-2">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as ActiveTab)}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
                activeTab === id
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              {id === "preauth" && stats && stats.pending_queries > 0 && (
                <span className="ml-1 rounded-full bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.2 leading-none animate-pulse">
                  {stats.pending_queries}
                </span>
              )}
              {id === "ar" && stats && stats.pending_claims > 0 && (
                <span className="ml-1 rounded-full bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.2 leading-none">
                  {stats.pending_claims}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ───────────────────────────────────────────────── */}
      <div className="space-y-4">

        {/* ── DASHBOARD ─────────────────────────────────────────────── */}
        {activeTab === "dashboard" && (
          <div className="space-y-4">
            {/* Alerts Row */}
            {stats && (stats.expiring_preauths_alert > 0 || stats.pending_queries > 0) && (
              <div className="flex flex-wrap gap-3">
                {stats.expiring_preauths_alert > 0 && (
                  <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 shadow-2xs dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-300">
                    <Clock className="h-4 w-4 shrink-0 text-amber-600" />
                    <span>
                      <strong>{stats.expiring_preauths_alert}</strong> pre-auth{stats.expiring_preauths_alert > 1 ? "s" : ""}{" "}
                      expiring in next 48 hrs — Renew immediately!
                    </span>
                  </div>
                )}
                {stats.pending_queries > 0 && (
                  <div className="flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-900 shadow-2xs dark:bg-red-900/20 dark:border-red-700 dark:text-red-300 animate-pulse">
                    <MessageSquareWarning className="h-4 w-4 shrink-0 text-red-600" />
                    <span>
                      <strong>{stats.pending_queries}</strong> TPA quer{stats.pending_queries > 1 ? "ies" : "y"} awaiting your response!
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* KPI Cards (Unified StatCardsRow) */}
            <StatCardsRow
              columns={4}
              isLoading={statsLoading}
              stats={[
                {
                  title: "Active Pre-Auths",
                  value: stats?.active_preauths ?? 0,
                  description: "Submitted / Approved",
                  icon: <FileCheck2 className="h-5 w-5" />,
                  colorScheme: "blue",
                },
                {
                  title: "Pending Claims",
                  value: stats?.pending_claims ?? 0,
                  description: "Awaiting settlement",
                  icon: <Receipt className="h-5 w-5" />,
                  colorScheme: "amber",
                },
                {
                  title: "AR Outstanding",
                  value: `₹${((stats?.ar_outstanding ?? 0) / 100000).toFixed(1)}L`,
                  description: "Total receivable",
                  icon: <Landmark className="h-5 w-5" />,
                  colorScheme: "rose",
                },
                {
                  title: "Monthly Settled",
                  value: `₹${((stats?.monthly_settled ?? 0) / 100000).toFixed(1)}L`,
                  description: "This month",
                  icon: <TrendingUp className="h-5 w-5" />,
                  colorScheme: "emerald",
                },
              ]}
            />

            {/* AR Aging */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-[0_1px_3px_0_rgba(15,23,42,0.04),0_6px_16px_-4px_rgba(15,23,42,0.05)]">
              <h3 className="text-sm font-bold mb-3.5 flex items-center gap-2 text-foreground">
                <Landmark className="h-4 w-4 text-primary" /> AR Aging Breakdown
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {["0-30", "31-60", "61-90", "90+"].map((bucket) => {
                  const bucketData = agingBuckets[bucket] || { count: 0, amount: 0 }
                  return (
                    <div key={bucket} className={`rounded-xl border p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-2xs ${agingColors[bucket]}`}>
                      <p className="text-xs font-bold tracking-wider uppercase">{bucket} days</p>
                      <p className="text-xl font-black font-mono mt-1 tabular-nums">
                        ₹{((bucketData.amount ?? 0) / 100000).toFixed(1)}L
                      </p>
                      <p className="text-xs mt-0.5 opacity-90 font-medium">{bucketData.count ?? 0} claims</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Live Cashless Admissions */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-[0_1px_3px_0_rgba(15,23,42,0.04),0_6px_16px_-4px_rgba(15,23,42,0.05)]">
              <div className="flex items-center justify-between mb-3.5">
                <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <Users2 className="h-4 w-4 text-primary" /> Live Cashless Admissions
                </h3>
                <Badge variant="secondary" dot>{stats?.live_cashless_admissions?.length ?? 0} active</Badge>
              </div>
              <div className="space-y-2.5">
                {statsLoading && <p className="text-xs text-muted-foreground text-center py-4">Loading...</p>}
                {!statsLoading && (!stats?.live_cashless_admissions?.length) && (
                  <p className="text-xs text-muted-foreground text-center py-6">No active cashless admissions</p>
                )}
                {stats?.live_cashless_admissions?.map((adm: LiveCashlessAdmission) => (
                  <div key={adm.admission_id} className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/20 hover:bg-muted/40 transition-colors px-3.5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{adm.patient?.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{adm.patient?.uhid} · {adm.admission_number}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-primary">{adm.preauth?.payer?.name}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">PA #{adm.preauth?.tpa_preauth_number || "—"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payer-wise Outstanding */}
            {(stats?.payer_wise_outstanding?.length ?? 0) > 0 && stats && (
              <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-[0_1px_3px_0_rgba(15,23,42,0.04),0_6px_16px_-4px_rgba(15,23,42,0.05)]">
                <h3 className="text-sm font-bold mb-3.5 flex items-center gap-2 text-foreground">
                  <Building2 className="h-4 w-4 text-primary" /> Payer-wise Outstanding
                </h3>
                <div className="space-y-2.5">
                  {stats.payer_wise_outstanding.map((p: PayerWiseOutstanding) => (
                    <div key={p.payer?.id} className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-2.5">
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border tracking-wider uppercase ${(p.payer?.payer_type && payerTypeColors[p.payer.payer_type]) || payerTypeColors.other}`}>
                          {p.payer?.payer_type?.toUpperCase()}
                        </span>
                        <span className="font-semibold text-foreground">{p.payer?.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-black font-mono tabular-nums text-rose-600 dark:text-rose-400">
                          ₹{((p.outstanding ?? 0) / 100000).toFixed(2)}L
                        </span>
                        <span className="text-xs text-muted-foreground ml-2 font-medium">({p.count} claims)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PAYER MASTER ──────────────────────────────────────────── */}
        {activeTab === "payers" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  className="pl-9 h-9"
                  placeholder="Search payers..."
                  value={payerSearch}
                  onChange={(e) => setPayerSearch(e.target.value)}
                />
              </div>
              <Button size="sm" onClick={() => { setEditingPayer(null); setShowPayerModal(true) }}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Payer
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {payersLoading && (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-36 rounded-2xl border border-border bg-muted/30 animate-pulse" />
                ))
              )}
              {payers.map((payer: InsurancePayer) => (
                <div
                  key={payer.id}
                  className="rounded-2xl border border-border/80 bg-card p-5 shadow-[0_1px_3px_0_rgba(15,23,42,0.04),0_6px_16px_-4px_rgba(15,23,42,0.05)] hover:shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05),0_14px_28px_-6px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between mb-2.5">
                      <div>
                        <h4 className="font-bold text-sm text-foreground">{payer.name}</h4>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">{payer.empanelment_number || "No empanelment #"}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border tracking-wider uppercase ${payerTypeColors[payer.payer_type] || payerTypeColors.other}`}>
                        {payer.payer_type?.toUpperCase()}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground pt-1">
                      {payer.contact_person && <p className="flex items-center gap-1.5"><span>👤</span> <span className="font-medium text-foreground/80">{payer.contact_person}</span></p>}
                      {payer.contact_phone && <p className="flex items-center gap-1.5"><span>📞</span> <span className="font-mono">{payer.contact_phone}</span></p>}
                      <p className="pt-1 text-foreground/75">
                        Co-pay: <strong className="text-foreground">{payer.default_copay_percent}%</strong>
                        {" · "}TAT: <strong className="text-foreground">{payer.preauth_tat_hours}h</strong>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 pt-3 border-t border-border/60">
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-xs font-semibold rounded-xl" onClick={() => { setEditingPayer(payer); setShowPayerModal(true) }}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1 h-8 text-xs font-semibold rounded-xl hover:bg-primary/10 hover:text-primary transition-colors"
                      onClick={() => setSelectedTariffPayer(payer)}
                    >
                      Tariffs <ChevronRight className="h-3 w-3 ml-0.5" />
                    </Button>
                  </div>
                </div>
              ))}
              {!payersLoading && !payers.length && (
                <div className="col-span-3 text-center py-12 text-muted-foreground">
                  <Building2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No payers added yet. Add your first TPA/insurer.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PRE-AUTH ──────────────────────────────────────────────── */}
        {activeTab === "preauth" && (
          <InsurancePreauthModal
            embedded
            onRefresh={() => qc.invalidateQueries({ queryKey: ["insurance"] })}
            onFileClaim={(pa: InsurancePreauth) => {
              setInitialClaimData(pa)
              setActiveTab("claims")
            }}
          />
        )}

        {/* ── CLAIMS ────────────────────────────────────────────────── */}
        {activeTab === "claims" && (
          <InsuranceClaimModal
            embedded
            initialData={initialClaimData}
            onRefresh={() => qc.invalidateQueries({ queryKey: ["insurance"] })}
          />
        )}

        {/* ── AR LEDGER ─────────────────────────────────────────────── */}
        {activeTab === "ar" && <InsuranceArLedgerPanel />}

        {/* ── NON-PAYABLES ──────────────────────────────────────────── */}
        {activeTab === "nonpayables" && <InsuranceNonPayablesPanel />}

        {/* ── PMJAY / GOVT ──────────────────────────────────────────── */}
        {activeTab === "pmjay" && <InsurancePmjayPanel />}

        {/* ── IMPLANTS ──────────────────────────────────────────────── */}
        {activeTab === "implants" && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setShowImplantModal(true)}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> New Implant Approval
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center py-8">
              Implant approval requests (stents, prosthetics, cochlear implants, hip/knee) will appear here.
            </p>
          </div>
        )}
      </div>

      {/* ── Modals ────────────────────────────────────────────────────── */}
      <InsurancePayerModal
        open={showPayerModal}
        onClose={() => { setShowPayerModal(false); setEditingPayer(null) }}
        editingPayer={editingPayer}
        onSaved={() => qc.invalidateQueries({ queryKey: ["insurance", "payers"] })}
      />
      {showPreauthModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <InsurancePreauthModal
            onClose={() => setShowPreauthModal(false)}
            onRefresh={() => qc.invalidateQueries({ queryKey: ["insurance"] })}
            onFileClaim={(pa: InsurancePreauth) => {
              setShowPreauthModal(false)
              setInitialClaimData(pa)
              setShowClaimModal(true)
            }}
          />
        </div>
      )}
      {showClaimModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <InsuranceClaimModal
            initialData={initialClaimData}
            onClose={() => {
              setShowClaimModal(false)
              setInitialClaimData(null)
            }}
            onRefresh={() => qc.invalidateQueries({ queryKey: ["insurance"] })}
          />
        </div>
      )}
      {showImplantModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <InsuranceImplantModal
            onClose={() => setShowImplantModal(false)}
            onRefresh={() => qc.invalidateQueries({ queryKey: ["insurance", "implants"] })}
          />
        </div>
      )}
      {selectedTariffPayer && (
        <InsuranceTariffModal
          payer={selectedTariffPayer}
          onClose={() => setSelectedTariffPayer(null)}
        />
      )}
    </div>
  )
}
