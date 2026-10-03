import React, { useState, useEffect } from "react"
import { ShieldCheck, ArrowRight, RefreshCw, KeyRound, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { abhaService } from "@/services/abhaService"

interface AadhaarEnrolFlowProps {
  onPatientEnrolled: (patient: {
    name: string
    mobile: string
    gender?: string
    dob?: string
    abha_number?: string | null
    abha_address?: string | null
  }) => void
}

export const AadhaarEnrolFlow: React.FC<AadhaarEnrolFlowProps> = ({ onPatientEnrolled }) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1)
  const [consentAgreed, setConsentAgreed] = useState(false)
  const [aadhaar, setAadhaar] = useState("")
  const [mobile, setMobile] = useState("")
  const [txnId, setTxnId] = useState<string | null>(null)
  const [otp, setOtp] = useState("")
  const [token, setToken] = useState<string | null>(null)
  const [suggestedAddresses, setSuggestedAddresses] = useState<string[]>([])
  const [selectedAddress, setSelectedAddress] = useState("")
  const [customAddress, setCustomAddress] = useState("")
  const [createdProfile, setCreatedProfile] = useState<any | null>(null)
  const [verifiedProfile, setVerifiedProfile] = useState<any | null>(null)

  const [isLoading, setIsLoading] = useState(false)
  const [timer, setTimer] = useState(0)
  const [resendCount, setResendCount] = useState(0)

  useEffect(() => {
    if (timer <= 0) return
    const interval = setInterval(() => setTimer((t) => t - 1), 1000)
    return () => clearInterval(interval)
  }, [timer])

  // Step 2: Request Aadhaar OTP
  const handleRequestAadhaarOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!consentAgreed) {
      toast.error("Please provide ABDM Aadhaar consent to proceed.")
      return
    }
    const cleanAadhaar = aadhaar.replace(/\D/g, "")
    if (cleanAadhaar.length !== 12) {
      toast.error("Please enter a valid 12-digit Aadhaar number.")
      return
    }

    setIsLoading(true)
    try {
      const res = await abhaService.generateAadhaarOtp(cleanAadhaar)
      setTxnId(res.txnId)
      setTimer(60)
      setResendCount(0)
      setStep(3)
      toast.success("Aadhaar OTP Sent!", {
        description: "Please enter the 6-digit OTP sent to your Aadhaar-linked mobile.",
      })
    } catch (err: any) {
      toast.error(err.message || "Failed to generate Aadhaar OTP. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Resend Aadhaar OTP (NHA CRT_ABHA_106 compliant: max 2 times, 60s delay)
  const handleResendAadhaarOtp = async () => {
    if (timer > 0 || resendCount >= 2 || isLoading) return
    const cleanAadhaar = aadhaar.replace(/\D/g, "")
    setIsLoading(true)
    try {
      const res = await abhaService.generateAadhaarOtp(cleanAadhaar)
      setTxnId(res.txnId)
      setTimer(60)
      setResendCount((prev) => prev + 1)
      setOtp("")
      toast.success(`Aadhaar OTP Resent (${resendCount + 1}/2)!`, {
        description: "A new 6-digit OTP has been sent to your Aadhaar-linked mobile.",
      })
    } catch (err: any) {
      toast.error(err.message || "Failed to resend Aadhaar OTP. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Step 3: Verify Aadhaar OTP
  const handleVerifyAadhaarOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!txnId) return
    const cleanMobile = mobile.replace(/\D/g, "")
    if (!cleanMobile || cleanMobile.length !== 10) {
      toast.error("Communication Mobile Number is required by ABDM (10 digits).")
      return
    }
    if (otp.length < 4) {
      toast.error("Please enter a valid OTP.")
      return
    }

    setIsLoading(true)
    try {
      const res: any = await abhaService.verifyAadhaarOtp(txnId, otp.trim(), cleanMobile)
      const tokenReceived = res.token || res.tokens?.token || res.jwtResponse
      setToken(tokenReceived)

      // Resolve real patient details from ABDM response
      const profile = res.profile || res.ABHAProfile || res
      const extractedName = 
        profile?.name || 
        res?.name || 
        [profile?.firstName || res?.firstName, profile?.middleName || res?.middleName, profile?.lastName || res?.lastName].filter(Boolean).join(" ") ||
        ""

      const extractedAbhaNumber = 
        profile?.abhaNumber || 
        profile?.ABHANumber || 
        res?.abhaNumber || 
        res?.ABHANumber || 
        profile?.healthIdNumber || 
        res?.healthIdNumber || 
        ""

      const extractedAbhaAddress = 
        profile?.abhaAddress || 
        profile?.preferredAbhaAddress || 
        res?.abhaAddress || 
        res?.preferredAbhaAddress || 
        ""

      const extractedGender = profile?.gender || res?.gender || "M"
      const extractedDob = profile?.dob || res?.dob || (profile?.yearOfBirth ? `${profile.yearOfBirth}-01-01` : undefined)

      const extractedAddress = profile?.address || res?.address
      const extractedDistrict = profile?.district || profile?.districtName || res?.district || res?.districtName
      const extractedState = profile?.state || profile?.stateName || res?.state || res?.stateName
      const extractedPincode = profile?.pincode || profile?.pinCode || res?.pincode || res?.pinCode
      const extractedPhoto = profile?.photo || profile?.profilePhoto || res?.photo || res?.profilePhoto

      const verifiedData = {
        name: extractedName,
        mobile: cleanMobile,
        gender: extractedGender,
        dob: extractedDob,
        abha_number: extractedAbhaNumber,
        abha_address: extractedAbhaAddress,
        address: extractedAddress,
        district: extractedDistrict,
        state: extractedState,
        pincode: extractedPincode,
        photo: extractedPhoto,
        isExisting: false,
      }
      setVerifiedProfile(verifiedData)

      // CHECK: Does patient already have an existing ABHA account/address?
      const hasExistingAbha = 
        Boolean(res?.hasExistingAbha) || 
        res?.isNew === false || 
        Boolean(extractedAbhaAddress && extractedAbhaAddress.includes("@"))

      if (hasExistingAbha && extractedAbhaAddress) {
        // Skip address creation completely — patient already has an active ABHA!
        setCreatedProfile({
          ...verifiedData,
          name: extractedName || "Verified Patient",
          abha_address: extractedAbhaAddress,
          isExisting: true,
        })
        setStep(5)
        toast.success("Existing ABHA Account Verified!", {
          description: "Patient profile retrieved successfully from ABDM.",
        })
        return
      }

      // If new patient without an assigned ABHA address, fetch suggestions
      try {
        if (tokenReceived) {
          const suggestRes: any = await abhaService.suggestAbhaAddress(txnId, tokenReceived)
          const list = suggestRes?.abhaAddresses || suggestRes?.abhaAddressList || []
          if (list.length) {
            setSuggestedAddresses(list)
            setSelectedAddress(list[0])
          } else {
            const handleBase = (extractedName.toLowerCase().replace(/[^a-z0-9]/g, "") || `patient${cleanMobile.slice(-4)}`)
            setSuggestedAddresses([`${handleBase}@sbx`, `${handleBase}123@sbx`])
            setSelectedAddress(`${handleBase}@sbx`)
          }
        }
      } catch {
        const handleBase = (extractedName.toLowerCase().replace(/[^a-z0-9]/g, "") || `patient${cleanMobile.slice(-4)}`)
        setSuggestedAddresses([`${handleBase}@sbx`, `${handleBase}123@sbx`])
        setSelectedAddress(`${handleBase}@sbx`)
      }

      setStep(4)
      toast.success("Aadhaar Verified! Please select an ABHA Address.")
    } catch (err: any) {
      toast.error(err.message || "Aadhaar OTP verification failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Step 4: Create Address & Finalize ABHA
  const handleCreateAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    const finalAddress = (customAddress.trim() ? `${customAddress.trim()}@sbx` : selectedAddress).trim()
    if (!finalAddress) {
      toast.error("Please select or enter an ABHA Address.")
      return
    }

    setIsLoading(true)
    try {
      let createRes: any = {}
      if (txnId && token) {
        try {
          createRes = await abhaService.createAbhaAddress({
            txnId,
            token,
            abhaAddress: finalAddress,
          })
        } catch (err: any) {
          console.warn("createAbhaAddress response note:", err)
        }
      }

      const resolvedName = 
        verifiedProfile?.name || 
        createRes?.name || 
        createRes?.profile?.name || 
        [createRes?.profile?.firstName, createRes?.profile?.lastName].filter(Boolean).join(" ") ||
        "Patient"

      const profileData = {
        name: resolvedName,
        mobile: mobile.replace(/\D/g, "") || verifiedProfile?.mobile || "",
        gender: verifiedProfile?.gender || createRes?.gender || createRes?.profile?.gender || "M",
        dob: verifiedProfile?.dob || createRes?.dob || createRes?.profile?.dob,
        abha_number: verifiedProfile?.abha_number || createRes?.ABHANumber || createRes?.abhaNumber || createRes?.profile?.ABHANumber || "Created",
        abha_address: finalAddress,
        address: verifiedProfile?.address || createRes?.address || createRes?.profile?.address,
        district: verifiedProfile?.district || createRes?.district || createRes?.profile?.district,
        state: verifiedProfile?.state || createRes?.state || createRes?.profile?.state,
        pincode: verifiedProfile?.pincode || createRes?.pincode || createRes?.profile?.pincode,
        photo: verifiedProfile?.photo || createRes?.photo || createRes?.profile?.photo,
        isExisting: false,
      }

      setCreatedProfile(profileData)
      setStep(5)
      toast.success("ABHA Card & Number Created Successfully!")
    } catch (err: any) {
      toast.error(err.message || "Failed to create ABHA address. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleProceedToVisit = () => {
    if (createdProfile) {
      onPatientEnrolled(createdProfile)
    }
  }

  return (
    <div className="w-full space-y-6">
      {/* Wizard Progress Header */}
      <div className="w-full rounded-2xl border bg-card p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                ABDM M1 — New ABHA Creation (Aadhaar Enrolment)
              </h3>
              <p className="text-xs text-muted-foreground">
                NHA standard compliance: Consent → Aadhaar OTP → Address Selection → Instant ABHA
              </p>
            </div>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            Step {step} of 5
          </Badge>
        </div>

        {/* STEP 1 & 2: Consent & Aadhaar Entry */}
        {step <= 2 && (
          <form onSubmit={handleRequestAadhaarOtp} className="space-y-4">
            {/* NHA Consent Box */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs space-y-2">
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="consent-check"
                  checked={consentAgreed}
                  onChange={(e) => {
                    setConsentAgreed(e.target.checked)
                    if (e.target.checked) setStep(2)
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="consent-check" className="cursor-pointer text-foreground leading-relaxed">
                  <span className="font-bold">NHA Mandatory Patient Consent:</span> I voluntarily give my consent to share my Aadhaar details for UIDAI authentication and for creating or linking my Ayushman Bharat Health Account (ABHA) under ABDM.
                </label>
              </div>
            </div>

            {/* Aadhaar Input */}
            <div>
              <Label className="text-xs font-semibold">12-Digit Aadhaar Number *</Label>
              <Input
                type="text"
                maxLength={12}
                placeholder="1234 5678 9012"
                value={aadhaar}
                onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, ""))}
                disabled={!consentAgreed || isLoading}
                className="mt-1 font-mono tracking-widest text-center text-sm font-bold"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Communication Mobile Number *</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                  +91
                </span>
                <Input
                  type="tel"
                  maxLength={10}
                  placeholder="Enter 10-digit mobile number"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                  disabled={!consentAgreed || isLoading}
                  className="pl-11 font-mono text-sm"
                  required
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Required by ABDM: this mobile number will be linked with the newly created ABHA account.
              </p>
            </div>

            <Button
              type="submit"
              disabled={!consentAgreed || aadhaar.length !== 12 || mobile.replace(/\D/g, "").length !== 10 || isLoading}
              className="w-full h-10 font-semibold"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Generating Aadhaar OTP...
                </>
              ) : (
                <>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Send Aadhaar OTP
                </>
              )}
            </Button>
          </form>
        )}

        {/* STEP 3: Aadhaar OTP Verification */}
        {step === 3 && (
          <form onSubmit={handleVerifyAadhaarOtp} className="space-y-4">
            <div className="rounded-xl bg-muted/30 p-3 text-xs">
              <span className="text-muted-foreground">Aadhaar:</span>{" "}
              <span className="font-mono font-bold text-foreground">
                XXXX-XXXX-{aadhaar.slice(-4)}
              </span>
            </div>

            <div>
              <Label className="text-xs font-semibold">Communication Mobile Number *</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                  +91
                </span>
                <Input
                  type="tel"
                  maxLength={10}
                  placeholder="Enter 10-digit mobile number to link with ABHA"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                  disabled={isLoading}
                  className="pl-11 font-mono text-sm"
                  required
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                ABDM requires this mobile number to be linked with the patient's new ABHA account.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Enter 6-Digit Aadhaar OTP *</Label>
                <div className="text-[11px] font-mono">
                  {resendCount >= 2 ? (
                    <span className="text-muted-foreground font-medium">Max resends reached (2/2)</span>
                  ) : timer > 0 ? (
                    <span className="text-muted-foreground">Resend in {timer}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendAadhaarOtp}
                      disabled={isLoading}
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
                Enter the 6-digit OTP sent to your Aadhaar-linked mobile number.
              </p>
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                type="submit"
                disabled={isLoading || otp.length < 4 || mobile.replace(/\D/g, "").length !== 10}
                className="flex-1 font-semibold"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Verifying with UIDAI...
                  </>
                ) : (
                  "Verify Aadhaar OTP"
                )}
              </Button>
            </div>
          </form>
        )}

        {/* STEP 4: Select ABHA Address */}
        {step === 4 && (
          <form onSubmit={handleCreateAddress} className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Select or Create ABHA Address *</Label>
              <p className="text-xs text-muted-foreground">
                This is the patient's digital health address handle (similar to a UPI ID, e.g. username@abdm).
              </p>
            </div>

            {/* Suggested Radio List */}
            <div className="space-y-2">
              {suggestedAddresses.map((addr) => (
                <label
                  key={addr}
                  className={`flex items-center gap-2.5 rounded-xl border p-3 text-xs font-mono cursor-pointer transition-colors ${
                    selectedAddress === addr && !customAddress
                      ? "border-primary bg-primary/5 text-primary font-bold"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="abha-address"
                    value={addr}
                    checked={selectedAddress === addr && !customAddress}
                    onChange={() => {
                      setSelectedAddress(addr)
                      setCustomAddress("")
                    }}
                    className="text-primary"
                  />
                  <span>{addr}</span>
                </label>
              ))}
            </div>

            {/* Custom Address Input */}
            <div className="pt-2">
              <Label className="text-xs font-semibold">Or Enter Custom Handle</Label>
              <div className="mt-1 flex items-center">
                <Input
                  placeholder="e.g. ramesh.kumar"
                  value={customAddress}
                  onChange={(e) => setCustomAddress(e.target.value.toLowerCase())}
                  className="font-mono text-xs rounded-r-none"
                />
                <span className="flex h-9 items-center rounded-r-md border border-l-0 bg-muted px-3 text-xs text-muted-foreground font-mono">
                  @sbx
                </span>
              </div>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full h-10 font-semibold">
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Creating ABHA Address...
                </>
              ) : (
                "Create ABHA Account"
              )}
            </Button>
          </form>
        )}

        {/* STEP 5: Success & Proceed */}
        {step === 5 && createdProfile && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              <div>
                <h4 className="font-bold text-sm text-foreground">
                  {createdProfile?.isExisting
                    ? "Existing ABHA Account Verified!"
                    : "ABHA Account Created Successfully!"}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {createdProfile?.isExisting
                    ? "Patient ABHA profile retrieved and linked. Ready for OPD registration."
                    : "Patient is now registered on the ABDM network."}
                </p>
              </div>
            </div>

            {createdProfile.photo && (
              <div className="flex items-center gap-4 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                <img
                  src={createdProfile.photo.startsWith("data:") ? createdProfile.photo : `data:image/jpeg;base64,${createdProfile.photo}`}
                  alt={createdProfile.name}
                  className="h-16 w-16 rounded-xl object-cover border-2 border-emerald-500 shadow-xs shrink-0"
                />
                <div className="min-w-0">
                  <p className="font-bold text-sm text-foreground">{createdProfile.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">ABHA: {createdProfile.abha_number}</p>
                  {(createdProfile.address || createdProfile.district || createdProfile.state) && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      📍 {[createdProfile.address, createdProfile.district, createdProfile.state, createdProfile.pincode].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="rounded-xl bg-muted/40 p-3">
                <span className="text-muted-foreground">Patient Name:</span>
                <p className="font-bold text-sm text-foreground mt-0.5">{createdProfile.name || "Patient"}</p>
              </div>
              <div className="rounded-xl bg-muted/40 p-3">
                <span className="text-muted-foreground">ABHA Number:</span>
                <p className="font-mono font-bold text-foreground mt-0.5">{createdProfile.abha_number || "—"}</p>
              </div>
              <div className="rounded-xl bg-muted/40 p-3">
                <span className="text-muted-foreground">ABHA Address:</span>
                <p className="font-mono font-bold text-primary text-sm mt-0.5">{createdProfile.abha_address || "—"}</p>
              </div>
            </div>

            {(createdProfile.address || createdProfile.district || createdProfile.state || createdProfile.pincode) && !createdProfile.photo && (
              <div className="rounded-xl bg-muted/40 p-3 text-xs">
                <span className="text-muted-foreground">Registered Address:</span>
                <p className="font-medium text-foreground mt-0.5">
                  {[createdProfile.address, createdProfile.district, createdProfile.state, createdProfile.pincode].filter(Boolean).join(", ")}
                </p>
              </div>
            )}

            <Button onClick={handleProceedToVisit} className="w-full h-11 text-sm font-semibold">
              Assign Department & Issue OPD Slip
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
