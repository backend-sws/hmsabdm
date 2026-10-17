import React, { useState, useEffect, useMemo } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import {
  Search,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Sparkles,
  Loader2,
  ShieldCheck,
} from "lucide-react"
import { toast } from "sonner"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { PatientAvatar } from "@/components/common/PatientAvatar"
import { LinkAbhaModal } from "@/components/common/LinkAbhaModal"
import { receptionService } from "@/services/receptionService"
import { patientService } from "@/services/patientService"
import { settingsService } from "@/services/settingsService"
import { generateDoctorSlots } from "@/utils/slotGenerator"
import { DoctorQueueLoadCard } from "@/components/reception/DoctorQueueLoadCard"
import { SlotPicker } from "@/components/reception/SlotPicker"
import type { ReceptionDepartment } from "@/types/reception"

interface RevisitFlowProps {
  departments: ReceptionDepartment[]
  initialUhid?: string | null
  onSuccess: (receipt: any) => void
}

export const RevisitFlow: React.FC<RevisitFlowProps> = ({
  departments,
  initialUhid,
  onSuccess,
}) => {
  const [searchTerm, setSearchTerm] = useState(initialUhid || "")
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null)
  const [selectedDeptId, setSelectedDeptId] = useState<string>("")
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("")
  const [chiefComplaint, setChiefComplaint] = useState("Routine Follow-up")
  const [feeCharged, setFeeCharged] = useState<number>(0)
  const [paymentStatus, setPaymentStatus] = useState<string>("waived")
  const [paymentMethod, setPaymentMethod] = useState<string>("cash")
  const [slotTime, setSlotTime] = useState<string>("")
  const [upiUtr, setUpiUtr] = useState<string>("")
  const [splitCashAmount, setSplitCashAmount] = useState<number>(0)
  const [splitUpiAmount, setSplitUpiAmount] = useState<number>(0)
  const [splitUpiUtr, setSplitUpiUtr] = useState<string>("")

  // Auto-sync split amounts when fee changes or split is selected
  useEffect(() => {
    if (paymentMethod === "split") {
      const half = Math.floor(feeCharged / 2)
      setSplitCashAmount(half)
      setSplitUpiAmount(feeCharged - half)
    }
  }, [paymentMethod, feeCharged])

  const handleCashChange = (val: number) => {
    const cash = Math.max(0, val)
    setSplitCashAmount(cash)
    setSplitUpiAmount(Math.max(0, feeCharged - cash))
  }

  const handleUpiChange = (val: number) => {
    const upi = Math.max(0, val)
    setSplitUpiAmount(upi)
    setSplitCashAmount(Math.max(0, feeCharged - upi))
  }
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isLinkAbhaOpen, setIsLinkAbhaOpen] = useState(false)

  const selectPatient = (patient: any) => {
    setSelectedPatient(patient)
    setSearchResults([])
  }

  // Search logic: by UHID, Mobile, or Name
  const executeSearch = async (queryStr: string) => {
    const q = queryStr.trim()
    if (!q) {
      toast.error("Please enter a UHID, Mobile number, or Patient Name.")
      return
    }

    setIsSearching(true)
    setSearchResults([])
    try {
      const res = await patientService.getPatients({ search: q, limit: 10 })
      const list = Array.isArray(res) ? res : (res as any)?.data || []

      if (list.length === 0) {
        toast.error("No registered patient found matching '" + q + "'.")
        setSelectedPatient(null)
      } else if (list.length === 1) {
        selectPatient(list[0])
      } else {
        setSearchResults(list)
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to search patient.")
    } finally {
      setIsSearching(false)
    }
  }

  // Load patient automatically if initialUhid is provided
  useEffect(() => {
    if (initialUhid) {
      setSearchTerm(initialUhid)
      executeSearch(initialUhid)
    }
  }, [initialUhid])

  // Doctors in selected department
  const availableDoctors = useMemo(() => {
    if (!selectedDeptId) return []
    const dept = departments.find((d) => String(d.id) === String(selectedDeptId))
    return dept?.doctors || []
  }, [selectedDeptId, departments])

  // Auto-select first doctor when department changes
  useEffect(() => {
    if (availableDoctors.length > 0 && !selectedDoctorId) {
      setSelectedDoctorId(String(availableDoctors[0].id))
    }
  }, [availableDoctors, selectedDoctorId])

  // Selected doctor object for workload analysis
  const selectedDoctor = useMemo(() => {
    if (!selectedDoctorId) return null
    return availableDoctors.find((doc: any) => String(doc.id) === String(selectedDoctorId)) || null
  }, [selectedDoctorId, availableDoctors])

  // OPD Slot Duration Settings from Hospital Configuration
  const { data: opdSlotConfig } = useQuery({
    queryKey: ["settings", "opd_slot"],
    queryFn: () => settingsService.getSettings("opd_slot"),
  })

  // Dynamic appointment slots based on doctor shift & settings
  const dynamicSlots = useMemo(() => {
    const slotDuration = Number(opdSlotConfig?.slot_duration_minutes || 15)
    let startTime = opdSlotConfig?.morning_start || "09:00"
    let endTime = opdSlotConfig?.morning_end || "13:00"

    if (selectedDoctor?.schedules && selectedDoctor.schedules.length > 0) {
      const sched = selectedDoctor.schedules[0]
      if (sched.start_time && sched.end_time) {
        startTime = sched.start_time.slice(0, 5)
        endTime = sched.end_time.slice(0, 5)
      }
    }

    return generateDoctorSlots({
      startTime,
      endTime,
      slotDurationMinutes: slotDuration,
      includeLiveToken: true,
      defaultMorningStart: opdSlotConfig?.morning_start || "09:00",
      defaultMorningEnd: opdSlotConfig?.morning_end || "13:00",
      defaultEveningStart: opdSlotConfig?.evening_start || "17:00",
      defaultEveningEnd: opdSlotConfig?.evening_end || "21:00",
    })
  }, [selectedDoctor, opdSlotConfig])

  // Check 15-Day Follow-up Policy whenever patient or doctor changes
  const {
    data: eligibility,
    isLoading: isCheckingEligibility,
  } = useQuery({
    queryKey: [
      "reception",
      "revisit-eligibility",
      selectedPatient?.id,
      selectedDoctorId,
      selectedDeptId,
    ],
    queryFn: () =>
      receptionService.checkRevisitEligibility({
        patient_id: selectedPatient?.id,
        doctor_id: selectedDoctorId ? Number(selectedDoctorId) : undefined,
        department_id: selectedDeptId ? Number(selectedDeptId) : undefined,
      }),
    enabled: Boolean(selectedPatient?.id),
  })

  // Whenever eligibility data changes, update the billing fields
  useEffect(() => {
    if (eligibility && eligibility.found) {
      if (eligibility.is_eligible_for_free_followup) {
        setFeeCharged(0)
        setPaymentStatus("waived")
      } else {
        setFeeCharged(eligibility.suggested_fee ?? 500)
        setPaymentStatus("paid")
      }

      // If patient had a previous visit and department is not yet selected, prefill previous department/doctor
      if (eligibility.last_visit && !selectedDeptId) {
        if (eligibility.last_visit.department_id) {
          setSelectedDeptId(String(eligibility.last_visit.department_id))
        }
        if (eligibility.last_visit.doctor_id) {
          setSelectedDoctorId(String(eligibility.last_visit.doctor_id))
        }
      }
    }
  }, [eligibility, selectedDeptId])

  // Re-visit mutation
  const revisitMutation = useMutation({
    mutationFn: receptionService.quickRevisit,
    onSuccess: (res: any) => {
      toast.success("Re-visit OPD Slip & Token Generated Successfully!")
      const data = res?.data || res
      onSuccess(data)
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to generate re-visit token.")
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPatient) {
      toast.error("Please search and select a patient first.")
      return
    }
    if (!selectedDoctorId) {
      toast.error("Please select a Doctor.")
      return
    }

    let paymentBreakdown: any[] | undefined = undefined
    let paymentRef: string | undefined = undefined

    if (paymentMethod === "split") {
      paymentBreakdown = [
        { method: "cash", amount: Number(splitCashAmount) || 0 },
        { method: "upi", amount: Number(splitUpiAmount) || 0, ref: splitUpiUtr.trim() || undefined },
      ]
      paymentRef = splitUpiUtr.trim() || undefined
    } else if (paymentMethod === "upi") {
      paymentRef = upiUtr.trim() || undefined
    }

    revisitMutation.mutate({
      patient_id: selectedPatient.id,
      uhid: selectedPatient.uhid,
      doctor_id: Number(selectedDoctorId),
      department_id: selectedDeptId ? Number(selectedDeptId) : undefined,
      slot_time: slotTime,
      chief_complaint: chiefComplaint,
      fee_charged: feeCharged,
      amount_paid: feeCharged,
      payment_status: paymentStatus,
      payment_method: feeCharged === 0 ? "cash" : paymentMethod,
      payment_ref: paymentRef,
      payment_breakdown: paymentBreakdown,
      notes: eligibility?.is_eligible_for_free_followup
        ? `Free Follow-up Revisit (Within 15 days, previous visit ${eligibility.last_visit?.opd_number})`
        : `Standard Revisit OPD Consultation`,
    })
  }

  return (
    <div className="space-y-6">
      {/* Search Header Card */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-primary" />
              Patient Re-visit / Follow-up Slip Generation
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Search by UHID, Mobile number, or Name. Direct 1-click token issue without re-entering demographics or ABHA OTP.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded-lg font-medium">
            <Sparkles className="h-3.5 w-3.5" />
            15-Day Free Follow-up Policy Active
          </div>
        </div>

        {/* Search input form */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            executeSearch(searchTerm)
          }}
          className="flex flex-col sm:flex-row gap-2.5"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Enter UHID (e.g. HOSP-2026-01070), 10-digit Mobile, or Patient Name..."
              className="pl-10 h-11 text-sm bg-background border-border/80"
              autoFocus
            />
          </div>
          <Button
            type="submit"
            disabled={isSearching || !searchTerm.trim()}
            className="h-11 px-6 font-semibold gap-2 shadow-xs"
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Search Patient
          </Button>
          {selectedPatient && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSelectedPatient(null)
                setSearchTerm("")
                setSearchResults([])
              }}
              className="h-11 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </Button>
          )}
        </form>

        {/* Multiple Results Picker */}
        {searchResults.length > 0 && !selectedPatient && (
          <div className="mt-4 border border-border/70 rounded-xl overflow-hidden bg-background divide-y divide-border/60">
            <div className="px-4 py-2.5 bg-muted/40 text-xs font-semibold text-muted-foreground flex justify-between items-center">
              <span>Multiple patients matched. Please select one:</span>
              <span className="text-[11px] font-normal">{searchResults.length} records</span>
            </div>
            <div className="max-h-56 overflow-y-auto divide-y divide-border/50">
              {searchResults.map((p) => (
                <div
                  key={p.id}
                  onClick={() => selectPatient(p)}
                  className="px-4 py-3 hover:bg-primary/5 cursor-pointer flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <PatientAvatar
                      photo={p.photo}
                      name={p.name}
                      uhid={p.uhid}
                      className="h-9 w-9 text-xs"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">{p.name}</span>
                        <span className="text-xs font-mono font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                          {p.uhid}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex gap-3">
                        <span>{p.gender === "M" ? "Male" : p.gender === "F" ? "Female" : "Other"}</span>
                        <span>•</span>
                        <span>Mob: {p.mobile || "N/A"}</span>
                        {p.abha_number && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-600 font-medium">ABHA Linked</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button size="xs" variant="outline" className="text-xs gap-1">
                    Select
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Selected Patient Details & OPD Form */}
      {selectedPatient && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Card */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
              <div className="flex items-center gap-4">
                <PatientAvatar
                  photo={selectedPatient.photo}
                  name={selectedPatient.name}
                  uhid={selectedPatient.uhid}
                  className="h-14 w-14 text-lg border-2 border-primary/20 shadow-xs"
                />
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h4 className="text-lg font-bold text-foreground">{selectedPatient.name}</h4>
                    <span className="text-xs font-mono font-semibold text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">
                      {selectedPatient.uhid}
                    </span>
                    {selectedPatient.abha_number ? (
                      <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> ABHA: {selectedPatient.abha_number}
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          Normal Registry
                        </span>
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          onClick={() => setIsLinkAbhaOpen(true)}
                          className="h-6 text-[11px] border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 font-semibold gap-1 rounded-full px-2.5"
                        >
                          <ShieldCheck className="h-3 w-3" /> Link ABHA
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                    <span>
                      {selectedPatient.gender === "M" ? "Male" : selectedPatient.gender === "F" ? "Female" : "Other"}
                      {selectedPatient.dob && ` • DOB: ${selectedPatient.dob.substring(0, 10)}`}
                    </span>
                    <span>•</span>
                    <span>Mobile: {selectedPatient.mobile || "N/A"}</span>
                    {selectedPatient.address && (
                      <>
                        <span>•</span>
                        <span className="truncate max-w-xs">{selectedPatient.address}, {selectedPatient.city || ""}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedPatient(null)
                  setSearchTerm("")
                }}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                Change Patient
              </Button>
            </div>

            {/* 15-Day Policy Banner */}
            <div className="mt-4">
              {isCheckingEligibility ? (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-muted text-xs text-muted-foreground animate-pulse">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Verifying 15-day follow-up validity and previous visit records...
                </div>
              ) : eligibility?.is_eligible_for_free_followup ? (
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-bold text-sm text-emerald-800 dark:text-emerald-300">
                        🎉 Free Follow-up Visit Eligible (Under 15-Day Policy)
                      </p>
                      <p className="mt-1 leading-relaxed text-emerald-700/90 dark:text-emerald-300/80">
                        Patient previously visited{" "}
                        <strong className="font-semibold text-emerald-900 dark:text-emerald-200">
                          {eligibility.last_visit?.doctor_name || "Doctor"} ({eligibility.last_visit?.department_name || "OPD"})
                        </strong>{" "}
                        on <strong className="font-semibold">{eligibility.last_visit?.visit_date}</strong> (
                        {eligibility.days_since_last_visit} {eligibility.days_since_last_visit === 1 ? "day" : "days"} ago).
                        Free follow-up validity remains active for{" "}
                        <strong className="font-bold text-emerald-900 dark:text-emerald-100">
                          {eligibility.days_remaining} more {eligibility.days_remaining === 1 ? "day" : "days"}
                        </strong>
                        . Consultation fee is waived to <strong className="font-bold">₹0.00</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-50/60 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-bold text-sm text-blue-800 dark:text-blue-300">
                        Standard Revisit Consultation Fee
                      </p>
                      <p className="mt-1 leading-relaxed text-blue-700/90 dark:text-blue-300/80">
                        {eligibility?.last_visit ? (
                          <>
                            Last OPD visit was on{" "}
                            <strong>{eligibility.last_visit.visit_date}</strong> (
                            {eligibility.days_since_last_visit} days ago), which exceeds the 15-day free follow-up timeline or is with a different department.
                          </>
                        ) : (
                          "Patient has no recorded previous OPD visits for this department/doctor."
                        )}{" "}
                        Standard consultation charges apply.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Department, Doctor & Billing Form */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Assign Department & Doctor for Today's Visit
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Department */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Department *</Label>
                <select
                  value={selectedDeptId}
                  onChange={(e) => {
                    setSelectedDeptId(e.target.value)
                    setSelectedDoctorId("")
                  }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={String(d.id)}>
                      {d.name} {d.code ? `(${d.code})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Doctor */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Doctor *</Label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  disabled={!selectedDeptId || availableDoctors.length === 0}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                >
                  <option value="">
                    {!selectedDeptId
                      ? "Select department first"
                      : availableDoctors.length === 0
                      ? "No active doctors in this department"
                      : "Select Doctor"}
                  </option>
                  {availableDoctors.map((doc: any) => (
                    <option key={doc.id} value={String(doc.id)}>
                      {doc.name} {doc.specialization ? `— ${doc.specialization}` : ""} {typeof doc.today_waiting_count === 'number' ? `• [${doc.today_waiting_count} waiting]` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Doctor Live Queue & Load Status Card */}
            {selectedDeptId && availableDoctors.length > 0 && (
              <DoctorQueueLoadCard
                selectedDoctor={selectedDoctor}
                availableDoctors={availableDoctors}
                slotDurationMinutes={Number(opdSlotConfig?.slot_duration_minutes || 15)}
                onSelectDoctor={(docId) => setSelectedDoctorId(docId ? String(docId) : "")}
              />
            )}

            {/* Appointment Slot / Session Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold block">Appointment Slot / Token Allocation</Label>
              <SlotPicker
                slots={dynamicSlots}
                value={slotTime}
                onChange={(val) => setSlotTime(val)}
                slotDurationMinutes={Number(opdSlotConfig?.slot_duration_minutes || 15)}
              />
            </div>

            {/* Chief Complaint / Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Chief Complaint / Reason for Revisit</Label>
              <Input
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                placeholder="e.g. Follow-up consultation, reports check, fever review..."
                className="h-10 text-xs"
              />
            </div>

            {/* Billing Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border/60">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Fee Charged (₹){" "}
                  {eligibility?.is_eligible_for_free_followup && (
                    <span className="text-emerald-600 font-normal">(Waived ₹0)</span>
                  )}
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={feeCharged}
                  onChange={(e) => setFeeCharged(Number(e.target.value))}
                  className="h-10 text-xs font-mono font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Payment Status</Label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="waived">Waived (₹0 Free)</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Payment Method</Label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  disabled={feeCharged === 0}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI / QR Code</option>
                  <option value="split">Split (Cash + UPI)</option>
                  <option value="card">Debit / Credit Card</option>
                  <option value="insurance">Insurance / TPA</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Optional UTR for single UPI */}
            {paymentMethod === "upi" && feeCharged > 0 && (
              <div className="animate-in fade-in duration-200">
                <Label className="text-xs font-semibold flex items-center justify-between">
                  <span>UPI / Bank Reference (UTR) Number</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Optional</span>
                </Label>
                <Input
                  placeholder="e.g. 423456789012 or UPI txn ID"
                  value={upiUtr}
                  onChange={(e) => setUpiUtr(e.target.value)}
                  className="mt-1 text-xs font-mono"
                />
              </div>
            )}

            {/* Split Payment Breakdown Box */}
            {paymentMethod === "split" && feeCharged > 0 && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                    ⚡ Split Payment Breakdown (Fee: ₹{feeCharged})
                  </span>
                  <span
                    className={`text-[11px] font-mono font-semibold ${
                      Number(splitCashAmount) + Number(splitUpiAmount) === Number(feeCharged)
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    Sum: ₹{Number(splitCashAmount) + Number(splitUpiAmount)} / ₹{feeCharged}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-[11px] font-medium text-muted-foreground">Cash Amount (₹)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={splitCashAmount}
                      onChange={(e) => handleCashChange(Number(e.target.value))}
                      className="mt-1 text-xs font-mono font-bold bg-background"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-medium text-muted-foreground">UPI Amount (₹)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={splitUpiAmount}
                      onChange={(e) => handleUpiChange(Number(e.target.value))}
                      className="mt-1 text-xs font-mono font-bold bg-background"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-medium text-muted-foreground">UPI UTR # (Optional)</Label>
                    <Input
                      placeholder="e.g. 4291823901"
                      value={splitUpiUtr}
                      onChange={(e) => setSplitUpiUtr(e.target.value)}
                      className="mt-1 text-xs font-mono bg-background"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Submit Action */}
            <div className="pt-3 flex items-center justify-end gap-3">
              <Button
                type="submit"
                disabled={revisitMutation.isPending || !selectedDoctorId}
                className="h-11 px-8 font-bold gap-2 text-sm bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
              >
                {revisitMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                Issue Re-visit OPD Slip & Token
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Link ABHA Modal */}
      <LinkAbhaModal
        open={isLinkAbhaOpen}
        onClose={() => setIsLinkAbhaOpen(false)}
        patient={selectedPatient}
        onLinked={(updated) => setSelectedPatient(updated)}
      />
    </div>
  )
}
