import React, { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import {
  X,
  ShieldCheck,
  Smartphone,
  KeyRound,
  CheckCircle2,
  RefreshCw,
  Link as LinkIcon,
  FileCheck2,
} from "lucide-react"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { PatientAvatar } from "@/components/common/PatientAvatar"
import { abhaService } from "@/services/abhaService"
import { patientService } from "@/services/patientService"
import { queryKeys } from "@/constants/queryKeys"

export interface LinkAbhaPatient {
  id: number | string
  uhid: string
  name: string
  mobile?: string | null
  gender?: string | null
  dob?: string | null
  abha_number?: string | null
  abha_address?: string | null
}

interface LinkAbhaModalProps {
  open: boolean
  onClose: () => void
  patient: LinkAbhaPatient | null
  onLinked?: (updatedPatient: any) => void
}

export const LinkAbhaModal: React.FC<LinkAbhaModalProps> = ({
  open,
  onClose,
  patient,
  onLinked,
}) => {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<"otp" | "direct">("otp")

  // OTP Tab States
  const [mobile, setMobile] = useState("")
  const [txnId, setTxnId] = useState<string | null>(null)
  const [otp, setOtp] = useState("")
  const [timer, setTimer] = useState(0)
  const [resendCount, setResendCount] = useState(0)
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [verifiedAbdmProfile, setVerifiedAbdmProfile] = useState<any | null>(null)
  const [token, setToken] = useState<string | null>(null)

  // Direct Tab States
  const [manualAbhaNumber, setManualAbhaNumber] = useState("")
  const [manualAbhaAddress, setManualAbhaAddress] = useState("")

  const [isSubmittingLink, setIsSubmittingLink] = useState(false)

  // Pre-fill patient's mobile on open
  useEffect(() => {
    if (open && patient) {
      setMobile(patient.mobile?.replace(/\D/g, "") || "")
      setTxnId(null)
      setOtp("")
      setTimer(0)
      setResendCount(0)
      setVerifiedAbdmProfile(null)
      setToken(null)
      setManualAbhaNumber("")
      setManualAbhaAddress("")
      setActiveTab("otp")
    }
  }, [open, patient])

  // Countdown timer for OTP
  useEffect(() => {
    if (timer <= 0) return
    const interval = setInterval(() => setTimer((t) => t - 1), 1000)
    return () => clearInterval(interval)
  }, [timer])

  if (!open || !patient) return null

  // ─── OTP Flow Handlers ───
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const cleanMobile = mobile.replace(/\D/g, "").trim()
    if (cleanMobile.length !== 10) {
      toast.error("Please enter a valid 10-digit mobile number.")
      return
    }

    setIsSendingOtp(true)
    try {
      const res = await abhaService.generateOtp(cleanMobile)
      setTxnId(res.txnId)
      setTimer(60)
      setResendCount(0)
      toast.success("OTP Sent to Patient's Mobile!", {
        description: `Authentication code sent to +91 ${cleanMobile}`,
      })
    } catch (err: any) {
      toast.error(err.message || "Failed to send OTP via ABDM.")
    } finally {
      setIsSendingOtp(false)
    }
  }

  const handleResendOtp = async () => {
    if (timer > 0 || resendCount >= 2 || isSendingOtp) return
    const cleanMobile = mobile.replace(/\D/g, "").trim()
    setIsSendingOtp(true)
    try {
      const res = await abhaService.generateOtp(cleanMobile)
      setTxnId(res.txnId)
      setTimer(60)
      setResendCount((prev) => prev + 1)
      setOtp("")
      toast.success(`OTP Resent (${resendCount + 1}/2)!`)
    } catch (err: any) {
      toast.error(err.message || "Failed to resend OTP.")
    } finally {
      setIsSendingOtp(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!txnId) return
    if (otp.trim().length < 4) {
      toast.error("Please enter the 6-digit OTP.")
      return
    }

    setIsVerifyingOtp(true)
    try {
      const res: any = await abhaService.verifyOtp(txnId, otp.trim())
      const tokenReceived =
        res?.account_token ||
        res?.token ||
        res?.tokens?.token ||
        res?.jwtResponse ||
        res?.accounts?.[0]?.token ||
        null

      setToken(tokenReceived)

      const account = res?.accounts?.[0] || res?.ABHAProfile || res?.profile || res
      const resolvedName =
        account?.name ||
        [account?.firstName, account?.middleName, account?.lastName].filter(Boolean).join(" ") ||
        "Patient"
      const abhaNum = account?.ABHANumber || account?.abha_number || account?.abhaNumber
      const abhaAddr = account?.preferredAbhaAddress || account?.abhaAddress || account?.abha_address

      if (!abhaNum) {
        toast.error("No ABHA number found linked to this mobile.")
        return
      }

      setVerifiedAbdmProfile({
        name: resolvedName,
        abha_number: abhaNum,
        abha_address: abhaAddr,
        gender: account?.gender,
        dob: account?.dob,
        photo: account?.profilePhoto || account?.photo,
        address: account?.address,
        district: account?.districtName || account?.district,
        state: account?.stateName || account?.state,
        pincode: account?.pincode,
        abha_card_base64: res?.abha_card_base64 || account?.abha_card_base64,
      })

      toast.success("ABHA Profile Authenticated Successfully!")
    } catch (err: any) {
      toast.error(err.message || "OTP verification failed. Please try again.")
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  // ─── Final Linking Submission ───
  const handleConfirmLink = async () => {
    let payload: any = {}

    if (activeTab === "otp") {
      if (!verifiedAbdmProfile?.abha_number) {
        toast.error("Please verify OTP first to authenticate ABHA.")
        return
      }
      payload = {
        abha_number: verifiedAbdmProfile.abha_number,
        abha_address: verifiedAbdmProfile.abha_address,
        token: token || undefined,
        txnId: txnId || undefined,
        abha_card_base64: verifiedAbdmProfile.abha_card_base64 || undefined,
        photo: verifiedAbdmProfile.photo || undefined,
        address: verifiedAbdmProfile.address || undefined,
        district: verifiedAbdmProfile.district || undefined,
        state: verifiedAbdmProfile.state || undefined,
        pincode: verifiedAbdmProfile.pincode || undefined,
      }
    } else {
      const cleanNum = manualAbhaNumber.trim()
      if (!cleanNum || cleanNum.length < 14) {
        toast.error("Please enter a valid 14-digit ABHA Number (e.g. 12-3456-7890-1234).")
        return
      }
      payload = {
        abha_number: cleanNum,
        abha_address: manualAbhaAddress.trim() || undefined,
      }
    }

    setIsSubmittingLink(true)
    try {
      const updated = await patientService.linkAbha(patient.id, payload)
      queryClient.invalidateQueries({ queryKey: queryKeys.patients.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.reception.queue })
      toast.success(`Patient ${patient.name} (${patient.uhid}) linked to ABHA successfully!`, {
        description: `ABHA Number: ${payload.abha_number}`,
      })
      if (onLinked) onLinked(updated)
      onClose()
    } catch (err: any) {
      toast.error(err.message || "Failed to link ABHA to patient.")
    } finally {
      setIsSubmittingLink(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-2xl text-card-foreground animate-in zoom-in-95 duration-200 my-auto max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <LinkIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Link ABHA to Patient</h3>
              <p className="text-xs text-muted-foreground">
                Connect an existing hospital patient record with ABDM Health ID
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Existing Patient Summary Banner */}
        <div className="rounded-xl border border-border bg-muted/40 p-3.5 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PatientAvatar
              name={patient.name}
              uhid={patient.uhid}
              className="h-10 w-10 text-xs border border-primary/20 shadow-2xs"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-foreground">{patient.name}</span>
                <span className="font-mono text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                  {patient.uhid}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {patient.gender === "M" ? "Male" : patient.gender === "F" ? "Female" : "Other"}
                {patient.dob && ` • ${patient.dob.substring(0, 10)}`}
                {patient.mobile && ` • Mob: ${patient.mobile}`}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] text-amber-700 bg-amber-500/10 border-amber-400">
            Unlinked
          </Badge>
        </div>

        {/* Tabs: Live OTP vs Direct Entry */}
        <div className="flex border-b border-border mb-5 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("otp")}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "otp"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            Verify via Mobile OTP (Live ABDM)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("direct")}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "direct"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileCheck2 className="h-3.5 w-3.5" />
            Direct ABHA ID Entry
          </button>
        </div>

        {/* TAB 1: Live OTP Flow */}
        {activeTab === "otp" && (
          <div className="space-y-4">
            {!verifiedAbdmProfile ? (
              <>
                <div>
                  <Label className="text-xs font-semibold">Patient's ABHA-Registered Mobile Number *</Label>
                  <div className="mt-1 flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-mono">
                        +91
                      </span>
                      <Input
                        type="tel"
                        maxLength={10}
                        placeholder="9876543210"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                        disabled={!!txnId || isSendingOtp}
                        className="pl-12 font-mono text-sm"
                      />
                    </div>
                    {!txnId ? (
                      <Button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={isSendingOtp || mobile.length !== 10}
                        className="px-4 text-xs font-semibold"
                      >
                        {isSendingOtp ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "Send OTP"
                        )}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setTxnId(null)
                          setOtp("")
                          setTimer(0)
                        }}
                        className="text-xs"
                      >
                        Change
                      </Button>
                    )}
                  </div>
                </div>

                {txnId && (
                  <form onSubmit={handleVerifyOtp} className="space-y-4 pt-2 border-t border-border/60">
                    <div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">Enter 6-Digit ABDM OTP *</Label>
                        <div className="text-[11px] font-mono">
                          {resendCount >= 2 ? (
                            <span className="text-muted-foreground font-medium">Max resends (2/2)</span>
                          ) : timer > 0 ? (
                            <span className="text-muted-foreground">Resend in {timer}s</span>
                          ) : (
                            <button
                              type="button"
                              onClick={handleResendOtp}
                              disabled={isSendingOtp}
                              className="text-primary hover:underline font-semibold cursor-pointer"
                            >
                              Resend OTP ({2 - resendCount} left)
                            </button>
                          )}
                        </div>
                      </div>
                      <Input
                        type="text"
                        maxLength={6}
                        placeholder="123456"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        className="mt-1 font-mono text-center text-lg tracking-widest uppercase font-bold"
                        autoFocus
                      />
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Enter the code sent to the patient's mobile via SMS.
                      </p>
                    </div>

                    <Button
                      type="submit"
                      disabled={isVerifyingOtp || otp.length < 4}
                      className="w-full h-10 font-semibold"
                    >
                      {isVerifyingOtp ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Authenticating with ABDM...
                        </>
                      ) : (
                        <>
                          <KeyRound className="mr-2 h-4 w-4" />
                          Verify & Retrieve ABHA
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </>
            ) : (
              /* Verified ABHA profile display before confirmation */
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-foreground">ABHA Profile Authenticated!</h4>
                      <p className="text-[11px] text-muted-foreground">
                        Ready to link with hospital patient #{patient.uhid}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => {
                      setVerifiedAbdmProfile(null)
                      setTxnId(null)
                      setOtp("")
                    }}
                    className="text-xs"
                  >
                    Change
                  </Button>
                </div>

                <div className="rounded-xl border bg-card p-4 space-y-3 shadow-2xs text-xs">
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-muted-foreground">ABHA Name:</span>
                    <span className="font-semibold text-foreground">{verifiedAbdmProfile.name}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-muted-foreground">ABHA Number:</span>
                    <span className="font-mono font-bold text-primary">
                      {verifiedAbdmProfile.abha_number}
                    </span>
                  </div>
                  {verifiedAbdmProfile.abha_address && (
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="text-muted-foreground">ABHA Address:</span>
                      <span className="font-mono font-medium text-foreground">
                        {verifiedAbdmProfile.abha_address}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Gender / DOB:</span>
                    <span className="text-foreground">
                      {verifiedAbdmProfile.gender || "—"} / {verifiedAbdmProfile.dob || "—"}
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleConfirmLink}
                  disabled={isSubmittingLink}
                  className="w-full h-11 font-semibold gap-2 shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isSubmittingLink ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Linking ABHA to Patient...
                    </>
                  ) : (
                    <>
                      <LinkIcon className="h-4 w-4" />
                      Confirm & Link ABHA to {patient.name}
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Direct Entry Flow */}
        {activeTab === "direct" && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleConfirmLink()
            }}
            className="space-y-4"
          >
            <div>
              <Label className="text-xs font-semibold">14-Digit ABHA Number *</Label>
              <Input
                type="text"
                placeholder="12-3456-7890-1234"
                value={manualAbhaNumber}
                onChange={(e) => setManualAbhaNumber(e.target.value)}
                className="mt-1 font-mono text-sm tracking-wider"
                required
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Enter the official 14-digit ABHA Number printed on patient's card.
              </p>
            </div>

            <div>
              <Label className="text-xs font-semibold">ABHA Address Handle (Optional)</Label>
              <Input
                type="text"
                placeholder="username@sbx"
                value={manualAbhaAddress}
                onChange={(e) => setManualAbhaAddress(e.target.value.toLowerCase())}
                className="mt-1 font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Patient's health handle (e.g. name@sbx or name@abdm).
              </p>
            </div>

            <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
              <span>
                <strong>ABDM Rule:</strong> Linking will tag this ABHA number exclusively to UHID{" "}
                <strong>{patient.uhid}</strong>. Duplicate tagging to another patient is blocked.
              </span>
            </div>

            <Button
              type="submit"
              disabled={isSubmittingLink || manualAbhaNumber.trim().length < 14}
              className="w-full h-11 font-semibold gap-2 shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmittingLink ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Linking ABHA to Patient...
                </>
              ) : (
                <>
                  <LinkIcon className="h-4 w-4" />
                  Link ABHA to {patient.name}
                </>
              )}
            </Button>
          </form>
        )}
      </div>
    </div>,
    document.body
  )
}
