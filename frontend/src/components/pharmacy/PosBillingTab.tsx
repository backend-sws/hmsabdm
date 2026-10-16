import React, { useState, useEffect, useRef } from "react"
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
  AlertTriangle,
  X,
  CreditCard,
  Banknote,
  QrCode,
  Building,
  Clock,
  ArrowRight,
  Pill,
  Sparkles,
  History,
  Star,
  Loader2,
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
import type {
  PharmacyBatch,
  PharmacySale,
  GenericSubstituteItem,
  PatientMedicationHistoryItem,
} from "@/types/pharmacy"
import type { Patient } from "@/types/patient"
import type { IpdAdmission } from "@/types/ipd"
import { PrintInvoiceModal } from "./PrintInvoiceModal"
import { SaltSubstituteModal } from "./SaltSubstituteModal"
import { PatientMedicationHistoryModal } from "./PatientMedicationHistoryModal"
import { getBatchFefoStatus, findBestFefoBatch } from "@/utils/pharmacyFefo"

interface PosBillingTabProps {
  initialCartItems?: PosCartItemValues[]
  initialPatient?: {
    patient_id?: number
    customer_name: string
    customer_phone?: string
    doctor_name?: string
    doctor_reg_no?: string
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
  const [doctorRegNo, setDoctorRegNo] = useState(initialPatient?.doctor_reg_no || "")
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
  const [taxMode, setTaxMode] = useState<"INCLUSIVE" | "EXCLUSIVE">("INCLUSIVE")
  const [notes, setNotes] = useState("")

  // Print Modal State
  const [lastBilledSale, setLastBilledSale] = useState<PharmacySale | null>(null)
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)

  // Ref for barcode / medicine search input (for F2 shortcut)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Salt Substitute Finder Modal State
  const [isSubstituteModalOpen, setIsSubstituteModalOpen] = useState(false)
  const [substituteModalTarget, setSubstituteModalTarget] = useState<{
    medicineId?: number
    brandName?: string
    genericName?: string
    currentPrice?: number
  } | null>(null)

  // Patient Past Medication History & 1-Click Refill Modal State
  const [isPatientHistoryModalOpen, setIsPatientHistoryModalOpen] = useState(false)

