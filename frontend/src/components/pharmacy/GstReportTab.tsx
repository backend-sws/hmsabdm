import React, { useState } from "react"
import {
  FileText,
  Printer,
  Download,
  Calendar,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
} from "lucide-react"
import { useGstReport } from "@/hooks/usePharmacy"
import type { GstReportResponse } from "@/types/pharmacy"

export const GstReportTab: React.FC = () => {
  // Period filter state
  const [periodMode, setPeriodMode] = useState<"THIS_MONTH" | "LAST_MONTH" | "THIS_QUARTER" | "FY" | "CUSTOM">("THIS_MONTH")
  
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0]
  })
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split("T")[0])

  // Active view tab inside GST report
  const [activeView, setActiveView] = useState<"summary" | "outward" | "inward">("summary")
  const [searchOutward, setSearchOutward] = useState("")
  const [searchInward, setSearchInward] = useState("")

  // Quick period change
  const handleQuickPeriod = (mode: "THIS_MONTH" | "LAST_MONTH" | "THIS_QUARTER" | "FY" | "CUSTOM") => {
    setPeriodMode(mode)
    const now = new Date()
    const today = now.toISOString().split("T")[0]

    if (mode === "THIS_MONTH") {
      setStartDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0])
      setEndDate(today)
    } else if (mode === "LAST_MONTH") {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0]
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0]
      setStartDate(firstDayLastMonth)
      setEndDate(lastDayLastMonth)
    } else if (mode === "THIS_QUARTER") {
      const currentQuarterMonth = Math.floor(now.getMonth() / 3) * 3
      const firstDayQuarter = new Date(now.getFullYear(), currentQuarterMonth, 1).toISOString().split("T")[0]
      setStartDate(firstDayQuarter)
      setEndDate(today)
    } else if (mode === "FY") {
      // Indian Financial Year: April 1 to March 31
      const currentYear = now.getFullYear()
      const fyStartYear = now.getMonth() >= 3 ? currentYear : currentYear - 1
      const fyStartDate = `${fyStartYear}-04-01`
      setStartDate(fyStartDate)
      setEndDate(today)
    }
  }

  // Fetch report query
  const { data: reportData, isLoading, isFetching, refetch } = useGstReport({
    start_date: startDate,
    end_date: endDate,
  })

  const report: GstReportResponse | undefined = reportData
  const summary = report?.summary
  const slabBreakdown = report?.slab_breakdown || []
  const outwardInvoices = report?.outward_invoices || []
  const inwardPurchases = report?.inward_purchases || []

  // Filtered registers
  const filteredOutward = outwardInvoices.filter((inv) => {
    if (!searchOutward.trim()) return true
    const q = searchOutward.toLowerCase()
    return (
      inv.invoice_number.toLowerCase().includes(q) ||
      inv.customer_name.toLowerCase().includes(q) ||
      inv.payment_mode.toLowerCase().includes(q)
    )
  })

  const filteredInward = inwardPurchases.filter((pur) => {
    if (!searchInward.trim()) return true
    const q = searchInward.toLowerCase()
    return (
      pur.grn_number.toLowerCase().includes(q) ||
      pur.supplier_invoice_no.toLowerCase().includes(q) ||
      pur.supplier_name.toLowerCase().includes(q) ||
      pur.supplier_gstin.toLowerCase().includes(q)
    )
  })

  // Print Report
  const handlePrint = () => {
    window.print()
  }

  // CSV Export
  const handleExportCsv = () => {
    if (!report) return

    let csv = `INDIAN PHARMACY GST AUDIT & FILING REPORT (GSTR-3B)\n`
    csv += `Period: ${report.period.start_date} to ${report.period.end_date}\n`
    csv += `Generated On: ${new Date().toLocaleString()}\n\n`

    // Summary Section
    csv += `--- SECTION 1: GSTR-3B CONSOLIDATED TAX SUMMARY ---\n`
    csv += `Category,Metric,Amount (INR)\n`
    csv += `Outward Supplies (POS Sales),Total Sales Count,${summary?.sales_count || 0}\n`
    csv += `Outward Supplies (POS Sales),Gross Sales Total,${summary?.sales_gross_total?.toFixed(2) || "0.00"}\n`
    csv += `Outward Supplies (POS Sales),Taxable Amount,${summary?.sales_taxable?.toFixed(2) || "0.00"}\n`
    csv += `Outward Supplies (POS Sales),Sales CGST,${summary?.sales_cgst?.toFixed(2) || "0.00"}\n`
    csv += `Outward Supplies (POS Sales),Sales SGST,${summary?.sales_sgst?.toFixed(2) || "0.00"}\n`
    csv += `Outward Supplies (POS Sales),Gross Output Tax,${summary?.sales_output_tax?.toFixed(2) || "0.00"}\n`
    csv += `Sales Returns (Credit Notes),Credit Notes Count,${summary?.cust_returns_count || 0}\n`
    csv += `Sales Returns (Credit Notes),Tax Reversed,${summary?.cust_return_reversal?.toFixed(2) || "0.00"}\n`
    csv += `Net Outward Liability,Net Taxable,${summary?.net_outward_taxable?.toFixed(2) || "0.00"}\n`
    csv += `Net Outward Liability,Net Output CGST,${summary?.net_output_cgst?.toFixed(2) || "0.00"}\n`
    csv += `Net Outward Liability,Net Output SGST,${summary?.net_output_sgst?.toFixed(2) || "0.00"}\n`
    csv += `Net Outward Liability,Total Net Output Tax,${summary?.net_output_tax?.toFixed(2) || "0.00"}\n\n`

    csv += `Inward Supplies (GRN Purchases),Total Purchases Count,${summary?.purchases_count || 0}\n`
    csv += `Inward Supplies (GRN Purchases),Gross Inward Total,${summary?.purchases_gross?.toFixed(2) || "0.00"}\n`
    csv += `Inward Supplies (GRN Purchases),Taxable Amount,${summary?.purchases_taxable?.toFixed(2) || "0.00"}\n`
    csv += `Inward Supplies (GRN Purchases),Purchase CGST,${summary?.purchases_cgst?.toFixed(2) || "0.00"}\n`
    csv += `Inward Supplies (GRN Purchases),Purchase SGST,${summary?.purchases_sgst?.toFixed(2) || "0.00"}\n`
    csv += `Inward Supplies (GRN Purchases),Purchase IGST,${summary?.purchases_igst?.toFixed(2) || "0.00"}\n`
    csv += `Inward Supplies (GRN Purchases),Gross Input Tax Credit (ITC),${summary?.purchases_itc?.toFixed(2) || "0.00"}\n`
    csv += `Supplier Returns (RTV Debit Notes),RTV Count,${summary?.supplier_returns_count || 0}\n`
    csv += `Supplier Returns (RTV Debit Notes),ITC Reversal,${summary?.supplier_returns_reversal?.toFixed(2) || "0.00"}\n`
    csv += `Net Inward Tax Credit,Net Eligible ITC,${summary?.net_itc_available?.toFixed(2) || "0.00"}\n\n`

    csv += `Net GST Settlement,Net Tax Payable in Cash,${summary?.net_gst_payable?.toFixed(2) || "0.00"}\n`
    csv += `Net GST Settlement,ITC Carried Forward (Surplus),${summary?.itc_carried_forward?.toFixed(2) || "0.00"}\n\n`

    // Slab breakdown
    csv += `--- SECTION 2: SLAB-WISE BREAKDOWN ---\n`
    csv += `GST Rate,Outward Taxable,Outward Tax,Inward Taxable,Inward ITC,Net Tax (Output - Input)\n`
    slabBreakdown.forEach((s) => {
      csv += `${s.slab_label},${s.outward_taxable.toFixed(2)},${s.outward_tax.toFixed(2)},${s.inward_taxable.toFixed(2)},${s.inward_itc.toFixed(2)},${s.net_tax.toFixed(2)}\n`
    })
    csv += `\n`

    // Outward Register
    csv += `--- SECTION 3: OUTWARD SALES REGISTER ---\n`
    csv += `Invoice No,Date,Customer Name,Payment Mode,Taxable Amount,CGST,SGST,Total Tax,Net Invoice Total\n`
    outwardInvoices.forEach((inv) => {
      csv += `"${inv.invoice_number}","${inv.invoice_date}","${inv.customer_name}","${inv.payment_mode}",${inv.taxable_amount.toFixed(2)},${inv.cgst_amount.toFixed(2)},${inv.sgst_amount.toFixed(2)},${inv.total_tax.toFixed(2)},${inv.net_amount.toFixed(2)}\n`
    })
    csv += `\n`

    // Inward Register
    csv += `--- SECTION 4: INWARD GRN PURCHASE REGISTER (ITC) ---\n`
    csv += `GRN No,Supplier Invoice No,Date,Supplier Name,Supplier GSTIN,Taxable Amount,CGST,SGST,IGST,Total ITC,Net Purchase Amount\n`
    inwardPurchases.forEach((pur) => {
      csv += `"${pur.grn_number}","${pur.supplier_invoice_no}","${pur.invoice_date}","${pur.supplier_name}","${pur.supplier_gstin}",${pur.taxable_amount.toFixed(2)},${pur.cgst_amount.toFixed(2)},${pur.sgst_amount.toFixed(2)},${pur.igst_amount.toFixed(2)},${pur.total_itc.toFixed(2)},${pur.net_amount.toFixed(2)}\n`
    })

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `GST_Report_${startDate}_to_${endDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Print-Only Official Header */}
      <div className="hidden print:block mb-6 border-b pb-4 text-center">
        <h1 className="text-2xl font-black uppercase tracking-wider text-slate-900">
          Hospital Pharmacy - Statutory GST Tax Ledger & Audit Report
        </h1>
        <p className="text-sm font-semibold text-slate-600">
          Indian Goods & Services Tax (GST) Act • GSTR-3B Reconciliation Statement
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Filing Period: <span className="font-bold">{startDate}</span> to{" "}
          <span className="font-bold">{endDate}</span> • Generated on:{" "}
          {new Date().toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      {/* Screen Header & Filter Controls */}
      <div className="print:hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                <FileText className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  GST Tax Intelligence & Filing Register
                  <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    GSTR-3B Compliant
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Real-time Input Tax Credit (ITC) vs Output Tax Liability Settlement, Slab Distribution & Audit Trail
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-95 disabled:opacity-50 dark:border-border dark:bg-slate-800 dark:text-slate-200"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={!report}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-95 disabled:opacity-50 dark:border-border dark:bg-slate-800 dark:text-slate-200"
            >
              <Download className="h-3.5 w-3.5 text-blue-600" />
              Export CSV
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={!report}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-primary/90 active:scale-95 disabled:opacity-50"
            >
              <Printer className="h-3.5 w-3.5" />
              Print GSTR Audit Report
            </button>
          </div>
        </div>

        {/* Date Filter Bar */}
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 dark:border-border">
          <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => handleQuickPeriod("THIS_MONTH")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                periodMode === "THIS_MONTH"
                  ? "bg-white text-primary shadow-xs dark:bg-slate-700 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => handleQuickPeriod("LAST_MONTH")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                periodMode === "LAST_MONTH"
                  ? "bg-white text-primary shadow-xs dark:bg-slate-700 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
              }`}
            >
              Last Month
            </button>
            <button
              type="button"
              onClick={() => handleQuickPeriod("THIS_QUARTER")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                periodMode === "THIS_QUARTER"
                  ? "bg-white text-primary shadow-xs dark:bg-slate-700 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
              }`}
            >
              This Quarter
            </button>
            <button
              type="button"
              onClick={() => handleQuickPeriod("FY")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                periodMode === "FY"
                  ? "bg-white text-primary shadow-xs dark:bg-slate-700 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
              }`}
            >
              FY 2026-27
            </button>
            <button
              type="button"
              onClick={() => setPeriodMode("CUSTOM")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                periodMode === "CUSTOM"
                  ? "bg-white text-primary shadow-xs dark:bg-slate-700 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
              }`}
            >
              Custom Range
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs dark:border-border dark:bg-card">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[11px] font-semibold text-slate-500">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  setPeriodMode("CUSTOM")
                }}
                className="bg-transparent font-bold text-slate-800 outline-none dark:text-slate-200"
              />
            </div>

            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs dark:border-border dark:bg-card">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[11px] font-semibold text-slate-500">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  setPeriodMode("CUSTOM")
                }}
                className="bg-transparent font-bold text-slate-800 outline-none dark:text-slate-200"
              />
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-border dark:bg-card">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-300">
            Calculating GST Output Liability & Input Tax Credit...
          </p>
        </div>
      ) : !summary ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          No GST records found for the selected period.
        </div>
      ) : (
        <>
          {/* Top KPI Cards: Net Settlement & Flow */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: Net GST Settlement */}
            <div
              className={`rounded-2xl border p-5 shadow-xs transition-all ${
                summary.net_gst_payable > 0
                  ? "border-rose-200 bg-gradient-to-br from-rose-50 to-white dark:border-rose-900/40 dark:from-rose-950/20 dark:to-card"
                  : "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white dark:border-emerald-900/40 dark:from-emerald-950/20 dark:to-card"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Net GST Settlement (GSTR-3B)
                </span>
                {summary.net_gst_payable > 0 ? (
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-900/60 dark:text-rose-300">
                    <AlertCircle className="h-4 w-4" />
                  </span>
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                )}
              </div>

              <div className="mt-3">
                {summary.net_gst_payable > 0 ? (
                  <>
                    <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                      ₹{summary.net_gst_payable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-300">
                      <span>Cash Ledger Tax Payable</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Output tax exceeds available Input Tax Credit.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      ₹{summary.itc_carried_forward.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      <span>ITC Carried Forward</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Surplus Input Tax Credit available for future periods.
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Card 2: Outward Output Tax Liability */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-border dark:bg-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Net Output Tax Liability
                </span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
                  <TrendingUp className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  ₹{summary.net_output_tax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  From <span className="font-bold text-slate-700 dark:text-slate-300">{summary.sales_count}</span> POS
                  Invoices (Taxable: ₹{summary.net_outward_taxable.toFixed(2)})
                </div>
                <div className="mt-2 flex items-center gap-2 border-t border-slate-100 pt-2 text-[11px] font-semibold text-slate-500 dark:border-border">
                  <span>CGST: ₹{summary.net_output_cgst.toFixed(2)}</span>
                  <span>•</span>
                  <span>SGST: ₹{summary.net_output_sgst.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Card 3: Inward Input Tax Credit (ITC) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-border dark:bg-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Net Input Tax Credit (ITC)
                </span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
                  <TrendingDown className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  ₹{summary.net_itc_available.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  From <span className="font-bold text-slate-700 dark:text-slate-300">{summary.purchases_count}</span> GRN
                  Purchases (Taxable: ₹{summary.purchases_taxable.toFixed(2)})
                </div>
                <div className="mt-2 flex items-center gap-2 border-t border-slate-100 pt-2 text-[11px] font-semibold text-slate-500 dark:border-border">
                  <span>CGST: ₹{summary.purchases_cgst.toFixed(2)}</span>
                  <span>•</span>
                  <span>SGST: ₹{summary.purchases_sgst.toFixed(2)}</span>
                  <span>•</span>
                  <span>IGST: ₹{summary.purchases_igst.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Card 4: ITC Efficiency & Reversals */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-border dark:bg-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  ITC Coverage & Returns
                </span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                  <ShieldCheck className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {summary.net_output_tax > 0
                    ? `${Math.min(100, Math.round((summary.net_itc_available / summary.net_output_tax) * 100))}%`
                    : "100%"}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Tax Liability Offset by ITC
                </div>
                <div className="mt-2 flex flex-col gap-0.5 border-t border-slate-100 pt-2 text-[11px] text-slate-500 dark:border-border">
                  <div>Cust Return Reversal: <span className="font-bold text-slate-700 dark:text-slate-300">₹{summary.cust_return_reversal.toFixed(2)}</span></div>
                  <div>RTV ITC Reversal: <span className="font-bold text-slate-700 dark:text-slate-300">₹{summary.supplier_returns_reversal.toFixed(2)}</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Navigation Tabs for Views */}
          <div className="print:hidden border-b border-slate-200 dark:border-border">
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setActiveView("summary")}
                className={`flex items-center gap-2 border-b-2 py-3 text-sm font-bold transition-all ${
                  activeView === "summary"
                    ? "border-primary text-primary"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white"
                }`}
              >
                <span>GSTR-3B Computation & Slab Breakdown</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveView("outward")}
                className={`flex items-center gap-2 border-b-2 py-3 text-sm font-bold transition-all ${
                  activeView === "outward"
                    ? "border-primary text-primary"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white"
                }`}
              >
                <span>Outward Sales Tax Register (GSTR-1)</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {outwardInvoices.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveView("inward")}
                className={`flex items-center gap-2 border-b-2 py-3 text-sm font-bold transition-all ${
                  activeView === "inward"
                    ? "border-primary text-primary"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white"
                }`}
              >
                <span>Inward Purchases & ITC Register (GSTR-2B)</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {inwardPurchases.length}
                </span>
              </button>
            </div>
          </div>

          {/* VIEW 1: GSTR-3B STATUTORY COMPUTATION & SLABS */}
          {(activeView === "summary" || typeof window !== "undefined") && (
            <div className={`space-y-6 ${activeView !== "summary" ? "hidden print:block" : ""}`}>
              {/* Section 1 Table: Statutory GSTR-3B Flow */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
                <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 dark:bg-slate-900/60 dark:border-border flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    Table 3 & Table 4: GSTR-3B Statutory Computation Matrix
                  </h3>
                  <span className="text-[11px] font-semibold text-slate-500">
                    Values in Indian Rupees (₹)
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/70 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300 border-b border-slate-200 dark:border-border font-bold">
                      <tr>
                        <th className="py-3 px-4">GSTR-3B Section / Nature of Supply</th>
                        <th className="py-3 px-4 text-right">Taxable Value (₹)</th>
                        <th className="py-3 px-4 text-right">CGST (₹)</th>
                        <th className="py-3 px-4 text-right">SGST (₹)</th>
                        <th className="py-3 px-4 text-right">IGST (₹)</th>
                        <th className="py-3 px-4 text-right">Total Tax Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-border text-slate-800 dark:text-slate-200">
                      {/* 3.1 Outward Taxable */}
                      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-semibold">
                          <span className="font-bold text-blue-600 mr-2">3.1(a)</span>
                          Outward Taxable Supplies (POS Sales Invoices)
                        </td>
                        <td className="py-3 px-4 text-right font-medium">{summary.sales_taxable.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-medium">{summary.sales_cgst.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-medium">{summary.sales_sgst.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right text-slate-400">0.00</td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                          {summary.sales_output_tax.toFixed(2)}
                        </td>
                      </tr>

                      {/* Less Customer Returns */}
                      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30 text-rose-600 dark:text-rose-400">
                        <td className="py-3 px-4 font-semibold">
                          <span className="font-bold mr-2">(-)</span>
                          Customer Returns & Credit Notes Reversals
                        </td>
                        <td className="py-3 px-4 text-right font-medium">-{summary.cust_return_taxable.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-medium">
                          -{(summary.cust_return_reversal / 2).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-medium">
                          -{(summary.cust_return_reversal / 2).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-400">0.00</td>
                        <td className="py-3 px-4 text-right font-bold">
                          -{summary.cust_return_reversal.toFixed(2)}
                        </td>
                      </tr>

                      {/* Net Outward Liability */}
                      <tr className="bg-blue-50/50 dark:bg-blue-950/20 font-bold border-t border-b border-blue-100 dark:border-blue-900/40">
                        <td className="py-3 px-4 text-blue-900 dark:text-blue-200">
                          Net Outward Tax Liability (Payable Before ITC)
                        </td>
                        <td className="py-3 px-4 text-right">{summary.net_outward_taxable.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right">{summary.net_output_cgst.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right">{summary.net_output_sgst.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right">0.00</td>
                        <td className="py-3 px-4 text-right text-blue-700 dark:text-blue-300">
                          {summary.net_output_tax.toFixed(2)}
                        </td>
                      </tr>

                      {/* 4. Eligible ITC from Purchases */}
                      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-semibold">
                          <span className="font-bold text-emerald-600 mr-2">4(A)(5)</span>
                          All Other ITC - Inward Supplies (GRN Vendor Purchases)
                        </td>
                        <td className="py-3 px-4 text-right font-medium">{summary.purchases_taxable.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-medium">{summary.purchases_cgst.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-medium">{summary.purchases_sgst.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-medium">{summary.purchases_igst.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {summary.purchases_itc.toFixed(2)}
                        </td>
                      </tr>

                      {/* Less Supplier Returns */}
                      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30 text-amber-600 dark:text-amber-400">
                        <td className="py-3 px-4 font-semibold">
                          <span className="font-bold mr-2">4(B)(2)</span>
                          ITC Reversal - Supplier Returns (RTV Debit Notes)
                        </td>
                        <td className="py-3 px-4 text-right text-slate-400">-</td>
                        <td className="py-3 px-4 text-right font-medium">
                          -{(summary.supplier_returns_reversal / 2).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-medium">
                          -{(summary.supplier_returns_reversal / 2).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-400">0.00</td>
                        <td className="py-3 px-4 text-right font-bold">
                          -{summary.supplier_returns_reversal.toFixed(2)}
                        </td>
                      </tr>

                      {/* Net Eligible ITC */}
                      <tr className="bg-emerald-50/50 dark:bg-emerald-950/20 font-bold border-t border-b border-emerald-100 dark:border-emerald-900/40">
                        <td className="py-3 px-4 text-emerald-900 dark:text-emerald-200">
                          Net Eligible Input Tax Credit (ITC Available)
                        </td>
                        <td className="py-3 px-4 text-right">{summary.purchases_taxable.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right">
                          {(summary.purchases_cgst - summary.supplier_returns_reversal / 2).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {(summary.purchases_sgst - summary.supplier_returns_reversal / 2).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right">{summary.purchases_igst.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right text-emerald-700 dark:text-emerald-300">
                          {summary.net_itc_available.toFixed(2)}
                        </td>
                      </tr>

                      {/* Table 5: Final Cash Settlement */}
                      <tr className="bg-slate-100 dark:bg-slate-800 font-black text-sm">
                        <td className="py-4 px-4">
                          <span className="font-black text-primary mr-2">Table 5</span>
                          NET TAX PAYABLE IN CASH / (SURPLUS ITC TO CARRY FORWARD)
                        </td>
                        <td className="py-4 px-4 text-right text-slate-400">-</td>
                        <td className="py-4 px-4 text-right text-slate-400">-</td>
                        <td className="py-4 px-4 text-right text-slate-400">-</td>
                        <td className="py-4 px-4 text-right text-slate-400">-</td>
                        <td className="py-4 px-4 text-right">
                          {summary.net_gst_payable > 0 ? (
                            <span className="text-rose-600 dark:text-rose-400">
                              ₹{summary.net_gst_payable.toFixed(2)} (Payable)
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              ₹{summary.itc_carried_forward.toFixed(2)} (Surplus ITC)
                            </span>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 2: GST Slab-Wise Distribution Breakdown */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
                <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 dark:bg-slate-900/60 dark:border-border flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-indigo-600" />
                    GST Rate Slab Breakdown (0%, 5%, 12%, 18%, 28%)
                  </h3>
                  <span className="text-[11px] font-semibold text-slate-500">
                    Outward Sales vs Inward ITC Comparison
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/70 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300 border-b border-slate-200 dark:border-border font-bold">
                      <tr>
                        <th className="py-3 px-4">GST Slab Rate</th>
                        <th className="py-3 px-4 text-right">Sales Taxable (₹)</th>
                        <th className="py-3 px-4 text-right">Output Tax (₹)</th>
                        <th className="py-3 px-4 text-right">Purchase Taxable (₹)</th>
                        <th className="py-3 px-4 text-right">Input ITC (₹)</th>
                        <th className="py-3 px-4 text-right">Net Tax Gap (₹)</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-border text-slate-800 dark:text-slate-200">
                      {slabBreakdown.map((slab) => {
                        const isPayable = slab.net_tax > 0
                        return (
                          <tr key={slab.gst_rate} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                            <td className="py-3 px-4 font-bold flex items-center gap-2">
                              <span className="inline-block w-12 rounded-md bg-slate-100 py-1 text-center font-black dark:bg-slate-800">
                                {slab.gst_rate}%
                              </span>
                              <span className="text-slate-500 font-normal">
                                {slab.gst_rate === 0
                                  ? "Life-Saving / Exempt Formulations"
                                  : slab.gst_rate === 5
                                  ? "Vaccines, Insulin & Essential Drugs"
                                  : slab.gst_rate === 12
                                  ? "Standard Pharmaceutical Formulations"
                                  : slab.gst_rate === 18
                                  ? "Diagnostics, Disposables & Syringes"
                                  : "Cosmeceuticals & High-End Devices"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-medium">{slab.outward_taxable.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right font-bold text-blue-600 dark:text-blue-400">
                              {slab.outward_tax.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right font-medium">{slab.inward_taxable.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                              {slab.inward_itc.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right font-black">
                              {slab.net_tax >= 0 ? (
                                <span className="text-rose-600 dark:text-rose-400">
                                  +₹{slab.net_tax.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-emerald-600 dark:text-emerald-400">
                                  -₹{Math.abs(slab.net_tax).toFixed(2)}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {slab.outward_tax === 0 && slab.inward_itc === 0 ? (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                                  No Activity
                                </span>
                              ) : isPayable ? (
                                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                                  Liability
                                </span>
                              ) : (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                  Surplus ITC
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: OUTWARD SALES TAX REGISTER (GSTR-1) */}
          {activeView === "outward" && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchOutward}
                    onChange={(e) => setSearchOutward(e.target.value)}
                    placeholder="Search by invoice number, customer name, payment mode..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-primary dark:border-border dark:bg-card"
                  />
                </div>
                <div className="text-xs font-semibold text-slate-500">
                  Showing <span className="font-bold text-slate-800 dark:text-slate-200">{filteredOutward.length}</span> outward invoices
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/70 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300 border-b border-slate-200 dark:border-border font-bold">
                      <tr>
                        <th className="py-3 px-4">Invoice No</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Customer Name</th>
                        <th className="py-3 px-4">Pay Mode</th>
                        <th className="py-3 px-4 text-right">Taxable Value (₹)</th>
                        <th className="py-3 px-4 text-right">CGST (₹)</th>
                        <th className="py-3 px-4 text-right">SGST (₹)</th>
                        <th className="py-3 px-4 text-right">Total Tax (₹)</th>
                        <th className="py-3 px-4 text-right">Net Bill Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-border text-slate-800 dark:text-slate-200">
                      {filteredOutward.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-400">
                            No outward invoices match your search.
                          </td>
                        </tr>
                      ) : (
                        filteredOutward.map((inv) => (
                          <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                            <td className="py-3 px-4 font-mono font-bold text-primary">{inv.invoice_number}</td>
                            <td className="py-3 px-4 font-medium text-slate-600 dark:text-slate-400">
                              {inv.invoice_date}
                            </td>
                            <td className="py-3 px-4 font-semibold">{inv.customer_name}</td>
                            <td className="py-3 px-4">
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                {inv.payment_mode}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-medium">{inv.taxable_amount.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right font-medium">{inv.cgst_amount.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right font-medium">{inv.sgst_amount.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right font-bold text-blue-600 dark:text-blue-400">
                              {inv.total_tax.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-white">
                              ₹{inv.net_amount.toFixed(2)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 3: INWARD PURCHASES & ITC REGISTER (GSTR-2B) */}
          {activeView === "inward" && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchInward}
                    onChange={(e) => setSearchInward(e.target.value)}
                    placeholder="Search by GRN number, vendor invoice, supplier, GSTIN..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-primary dark:border-border dark:bg-card"
                  />
                </div>
                <div className="text-xs font-semibold text-slate-500">
                  Showing <span className="font-bold text-slate-800 dark:text-slate-200">{filteredInward.length}</span> inward GRN purchases
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/70 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300 border-b border-slate-200 dark:border-border font-bold">
                      <tr>
                        <th className="py-3 px-4">GRN No</th>
                        <th className="py-3 px-4">Vendor Bill No</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Supplier Name</th>
                        <th className="py-3 px-4">Supplier GSTIN</th>
                        <th className="py-3 px-4 text-right">Taxable (₹)</th>
                        <th className="py-3 px-4 text-right">CGST (₹)</th>
                        <th className="py-3 px-4 text-right">SGST (₹)</th>
                        <th className="py-3 px-4 text-right">IGST (₹)</th>
                        <th className="py-3 px-4 text-right">Total ITC (₹)</th>
                        <th className="py-3 px-4 text-right">Net Bill (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-border text-slate-800 dark:text-slate-200">
                      {filteredInward.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="py-8 text-center text-slate-400">
                            No inward purchases match your search.
                          </td>
                        </tr>
                      ) : (
                        filteredInward.map((pur) => (
                          <tr key={pur.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                            <td className="py-3 px-4 font-mono font-bold text-primary">{pur.grn_number}</td>
                            <td className="py-3 px-4 font-mono font-medium text-slate-600 dark:text-slate-400">
                              {pur.supplier_invoice_no}
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-600 dark:text-slate-400">
                              {pur.invoice_date}
                            </td>
                            <td className="py-3 px-4 font-semibold">{pur.supplier_name}</td>
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                              {pur.supplier_gstin}
                            </td>
                            <td className="py-3 px-4 text-right font-medium">{pur.taxable_amount.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right font-medium">{pur.cgst_amount.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right font-medium">{pur.sgst_amount.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right font-medium">{pur.igst_amount.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                              {pur.total_itc.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-white">
                              ₹{pur.net_amount.toFixed(2)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Print Sign-Off Block */}
          <div className="hidden print:grid grid-cols-2 gap-8 pt-16 text-center text-xs text-slate-700">
            <div className="border-t border-slate-400 pt-2">
              <div className="font-bold">Prepared & Verified By:</div>
              <div className="text-[11px] text-slate-500">Chief Pharmacist / Accounts Executive</div>
            </div>
            <div className="border-t border-slate-400 pt-2">
              <div className="font-bold">Authorized Signatory:</div>
              <div className="text-[11px] text-slate-500">Hospital Superintendent / Financial Officer</div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
