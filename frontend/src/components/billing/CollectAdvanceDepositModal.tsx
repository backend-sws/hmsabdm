import React, { useState, useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Receipt,
  Printer,
  Search,
  User,
  ShieldCheck,
  Banknote,
  QrCode,
  CreditCard,
} from "lucide-react"

import { FormContainer } from "@/components/formContainer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

import { billingService } from "@/services/billingService"
import { patientService } from "@/services/patientService"
import { queryKeys } from "@/constants/queryKeys"
import type { AdvanceDepositReceiptData } from "@/types/billing"

interface CollectAdvanceDepositModalProps {
  isOpen: boolean
  onClose: () => void
  defaultPatientId?: number
  defaultEncounterType?: "ipd" | "emergency" | "opd"
  defaultEncounterId?: number
  onSuccess?: () => void
}

export const CollectAdvanceDepositModal: React.FC<CollectAdvanceDepositModalProps> = ({
  isOpen,
  onClose,
  defaultPatientId,
  defaultEncounterType = "ipd",
  defaultEncounterId,
  onSuccess,
}) => {
  const queryClient = useQueryClient()

  // Form states
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(defaultPatientId ?? null)
  const [patientSearch, setPatientSearch] = useState("")
  const [encounterType, setEncounterType] = useState<"ipd" | "emergency" | "opd">(defaultEncounterType)
  const [encounterId, setEncounterId] = useState<number | undefined>(defaultEncounterId)
  const [amount, setAmount] = useState<number | "">("")
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "card" | "cheque" | "bank_transfer">("cash")
  const [reference, setReference] = useState("")
  const [notes, setNotes] = useState("")

  // Receipt view state after successful submission
  const [receiptData, setReceiptData] = useState<AdvanceDepositReceiptData | null>(null)

  useEffect(() => {
    if (defaultPatientId) {
      setSelectedPatientId(defaultPatientId)
    }
    if (defaultEncounterType) {
      setEncounterType(defaultEncounterType)
    }
    if (defaultEncounterId) {
      setEncounterId(defaultEncounterId)
    }
  }, [defaultPatientId, defaultEncounterType, defaultEncounterId])

  // Patient live search
  const { data: patientsData, isLoading: searchingPatients } = useQuery({
    queryKey: queryKeys.patients.list({ search: patientSearch }),
    queryFn: () => patientService.getPatients({ search: patientSearch, limit: 5 }),
    enabled: patientSearch.length >= 2 && !selectedPatientId,
  })

  // Selected patient details query if patientId is set
  const { data: selectedPatient } = useQuery({
    queryKey: queryKeys.patients.detail(selectedPatientId || 0),
    queryFn: () => patientService.getPatient(selectedPatientId!),
    enabled: !!selectedPatientId,
  })

  // Mutation
  const depositMutation = useMutation({
    mutationFn: () => {
      if (!selectedPatientId) throw new Error("Please select a patient")
      if (!amount || Number(amount) <= 0) throw new Error("Please enter a valid deposit amount")

      return billingService.collectDeposit({
        patient_id: selectedPatientId,
        amount: Number(amount),
        encounter_type: encounterType,
        encounter_id: encounterId,
        payment_method: paymentMethod,
        transaction_reference: reference || undefined,
        notes: notes || undefined,
      })
    },
    onSuccess: (res) => {
      toast.success(`Advance deposit of ₹${Number(amount).toLocaleString("en-IN")} collected!`)
      setReceiptData(res)
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.patientLedger(selectedPatientId!) })
      if (onSuccess) onSuccess()
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to record advance deposit")
    },
  })

  const handleResetAndClose = () => {
    setReceiptData(null)
    setAmount("")
    setReference("")
    setNotes("")
    onClose()
  }

  const presetAmounts = [5000, 10000, 20000, 50000]

  return (
    <FormContainer
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleResetAndClose()
      }}
      title={receiptData ? "Advance Deposit Voucher Receipt" : "Collect Patient Advance Deposit"}
      description={
        receiptData
          ? `Official hospital payment voucher #${receiptData.voucher_number}`
          : "Record advance deposit against patient ledger and generate ABDM/NABH compliant receipt"
      }
      size="lg"
      footer={
        receiptData ? (
          <div className="flex justify-between items-center w-full">
            <Button variant="outline" size="sm" onClick={handleResetAndClose}>
              Close Window
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setReceiptData(null)
                  setAmount("")
                  setReference("")
                }}
              >
                Collect Another Deposit
              </Button>
              <Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Print Voucher Slip
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" size="sm" onClick={handleResetAndClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => depositMutation.mutate()}
              disabled={depositMutation.isPending || !selectedPatientId || !amount || Number(amount) <= 0}
            >
              <Receipt className="h-4 w-4" />
              {depositMutation.isPending ? "Generating Voucher..." : "Collect Deposit & Print Slip"}
            </Button>
          </div>
        )
      }
    >
      {/* ────────────────────────────────────────────────────────────────
          VIEW 1: FORM INPUTS
         ──────────────────────────────────────────────────────────────── */}
      {!receiptData && (
        <div className="space-y-4 text-xs">
          {/* Patient Selection Card */}
          <div className="p-3 bg-muted/40 border rounded-xl space-y-2">
            <Label className="text-xs font-semibold flex items-center justify-between">
              <span>Patient Identification *</span>
              {selectedPatient && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPatientId(null)
                    setPatientSearch("")
                  }}
                  className="text-primary hover:underline text-[11px]"
                >
                  Change Patient
                </button>
              )}
            </Label>

            {selectedPatient ? (
              <div className="flex items-center justify-between bg-card p-2.5 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-bold text-foreground text-sm flex items-center gap-2">
                      {selectedPatient.name}
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {selectedPatient.uhid}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span>Mob: {selectedPatient.mobile || "N/A"}</span>
                      {selectedPatient.abha_number && (
                        <span className="text-sky-600 dark:text-sky-400 font-mono flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" /> ABHA: {selectedPatient.abha_number}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                  Active
                </Badge>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search patient by UHID, Name, or Mobile..."
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  className="pl-8 text-xs"
                />
                {searchingPatients && <span className="text-[10px] text-muted-foreground mt-1 block">Searching patient directory...</span>}

                {patientsData?.data && patientsData.data.length > 0 && (
                  <div className="mt-1 border rounded-lg bg-popover shadow-md divide-y max-h-48 overflow-y-auto">
                    {patientsData.data.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelectedPatientId(Number(p.id))
                          setPatientSearch("")
                        }}
                        className="p-2 hover:bg-muted cursor-pointer flex justify-between items-center text-xs"
                      >
                        <div>
                          <span className="font-bold">{p.name}</span>{" "}
                          <span className="font-mono text-muted-foreground text-[11px]">({p.uhid})</span>
                          <span className="text-[10px] text-muted-foreground block">{p.mobile || "No Mobile"}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px]">Select</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Encounter Type Selector */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Encounter Dept *</Label>
              <select
                value={encounterType}
                onChange={(e) => setEncounterType(e.target.value as any)}
                className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1 font-semibold"
              >
                <option value="ipd">IPD (Inpatient Admission)</option>
                <option value="emergency">Emergency (Casualty)</option>
                <option value="opd">OPD / Diagnostic Advance</option>
              </select>
            </div>

            <div>
              <Label className="text-xs">Payment Method *</Label>
              <div className="grid grid-cols-3 gap-1.5 mt-1">
                <Button
                  type="button"
                  variant={paymentMethod === "cash" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPaymentMethod("cash")}
                  className="text-xs gap-1.5 h-8 font-semibold"
                >
                  <Banknote className="h-3.5 w-3.5" /> Cash
                </Button>
                <Button
                  type="button"
                  variant={paymentMethod === "upi" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPaymentMethod("upi")}
                  className="text-xs gap-1.5 h-8 font-semibold"
                >
                  <QrCode className="h-3.5 w-3.5" /> UPI / QR
                </Button>
                <Button
                  type="button"
                  variant={paymentMethod === "card" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPaymentMethod("card")}
                  className="text-xs gap-1.5 h-8 font-semibold"
                >
                  <CreditCard className="h-3.5 w-3.5" /> Card / POS
                </Button>
              </div>
            </div>
          </div>

          {/* Deposit Amount Input & Presets */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Deposit Amount (₹) *</Label>
            <div className="relative">
              <span className="absolute left-3 top-2 font-bold text-muted-foreground text-sm">₹</span>
              <Input
                type="number"
                min="1"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                className="pl-7 text-sm font-bold font-mono"
              />
            </div>
            <div className="flex gap-2 pt-1">
              {presetAmounts.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset)}
                  className="px-2.5 py-1 text-[11px] font-mono font-medium rounded-md border bg-muted/50 hover:bg-muted text-foreground transition-colors"
                >
                  +₹{preset.toLocaleString("en-IN")}
                </button>
              ))}
            </div>
          </div>

          {/* Reference / Remarks */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Txn Reference / Cheque No.</Label>
              <Input
                placeholder="e.g. UPI-TXN-129988 / POS-Auth-4412"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="mt-1 text-xs font-mono"
              />
            </div>
            <div>
              <Label className="text-xs">Remarks / Purpose</Label>
              <Input
                placeholder="e.g. Pre-surgery advance deposit"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────
          VIEW 2: PRINTABLE VOUCHER RECEIPT
         ──────────────────────────────────────────────────────────────── */}
      {receiptData && (
        <div className="p-5 border rounded-2xl bg-white text-slate-900 font-sans print:p-0 print:border-none space-y-4 text-xs">
          {/* Header */}
          <div className="text-center border-b pb-3">
            <div className="font-extrabold text-base uppercase tracking-wider text-slate-950">
              {receiptData.hospital.name}
            </div>
            <div className="text-[11px] text-slate-600">
              {receiptData.hospital.address} • Contact: {receiptData.hospital.phone || "011-45000000"}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              ABDM HIP ID: <span className="font-bold">{receiptData.hospital.abdm_hip_id}</span> • NABH ACCREDITED
            </div>
            <div className="mt-2 inline-block px-3 py-1 bg-slate-900 text-white rounded font-bold text-[11px] tracking-widest uppercase">
              OFFICIAL ADVANCE DEPOSIT VOUCHER
            </div>
          </div>

          {/* Voucher & Patient Info Matrix */}
          <div className="grid grid-cols-2 gap-4 text-xs border-b pb-3 bg-slate-50 p-3 rounded-lg border">
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-bold">VOUCHER NUMBER</span>
              <span className="font-mono font-bold text-sm text-slate-900">{receiptData.voucher_number}</span>
              <span className="text-[10px] text-slate-500 block mt-1">DATE & TIME</span>
              <span className="font-medium">{new Date(receiptData.receipt_date).toLocaleString()}</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-bold">PATIENT NAME & UHID</span>
              <span className="font-bold text-sm text-slate-900">{receiptData.patient.name}</span>
              <span className="font-mono text-xs block text-slate-700">UHID: {receiptData.patient.uhid}</span>
              {receiptData.patient.abha_address && (
                <span className="text-[10px] text-sky-700 font-mono block">
                  ABHA: {receiptData.patient.abha_address}
                </span>
              )}
            </div>
          </div>

          {/* Department / Encounter Context */}
          {receiptData.encounter_type === "IPD" && (
            <div className="grid grid-cols-3 gap-2 text-[11px] p-2 bg-slate-100 rounded border">
              <div>
                <span className="text-slate-500 block text-[9px] uppercase">IPD NUMBER</span>
                <span className="font-mono font-bold">{receiptData.ipd_number || "Under Allotment"}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px] uppercase">WARD</span>
                <span className="font-medium">{receiptData.ward_name || "General Ward"}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px] uppercase">BED</span>
                <span className="font-medium">{receiptData.bed_number || "B-01"}</span>
              </div>
            </div>
          )}

          {/* Amount Box */}
          <div className="border-2 border-slate-900 rounded-xl p-4 text-center bg-slate-50 space-y-1.5">
            <div className="text-[11px] text-slate-600 font-medium uppercase tracking-wider">
              AMOUNT RECEIVED WITH THANKS
            </div>
            <div className="font-mono font-extrabold text-2xl text-slate-950">
              ₹{receiptData.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] font-semibold text-slate-700 italic">
              ({receiptData.amount_in_words})
            </div>
            <div className="text-[11px] text-slate-600 pt-1 flex justify-center items-center gap-3">
              <span>Mode: <strong className="uppercase">{receiptData.payment_method}</strong></span>
              {receiptData.transaction_reference && (
                <span className="font-mono">Ref: {receiptData.transaction_reference}</span>
              )}
            </div>
          </div>

          {/* Cumulative Balance Note */}
          <div className="flex justify-between items-center p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs">
            <span>Cumulative Advance Deposit on Record:</span>
            <span className="font-mono font-bold text-sm">
              ₹{receiptData.total_advance_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Signatures */}
          <div className="pt-8 flex justify-between items-end text-xs text-slate-600">
            <div>
              <div className="border-t border-slate-400 w-36 pt-1 text-center text-[10px]">
                Depositor's Signature
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-slate-900">{receiptData.cashier.name}</div>
              <div className="text-[10px] text-slate-500">Authorized Cashier / Accounts</div>
              <div className="border-t border-slate-400 w-44 pt-1 text-center text-[10px] mt-1">
                Hospital Billing Desk Stamp
              </div>
            </div>
          </div>

          {/* Footer disclaimer */}
          <div className="text-[9px] text-slate-400 text-center border-t pt-2">
            * This is an official computer-generated receipt issued in compliance with ABDM National Health Stack standards. Advance payments are adjusted in final discharge tax invoices.
          </div>
        </div>
      )}
    </FormContainer>
  )
}
