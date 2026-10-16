import React, { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { X, Building2, Check, IndianRupee } from "lucide-react"
import { supplierSchema, type SupplierFormValues } from "@/schemas/pharmacy.schema"
import { useCreateSupplierMutation, useUpdateSupplierMutation } from "@/hooks/usePharmacy"
import type { PharmacySupplier } from "@/types/pharmacy"

interface SupplierModalProps {
  isOpen: boolean
  onClose: () => void
  supplierToEdit?: PharmacySupplier | null
}

export const SupplierModal: React.FC<SupplierModalProps> = ({
  isOpen,
  onClose,
  supplierToEdit,
}) => {
  const createMutation = useCreateSupplierMutation()
  const updateMutation = useUpdateSupplierMutation()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      supplier_name: "",
      contact_person: "",
      phone: "",
      email: "",
      gstin: "",
      drug_license_no: "",
      pan_no: "",
      address: "",
      credit_days: 30,
      credit_limit: 0,
      opening_balance: 0,
      bank_name: "",
      bank_account_no: "",
      bank_ifsc: "",
      is_active: true,
    },
  })

  useEffect(() => {
    if (supplierToEdit) {
      reset({
        supplier_name: supplierToEdit.supplier_name,
        contact_person: supplierToEdit.contact_person || "",
        phone: supplierToEdit.phone || "",
        email: supplierToEdit.email || "",
        gstin: supplierToEdit.gstin || "",
        drug_license_no: supplierToEdit.drug_license_no || "",
        pan_no: supplierToEdit.pan_no || "",
        address: supplierToEdit.address || "",
        credit_days: supplierToEdit.credit_days ?? 30,
        credit_limit: supplierToEdit.credit_limit ?? 0,
        opening_balance: supplierToEdit.opening_balance ?? 0,
        bank_name: supplierToEdit.bank_name || "",
        bank_account_no: supplierToEdit.bank_account_no || "",
        bank_ifsc: supplierToEdit.bank_ifsc || "",
        is_active: supplierToEdit.is_active ?? true,
      })
    } else {
      reset({
        supplier_name: "",
        contact_person: "",
        phone: "",
        email: "",
        gstin: "",
        drug_license_no: "",
        pan_no: "",
        address: "",
        credit_days: 30,
        credit_limit: 0,
        opening_balance: 0,
        bank_name: "",
        bank_account_no: "",
        bank_ifsc: "",
        is_active: true,
      })
    }
  }, [supplierToEdit, isOpen, reset])

  if (!isOpen) return null

  const onSubmit = async (data: SupplierFormValues) => {
    if (supplierToEdit) {
      await updateMutation.mutateAsync({ id: supplierToEdit.id, payload: data })
    } else {
      await createMutation.mutateAsync(data)
    }
    reset()
    onClose()
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-border dark:bg-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {supplierToEdit ? "Edit Supplier / Distributor" : "Add Medicine Supplier / Distributor"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage vendor profile, credit terms, drug licenses & bank settlement
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

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="custom-scrollbar flex-1 overflow-y-auto p-6 space-y-5">
          {/* Section: Basic Details */}
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
              Agency & Contact Details
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Supplier / Agency Name <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("supplier_name")}
                  placeholder="e.g. Apex Pharma Distributors"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-border dark:bg-card dark:text-white"
                />
                {errors.supplier_name && (
                  <p className="mt-1 text-xs text-red-500">{errors.supplier_name.message}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Contact Person Name
                </label>
                <input
                  {...register("contact_person")}
                  placeholder="e.g. Rajesh Sharma"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-border dark:bg-card dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Mobile Number
                </label>
                <input
                  {...register("phone")}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-border dark:bg-card dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Email Address
                </label>
                <input
                  type="email"
                  {...register("email")}
                  placeholder="e.g. orders@apexpharma.com"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-border dark:bg-card dark:text-white"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  GSTIN (15 Digits)
                </label>
                <input
                  {...register("gstin")}
                  placeholder="e.g. 07AAAAA0000A1Z5"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold uppercase text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-border dark:bg-card dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Drug License No. (DL 20B / 21B)
                </label>
                <input
                  {...register("drug_license_no")}
                  placeholder="e.g. DL-20B-1234 / 21B-5678"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-border dark:bg-card dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  PAN Number
                </label>
                <input
                  {...register("pan_no")}
                  placeholder="e.g. ABCDE1234F"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold uppercase text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-border dark:bg-card dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Section: Credit & Payment Terms */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/30 dark:bg-amber-950/10">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
              <IndianRupee className="h-4 w-4" />
              Credit Terms & Outstanding Limits
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Credit Period (Days)
                </label>
                <input
                  type="number"
                  {...register("credit_days", { valueAsNumber: true })}
                  placeholder="30"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-border dark:bg-card dark:text-white"
                />
                <span className="text-[11px] text-slate-400">e.g. 15, 30, 45 days</span>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Credit Limit (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register("credit_limit", { valueAsNumber: true })}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-border dark:bg-card dark:text-white"
                />
                <span className="text-[11px] text-slate-400">Max allowed payable balance</span>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Opening Balance (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register("opening_balance", { valueAsNumber: true })}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-border dark:bg-card dark:text-white"
                />
                <span className="text-[11px] text-slate-400">Previous unpaid due if any</span>
              </div>
            </div>
          </div>

          {/* Section: Bank Details */}
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
              Bank Account for RTGS / NEFT Payments
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Bank Name
                </label>
                <input
                  {...register("bank_name")}
                  placeholder="e.g. HDFC Bank"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-border dark:bg-card dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Account Number
                </label>
                <input
                  {...register("bank_account_no")}
                  placeholder="e.g. 50200012345678"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-border dark:bg-card dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  IFSC Code
                </label>
                <input
                  {...register("bank_ifsc")}
                  placeholder="e.g. HDFC0001234"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold uppercase text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-border dark:bg-card dark:text-white"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Billing & Warehouse Address
            </label>
            <textarea
              {...register("address")}
              rows={2}
              placeholder="Full office / warehouse address..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-border dark:bg-card dark:text-white"
            />
          </div>

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
              disabled={isPending}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {isPending ? "Saving..." : supplierToEdit ? "Update Supplier" : "Register Supplier"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
