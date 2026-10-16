import React, { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Landmark,
  Search,
  RefreshCw,
  Clock,
  Receipt,
  FileText,
  Filter,
  Download,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { insuranceService } from "@/services/insuranceService"

export const InsuranceArLedgerPanel: React.FC = () => {
  const [agingFilter, setAgingFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [viewMode, setViewMode] = useState<"transactions" | "claims">("transactions")

  const { data: summary, refetch: refetchSummary } = useQuery({
    queryKey: ["insurance", "ar-summary"],
    queryFn: () => insuranceService.getArSummary(),
  })

  const { data: ledger, isLoading: ledgerLoading, refetch: refetchLedger } = useQuery({
    queryKey: ["insurance", "ar-ledger", agingFilter, search],
    queryFn: () => insuranceService.getArLedger({ aging_bucket: agingFilter, search }),
  })

  const agingBuckets = summary?.aging_buckets || {
    "0-30": { count: summary?.counts?.["0-30"] ?? 0, amount: summary?.totals?.["0-30"] ?? 0 },
    "31-60": { count: summary?.counts?.["31-60"] ?? 0, amount: summary?.totals?.["31-60"] ?? 0 },
    "61-90": { count: summary?.counts?.["61-90"] ?? 0, amount: summary?.totals?.["61-90"] ?? 0 },
    "90+": { count: summary?.counts?.["90+"] ?? 0, amount: summary?.totals?.["90+"] ?? 0 },
  }

  const agingColors: Record<string, { bg: string; text: string; border: string }> = {
    "0-30": { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800" },
    "31-60": { bg: "bg-yellow-50 dark:bg-yellow-950/30", text: "text-yellow-700 dark:text-yellow-300", border: "border-yellow-200 dark:border-yellow-800" },
    "61-90": { bg: "bg-orange-50 dark:bg-orange-950/30", text: "text-orange-700 dark:text-orange-300", border: "border-orange-200 dark:border-orange-800" },
    "90+": { bg: "bg-red-50 dark:bg-red-950/30", text: "text-red-700 dark:text-red-300", border: "border-red-200 dark:border-red-800" },
  }

  const ledgerItems = Array.isArray(ledger?.data)
    ? ledger.data
    : Array.isArray(ledger?.entries)
    ? ledger.entries
    : Array.isArray(ledger)
    ? ledger
    : []

  const claimItems = Array.isArray(ledger?.claims) ? ledger.claims : []

  const exportToCsv = () => {
    if (viewMode === "claims") {
      const headers = [
        "Claim Number",
        "Patient Name",
        "UHID",
        "IPD Admission",
        "Payer / TPA",
        "Claim Type",
        "Submission Date",
        "Age (Days)",
        "Aging Bucket",
        "Claimed Amount (INR)",
        "Approved Amount (INR)",
        "Settled Amount (INR)",
        "Outstanding Balance (INR)",
        "Status",
        "Settlement UTR",
      ]

      const rows = claimItems.map((c: any) => [
        `"${c.claim_number || ""}"`,
        `"${c.patient_insurance?.patient?.name || ""}"`,
        `"${c.patient_insurance?.patient?.uhid || ""}"`,
        `"${c.admission?.ipd_number || ""}"`,
        `"${c.payer?.name || ""}"`,
        `"${c.claim_type || ""}"`,
        `"${c.submission_date || ""}"`,
        c.aging_days ?? 0,
        `"${c.aging_days <= 30 ? "0-30" : c.aging_days <= 60 ? "31-60" : c.aging_days <= 90 ? "61-90" : "90+"}"`,
        c.claimed_amount ?? 0,
        c.approved_amount ?? 0,
        c.settled_amount ?? 0,
        c.outstanding_amount ?? 0,
        `"${c.status || ""}"`,
        `"${c.settlement_utr || ""}"`,
      ])

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((row: any[]) => row.join(","))].join("\n")
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement("a")
      link.setAttribute("href", encodedUri)
      link.setAttribute("download", `Insurance_AR_Pending_Claims_${new Date().toISOString().split("T")[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success("AR Pending Claims CSV exported successfully")
    } else {
      const headers = [
        "Transaction Date",
        "Claim Number",
        "Payer / TPA",
        "Event Type",
        "Amount (INR)",
        "Running Outstanding (INR)",
        "Transaction Ref / UTR",
        "Notes",
      ]

      const rows = ledgerItems.map((item: any) => [
        `"${item.event_date || item.created_at || ""}"`,
        `"${item.claim?.claim_number || "—"}"`,
        `"${item.claim?.payer?.name || "—"}"`,
        `"${item.event_type || ""}"`,
        item.amount ?? 0,
        item.running_outstanding ?? 0,
        `"${item.transaction_ref || ""}"`,
        `"${(item.notes || "").replace(/"/g, '""')}"`,
      ])

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((row: any[]) => row.join(","))].join("\n")
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement("a")
      link.setAttribute("href", encodedUri)
      link.setAttribute("download", `Insurance_AR_Ledger_Transactions_${new Date().toISOString().split("T")[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success("AR Ledger Transactions CSV exported successfully")
    }
  }

  return (
    <div className="space-y-4">
      {/* ── AR Aging Bucket Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {(["0-30", "31-60", "61-90", "90+"] as const).map((bucket) => {
          const cfg = agingColors[bucket]
          const bucketData = agingBuckets[bucket] || { count: 0, amount: 0 }
          const isSelected = agingFilter === bucket

          return (
            <div
              key={bucket}
              onClick={() => {
                setAgingFilter(isSelected ? "all" : bucket)
              }}
              className={`rounded-2xl border p-4.5 cursor-pointer transition-all duration-200 ${cfg.bg} ${cfg.border} ${
                isSelected ? "ring-2 ring-primary shadow-md scale-[1.02]" : "shadow-[0_1px_3px_0_rgba(15,23,42,0.04),0_6px_16px_-4px_rgba(15,23,42,0.05)] hover:shadow-md hover:-translate-y-0.5"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider ${cfg.text}`}>
                  {bucket} Days
                </span>
                <Clock className={`h-3.5 w-3.5 ${cfg.text}`} />
              </div>
              <p className="text-xl sm:text-2xl font-black font-mono mt-2 tracking-tight tabular-nums text-foreground">
                ₹{((bucketData.amount || 0) / 100000).toFixed(2)} Lakh
              </p>
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                {bucketData.count || 0} claims pending
              </p>
            </div>
          )
        })}
      </div>

      {/* ── Ledger Transactions & Aging List ─────────────────────────── */}
      <div className="rounded-2xl border border-border/80 bg-card shadow-[0_1px_3px_0_rgba(15,23,42,0.04),0_6px_16px_-4px_rgba(15,23,42,0.05)] p-5 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Landmark className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Accounts Receivable Aging & Settlement Ledger</h3>
              <p className="text-[11px] text-muted-foreground">
                Audit trail for cashless claims, TPA settlements, deductions, and aging reconciliation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Toggle */}
            <div className="flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setViewMode("transactions")}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  viewMode === "transactions"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileText className="h-3 w-3 inline mr-1" />
                Ledger Transactions ({ledgerItems.length})
              </button>
              <button
                type="button"
                onClick={() => setViewMode("claims")}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  viewMode === "claims"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Receipt className="h-3 w-3 inline mr-1" />
                Pending Claims ({claimItems.length})
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="pl-9 h-8 text-xs w-48 sm:w-56"
                placeholder="Search UTR, Claim, Notes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {agingFilter !== "all" && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs text-primary"
                onClick={() => setAgingFilter("all")}
              >
                <Filter className="h-3 w-3 mr-1" /> Reset {agingFilter} Filter
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1 border-emerald-300 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300"
              onClick={exportToCsv}
              title="Download CSV report for accounting & TPA audit"
            >
              <Download className="h-3 w-3" /> Export CSV
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => {
                refetchSummary()
                refetchLedger()
              }}
            >
              <RefreshCw className="h-3 w-3 mr-1" /> Refresh
            </Button>
          </div>
        </div>

        {/* ── View 1: Ledger Transactions Table ── */}
        {viewMode === "transactions" && (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Date</th>
                  <th className="py-2.5 px-3 font-semibold">Claim #</th>
                  <th className="py-2.5 px-3 font-semibold">Event Type</th>
                  <th className="py-2.5 px-3 font-semibold">Amount</th>
                  <th className="py-2.5 px-3 font-semibold">Running Outstanding</th>
                  <th className="py-2.5 px-3 font-semibold">UTR / Reference</th>
                  <th className="py-2.5 px-3 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {ledgerLoading && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      Loading AR ledger entries...
                    </td>
                  </tr>
                )}

                {!ledgerLoading && !ledgerItems.length && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      No AR ledger entries found for this filter.
                    </td>
                  </tr>
                )}

                {ledgerItems.map((item: any) => {
                  const isPayment = item.event_type === "payment_received" || item.event_type === "settled"
                  const isDeduction = item.event_type === "deduction_applied" || item.event_type === "short_payment"

                  return (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground font-mono">
                        {item.event_date || item.created_at?.slice(0, 10)}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-primary">
                        {item.claim?.claim_number || `Claim #${item.claim_id}`}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            isPayment
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : isDeduction
                              ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                              : item.event_type === "grievance_raised"
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                          }`}
                        >
                          {item.event_type?.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold font-mono">
                        <span className={isPayment ? "text-emerald-600" : isDeduction ? "text-red-600" : ""}>
                          {isPayment ? "- " : "+ "}₹{Number(item.amount || 0).toLocaleString("en-IN")}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-foreground font-semibold">
                        ₹{Number(item.running_outstanding || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-muted-foreground">
                        {item.transaction_ref || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground max-w-xs truncate" title={item.notes}>
                        {item.notes || "—"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── View 2: Pending Claims Aging Table ── */}
        {viewMode === "claims" && (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Claim #</th>
                  <th className="py-2.5 px-3 font-semibold">Patient</th>
                  <th className="py-2.5 px-3 font-semibold">Payer / TPA</th>
                  <th className="py-2.5 px-3 font-semibold">Submitted</th>
                  <th className="py-2.5 px-3 font-semibold">Aging Days</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Claimed</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Outstanding</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {ledgerLoading && (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-muted-foreground">
                      Loading claims list...
                    </td>
                  </tr>
                )}

                {!ledgerLoading && !claimItems.length && (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-muted-foreground">
                      No pending claims found for this filter.
                    </td>
                  </tr>
                )}

                {claimItems.map((claim: any) => {
                  const days = claim.aging_days || 0
                  const daysColor =
                    days <= 30
                      ? "text-emerald-700 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300"
                      : days <= 60
                      ? "text-yellow-700 bg-yellow-100 dark:bg-yellow-950 dark:text-yellow-300"
                      : days <= 90
                      ? "text-orange-700 bg-orange-100 dark:bg-orange-950 dark:text-orange-300"
                      : "text-red-700 bg-red-100 dark:bg-red-950 dark:text-red-300"

                  return (
                    <tr key={claim.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-primary">
                        {claim.claim_number}
                        {claim.tpa_claim_number && (
                          <span className="block text-[10px] text-muted-foreground font-mono">
                            Ref: {claim.tpa_claim_number}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-medium">
                          {claim.patient_insurance?.patient?.name || claim.patient_insurance?.insured_name || "Patient Record"}
                        </span>
                        {claim.patient_insurance?.patient?.uhid && (
                          <span className="block text-[10px] text-muted-foreground font-mono">
                            {claim.patient_insurance.patient.uhid}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">
                        {claim.payer?.name}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground font-mono">
                        {claim.submission_date}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${daysColor}`}>
                          {days} days ({claim.aging_bucket || "0-30"})
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium">
                        ₹{Number(claim.claimed_amount || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                        ₹{Number(claim.outstanding_amount || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-muted uppercase tracking-wide">
                          {claim.status?.replace(/_/g, " ")}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
