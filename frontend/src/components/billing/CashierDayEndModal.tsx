import React, { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Calendar,
  Printer,
  DollarSign,
  CreditCard,
  QrCode,
  Banknote,
  Building,
  ShieldCheck,
  RefreshCw,
  Users,
  Clock,
} from "lucide-react"

import { FormContainer } from "@/components/formContainer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

import { billingService } from "@/services/billingService"
import { queryKeys } from "@/constants/queryKeys"

interface CashierDayEndModalProps {
  isOpen: boolean
  onClose: () => void
}

export const CashierDayEndModal: React.FC<CashierDayEndModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0])

  const {
    data: summary,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: queryKeys.billing.dayEndSummary(selectedDate),
    queryFn: () => billingService.getDayEndSummary({ date: selectedDate }),
    enabled: isOpen,
  })

  return (
    <FormContainer
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title="Cashier Day-End Closing & Shift Handover"
      description={`Daily cash drawer reconciliation & revenue audit for ${selectedDate}`}
      size="xl"
      footer={
        <div className="flex justify-between items-center w-full">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button size="sm" className="gap-2 bg-slate-900 hover:bg-slate-800 text-white" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print Shift Handover Slip
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-xs font-sans">
        {/* Date Selector Filter Bar */}
        <div className="flex items-center justify-between p-3 bg-muted/40 border rounded-xl">
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="font-semibold text-xs text-foreground">Select Closing Date:</span>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-40 h-8 text-xs font-mono"
            />
          </div>

          {summary && (
            <div className="text-[11px] text-muted-foreground flex items-center gap-2">
              <span className="flex items-center gap-1 font-mono">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> HIP: {summary.hospital.abdm_hip_id}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Generated: {new Date(summary.generated_at).toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-muted-foreground space-y-2">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-primary" />
            <p>Compiling shift collection summary and drawer balance...</p>
          </div>
        ) : summary ? (
          <div className="space-y-5 print:p-0">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Cash in Drawer */}
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1">
                <div className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-400 flex items-center justify-between">
                  <span>Cash in Drawer</span>
                  <Banknote className="h-4 w-4" />
                </div>
                <div className="font-mono font-extrabold text-xl text-emerald-700 dark:text-emerald-300">
                  ₹{summary.financial_totals.grand_total_cash_drawer.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-500 font-medium">
                  Physical currency to count & deposit
                </div>
              </div>

              {/* Digital Collections (UPI + Card) */}
              <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl space-y-1">
                <div className="text-[11px] font-semibold text-sky-800 dark:text-sky-400 flex items-center justify-between">
                  <span>Digital Payments</span>
                  <QrCode className="h-4 w-4" />
                </div>
                <div className="font-mono font-extrabold text-xl text-sky-700 dark:text-sky-300">
                  ₹{summary.financial_totals.grand_total_digital.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-sky-600 dark:text-sky-500 font-medium">
                  UPI QR & Card POS bank settlements
                </div>
              </div>

              {/* Total Revenue Collections */}
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl space-y-1">
                <div className="text-[11px] font-semibold text-purple-800 dark:text-purple-400 flex items-center justify-between">
                  <span>Total Collections</span>
                  <DollarSign className="h-4 w-4" />
                </div>
                <div className="font-mono font-extrabold text-xl text-purple-700 dark:text-purple-300">
                  ₹{summary.financial_totals.total_collections.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-purple-600 dark:text-purple-500 font-medium">
                  Across {summary.financial_totals.total_invoices} settled invoices
                </div>
              </div>

              {/* Advance Deposits Day */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
                <div className="text-[11px] font-semibold text-amber-800 dark:text-amber-400 flex items-center justify-between">
                  <span>Advance Deposits</span>
                  <CreditCard className="h-4 w-4" />
                </div>
                <div className="font-mono font-extrabold text-xl text-amber-700 dark:text-amber-300">
                  ₹{summary.financial_totals.advance_deposits_day.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-amber-600 dark:text-amber-500 font-medium">
                  Inpatient & casualty vouchers
                </div>
              </div>
            </div>

            {/* Mode-Wise & Department-Wise Breakup */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Payment Mode Table */}
              <div className="border rounded-xl p-3 bg-card space-y-2">
                <div className="font-bold text-xs text-foreground flex items-center justify-between">
                  <span>Payment Mode Breakdown</span>
                  <Badge variant="outline" className="text-[10px]">Tally Mode</Badge>
                </div>
                <div className="divide-y text-xs">
                  <div className="py-1.5 flex justify-between items-center">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Banknote className="h-3.5 w-3.5 text-emerald-600" /> Cash (Physical Currency)
                    </span>
                    <span className="font-mono font-bold">
                      ₹{summary.payment_mode_breakdown.cash.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="py-1.5 flex justify-between items-center">
                    <span className="flex items-center gap-1.5 font-medium">
                      <QrCode className="h-3.5 w-3.5 text-sky-600" /> UPI / Dynamic QR Code
                    </span>
                    <span className="font-mono font-bold">
                      ₹{summary.payment_mode_breakdown.upi.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="py-1.5 flex justify-between items-center">
                    <span className="flex items-center gap-1.5 font-medium">
                      <CreditCard className="h-3.5 w-3.5 text-purple-600" /> Debit / Credit Card (POS)
                    </span>
                    <span className="font-mono font-bold">
                      ₹{summary.payment_mode_breakdown.card.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="py-1.5 flex justify-between items-center">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Building className="h-3.5 w-3.5 text-amber-600" /> Insurance / TPA Sanctions
                    </span>
                    <span className="font-mono font-bold">
                      ₹{summary.payment_mode_breakdown.insurance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="py-2 border-t font-bold flex justify-between items-center text-primary">
                    <span>Total Net Day Collections</span>
                    <span className="font-mono text-sm">
                      ₹{summary.financial_totals.total_collections.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Department Encounter Breakdown */}
              <div className="border rounded-xl p-3 bg-card space-y-2">
                <div className="font-bold text-xs text-foreground flex items-center justify-between">
                  <span>Encounter Department Revenue</span>
                  <Badge variant="outline" className="text-[10px]">By Service</Badge>
                </div>
                <div className="divide-y text-xs">
                  {summary.department_breakdown.length === 0 ? (
                    <div className="py-6 text-center text-muted-foreground text-xs">
                      No invoices settled for this date yet.
                    </div>
                  ) : (
                    summary.department_breakdown.map((dept) => (
                      <div key={dept.encounter_type} className="py-2 flex justify-between items-center">
                        <div>
                          <Badge variant="secondary" className="uppercase text-[9px] font-mono mr-2">
                            {dept.encounter_type}
                          </Badge>
                          <span className="text-muted-foreground">({dept.count} invoices)</span>
                        </div>
                        <span className="font-mono font-bold">
                          ₹{dept.amount_paid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))
                  )}
                  <div className="py-2 border-t font-bold flex justify-between items-center text-foreground">
                    <span>Outstanding Due from Day Invoices</span>
                    <span className="font-mono text-amber-600 dark:text-amber-400">
                      ₹{summary.financial_totals.balance_outstanding.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Staff / Cashier Wise Collections Table */}
            {summary.cashier_breakdown.length > 0 && (
              <div className="border rounded-xl p-3 bg-card space-y-2">
                <div className="font-bold text-xs text-foreground flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span>Cashier Counter Staff Performance</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted text-muted-foreground uppercase text-[10px]">
                      <tr>
                        <th className="p-2 rounded-l">Cashier Name</th>
                        <th className="p-2 text-center">Invoices Handled</th>
                        <th className="p-2 text-right">Net Billed (₹)</th>
                        <th className="p-2 text-right rounded-r">Amount Collected (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {summary.cashier_breakdown.map((c) => (
                        <tr key={c.user_id} className="hover:bg-muted/40">
                          <td className="p-2 font-semibold text-foreground">{c.user_name}</td>
                          <td className="p-2 text-center font-mono">{c.invoices}</td>
                          <td className="p-2 text-right font-mono">₹{c.net_billed.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                          <td className="p-2 text-right font-mono font-bold text-emerald-600">
                            ₹{c.amount_paid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Printable Handover Footer */}
            <div className="p-4 bg-muted/30 border border-dashed rounded-xl flex justify-between items-end text-xs">
              <div>
                <div className="font-semibold text-foreground">Cashier Handover Signature:</div>
                <div className="border-b border-foreground/30 w-44 mt-6"></div>
                <div className="text-[10px] text-muted-foreground mt-1">Shift In-Charge Signature</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-foreground">Finance / Audit Verification:</div>
                <div className="border-b border-foreground/30 w-44 mt-6"></div>
                <div className="text-[10px] text-muted-foreground mt-1">Hospital Accounts Manager</div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </FormContainer>
  )
}
