import React, { useState } from "react"
import {
  Plus,
  Trash2,
  Building2,
  FileText,
  Check,
  Search,
} from "lucide-react"
import {
  useSuppliers,
  useFormulary,
  useCreatePurchaseMutation,
  usePurchases,
  usePurchaseOrders,
} from "@/hooks/usePharmacy"
import type { PurchaseItemValues } from "@/schemas/pharmacy.schema"
import { SupplierModal } from "./SupplierModal"

export const PurchaseGrnTab: React.FC = () => {
  const [viewMode, setViewMode] = useState<"new_grn" | "history">("new_grn")
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false)

  // Header State
  const [supplierId, setSupplierId] = useState<number | "">("")
  const [selectedPoId, setSelectedPoId] = useState<number | "">("")
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState("")
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0])
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split("T")[0])
  const [paymentStatus, setPaymentStatus] = useState<"UNPAID" | "PARTIAL" | "PAID">("UNPAID")
  const [paidAmount, setPaidAmount] = useState<number>(0)
  const [discountAmount, setDiscountAmount] = useState<number>(0)
  const [notes, setNotes] = useState("")

  // Line Items State
  const [items, setItems] = useState<PurchaseItemValues[]>([])

  // Medicine Selection for adding to table
  const [selectedMedicineId, setSelectedMedicineId] = useState<number | "">("")

  // History Filter
  const [historySearch, setHistorySearch] = useState("")

  // Queries & Mutations
  const { data: suppliers = [] } = useSuppliers()
  const { data: formularyData } = useFormulary({ per_page: 100 })
  const hospitalMedicines = formularyData?.data || []

  const { data: purchasesData } = usePurchases({ search: historySearch })
  const purchaseHistory = purchasesData?.data || []

  const { data: posData } = usePurchaseOrders({ status: "ORDERED" })
  const orderedPos = posData?.data || []

  const createPurchaseMutation = useCreatePurchaseMutation()

  // Handle PO Import
  const handleSelectPo = (poId: number | "") => {
    setSelectedPoId(poId)
    if (!poId) return
    const po = orderedPos.find((p: any) => p.id === poId)
    if (po) {
      setSupplierId(po.supplier_id)
      const defaultExp = new Date()
      defaultExp.setFullYear(defaultExp.getFullYear() + 2)
      const expStr = defaultExp.toISOString().split("T")[0]

      const poItems: PurchaseItemValues[] = (po.items || []).map((it: any) => ({
        hospital_medicine_id: it.hospital_medicine_id,
        medicine_name: it.medicine?.brand_name || "Medicine",
        batch_number: "",
        mfg_date: new Date().toISOString().split("T")[0],
        expiry_date: expStr,
        pack_size: it.pack_size || 1,
        pack_quantity: it.pack_quantity,
        free_pack_quantity: 0,
        purchase_rate_per_unit: it.unit_purchase_price,
        discount_percent: it.discount_percent || 0,
        gst_rate: it.gst_rate || 12,
        unit_mrp: it.medicine?.mrp || 0,
        selling_price_per_unit: it.medicine?.default_selling_price || it.medicine?.mrp || 0,
      }))
      setItems(poItems)
    }
  }

  // Add Item to GRN
  const handleAddMedicineToGrn = () => {
    if (!selectedMedicineId) return
    const med = hospitalMedicines.find((m) => m.id === Number(selectedMedicineId))
    if (!med) return

    const defaultExp = new Date()
    defaultExp.setFullYear(defaultExp.getFullYear() + 2)
    const expStr = defaultExp.toISOString().split("T")[0]

    const newItem: PurchaseItemValues = {
      hospital_medicine_id: med.id,
      medicine_name: med.brand_name,
      batch_number: "",
      mfg_date: new Date().toISOString().split("T")[0],
      expiry_date: expStr,
      pack_size: med.pack_size || (med.dosage_form?.toLowerCase().includes("tab") || med.dosage_form?.toLowerCase().includes("cap") ? 10 : 1),
      pack_quantity: 1,
      free_pack_quantity: 0,
      purchase_rate_per_unit: med.default_purchase_price || 0,
      discount_percent: 0,
      gst_rate: med.gst_rate || 12,
      unit_mrp: med.mrp || 0,
      selling_price_per_unit: med.default_selling_price || med.mrp || 0,
    }

    setItems([...items, newItem])
    setSelectedMedicineId("")
  }

  const handleUpdateItem = (index: number, field: keyof PurchaseItemValues, val: any) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: val }
    setItems(updated)
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  // Calculations
  const subtotal = items.reduce((acc, item) => {
    return acc + item.pack_quantity * item.pack_size * item.purchase_rate_per_unit
  }, 0)

  const taxableTotal = items.reduce((acc, item) => {
    const lineSub = item.pack_quantity * item.pack_size * item.purchase_rate_per_unit
    const lineDisc = lineSub * (item.discount_percent / 100)
    return acc + (lineSub - lineDisc)
  }, 0)

  const cgstTotal = items.reduce((acc, item) => {
    const lineSub = item.pack_quantity * item.pack_size * item.purchase_rate_per_unit
    const lineDisc = lineSub * (item.discount_percent / 100)
    const lineTaxable = lineSub - lineDisc
    return acc + lineTaxable * (item.gst_rate / 200)
  }, 0)

  const sgstTotal = cgstTotal
  const grossPayable = Math.max(0, taxableTotal + cgstTotal + sgstTotal - discountAmount)
  const netRounded = Math.round(grossPayable)

  // Submit GRN
  const handleSubmitGrn = async () => {
    if (!supplierId) {
      alert("Please select a supplier")
      return
    }
    if (!supplierInvoiceNo.trim()) {
      alert("Please enter supplier invoice number")
      return
    }
    if (items.length === 0) {
      alert("Please add at least one medicine item to the GRN")
      return
    }

    for (const item of items) {
      if (!item.batch_number.trim()) {
        alert(`Please enter batch number for ${item.medicine_name}`)
        return
      }
      if (!item.expiry_date) {
        alert(`Please enter expiry date for ${item.medicine_name}`)
        return
      }
    }

    const payload = {
      supplier_id: Number(supplierId),
      purchase_order_id: selectedPoId ? Number(selectedPoId) : undefined,
      supplier_invoice_no: supplierInvoiceNo.trim(),
      invoice_date: invoiceDate,
      received_date: receivedDate,
      discount_amount: discountAmount,
      payment_status: paymentStatus,
      paid_amount: paidAmount,
      notes: notes || undefined,
      items: items.map((i) => ({
        hospital_medicine_id: i.hospital_medicine_id,
        batch_number: i.batch_number.trim().toUpperCase(),
        mfg_date: i.mfg_date || undefined,
        expiry_date: i.expiry_date,
        pack_size: i.pack_size,
        pack_quantity: i.pack_quantity,
        free_pack_quantity: i.free_pack_quantity,
        purchase_rate_per_unit: i.purchase_rate_per_unit,
        discount_percent: i.discount_percent,
        gst_rate: i.gst_rate,
        unit_mrp: i.unit_mrp,
        selling_price_per_unit: i.selling_price_per_unit,
      })),
    }

    await createPurchaseMutation.mutateAsync(payload)
    // Reset Form
    setItems([])
    setSupplierInvoiceNo("")
    setDiscountAmount(0)
    setNotes("")
    setViewMode("history")
  }

  return (
    <div className="space-y-4">
      {/* View Mode Toggle Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-border dark:bg-card">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode("new_grn")}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              viewMode === "new_grn"
                ? "bg-primary text-white shadow-md shadow-primary/25"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            <Plus className="h-4 w-4" />
            New Inward Purchase GRN
          </button>
          <button
            type="button"
            onClick={() => setViewMode("history")}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              viewMode === "history"
                ? "bg-primary text-white shadow-md shadow-primary/25"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            <FileText className="h-4 w-4" />
            Past GRN Inward Register
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsSupplierModalOpen(true)}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-border dark:bg-muted dark:text-slate-200"
        >
          <Building2 className="h-4 w-4 text-primary" />
          + Add New Supplier
        </button>
      </div>

      {viewMode === "new_grn" ? (
        /* NEW PURCHASE GRN FORM */
        <div className="space-y-4">
          {/* Header Details */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
            <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Supplier & Bill Details
            </h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Import from Purchase Order (PO)
                </label>
                <select
                  value={selectedPoId}
                  onChange={(e) => handleSelectPo(Number(e.target.value) || "")}
                  className="w-full rounded-xl border border-blue-200 bg-blue-50/50 px-3 py-2 text-xs font-bold text-blue-900 focus:border-primary focus:outline-none dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-200"
                >
                  <option value="">-- Manual (No PO) --</option>
                  {orderedPos.map((po) => (
                    <option key={po.id} value={po.id}>
                      {po.po_number} ({po.supplier?.supplier_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Select Supplier / Distributor <span className="text-red-500">*</span>
                </label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(Number(e.target.value) || "")}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-primary focus:outline-none dark:border-border dark:bg-card dark:text-white"
                >
                  <option value="">-- Choose Supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.supplier_name} {s.gstin ? `(${s.gstin})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Supplier Invoice No. <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. INV-2026-904"
                  value={supplierInvoiceNo}
                  onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-primary focus:outline-none dark:border-border dark:bg-card dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Invoice Date
                </label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-primary focus:outline-none dark:border-border dark:bg-card dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Received Inward Date
                </label>
                <input
                  type="date"
                  value={receivedDate}
                  onChange={(e) => setReceivedDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-primary focus:outline-none dark:border-border dark:bg-card dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Payment Status
                </label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-primary focus:outline-none dark:border-border dark:bg-card dark:text-white"
                >
                  <option value="UNPAID">Unpaid (Credit)</option>
                  <option value="PARTIAL">Partial Payment</option>
                  <option value="PAID">Full Payment</option>
                </select>
              </div>

              {paymentStatus !== "UNPAID" && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Paid Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-primary focus:outline-none dark:border-border dark:bg-card dark:text-white"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Add Medicine Selector Bar */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-border dark:bg-card">
            <div className="flex-1 min-w-[260px]">
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Choose Medicine from Hospital Catalog:
              </label>
              <select
                value={selectedMedicineId}
                onChange={(e) => setSelectedMedicineId(Number(e.target.value) || "")}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-900 focus:border-primary focus:bg-white focus:outline-none dark:border-border dark:bg-card dark:text-white"
              >
                <option value="">-- Search & Select Medicine to Inward --</option>
                {hospitalMedicines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.brand_name} ({m.dosage_form}) • Salt: {m.generic_name || "N/A"} • MRP: ₹{m.mrp}
                  </option>
                ))}
              </select>
            </div>

            <div className="self-end">
              <button
                type="button"
                onClick={handleAddMedicineToGrn}
                disabled={!selectedMedicineId}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-md shadow-primary/20 transition-all hover:bg-primary/90 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Add Item to GRN
              </button>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
            <div className="border-b border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-border dark:bg-muted/20">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Inward Batch Line Items ({items.length})
              </span>
            </div>

            {items.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 dark:text-slate-400">
                No items added yet. Select a medicine from the dropdown above to record incoming batch and stock!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500 dark:border-border dark:bg-muted/40">
                    <tr>
                      <th className="py-2.5 px-3">Medicine</th>
                      <th className="py-2.5 px-3">Batch #</th>
                      <th className="py-2.5 px-3">Expiry (MM/YY)</th>
                      <th className="py-2.5 px-2 text-center">Pack Qty</th>
                      <th className="py-2.5 px-2 text-center">Free Qty</th>
                      <th className="py-2.5 px-2 text-center">Pack Size</th>
                      <th className="py-2.5 px-3 text-right">Buy Rate/Unit</th>
                      <th className="py-2.5 px-2 text-center">Disc %</th>
                      <th className="py-2.5 px-2 text-center">GST %</th>
                      <th className="py-2.5 px-3 text-right">Unit MRP</th>
                      <th className="py-2.5 px-3 text-right">Counter Rate</th>
                      <th className="py-2.5 px-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-border/50">
                    {items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-muted/20">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {item.medicine_name}
                          </div>
                          <div className="text-[10px] font-semibold text-primary/80 mt-0.5">
                            Total: {(item.pack_quantity + item.free_pack_quantity) * (item.pack_size || 1)} Units
                            {item.pack_size > 1 && (
                              <span className="text-slate-400 font-normal ml-1">
                                ({item.pack_quantity + item.free_pack_quantity} packs × {item.pack_size})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            placeholder="BATCH-123"
                            value={item.batch_number}
                            onChange={(e) => handleUpdateItem(idx, "batch_number", e.target.value)}
                            className="w-24 rounded-lg border border-slate-200 px-2 py-1 font-mono text-xs font-bold uppercase text-slate-900 dark:border-border dark:bg-card dark:text-white"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="date"
                            value={item.expiry_date}
                            onChange={(e) => handleUpdateItem(idx, "expiry_date", e.target.value)}
                            className="w-32 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-900 dark:border-border dark:bg-card dark:text-white"
                          />
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <input
                            type="number"
                            min="1"
                            value={item.pack_quantity}
                            onChange={(e) => handleUpdateItem(idx, "pack_quantity", Number(e.target.value))}
                            className="w-14 rounded-lg border border-slate-200 py-1 text-center font-bold text-slate-900 dark:border-border dark:bg-card dark:text-white"
                          />
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={item.free_pack_quantity}
                            onChange={(e) => handleUpdateItem(idx, "free_pack_quantity", Number(e.target.value))}
                            className="w-12 rounded-lg border border-slate-200 py-1 text-center font-bold text-slate-900 dark:border-border dark:bg-card dark:text-white"
                          />
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <input
                            type="number"
                            min="1"
                            value={item.pack_size}
                            onChange={(e) => handleUpdateItem(idx, "pack_size", Number(e.target.value))}
                            className="w-12 rounded-lg border border-slate-200 py-1 text-center text-slate-700 dark:border-border dark:bg-card dark:text-white"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={item.purchase_rate_per_unit}
                            onChange={(e) => handleUpdateItem(idx, "purchase_rate_per_unit", Number(e.target.value))}
                            className="w-20 rounded-lg border border-slate-200 py-1 text-right font-bold text-slate-900 dark:border-border dark:bg-card dark:text-white"
                          />
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <input
                            type="number"
                            value={item.discount_percent}
                            onChange={(e) => handleUpdateItem(idx, "discount_percent", Number(e.target.value))}
                            className="w-12 rounded-lg border border-slate-200 py-1 text-center text-slate-900 dark:border-border dark:bg-card dark:text-white"
                          />
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <select
                            value={item.gst_rate}
                            onChange={(e) => handleUpdateItem(idx, "gst_rate", Number(e.target.value))}
                            className="rounded-lg border border-slate-200 py-1 text-xs text-slate-900 dark:border-border dark:bg-card dark:text-white"
                          >
                            <option value={0}>0%</option>
                            <option value={5}>5%</option>
                            <option value={12}>12%</option>
                            <option value={18}>18%</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={item.unit_mrp}
                            onChange={(e) => handleUpdateItem(idx, "unit_mrp", Number(e.target.value))}
                            className="w-16 rounded-lg border border-slate-200 py-1 text-right text-slate-900 dark:border-border dark:bg-card dark:text-white"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={item.selling_price_per_unit}
                            onChange={(e) => handleUpdateItem(idx, "selling_price_per_unit", Number(e.target.value))}
                            className="w-16 rounded-lg border border-slate-200 py-1 text-right font-bold text-emerald-600 dark:border-border dark:bg-card dark:text-emerald-400"
                          />
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="rounded-lg p-1 text-slate-400 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Financial Summary & Submit */}
          {items.length > 0 && (
            <div className="flex flex-col justify-between gap-6 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center dark:border-border dark:bg-card">
              <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
                <div>
                  <span className="text-slate-500">Gross Items:</span>
                  <p className="font-bold text-slate-900 dark:text-white">₹{subtotal.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-slate-500">Taxable Value:</span>
                  <p className="font-bold text-slate-900 dark:text-white">₹{taxableTotal.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-slate-500">CGST + SGST ITC:</span>
                  <p className="font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{(cgstTotal + sgstTotal).toFixed(2)}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Net Payable:</span>
                  <p className="text-base font-extrabold text-primary">₹{netRounded.toLocaleString("en-IN")}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSubmitGrn}
                disabled={createPurchaseMutation.isPending}
                className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-xl shadow-primary/25 transition-all hover:bg-primary/90 disabled:opacity-50"
              >
                <Check className="h-5 w-5" />
                {createPurchaseMutation.isPending ? "Recording GRN..." : "Confirm Inward & Add to Inventory"}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* PAST GRN REGISTER */
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
          <div className="border-b border-slate-200 bg-slate-50/70 p-4 dark:border-border dark:bg-muted/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Goods Receipt Notes (GRN) Inward History
              </span>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by GRN or Bill #"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs dark:border-border dark:bg-card dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-slate-50 text-[11px] font-bold uppercase text-slate-500 dark:bg-muted/40">
                <tr>
                  <th className="py-3 px-4">GRN #</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Vendor Bill #</th>
                  <th className="py-3 px-4">Received Date</th>
                  <th className="py-3 px-4 text-center">Items</th>
                  <th className="py-3 px-4 text-right">Taxable</th>
                  <th className="py-3 px-4 text-right">GST ITC</th>
                  <th className="py-3 px-4 text-right">Net Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {purchaseHistory.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500">
                      No purchase orders recorded yet.
                    </td>
                  </tr>
                ) : (
                  purchaseHistory.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-muted/20">
                      <td className="py-3 px-4 font-bold text-primary">{p.grn_number}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        {p.supplier?.supplier_name || "Supplier"}
                      </td>
                      <td className="py-3 px-4 font-mono">{p.supplier_invoice_no}</td>
                      <td className="py-3 px-4 text-slate-500">{p.received_date}</td>
                      <td className="py-3 px-4 text-center font-bold">{p.items_count || p.items?.length || 1}</td>
                      <td className="py-3 px-4 text-right">₹{p.taxable_amount}</td>
                      <td className="py-3 px-4 text-right text-emerald-600">
                        ₹{(p.cgst_amount + p.sgst_amount).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-slate-900 dark:text-white">
                        ₹{p.net_amount.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-slate-700 dark:bg-muted dark:text-slate-300">
                          {p.payment_status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Supplier Modal */}
      <SupplierModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
      />
    </div>
  )
}
