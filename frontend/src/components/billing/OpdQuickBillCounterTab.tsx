import React, { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Search,
  RefreshCw,
  Receipt,
  CreditCard,
  Plus,
  Trash2,
  CheckCircle2,
  FlaskConical,
  Building2,
  ChevronRight,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { billingService } from "@/services/billingService"
import { OpdReceiptModal } from "./OpdReceiptModal"
import type {
  OpdPendingOrder,
  CreateOpdBillPayload,
  OpdReceiptData,
  ChargeItem,
} from "@/types/billing"

export const OpdQuickBillCounterTab: React.FC = () => {
  const queryClient = useQueryClient()

  // ─── Filter States ──────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().substring(0, 10))
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "billed">("all")
  const [selectedOrder, setSelectedOrder] = useState<OpdPendingOrder | null>(null)

  // ─── Workspace Bill Builder State ───────────────────────────────────
  const [billConsultationFee, setBillConsultationFee] = useState(true)
  const [consultationFeeAmount, setConsultationFeeAmount] = useState<number>(0)

  // Selected diagnostic investigations state: Record<test_id_or_index, { included: boolean, rate: number }>
  const [selectedTests, setSelectedTests] = useState<
    Array<{
      id?: number
      test_name: string
      test_code?: string
      category?: string
      rate: number
      included: boolean
      urgency?: string
    }>
  >([])

  // Extra ad-hoc charges (Tariff Master items added at counter)
  const [customItems, setCustomItems] = useState<
    Array<{
      item_name: string
      category?: string
      unit_price: number
      quantity: number
    }>
  >([])

  // Tariff Autocomplete Search for extra items
  const [tariffSearch, setTariffSearch] = useState("")
  const [isSearchingTariff, setIsSearchingTariff] = useState(false)
  const [tariffSuggestions, setTariffSuggestions] = useState<ChargeItem[]>([])

  // Discounts & Payment
  const [discountAmount, setDiscountAmount] = useState<number>(0)
  const [discountReason, setDiscountReason] = useState<string>("")
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "UPI" | "Card" | "Split">("Cash")
  const [splitCashAmount, setSplitCashAmount] = useState<number>(0)
  const [splitUpiAmount, setSplitUpiAmount] = useState<number>(0)

  // Receipt Modal State
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  const [issuedReceipt, setIssuedReceipt] = useState<OpdReceiptData | null>(null)

  // ─── Query: Today's Pending Orders ──────────────────────────────────
  const {
    data: pendingOrders = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["billing", "opd-pending-orders", { search: searchTerm, date: selectedDate, status: statusFilter }],
    queryFn: () =>
      billingService.getOpdPendingOrders({
        search: searchTerm || undefined,
        date: selectedDate || undefined,
        status: statusFilter,
      }),
    refetchInterval: 15_000, // Live poll every 15s
  })

  // When clicking an order in the queue, sync the bill builder workspace
  const handleSelectOrder = (order: OpdPendingOrder) => {
    setSelectedOrder(order)
    setBillConsultationFee(order.unpaid_consultation_fee > 0)
    setConsultationFeeAmount(order.unpaid_consultation_fee > 0 ? order.unpaid_consultation_fee : order.consultation_fee)

    // Map unbilled investigations
    const tests = order.unbilled_investigations.map((inv) => ({
      id: inv.id,
      test_name: inv.test_name,
      test_code: inv.test_code,
      category: inv.category || "Pathology",
      rate: Number(inv.standard_rate || 250), // fallback default standard test rate
      included: true,
      urgency: inv.urgency || "routine",
    }))
    setSelectedTests(tests)

    // Reset ad-hoc and discounts
    setCustomItems([])
    setDiscountAmount(0)
    setDiscountReason("")
    setPaymentMethod("Cash")
  }

  // ─── Financial Totals Calculation ───────────────────────────────────
  const grossSubtotal = useMemo(() => {
    let sum = 0
    if (billConsultationFee) {
      sum += Number(consultationFeeAmount || 0)
    }
    selectedTests.forEach((t) => {
      if (t.included) {
        sum += Number(t.rate || 0)
      }
    })
    customItems.forEach((c) => {
      sum += Number(c.unit_price || 0) * Number(c.quantity || 1)
    })
    return sum
  }, [billConsultationFee, consultationFeeAmount, selectedTests, customItems])

  const netPayable = useMemo(() => {
    const net = grossSubtotal - Number(discountAmount || 0)
    return Math.max(0, net)
  }, [grossSubtotal, discountAmount])

  // Sync split payment defaults when net payable changes
  React.useEffect(() => {
    if (paymentMethod === "Split") {
      const half = Math.floor(netPayable / 2)
      setSplitCashAmount(half)
      setSplitUpiAmount(netPayable - half)
    }
  }, [netPayable, paymentMethod])

  // ─── Tariff Search for Ad-Hoc Items ─────────────────────────────────
  const handleTariffSearch = async (query: string) => {
    setTariffSearch(query)
    if (query.trim().length < 2) {
      setTariffSuggestions([])
      setIsSearchingTariff(false)
      return
    }
    setIsSearchingTariff(true)
    try {
      const results = await billingService.getCharges({ search: query, all: true })
      setTariffSuggestions(results.slice(0, 8))
    } catch {
      setTariffSuggestions([])
    } finally {
      setIsSearchingTariff(false)
    }
  }

  const handleAddTariffItem = (charge: ChargeItem) => {
    setCustomItems((prev) => [
      ...prev,
      {
        item_name: charge.name,
        category: charge.category?.name || "hospital_services",
        unit_price: Number(charge.standard_rate),
        quantity: 1,
      },
    ])
    setTariffSearch("")
    setTariffSuggestions([])
  }

  // ─── Mutation: Create OPD Bill ──────────────────────────────────────
  const createBillMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrder) throw new Error("No patient selected")

      const billableInvestigations = selectedTests
        .filter((t) => t.included)
        .map((t) => ({
          id: t.id,
          test_name: t.test_name,
          test_code: t.test_code,
          category: t.category,
          rate: t.rate,
        }))

      if (!billConsultationFee && billableInvestigations.length === 0 && customItems.length === 0) {
        throw new Error("Please select at least one billable item.")
      }

      const breakdown =
        paymentMethod === "Split"
          ? [
              { method: "Cash", amount: splitCashAmount },
              { method: "UPI", amount: splitUpiAmount },
            ]
          : [{ method: paymentMethod, amount: netPayable }]

      const payload: CreateOpdBillPayload = {
        opd_visit_id: selectedOrder.visit_id,
        patient_id: selectedOrder.patient.id,
        bill_consultation_fee: billConsultationFee,
        consultation_fee_amount: billConsultationFee ? consultationFeeAmount : 0,
        investigations: billableInvestigations,
        custom_items: customItems,
        discount_amount: discountAmount > 0 ? discountAmount : 0,
        discount_reason: discountReason || undefined,
        tax_amount: 0,
        payment_method: paymentMethod,
        payment_breakdown: breakdown,
        notes: `OPD Quick Counter Settlement for Token TK-${selectedOrder.token_no}`,
      }

      return billingService.createOpdBill(payload)
    },
    onSuccess: (receiptData) => {
      toast.success(`Bill generated successfully! Invoice #${receiptData.invoice_number}`)
      setIssuedReceipt(receiptData)
      setReceiptModalOpen(true)
      queryClient.invalidateQueries({ queryKey: ["billing", "opd-pending-orders"] })
      queryClient.invalidateQueries({ queryKey: ["billing", "invoices"] })
      setSelectedOrder(null)
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to generate OPD bill")
    },
  })

  return (
    <div className="space-y-4">
      {/* ────────────────────────────────────────────────────────────────
          1. TOP FILTER BAR
         ──────────────────────────────────────────────────────────────── */}
      <div className="bg-card p-3 rounded-2xl border border-border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Search Token / UHID / Name */}
          <div className="relative flex-1 sm:w-72 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Token #, UHID, Patient..."
              className="pl-9 text-xs sm:text-sm h-9 bg-background"
            />
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs h-9 font-mono bg-background w-36"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedDate(new Date().toISOString().substring(0, 10))}
              className="h-9 text-xs px-3"
            >
              Today
            </Button>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center bg-muted/40 p-0.5 rounded-lg border border-border text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-md transition-all font-semibold ${
                statusFilter === "all" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Tokens
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("pending")}
              className={`px-3 py-1.5 rounded-md transition-all font-semibold ${
                statusFilter === "pending" ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Pending Bill
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("billed")}
              className={`px-3 py-1.5 rounded-md transition-all font-semibold ${
                statusFilter === "billed" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Settled
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="h-9 text-xs gap-1.5 px-3"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────
          2. TWO-PANEL INTERACTIVE WORKSPACE
         ──────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* ─── LEFT PANEL: TOKEN QUEUE LIST (5 COLS) ────────────────── */}
        <div className="lg:col-span-5 space-y-2.5">
          <div className="flex items-center justify-between px-1 text-xs">
            <span className="font-bold text-foreground flex items-center gap-1.5">
              <Receipt className="h-4 w-4 text-primary" />
              OPD Token Queue ({pendingOrders.length})
            </span>
            <span className="text-[11px] text-muted-foreground">Select token to issue bill</span>
          </div>

          <div className="space-y-2 max-h-[720px] overflow-y-auto pr-1">
            {isLoading ? (
              <div className="p-8 text-center bg-card rounded-2xl border text-muted-foreground text-xs">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                Loading OPD queue orders...
              </div>
            ) : pendingOrders.length === 0 ? (
              <div className="p-8 text-center bg-card rounded-2xl border text-muted-foreground text-xs space-y-1">
                <Receipt className="h-6 w-6 mx-auto text-muted-foreground/40 mb-1" />
                <p className="font-semibold text-foreground">No OPD orders found</p>
                <p className="text-[11px]">There are no pending doctor prescriptions or visits matching your filter.</p>
              </div>
            ) : (
              pendingOrders.map((order) => {
                const isSelected = selectedOrder?.visit_id === order.visit_id
                const hasTests = order.unbilled_investigations.length > 0

                return (
                  <Card
                    key={order.visit_id}
                    onClick={() => handleSelectOrder(order)}
                    className={`p-3 rounded-2xl cursor-pointer transition-all border ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/40 shadow-sm"
                        : "border-border hover:border-primary/40 bg-card hover:bg-muted/10 shadow-2xs"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      {/* Token Number & Patient Details */}
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div
                          className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 border font-mono ${
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted text-foreground border-border"
                          }`}
                        >
                          <span className="text-[9px] uppercase leading-none font-semibold">TK</span>
                          <span className="text-sm font-extrabold leading-none mt-0.5">{order.token_no}</span>
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-xs text-foreground truncate max-w-[150px]">
                              {order.patient.name}
                            </span>
                            <Badge variant="outline" className="text-[9px] font-mono py-0 px-1 border-muted-foreground/30">
                              {order.patient.uhid}
                            </Badge>
                          </div>

                          <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                            <span>
                              {order.patient.age ? `${order.patient.age}y` : ""} {order.patient.gender || ""}
                            </span>
                            <span>•</span>
                            <span className="truncate">Dr. {order.doctor.name || "Duty MO"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Financial Amount & Indicator */}
                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-xs text-foreground block">
                          ₹{Number(order.total_pending_amount).toFixed(0)}
                        </span>
                        <span
                          className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-md uppercase font-mono ${
                            order.has_pending_items
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                              : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                          }`}
                        >
                          {order.has_pending_items ? "Pending Bill" : "Settled"}
                        </span>
                      </div>
                    </div>

                    {/* Prescription Details Strip */}
                    <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {hasTests && (
                          <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 text-[9px] font-mono py-0 gap-1">
                            <FlaskConical className="h-2.5 w-2.5" /> {order.unbilled_investigations.length} Lab/Scan Orders
                          </Badge>
                        )}
                        {order.prescription?.disposition === "admit_ipd" && (
                          <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 text-[9px] py-0 font-bold">
                            Admit IPD
                          </Badge>
                        )}
                        {order.prescription?.disposition === "day_care" && (
                          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[9px] py-0 font-bold">
                            Day Care
                          </Badge>
                        )}
                      </div>

                      <ChevronRight className={`h-4 w-4 ${isSelected ? "text-primary" : "text-muted-foreground/50"}`} />
                    </div>
                  </Card>
                )
              })
            )}
          </div>
        </div>

        {/* ─── RIGHT PANEL: BILL WORKSPACE & PAYMENT (7 COLS) ───────── */}
        <div className="lg:col-span-7">
          {!selectedOrder ? (
            <Card className="p-12 text-center rounded-2xl border border-dashed border-border bg-card/60 text-muted-foreground space-y-3">
              <CreditCard className="h-10 w-10 text-muted-foreground/30 mx-auto" />
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-foreground">OPD Bill Calculation Workspace</h4>
                <p className="text-xs max-w-sm mx-auto">
                  Click any patient token on the left queue to automatically load their consultation fee and doctor advised
                  diagnostic tests.
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Selected Patient Banner */}
              <Card className="p-4 rounded-2xl border shadow-xs bg-card space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">{selectedOrder.patient.name}</span>
                      <Badge className="bg-primary/10 text-primary border-primary/20 font-mono text-[10px]">
                        TK-{selectedOrder.token_no}
                      </Badge>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {selectedOrder.patient.uhid}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground mt-0.5">
                      Consulting Doctor: <strong className="text-foreground">Dr. {selectedOrder.doctor.name}</strong>{" "}
                      ({selectedOrder.doctor.department || "General"})
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground block font-mono">OPD Number</span>
                    <span className="text-xs font-bold font-mono text-foreground">{selectedOrder.opd_number}</span>
                  </div>
                </div>

                {/* Admission / Day Care Warning Banner */}
                {selectedOrder.prescription?.disposition === "admit_ipd" && (
                  <div className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 shrink-0 text-rose-600" />
                      <div>
                        <strong>Doctor Advised Inpatient (IPD) Admission</strong>
                        {selectedOrder.prescription.recommended_ward && (
                          <span className="ml-1 text-[11px] font-mono">
                            [{selectedOrder.prescription.recommended_ward}]
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge className="bg-rose-600 text-white text-[9px] uppercase">
                      Priority: {selectedOrder.prescription.admit_priority || "Routine"}
                    </Badge>
                  </div>
                )}
              </Card>

              {/* 1. OPD Consultation Fee Card */}
              <Card className="p-4 rounded-2xl border shadow-xs bg-card space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="bill-consult-chk"
                      checked={billConsultationFee}
                      onChange={(e) => setBillConsultationFee(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                    />
                    <label htmlFor="bill-consult-chk" className="text-xs font-bold text-foreground cursor-pointer">
                      OPD Doctor Consultation Fee
                    </label>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-muted-foreground">Fee (₹):</span>
                    <Input
                      type="number"
                      disabled={!billConsultationFee}
                      value={consultationFeeAmount}
                      onChange={(e) => setConsultationFeeAmount(parseFloat(e.target.value) || 0)}
                      className="w-24 h-7 text-xs font-mono font-bold text-right"
                    />
                  </div>
                </div>
                {selectedOrder.consultation_amount_paid > 0 && (
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 pl-6">
                    ✓ Advance of ₹{selectedOrder.consultation_amount_paid} was already received at reception.
                  </p>
                )}
              </Card>

              {/* 2. Prescribed Diagnostic Investigations Table */}
              <Card className="p-4 rounded-2xl border shadow-xs bg-card space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold text-foreground">
                      Doctor Advised Investigations ({selectedTests.length})
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">Check tests to include in bill</span>
                </div>

                {selectedTests.length === 0 ? (
                  <div className="py-4 text-center text-xs text-muted-foreground italic">
                    No diagnostic investigations ordered for this prescription.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/40 text-[10px] uppercase font-bold text-muted-foreground">
                        <tr>
                          <th className="p-2 w-8 text-center">Inc</th>
                          <th className="p-2">Test Name</th>
                          <th className="p-2 w-28">Category</th>
                          <th className="p-2 w-20 text-center">Urgency</th>
                          <th className="p-2 w-28 text-right">Standard Rate (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {selectedTests.map((t, idx) => (
                          <tr key={idx} className={t.included ? "" : "opacity-40"}>
                            <td className="p-2 text-center">
                              <input
                                type="checkbox"
                                checked={t.included}
                                onChange={(e) =>
                                  setSelectedTests((prev) =>
                                    prev.map((item, i) => (i === idx ? { ...item, included: e.target.checked } : item))
                                  )
                                }
                                className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                              />
                            </td>
                            <td className="p-2 font-semibold text-foreground">{t.test_name}</td>
                            <td className="p-2">
                              <Badge variant="outline" className="text-[9px] font-mono">
                                {t.category}
                              </Badge>
                            </td>
                            <td className="p-2 text-center">
                              <span
                                className={`text-[9px] uppercase font-bold font-mono px-1 rounded ${
                                  t.urgency && t.urgency.toLowerCase() === "stat"
                                    ? "bg-rose-500/15 text-rose-700"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {t.urgency || "Routine"}
                              </span>
                            </td>
                            <td className="p-2 text-right">
                              <Input
                                type="number"
                                value={t.rate}
                                onChange={(e) =>
                                  setSelectedTests((prev) =>
                                    prev.map((item, i) =>
                                      i === idx ? { ...item, rate: parseFloat(e.target.value) || 0 } : item
                                    )
                                  )
                                }
                                className="w-24 h-7 text-xs font-mono font-bold text-right ml-auto"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              {/* 3. Extra Hospital Services / Consumables Search */}
              <Card className="p-4 rounded-2xl border shadow-xs bg-card space-y-3">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Plus className="h-3.5 w-3.5 text-primary" /> Add Extra Counter Charges (Injection / Dressing / ECG)
                  </span>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={tariffSearch}
                    onChange={(e) => handleTariffSearch(e.target.value)}
                    placeholder="Search tariff master (e.g. ECG, Injection, Nebulization)..."
                    className="pl-8 pr-8 text-xs h-8 bg-background"
                  />
                  {isSearchingTariff && (
                    <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground animate-spin" />
                  )}

                  {/* Autocomplete Dropdown */}
                  {tariffSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-xl shadow-xl p-1 max-h-48 overflow-y-auto">
                      {tariffSuggestions.map((charge) => (
                        <div
                          key={charge.id}
                          onClick={() => handleAddTariffItem(charge)}
                          className="p-2 text-xs hover:bg-muted/50 rounded-lg cursor-pointer flex items-center justify-between"
                        >
                          <div>
                            <span className="font-semibold text-foreground">{charge.name}</span>
                            <span className="text-[10px] text-muted-foreground block font-mono">
                              {charge.category?.display_name || charge.category?.name}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-primary">₹{charge.standard_rate}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {customItems.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {customItems.map((c, cIdx) => (
                      <div
                        key={cIdx}
                        className="p-2 rounded-lg border border-border/80 bg-muted/20 flex items-center justify-between text-xs"
                      >
                        <span className="font-semibold text-foreground">{c.item_name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-muted-foreground">
                            ₹{c.unit_price} × {c.quantity} =
                          </span>
                          <span className="font-mono font-bold text-foreground">
                            ₹{(c.unit_price * c.quantity).toFixed(2)}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setCustomItems((prev) => prev.filter((_, i) => i !== cIdx))}
                            className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* 4. Payment Settlement & Collect Button */}
              <Card className="p-5 rounded-2xl border shadow-md bg-card space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Settlement & Payment Method
                  </span>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    Net: ₹{netPayable.toFixed(2)}
                  </Badge>
                </div>

                {/* Subtotal & Discount Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Special Discount (₹)</Label>
                    <Input
                      type="number"
                      value={discountAmount || ""}
                      onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="text-xs font-mono mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] text-muted-foreground">Discount Reason (Optional)</Label>
                    <Input
                      value={discountReason}
                      onChange={(e) => setDiscountReason(e.target.value)}
                      placeholder="e.g. Doctor recommendation, staff relative..."
                      className="text-xs mt-1"
                    />
                  </div>
                </div>

                {/* Payment Mode Selector */}
                <div>
                  <Label className="text-[11px] text-muted-foreground mb-1.5 block">Select Payment Mode</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {(["Cash", "UPI", "Card", "Split"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPaymentMethod(mode)}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                          paymentMethod === mode
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-muted/30 text-muted-foreground border-border hover:bg-muted"
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Split Payment Inputs */}
                {paymentMethod === "Split" && (
                  <div className="p-3 rounded-xl border border-primary/30 bg-primary/5 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <Label className="text-[10px] text-muted-foreground uppercase font-bold">Cash Portion (₹)</Label>
                      <Input
                        type="number"
                        value={splitCashAmount}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0
                          setSplitCashAmount(val)
                          setSplitUpiAmount(Math.max(0, netPayable - val))
                        }}
                        className="text-xs font-mono font-bold mt-1 bg-background"
                      />
                    </div>

                    <div>
                      <Label className="text-[10px] text-muted-foreground uppercase font-bold">UPI / Card Portion (₹)</Label>
                      <Input
                        type="number"
                        value={splitUpiAmount}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0
                          setSplitUpiAmount(val)
                          setSplitCashAmount(Math.max(0, netPayable - val))
                        }}
                        className="text-xs font-mono font-bold mt-1 bg-background"
                      />
                    </div>
                  </div>
                )}

                {/* Net Total & Collect Button */}
                <div className="pt-3 border-t border-border flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-semibold">
                      Total Collectible
                    </span>
                    <span className="text-2xl font-black font-mono text-primary">₹{netPayable.toFixed(2)}</span>
                  </div>

                  <Button
                    type="button"
                    size="lg"
                    disabled={createBillMutation.isPending || netPayable <= 0}
                    onClick={() => createBillMutation.mutate()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-6 h-11 rounded-xl shadow-lg gap-2"
                  >
                    {createBillMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" /> Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-5 w-5" /> Collect & Print Bill Receipt
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────
          3. OFFICIAL PRINTABLE RECEIPT MODAL
         ──────────────────────────────────────────────────────────────── */}
      <OpdReceiptModal
        open={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        receipt={issuedReceipt}
      />
    </div>
  )
}
