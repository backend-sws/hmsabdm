import React, { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Search,
  User,
  Bed,
  CreditCard,
  Plus,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  X,
  Calendar,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ipdService } from "@/services/ipdService"
import { insuranceService } from "@/services/insuranceService"

interface PatientAdmissionPickerProps {
  selectedAdmissionId?: string | number
  selectedPolicyId?: string | number
  onSelectionChange: (data: {
    admission: any | null
    policy: any | null
    payerId: string | number
  }) => void
}

export const PatientAdmissionPicker: React.FC<PatientAdmissionPickerProps> = ({
  selectedAdmissionId,
  selectedPolicyId,
  onSelectionChange,
}) => {
  const qc = useQueryClient()
  const [searchTerm, setSearchTerm] = useState("")
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [selectedAdmission, setSelectedAdmission] = useState<any | null>(null)
  const [selectedPolicy, setSelectedPolicy] = useState<any | null>(null)
  const [showAddPolicyForm, setShowAddPolicyForm] = useState(false)

  // New Policy Form State
  const [newPolicyData, setNewPolicyData] = useState({
    payer_id: "",
    policy_number: "",
    member_id: "",
    sum_insured: "500000",
    copay_percent: "0",
    deductible: "0",
  })

  // 1. Fetch Active Admitted Patients
  const { data: admissions = [], isLoading: admissionsLoading } = useQuery({
    queryKey: ["ipd", "admissions", "active", searchTerm],
    queryFn: () => ipdService.getAdmissions({ status: "admitted", search: searchTerm }),
  })

  // 2. Fetch Payers for the inline policy form
  const { data: payers = [] } = useQuery({
    queryKey: ["insurance", "payers"],
    queryFn: () => insuranceService.getPayers(),
  })

  // 3. Fetch Policies for Selected Patient
  const patientId = selectedAdmission?.patient?.id || selectedAdmission?.patient_id
  const {
    data: policies = [],
    isLoading: policiesLoading,
    refetch: refetchPolicies,
  } = useQuery({
    queryKey: ["insurance", "patient-policies", patientId],
    queryFn: () => (patientId ? insuranceService.getPatientPolicies(patientId) : Promise.resolve([])),
    enabled: !!patientId,
  })

  // Set initial admission if provided
  useEffect(() => {
    if (selectedAdmissionId && !selectedAdmission && admissions.length > 0) {
      const match = admissions.find((a: any) => String(a.id) === String(selectedAdmissionId))
      if (match) {
        setSelectedAdmission(match)
      }
    }
  }, [selectedAdmissionId, admissions, selectedAdmission])

  // Auto-select policy when policies load
  useEffect(() => {
    if (selectedAdmission && policies.length > 0) {
      // Find matching policy or default to primary/first
      let targetPolicy = null
      if (selectedPolicyId) {
        targetPolicy = policies.find((p: any) => String(p.id) === String(selectedPolicyId))
      }
      if (!targetPolicy) {
        targetPolicy = policies.find((p: any) => p.is_primary) || policies[0]
      }
      setSelectedPolicy(targetPolicy)
      onSelectionChange({
        admission: selectedAdmission,
        policy: targetPolicy,
        payerId: targetPolicy?.payer_id || "",
      })
    } else if (selectedAdmission && policies.length === 0 && !policiesLoading) {
      setSelectedPolicy(null)
      onSelectionChange({
        admission: selectedAdmission,
        policy: null,
        payerId: "",
      })
    }
  }, [selectedAdmission, policies, policiesLoading, selectedPolicyId])

  // Handle Admission Selection
  const handleSelectAdmission = (adm: any) => {
    setSelectedAdmission(adm)
    setIsDropdownOpen(false)
    setSearchTerm("")
    setSelectedPolicy(null)
    setShowAddPolicyForm(false)
  }

  // Handle Clear Selection
  const handleClearAdmission = () => {
    setSelectedAdmission(null)
    setSelectedPolicy(null)
    setShowAddPolicyForm(false)
    onSelectionChange({
      admission: null,
      policy: null,
      payerId: "",
    })
  }

  // Handle Policy Selection
  const handleSelectPolicy = (pol: any) => {
    setSelectedPolicy(pol)
    onSelectionChange({
      admission: selectedAdmission,
      policy: pol,
      payerId: pol.payer_id,
    })
  }

  // Add Policy Mutation
  const addPolicyMutation = useMutation({
    mutationFn: (payload: any) => insuranceService.addPatientPolicy(patientId, payload),
    onSuccess: (newPol: any) => {
      toast.success("Insurance policy linked to patient successfully")
      setShowAddPolicyForm(false)
      refetchPolicies()
      qc.invalidateQueries({ queryKey: ["insurance", "patient-policies", patientId] })
      if (newPol?.data || newPol) {
        const created = newPol.data || newPol
        setSelectedPolicy(created)
        onSelectionChange({
          admission: selectedAdmission,
          policy: created,
          payerId: created.payer_id,
        })
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to link policy")
    },
  })

  return (
    <div className="space-y-3 rounded-xl border border-border/80 bg-muted/20 p-3.5">
      {/* ── STEP 1: Search & Pick Admitted Inpatient ───────────────── */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
            <User className="h-3.5 w-3.5 text-primary" />
            Admitted Inpatient (Patient & IPD Admission) *
          </Label>
          {selectedAdmission && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-6 text-[11px] text-muted-foreground hover:text-foreground px-1.5"
              onClick={handleClearAdmission}
            >
              Change Patient
            </Button>
          )}
        </div>

        {!selectedAdmission ? (
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="pl-9 pr-8 h-9 text-xs bg-background"
                placeholder="Search admitted patient by Name, UHID, IPD #, or Mobile..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setIsDropdownOpen(true)
                }}
                onFocus={() => setIsDropdownOpen(true)}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Results Dropdown */}
            {isDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div className="absolute top-full left-0 right-0 mt-1 max-h-64 overflow-y-auto rounded-xl border border-border bg-popover shadow-xl z-50 divide-y divide-border/60">
                  {admissionsLoading && (
                    <div className="p-3 text-xs text-muted-foreground text-center">
                      Searching admitted patients...
                    </div>
                  )}

                  {!admissionsLoading && admissions.length === 0 && (
                    <div className="p-4 text-xs text-center text-muted-foreground">
                      No active inpatient admissions found matching "{searchTerm}".
                    </div>
                  )}

                  {!admissionsLoading &&
                    admissions.map((adm: any) => {
                      const p = adm.patient || {}
                      return (
                        <div
                          key={adm.id}
                          onClick={() => handleSelectAdmission(adm)}
                          className="p-2.5 hover:bg-muted/60 cursor-pointer transition-colors flex items-center justify-between text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground text-sm">
                                {p.name || "Unknown Patient"}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                ({p.gender || "—"}{p.age ? `, ${p.age}y` : ""})
                              </span>
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono">
                                {p.uhid || "No UHID"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                              <span className="font-mono text-primary font-medium">
                                {adm.ipd_number}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Bed className="h-3 w-3" />
                                {adm.ward?.name || "Ward"} — Bed {adm.bed?.bed_number || "—"}
                              </span>
                              {adm.doctor?.name && (
                                <>
                                  <span>•</span>
                                  <span>Dr. {adm.doctor.name}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-[10px]">
                            Select
                          </Badge>
                        </div>
                      )
                    })}
                </div>
              </>
            )}
          </div>
        ) : (
          /* Selected Patient Card */
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                {selectedAdmission.patient?.name?.[0] || "P"}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-sm text-foreground">
                    {selectedAdmission.patient?.name}
                  </h4>
                  <Badge variant="outline" className="font-mono text-[10px] py-0 px-1.5 border-primary/30 text-primary">
                    {selectedAdmission.patient?.uhid}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    ({selectedAdmission.patient?.gender || "—"}, {selectedAdmission.patient?.age || "—"}y)
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                  <span className="font-mono font-semibold text-foreground">
                    IPD: {selectedAdmission.ipd_number}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Bed className="h-3 w-3 text-primary" />
                    {selectedAdmission.ward?.name} (Bed {selectedAdmission.bed?.bed_number})
                  </span>
                  {selectedAdmission.admission_date && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Adm: {new Date(selectedAdmission.admission_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <Badge className="bg-emerald-600 text-white text-[10px] shrink-0">
              Admitted
            </Badge>
          </div>
        )}
      </div>

      {/* ── STEP 2: Patient Insurance Policy Auto-Detection ────────── */}
      {selectedAdmission && (
        <div className="pt-2 border-t border-border/60">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-primary" />
              Patient Insurance Policy *
            </Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-6 text-[11px] px-2 border-dashed"
              onClick={() => setShowAddPolicyForm(!showAddPolicyForm)}
            >
              <Plus className="h-3 w-3 mr-1" />
              {showAddPolicyForm ? "Cancel Add" : "+ Link New Policy"}
            </Button>
          </div>

          {/* Loading policies */}
          {policiesLoading && (
            <div className="h-12 bg-muted/40 rounded-lg animate-pulse" />
          )}

          {/* List of existing policies */}
          {!policiesLoading && policies.length > 0 && !showAddPolicyForm && (
            <div className="space-y-1.5">
              {policies.map((pol: any) => {
                const isSelected = selectedPolicy?.id === pol.id
                return (
                  <div
                    key={pol.id}
                    onClick={() => handleSelectPolicy(pol)}
                    className={`rounded-lg border p-2.5 cursor-pointer transition-all flex items-center justify-between text-xs ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-xs"
                        : "border-border bg-card hover:border-muted-foreground/30"
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {pol.payer?.name || "TPA / Insurer"}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-mono py-0">
                          {pol.policy_number || "Policy #"}
                        </Badge>
                        {pol.is_primary && (
                          <Badge className="bg-blue-600 text-[9px] py-0 px-1">Primary</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        {pol.member_id && <span>Card ID: <strong>{pol.member_id}</strong></span>}
                        {pol.sum_insured && (
                          <span>
                            Sum Insured: <strong className="text-foreground">₹{Number(pol.sum_insured).toLocaleString("en-IN")}</strong>
                          </span>
                        )}
                        <span>Co-pay: <strong>{pol.copay_percent || 0}%</strong></span>
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Alert if no policy exists */}
          {!policiesLoading && policies.length === 0 && !showAddPolicyForm && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 p-2.5 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>No insurance policy is linked to this patient yet.</span>
              </div>
              <Button
                type="button"
                size="sm"
                className="h-7 text-xs bg-amber-700 hover:bg-amber-800 text-white dark:bg-amber-600"
                onClick={() => setShowAddPolicyForm(true)}
              >
                <Plus className="h-3 w-3 mr-1" /> Add Policy Now
              </Button>
            </div>
          )}

          {/* Inline Add Policy Form */}
          {showAddPolicyForm && (
            <div className="rounded-xl border border-border bg-card p-3.5 space-y-3 text-xs animate-in slide-in-from-top-2 duration-150 shadow-sm">
              <h5 className="font-semibold text-xs flex items-center gap-1.5 text-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Link Policy for {selectedAdmission.patient?.name}
              </h5>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Insurance Company / TPA *</Label>
                  <Select
                    value={newPolicyData.payer_id}
                    onValueChange={(v) => setNewPolicyData((d) => ({ ...d, payer_id: v }))}
                  >
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue placeholder="Select Payer / Insurer" />
                    </SelectTrigger>
                    <SelectContent>
                      {payers.map((p: any) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name} ({p.payer_type?.toUpperCase()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Policy / Health ID # *</Label>
                  <Input
                    className="h-8 text-xs bg-background font-mono"
                    placeholder="e.g. STAR-IND-987654"
                    value={newPolicyData.policy_number}
                    onChange={(e) =>
                      setNewPolicyData((d) => ({ ...d, policy_number: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">TPA Member / Card ID</Label>
                  <Input
                    className="h-8 text-xs bg-background font-mono"
                    placeholder="e.g. MEM-12345"
                    value={newPolicyData.member_id}
                    onChange={(e) =>
                      setNewPolicyData((d) => ({ ...d, member_id: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Sum Insured (₹)</Label>
                  <Input
                    type="number"
                    className="h-8 text-xs bg-background"
                    placeholder="500000"
                    value={newPolicyData.sum_insured}
                    onChange={(e) =>
                      setNewPolicyData((d) => ({ ...d, sum_insured: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Co-Pay %</Label>
                  <Input
                    type="number"
                    className="h-8 text-xs bg-background"
                    placeholder="0"
                    value={newPolicyData.copay_percent}
                    onChange={(e) =>
                      setNewPolicyData((d) => ({ ...d, copay_percent: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => setShowAddPolicyForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 text-xs bg-primary text-primary-foreground"
                  disabled={
                    !newPolicyData.payer_id ||
                    !newPolicyData.policy_number ||
                    addPolicyMutation.isPending
                  }
                  onClick={() =>
                    addPolicyMutation.mutate({
                      ...newPolicyData,
                      payer_id: Number(newPolicyData.payer_id),
                      sum_insured: Number(newPolicyData.sum_insured || 0),
                      sum_insured_remaining: Number(newPolicyData.sum_insured || 0),
                      copay_percent: Number(newPolicyData.copay_percent || 0),
                      deductible: Number(newPolicyData.deductible || 0),
                      is_primary: true,
                    })
                  }
                >
                  {addPolicyMutation.isPending ? "Linking..." : "Save & Select Policy"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
