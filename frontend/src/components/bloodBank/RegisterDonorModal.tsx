import React, { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { UserPlus, Search, ShieldCheck } from "lucide-react"

import { FormContainer } from "@/components/formContainer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

import { bloodBankService } from "@/services/bloodBankService"
import { patientService } from "@/services/patientService"
import { queryKeys } from "@/constants/queryKeys"
import type { BloodGroup } from "@/types/bloodBank"

interface RegisterDonorModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (donor: any) => void
}

export const RegisterDonorModal: React.FC<RegisterDonorModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient()

  const [name, setName] = useState("")
  const [mobile, setMobile] = useState("")
  const [email, setEmail] = useState("")
  const [gender, setGender] = useState<"M" | "F" | "O">("M")
  const [age, setAge] = useState<number>(26)
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>("O+")
  const [donorType, setDonorType] = useState<"voluntary" | "replacement">("voluntary")

  // Replacement Patient Linkage
  const [patientSearch, setPatientSearch] = useState("")
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null)
  const [selectedPatientName, setSelectedPatientName] = useState<string>("")
  const [selectedPatientUhid, setSelectedPatientUhid] = useState<string>("")

  // ABHA and ID Proof
  const [abhaNumber, setAbhaNumber] = useState("")
  const [abhaAddress, setAbhaAddress] = useState("")
  const [idProofType, setIdProofType] = useState("aadhaar")
  const [idProofNumber, setIdProofNumber] = useState("")
  const [city, setCity] = useState("New Delhi")

  // Search patients if replacement
  const { data: patientsData, isLoading: searchingPatients } = useQuery({
    queryKey: queryKeys.patients.list({ search: patientSearch }),
    queryFn: () => patientService.getPatients({ search: patientSearch, limit: 5 }),
    enabled: donorType === "replacement" && patientSearch.length >= 2 && !selectedPatientId,
  })

  const registerMutation = useMutation({
    mutationFn: () => {
      if (!name.trim()) throw new Error("Donor full name is required")
      if (!mobile.trim() || mobile.length < 10) throw new Error("Valid 10-digit mobile number required")
      if (age < 18 || age > 65) throw new Error("Donor age must be between 18 and 65 years")

      return bloodBankService.registerDonor({
        name: name.trim(),
        mobile: mobile.trim(),
        email: email.trim() || undefined,
        gender,
        age: Number(age),
        blood_group: bloodGroup,
        donor_type: donorType,
        patient_id: donorType === "replacement" ? selectedPatientId : undefined,
        patient_uhid: donorType === "replacement" ? selectedPatientUhid : undefined,
        abha_number: abhaNumber || undefined,
        abha_address: abhaAddress || undefined,
        id_proof_type: idProofType,
        id_proof_number: idProofNumber || undefined,
        city: city || undefined,
      })
    },
    onSuccess: (donor) => {
      toast.success(`Donor ${donor.name} (${donor.donor_number}) registered successfully!`)
      queryClient.invalidateQueries({ queryKey: queryKeys.bloodBank.all })
      handleReset()
      onClose()
      if (onSuccess) onSuccess(donor)
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to register donor")
    },
  })

  const handleReset = () => {
    setName("")
    setMobile("")
    setEmail("")
    setAge(26)
    setDonorType("voluntary")
    setSelectedPatientId(null)
    setSelectedPatientName("")
    setSelectedPatientUhid("")
    setPatientSearch("")
    setAbhaNumber("")
    setAbhaAddress("")
    setIdProofNumber("")
  }

  return (
    <FormContainer
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          handleReset()
          onClose()
        }
      }}
      title="Enroll New Blood Donor"
      description="Register voluntary or replacement donor with ABHA & Government ID verification"
      size="lg"
      footer={
        <div className="flex justify-between items-center w-full">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="gap-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            onClick={() => registerMutation.mutate()}
            disabled={registerMutation.isPending || !name || !mobile}
          >
            <UserPlus className="h-4 w-4" />
            {registerMutation.isPending ? "Registering..." : "Register Donor & Proceed"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-xs font-sans">
        {/* Donation Type Selector */}
        <div className="p-3 bg-muted/40 border rounded-xl space-y-2">
          <Label className="text-xs font-semibold">Donation Category *</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setDonorType("voluntary")
                setSelectedPatientId(null)
              }}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                donorType === "voluntary"
                  ? "bg-rose-50/70 dark:bg-rose-950/40 border-rose-500 font-bold text-rose-700 dark:text-rose-400"
                  : "bg-card hover:bg-muted text-muted-foreground"
              }`}
            >
              <div className="text-xs">Voluntary Donation</div>
              <div className="text-[10px] font-normal text-muted-foreground">Donating for general blood bank buffer stock</div>
            </button>

            <button
              type="button"
              onClick={() => setDonorType("replacement")}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                donorType === "replacement"
                  ? "bg-amber-50/70 dark:bg-amber-950/40 border-amber-500 font-bold text-amber-700 dark:text-amber-400"
                  : "bg-card hover:bg-muted text-muted-foreground"
              }`}
            >
              <div className="text-xs">Replacement / Relative Donation</div>
              <div className="text-[10px] font-normal text-muted-foreground">Donating in exchange for admitted inpatient</div>
            </button>
          </div>
        </div>

        {/* If Replacement: Patient Search */}
        {donorType === "replacement" && (
          <div className="p-3 bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl space-y-2">
            <Label className="text-xs font-semibold text-amber-900 dark:text-amber-300">
              Link Admitted Patient (Inpatient Replacement) *
            </Label>
            {selectedPatientId ? (
              <div className="flex items-center justify-between bg-card p-2 rounded-lg border">
                <div>
                  <span className="font-bold">{selectedPatientName}</span>
                  <span className="font-mono text-muted-foreground text-[11px] block">UHID: {selectedPatientUhid}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedPatientId(null)
                    setSelectedPatientName("")
                    setSelectedPatientUhid("")
                  }}
                  className="text-xs h-7"
                >
                  Change
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  placeholder="Search admitted patient by UHID or Name..."
                  className="pl-8 text-xs"
                />
                {searchingPatients && <span className="text-[10px] text-muted-foreground mt-0.5 block">Searching patient directory...</span>}

                {patientsData?.data && patientsData.data.length > 0 && (
                  <div className="mt-1 border rounded-lg bg-popover shadow-md divide-y max-h-40 overflow-y-auto">
                    {patientsData.data.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelectedPatientId(Number(p.id))
                          setSelectedPatientName(p.name)
                          setSelectedPatientUhid(p.uhid)
                          setPatientSearch("")
                        }}
                        className="p-2 hover:bg-muted cursor-pointer flex justify-between items-center text-xs"
                      >
                        <div>
                          <span className="font-bold">{p.name}</span>{" "}
                          <span className="font-mono text-muted-foreground text-[11px]">({p.uhid})</span>
                        </div>
                        <Badge variant="outline" className="text-[10px]">Select</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Primary Donor Demographics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Label className="text-xs font-semibold">Donor Full Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              className="mt-1 text-xs"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold">Blood Group *</Label>
            <select
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value as BloodGroup)}
              className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1 font-mono font-bold"
            >
              <option value="A+">A Positive (A+)</option>
              <option value="A-">A Negative (A-)</option>
              <option value="B+">B Positive (B+)</option>
              <option value="B-">B Negative (B-)</option>
              <option value="AB+">AB Positive (AB+)</option>
              <option value="AB-">AB Negative (AB-)</option>
              <option value="O+">O Positive (O+)</option>
              <option value="O-">O Negative (O-)</option>
            </select>
          </div>

          <div>
            <Label className="text-xs font-semibold">Mobile Number *</Label>
            <Input
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="10-digit mobile"
              maxLength={10}
              className="mt-1 text-xs font-mono"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold">Gender *</Label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as any)}
              className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1"
            >
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="O">Other</option>
            </select>
          </div>

          <div>
            <Label className="text-xs font-semibold">Age (18-65) *</Label>
            <Input
              type="number"
              min={18}
              max={65}
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              className="mt-1 text-xs font-mono"
            />
          </div>
        </div>

        {/* ABHA & Government ID Proof */}
        <div className="p-3 bg-muted/30 border rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <ShieldCheck className="h-4 w-4 text-sky-600" />
            <span>ABHA & Statutory KYC Verification (NBTC / e-RaktKosh)</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px]">ABHA Address</Label>
              <Input
                value={abhaAddress}
                onChange={(e) => setAbhaAddress(e.target.value)}
                placeholder="e.g. rahul@abdm"
                className="mt-1 text-xs font-mono"
              />
            </div>

            <div>
              <Label className="text-[11px]">14-Digit ABHA Number</Label>
              <Input
                value={abhaNumber}
                onChange={(e) => setAbhaNumber(e.target.value)}
                placeholder="XX-XXXX-XXXX-XXXX"
                className="mt-1 text-xs font-mono"
              />
            </div>

            <div>
              <Label className="text-[11px]">Govt ID Type</Label>
              <select
                value={idProofType}
                onChange={(e) => setIdProofType(e.target.value)}
                className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1"
              >
                <option value="aadhaar">Aadhaar Card</option>
                <option value="voter_id">Voter ID</option>
                <option value="driving_license">Driving License</option>
                <option value="passport">Passport</option>
                <option value="pan">PAN Card</option>
              </select>
            </div>

            <div>
              <Label className="text-[11px]">Govt ID Number</Label>
              <Input
                value={idProofNumber}
                onChange={(e) => setIdProofNumber(e.target.value)}
                placeholder="e.g. 5566-7788-9900"
                className="mt-1 text-xs font-mono"
              />
            </div>

            <div className="col-span-2">
              <Label className="text-[11px]">City / Location</Label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. New Delhi"
                className="mt-1 text-xs"
              />
            </div>
          </div>
        </div>
      </div>
    </FormContainer>
  )
}
