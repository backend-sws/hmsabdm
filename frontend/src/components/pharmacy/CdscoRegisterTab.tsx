import React, { useState, useRef } from "react"
import {
  ShieldAlert,
  Printer,
  Search,
  Calendar,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  RefreshCw,
  FileText,
} from "lucide-react"
import { useCdscoRegister } from "@/hooks/usePharmacy"
import type { CdscoRegisterEntry } from "@/types/pharmacy"

export const CdscoRegisterTab: React.FC = () => {
  // Filters State
  const [scheduleType, setScheduleType] = useState<"ALL" | "SCHEDULE_H1" | "SCHEDULE_H" | "NARCOTIC">("ALL")
  const [dateFilter, setDateFilter] = useState<"TODAY" | "7DAYS" | "THIS_MONTH" | "CUSTOM">("THIS_MONTH")
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0]
  })
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split("T")[0])
  const [searchQuery, setSearchQuery] = useState("")

  // Quick Date Filter Change
  const handleQuickDate = (mode: "TODAY" | "7DAYS" | "THIS_MONTH" | "CUSTOM") => {
    setDateFilter(mode)
    const today = new Date().toISOString().split("T")[0]
    if (mode === "TODAY") {
      setStartDate(today)
      setEndDate(today)
    } else if (mode === "7DAYS") {
      const d = new Date()
      d.setDate(d.getDate() - 7)
      setStartDate(d.toISOString().split("T")[0])
      setEndDate(today)
    } else if (mode === "THIS_MONTH") {
      const d = new Date()
      setStartDate(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0])
      setEndDate(today)
    }
  }

  // Fetch CDSCO Register Query
  const { data: registerData, isLoading, refetch } = useCdscoRegister({
    schedule_type: scheduleType === "ALL" ? undefined : scheduleType,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
    search: searchQuery.trim() || undefined,
    all: true, // Fetch complete record set for printing/export
  })

  const records: CdscoRegisterEntry[] = registerData?.records || []
  const summary = registerData?.summary || {
    total_dispensed: 0,
    schedule_h1: 0,
    schedule_h: 0,
    narcotics: 0,
  }

  // Print Register Handler
  const printContainerRef = useRef<HTMLDivElement>(null)
  const handlePrint = () => {
    window.print()
  }

  // Export to CSV Handler
  const handleExportCsv = () => {
    if (!records || records.length === 0) return

    const headers = [
      "Sl No",
      "Date & Time",
      "Invoice No",
      "Patient Name",
      "Patient UHID",
      "Patient Mobile",
      "Patient Address",
      "Prescribing Doctor",
      "Doctor Reg No",
      "Drug Brand Name",
      "Generic Composition",
      "Dosage Form & Strength",
      "Drug Schedule",
      "Batch Number",
      "Expiry Date",
      "Manufacturer",
      "Quantity Dispensed",
      "Dispensing Pharmacist",
    ]

    const csvRows = [headers.join(",")]

    records.forEach((row, idx) => {
      const escapeCsv = (val: any) => `"${String(val || "").replace(/"/g, '""')}"`
      csvRows.push([
        idx + 1,
        escapeCsv(`${row.dispensed_date} ${row.dispensed_time}`),
        escapeCsv(row.invoice_number),
        escapeCsv(row.patient_name),
        escapeCsv(row.patient_uhid || "Walk-In"),
        escapeCsv(row.patient_phone || "-"),
        escapeCsv(row.patient_address),
        escapeCsv(row.doctor_name),
        escapeCsv(row.doctor_reg_no || "-"),
        escapeCsv(row.brand_name),
        escapeCsv(row.generic_name || "-"),
        escapeCsv(`${row.dosage_form} ${row.strength || ""}`.trim()),
        escapeCsv(row.prescription_type),
        escapeCsv(row.batch_number),
        escapeCsv(row.expiry_date),
        escapeCsv(row.manufacturer),
        row.quantity,
        escapeCsv(row.dispensed_by),
      ].join(","))
    })

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `CDSCO_Schedule_Register_${startDate}_to_${endDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* 1. CDSCO Statutory Compliance Banner (Hidden in Print) */}
      <div className="print:hidden rounded-2xl border border-amber-300 bg-linear-to-r from-amber-50 via-orange-50/50 to-amber-50/20 p-5 shadow-xs dark:border-amber-900/60 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-transparent">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-amber-950 dark:text-amber-200">
                  CDSCO Drugs & Cosmetics Act Statutory Register
                </h2>
                <span className="rounded-full bg-amber-200/80 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-900 dark:bg-amber-900/60 dark:text-amber-300">
                  Form 35 / Rule 65 & 97
                </span>
              </div>
              <p className="mt-1 text-xs text-amber-900/80 dark:text-amber-300/80 max-w-3xl leading-relaxed">
                Mandatory official dispensing register for <strong className="font-bold text-amber-950 dark:text-amber-100">Schedule H, H1, and Narcotic (NDPS)</strong> substances.
                Indian Drugs and Cosmetics Rules require this audit trail to be preserved for a minimum of <strong className="font-bold text-amber-950 dark:text-amber-100">3 years</strong> for routine inspection by State Drug Inspectors.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={records.length === 0}
              className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-50 dark:border-border dark:bg-card dark:text-slate-200 dark:hover:bg-slate-800 transition-all active:scale-95"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={records.length === 0}
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-slate-800 disabled:opacity-50 dark:bg-primary dark:text-slate-900 dark:hover:bg-primary/90 transition-all active:scale-95"
            >
              <Printer className="h-4 w-4" />
              <span>Print A4 Register</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. KPI Summary Cards (Hidden in Print) */}
      <div className="print:hidden grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Total Controlled Drugs */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-xs dark:border-border dark:bg-card">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
            <span>Total Controlled Items</span>
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {summary.total_dispensed}
          </div>
          <span className="mt-1 block text-[11px] text-slate-400">
            Recorded dispensations in range
          </span>
        </div>

        {/* Schedule H1 Count */}
        <div className="rounded-2xl border border-rose-200 bg-rose-50/30 p-4.5 shadow-xs dark:border-rose-950 dark:bg-rose-950/20">
          <div className="flex items-center justify-between text-xs font-bold text-rose-700 dark:text-rose-400">
            <span>Schedule H1 Register</span>
            <span className="rounded bg-rose-200/80 px-1.5 py-0.5 text-[10px] font-black text-rose-800 dark:bg-rose-900 dark:text-rose-200">
              High Priority
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-rose-900 dark:text-rose-200">
            {summary.schedule_h1}
          </div>
          <span className="mt-1 block text-[11px] text-rose-600/80 dark:text-rose-400/80">
            3rd Gen Antibiotics & Habit forming
          </span>
        </div>

        {/* Schedule H Count */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/30 p-4.5 shadow-xs dark:border-amber-950 dark:bg-amber-950/20">
          <div className="flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-400">
            <span>Schedule H Register</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-900 dark:text-amber-200">
            {summary.schedule_h}
          </div>
          <span className="mt-1 block text-[11px] text-amber-600/80 dark:text-amber-400/80">
            Prescription Only Dispensing
          </span>
        </div>

        {/* Narcotic / NDPS Count */}
        <div className="rounded-2xl border border-purple-200 bg-purple-50/30 p-4.5 shadow-xs dark:border-purple-950 dark:bg-purple-950/20">
          <div className="flex items-center justify-between text-xs font-bold text-purple-700 dark:text-purple-400">
            <span>Narcotic (NDPS)</span>
            <span className="rounded bg-purple-200/80 px-1.5 py-0.5 text-[10px] font-black text-purple-800 dark:bg-purple-900 dark:text-purple-200">
              Strict Double Lock
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-purple-900 dark:text-purple-200">
            {summary.narcotics}
          </div>
          <span className="mt-1 block text-[11px] text-purple-600/80 dark:text-purple-400/80">
            Opioids & Sedatives log
          </span>
        </div>
      </div>

      {/* 3. Filter Controls Toolbar (Hidden in Print) */}
      <div className="print:hidden space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-border dark:bg-card">
        {/* Schedule Type Selection Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-border">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-2 text-xs font-bold text-slate-500 flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" /> Category:
            </span>
            <button
              type="button"
              onClick={() => setScheduleType("ALL")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                scheduleType === "ALL"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              All Controlled ({summary.total_dispensed})
            </button>
            <button
              type="button"
              onClick={() => setScheduleType("SCHEDULE_H1")}
              className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                scheduleType === "SCHEDULE_H1"
                  ? "bg-rose-600 text-white"
                  : "bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300"
              }`}
            >
              <span>Schedule H1</span>
              <span className="rounded-full bg-white/20 px-1.5 text-[10px]">{summary.schedule_h1}</span>
            </button>
            <button
              type="button"
              onClick={() => setScheduleType("SCHEDULE_H")}
              className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                scheduleType === "SCHEDULE_H"
                  ? "bg-amber-600 text-white"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300"
              }`}
            >
              <span>Schedule H</span>
              <span className="rounded-full bg-white/20 px-1.5 text-[10px]">{summary.schedule_h}</span>
            </button>
            <button
              type="button"
              onClick={() => setScheduleType("NARCOTIC")}
              className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                scheduleType === "NARCOTIC"
                  ? "bg-purple-600 text-white"
                  : "bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300"
              }`}
            >
              <span>Narcotic (NDPS)</span>
              <span className="rounded-full bg-white/20 px-1.5 text-[10px]">{summary.narcotics}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Date Ranges & Live Search */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-center">
          {/* Quick Date Buttons */}
          <div className="sm:col-span-5 flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> Date:
            </span>
            <button
              type="button"
              onClick={() => handleQuickDate("TODAY")}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                dateFilter === "TODAY"
                  ? "bg-primary text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handleQuickDate("7DAYS")}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                dateFilter === "7DAYS"
                  ? "bg-primary text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => handleQuickDate("THIS_MONTH")}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                dateFilter === "THIS_MONTH"
                  ? "bg-primary text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => setDateFilter("CUSTOM")}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                dateFilter === "CUSTOM"
                  ? "bg-primary text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              Custom
            </button>
          </div>

          {/* Custom Date Pickers */}
          {dateFilter === "CUSTOM" && (
            <div className="sm:col-span-3 flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none dark:border-border dark:bg-card dark:text-white"
              />
              <span className="text-xs text-slate-400 font-bold">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none dark:border-border dark:bg-card dark:text-white"
              />
            </div>
          )}

          {/* Search Box */}
          <div className={dateFilter === "CUSTOM" ? "sm:col-span-4" : "sm:col-span-7"}>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient UHID, doctor name, reg no, brand, salt, batch, invoice..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none dark:border-border dark:bg-card dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. PRINTABLE STATUTORY A4 AUDIT REGISTER CONTAINER */}
      <div ref={printContainerRef} className="print:block rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-border dark:bg-card overflow-hidden">
        {/* Printable Official Header (Only shown during print or at top of official view) */}
        <div className="hidden print:block border-b-2 border-slate-900 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight text-slate-950">
                Hospital Central Pharmacy & Regulatory Store
              </h1>
              <p className="text-xs font-bold text-slate-700">
                Form 35 / Rule 65 & 97 — Drugs & Cosmetics Rules, 1945 (India)
              </p>
              <p className="mt-0.5 text-[11px] text-slate-600 font-mono">
                STATUTORY REGISTER OF SCHEDULE H / H1 / NARCOTIC (NDPS) DRUGS
              </p>
            </div>
            <div className="text-right text-[11px] text-slate-700">
              <p className="font-bold">Period: {startDate} to {endDate}</p>
              <p>Schedule Class: {scheduleType}</p>
              <p className="font-mono text-[10px]">Printed: {new Date().toLocaleString("en-IN")}</p>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-600 dark:border-border dark:bg-slate-900/60 dark:text-slate-300 print:bg-slate-100 print:text-black">
                <th className="py-3 px-3 w-12 text-center">#</th>
                <th className="py-3 px-3 whitespace-nowrap">Date & Time</th>
                <th className="py-3 px-3 min-w-[180px]">Patient / Purchaser</th>
                <th className="py-3 px-3 min-w-[170px]">Prescribing Doctor</th>
                <th className="py-3 px-3 min-w-[200px]">Medicine & Formulation</th>
                <th className="py-3 px-3 whitespace-nowrap">Schedule</th>
                <th className="py-3 px-3 whitespace-nowrap">Batch & Exp</th>
                <th className="py-3 px-3 min-w-[120px]">Manufacturer</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Qty</th>
                <th className="py-3 px-3 whitespace-nowrap">Invoice No.</th>
                <th className="py-3 px-3 min-w-[120px] text-center">Pharmacist Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-border print:divide-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                      <span className="font-semibold text-xs">Compiling CDSCO Statutory Register...</span>
                    </div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                      <ShieldAlert className="h-8 w-8 text-amber-500/60" />
                      <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
                        No Schedule H / H1 / Narcotic Dispensing Records Found
                      </p>
                      <p className="text-xs text-slate-500 max-w-md">
                        Controlled medicines dispensed via POS billing counter with Doctor Name will automatically be audited and listed here.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                records.map((row, idx) => {
                  const isH1 = row.prescription_type === "SCHEDULE_H1"
                  const isNarcotic = row.prescription_type === "NARCOTIC"

                  return (
                    <tr
                      key={`${row.id}-${idx}`}
                      className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 print:hover:bg-transparent"
                    >
                      {/* 1. Sl No */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-500">
                        {idx + 1}
                      </td>

                      {/* 2. Date & Time */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-extrabold text-slate-900 dark:text-white">
                          {row.dispensed_date}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400">
                          {row.dispensed_time}
                        </div>
                      </td>

                      {/* 3. Patient Details */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-slate-900 dark:text-white">
                            {row.patient_name}
                          </span>
                          {row.patient_uhid && (
                            <span className="rounded bg-indigo-50 px-1.5 py-0.2 font-mono text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 print:border print:border-slate-300">
                              {row.patient_uhid}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1 print:line-clamp-none">
                          📍 {row.patient_address}
                        </div>
                        {row.patient_phone && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            Ph: {row.patient_phone}
                          </div>
                        )}
                      </td>

                      {/* 4. Prescribing Doctor */}
                      <td className="py-3 px-3">
                        <div className="font-extrabold text-slate-900 dark:text-white">
                          {row.doctor_name}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <span className="font-bold text-slate-500">Reg No:</span>
                          <span className={`font-mono font-bold ${row.doctor_reg_no !== 'N/A' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400'}`}>
                            {row.doctor_reg_no}
                          </span>
                        </div>
                        {row.doctor_qualification && (
                          <div className="text-[10px] text-slate-400">
                            {row.doctor_qualification}
                          </div>
                        )}
                      </td>

                      {/* 5. Medicine Name & Salt */}
                      <td className="py-3 px-3">
                        <div className="font-black text-slate-900 dark:text-white">
                          {row.brand_name}
                        </div>
                        {row.generic_name && (
                          <div className="text-[11px] text-slate-500 line-clamp-1 italic print:line-clamp-none">
                            {row.generic_name}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 font-medium">
                          {row.dosage_form} {row.strength ? `• ${row.strength}` : ""}
                        </div>
                      </td>

                      {/* 6. Schedule Badge */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-black ${
                            isH1
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 print:border print:border-rose-400"
                              : isNarcotic
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 print:border print:border-purple-400"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 print:border print:border-amber-400"
                          }`}
                        >
                          {row.prescription_type.replace("_", " ")}
                        </span>
                      </td>

                      {/* 7. Batch & Expiry */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-mono font-black text-slate-900 dark:text-white">
                          {row.batch_number}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          Exp: {row.expiry_date}
                        </div>
                      </td>

                      {/* 8. Manufacturer */}
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300 text-[11px] truncate max-w-[140px] print:max-w-none">
                        {row.manufacturer}
                      </td>

                      {/* 9. Quantity */}
                      <td className="py-3 px-3 text-center">
                        <span className="inline-block rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-xs font-black text-slate-900 dark:bg-slate-800 dark:text-white print:border print:border-slate-300">
                          {row.quantity}
                        </span>
                      </td>

                      {/* 10. Invoice No. */}
                      <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                        {row.invoice_number}
                      </td>

                      {/* 11. Dispensing Pharmacist / Signature */}
                      <td className="py-3 px-3 text-center">
                        <div className="text-[11px] font-bold text-slate-900 dark:text-white">
                          {row.dispensed_by}
                        </div>
                        <div className="mt-0.5 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 print:hidden">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Digitally Signed</span>
                        </div>
                        {/* Print-only signature placeholder */}
                        <div className="hidden print:block mt-3 border-t border-dotted border-slate-400 pt-1 text-[9px] text-slate-500">
                          Sign & Stamp
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Printable Official Sign-Off Footer */}
        <div className="hidden print:block border-t-2 border-slate-900 p-8 mt-6">
          <div className="grid grid-cols-3 gap-8 text-center text-xs">
            <div>
              <div className="h-12 border-b border-dashed border-slate-400"></div>
              <p className="mt-2 font-bold uppercase text-slate-900">Registered Pharmacist</p>
              <p className="text-[10px] text-slate-500">Reg No: __________________</p>
            </div>
            <div>
              <div className="h-12 border-b border-dashed border-slate-400"></div>
              <p className="mt-2 font-bold uppercase text-slate-900">Hospital Medical Superintendent</p>
              <p className="text-[10px] text-slate-500">Official Hospital Seal</p>
            </div>
            <div>
              <div className="h-12 border-b border-dashed border-slate-400"></div>
              <p className="mt-2 font-bold uppercase text-slate-900">Drug Inspector / FDA Auditor</p>
              <p className="text-[10px] text-slate-500">Inspection Date: ____/____/2026</p>
            </div>
          </div>
        </div>

        {/* Total Count Footer (Screen only) */}
        {!isLoading && records.length > 0 && (
          <div className="print:hidden border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500 dark:border-border dark:bg-slate-900/40 flex items-center justify-between">
            <span>
              Showing <strong className="font-bold text-slate-900 dark:text-white">{records.length}</strong> statutory dispensing log entries
            </span>
            <span className="font-mono text-[11px] text-slate-400">
              Audit trail maintained as per CDSCO Rule 65/97
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
