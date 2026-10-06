import React, { useState, useCallback } from "react"
import { useSearchParams } from "react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  QrCode,
  Smartphone,
  ShieldCheck,
  UserPlus,
  History,
  RotateCcw,
} from "lucide-react"

import { PageHeader } from "@/components/common/PageHeader"
import { FormContainer } from "@/components/formContainer"

import { receptionService } from "@/services/receptionService"
import { queryKeys } from "@/constants/queryKeys"
import type { ScanShareQueueItem, QuickVisitPayload } from "@/types/reception"

import { ScanShareFlow } from "@/components/reception/ScanShareFlow"
import { AbhaMobileOtpFlow } from "@/components/reception/AbhaMobileOtpFlow"
import { AadhaarEnrolFlow } from "@/components/reception/AadhaarEnrolFlow"
import { WalkInFlow } from "@/components/reception/WalkInFlow"
import { RevisitFlow } from "@/components/reception/RevisitFlow"
import { DeptDoctorPicker, type DeptDoctorFormValues } from "@/components/reception/DeptDoctorPicker"
import { ReceiptCard, type OpdReceiptData } from "@/components/reception/ReceiptCard"
import { TodayVisitsList } from "@/components/reception/TodayVisitsList"

export type ReceptionTab = "revisit" | "scan-share" | "abha-mobile" | "aadhaar-enrol" | "walk-in" | "history"

