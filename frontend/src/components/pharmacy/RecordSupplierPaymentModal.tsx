import React, { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { X, CreditCard, IndianRupee, Check } from "lucide-react"
import { supplierPaymentSchema, type SupplierPaymentFormValues } from "@/schemas/pharmacy.schema"
import { useRecordSupplierPaymentMutation } from "@/hooks/usePharmacy"
import type { PharmacySupplier, PharmacyPurchase } from "@/types/pharmacy"

interface RecordSupplierPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  supplier: PharmacySupplier | null
  unpaidPurchases?: PharmacyPurchase[]
}

export const RecordSupplierPaymentModal: React.FC<RecordSupplierPaymentModalProps> = ({
  isOpen,
  onClose,
  supplier,
  unpaidPurchases = [],
}) => {
  const recordPaymentMutation = useRecordSupplierPaymentMutation()

  const currentOutstanding = supplier?.calculated_outstanding ?? 0

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<SupplierPaymentFormValues>({
    resolver: zodResolver(supplierPaymentSchema),
    defaultValues: {
      amount: currentOutstanding > 0 ? currentOutstanding : 0,
      payment_date: new Date().toISOString().split("T")[0],
      payment_mode: "NEFT_RTGS",
      reference_number: "",
      tds_amount: 0,
      notes: "",
    },
  })

  useEffect(() => {
    if (supplier && isOpen) {
      reset({
        amount: currentOutstanding > 0 ? currentOutstanding : 0,
        payment_date: new Date().toISOString().split("T")[0],
        payment_mode: "NEFT_RTGS",
        reference_number: "",
        tds_amount: 0,
        notes: "",
      })
    }
  }, [supplier, isOpen, currentOutstanding, reset])

  if (!isOpen || !supplier) return null

  const onSubmit = async (data: SupplierPaymentFormValues) => {
    await recordPaymentMutation.mutateAsync({
      supplierId: supplier.id,
      payload: data,
    })
    reset()
    onClose()
  }

  const enteredAmount = watch("amount") || 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-border dark:bg-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Record Payment Voucher
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Settle vendor balance or invoice payment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Vendor Snapshot Banner */}
        <div className="border-b border-slate-100 bg-slate-50/75 px-6 py-3 dark:border-border/50 dark:bg-slate-900/40">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-semibold text-slate-500">Vendor:</span>{" "}
              <strong className="text-slate-900 dark:text-white">{supplier.supplier_name}</strong>
              {supplier.contact_person && (
                <span className="ml-1 text-slate-400">({supplier.contact_person})</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-500">Current Balance:</span>
              <span
                className={`rounded-full px-2.5 py-0.5 font-bold ${
                  currentOutstanding > 0
                    ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                }`}
              >
                ₹{currentOutstanding.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          {supplier.bank_account_no && (
            <div className="mt-1 text-[11px] text-slate-400">
              Bank: {supplier.bank_name || "N/A"} | A/C: {supplier.bank_account_no} | IFSC: {supplier.bank_ifsc || "N/A"}
            </div>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="custom-scrollbar flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Payment Amount (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  step="0.01"
                  {...register("amount", { valueAsNumber: true })}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm font-bold text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-border dark:bg-card dark:text-white"
                />
              </div>
              {errors.amount && (
                <p className="mt-1 text-xs text-red-500">{errors.amount.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...register("payment_date")}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-border dark:bg-card dark:text-white"
              />
              {errors.payment_date && (
                <p className="mt-1 text-xs text-red-500">{errors.payment_date.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Payment Mode <span className="text-red-500">*</span>
              </label>
              <select
                {...register("payment_mode")}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-border dark:bg-card dark:text-white"
              >
                <option value="NEFT_RTGS">Bank Transfer (NEFT / RTGS / IMPS)</option>
                <option value="CHEQUE">Cheque / Demand Draft</option>
                <option value="UPI">UPI / QR Code</option>
                <option value="CASH">Cash</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                UTR / Cheque / Transaction Ref #
              </label>
              <input
                {...register("reference_number")}
                placeholder="e.g. UTR12345678 / CHQ-001"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-border dark:bg-card dark:text-white"
              />
            </div>
          </div>

          {/* Allocate to Specific Purchase or General On-Account */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Allocate To Inward Invoice / GRN (Optional)
            </label>
            <select
              {...register("purchase_id", {
                setValueAs: (v) => (v ? Number(v) : undefined),
              })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-border dark:bg-card dark:text-white"
            >
              <option value="">General On-Account Payment (Auto FIFO across unpaid invoices)</option>
              {unpaidPurchases.map((p) => {
                const due = Math.max(0, p.net_amount - p.paid_amount)
                return (
                  <option key={p.id} value={p.id}>
                    {p.grn_number} (Inv #{p.supplier_invoice_no}) - Net ₹{p.net_amount.toFixed(2)} | Due: ₹{due.toFixed(2)}
                  </option>
                )
              })}
            </select>
            <p className="mt-1 text-[11px] text-slate-400">
              Leave blank for On-Account settlement which reconciles oldest unpaid invoices first.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                TDS Deducted (₹)
              </label>
              <input
                type="number"
                step="0.01"
                {...register("tds_amount", { valueAsNumber: true })}
                placeholder="0.00"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-border dark:bg-card dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Narration / Notes
              </label>
              <input
                {...register("notes")}
                placeholder="e.g. Cleared for August batch supply"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-border dark:bg-card dark:text-white"
              />
            </div>
          </div>

          {enteredAmount > 0 && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
              <div className="flex items-center gap-2 font-bold">
                <Check className="h-4 w-4" />
                Payment summary:
              </div>
              <p className="mt-0.5">
                Voucher will record ₹{enteredAmount.toFixed(2)} paid to {supplier.supplier_name}. New estimated balance: ₹{Math.max(0, currentOutstanding - enteredAmount).toFixed(2)}.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-border dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={recordPaymentMutation.isPending}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 transition-all hover:bg-emerald-500 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {recordPaymentMutation.isPending ? "Generating Voucher..." : "Confirm & Save Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
