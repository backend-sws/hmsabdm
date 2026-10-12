import React, { useState, useEffect } from "react"
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Check,
  User,
  Stethoscope,
  Bed,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  CreditCard,
  Banknote,
  QrCode,
  Building,
  FileText,
  Clock,
  ArrowRight,
  Pill,
  Sparkles,
} from "lucide-react"
import {
  useBatchStock,
  useProcessSaleMutation,
  usePendingPrescriptions,
} from "@/hooks/usePharmacy"
import { pharmacyService } from "@/services/pharmacyService"
import { patientService } from "@/services/patientService"
import { ipdService } from "@/services/ipdService"
import { toast } from "sonner"
import type { PosCartItemValues } from "@/schemas/pharmacy.schema"
import type { PharmacyBatch, PharmacySale } from "@/types/pharmacy"
import type { Patient } from "@/types/patient"
import type { IpdAdmission } from "@/types/ipd"
import { PrintInvoiceModal } from "./PrintInvoiceModal"

interface PosBillingTabProps {
  initialCartItems?: PosCartItemValues[]
  initialPatient?: {
    patient_id?: number
    customer_name: string
    customer_phone?: string
    doctor_name?: string
    opd_visit_id?: number
    ipd_admission_id?: number
    prescription_id?: number
    sale_type: "WALK_IN" | "OPD" | "IPD" | "EMERGENCY"
  }
}

