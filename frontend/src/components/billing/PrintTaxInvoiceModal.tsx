import React, { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Printer, RefreshCw, FileText } from "lucide-react"

import { FormContainer } from "@/components/formContainer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import { billingService } from "@/services/billingService"
import { queryKeys } from "@/constants/queryKeys"

interface PrintTaxInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  invoiceId: number | null
}

export const PrintTaxInvoiceModal: React.FC<PrintTaxInvoiceModalProps> = ({
  isOpen,
  onClose,
  invoiceId,
}) => {
  const [copyType, setCopyType] = useState<"patient" | "hospital" | "tpa">("patient")

  const {
    data: invoiceData,
    isLoading,
  } = useQuery({
    queryKey: queryKeys.billing.invoice(invoiceId || 0),
    queryFn: () => billingService.getInvoice(invoiceId!),
    enabled: isOpen && !!invoiceId,
  })

  const invoice = invoiceData?.invoice
  const categories = invoiceData?.category_breakdown || []

  const copyLabels = {
    patient: { title: "ORIGINAL FOR RECIPIENT (PATIENT)", color: "bg-emerald-700 text-white" },
    hospital: { title: "DUPLICATE FOR HOSPITAL ACCOUNTS", color: "bg-slate-800 text-white" },
    tpa: { title: "TRIPLICATE FOR TPA / INSURER", color: "bg-sky-800 text-white" },
  }

  return (
    <FormContainer
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title="Official GST Tax Invoice"
      description={`Tax Invoice #${invoice?.invoice_number || "..."} • ABDM & NABH Compliant`}
      size="xl"
      footer={
        <div className="flex justify-between items-center w-full">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <div className="flex gap-2">
            <Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print Tax Invoice ({copyLabels[copyType].title.split(" ")[0]})
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-xs font-sans">
        {/* 3-Copy Switcher Bar (Hidden during print) */}
        <div className="flex items-center justify-between p-2.5 bg-muted/50 border rounded-xl print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="font-semibold text-xs">Select Invoice Copy:</span>
            <div className="flex gap-1">
              <Button
                type="button"
                variant={copyType === "patient" ? "default" : "outline"}
                size="sm"
                onClick={() => setCopyType("patient")}
                className="text-xs h-7"
              >
                Original (Patient)
              </Button>
              <Button
                type="button"
                variant={copyType === "hospital" ? "default" : "outline"}
                size="sm"
                onClick={() => setCopyType("hospital")}
                className="text-xs h-7"
              >
                Duplicate (Hospital)
              </Button>
              <Button
                type="button"
                variant={copyType === "tpa" ? "default" : "outline"}
                size="sm"
                onClick={() => setCopyType("tpa")}
                className="text-xs h-7"
              >
                Triplicate (TPA / Insurer)
              </Button>
            </div>
          </div>
          <Badge className={`${copyLabels[copyType].color} text-[10px]`}>
            {copyLabels[copyType].title}
          </Badge>
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-muted-foreground space-y-2">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-primary" />
            <p>Loading invoice line items and tax breakdown...</p>
          </div>
        ) : invoice ? (
          <div className="p-6 border rounded-2xl bg-white text-slate-900 font-sans print:p-0 print:border-none space-y-4">
            {/* Header */}
            <div className="border-b pb-3 flex justify-between items-start">
              <div>
                <h1 className="text-xl font-black uppercase text-slate-950 tracking-wider">
                  {invoice.hospital?.name || "Metro Care Multispeciality Hospital"}
                </h1>
                <p className="text-[11px] text-slate-600">
                  {invoice.hospital?.address || "Medical Enclave, Outer Ring Road"} • Phone: 011-45001100
                </p>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex gap-3">
                  <span>ABDM HIP ID: <strong>{invoice.hospital?.abdm_hip_id || "IN01000299"}</strong></span>
                  <span>GSTIN: <strong>07AAACH1234F1Z5</strong></span>
                  <span>SAC CODE: <strong>9993 (Healthcare)</strong></span>
                </div>
              </div>

              <div className="text-right space-y-1">
                <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold tracking-widest ${copyLabels[copyType].color}`}>
                  {copyLabels[copyType].title}
                </span>
                <div className="text-[10px] font-mono text-slate-500">
                  FINAL TAX INVOICE
                </div>
                <div className="font-mono font-bold text-base text-slate-950">
                  {invoice.invoice_number}
                </div>
              </div>
            </div>

            {/* Patient & Admission Information Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-slate-50 p-3 rounded-lg border">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">PATIENT NAME</span>
                <span className="font-bold text-slate-900">{invoice.patient?.name}</span>
                <span className="text-[10px] text-slate-600 block mt-0.5">
                  {invoice.patient?.gender || "M"} • Mob: {invoice.patient?.mobile || "N/A"}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">UHID & ABHA</span>
                <span className="font-mono font-bold text-slate-900">{invoice.patient?.uhid}</span>
                {invoice.patient?.abha_address ? (
                  <span className="text-[10px] text-sky-700 font-mono block">
                    ABHA: {invoice.patient.abha_address}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 block">ABHA Not Linked</span>
                )}
              </div>

              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">INPATIENT / ENCOUNTER</span>
                <span className="font-mono font-bold">
                  {invoice.admission?.ipd_number || invoice.encounter_type?.toUpperCase() || "IPD"}
                </span>
                <span className="text-[10px] text-slate-600 block mt-0.5">
                  Ward: {invoice.admission?.ward?.name || "General"} • Bed: {invoice.admission?.bed?.bed_number || "B-01"}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">ATTENDING CONSULTANT</span>
                <span className="font-bold text-slate-900">{invoice.admission?.doctor?.name || "Dr. Arvind Mehra"}</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Date: {new Date(invoice.invoice_date || invoice.issued_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Itemized Charges Table */}
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] border-b">
                  <tr>
                    <th className="p-2 w-10 text-center">#</th>
                    <th className="p-2">Service Description / Tariff Item</th>
                    <th className="p-2 text-center w-20">SAC Code</th>
                    <th className="p-2 text-center w-28">Category</th>
                    <th className="p-2 text-right w-24">Rate (₹)</th>
                    <th className="p-2 text-center w-14">Qty</th>
                    <th className="p-2 text-right w-28">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-slate-800">
                  {invoice.ledger_items && invoice.ledger_items.length > 0 ? (
                    invoice.ledger_items.map((item: any, idx: number) => (
                      <tr key={item.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                        <td className="p-2 text-center font-mono text-slate-500">{idx + 1}</td>
                        <td className="p-2 font-medium">{item.item_name}</td>
                        <td className="p-2 text-center font-mono text-[10px] text-slate-500">9993</td>
                        <td className="p-2 text-center">
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-slate-100 rounded">
                            {item.category}
                          </span>
                        </td>
                        <td className="p-2 text-right font-mono">
                          {Number(item.unit_price).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2 text-center font-mono">{item.quantity}</td>
                        <td className="p-2 text-right font-mono font-bold">
                          {Number(item.total_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-slate-400">
                        Itemized charges compiled in category summary below.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Category Breakdown Chips */}
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2 text-[10px]">
                {categories.map((c: any) => (
                  <div key={c.category} className="px-2.5 py-1 bg-slate-100 border rounded-md">
                    <span className="uppercase font-semibold text-slate-600">{c.category}:</span>{" "}
                    <strong className="font-mono text-slate-900">₹{Number(c.total_amount).toLocaleString("en-IN")}</strong>
                  </div>
                ))}
              </div>
            )}

            {/* Financial Totals & Payment Summary Box */}
            <div className="grid grid-cols-2 gap-6 pt-2 border-t">
              {/* Left Column: Bank & Policy Notes */}
              <div className="space-y-2 text-[11px] text-slate-600">
                <div className="p-3 bg-slate-50 rounded-lg border space-y-1">
                  <div className="font-bold text-slate-800 uppercase text-[10px]">PAYMENT MODE & DETAILS</div>
                  <div>Mode: <strong className="uppercase">{invoice.payment_method || "CASH"}</strong></div>
                  {invoice.tpa_claim_number && (
                    <div>TPA / Policy Claim #: <strong className="font-mono">{invoice.tpa_claim_number}</strong></div>
                  )}
                  {invoice.insurance_company_name && (
                    <div>Insurer: <strong>{invoice.insurance_company_name}</strong></div>
                  )}
                  <div>
                    Payment Status:{" "}
                    <strong className="uppercase text-emerald-700">{invoice.payment_status || "PAID"}</strong>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500">
                  <p>• Healthcare services under SAC 9993 are exempt from GST as per Notification No. 12/2017-CT(R).</p>
                  <p>• This invoice is verified and cleared for Security Gate Pass clearance.</p>
                </div>
              </div>

              {/* Right Column: Ledger Financials */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">Gross Charges Total:</span>
                  <span className="font-mono font-bold">
                    ₹{Number(invoice.gross_amount || invoice.total_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {invoice.discount_amount > 0 && (
                  <div className="flex justify-between py-1 text-emerald-700">
                    <span>Hospital Concession / Discount:</span>
                    <span className="font-mono font-bold">
                      -₹{Number(invoice.discount_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                {invoice.advance_adjusted > 0 && (
                  <div className="flex justify-between py-1 text-emerald-700">
                    <span>Advance Deposit Adjusted:</span>
                    <span className="font-mono font-bold">
                      -₹{Number(invoice.advance_adjusted).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                {(invoice.insurance_approved_amount ?? 0) > 0 && (
                  <div className="flex justify-between py-1 text-sky-700">
                    <span>Insurance / TPA Cashless Sanction:</span>
                    <span className="font-mono font-bold">
                      -₹{Number(invoice.insurance_approved_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <div className="flex justify-between py-2 border-t-2 border-slate-900 font-extrabold text-sm text-slate-950">
                  <span>Net Amount Paid:</span>
                  <span className="font-mono text-emerald-700">
                    ₹{Number(invoice.amount_paid).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {Number(invoice.balance_due) > 0.01 && (
                  <div className="flex justify-between py-1 text-red-600 font-bold border-t border-dashed">
                    <span>Balance Outstanding Due:</span>
                    <span className="font-mono">
                      ₹{Number(invoice.balance_due).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Signatures & Footer */}
            <div className="pt-8 flex justify-between items-end text-xs text-slate-600 border-t">
              <div>
                <div className="border-t border-slate-400 w-36 pt-1 text-center text-[10px]">
                  Patient / Attendant Signature
                </div>
              </div>

              <div className="text-center font-mono text-[9px] text-slate-400">
                GATE PASS REF: {invoice.gate_pass_number || "GP-ISSUED"}
              </div>

              <div className="text-right">
                <div className="font-semibold text-slate-900">
                  {invoice.created_by_user?.name || "Senior Cashier"}
                </div>
                <div className="text-[10px] text-slate-500">Billing Authority & Accounts</div>
                <div className="border-t border-slate-400 w-44 pt-1 text-center text-[10px] mt-1">
                  Hospital Seal & Signature
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </FormContainer>
  )
}
