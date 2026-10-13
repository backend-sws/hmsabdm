import React, { useState, useEffect } from "react"
import {
  X,
  RotateCcw,
  Building2,
  Plus,
  Trash2,
  FileText,
  CheckCircle2,
  Printer,
  FileCheck,
  Sparkles,
} from "lucide-react"
import {
  useSuppliers,
  useBatchStock,
  useCreateSupplierReturnMutation,
  useUpdateSupplierReturnStatusMutation,
} from "@/hooks/usePharmacy"
import type { PharmacySupplierReturn, PharmacyBatch } from "@/types/pharmacy"

interface SupplierReturnModalProps {
  isOpen: boolean
  onClose: () => void
  initialBatch?: PharmacyBatch | any | null
}

interface ReturnLineItem {
  hospital_medicine_id: number
  medicine_name: string
  batch_id: number
  batch_number: string
  expiry_date: string
  available_quantity: number
  quantity_returned: number
  purchase_rate: number
  line_total: number
  supplier_id?: number | null
  supplier_name?: string | null
}

export const SupplierReturnModal: React.FC<SupplierReturnModalProps> = ({
  isOpen,
  onClose,
  initialBatch,
}) => {
  const [supplierId, setSupplierId] = useState<number | "">("")
  const [autoDetectedVendor, setAutoDetectedVendor] = useState<string | null>(null)
  const [filterBySelectedVendor, setFilterBySelectedVendor] = useState(true)

  const [returnReason, setReturnReason] = useState<
    "NEAR_EXPIRY" | "EXPIRED" | "DAMAGED" | "WRONG_GOODS" | "QUALITY_ISSUE"
  >("NEAR_EXPIRY")
  const [notes, setNotes] = useState("")

  // Line items for RTV
  const [items, setItems] = useState<ReturnLineItem[]>([])

  const [selectedBatchId, setSelectedBatchId] = useState<number | "">("")

  // Result state after creation
  const [createdRtv, setCreatedRtv] = useState<PharmacySupplierReturn | null>(null)
  const [isDebitNoteIssued, setIsDebitNoteIssued] = useState(false)
  const [debitNoteNumber, setDebitNoteNumber] = useState("")

  const { data: suppliers = [] } = useSuppliers()
  const { data: batchesData } = useBatchStock({
    per_page: 100,
  })
  const availableBatches = batchesData?.data || []

  const createRtvMutation = useCreateSupplierReturnMutation()
  const updateStatusMutation = useUpdateSupplierReturnStatusMutation()

  // Pre-populate if initialBatch passed
  useEffect(() => {
    if (initialBatch) {
      const isExp = new Date(initialBatch.expiry_date) < new Date()
      setReturnReason(isExp ? "EXPIRED" : "NEAR_EXPIRY")

      // Auto-select supplier from batch
      const suppId = initialBatch.supplier_id || initialBatch.supplier?.id || null
      const suppName =
        initialBatch.supplier?.supplier_name ||
        (suppId ? suppliers.find((s) => s.id === suppId)?.supplier_name : null) ||
        null

      if (suppId) {
        setSupplierId(suppId)
        setAutoDetectedVendor(suppName || `Vendor #${suppId}`)
      } else {
        setAutoDetectedVendor(null)
      }

      const medName =
        initialBatch.medicine?.brand_name ||
        initialBatch.medicine_name ||
        "Medicine"
      const medId =
        initialBatch.hospital_medicine_id ||
        initialBatch.medicine?.id ||
        0

      const initialItem: ReturnLineItem = {
        hospital_medicine_id: medId,
        medicine_name: medName,
        batch_id: initialBatch.id || initialBatch.batch_id,
        batch_number: initialBatch.batch_number,
        expiry_date: initialBatch.expiry_date,
        available_quantity: initialBatch.available_quantity,
        quantity_returned: initialBatch.available_quantity > 0 ? initialBatch.available_quantity : 1,
        purchase_rate: initialBatch.purchase_rate || 0,
        line_total:
          Math.round(
            (initialBatch.available_quantity > 0 ? initialBatch.available_quantity : 1) *
              (initialBatch.purchase_rate || 0) *
              100
          ) / 100,
        supplier_id: suppId,
        supplier_name: suppName,
      }
      setItems([initialItem])
    } else {
      setItems([])
      setSupplierId("")
      setAutoDetectedVendor(null)
    }
    setCreatedRtv(null)
    setIsDebitNoteIssued(false)
  }, [initialBatch, isOpen, suppliers])

  if (!isOpen) return null

  // Batches filtered by current supplier (if option checked)
  const displayedBatches = availableBatches.filter((b) => {
    if (!supplierId || !filterBySelectedVendor) return true
    const bSuppId = b.supplier_id || b.supplier?.id
    return bSuppId === Number(supplierId)
  })

  const handleSupplierChange = (newSuppId: number | "") => {
    if (items.length > 0 && newSuppId !== "" && Number(newSuppId) !== Number(supplierId)) {
      const hasMismatch = items.some(
        (i) => i.supplier_id && Number(i.supplier_id) !== Number(newSuppId)
      )
      if (hasMismatch) {
        if (!confirm("Changing vendor will clear items that belong to the previous vendor. Continue?")) {
          return
        }
        setItems([])
      }
    }
    setSupplierId(newSuppId)
    setAutoDetectedVendor(null)
  }

  const handleSelectBatchChange = (bId: number | "") => {
    setSelectedBatchId(bId)
    if (!bId) return

    const batch = availableBatches.find((b) => b.id === Number(bId))
    if (!batch) return

    const bSuppId = batch.supplier_id || batch.supplier?.id
    const bSuppName =
      batch.supplier?.supplier_name ||
      (bSuppId ? suppliers.find((s) => s.id === bSuppId)?.supplier_name : null)

    // Auto-select vendor if none chosen
    if (!supplierId && bSuppId) {
      setSupplierId(bSuppId)
      setAutoDetectedVendor(bSuppName || `Vendor #${bSuppId}`)
    }
  }

  const handleAddBatch = () => {
    if (!selectedBatchId) return
    const batch = availableBatches.find((b) => b.id === Number(selectedBatchId))
    if (!batch) return

    const medName = batch.medicine?.brand_name || "Medicine"
    const medId = batch.hospital_medicine_id || batch.medicine?.id || 0

    // Prevent duplicates
    if (items.some((i) => i.batch_id === batch.id)) {
      alert("This batch is already added to the return list")
      return
    }

    const bSuppId = batch.supplier_id || batch.supplier?.id
    const bSuppName =
      batch.supplier?.supplier_name ||
      (bSuppId ? suppliers.find((s) => s.id === bSuppId)?.supplier_name : null)

    // Cross-vendor validation:
    if (supplierId && bSuppId && Number(supplierId) !== Number(bSuppId)) {
      const currentSupp =
        suppliers.find((s) => s.id === Number(supplierId))?.supplier_name ||
        `Vendor #${supplierId}`
      alert(
        `⚠️ Vendor Mismatch:\n\nBatch "${batch.batch_number}" was purchased from "${bSuppName}".\n\nThe current return is set for "${currentSupp}".\n\nMARG/Busy Standard: An RTV Challan & Debit Note can only be issued to a single vendor. Please create a separate return for "${bSuppName}".`
      )
      return
    }

    // Auto-select vendor if none chosen
    if (!supplierId && bSuppId) {
      setSupplierId(bSuppId)
      setAutoDetectedVendor(bSuppName || `Vendor #${bSuppId}`)
    }

    const newItem: ReturnLineItem = {
      hospital_medicine_id: medId,
      medicine_name: medName,
      batch_id: batch.id,
      batch_number: batch.batch_number,
      expiry_date: batch.expiry_date,
      available_quantity: batch.available_quantity,
      quantity_returned: batch.available_quantity > 0 ? batch.available_quantity : 1,
      purchase_rate: batch.purchase_rate || 0,
      line_total:
        Math.round(
          (batch.available_quantity > 0 ? batch.available_quantity : 1) *
            (batch.purchase_rate || 0) *
            100
        ) / 100,
      supplier_id: bSuppId,
      supplier_name: bSuppName,
    }

    setItems([...items, newItem])
    setSelectedBatchId("")
  }

  const handleUpdateQty = (index: number, qty: number) => {
    const updated = [...items]
    const item = updated[index]
    const validQty = Math.max(1, Math.min(qty, item.available_quantity || qty))
    item.quantity_returned = validQty
    item.line_total = Math.round(validQty * item.purchase_rate * 100) / 100
    setItems(updated)
  }

  const handleUpdateRate = (index: number, rate: number) => {
    const updated = [...items]
    const item = updated[index]
    item.purchase_rate = Math.max(0, rate)
    item.line_total = Math.round(item.quantity_returned * item.purchase_rate * 100) / 100
    setItems(updated)
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const totalReturnValue = items.reduce((acc, i) => acc + i.line_total, 0)

  const handleSubmitReturn = async () => {
    if (!supplierId) {
      alert("Please select the vendor / supplier to return items to")
      return
    }
    if (items.length === 0) {
      alert("Please add at least one batch item to return")
      return
    }

    const payload = {
      supplier_id: Number(supplierId),
      return_reason: returnReason,
      notes: notes || undefined,
      items: items.map((i) => ({
        hospital_medicine_id: i.hospital_medicine_id,
        batch_id: i.batch_id,
        batch_number: i.batch_number,
        expiry_date: i.expiry_date,
        quantity_returned: i.quantity_returned,
        purchase_rate: i.purchase_rate,
      })),
    }

    try {
      const result = await createRtvMutation.mutateAsync(payload)
      setCreatedRtv(result)
      setDebitNoteNumber(`DN-${result.rtv_number.replace("RTV-", "")}`)
    } catch {
      // toast in mutation
    }
  }

  const handleIssueDebitNote = async () => {
    if (!createdRtv) return
    const dnNum = debitNoteNumber.trim() || `DN-${createdRtv.rtv_number.replace("RTV-", "")}`

    await updateStatusMutation.mutateAsync({
      id: createdRtv.id,
      payload: {
        status: "DEBIT_NOTE_ISSUED",
        debit_note_number: dnNum,
        debit_note_amount: createdRtv.total_return_value,
        debit_note_date: new Date().toISOString().split("T")[0],
      },
    })
    setIsDebitNoteIssued(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm print:p-0 print:bg-white print:fixed print:inset-0">
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-border dark:bg-card print:max-h-none print:w-full print:border-none print:shadow-none">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-border print:hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Supplier Return to Vendor (RTV)
                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700 dark:bg-orange-950/40 dark:text-orange-400">
                  MARG Standard
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Return expired/near-expiry or damaged goods, generate RTV Challan & issue Debit Note
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 print:p-0">
          {createdRtv ? (
            <>
              {/* Success / Challan & Debit Note View (Hidden during print) */}
              <div className="space-y-6 print:hidden">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 text-center dark:border-emerald-900 dark:bg-emerald-950/20">
                  <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="mt-2 text-lg font-black text-slate-900 dark:text-white">
                    RTV Challan Generated Successfully!
                  </h3>
                  <p className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    Challan No: {createdRtv.rtv_number}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Stock deducted from warehouse batches. Hand over printed copy to supplier driver/representative.
                  </p>
                </div>

                {/* Challan Summary Card */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-border dark:bg-card">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-xs">
                    <div>
                      <span className="text-slate-400">Vendor / Supplier:</span>
                      <p className="font-bold text-slate-900 dark:text-white">
                        {createdRtv.supplier?.supplier_name || "Supplier"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Reason:</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {createdRtv.return_reason}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Total Items:</span>
                      <p className="font-bold text-slate-900 dark:text-white">
                        {createdRtv.items?.length || items.length} batches
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Total Value:</span>
                      <p className="font-black text-primary">
                        ₹{createdRtv.total_return_value?.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 2: Debit Note Issuance */}
                <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 dark:border-blue-900 dark:bg-blue-950/20">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        Step 2: Issue Debit Note (Ledger Credit)
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        Issuing a Debit Note reduces the payable ledger for{" "}
                        <span className="font-bold text-blue-700 dark:text-blue-300">
                          {createdRtv.supplier?.supplier_name || "this supplier"}
                        </span>{" "}
                        by ₹{createdRtv.total_return_value?.toFixed(2)}.
                      </p>
                    </div>
                  </div>

                  {isDebitNoteIssued ? (
                    <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-100 px-4 py-2 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      <CheckCircle2 className="h-4 w-4" />
                      Debit Note #{debitNoteNumber} Issued & Supplier Ledger Credited!
                    </div>
                  ) : (
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <input
                        type="text"
                        value={debitNoteNumber}
                        onChange={(e) => setDebitNoteNumber(e.target.value)}
                        placeholder="e.g. DN-202410-001"
                        className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none dark:border-border dark:bg-card dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={handleIssueDebitNote}
                        disabled={updateStatusMutation.isPending}
                        className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-600/25 hover:bg-blue-700 disabled:opacity-50"
                      >
                        <FileCheck className="h-4 w-4" />
                        {updateStatusMutation.isPending ? "Issuing..." : "Confirm & Issue Debit Note"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-border dark:bg-card dark:text-slate-200"
                  >
                    <Printer className="h-4 w-4" />
                    Print RTV Challan
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                  >
                    Done
                  </button>
                </div>
              </div>

              {/* PRINTABLE RTV CHALLAN VOUCHER (Visible only during window.print()) */}
              <div className="hidden print:block font-mono text-xs text-black p-6 space-y-4">
                <div className="text-center border-b pb-3">
                  <h1 className="text-base font-black uppercase tracking-wider">
                    HOSPITAL PHARMACY & CENTRAL DRUG STORE
                  </h1>
                  <p className="text-[11px] font-bold">GOODS RETURN TO VENDOR (RTV) CHALLAN & DEBIT MEMO</p>
                  <p className="text-[10px] text-slate-500">Regd. Under State Pharmacy Council & Drugs & Cosmetics Act</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs border-b pb-3">
                  <div>
                    <p><span className="font-bold">Challan No:</span> {createdRtv.rtv_number}</p>
                    <p><span className="font-bold">Date:</span> {new Date().toLocaleDateString("en-IN")}</p>
                    <p><span className="font-bold">Return Reason:</span> {createdRtv.return_reason}</p>
                    {debitNoteNumber && <p><span className="font-bold">Debit Note No:</span> {debitNoteNumber}</p>}
                  </div>
                  <div>
                    <p><span className="font-bold">To Distributor:</span> {createdRtv.supplier?.supplier_name}</p>
                    <p><span className="font-bold">Contact:</span> {createdRtv.supplier?.contact_person || "N/A"}</p>
                    <p><span className="font-bold">GSTIN:</span> {createdRtv.supplier?.gstin || "N/A"}</p>
                    <p><span className="font-bold">Phone:</span> {createdRtv.supplier?.phone || "N/A"}</p>
                  </div>
                </div>

                <table className="w-full text-left text-xs border-collapse border border-slate-300">
                  <thead>
                    <tr className="border-b border-slate-300 bg-slate-100">
                      <th className="p-1.5 border border-slate-300">#</th>
                      <th className="p-1.5 border border-slate-300">Medicine Name</th>
                      <th className="p-1.5 border border-slate-300">Batch No</th>
                      <th className="p-1.5 border border-slate-300">Expiry</th>
                      <th className="p-1.5 border border-slate-300 text-right">Return Qty</th>
                      <th className="p-1.5 border border-slate-300 text-right">Cost Rate (₹)</th>
                      <th className="p-1.5 border border-slate-300 text-right">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(createdRtv.items || items).map((item: any, i: number) => (
                      <tr key={i} className="border-b border-slate-200">
                        <td className="p-1.5 border border-slate-300">{i + 1}</td>
                        <td className="p-1.5 border border-slate-300 font-bold">{item.medicine_name || item.medicine?.brand_name}</td>
                        <td className="p-1.5 border border-slate-300 font-mono">{item.batch_number}</td>
                        <td className="p-1.5 border border-slate-300">{item.expiry_date}</td>
                        <td className="p-1.5 border border-slate-300 text-right font-bold">{item.quantity_returned}</td>
                        <td className="p-1.5 border border-slate-300 text-right">₹{(item.purchase_rate || 0).toFixed(2)}</td>
                        <td className="p-1.5 border border-slate-300 text-right font-bold">₹{(item.line_total || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold border-t-2 border-slate-400">
                      <td colSpan={6} className="p-1.5 text-right">Gross Total Return Valuation:</td>
                      <td className="p-1.5 text-right font-black">₹{createdRtv.total_return_value?.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>

                <div className="grid grid-cols-3 gap-6 pt-12 text-center text-[11px]">
                  <div className="border-t border-dashed border-slate-400 pt-2">
                    <p className="font-bold">Prepared By</p>
                    <p className="text-[10px]">Store Pharmacist</p>
                  </div>
                  <div className="border-t border-dashed border-slate-400 pt-2">
                    <p className="font-bold">Authorized Signatory</p>
                    <p className="text-[10px]">Hospital Superintendent</p>
                  </div>
                  <div className="border-t border-dashed border-slate-400 pt-2">
                    <p className="font-bold">Received & Acknowledged</p>
                    <p className="text-[10px]">Distributor Driver / Rep</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Creation Form */
            <div className="space-y-6">
              {/* Header Configuration */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* Supplier Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Vendor / Distributor <span className="text-red-500">*</span>
                    </label>
                    {autoDetectedVendor && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        <Sparkles className="h-3 w-3 text-emerald-600" /> Auto-Selected
                      </span>
                    )}
                  </div>
                  <select
                    value={supplierId}
                    onChange={(e) => handleSupplierChange(Number(e.target.value) || "")}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-900 focus:border-primary focus:bg-white focus:outline-none dark:border-border dark:bg-card dark:text-white"
                  >
                    <option value="">-- Choose Supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.supplier_name} {s.contact_person ? `(${s.contact_person})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Return Reason */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Return Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-900 focus:border-primary focus:bg-white focus:outline-none dark:border-border dark:bg-card dark:text-white"
                  >
                    <option value="NEAR_EXPIRY">Near Expiry (&lt;90 Days Alert)</option>
                    <option value="EXPIRED">Expired Batch</option>
                    <option value="DAMAGED">Damaged / Breakage</option>
                    <option value="QUALITY_ISSUE">Quality Recall / Failed Sample</option>
                    <option value="WRONG_GOODS">Wrong Goods / Excess Supply</option>
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Remarks / Challan Note
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Batch near expiry as per supplier agreement"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none dark:border-border dark:bg-card dark:text-white"
                  />
                </div>
              </div>

              {/* Add Batches Selector Bar */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-border dark:bg-muted/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Add Medicine Batches to Return
                  </span>
                  {supplierId && (
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      <input
                        type="checkbox"
                        checked={filterBySelectedVendor}
                        onChange={(e) => setFilterBySelectedVendor(e.target.checked)}
                        className="rounded border-slate-300 text-primary"
                      />
                      Show only batches from selected vendor
                    </label>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-[260px]">
                    <select
                      value={selectedBatchId}
                      onChange={(e) => handleSelectBatchChange(Number(e.target.value) || "")}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-primary focus:outline-none dark:border-border dark:bg-card dark:text-white"
                    >
                      <option value="">-- Select Batch to Return --</option>
                      {displayedBatches.map((b) => {
                        const suppTitle = b.supplier?.supplier_name || "Unassigned Vendor"
                        return (
                          <option key={b.id} value={b.id}>
                            {b.medicine?.brand_name} • Batch #{b.batch_number} • [{suppTitle}] • Exp: {b.expiry_date} • Stock: {b.available_quantity} • Cost: ₹{b.purchase_rate}
                          </option>
                        )
                      })}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddBatch}
                    disabled={!selectedBatchId}
                    className="flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-orange-600/20 hover:bg-orange-700 disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    Add Batch
                  </button>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-border dark:bg-muted/30 flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Batches Slated for Return ({items.length})
                  </span>
                  <span className="text-xs font-black text-primary">
                    Total Value: ₹{totalReturnValue.toFixed(2)}
                  </span>
                </div>

                {items.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No batches added yet. Select a batch above to initiate vendor return.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-bold uppercase text-slate-500 dark:border-border dark:bg-muted/40">
                        <tr>
                          <th className="py-2.5 px-3">Medicine</th>
                          <th className="py-2.5 px-3">Batch Number</th>
                          <th className="py-2.5 px-3">Vendor / Source</th>
                          <th className="py-2.5 px-3">Expiry</th>
                          <th className="py-2.5 px-2 text-center">Available Stock</th>
                          <th className="py-2.5 px-2 text-center">Return Qty</th>
                          <th className="py-2.5 px-3 text-right">Cost Rate (₹)</th>
                          <th className="py-2.5 px-3 text-right">Total (₹)</th>
                          <th className="py-2.5 px-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-border/50">
                        {items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-muted/20">
                            <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                              {item.medicine_name}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                              {item.batch_number}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                                <Building2 className="h-3 w-3" />
                                {item.supplier_name ||
                                  (item.supplier_id
                                    ? suppliers.find((s) => s.id === item.supplier_id)?.supplier_name
                                    : null) ||
                                  "Assigned Vendor"}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">
                              {item.expiry_date}
                            </td>
                            <td className="py-2.5 px-2 text-center font-bold text-slate-500">
                              {item.available_quantity}
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <input
                                type="number"
                                min="1"
                                max={item.available_quantity || 9999}
                                value={item.quantity_returned}
                                onChange={(e) => handleUpdateQty(idx, Number(e.target.value))}
                                className="w-16 rounded-lg border border-slate-200 py-1 text-center font-bold text-slate-900 dark:border-border dark:bg-card dark:text-white"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.purchase_rate}
                                onChange={(e) => handleUpdateRate(idx, Number(e.target.value))}
                                className="w-20 rounded-lg border border-slate-200 py-1 text-right font-bold text-slate-900 dark:border-border dark:bg-card dark:text-white"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-right font-black text-slate-900 dark:text-white">
                              ₹{item.line_total.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/20"
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

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-border dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitReturn}
                  disabled={items.length === 0 || !supplierId || createRtvMutation.isPending}
                  className="flex items-center gap-1.5 rounded-xl bg-orange-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-orange-600/25 hover:bg-orange-700 disabled:opacity-50"
                >
                  <RotateCcw className="h-4 w-4" />
                  {createRtvMutation.isPending ? "Generating Challan..." : "Generate RTV Challan"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