export const PosBillingTab: React.FC<PosBillingTabProps> = ({
  initialCartItems = [],
  initialPatient,
}) => {
  // Channel State
  const [saleType, setSaleType] = useState<"WALK_IN" | "OPD" | "IPD" | "EMERGENCY">(
    initialPatient?.sale_type || "WALK_IN"
  )

  // Customer / Patient Details
  const [customerName, setCustomerName] = useState(initialPatient?.customer_name || "")
  const [customerPhone, setCustomerPhone] = useState(initialPatient?.customer_phone || "")
  const [doctorName, setDoctorName] = useState(initialPatient?.doctor_name || "")
  const [patientId, setPatientId] = useState<number | undefined>(initialPatient?.patient_id)
  const [opdVisitId, setOpdVisitId] = useState<number | undefined>(initialPatient?.opd_visit_id)
  const [ipdAdmissionId, setIpdAdmissionId] = useState<number | undefined>(initialPatient?.ipd_admission_id)
  const [prescriptionId, setPrescriptionId] = useState<number | undefined>(initialPatient?.prescription_id)

  // Doctor Prescription Drawer State
  const [isRxDrawerOpen, setIsRxDrawerOpen] = useState(false)
  const [isLoadingRx, setIsLoadingRx] = useState(false)
  const { data: pendingRxData } = usePendingPrescriptions()
  const pendingPrescriptions = pendingRxData?.data || []

  // Linked Patient & Inpatient Objects
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [selectedInpatient, setSelectedInpatient] = useState<IpdAdmission | null>(null)

  // OPD UHID Lookup State
  const [uhidQuery, setUhidQuery] = useState("")
  const [isSearchingUhid, setIsSearchingUhid] = useState(false)
  const [patientSearchResults, setPatientSearchResults] = useState<Patient[]>([])
  const [showUhidDropdown, setShowUhidDropdown] = useState(false)

  // IPD Admission Lookup State
  const [ipdQuery, setIpdQuery] = useState("")
  const [isSearchingIpd, setIsSearchingIpd] = useState(false)
  const [ipdSearchResults, setIpdSearchResults] = useState<IpdAdmission[]>([])
  const [showIpdDropdown, setShowIpdDropdown] = useState(false)

  // Medicine / Batch Search Bar
  const [searchQuery, setSearchQuery] = useState("")

  // Cart
  const [cart, setCart] = useState<PosCartItemValues[]>(initialCartItems)

  // Payment State
  const [discountAmount, setDiscountAmount] = useState<number>(0)
  const [paymentMode, setPaymentMode] = useState<"CASH" | "UPI" | "CARD" | "SPLIT" | "IPD_LEDGER">(
    saleType === "IPD" ? "IPD_LEDGER" : "CASH"
  )
  const [notes, setNotes] = useState("")

  // Print Modal State
  const [lastBilledSale, setLastBilledSale] = useState<PharmacySale | null>(null)
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)

  // Available Batch Stock Query
  const { data: batchData } = useBatchStock({
    search: searchQuery,
    status: "active",
    per_page: 20,
  })
  const availableBatches = batchData?.data || []

  const saleMutation = useProcessSaleMutation()

  // Sync props when initialPatient or initialCartItems changes
  useEffect(() => {
    if (initialPatient) {
      if (initialPatient.sale_type) setSaleType(initialPatient.sale_type)
      if (initialPatient.customer_name) setCustomerName(initialPatient.customer_name)
      if (initialPatient.customer_phone) setCustomerPhone(initialPatient.customer_phone)
      if (initialPatient.doctor_name) setDoctorName(initialPatient.doctor_name)
      if (initialPatient.patient_id) setPatientId(initialPatient.patient_id)
      if (initialPatient.opd_visit_id) setOpdVisitId(initialPatient.opd_visit_id)
      if (initialPatient.ipd_admission_id) setIpdAdmissionId(initialPatient.ipd_admission_id)
      if (initialPatient.prescription_id) setPrescriptionId(initialPatient.prescription_id)
    }
    if (initialCartItems && initialCartItems.length > 0) {
      setCart(initialCartItems)
    }
  }, [initialPatient, initialCartItems])

  // Sync payment mode when saleType changes
  useEffect(() => {
    if (saleType === "IPD") {
      setPaymentMode("IPD_LEDGER")
    } else if (paymentMode === "IPD_LEDGER") {
      setPaymentMode("CASH")
    }
  }, [saleType])

  // Live Patient Search for OPD (Debounced)
  useEffect(() => {
    if (!uhidQuery.trim() || uhidQuery.trim().length < 2) {
      setPatientSearchResults([])
      setShowUhidDropdown(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsSearchingUhid(true)
      try {
        const res = await patientService.getPatients({ search: uhidQuery.trim(), limit: 5 })
        const list = Array.isArray(res) ? res : res?.data || []
        setPatientSearchResults(list)
        setShowUhidDropdown(list.length > 0)
      } catch {
        setPatientSearchResults([])
      } finally {
        setIsSearchingUhid(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [uhidQuery])

  // Live IPD Admissions Search (Debounced)
  useEffect(() => {
    if (!ipdQuery.trim() || ipdQuery.trim().length < 2) {
      setIpdSearchResults([])
      setShowIpdDropdown(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsSearchingIpd(true)
      try {
        const list = await ipdService.getAdmissions({ status: "admitted", search: ipdQuery.trim() })
        setIpdSearchResults(list)
        setShowIpdDropdown(list.length > 0)
      } catch {
        setIpdSearchResults([])
      } finally {
        setIsSearchingIpd(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [ipdQuery])

  // Handle selecting an OPD Patient from UHID search
  const handleSelectOpdPatient = (patient: Patient) => {
    setSelectedPatient(patient)
    setPatientId(Number(patient.id))
    const pName = (patient.name || `${patient.first_name || ""} ${patient.last_name || ""}`).trim()
    setCustomerName(pName)
    setCustomerPhone(patient.mobile || patient.phone || "")
    setUhidQuery("")
    setShowUhidDropdown(false)
  }

  // Handle selecting an Inpatient from IPD search
  const handleSelectInpatient = (admission: IpdAdmission) => {
    setSelectedInpatient(admission)
    setIpdAdmissionId(admission.id)
    if (admission.patient) {
      setPatientId(Number(admission.patient.id))
      const pName = (admission.patient.name || `${admission.patient.first_name || ""} ${admission.patient.last_name || ""}`).trim()
      setCustomerName(pName)
      setCustomerPhone(admission.patient.mobile || admission.patient.phone || "")
    } else {
      setCustomerName(admission.attendant_name || "Inpatient")
    }
    const docName = admission.doctor?.user?.name || admission.doctor?.specialization || ""
    if (docName) {
      setDoctorName(`Dr. ${docName}`)
    }
    setPaymentMode("IPD_LEDGER")
    setIpdQuery("")
    setShowIpdDropdown(false)
  }

  // Clear linked patient
  const handleClearPatient = () => {
    setSelectedPatient(null)
    setSelectedInpatient(null)
    setPatientId(undefined)
    setOpdVisitId(undefined)
    setIpdAdmissionId(undefined)
    setCustomerName("")
    setCustomerPhone("")
    setDoctorName("")
  }

  // Add Batch to Cart
  const handleAddToCart = (batch: PharmacyBatch) => {
    if (!batch.medicine) return

    const existingIndex = cart.findIndex((item) => item.batch_id === batch.id)
    if (existingIndex > -1) {
      const updated = [...cart]
      if (updated[existingIndex].quantity < batch.available_quantity) {
        updated[existingIndex].quantity += 1
        setCart(updated)
      }
    } else {
      const newItem: PosCartItemValues = {
        batch_id: batch.id,
        hospital_medicine_id: batch.hospital_medicine_id,
        brand_name: batch.medicine.brand_name,
        generic_name: batch.medicine.generic_name || "",
        dosage_form: batch.medicine.dosage_form,
        batch_number: batch.batch_number,
        expiry_date: batch.expiry_date,
        available_quantity: batch.available_quantity,
        quantity: 1,
        unit_price: batch.selling_price || batch.mrp,
        unit_mrp: batch.mrp,
        discount_percent: 0,
        gst_rate: batch.medicine.gst_rate || 12,
        hsn_code: batch.medicine.hsn_code || "3004",
        strip_size: batch.medicine.pack_size || 10,
        prescription_type: batch.medicine.prescription_type || "OTC",
      }
      setCart([...cart, newItem])
    }
    setSearchQuery("")
  }

  // Barcode Scanner Enter Key Fast-Add
  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      if (!searchQuery.trim()) return

      if (availableBatches.length > 0) {
        const q = searchQuery.trim().toLowerCase()
        const exactMatch = availableBatches.find(
          (b) =>
            b.batch_number.toLowerCase() === q ||
            b.medicine?.brand_name?.toLowerCase() === q ||
            b.medicine?.item_code?.toLowerCase() === q
        )
        const selected = exactMatch || availableBatches[0]
        handleAddToCart(selected)
        toast.info(`Scanned & Added: ${selected.medicine?.brand_name} (Batch: ${selected.batch_number})`)
      } else {
        toast.error(`No matching active batches found for "${searchQuery}"`)
      }
    }
  }

  // Load Prescriptions from Doctor OPD Queue
  const handleLoadPrescription = async (rxId: number) => {
    setIsLoadingRx(true)
    try {
      const details = await pharmacyService.getPrescriptionDispenseDetails(rxId)
      const rx = details.prescription
      setSaleType("OPD")
      setPaymentMode("CASH")
      if (rx.patient) {
        setPatientId(Number(rx.patient.id))
        const pName = (rx.patient.name || `${rx.patient.first_name || ""} ${rx.patient.last_name || ""}`).trim()
        setCustomerName(pName || "OPD Patient")
        setCustomerPhone(rx.patient.mobile || rx.patient.phone || "")
        setSelectedPatient(rx.patient as any)
      } else {
        setCustomerName("OPD Patient")
      }
      if (rx.doctor) {
        setDoctorName(`Dr. ${rx.doctor.full_name}`)
      }
      if (rx.opd_visit?.id) {
        setOpdVisitId(rx.opd_visit.id)
      }
      setPrescriptionId(rx.id)

      // Add all prescribed items with available FEFO batches to cart
      const newItems: PosCartItemValues[] = []
      let outOfStockCount = 0

      for (const item of details.dispense_items) {
        const batch = item.fefo_batch
        if (batch && batch.available_quantity > 0 && batch.medicine) {
          newItems.push({
            batch_id: batch.id,
            hospital_medicine_id: batch.hospital_medicine_id,
            brand_name: batch.medicine.brand_name,
            generic_name: batch.medicine.generic_name || "",
            dosage_form: batch.medicine.dosage_form,
            batch_number: batch.batch_number,
            expiry_date: batch.expiry_date,
            available_quantity: batch.available_quantity,
            quantity: 1,
            unit_price: batch.selling_price || batch.mrp,
            unit_mrp: batch.mrp,
            discount_percent: 0,
            gst_rate: batch.medicine.gst_rate || 12,
            hsn_code: batch.medicine.hsn_code || "3004",
            strip_size: batch.medicine.pack_size || 10,
            prescription_type: batch.medicine.prescription_type || "OTC",
          })
        } else {
          outOfStockCount++
        }
      }

      if (newItems.length > 0) {
        setCart(newItems)
        toast.success(`Prescription #${rx.prescription_number} loaded into cart (${newItems.length} items)`)
      }
      if (outOfStockCount > 0) {
        toast.warning(`${outOfStockCount} items in prescription are currently out of stock in pharmacy`)
      }
      setIsRxDrawerOpen(false)
    } catch (err: any) {
      toast.error(err.message || "Failed to load prescription")
    } finally {
      setIsLoadingRx(false)
    }
  }

  // Update Cart Quantity
  const handleUpdateQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(index)
      return
    }
    const updated = [...cart]
    const maxAvailable = updated[index].available_quantity
    updated[index].quantity = Math.min(newQty, maxAvailable)
    setCart(updated)
  }

  const handleRemoveItem = (index: number) => {
    setCart(cart.filter((_, i) => i !== index))
  }

  // Regulatory Schedule H / H1 / Narcotic Check
  const hasControlledDrugs = cart.some(
    (item) => item.prescription_type && ["SCHEDULE_H", "SCHEDULE_H1", "NARCOTIC"].includes(item.prescription_type)
  )

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + item.quantity * item.unit_price, 0)
  const totalTaxable = cart.reduce((acc, item) => {
    const lineSub = item.quantity * item.unit_price
    const lineDisc = lineSub * (item.discount_percent / 100)
    return acc + (lineSub - lineDisc)
  }, 0)

  const totalCgst = cart.reduce((acc, item) => {
    const lineSub = item.quantity * item.unit_price
    const lineDisc = lineSub * (item.discount_percent / 100)
    const lineTax = lineSub - lineDisc
    return acc + lineTax * (item.gst_rate / 200)
  }, 0)

  const totalSgst = totalCgst
  const grossPayable = Math.max(0, totalTaxable + totalCgst + totalSgst - discountAmount)
  const netRounded = Math.round(grossPayable)
  const roundOff = Math.round((netRounded - grossPayable) * 100) / 100

  // Submit Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) return
    if (!customerName.trim()) {
      toast.error("Please enter customer / patient name or link a patient")
      return
    }

    if (saleType === "IPD" && !ipdAdmissionId) {
      toast.error("Please search and select the admitted IPD patient before charging to ledger")
      return
    }

    if (hasControlledDrugs && !doctorName.trim()) {
      toast.error("CDSCO Compliance: Prescribing Doctor's Name is legally mandatory for Schedule H/H1 drugs!")
      return
    }

    const payload = {
      sale_type: saleType,
      customer_name: customerName,
      customer_phone: customerPhone || undefined,
      doctor_name: doctorName || undefined,
      patient_id: patientId,
      opd_visit_id: opdVisitId,
      ipd_admission_id: ipdAdmissionId,
      prescription_id: prescriptionId,
      discount_amount: discountAmount,
      payment_mode: paymentMode,
      notes: notes || undefined,
      items: cart.map((i) => ({
        batch_id: i.batch_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
        discount_percent: i.discount_percent,
        gst_rate: i.gst_rate,
        hsn_code: i.hsn_code,
      })),
    }

    try {
      const sale = await saleMutation.mutateAsync(payload)
      setLastBilledSale(sale)
      setIsPrintModalOpen(true)
      // Reset POS Form
      setCart([])
      setDiscountAmount(0)
      setNotes("")
      if (saleType === "WALK_IN") {
        setCustomerName("")
        setCustomerPhone("")
        setDoctorName("")
      } else {
        handleClearPatient()
      }
    } catch {
      // Handled in mutation toast
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* LEFT SIDE: POS Channel, Patient Search, Medicine Selector, and Cart (8 Cols) */}
      <div className="space-y-4 lg:col-span-8">
        {/* 1. Channel Selector Toggle & Doctor Prescriptions Queue Button */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex flex-1 flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 dark:border-border dark:bg-card">
            <button
              type="button"
              onClick={() => {
                setSaleType("WALK_IN")
                setPaymentMode("CASH")
                handleClearPatient()
              }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all sm:text-sm ${
                saleType === "WALK_IN"
                  ? "bg-primary text-white shadow-md shadow-primary/25"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <User className="h-4 w-4" />
              Walk-In Retail Customer
            </button>

            <button
              type="button"
              onClick={() => {
                setSaleType("OPD")
                setPaymentMode("CASH")
                handleClearPatient()
              }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all sm:text-sm ${
                saleType === "OPD"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <Stethoscope className="h-4 w-4" />
              OPD Prescription Link
            </button>

            <button
              type="button"
              onClick={() => {
                setSaleType("IPD")
                setPaymentMode("IPD_LEDGER")
                handleClearPatient()
              }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all sm:text-sm ${
                saleType === "IPD"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/25"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <Bed className="h-4 w-4" />
              IPD Inpatient Bed Charge
            </button>
          </div>

          {/* Quick Doctor Prescription Queue Trigger */}
          <button
            type="button"
            onClick={() => setIsRxDrawerOpen(true)}
            className="flex items-center justify-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50/70 px-4 py-3 text-xs font-bold text-indigo-700 transition-all hover:bg-indigo-100 hover:shadow-sm dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-300 whitespace-nowrap"
          >
            <Stethoscope className="h-4 w-4 text-indigo-600" />
            <span>Doctor Prescriptions</span>
            {pendingPrescriptions.length > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[10px] font-black text-white">
                {pendingPrescriptions.length}
              </span>
            )}
          </button>
        </div>

        {/* 2. MODE-SPECIFIC PATIENT LOOKUP SECTION */}
        {saleType === "OPD" && (
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 dark:border-indigo-950 dark:bg-indigo-950/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-indigo-950 dark:text-indigo-300 flex items-center gap-1.5">
                <Stethoscope className="h-4 w-4 text-indigo-600" />
                OPD Patient Search (by UHID, Mobile, or Name)
              </span>
              {selectedPatient && (
                <button
                  type="button"
                  onClick={handleClearPatient}
                  className="text-[11px] font-bold text-red-600 hover:underline flex items-center gap-1"
                >
                  <X className="h-3 w-3" /> Change Patient
                </button>
              )}
            </div>

            {selectedPatient ? (
              /* Selected OPD Patient Badge */
              <div className="rounded-xl border border-indigo-200 bg-white p-3 dark:border-border dark:bg-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 font-bold text-xs dark:bg-indigo-950 dark:text-indigo-300">
                      UHID
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                          {selectedPatient.name || `${selectedPatient.first_name || ""} ${selectedPatient.last_name || ""}`.trim()}
                        </span>
                        <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[11px] font-mono font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          {selectedPatient.uhid}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">
                        {selectedPatient.gender || "N/A"} • {selectedPatient.age ? `${selectedPatient.age} yrs` : ""} • Phone: {selectedPatient.mobile || selectedPatient.phone || "N/A"}
                      </span>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" /> Patient Linked
                  </span>
                </div>
              </div>
            ) : (
              /* UHID Search Box */
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-400" />
                <input
                  type="text"
                  value={uhidQuery}
                  onChange={(e) => setUhidQuery(e.target.value)}
                  placeholder="Type UHID (e.g. UHID-2024...), Patient Name, or Mobile Number..."
                  className="w-full rounded-xl border border-indigo-200 bg-white py-2.5 pl-10 pr-4 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none dark:border-indigo-900 dark:bg-card dark:text-white"
                />

                {/* Dropdown Results */}
                {showUhidDropdown && patientSearchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-border dark:bg-card">
                    {patientSearchResults.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => handleSelectOpdPatient(p)}
                        className="cursor-pointer rounded-lg p-2.5 transition-all hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {p.name || `${p.first_name || ""} ${p.last_name || ""}`.trim()}
                          </span>
                          <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            {p.uhid}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500">
                          {p.gender || "N/A"} • {p.age ? `${p.age}y` : ""} • Phone: {p.mobile || p.phone || "N/A"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {saleType === "IPD" && (
          <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-4 dark:border-purple-950 dark:bg-purple-950/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-purple-950 dark:text-purple-300 flex items-center gap-1.5">
                <Bed className="h-4 w-4 text-purple-600" />
                Inpatient Admission Lookup (by IPD No, UHID, or Patient Name)
              </span>
              {selectedInpatient && (
                <button
                  type="button"
                  onClick={handleClearPatient}
                  className="text-[11px] font-bold text-red-600 hover:underline flex items-center gap-1"
                >
                  <X className="h-3 w-3" /> Change Inpatient
                </button>
              )}
            </div>

            {selectedInpatient ? (
              /* Selected Inpatient Bed Details Badge */
              <div className="rounded-xl border border-purple-200 bg-white p-3 dark:border-border dark:bg-card">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Inpatient</span>
                    <p className="font-extrabold text-slate-900 dark:text-white">
                      {selectedInpatient.patient?.name || `${selectedInpatient.patient?.first_name || ""} ${selectedInpatient.patient?.last_name || ""}`.trim()}
                    </p>
                    <span className="text-[11px] text-purple-700 dark:text-purple-400 font-mono font-bold">
                      UHID: {selectedInpatient.patient?.uhid || "N/A"}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">IPD Number</span>
                    <p className="font-mono font-black text-sm text-purple-700 dark:text-purple-400">
                      {selectedInpatient.ipd_number}
                    </p>
                    <span className="text-[11px] text-slate-500">
                      Admitted: {selectedInpatient.admission_date}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Ward & Bed</span>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {selectedInpatient.ward?.name || "Ward"} • Bed {selectedInpatient.bed?.bed_number || selectedInpatient.bed_id}
                    </p>
                    <span className="text-[11px] text-slate-500">
                      Type: {selectedInpatient.admission_type || "Planned"}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Attending Doctor</span>
                    <p className="font-bold text-slate-900 dark:text-white truncate">
                      Dr. {selectedInpatient.doctor?.user?.name || "Consultant"}
                    </p>
                    <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                      Charged to IPD Ledger
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* IPD Search Input */
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-400" />
                <input
                  type="text"
                  value={ipdQuery}
                  onChange={(e) => setIpdQuery(e.target.value)}
                  placeholder="Search IPD No (e.g. IPD-2024...), UHID, or Patient Name..."
                  className="w-full rounded-xl border border-purple-200 bg-white py-2.5 pl-10 pr-4 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none dark:border-purple-900 dark:bg-card dark:text-white"
                />

                {/* Dropdown Results */}
                {showIpdDropdown && ipdSearchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-border dark:bg-card">
                    {ipdSearchResults.map((adm) => (
                      <div
                        key={adm.id}
                        onClick={() => handleSelectInpatient(adm)}
                        className="cursor-pointer rounded-lg p-2.5 transition-all hover:bg-purple-50 dark:hover:bg-purple-950/40"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {adm.patient?.name || `${adm.patient?.first_name || ""} ${adm.patient?.last_name || ""}`.trim()}
                          </span>
                          <span className="font-mono text-xs font-black text-purple-600 dark:text-purple-400">
                            {adm.ipd_number}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500">
                          Ward: {adm.ward?.name || "General"} • Bed #{adm.bed?.bed_number || adm.bed_id} • Dr. {adm.doctor?.user?.name || "Consultant"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 3. Customer / Doctor Input Fields */}
        <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-3 dark:border-border dark:bg-card">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Customer / Patient Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none dark:border-border dark:bg-card dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Mobile Number
            </label>
            <input
              type="text"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none dark:border-border dark:bg-card dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Doctor Name (Schedule H/H1)
            </label>
            <input
              type="text"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              placeholder="e.g. Dr. A. Sharma"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none dark:border-border dark:bg-card dark:text-white"
            />
          </div>
        </div>

        {/* 4. Barcode Scanner / Medicine Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleBarcodeKeyDown}
            placeholder="Scan barcode (Press Enter to auto-add) or type medicine / salt (F2)..."
            className="w-full rounded-2xl border-2 border-slate-200 bg-white py-3 pl-12 pr-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 dark:border-border dark:bg-card dark:text-white"
          />

          {/* Quick Search Dropdown */}
          {searchQuery.trim().length > 0 && availableBatches.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-border dark:bg-card">
              <div className="px-3 py-1.5 text-[11px] font-bold uppercase text-slate-400">
                Matching Active Batches (FEFO Prioritized)
              </div>
              <div className="divide-y divide-slate-100 dark:divide-border/50">
                {availableBatches.map((batch) => (
                  <div
                    key={batch.id}
                    onClick={() => handleAddToCart(batch)}
                    className="flex cursor-pointer items-center justify-between p-3 rounded-xl transition-all hover:bg-slate-50 dark:hover:bg-muted/40"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {batch.medicine?.brand_name}
                        </span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-muted dark:text-slate-300">
                          {batch.medicine?.dosage_form}
                        </span>
                        <span className="font-mono text-xs font-semibold text-slate-500">
                          Batch: {batch.batch_number}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Salt: {batch.medicine?.generic_name || "N/A"} • Exp: {batch.expiry_date} • Shelf: {batch.rack_location || "A-1"}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-black text-primary">
                        ₹{batch.selling_price || batch.mrp}
                        <span className="text-[10px] text-slate-400 font-normal"> /unit</span>
                      </div>
                      <div className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                        {batch.available_quantity} In Stock
                        {batch.medicine?.pack_size && batch.medicine.pack_size > 1 && (
                          <span className="text-[10px] text-slate-400 font-normal ml-1">
                            ({Math.floor(batch.available_quantity / batch.medicine.pack_size)} Strips)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Regulatory Schedule H / H1 Warning Banner */}
        {hasControlledDrugs && (
          <div className="flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-3.5 text-xs font-semibold text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-bold">
                CDSCO Regulatory Notice: Cart contains Schedule H / H1 controlled medicines.
              </p>
              <p className="mt-0.5 text-[11px] text-amber-800 dark:text-amber-300">
                Prescribing Doctor&apos;s Name and Patient phone number are legally mandatory under Indian Drugs & Cosmetics Rules before finalizing sale.
              </p>
            </div>
          </div>
        )}

        {/* 5. Cart Items Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
          <div className="border-b border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-border dark:bg-muted/20">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Cart Items ({cart.length})
            </span>
          </div>

          {cart.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              <ShoppingCart className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
              Cart is empty. Search medicines above to add items to bill.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500 dark:border-border dark:bg-muted/40">
                  <tr>
                    <th className="py-2.5 px-3">Medicine</th>
                    <th className="py-2.5 px-3">Batch & Exp</th>
                    <th className="py-2.5 px-2 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Rate</th>
                    <th className="py-2.5 px-2 text-center">Disc %</th>
                    <th className="py-2.5 px-2 text-center">GST</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                    <th className="py-2.5 px-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-border/50">
                  {cart.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-muted/20">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                          <span>{item.brand_name}</span>
                          {item.prescription_type && ["SCHEDULE_H", "SCHEDULE_H1", "NARCOTIC"].includes(item.prescription_type) && (
                            <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[9px] font-black text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              {item.prescription_type.replace("_", " ")}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {item.dosage_form} • Avail: {item.available_quantity}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {item.batch_number}
                        </span>
                        <div className="text-[10px] text-slate-500">{item.expiry_date}</div>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white dark:border-border dark:bg-card">
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(idx, item.quantity - 1)}
                              className="p-1 text-slate-500 hover:text-slate-900"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              max={item.available_quantity}
                              value={item.quantity}
                              onChange={(e) => handleUpdateQty(idx, Number(e.target.value))}
                              className="w-10 text-center text-xs font-bold text-slate-900 focus:outline-none dark:text-white"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(idx, item.quantity + 1)}
                              className="p-1 text-slate-500 hover:text-slate-900"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(idx, item.quantity + (item.strip_size || 10))}
                            title={`Add 1 Strip (+${item.strip_size || 10} units)`}
                            className="rounded-lg border border-slate-200 bg-slate-100 px-1.5 py-1 text-[10px] font-extrabold text-slate-700 hover:bg-slate-200 dark:border-border dark:bg-muted dark:text-slate-200 dark:hover:bg-muted/80 whitespace-nowrap shadow-xs"
                          >
                            +{item.strip_size || 10}
                          </button>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-900 dark:text-white">
                        ₹{item.unit_price}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.discount_percent}
                          onChange={(e) => {
                            const updated = [...cart]
                            updated[idx].discount_percent = Number(e.target.value) || 0
                            setCart(updated)
                          }}
                          className="w-12 rounded-lg border border-slate-200 py-1 text-center text-xs font-medium text-slate-900 dark:border-border dark:bg-card dark:text-white"
                        />
                      </td>
                      <td className="py-2.5 px-2 text-center font-medium text-slate-600 dark:text-slate-300">
                        {item.gst_rate}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-primary">
                        ₹
                        {(
                          item.quantity * item.unit_price * (1 - item.discount_percent / 100) *
                          (1 + item.gst_rate / 100)
                        ).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-slate-400 hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SIDE: Payment, Inpatient Ledger & Checkout (4 Cols) */}
      <div className="space-y-4 lg:col-span-4">
        {/* Payment Summary Box */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card space-y-4">
          <div className="border-b border-slate-200 pb-3 dark:border-border">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
              Payment & Settlement
              {saleType === "IPD" && (
                <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                  IPD Bed Charge
                </span>
              )}
            </h3>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Payment Mode
            </label>
            {saleType === "IPD" ? (
              /* IPD Locked to Ledger */
              <div className="rounded-xl border border-purple-200 bg-purple-50 p-3 text-xs text-purple-900 dark:border-purple-900 dark:bg-purple-950/30 dark:text-purple-200">
                <div className="flex items-center gap-2 font-bold">
                  <Building className="h-4 w-4 text-purple-600" />
                  Charge to IPD Running Ledger
                </div>
                <p className="mt-1 text-[11px] text-purple-700/80 dark:text-purple-300/80">
                  No cash collection at counter. Total bill will be posted to inpatient running account.
                </p>
              </div>
            ) : (
              /* Walk-In & OPD Modes */
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "CASH", label: "Cash", icon: Banknote },
                  { id: "UPI", label: "UPI / QR", icon: QrCode },
                  { id: "CARD", label: "Card", icon: CreditCard },
                  { id: "SPLIT", label: "Split", icon: Plus },
                ].map((mode) => {
                  const Icon = mode.icon
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setPaymentMode(mode.id as any)}
                      className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-bold transition-all ${
                        paymentMode === mode.id
                          ? "border-primary bg-primary text-white shadow-md shadow-primary/25"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-border dark:bg-card dark:text-slate-300"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {mode.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Discount Field */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Lump-sum Discount (₹)
            </label>
            <input
              type="number"
              min="0"
              value={discountAmount}
              onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 dark:border-border dark:bg-card dark:text-white"
            />
          </div>

          {/* Price Breakdown */}
          <div className="space-y-2 border-t border-slate-100 pt-3 text-xs dark:border-border/50">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                ₹{subtotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Total Taxable:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                ₹{totalTaxable.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>CGST + SGST:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                ₹{(totalCgst + totalSgst).toFixed(2)}
              </span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount:</span>
                <span className="font-bold">-₹{discountAmount.toFixed(2)}</span>
              </div>
            )}
            {roundOff !== 0 && (
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Round Off:</span>
                <span>{roundOff > 0 ? `+₹${roundOff}` : `-₹${Math.abs(roundOff)}`}</span>
              </div>
            )}

            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-black text-slate-900 dark:border-border dark:text-white">
              <span>Net Payable:</span>
              <span className="text-xl text-primary">₹{netRounded.toLocaleString("en-IN")}</span>
            </div>
          </div>

          {/* Checkout Button */}
          <button
            type="button"
            onClick={handleCheckout}
            disabled={cart.length === 0 || saleMutation.isPending}
            className={`w-full rounded-2xl py-3.5 text-sm font-black text-white shadow-lg transition-all disabled:opacity-50 ${
              saleType === "IPD"
                ? "bg-purple-600 shadow-purple-600/30 hover:bg-purple-700"
                : "bg-primary shadow-primary/30 hover:bg-primary/90"
            }`}
          >
            {saleMutation.isPending ? (
              "Processing..."
            ) : saleType === "IPD" ? (
              <span className="flex items-center justify-center gap-2">
                <Bed className="h-4 w-4" /> Charge ₹{netRounded} to IPD Ledger
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Check className="h-4 w-4" /> Collect ₹{netRounded} & Print Invoice
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Doctor Prescriptions Queue Slide-Over Drawer */}
      {isRxDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
          <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl dark:bg-card">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-border">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Live Doctor Prescriptions Queue
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {pendingPrescriptions.length} unfulfilled orders waiting for dispense
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRxDrawerOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Prescriptions List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {pendingPrescriptions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                  <h4 className="mt-2 text-sm font-bold text-slate-800 dark:text-white">
                    All Prescriptions Dispensed
                  </h4>
                  <p className="mt-1 text-xs text-slate-400 max-w-xs">
                    No doctor prescriptions pending right now. New OPD orders will appear automatically.
                  </p>
                </div>
              ) : (
                pendingPrescriptions.map((rx: any) => {
                  const patient = rx.patient
                  const doctor = rx.doctor
                  const items = rx.items || []

                  return (
                    <div
                      key={rx.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-all hover:border-indigo-300 hover:shadow-md dark:border-border dark:bg-card/80"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                              {patient ? (patient.name || `${patient.first_name || ""} ${patient.last_name || ""}`.trim()) : "Patient"}
                            </h4>
                            <span className="rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                              {patient?.uhid}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500">
                            Dr. {doctor?.full_name || "Consultant"} ({doctor?.specialization || "General"})
                          </p>
                        </div>
                        <span className="font-mono text-[11px] font-extrabold text-slate-600 dark:text-slate-300">
                          {rx.prescription_number}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="mt-2.5 flex flex-wrap gap-1">
                        {items.map((it: any) => (
                          <span
                            key={it.id}
                            className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-muted dark:text-slate-300"
                          >
                            <Pill className="h-2.5 w-2.5 text-indigo-600" />
                            {it.medicine_name}
                          </span>
                        ))}
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 dark:border-border/50">
                        <div className="flex items-center gap-1 text-[11px] text-slate-400">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(rx.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <button
                          type="button"
                          disabled={isLoadingRx}
                          onClick={() => handleLoadPrescription(rx.id)}
                          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-all disabled:opacity-50"
                        >
                          <span>Load & Dispense</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Printable Tax Invoice Modal */}
      {lastBilledSale && (
        <PrintInvoiceModal
          isOpen={isPrintModalOpen}
          onClose={() => {
            setIsPrintModalOpen(false)
            setLastBilledSale(null)
          }}
          sale={lastBilledSale}
        />
      )}
    </div>
  )
}