  // Available Batch Stock Query
  const { data: batchData } = useBatchStock({
    search: searchQuery,
    status: "active",
    per_page: 25,
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
      if (initialPatient.doctor_reg_no) setDoctorRegNo(initialPatient.doctor_reg_no)
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
    setDoctorRegNo("")
  }

  // Helper to build cart item with accurate Loose vs Strip packaging & pricing
  const buildCartItemFromBatch = (
    batch: PharmacyBatch,
    requestedQty = 1
  ): PosCartItemValues => {
    const packSize = batch.medicine?.pack_size || batch.medicine?.strip_size || 1
    const stripPrice = Number(batch.selling_price || batch.mrp || 0)
    const stripMrp = Number(batch.mrp || batch.selling_price || 0)
    const baseUnit =
      batch.medicine?.base_unit ||
      (batch.medicine?.dosage_form?.toLowerCase().includes("tab")
        ? "Tab"
        : batch.medicine?.dosage_form?.toLowerCase().includes("cap")
        ? "Cap"
        : "Unit")
    const packageType = batch.medicine?.package_type || (packSize > 1 ? "Strip" : "Pack")

    // If available stock is less than 1 full strip, sell as LOOSE
    const defaultSellMode: "LOOSE" | "STRIP" =
      packSize > 1 && batch.available_quantity < packSize ? "LOOSE" : "LOOSE"

    // Rate per single tablet/unit
    const looseRate = packSize > 1 ? parseFloat((stripPrice / packSize).toFixed(4)) : stripPrice
    const looseMrp = packSize > 1 ? parseFloat((stripMrp / packSize).toFixed(4)) : stripMrp

    return {
      batch_id: batch.id,
      hospital_medicine_id: batch.hospital_medicine_id,
      brand_name: batch.medicine?.brand_name || "Medicine",
      generic_name: batch.medicine?.generic_name || "",
      dosage_form: batch.medicine?.dosage_form || "Tablet",
      batch_number: batch.batch_number,
      expiry_date: batch.expiry_date,
      available_quantity: batch.available_quantity,
      quantity: Math.min(requestedQty, batch.available_quantity),
      unit_price: looseRate,
      unit_mrp: looseMrp,
      discount_percent: 0,
      gst_rate: batch.medicine?.gst_rate || 12,
      hsn_code: batch.medicine?.hsn_code || "3004",
      strip_size: packSize,
      pack_size: packSize,
      base_unit: baseUnit,
      package_type: packageType,
      strip_mrp: stripMrp,
      sell_mode: defaultSellMode,
      prescription_type: batch.medicine?.prescription_type || "OTC",
      is_tax_inclusive: taxMode === "INCLUSIVE",
    }
  }

  // Handle switching between Loose and Full Strip mode
  const handleToggleSellMode = (index: number, mode: "LOOSE" | "STRIP") => {
    const updated = [...cart]
    const item = updated[index]
    const packSize = item.pack_size || item.strip_size || 1

    if (mode === "STRIP") {
      if (item.available_quantity < packSize) {
        toast.warning(
          `Cannot sell full strip: Only ${item.available_quantity} loose ${item.base_unit || "units"} available in stock.`
        )
        return
      }
      const currentStrips = Math.max(1, Math.floor(item.quantity / packSize))
      item.quantity = Math.min(currentStrips * packSize, item.available_quantity)
      item.sell_mode = "STRIP"
    } else {
      item.sell_mode = "LOOSE"
    }
    setCart(updated)
  }

  // Add Batch to Cart
  const handleAddToCart = (batch: PharmacyBatch) => {
    if (!batch.medicine) return

    // FEFO check
    const otherBatches = availableBatches.filter(
      (b) => b.hospital_medicine_id === batch.hospital_medicine_id && b.id !== batch.id
    )
    const earlierBatch = otherBatches.find(
      (b) => new Date(b.expiry_date).getTime() < new Date(batch.expiry_date).getTime() && b.available_quantity > 0
    )
    if (earlierBatch) {
      toast.warning(
        `FEFO Notice: Batch #${earlierBatch.batch_number} expires earlier (${earlierBatch.expiry_date}). First-in-first-out rotation recommended.`
      )
    }

    const existingIndex = cart.findIndex((item) => item.batch_id === batch.id)
    if (existingIndex > -1) {
      const updated = [...cart]
      if (updated[existingIndex].quantity < batch.available_quantity) {
        updated[existingIndex].quantity += 1
        setCart(updated)
      }
    } else {
      const newItem = buildCartItemFromBatch(batch, 1)
      setCart([...cart, newItem])
    }
    setSearchQuery("")
  }

  // Handle selecting a substitute batch from SaltSubstituteModal
  const handleSelectSubstituteBatch = (
    batch: PharmacyBatch,
    substituteItem?: GenericSubstituteItem
  ) => {
    if (substituteModalTarget?.medicineId) {
      const existingIdx = cart.findIndex(
        (it) => it.hospital_medicine_id === substituteModalTarget.medicineId
      )
      if (existingIdx > -1) {
        const updated = [...cart]
        const oldName = updated[existingIdx].brand_name
        const targetQty = updated[existingIdx].quantity
        updated[existingIdx] = buildCartItemFromBatch(batch, targetQty)
        setCart(updated)
        toast.success(`Substituted "${oldName}" with "${updated[existingIdx].brand_name}" (Batch ${batch.batch_number})`)
        return
      }
    }

    handleAddToCart(batch)
    toast.success(`Added substitute: ${batch.medicine?.brand_name || substituteItem?.brand_name} (Batch ${batch.batch_number})`)
  }

  // Handle 1-Click Refill of single item
  const handleRefillItem = (item: PatientMedicationHistoryItem, batch: PharmacyBatch) => {
    handleAddToCart(batch)
    toast.success(`Refilled: ${item.brand_name} (Batch: ${batch.batch_number})`)
  }

  // Handle 1-Click Refill All In-Stock items
  const handleRefillAll = (
    itemsWithBatches: Array<{ item: PatientMedicationHistoryItem; batch: PharmacyBatch }>
  ) => {
    const newCart = [...cart]
    let addedCount = 0

    itemsWithBatches.forEach(({ item, batch }) => {
      const existingIdx = newCart.findIndex((c) => c.batch_id === batch.id)
      if (existingIdx > -1) {
        newCart[existingIdx].quantity = Math.min(
          newCart[existingIdx].quantity + (item.last_quantity || 1),
          batch.available_quantity
        )
      } else {
        newCart.push(buildCartItemFromBatch(batch, item.last_quantity || 1))
      }
      addedCount++
    })

    setCart(newCart)
    toast.success(`1-Click Refill applied: ${addedCount} chronic medications loaded into cart!`)
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
          newItems.push(buildCartItemFromBatch(batch, 1))
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

  // Helper for line-level Tax Inclusive / Exclusive Calculations
  const calcLineAmounts = (item: PosCartItemValues, isInclusive: boolean) => {
    const gross = item.quantity * item.unit_price
    const discount = gross * (item.discount_percent / 100)
    const net = Math.max(0, gross - discount)
    if (isInclusive) {
      const taxable = item.gst_rate > 0 ? net / (1 + item.gst_rate / 100) : net
      const tax = net - taxable
      const cgst = tax / 2
      const sgst = tax / 2
      return { gross, discount, net, taxable, tax, cgst, sgst, total: net }
    } else {
      const taxable = net
      const tax = taxable * (item.gst_rate / 100)
      const cgst = tax / 2
      const sgst = tax / 2
      return { gross, discount, net, taxable, tax, cgst, sgst, total: taxable + tax }
    }
  }

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + item.quantity * item.unit_price, 0)
  const totalTaxable = cart.reduce((acc, item) => {
    const isInc = item.is_tax_inclusive !== undefined ? item.is_tax_inclusive : taxMode === "INCLUSIVE"
    return acc + calcLineAmounts(item, isInc).taxable
  }, 0)

  const totalCgst = cart.reduce((acc, item) => {
    const isInc = item.is_tax_inclusive !== undefined ? item.is_tax_inclusive : taxMode === "INCLUSIVE"
    return acc + calcLineAmounts(item, isInc).cgst
  }, 0)

  const totalSgst = totalCgst
  const totalLineTotals = cart.reduce((acc, item) => {
    const isInc = item.is_tax_inclusive !== undefined ? item.is_tax_inclusive : taxMode === "INCLUSIVE"
    return acc + calcLineAmounts(item, isInc).total
  }, 0)

  const grossPayable = Math.max(0, totalLineTotals - discountAmount)
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
      doctor_reg_no: doctorRegNo || undefined,
      patient_id: patientId,
      opd_visit_id: opdVisitId,
      ipd_admission_id: ipdAdmissionId,
      prescription_id: prescriptionId,
      discount_amount: discountAmount,
      tax_mode: taxMode,
      payment_mode: paymentMode,
      notes: notes || undefined,
      items: cart.map((i) => ({
        batch_id: i.batch_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
        discount_percent: i.discount_percent,
        gst_rate: i.gst_rate,
        hsn_code: i.hsn_code,
        is_tax_inclusive: i.is_tax_inclusive !== undefined ? i.is_tax_inclusive : taxMode === "INCLUSIVE",
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
      setDoctorRegNo("")
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

  // MARG-Style POS Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape: Close modals / drawers / dropdowns
      if (e.key === "Escape") {
        if (isSubstituteModalOpen) {
          setIsSubstituteModalOpen(false)
          return
        }
        if (isPatientHistoryModalOpen) {
          setIsPatientHistoryModalOpen(false)
          return
        }
        if (isRxDrawerOpen) {
          setIsRxDrawerOpen(false)
          return
        }
        if (isPrintModalOpen) {
          setIsPrintModalOpen(false)
          return
        }
        if (searchQuery) {
          setSearchQuery("")
          return
        }
        if (showUhidDropdown) {
          setShowUhidDropdown(false)
          return
        }
        if (showIpdDropdown) {
          setShowIpdDropdown(false)
          return
        }
      }

      // F2: Focus Medicine / Barcode Search Input
      if (e.key === "F2") {
        e.preventDefault()
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
        return
      }

      // F4: Cycle Payment Modes
      if (e.key === "F4") {
        e.preventDefault()
        const modes: Array<"CASH" | "UPI" | "CARD" | "SPLIT" | "IPD_LEDGER"> =
          saleType === "IPD"
            ? ["IPD_LEDGER", "CASH", "UPI", "CARD"]
            : ["CASH", "UPI", "CARD", "SPLIT"]
        setPaymentMode((prev) => {
          const idx = modes.indexOf(prev)
          const next = modes[(idx + 1) % modes.length]
          toast.info(`Payment Mode switched to: ${next}`)
          return next
        })
        return
      }

      // F8: Toggle Doctor OPD Prescriptions Drawer
      if (e.key === "F8") {
        e.preventDefault()
        setIsRxDrawerOpen((prev) => !prev)
        return
      }

      // Alt+H or F9: Patient Medication History & 1-Click Refill
      if ((e.altKey && (e.key === "h" || e.key === "H")) || e.key === "F9") {
        e.preventDefault()
        if (selectedPatient || patientId) {
          setIsPatientHistoryModalOpen(true)
        } else {
          toast.info("Select or link an OPD patient to view prescription history")
        }
        return
      }

      // Alt+N: Reset / Start New Sale
      if (e.altKey && (e.key === "n" || e.key === "N")) {
        e.preventDefault()
        if (cart.length > 0 && !confirm("Clear current cart and start a new sale?")) {
          return
        }
        setCart([])
        setDiscountAmount(0)
        setNotes("")
        if (saleType === "WALK_IN") {
          setCustomerName("")
          setCustomerPhone("")
          setDoctorName("")
          setDoctorRegNo("")
        } else {
          handleClearPatient()
        }
        toast.info("POS Terminal Reset (New Sale)")
        return
      }

      // Ctrl + Enter or F10: Fast Checkout
      if ((e.ctrlKey && e.key === "Enter") || e.key === "F10") {
        e.preventDefault()
        if (cart.length > 0 && !saleMutation.isPending) {
          handleCheckout()
        }
        return
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    isSubstituteModalOpen,
    isPatientHistoryModalOpen,
    isRxDrawerOpen,
    isPrintModalOpen,
    searchQuery,
    showUhidDropdown,
    showIpdDropdown,
    saleType,
    selectedPatient,
    patientId,
    cart,
    saleMutation.isPending,
  ])

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 w-full min-w-0">
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
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPatientHistoryModalOpen(true)}
                      className="flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-800 shadow-xs hover:bg-teal-100 dark:border-teal-900/60 dark:bg-teal-950/40 dark:text-teal-300 transition-all active:scale-95"
                    >
                      <History className="h-3.5 w-3.5 text-teal-600" />
                      <span>Past Rx & 1-Click Refill</span>
                    </button>
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" /> Patient Linked
                    </span>
                  </div>
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
                  className="w-full rounded-xl border border-indigo-200 bg-white py-2.5 pl-10 pr-10 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none dark:border-indigo-900 dark:bg-card dark:text-white"
                />
                {isSearchingUhid && (
                  <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-indigo-500" />
                )}

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
                  className="w-full rounded-xl border border-purple-200 bg-white py-2.5 pl-10 pr-10 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none dark:border-purple-900 dark:bg-card dark:text-white"
                />
                {isSearchingIpd && (
                  <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-purple-500" />
                )}

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
        <div
          className={`grid grid-cols-1 gap-3 rounded-2xl border bg-white p-4 transition-all dark:bg-card ${
            hasControlledDrugs
              ? "border-amber-300 ring-2 ring-amber-400/20 sm:grid-cols-4 dark:border-amber-800"
              : "border-slate-200 sm:grid-cols-3 dark:border-border"
          }`}
        >
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
            <label className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>Doctor Name {hasControlledDrugs && <span className="text-red-500">*</span>}</span>
              {hasControlledDrugs && (
                <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  Sched H/H1
                </span>
              )}
            </label>
            <input
              type="text"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              placeholder="e.g. Dr. A. Sharma"
              className={`w-full rounded-xl border px-3 py-2 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none dark:bg-card dark:text-white ${
                hasControlledDrugs
                  ? "border-amber-300 bg-amber-50/20 focus:border-amber-500"
                  : "border-slate-200 bg-slate-50/50 focus:border-primary dark:border-border"
              }`}
            />
          </div>
          {hasControlledDrugs && (
            <div>
              <label className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>Doctor Reg No.</span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">CDSCO Form 35</span>
              </label>
              <input
                type="text"
                value={doctorRegNo}
                onChange={(e) => setDoctorRegNo(e.target.value)}
                placeholder="e.g. MCI-48291 / HPR ID"
                className="w-full rounded-xl border border-amber-300 bg-amber-50/30 px-3 py-2 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:outline-none dark:border-amber-800 dark:bg-amber-950/20 dark:text-white"
              />
            </div>
          )}
        </div>

        {/* 4. Barcode Scanner / Medicine Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleBarcodeKeyDown}
            placeholder="Scan barcode (Press Enter to auto-add) or type medicine / salt (Press F2)..."
            className="w-full rounded-2xl border-2 border-slate-200 bg-white py-3 pl-12 pr-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 dark:border-border dark:bg-card dark:text-white"
          />

          {/* Quick Search Dropdown */}
          {searchQuery.trim().length > 0 && availableBatches.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-border dark:bg-card">
              <div className="flex items-center justify-between px-3 py-1.5 text-[11px] font-bold uppercase text-slate-400">
                <span>Matching Active Batches (FEFO Prioritized)</span>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold lowercase">
                  Tip: Earliest expiry batch highlighted as ⭐ Best Pick
                </span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-border/50">
                {availableBatches.map((batch) => {
                  const fefo = getBatchFefoStatus(batch.expiry_date)
                  const medicineBatches = availableBatches.filter((b) => b.hospital_medicine_id === batch.hospital_medicine_id)
                  const bestFefo = findBestFefoBatch(medicineBatches)
                  const isBestFefo = bestFefo?.id === batch.id

                  return (
                    <div
                      key={batch.id}
                      onClick={() => handleAddToCart(batch)}
                      className={`flex cursor-pointer items-center justify-between p-3 rounded-xl transition-all hover:bg-slate-50 dark:hover:bg-muted/40 ${
                        isBestFefo ? "bg-amber-500/5 dark:bg-amber-500/10" : ""
                      }`}
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {batch.medicine?.brand_name}
                          </span>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-muted dark:text-slate-300">
                            {batch.medicine?.dosage_form}
                          </span>
                          <span className="font-mono text-xs font-semibold text-slate-500">
                            Batch: {batch.batch_number}
                          </span>
                          {isBestFefo && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                              Best FEFO Pick
                            </span>
                          )}
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${fefo.badgeClass}`}>
                            {fefo.label}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span>Salt: {batch.medicine?.generic_name || "N/A"}</span>
                          <span>• Shelf: {batch.rack_location || "A-1"}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSubstituteModalTarget({
                                medicineId: batch.hospital_medicine_id,
                                brandName: batch.medicine?.brand_name,
                                genericName: batch.medicine?.generic_name || undefined,
                                currentPrice: batch.selling_price || batch.mrp,
                              })
                              setIsSubstituteModalOpen(true)
                            }}
                            className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300 transition-all"
                          >
                            <Sparkles className="h-2.5 w-2.5 text-indigo-600" />
                            <span>Same Salt Substitutes</span>
                          </button>
                        </div>
                      </div>

                      <div className="text-right">
                        {(() => {
                          const packSize = batch.medicine?.pack_size || batch.medicine?.strip_size || 1
                          const baseUnit = batch.medicine?.base_unit || "Tab"
                          const stripPrice = Number(batch.selling_price || batch.mrp || 0)
                          const looseRate = packSize > 1 ? (stripPrice / packSize).toFixed(2) : stripPrice.toFixed(2)

                          return (
                            <>
                              <div className="text-sm font-black text-primary">
                                {packSize > 1 ? (
                                  <>
                                    <span>₹{stripPrice.toFixed(2)}</span>
                                    <span className="text-[10px] text-slate-400 font-normal"> /Strip</span>
                                    <div className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                      ₹{looseRate} /{baseUnit} (Loose)
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <span>₹{stripPrice.toFixed(2)}</span>
                                    <span className="text-[10px] text-slate-400 font-normal"> /{baseUnit}</span>
                                  </>
                                )}
                              </div>
                              <div className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                {packSize > 1 ? (
                                  Math.floor(batch.available_quantity / packSize) > 0 ? (
                                    <span>
                                      {Math.floor(batch.available_quantity / packSize)} Strips
                                      {batch.available_quantity % packSize > 0 &&
                                        ` + ${batch.available_quantity % packSize} Loose ${baseUnit}s`}
                                    </span>
                                  ) : (
                                    <span className="text-amber-600 dark:text-amber-400 font-bold">
                                      {batch.available_quantity} Loose {baseUnit}s (0 Strips)
                                    </span>
                                  )
                                ) : (
                                  <span>{batch.available_quantity} In Stock</span>
                                )}
                              </div>
                            </>
                          )
                        })()}
                      </div>
                    </div>
                  )
                })}
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
          <div className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-slate-50/70 px-4 py-2.5 dark:border-border dark:bg-muted/20">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Cart Items ({cart.length})
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-500">Tax Mode:</span>
              <div className="flex rounded-lg bg-slate-200/80 p-0.5 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setTaxMode("INCLUSIVE")
                    setCart(cart.map((c) => ({ ...c, is_tax_inclusive: true })))
                    toast.info("Switched to MRP Inclusive Mode (MRP includes all taxes)")
                  }}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-all ${
                    taxMode === "INCLUSIVE"
                      ? "bg-white text-slate-900 shadow-xs dark:bg-card dark:text-white"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  MRP Inclusive (Retail Standard)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTaxMode("EXCLUSIVE")
                    setCart(cart.map((c) => ({ ...c, is_tax_inclusive: false })))
                    toast.info("Switched to Tax Exclusive Mode (GST added on top of rate)")
                  }}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-all ${
                    taxMode === "EXCLUSIVE"
                      ? "bg-white text-slate-900 shadow-xs dark:bg-card dark:text-white"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  Exclusive (+GST Extra)
                </button>
              </div>
            </div>
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
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                          {item.pack_size && item.pack_size > 1 ? (
                            <span className="font-semibold text-primary/80">
                              1 {item.package_type || "Strip"} = {item.pack_size} {item.base_unit || "Tabs"}
                            </span>
                          ) : (
                            <span>{item.dosage_form}</span>
                          )}
                          <span>•</span>
                          {item.pack_size && item.pack_size > 1 && item.available_quantity < item.pack_size ? (
                            <span className="font-bold text-amber-600 dark:text-amber-400">
                              Stock: {item.available_quantity} Loose {item.base_unit || "Tabs"}
                            </span>
                          ) : (
                            <span>Stock: {item.available_quantity} {item.base_unit || "units"}</span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setSubstituteModalTarget({
                                medicineId: item.hospital_medicine_id,
                                brandName: item.brand_name,
                                genericName: item.generic_name || undefined,
                                currentPrice: item.unit_price,
                              })
                              setIsSubstituteModalOpen(true)
                            }}
                            className="inline-flex items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.5 font-bold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300 transition-all ml-1"
                          >
                            <Sparkles className="h-2.5 w-2.5 text-indigo-600" />
                            <span>Substitutes</span>
                          </button>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {item.batch_number}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-slate-500">{item.expiry_date}</span>
                          {(() => {
                            const fefo = getBatchFefoStatus(item.expiry_date)
                            return (
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${fefo.badgeClass}`}>
                                {fefo.shortLabel}
                              </span>
                            )
                          })()}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        {item.pack_size && item.pack_size > 1 ? (
                          <div className="flex flex-col items-center gap-1.5">
                            {/* Strip vs Loose Toggle */}
                            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800 text-[10px] font-bold">
                              <button
                                type="button"
                                onClick={() => handleToggleSellMode(idx, "LOOSE")}
                                className={`rounded px-2 py-0.5 transition-all ${
                                  item.sell_mode === "LOOSE"
                                    ? "bg-white text-primary shadow-xs dark:bg-card dark:text-white"
                                    : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                                }`}
                              >
                                Loose ({item.base_unit || "Tab"})
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleSellMode(idx, "STRIP")}
                                disabled={item.available_quantity < item.pack_size}
                                title={
                                  item.available_quantity < item.pack_size
                                    ? `Only ${item.available_quantity} loose units in stock`
                                    : "Sell full strip"
                                }
                                className={`rounded px-2 py-0.5 transition-all ${
                                  item.available_quantity < item.pack_size
                                    ? "cursor-not-allowed text-slate-300 dark:text-slate-600"
                                    : item.sell_mode === "STRIP"
                                    ? "bg-white text-primary shadow-xs dark:bg-card dark:text-white"
                                    : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                                }`}
                              >
                                Full Strip
                              </button>
                            </div>

                            {/* Quantity Controls */}
                            {item.sell_mode === "STRIP" ? (
                              <div className="flex items-center justify-center gap-1">
                                <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white dark:border-border dark:bg-card">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateQty(idx, item.quantity - (item.pack_size || 1))}
                                    className="p-1 text-slate-500 hover:text-slate-900"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </button>
                                  <span className="w-12 text-center text-xs font-bold text-slate-900 dark:text-white">
                                    {Math.floor(item.quantity / (item.pack_size || 1))} Strip
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateQty(idx, item.quantity + (item.pack_size || 1))}
                                    disabled={item.quantity + (item.pack_size || 1) > item.available_quantity}
                                    className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-40"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>
                                <span className="text-[10px] text-slate-400">
                                  ({item.quantity} {item.base_unit || "Tabs"})
                                </span>
                              </div>
                            ) : (
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
                                    disabled={item.quantity >= item.available_quantity}
                                    className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-40"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 px-1.5 py-0.5 rounded">
                                  {item.base_unit || "Tab"}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
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
                                disabled={item.quantity >= item.available_quantity}
                                className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-40"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {item.sell_mode === "STRIP" && item.pack_size && item.pack_size > 1 ? (
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">
                              ₹{(item.unit_price * item.pack_size).toFixed(2)}
                              <span className="text-[10px] text-slate-400 font-normal"> /{item.package_type || "Strip"}</span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              (₹{item.unit_price.toFixed(2)} /{item.base_unit || "Tab"})
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">
                              ₹{item.unit_price.toFixed(2)}
                              <span className="text-[10px] text-slate-400 font-normal"> /{item.base_unit || "Tab"}</span>
                            </div>
                            {item.pack_size && item.pack_size > 1 && (
                              <div className="text-[10px] text-slate-400">
                                (Strip: ₹{(item.unit_price * item.pack_size).toFixed(2)})
                              </div>
                            )}
                          </div>
                        )}
                        <span className="text-[9px] text-slate-400 font-medium">
                          {(item.is_tax_inclusive !== undefined ? item.is_tax_inclusive : taxMode === "INCLUSIVE")
                            ? "Incl. GST"
                            : "+ GST Extra"}
                        </span>
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
                        {calcLineAmounts(
                          item,
                          item.is_tax_inclusive !== undefined ? item.is_tax_inclusive : taxMode === "INCLUSIVE"
                        ).total.toFixed(2)}
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
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {items.map((it: any) => (
                          <div key={it.id} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-muted dark:text-slate-300">
                            <Pill className="h-2.5 w-2.5 text-indigo-600" />
                            <span>{it.medicine_name}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSubstituteModalTarget({
                                  brandName: it.medicine_name,
                                  genericName: it.generic_name || undefined,
                                })
                                setIsSubstituteModalOpen(true)
                              }}
                              title="Find same-salt substitutes in pharmacy"
                              className="ml-1 text-[9px] font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 hover:underline inline-flex items-center gap-0.5"
                            >
                              <Sparkles className="h-2 w-2" />
                              <span>Sub</span>
                            </button>
                          </div>
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

      {/* Persistent MARG-Style POS Keyboard Shortcuts Dock */}
      <div className="col-span-12 sticky bottom-2 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/95 p-3 text-white shadow-2xl backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => {
              searchInputRef.current?.focus()
              searchInputRef.current?.select()
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-1.5 font-semibold text-slate-200 transition-all hover:bg-slate-700 active:scale-95"
          >
            <kbd className="rounded bg-slate-700 px-1.5 py-0.5 font-mono text-[10px] font-black text-amber-400">F2</kbd>
            <span>Search Medicine</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const modes: Array<"CASH" | "UPI" | "CARD" | "SPLIT" | "IPD_LEDGER"> =
                saleType === "IPD"
                  ? ["IPD_LEDGER", "CASH", "UPI", "CARD"]
                  : ["CASH", "UPI", "CARD", "SPLIT"]
              setPaymentMode((prev) => {
                const idx = modes.indexOf(prev)
                const next = modes[(idx + 1) % modes.length]
                toast.info(`Payment Mode switched to: ${next}`)
                return next
              })
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-1.5 font-semibold text-slate-200 transition-all hover:bg-slate-700 active:scale-95"
          >
            <kbd className="rounded bg-slate-700 px-1.5 py-0.5 font-mono text-[10px] font-black text-sky-400">F4</kbd>
            <span>Pay Mode: <strong className="text-white">{paymentMode}</strong></span>
          </button>

          <button
            type="button"
            onClick={() => setIsRxDrawerOpen((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-1.5 font-semibold text-slate-200 transition-all hover:bg-slate-700 active:scale-95"
          >
            <kbd className="rounded bg-slate-700 px-1.5 py-0.5 font-mono text-[10px] font-black text-indigo-400">F8</kbd>
            <span>Doctor Prescriptions ({pendingPrescriptions.length})</span>
          </button>

          {(selectedPatient || patientId) && (
            <button
              type="button"
              onClick={() => setIsPatientHistoryModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-950/80 border border-teal-800/60 px-2.5 py-1.5 font-semibold text-teal-200 transition-all hover:bg-teal-900 active:scale-95"
            >
              <kbd className="rounded bg-teal-900 px-1.5 py-0.5 font-mono text-[10px] font-black text-teal-300">F9</kbd>
              <span>Refill History</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (cart.length > 0 && !confirm("Clear current cart and start a new sale?")) return
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
              toast.info("POS Terminal Reset")
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-1.5 font-semibold text-slate-300 transition-all hover:bg-slate-700 active:scale-95"
          >
            <kbd className="rounded bg-slate-700 px-1.5 py-0.5 font-mono text-[10px] font-black text-slate-400">Alt+N</kbd>
            <span>New Sale</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCheckout}
            disabled={cart.length === 0 || saleMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 font-black text-xs text-white shadow-md shadow-emerald-600/30 transition-all hover:bg-emerald-500 disabled:opacity-40 active:scale-95"
          >
            <kbd className="rounded bg-emerald-700 px-1.5 py-0.5 font-mono text-[10px] font-black text-emerald-200">Ctrl+Enter</kbd>
            <span>Complete & Bill (₹{netRounded})</span>
          </button>
        </div>
      </div>

      {/* Generic Salt Substitute Intelligence Modal */}
      <SaltSubstituteModal
        isOpen={isSubstituteModalOpen}
        onClose={() => {
          setIsSubstituteModalOpen(false)
          setSubstituteModalTarget(null)
        }}
        medicineId={substituteModalTarget?.medicineId}
        initialBrandName={substituteModalTarget?.brandName}
        initialGenericName={substituteModalTarget?.genericName}
        currentPrice={substituteModalTarget?.currentPrice}
        onSelectBatch={handleSelectSubstituteBatch}
      />

      {/* Patient Past Medication History & 1-Click Refill Modal */}
      <PatientMedicationHistoryModal
        isOpen={isPatientHistoryModalOpen}
        onClose={() => setIsPatientHistoryModalOpen(false)}
        patient={
          selectedPatient ||
          (patientId
            ? ({
                id: patientId,
                uhid: "UHID",
                name: customerName,
                mobile: customerPhone,
              } as any)
            : null)
        }
        onRefillItem={handleRefillItem}
        onRefillAll={handleRefillAll}
        onOpenSubstitutes={(medId, bName, gName) => {
          setSubstituteModalTarget({
            medicineId: medId,
            brandName: bName,
            genericName: gName,
          })
          setIsSubstituteModalOpen(true)
        }}
      />

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
