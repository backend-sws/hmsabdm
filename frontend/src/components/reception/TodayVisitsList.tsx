import React, { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Ticket,
  Search,
  RefreshCw,
  Printer,
  Clock,
  CheckCircle2,
  Stethoscope,
  IndianRupee,
  Filter,
  ShieldCheck,
  Building2,
  PlusCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { receptionService } from "@/services/receptionService"
import { queryKeys } from "@/constants/queryKeys"
import { PatientAvatar } from "@/components/common"
import type { OpdVisitItem } from "@/types/reception"
import type { OpdReceiptData } from "@/components/reception/ReceiptCard"

interface TodayVisitsListProps {
  onReprintSlip: (receipt: OpdReceiptData) => void
  onRegisterNewPatient?: () => void
}

const visitToReceiptData = (visit: OpdVisitItem): OpdReceiptData => {
  let slotTime: string | null = null
  if (visit.notes) {
    const match = visit.notes.match(/Appointment Slot:\s*([^|]+)/i)
    if (match) {
      slotTime = match[1].trim()
    } else if (visit.notes.toLowerCase().includes("slot")) {
      slotTime = visit.notes
    }
  }

  let age: string | number | undefined = visit.patient.age
  if (!age && visit.patient.dob) {
    const birthYear = new Date(visit.patient.dob).getFullYear()
    const currentYear = new Date().getFullYear()
    if (!isNaN(birthYear) && birthYear > 1900) {
      age = `${currentYear - birthYear} Y`
    }
  }

  return {
    queue_token: visit.queue_token,
    opd_number: visit.opd_number || `OPD-${visit.id}`,
    uhid: visit.patient.uhid,
    patient_name: visit.patient.name,
    gender: visit.patient.gender,
    age,
    mobile: visit.patient.mobile,
    abha_number: visit.patient.abha_number,
    abha_address: visit.patient.abha_address,
    department_name: visit.department?.name || "General OPD",
    doctor_name: visit.doctor?.name,
    doctor_specialization: visit.doctor?.specialization,
    visit_date: visit.visit_date || visit.created_at,
    fee_charged: visit.fee_charged,
    discount: visit.discount,
    amount_paid: visit.amount_paid,
    payment_method: visit.payment_method,
    payment_status: visit.payment_status,
    chief_complaint: visit.chief_complaint,
    slot_time: slotTime,
  }
}

export const TodayVisitsList: React.FC<TodayVisitsListProps> = ({
  onReprintSlip,
  onRegisterNewPatient,
}) => {
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], [])
  const [selectedDate, setSelectedDate] = useState<string>(todayStr)
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [selectedDoctor, setSelectedDoctor] = useState<string>("all")

  // ─── Queries ────────────────────────────────────────────────────────
  const {
    data: visitsResponse,
    isLoading: visitsLoading,
    isFetching: visitsFetching,
    dataUpdatedAt,
    refetch: refetchVisits,
  } = useQuery({
    queryKey: queryKeys.reception.visits({
      date: selectedDate,
      doctor_id: selectedDoctor !== "all" ? selectedDoctor : undefined,
      status: selectedStatus !== "all" ? selectedStatus : undefined,
      search: searchTerm.trim() || undefined,
    }),
    queryFn: () =>
      receptionService.getVisits({
        date: selectedDate,
        doctor_id: selectedDoctor !== "all" ? selectedDoctor : undefined,
        status: selectedStatus !== "all" ? selectedStatus : undefined,
        search: searchTerm.trim() || undefined,
        all: true,
      }),
    refetchInterval: 15_000,
  })

  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: queryKeys.reception.visitStats(selectedDate),
    queryFn: () => receptionService.getVisitStats(selectedDate),
    refetchInterval: 15_000,
  })

  const { data: departments = [] } = useQuery({
    queryKey: queryKeys.reception.departments,
    queryFn: receptionService.getDepartments,
    staleTime: 5 * 60_000,
  })

  // Extract doctors list for filter dropdown
  const allDoctors = useMemo(() => {
    const docs: { id: number; name: string; specialization?: string }[] = []
    const seen = new Set<number>()
    departments.forEach((dept) => {
      ;(dept.doctors || []).forEach((doc) => {
        if (!seen.has(doc.id)) {
          seen.add(doc.id)
          docs.push({ id: doc.id, name: doc.name, specialization: doc.specialization })
        }
      })
    })
    return docs
  }, [departments])

  const visits: OpdVisitItem[] = Array.isArray(visitsResponse)
    ? visitsResponse
    : (visitsResponse as any)?.data || []

  // Client-side quick filter fallback
  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      if (selectedStatus !== "all") {
        if (selectedStatus === "in_consultation") {
          if (v.status !== "called" && v.status !== "in_consultation") return false
        } else if (v.status !== selectedStatus) {
          return false
        }
      }
      if (selectedDoctor !== "all" && String(v.doctor?.id) !== selectedDoctor) {
        return false
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim()
        const matchToken = String(v.queue_token).includes(q)
        const matchOpd = v.opd_number?.toLowerCase().includes(q)
        const matchName = v.patient?.name?.toLowerCase().includes(q)
        const matchUhid = v.patient?.uhid?.toLowerCase().includes(q)
        const matchMobile = v.patient?.mobile?.includes(q)
        const matchAbha = v.patient?.abha_number?.includes(q) || v.patient?.abha_address?.toLowerCase().includes(q)
        if (!matchToken && !matchOpd && !matchName && !matchUhid && !matchMobile && !matchAbha) {
          return false
        }
      }
      return true
    })
  }, [visits, selectedStatus, selectedDoctor, searchTerm])

  const handleRefresh = () => {
    refetchVisits()
    refetchStats()
  }

  const lastUpdatedStr = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null

  // Format date for UI badge
  const isToday = selectedDate === todayStr

  return (
    <div className="space-y-6">
      {/* ─── Live Summary KPI Cards ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Tokens */}
        <Card className="border border-border/80 bg-card/60 shadow-xs backdrop-blur-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Tokens Issued</p>
              <h3 className="text-2xl font-bold tracking-tight text-foreground mt-1">
                {statsData?.total_issued ?? visits.length}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {isToday ? "Today's registry" : selectedDate}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Ticket className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Waiting */}
        <Card className="border border-amber-500/20 bg-amber-500/5 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Waiting</p>
              <h3 className="text-2xl font-bold tracking-tight text-amber-900 dark:text-amber-200 mt-1">
                {statsData?.waiting ?? visits.filter((v) => v.status === "waiting").length}
              </h3>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                In cabin queue
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* In Consultation */}
        <Card className="border border-blue-500/20 bg-blue-500/5 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-700 dark:text-blue-400">In Consultation</p>
              <h3 className="text-2xl font-bold tracking-tight text-blue-900 dark:text-blue-200 mt-1">
                {statsData?.in_consultation ??
                  visits.filter((v) => v.status === "called" || v.status === "in_consultation").length}
              </h3>
              <p className="text-[11px] text-blue-700/80 dark:text-blue-400/80 mt-0.5">
                With doctor now
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Stethoscope className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Completed */}
        <Card className="border border-emerald-500/20 bg-emerald-500/5 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Completed</p>
              <h3 className="text-2xl font-bold tracking-tight text-emerald-900 dark:text-emerald-200 mt-1">
                {statsData?.completed ?? visits.filter((v) => v.status === "done").length}
              </h3>
              <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                Consultation finished
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Fees Collected */}
        <Card className="border border-border/80 bg-card/60 shadow-xs backdrop-blur-xs col-span-2 sm:col-span-1">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Fee Collected</p>
              <h3 className="text-2xl font-bold tracking-tight text-foreground mt-1">
                ₹{Number(statsData?.total_fees ?? visits.reduce((acc, v) => acc + (v.amount_paid || 0), 0)).toLocaleString("en-IN")}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Registration revenue</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <IndianRupee className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Control Bar (Search, Filters, Date, Actions) ─────────────── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Token #, OPD Number, Patient Name, UHID, Mobile..."
              className="pl-9.5 pr-4 h-10 w-full rounded-xl bg-muted/30 focus:bg-background"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground font-medium"
              >
                Clear
              </button>
            )}
          </div>

          {/* Right Action Tools: Date selector & Refresh */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Date Switcher */}
            <div className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/30 p-1">
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  isToday
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Today
              </button>
              <div className="relative flex items-center">
                <input
                  type="date"
                  value={selectedDate === "all" ? "" : selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value || todayStr)}
                  className="rounded-lg bg-transparent px-2 py-1 text-xs font-medium text-foreground outline-hidden cursor-pointer"
                />
              </div>
              <button
                type="button"
                onClick={() => setSelectedDate("all")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  selectedDate === "all"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Dates
              </button>
            </div>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={visitsFetching}
              className="rounded-xl h-9 px-3 gap-1.5 text-xs"
              title="Refresh list"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${visitsFetching ? "animate-spin text-primary" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            {/* Register Walk-in Shortcut Button */}
            {onRegisterNewPatient && (
              <Button
                size="sm"
                onClick={onRegisterNewPatient}
                className="rounded-xl h-9 px-3 gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>New Token</span>
              </Button>
            )}
          </div>
        </div>

        {/* Secondary Filter Row: Status Pills & Doctor Filter */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60">
          {/* Status Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground font-medium mr-1 flex items-center gap-1">
              <Filter className="h-3 w-3" /> Status:
            </span>
            {[
              { id: "all", label: "All", count: visits.length },
              {
                id: "waiting",
                label: "Waiting",
                count: visits.filter((v) => v.status === "waiting").length,
              },
              {
                id: "in_consultation",
                label: "In Consultation",
                count: visits.filter((v) => v.status === "called" || v.status === "in_consultation").length,
              },
              {
                id: "done",
                label: "Completed",
                count: visits.filter((v) => v.status === "done").length,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedStatus(tab.id)}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                  selectedStatus === tab.id
                    ? "bg-foreground text-background font-semibold shadow-xs"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    selectedStatus === tab.id ? "bg-background/20 text-background" : "bg-muted-foreground/15 text-muted-foreground"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Doctor Filter Dropdown & Last Updated timestamp */}
          <div className="flex items-center gap-3">
            {allDoctors.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Doctor:</span>
                <select
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground focus:ring-1 focus:ring-primary outline-hidden"
                >
                  <option value="all">All Doctors</option>
                  {allDoctors.map((doc) => (
                    <option key={doc.id} value={String(doc.id)}>
                      {doc.name} {doc.specialization ? `(${doc.specialization})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {lastUpdatedStr && (
              <span className="text-[11px] text-muted-foreground font-mono hidden md:inline">
                Synced: {lastUpdatedStr}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ─── Visits Table / Card View ─────────────────────────────────── */}
      {visitsLoading ? (
        <div className="flex flex-col items-center justify-center p-12 rounded-2xl border border-border bg-card">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Loading issued OPD tokens...</p>
        </div>
      ) : filteredVisits.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 rounded-2xl border border-dashed border-border bg-card/40 text-center">
          <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground mb-3">
            <Ticket className="h-6 w-6" />
          </div>
          <h4 className="text-base font-semibold text-foreground">No Issued Tokens Found</h4>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">
            {searchTerm
              ? `No patient records match "${searchTerm}". Try a different search term or clear the filter.`
              : `No OPD registration tokens have been issued for ${isToday ? "today" : selectedDate} under the selected filters.`}
          </p>
          {onRegisterNewPatient && (
            <Button
              onClick={onRegisterNewPatient}
              className="mt-4 rounded-xl gap-2 text-xs font-semibold"
            >
              <PlusCircle className="h-4 w-4" />
              Register Patient & Issue Token
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground text-xs font-semibold">
                  <th className="py-3.5 px-4 w-20 text-center">Token #</th>
                  <th className="py-3.5 px-4">Patient Information</th>
                  <th className="py-3.5 px-4">Consulting Doctor & Dept</th>
                  <th className="py-3.5 px-4">Slot & Timing</th>
                  <th className="py-3.5 px-4">Payment & Fee</th>
                  <th className="py-3.5 px-4 text-center">Cabin Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredVisits.map((visit) => {
                  const receiptData = visitToReceiptData(visit)
                  const isWaiting = visit.status === "waiting"
                  const isConsulting = visit.status === "called" || visit.status === "in_consultation"
                  const isDone = visit.status === "done"
                  const isCancelled = visit.status === "cancelled"

                  const timeStr = visit.created_at
                    ? new Date(visit.created_at).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""

                  return (
                    <tr
                      key={visit.id}
                      className="hover:bg-muted/20 transition-colors group"
                    >
                      {/* Token Number */}
                      <td className="py-4 px-4 text-center align-middle">
                        <div className="inline-flex flex-col items-center justify-center">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-base font-extrabold text-primary shadow-xs">
                            #{visit.queue_token < 10 ? `0${visit.queue_token}` : visit.queue_token}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground mt-1">
                            {timeStr}
                          </span>
                        </div>
                      </td>

                      {/* Patient Information */}
                      <td className="py-4 px-4 align-middle">
                        <div className="flex items-center gap-3">
                          <PatientAvatar
                            photo={visit.patient?.photo}
                            name={visit.patient?.name}
                            uhid={visit.patient?.uhid}
                            size="sm"
                            shape="circle"
                            allowPreview={true}
                            kyc_verified={visit.patient?.kyc_verified}
                            subtitle={[visit.patient?.address, visit.patient?.city, visit.patient?.state].filter(Boolean).join(", ")}
                          />
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground text-sm truncate">
                                {visit.patient?.name || "Anonymous Patient"}
                              </span>
                              {visit.patient?.gender && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-muted-foreground/30 font-medium">
                                  {visit.patient.gender === "M" ? "Male" : visit.patient.gender === "F" ? "Female" : visit.patient.gender}
                                  {receiptData.age ? `, ${receiptData.age}` : ""}
                                </Badge>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                              {visit.patient?.uhid && (
                                <span className="font-mono bg-muted/60 px-1.5 py-0.5 rounded text-[11px] font-semibold text-foreground">
                                  {visit.patient.uhid}
                                </span>
                              )}
                              {visit.patient?.mobile && (
                                <span>• {visit.patient.mobile}</span>
                              )}
                            </div>

                            {/* ABHA Badge if linked */}
                            {(visit.patient?.abha_number || visit.patient?.abha_address) && (
                              <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                                <ShieldCheck className="h-3 w-3 shrink-0" />
                                <span className="truncate max-w-[200px]">
                                  {visit.patient.abha_address || visit.patient.abha_number}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Consulting Doctor & Department */}
                      <td className="py-4 px-4 align-middle">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                            <Stethoscope className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span>{visit.doctor?.name || "Doctor Unassigned"}</span>
                          </p>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Building2 className="h-3 w-3 shrink-0" />
                            <span>{visit.department?.name || "General OPD"}</span>
                            {visit.doctor?.specialization && (
                              <span className="text-[11px]">• {visit.doctor.specialization}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Slot & Timing */}
                      <td className="py-4 px-4 align-middle">
                        <div className="space-y-0.5">
                          {receiptData.slot_time ? (
                            <Badge
                              variant="outline"
                              className="border-primary/30 bg-primary/5 text-primary text-[11px] font-semibold flex items-center gap-1 w-fit"
                            >
                              <Clock className="h-3 w-3" />
                              {receiptData.slot_time}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Walk-in Queue</span>
                          )}
                          <p className="text-[11px] font-mono text-muted-foreground">
                            {visit.opd_number}
                          </p>
                        </div>
                      </td>

                      {/* Payment & Fee */}
                      <td className="py-4 px-4 align-middle">
                        <div className="space-y-1">
                          <p className="font-bold text-foreground text-sm">
                            ₹{Number(visit.fee_charged || visit.amount_paid || 0).toLocaleString("en-IN")}
                          </p>
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 uppercase font-semibold ${
                                visit.payment_status === "paid"
                                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : visit.payment_status === "partial"
                                  ? "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                  : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              }`}
                            >
                              {visit.payment_status || "PAID"}
                            </Badge>
                            {visit.payment_method && (
                              <span className="text-[10px] font-mono uppercase text-muted-foreground">
                                {visit.payment_method}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Cabin Status */}
                      <td className="py-4 px-4 text-center align-middle">
                        {isWaiting && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Waiting in Queue
                          </span>
                        )}
                        {isConsulting && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping" />
                            In Consultation
                          </span>
                        )}
                        {isDone && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                            Consultation Done
                          </span>
                        )}
                        {isCancelled && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:text-rose-300">
                            Cancelled
                          </span>
                        )}
                      </td>

                      {/* Action: Reprint Slip */}
                      <td className="py-4 px-4 text-right align-middle">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onReprintSlip(receiptData)}
                          className="rounded-xl h-8 px-2.5 text-xs font-semibold gap-1.5 border-border hover:border-primary hover:bg-primary/5 hover:text-primary transition-all"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          <span>Reprint Slip</span>
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer Summary */}
          <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border-t border-border text-xs text-muted-foreground">
            <span>
              Showing <strong>{filteredVisits.length}</strong> of <strong>{visits.length}</strong> issued tokens
            </span>
            <span>
              Auto-updating every 15s • Click <strong>Reprint Slip</strong> to print any token again
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