export const ReceptionPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const initialUhidParam = searchParams.get("uhid")
  const requestedTab = searchParams.get("tab") as ReceptionTab | null

  const [activeTab, setActiveTab] = useState<ReceptionTab>(
    requestedTab || (initialUhidParam ? "revisit" : "revisit")
  )

  // Active patient selected for assigning Department & Doctor
  const [patientForVisit, setPatientForVisit] = useState<{
    queue_id?: number
    patient_id?: number
    uhid?: string
    name: string
    gender?: string
    dob?: string
    age?: number | string
    mobile?: string
    abha_number?: string | null
    abha_address?: string | null
    preferred_department?: string | null
    // Address fields from ABHA/Aadhaar profile
    address?: string
    city?: string
    district?: string
    state?: string
    pincode?: string
    photo?: string
    kyc_verified?: boolean
    abha_card_base64?: string
  } | null>(null)

  // Current Generated OPD Receipt (if present, renders ReceiptCard)
  const [receiptData, setReceiptData] = useState<OpdReceiptData | null>(null)
  const [isSearchingToken, setIsSearchingToken] = useState(false)

  // ─── Queries ────────────────────────────────────────────────────────
  const {
    data: queueData,
    isLoading: queueLoading,
    dataUpdatedAt,
    refetch: refetchQueue,
  } = useQuery({
    queryKey: queryKeys.reception.queue,
    queryFn: receptionService.getQueue,
    refetchInterval: 15_000,
    meta: { showToast: false },
  })

  const { data: departments = [] } = useQuery({
    queryKey: queryKeys.reception.departments,
    queryFn: receptionService.getDepartments,
    staleTime: 5 * 60_000,
  })

  const { data: statsData } = useQuery({
    queryKey: queryKeys.reception.visitStats("today"),
    queryFn: () => receptionService.getVisitStats(),
    refetchInterval: 15_000,
  })

  // Normalize queue list
  const queueList: ScanShareQueueItem[] = Array.isArray(queueData)
    ? queueData
    : (queueData as any)?.data || []

  // ─── Mutations ───────────────────────────────────────────────────────
  const confirmMutation = useMutation({
    mutationFn: receptionService.confirmToken,
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reception.queue })
      queryClient.invalidateQueries({ queryKey: ["reception", "visits"] })
      queryClient.invalidateQueries({ queryKey: ["reception", "visitStats"] })
      setPatientForVisit(null)
      setReceiptData({
        queue_token: res.queue_token || res.token_no || 1,
        opd_number: res.opd_number,
        uhid: res.uhid,
        patient_name: res.patient_name,
        gender: res.gender,
        age: res.age,
        mobile: res.mobile,
        abha_number: res.abha_number,
        abha_address: res.abha_address,
        department_name: res.department_name,
        doctor_name: res.doctor_name,
        doctor_specialization: res.doctor_specialization,
        fee_charged: res.fee_charged || 0,
        amount_paid: res.amount_paid || 0,
        payment_method: res.payment_method || "cash",
        payment_status: res.payment_status || "paid",
        chief_complaint: res.chief_complaint,
        slot_time: res.slot_time || res.notes,
        visit_date: res.visit_time || new Date().toISOString(),
      })
      toast.success("Visit Confirmed & Token Generated!")
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to confirm visit. Please try again.")
    },
  })

  const quickVisitMutation = useMutation({
    mutationFn: receptionService.quickVisit,
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reception.queue })
      queryClient.invalidateQueries({ queryKey: ["reception", "visits"] })
      queryClient.invalidateQueries({ queryKey: ["reception", "visitStats"] })
      setPatientForVisit(null)
      const data = res?.data || res
      setReceiptData({
        queue_token: data.queue_token || 1,
        opd_number: data.opd_number,
        uhid: data.uhid,
        patient_name: data.patient_name || data.name,
        gender: data.gender,
        age: data.age,
        mobile: data.mobile,
        abha_number: data.abha_number,
        abha_address: data.abha_address,
        department_name: data.department_name,
        doctor_name: data.doctor_name,
        doctor_specialization: data.doctor_specialization,
        fee_charged: data.fee_charged || 0,
        amount_paid: data.amount_paid || 0,
        payment_method: data.payment_method || "cash",
        payment_status: data.payment_status || "paid",
        chief_complaint: data.chief_complaint || data.visit_reason,
        slot_time: data.slot_time || data.notes,
        visit_date: data.visit_date || new Date().toISOString(),
      })
      toast.success("Patient Registered & OPD Slip Issued!")
    },
    onError: (err: any) => {
      toast.error(err.message || "Patient registration failed. Please verify details.")
    },
  })

  // ─── Handlers ────────────────────────────────────────────────────────
  // Token search
  const handleLookupToken = useCallback(
    async (token_no: string): Promise<ScanShareQueueItem | null> => {
      setIsSearchingToken(true)
      try {
        const res = await receptionService.lookupToken(token_no)
        const item: ScanShareQueueItem = {
          id: res.id,
          token_no: res.token_no,
          patient_name: res.patient_name,
          abha_address: res.abha_address,
          abha_number: res.abha_number,
          gender: res.gender,
          age: res.age,
          status: res.status as ScanShareQueueItem["status"],
          preferred_department: res.preferred_department,
          expires_at: res.expires_at,
          created_at: new Date().toISOString(),
        }
        return item
      } catch (err: any) {
        toast.error("Token Search", {
          description: err.message || "Token not found. Please verify the token number or use the walk-in form.",
        })
        return null
      } finally {
        setIsSearchingToken(false)
      }
    },
    []
  )

  // When a Queue Item is clicked to confirm
  const handleSelectQueueItem = useCallback((item: ScanShareQueueItem) => {
    setPatientForVisit({
      queue_id: item.id,
      name: item.patient_name,
      gender: item.gender,
      age: item.age ?? undefined,
      abha_number: item.abha_number,
      abha_address: item.abha_address,
      preferred_department: item.preferred_department,
    })
  }, [])

  // When Mobile OTP flow verifies patient
  const handleAbhaPatientVerified = useCallback((profile: any) => {
    // Extract address from ABHAProfile nested object if present
    const abhaProfile = profile.ABHAProfile || profile.profile || {}
    setPatientForVisit({
      name: profile.name || abhaProfile.name,
      mobile: profile.mobile || abhaProfile.mobile,
      gender: profile.gender || abhaProfile.gender,
      dob: profile.dob || abhaProfile.dob,
      abha_number: profile.abha_number || profile.ABHANumber || abhaProfile.ABHANumber,
      abha_address: profile.abha_address || profile.preferredAbhaAddress || abhaProfile.preferredAbhaAddress,
      // Address fields from ABHA profile
      address: profile.address || abhaProfile.address,
      city: profile.city || abhaProfile.locality || abhaProfile.localityOrPlace,
      district: profile.district || abhaProfile.districtName,
      state: profile.state || abhaProfile.stateName,
      pincode: profile.pincode || abhaProfile.pincode,
      photo: profile.photo || abhaProfile.profilePhoto,
      abha_card_base64: profile.abha_card_base64 || profile.abha_card_pdf,
      kyc_verified: true,
    })
  }, [])

  // When Aadhaar Enrolment finishes
  const handleAadhaarEnrolled = useCallback((profile: any) => {
    // Extract address from ABHAProfile nested object if present
    const abhaProfile = profile.ABHAProfile || profile.profile || {}
    setPatientForVisit({
      name: profile.name || abhaProfile.name,
      mobile: profile.mobile || abhaProfile.mobile,
      gender: profile.gender || abhaProfile.gender,
      dob: profile.dob || abhaProfile.dob,
      abha_number: profile.abha_number || profile.ABHANumber || abhaProfile.ABHANumber,
      abha_address: profile.abha_address || profile.preferredAbhaAddress || abhaProfile.preferredAbhaAddress,
      // Address fields from Aadhaar profile
      address: profile.address || abhaProfile.address,
      city: profile.city || abhaProfile.locality || abhaProfile.localityOrPlace,
      district: profile.district || abhaProfile.districtName,
      state: profile.state || abhaProfile.stateName,
      pincode: profile.pincode || abhaProfile.pincode,
      photo: profile.photo || abhaProfile.profilePhoto,
      abha_card_base64: profile.abha_card_base64 || profile.abha_card_pdf,
      kyc_verified: true,
    })
  }, [])

  // Final step: Department & Doctor selected
  const handleDeptDoctorSubmit = (values: DeptDoctorFormValues) => {
    if (!patientForVisit) return

    // If it came from Scan & Share queue
    if (patientForVisit.queue_id) {
      confirmMutation.mutate({
        queue_id: patientForVisit.queue_id,
        department_id: values.department_id,
        doctor_id: values.doctor_id,
        slot_time: values.slot_time,
        visit_reason: values.chief_complaint,
        fee_charged: values.fee_charged,
        amount_paid: values.fee_charged,
        payment_method: values.payment_method,
        payment_status: values.payment_status,
      })
    } else {
      // It came from Mobile OTP or Aadhaar Enrolment
      const payload: QuickVisitPayload = {
        name: patientForVisit.name,
        mobile: patientForVisit.mobile,
        gender: (patientForVisit.gender as any) || "M",
        age: patientForVisit.age ? Number(patientForVisit.age) : undefined,
        dob: patientForVisit.dob,
        abha_number: patientForVisit.abha_number,
        abha_address: patientForVisit.abha_address,
        // Save full address and photo from ABHA/Aadhaar profile
        address: patientForVisit.address,
        city: patientForVisit.city,
        district: patientForVisit.district,
        state: patientForVisit.state,
        pincode: patientForVisit.pincode,
        photo: patientForVisit.photo,
        abha_card_base64: patientForVisit.abha_card_base64,
        kyc_verified: patientForVisit.kyc_verified,
        department_id: values.department_id,
        doctor_id: values.doctor_id,
        slot_time: values.slot_time,
        visit_reason: values.chief_complaint,
        chief_complaint: values.chief_complaint,
        fee_charged: values.fee_charged,
        amount_paid: values.fee_charged,
        payment_method: values.payment_method,
        payment_status: values.payment_status,
      }
      quickVisitMutation.mutate(payload)
    }
  }

  // Walk-in form submit
  const handleWalkInSubmit = (payload: QuickVisitPayload) => {
    quickVisitMutation.mutate(payload)
  }

  const lastUpdatedStr = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Reception & OPD Desk"
        subtitle="Unified Patient Registration, ABDM M1 Fast-track, Scan & Share Queue & OPD Slips"
      />

      {/* If ReceiptCard is active, display the printable OPD slip directly */}
      {receiptData ? (
        <ReceiptCard
          receipt={receiptData}
          onNextPatient={() => {
            setReceiptData(null)
            setPatientForVisit(null)
          }}
          onViewHistory={() => {
            setReceiptData(null)
            setPatientForVisit(null)
            setActiveTab("history")
          }}
        />
      ) : (
        <>
          {/* 6-Tab Pathway Navigation */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {/* Tab 1: Re-visit / Follow-up */}
            <button
              onClick={() => setActiveTab("revisit")}
              className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all ${
                activeTab === "revisit"
                  ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              }`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  activeTab === "revisit"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <RotateCcw className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold leading-tight truncate text-foreground">
                  Re-visit OPD
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  UHID / 15-Day Free
                </p>
              </div>
            </button>

            {/* Tab 2: Scan & Share */}
            <button
              onClick={() => setActiveTab("scan-share")}
              className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all ${
                activeTab === "scan-share"
                  ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              }`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  activeTab === "scan-share"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <QrCode className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold leading-tight truncate text-foreground">
                  Scan & Share
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  Token No (e.g. 482)
                </p>
              </div>
            </button>

            {/* Tab 3: Existing ABHA Mobile OTP */}
            <button
              onClick={() => setActiveTab("abha-mobile")}
              className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all ${
                activeTab === "abha-mobile"
                  ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              }`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  activeTab === "abha-mobile"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Smartphone className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold leading-tight truncate text-foreground">
                  Existing ABHA
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  Mobile OTP Login
                </p>
              </div>
            </button>

            {/* Tab 4: New ABHA via Aadhaar */}
            <button
              onClick={() => setActiveTab("aadhaar-enrol")}
              className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all ${
                activeTab === "aadhaar-enrol"
                  ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              }`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  activeTab === "aadhaar-enrol"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold leading-tight truncate text-foreground">
                  New ABHA
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  Aadhaar Enrolment
                </p>
              </div>
            </button>

            {/* Tab 5: Manual Walk-in */}
            <button
              onClick={() => setActiveTab("walk-in")}
              className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all ${
                activeTab === "walk-in"
                  ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              }`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  activeTab === "walk-in"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <UserPlus className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold leading-tight truncate text-foreground">
                  Manual Walk-in
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  No ABHA / Direct Form
                </p>
              </div>
            </button>

            {/* Tab 6: Today's Tokens / History */}
            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all ${
                activeTab === "history"
                  ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              }`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  activeTab === "history"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <History className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold leading-tight truncate text-foreground">
                    Today's Tokens
                  </p>
                  {statsData && statsData.total_issued > 0 && (
                    <span className="inline-flex items-center justify-center px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-primary text-primary-foreground">
                      {statsData.total_issued}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                  History & Reprint Slip
                </p>
              </div>
            </button>
          </div>

          {/* Active Flow Tab Content */}
          <div className="pt-2">
            {activeTab === "revisit" && (
              <RevisitFlow
                departments={departments}
                initialUhid={initialUhidParam}
                onSuccess={(data) => {
                  setReceiptData({
                    queue_token: data.queue_token || 1,
                    opd_number: data.opd_number,
                    uhid: data.uhid,
                    patient_name: data.patient_name || data.name,
                    gender: data.gender,
                    age: data.age,
                    mobile: data.mobile,
                    abha_number: data.abha_number,
                    abha_address: data.abha_address,
                    department_name: data.department_name,
                    doctor_name: data.doctor_name,
                    doctor_specialization: data.doctor_specialization,
                    fee_charged: data.fee_charged || 0,
                    amount_paid: data.amount_paid || 0,
                    payment_method: data.payment_method || "cash",
                    payment_status: data.payment_status || "paid",
                    chief_complaint: data.chief_complaint,
                    slot_time: data.slot_time || data.notes,
                    visit_date: data.visit_date || new Date().toISOString(),
                  })
                }}
              />
            )}

            {activeTab === "scan-share" && (
              <ScanShareFlow
                queue={queueList}
                isLoading={queueLoading}
                isSearching={isSearchingToken}
                lastUpdated={lastUpdatedStr}
                onRefresh={() => refetchQueue()}
                onLookupToken={handleLookupToken}
                onSelectQueueItem={handleSelectQueueItem}
              />
            )}

            {activeTab === "abha-mobile" && (
              <AbhaMobileOtpFlow onPatientVerified={handleAbhaPatientVerified} />
            )}

            {activeTab === "aadhaar-enrol" && (
              <AadhaarEnrolFlow onPatientEnrolled={handleAadhaarEnrolled} />
            )}

            {activeTab === "walk-in" && (
              <WalkInFlow
                departments={departments}
                isSubmitting={quickVisitMutation.isPending}
                onSubmit={handleWalkInSubmit}
              />
            )}

            {activeTab === "history" && (
              <TodayVisitsList
                onReprintSlip={(receipt) => setReceiptData(receipt)}
                onRegisterNewPatient={() => setActiveTab("walk-in")}
              />
            )}
          </div>

          {/* Step 2 Modal: Cascading Department & Doctor Selection */}
          <FormContainer
            open={!!patientForVisit}
            onOpenChange={(open) => {
              if (!open) setPatientForVisit(null)
            }}
            title="Assign Department & Issue OPD Token"
            description="Select department and doctor to generate patient queue token and print OPD slip."
          >
            {patientForVisit && (
              <DeptDoctorPicker
                departments={departments}
                patient={patientForVisit}
                onSubmit={handleDeptDoctorSubmit}
                onCancel={() => setPatientForVisit(null)}
                isLoading={confirmMutation.isPending || quickVisitMutation.isPending}
              />
            )}
          </FormContainer>
        </>
      )}
    </div>
  )
}
