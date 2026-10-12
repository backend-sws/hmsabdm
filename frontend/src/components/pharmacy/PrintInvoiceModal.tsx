import React, { useState } from "react"
import { X, Printer, FileText } from "lucide-react"
import type { PharmacySale } from "@/types/pharmacy"

interface PrintInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  sale: PharmacySale
}

export const PrintInvoiceModal: React.FC<PrintInvoiceModalProps> = ({
  isOpen,
  onClose,
  sale,
}) => {
  const [printFormat, setPrintFormat] = useState<"a4" | "thermal">("thermal")

  const formattedDateTime = sale.created_at
    ? new Date(sale.created_at).toLocaleString("en-IN")
    : ""
  const formattedDate = sale.created_at
    ? new Date(sale.created_at).toLocaleDateString("en-IN")
    : ""

  if (!isOpen) return null

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm print:p-0">
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-border dark:bg-card print:max-h-none print:w-full print:border-none print:shadow-none">
        {/* Modal Actions Bar (Hidden during print) */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-border print:hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Pharmacy Tax Invoice ({sale.invoice_number})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                GST Tax Compliant Medication Slip
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setPrintFormat("thermal")}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                  printFormat === "thermal"
                    ? "bg-white text-slate-900 shadow-sm dark:bg-card dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                }`}
              >
                80mm Thermal
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat("a4")}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                  printFormat === "a4"
                    ? "bg-white text-slate-900 shadow-sm dark:bg-card dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                }`}
              >
                A4 / A5 Slip
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-lg shadow-primary/25 hover:bg-primary/90"
            >
              <Printer className="h-4 w-4" />
              Print Invoice
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Invoice Printable Viewport */}
        <div className="custom-scrollbar flex-1 overflow-y-auto p-6 print:p-0">
          {printFormat === "thermal" ? (
            /* 80mm THERMAL RECEIPT FORMAT */
            <div className="mx-auto w-[320px] rounded-lg border border-dashed border-slate-300 bg-white p-4 font-mono text-xs text-black shadow-inner print:w-full print:border-none print:p-0">
              {/* Header */}
              <div className="text-center">
                <h1 className="text-sm font-bold uppercase tracking-wider">
                  HOSPITAL PHARMACY DISPENSARY
                </h1>
                <p className="text-[10px] text-slate-600">DL No: 20B/21B-HP-2026-9041</p>
                <p className="text-[10px] text-slate-600">GSTIN: 07AAAAA0000A1Z5</p>
                <div className="my-2 border-b border-dashed border-black"></div>
                <h2 className="text-xs font-bold uppercase">RETAIL TAX INVOICE</h2>
              </div>

              {/* Meta Info */}
              <div className="my-2 space-y-0.5 text-[11px]">
                <div className="flex justify-between">
                  <span>Inv #:</span>
                  <span className="font-bold">{sale.invoice_number}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span>{formattedDateTime}</span>
                </div>
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span className="font-bold">{sale.customer_name}</span>
                </div>
                {sale.customer_phone && (
                  <div className="flex justify-between">
                    <span>Mobile:</span>
                    <span>{sale.customer_phone}</span>
                  </div>
                )}
                {sale.doctor_name && (
                  <div className="flex justify-between">
                    <span>Dr Name:</span>
                    <span>{sale.doctor_name}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Pay Mode:</span>
                  <span className="font-bold">{sale.payment_mode}</span>
                </div>
              </div>

              <div className="my-2 border-b border-dashed border-black"></div>

              {/* Items Table */}
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-dashed border-black text-left">
                    <th className="py-1">Item</th>
                    <th className="py-1 text-center">Qty</th>
                    <th className="py-1 text-right">Rate</th>
                    <th className="py-1 text-right">Amt</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.items?.map((item, idx) => (
                    <React.Fragment key={item.id || idx}>
                      <tr>
                        <td className="pt-1.5 font-bold" colSpan={4}>
                          {item.medicine?.brand_name || "Medicine"}
                        </td>
                      </tr>
                      <tr className="text-[10px] text-slate-600">
                        <td>B:{item.batch_number} Exp:{item.expiry_date}</td>
                        <td className="text-center font-bold">{item.quantity}</td>
                        <td className="text-right">₹{item.unit_price}</td>
                        <td className="text-right font-bold">₹{item.total_amount}</td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>

              <div className="my-2 border-b border-dashed border-black"></div>

              {/* Financial Breakdown */}
              <div className="space-y-0.5 text-[11px]">
                <div className="flex justify-between">
                  <span>Taxable Value:</span>
                  <span>₹{sale.taxable_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>CGST:</span>
                  <span>₹{sale.cgst_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>SGST:</span>
                  <span>₹{sale.sgst_amount.toFixed(2)}</span>
                </div>
                {sale.discount_amount > 0 && (
                  <div className="flex justify-between font-bold">
                    <span>Discount:</span>
                    <span>-₹{sale.discount_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="my-1 border-b border-black"></div>
                <div className="flex justify-between text-sm font-bold">
                  <span>NET TOTAL:</span>
                  <span>₹{sale.net_amount.toFixed(2)}</span>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-4 text-center text-[10px] text-slate-600">
                <p>Goods once sold can be returned within 7 days in unopened original packaging with this invoice.</p>
                <p className="mt-1 font-bold">*** GET WELL SOON ***</p>
              </div>
            </div>
          ) : (
            /* STANDARD A4 / A5 TAX INVOICE FORMAT */
            <div className="mx-auto rounded-xl border border-slate-200 bg-white p-8 text-black print:border-none print:p-0">
              {/* Header */}
              <div className="flex items-start justify-between border-b pb-4">
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900">
                    HOSPITAL PHARMACY & DISPENSARY
                  </h1>
                  <p className="text-xs text-slate-600">
                    Healthcare Campus, Medical Enclave • Emergency 24x7
                  </p>
                  <p className="text-xs text-slate-600">
                    <strong>DL No:</strong> 20B/21B-HP-2026-9041 • <strong>GSTIN:</strong> 07AAAAA0000A1Z5
                  </p>
                </div>
                <div className="text-right">
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold uppercase text-slate-800">
                    GST TAX INVOICE
                  </span>
                  <p className="mt-2 text-sm font-bold">{sale.invoice_number}</p>
                  <p className="text-xs text-slate-500">
                    Date: {formattedDate}
                  </p>
                </div>
              </div>

              {/* Customer Info */}
              <div className="my-4 grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-3 text-xs">
                <div>
                  <p className="text-slate-500">Patient / Customer:</p>
                  <p className="font-bold text-slate-900">{sale.customer_name}</p>
                  {sale.customer_phone && <p>Phone: {sale.customer_phone}</p>}
                </div>
                <div className="text-right">
                  <p className="text-slate-500">Prescribing Doctor / Channel:</p>
                  <p className="font-bold text-slate-900">{sale.doctor_name || "Self / Counter"}</p>
                  <p>Channel: {sale.sale_type} • Mode: {sale.payment_mode}</p>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left text-xs">
                <thead className="border-b bg-slate-100 font-bold uppercase text-slate-600">
                  <tr>
                    <th className="p-2">#</th>
                    <th className="p-2">Particulars / Medicine</th>
                    <th className="p-2">HSN</th>
                    <th className="p-2">Batch</th>
                    <th className="p-2">Exp</th>
                    <th className="p-2 text-center">Qty</th>
                    <th className="p-2 text-right">MRP</th>
                    <th className="p-2 text-right">Rate</th>
                    <th className="p-2 text-right">GST %</th>
                    <th className="p-2 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sale.items?.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td className="p-2">{idx + 1}</td>
                      <td className="p-2 font-bold">{item.medicine?.brand_name || "Medicine"}</td>
                      <td className="p-2 text-slate-500">{item.hsn_code}</td>
                      <td className="p-2 font-mono font-bold">{item.batch_number}</td>
                      <td className="p-2">{item.expiry_date}</td>
                      <td className="p-2 text-center font-bold">{item.quantity}</td>
                      <td className="p-2 text-right">₹{item.unit_mrp}</td>
                      <td className="p-2 text-right">₹{item.unit_price}</td>
                      <td className="p-2 text-right">{item.gst_rate}%</td>
                      <td className="p-2 text-right font-bold">₹{item.total_amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Summary */}
              <div className="mt-4 flex justify-end">
                <div className="w-64 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Taxable Amount:</span>
                    <span>₹{sale.taxable_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">CGST Amount:</span>
                    <span>₹{sale.cgst_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">SGST Amount:</span>
                    <span>₹{sale.sgst_amount.toFixed(2)}</span>
                  </div>
                  {sale.discount_amount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount:</span>
                      <span>-₹{sale.discount_amount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 text-sm font-bold flex justify-between">
                    <span>Net Invoice Value:</span>
                    <span className="text-primary">₹{sale.net_amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Signature */}
              <div className="mt-8 flex items-end justify-between border-t pt-4 text-xs text-slate-500">
                <p>Terms: Medicines can be returned in sealed packaging with bill.</p>
                <div className="text-right">
                  <div className="h-10"></div>
                  <p className="border-t pt-1 font-bold">Authorized Pharmacist Signature</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
