import React, { useState, useEffect } from "react"
import { Smartphone, ShieldCheck, ArrowRight, RefreshCw, KeyRound, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { abhaService } from "@/services/abhaService"

interface AbhaMobileOtpFlowProps {
  onPatientVerified: (patient: {
    name: string
    mobile: string
    gender?: string
    dob?: string
    abha_number?: string | null
    abha_address?: string | null
  }) => void
}

export const AbhaMobileOtpFlow: React.FC<AbhaMobileOtpFlowProps> = ({ onPatientVerified }) => {
  const [mobile, setMobile] = useState("")
  const [otp, setOtp] = useState("")
  const [txnId, setTxnId] = useState<string | null>(null)
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [timer, setTimer] = useState(0)
  const [resendCount, setResendCount] = useState(0)
  const [verifiedProfile, setVerifiedProfile] = useState<any | null>(null)

  // Countdown timer for OTP resend
  useEffect(() => {
    if (timer <= 0) return
    const interval = setInterval(() => setTimer((t) => t - 1), 1000)
    return () => clearInterval(interval)
  }, [timer])

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const cleanMobile = mobile.trim()
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      toast.error("Please enter a valid 10-digit mobile number")
      return
    }

    setIsSendingOtp(true)
    try {
      const res = await abhaService.generateOtp(cleanMobile)
      setTxnId(res.txnId)
      setTimer(60)
      setResendCount(0)
      toast.success("OTP Sent Successfully!", {
        description: "Please enter the 6-digit OTP received on your mobile.",
      })
    } catch (err: any) {
      toast.error(err.message || "Failed to send OTP. Please try again.")
    } finally {
      setIsSendingOtp(false)
    }
  }

  // Resend OTP (NHA compliant: max 2 times, 60s delay)
  const handleResendOtp = async () => {
    if (timer > 0 || resendCount >= 2 || isSendingOtp) return
    const cleanMobile = mobile.trim()
    setIsSendingOtp(true)
    try {
      const res = await abhaService.generateOtp(cleanMobile)
      setTxnId(res.txnId)
      setTimer(60)
      setResendCount((prev) => prev + 1)
      setOtp("")
      toast.success(`OTP Resent (${resendCount + 1}/2)!`, {
        description: "A new 6-digit OTP has been sent via SMS.",
      })
    } catch (err: any) {
      toast.error(err.message || "Failed to resend OTP. Please try again.")
    } finally {
      setIsSendingOtp(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!txnId) return
    if (!otp.trim()) {
      toast.error("Please enter the 6-digit OTP")
      return
    }

    setIsVerifying(true)
    try {
      const res: any = await abhaService.verifyOtp(txnId, otp.trim())
      // Check accounts array or profile
      const account = res?.accounts?.[0] || res?.ABHAProfile || res?.profile || res
      const resolvedName = 
        account?.name || 
        [account?.firstName, account?.middleName, account?.lastName].filter(Boolean).join(" ") ||
        "Patient"

      const profileData = {
        name: resolvedName,
        mobile: mobile,
        gender: account?.gender || "M",
        dob: account?.dob || (account?.yearOfBirth ? `${account.yearOfBirth}-01-01` : undefined),
        abha_number: account?.ABHANumber || account?.abha_number || account?.abhaNumber,
        abha_address: account?.preferredAbhaAddress || account?.abhaAddress || account?.abha_address,
        address: account?.address || account?.addressLine,
        district: account?.districtName || account?.district,
        state: account?.stateName || account?.state,
        pincode: account?.pincode || account?.pinCode,
        photo: account?.profilePhoto || account?.photo,
      }
      setVerifiedProfile(profileData)
      toast.success("ABHA Profile Verified Successfully!")
    } catch (err: any) {
      toast.error(err.message || "OTP verification failed. Please check the code and try again.")
    } finally {
      setIsVerifying(false)
    }
  }

  const handleProceed = () => {
    if (verifiedProfile) {
      onPatientVerified(verifiedProfile)
    }
  }

  return (
    <div className="w-full space-y-6">
      {/* Step 1 & 2: Mobile & OTP Verification Card */}
      {!verifiedProfile ? (
        <div className="w-full rounded-2xl border bg-card p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-3 border-b pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Fetch Patient via ABHA-Linked Mobile OTP
              </h3>
              <p className="text-xs text-muted-foreground">
                Send an OTP to the patient's registered mobile number to fetch their ABHA profile.
              </p>
            </div>
          </div>

          {/* Mobile Input */}
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-semibold">10-Digit Mobile Number *</Label>
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
                    className="pl-12 font-mono text-sm tracking-wider"
                  />
                </div>
                {!txnId ? (
                  <Button
                    onClick={handleSendOtp}
                    disabled={isSendingOtp || mobile.length !== 10}
                    className="px-5"
                  >
                    {isSendingOtp ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      "Send OTP"
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setTxnId(null)
                      setOtp("")
                      setTimer(0)
                    }}
                  >
                    Change
                  </Button>
                )}
              </div>
            </div>

            {/* OTP Section (Shown once OTP is sent) */}
            {txnId && (
              <form onSubmit={handleVerifyOtp} className="space-y-4 pt-2 border-t">
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Enter 6-Digit OTP *</Label>
                    <div className="text-[11px] font-mono">
                      {resendCount >= 2 ? (
                        <span className="text-muted-foreground font-medium">Max resends reached (2/2)</span>
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
                    Enter the 6-digit authentication code sent via SMS.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isVerifying || otp.length < 4}
                  className="w-full h-10 font-semibold"
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Verifying ABHA Profile...
                    </>
                  ) : (
                    <>
                      <KeyRound className="mr-2 h-4 w-4" />
                      Verify & Fetch ABHA Profile
                    </>
                  )}
                </Button>
              </form>
            )}
          </div>
        </div>
      ) : (
        /* Verified Profile Display */
        <div className="rounded-2xl border border-emerald-500/30 bg-card p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">ABHA Profile Verified!</h3>
                <p className="text-xs text-muted-foreground">
                  Patient verified via National Health Authority ABDM.
                </p>
              </div>
            </div>
            <Badge className="bg-emerald-600 text-white font-mono text-xs">
              <ShieldCheck className="mr-1 h-3.5 w-3.5" />
              VERIFIED
            </Badge>
          </div>

          {verifiedProfile.photo && (
            <div className="flex items-center gap-4 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
              <img
                src={verifiedProfile.photo.startsWith("data:") ? verifiedProfile.photo : `data:image/jpeg;base64,${verifiedProfile.photo}`}
                alt={verifiedProfile.name}
                className="h-16 w-16 rounded-xl object-cover border-2 border-emerald-500 shadow-xs shrink-0"
              />
              <div className="min-w-0">
                <p className="font-bold text-sm text-foreground">{verifiedProfile.name}</p>
                <p className="text-xs text-muted-foreground font-mono">ABHA: {verifiedProfile.abha_number || "Verified"}</p>
                {(verifiedProfile.address || verifiedProfile.district || verifiedProfile.state) && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    📍 {[verifiedProfile.address, verifiedProfile.district, verifiedProfile.state, verifiedProfile.pincode].filter(Boolean).join(", ")}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="rounded-xl bg-muted/40 p-3">
              <span className="text-muted-foreground">Full Name (Locked):</span>
              <p className="font-bold text-sm text-foreground mt-0.5">{verifiedProfile.name}</p>
            </div>

            <div className="rounded-xl bg-muted/40 p-3">
              <span className="text-muted-foreground">Gender & DOB:</span>
              <p className="font-semibold text-foreground mt-0.5">
                {verifiedProfile.gender || "—"} {verifiedProfile.dob ? `• ${verifiedProfile.dob}` : ""}
              </p>
            </div>

            <div className="rounded-xl bg-muted/40 p-3">
              <span className="text-muted-foreground">ABHA Number:</span>
              <p className="font-mono font-bold text-foreground mt-0.5">
                {verifiedProfile.abha_number || "Not assigned"}
              </p>
            </div>

            <div className="rounded-xl bg-muted/40 p-3">
              <span className="text-muted-foreground">ABHA Address:</span>
              <p className="font-mono font-bold text-primary mt-0.5">
                {verifiedProfile.abha_address || "None"}
              </p>
            </div>

            {(verifiedProfile.address || verifiedProfile.district || verifiedProfile.state || verifiedProfile.pincode) && !verifiedProfile.photo && (
              <div className="rounded-xl bg-muted/40 p-3 sm:col-span-2 lg:col-span-4">
                <span className="text-muted-foreground">Registered Address:</span>
                <p className="font-medium text-foreground mt-0.5">
                  {[verifiedProfile.address, verifiedProfile.district, verifiedProfile.state, verifiedProfile.pincode].filter(Boolean).join(", ")}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setVerifiedProfile(null)
                setTxnId(null)
                setOtp("")
              }}
            >
              Verify Another Mobile
            </Button>
            <Button onClick={handleProceed} className="bg-primary text-primary-foreground font-semibold">
              Assign Department & Issue OPD Slip
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
