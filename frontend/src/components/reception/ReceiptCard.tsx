import React from "react"
import { Printer, UserPlus, CheckCircle2, Building2, ShieldCheck, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export interface OpdReceiptData {
  queue_token: number | string
  opd_number: string
  uhid: string
  patient_name: string
  gender?: string
  age?: number | string
  mobile?: string
  abha_number?: string | null
  abha_address?: string | null
  department_name: string
  doctor_name?: string | null
  doctor_specialization?: string | null
  visit_date?: string
  fee_charged?: number
  discount?: number
  amount_paid?: number
  payment_method?: string | null
  payment_status?: string | null
  chief_complaint?: string | null
  slot_time?: string | null
  hospital_name?: string
  hospital_address?: string
}

interface ReceiptCardProps {
  receipt: OpdReceiptData
  onNextPatient: () => void
  onViewHistory?: () => void
  onPrint?: () => void
}

export const ReceiptCard: React.FC<ReceiptCardProps> = ({ receipt, onNextPatient, onViewHistory, onPrint }) => {
  const handlePrint = () => {
    if (onPrint) {
      onPrint()
    } else {
      window.print()
    }
  }

  const formattedDate = receipt.visit_date
    ? new Date(receipt.visit_date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })

  const formattedTime = new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })

  return (
    <div className="space-y-6">
      {/* Action Bar (Hidden in Print) */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 print:hidden">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <div>
            <h4 className="text-sm font-semibold text-emerald-950 dark:text-emerald-100">
              OPD Registration & Token Successful!
            </h4>
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              Token issued successfully. Print receipt slip for patient.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handlePrint} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Printer className="mr-2 h-4 w-4" />
            Print OPD Slip
          </Button>
          {onViewHistory && (
            <Button variant="outline" onClick={onViewHistory}>
              <History className="mr-2 h-4 w-4" />
              View Today's Tokens
            </Button>
          )}
          <Button variant="outline" onClick={onNextPatient}>
            <UserPlus className="mr-2 h-4 w-4" />
            Next Patient
          </Button>
        </div>
      </div>

      {/* Printable OPD Slip Paper Container */}
      <div
        id="opd-receipt-print-area"
        className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-6 shadow-md text-foreground print:m-0 print:max-w-none print:border-none print:p-4 print:shadow-none"
      >
        {/* Hospital Header */}
        <div className="border-b border-border/70 pb-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {receipt.hospital_name || "CITY HOSPITAL & HEALTH CENTRE"}
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {receipt.hospital_address || "Ayushman Bharat Digital Mission (ABDM) Integrated Facility"}
          </p>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary">
            <span>OUTPATIENT DEPARTMENT (OPD) SLIP</span>
          </div>
        </div>

        {/* Big Queue Token Banner */}
        <div className="my-4 flex items-center justify-between rounded-xl bg-primary/10 border border-primary/20 p-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Queue Token Number
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-primary font-mono">
                #{receipt.queue_token}
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                (Today's Token)
              </span>
            </div>
          </div>
          <div className="text-right space-y-1 font-mono text-xs">
            <div>
              <span className="text-muted-foreground">OPD No: </span>
              <span className="font-bold text-foreground">{receipt.opd_number}</span>
            </div>
            <div>
              <span className="text-muted-foreground">UHID: </span>
              <span className="font-bold text-foreground">{receipt.uhid}</span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              {formattedDate} • {formattedTime}
            </div>
          </div>
        </div>

        {/* Patient Details Grid */}
        <div className="space-y-3 border-b border-border/70 pb-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-muted-foreground">Patient Name:</span>
              <p className="font-bold text-sm text-foreground">{receipt.patient_name}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Age / Gender:</span>
              <p className="font-semibold text-foreground">
                {receipt.age ? `${receipt.age} Yrs` : "—"} / {receipt.gender || "—"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Contact Mobile:</span>
              <p className="font-semibold font-mono text-foreground">
                {receipt.mobile || "Not Provided"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">ABHA ID / Address:</span>
              {receipt.abha_address ? (
                <div className="flex items-center gap-1 font-mono text-primary font-semibold">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{receipt.abha_address}</span>
                </div>
              ) : (
                <p className="text-muted-foreground italic">No ABHA Linked</p>
              )}
            </div>
          </div>

          {receipt.abha_number && (
            <div className="rounded-md bg-muted/40 px-2.5 py-1 text-[11px] font-mono text-muted-foreground">
              ABHA Number: <span className="font-bold text-foreground">{receipt.abha_number}</span>
            </div>
          )}
        </div>

        {/* Department & Doctor Info */}
        <div className="my-4 space-y-2 border-b border-border/70 pb-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/30 p-2.5">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                Assigned Department
              </span>
              <p className="font-bold text-sm text-foreground mt-0.5">
                {receipt.department_name}
              </p>
            </div>
            <div className="rounded-lg bg-muted/30 p-2.5">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                Consulting Doctor
              </span>
              <p className="font-bold text-sm text-foreground mt-0.5">
                {receipt.doctor_name || "Doctor on Duty"}
              </p>
              {receipt.doctor_specialization && (
                <p className="text-[11px] text-muted-foreground">
                  {receipt.doctor_specialization}
                </p>
              )}
              {receipt.slot_time && (
                <p className="text-[11px] font-semibold text-primary mt-1">
                  🕒 Slot: {receipt.slot_time}
                </p>
              )}
            </div>
          </div>

          {receipt.chief_complaint && (
            <div className="pt-1">
              <span className="text-muted-foreground">Chief Complaint / Reason:</span>
              <p className="font-medium text-foreground italic mt-0.5">
                "{receipt.chief_complaint}"
              </p>
            </div>
          )}
        </div>

        {/* Billing & Fees */}
        <div className="flex items-center justify-between text-xs pt-1">
          <div>
            <span className="text-muted-foreground">Fee Paid: </span>
            <span className="font-bold text-sm text-foreground">
              ₹{(receipt.amount_paid ?? receipt.fee_charged ?? 0).toFixed(2)}
            </span>
            {receipt.payment_method && (
              <span className="text-muted-foreground ml-1 font-mono uppercase text-[11px]">
                ({receipt.payment_method})
              </span>
            )}
          </div>
          <div>
            <Badge
              variant="outline"
              className={
                receipt.payment_status === "paid"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-600"
              }
            >
              {receipt.payment_status?.toUpperCase() || "PAID"}
            </Badge>
          </div>
        </div>

        {/* Footer Instructions */}
        <div className="mt-6 border-t border-dashed border-border pt-3 text-center text-[10px] text-muted-foreground space-y-1">
          <p>Please proceed to the OPD Waiting Area and wait for your token number to be announced.</p>
          <p className="font-mono text-[9px]">Generated via National Health Authority ABDM HMIS Platform</p>
        </div>
      </div>
    </div>
  )
}
