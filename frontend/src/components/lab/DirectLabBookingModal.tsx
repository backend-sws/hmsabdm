import React, { useState, useMemo, useEffect } from "react"
import { createPortal } from "react-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  X,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  Receipt,
  Ticket,
  Printer,
  CreditCard,
  Banknote,
  QrCode,
  Split,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { labService } from "@/services/labService"
import { patientService } from "@/services/patientService"
import { doctorService } from "@/services/doctorService"
import { directLabBookingSchema } from "@/schemas/lab.schema"
import { formatPatientAge, formatPatientDob } from "@/utils/patientUtils"
import type { LabOrder, LabTestTemplate } from "@/types/lab"

interface DirectLabBookingModalProps {
  isOpen?: boolean
  orderToEdit?: LabOrder | null
  onClose: () => void
  onSuccess?: (order?: LabOrder) => void
}

const getPatientAgeDisplay = (p?: any): string => {
  if (!p) return "N/A"
  return formatPatientAge(p.age, p.dob, p.age_unit)
}

export const DirectLabBookingModal: React.FC<DirectLabBookingModalProps> = ({
  isOpen = true,
  orderToEdit,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, onClose])

  // Mode: Existing Patient vs New Walk-In
  const [patientMode, setPatientMode] = useState<"existing" | "new">("existing")

  // Existing Patient Search
  const [patientSearch, setPatientSearch] = useState("")
  const [selectedPatient, setSelectedPatient] = useState<any>(null)

  // New Walk-in Patient Form
  const [walkinTitle, setWalkinTitle] = useState<string>("Mr.")
  const [walkinName, setWalkinName] = useState("")
  const [walkinGender, setWalkinGender] = useState<"M" | "F" | "O">("M")
  const [walkinAge, setWalkinAge] = useState<string>("30")
  const [walkinAgeUnit, setWalkinAgeUnit] = useState<"Years" | "Months" | "Days">("Years")
  const [walkinDob, setWalkinDob] = useState<string>("")
  const [showDobPicker, setShowDobPicker] = useState<boolean>(false)
  const [walkinMobile, setWalkinMobile] = useState("")
  const [walkinAddress, setWalkinAddress] = useState("")

  const handleTitleChange = (newTitle: string) => {
    setWalkinTitle(newTitle)
    if (["Mr.", "Master"].includes(newTitle)) {
      setWalkinGender("M")
    } else if (["Mrs.", "Ms.", "Miss"].includes(newTitle)) {
      setWalkinGender("F")
    }
  }

  // Auto sync estimated DOB from Age & Unit
  const syncDobFromAge = (ageStr: string, unit: "Years" | "Months" | "Days") => {
    const ageNum = parseInt(ageStr)
    if (isNaN(ageNum) || ageNum < 0) return
    const d = new Date()
    if (unit === "Days") {
      d.setDate(d.getDate() - ageNum)
    } else if (unit === "Months") {
      d.setMonth(d.getMonth() - ageNum)
    } else {
      d.setFullYear(d.getFullYear() - ageNum)
    }
    setWalkinDob(d.toISOString().split("T")[0])
  }

  // Handle exact DOB change and calculate age + best clinical unit
  const handleDobChange = (dobStr: string) => {
    setWalkinDob(dobStr)
    if (!dobStr) return
    const birth = new Date(dobStr)
    if (isNaN(birth.getTime())) return
    const diffMs = Date.now() - birth.getTime()
    const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
    if (days < 30) {
      setWalkinAge(String(days))
      setWalkinAgeUnit("Days")
    } else {
      const months = Math.floor(days / 30.4375)
      if (months < 24) {
        setWalkinAge(String(months))
        setWalkinAgeUnit("Months")
      } else {
        const years = Math.floor(days / 365.25)
        setWalkinAge(String(years))
        setWalkinAgeUnit("Years")
      }
    }
  }

  // Referring Doctor & Urgency
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("")
  const [urgency, setUrgency] = useState<"Routine" | "STAT">("Routine")

  // Selected Tests
  const [testSearch, setTestSearch] = useState("")
  const [selectedTemplates, setSelectedTemplates] = useState<LabTestTemplate[]>([])

  // Billing & Payment
  const [discountAmount, setDiscountAmount] = useState<string>("0")
  const [discountReason] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "card" | "split">("cash")
  const [singleUtrNumber, setSingleUtrNumber] = useState<string>("")
  const [singleCardRef, setSingleCardRef] = useState<string>("")

  // Split Payment states
  const [splitCashAmount, setSplitCashAmount] = useState<string>("")
  const [splitUpiAmount, setSplitUpiAmount] = useState<string>("")
  const [splitUpiUtr, setSplitUpiUtr] = useState<string>("")
  const [splitCardAmount, setSplitCardAmount] = useState<string>("")
  const [splitCardRef, setSplitCardRef] = useState<string>("")

  // Success Token Slip State
  const [createdOrder, setCreatedOrder] = useState<LabOrder | null>(null)

  // Initialize from orderToEdit if provided
  useEffect(() => {
    if (!isOpen) return
    if (!orderToEdit) {
      setPatientMode("existing")
      setSelectedPatient(null)
      setWalkinTitle("Mr.")
      setWalkinName("")
      setWalkinGender("M")
      setWalkinAge("30")
      setWalkinAgeUnit("Years")
      setWalkinDob("")
      setShowDobPicker(false)
      setWalkinMobile("")
      setWalkinAddress("")
      setSelectedDoctorId("")
      setUrgency("Routine")
      setSelectedTemplates([])
      setDiscountAmount("0")
      setPaymentMethod("cash")
      setSingleUtrNumber("")
      setSingleCardRef("")
      setSplitCashAmount("")
      setSplitUpiAmount("")
      setSplitUpiUtr("")
      setSplitCardAmount("")
      setSplitCardRef("")
      setCreatedOrder(null)
      return
    }

    if (orderToEdit.patient) {
      const p = orderToEdit.patient
      setSelectedPatient(p)
      setPatientMode("existing")
      const rawName = p.name || ""
      const titleMatch = rawName.match(/^(Mr\.|Mrs\.|Ms\.|Miss|Master|Baby|Dr\.|Prof\.)\s+(.+)$/i)
      if (titleMatch) {
        setWalkinTitle(titleMatch[1])
        setWalkinName(titleMatch[2])
      } else {
        setWalkinTitle(p.gender === "Female" || p.gender === "F" ? "Mrs." : "Mr.")
        setWalkinName(rawName)
      }
      setWalkinGender(
        p.gender === "Female" || p.gender === "F" ? "F" : "M"
      )

      if (p.dob) {
        const dobStr = p.dob.substring(0, 10)
        setWalkinDob(dobStr)
        const birth = new Date(p.dob)
        if (!isNaN(birth.getTime())) {
          const diffMs = Date.now() - birth.getTime()
          const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
          if (days < 30) {
            setWalkinAge(String(days))
            setWalkinAgeUnit("Days")
          } else {
            const months = Math.floor(days / 30.4375)
            if (months < 24) {
              setWalkinAge(String(months))
              setWalkinAgeUnit("Months")
            } else {
              setWalkinAge(String(Math.floor(days / 365.25)))
              setWalkinAgeUnit("Years")
            }
          }
        }
      } else {
        setWalkinAge(String(p.age || "30"))
        setWalkinAgeUnit("Years")
      }

      setWalkinMobile((p as any).phone || (p as any).mobile || "")
      setWalkinAddress((p as any).address || "")
    }

    if (orderToEdit.doctor_id) {
      setSelectedDoctorId(String(orderToEdit.doctor_id))
    }
    if (orderToEdit.urgency) {
      setUrgency(orderToEdit.urgency as any)
    }

    if (orderToEdit.invoice) {
      setDiscountAmount(String(orderToEdit.invoice.discount_amount || 0))
      if (orderToEdit.invoice.payment_method) {
        setPaymentMethod(orderToEdit.invoice.payment_method as any)
      }
      if (Array.isArray(orderToEdit.invoice.payment_breakdown)) {
        const bd = orderToEdit.invoice.payment_breakdown
        const cashItem = bd.find((b: any) => b.method === "cash")
        const upiItem = bd.find((b: any) => b.method === "upi")
        const cardItem = bd.find((b: any) => b.method === "card")
        if (cashItem) setSplitCashAmount(String(cashItem.amount || ""))
        if (upiItem) {
          setSplitUpiAmount(String(upiItem.amount || ""))
          setSplitUpiUtr(String(upiItem.ref || ""))
          setSingleUtrNumber(String(upiItem.ref || ""))
        }
        if (cardItem) {
          setSplitCardAmount(String(cardItem.amount || ""))
          setSplitCardRef(String(cardItem.ref || ""))
          setSingleCardRef(String(cardItem.ref || ""))
        }
      }
    }

    if (orderToEdit.items && orderToEdit.items.length > 0) {
      const templates: LabTestTemplate[] = orderToEdit.items.map((it) => {
        if (it.test_template) return it.test_template
        return {
          id: it.test_template_id || it.id,
          name: it.test_name,
          test_code: it.test_code || "TEST",
          department: "Pathology",
          standard_price: (it as any).price || (it as any).unit_price || 0,
          container_color: "Gold / Red",
          sample_type: "Serum / Whole Blood",
          parameters: [],
        } as any
      })
      setSelectedTemplates(templates)
    }
  }, [orderToEdit, isOpen])

  // Query Existing Patients
  const { data: patientsData, isLoading: isSearchingPatients } = useQuery({
    queryKey: ["patients", "search", patientSearch],
    queryFn: () => patientService.getPatients({ search: patientSearch, per_page: 8 }),
    enabled: isOpen && patientMode === "existing" && patientSearch.trim().length >= 2,
  })

  const searchedPatients = useMemo(() => {
    if (!patientsData) return []
    return Array.isArray(patientsData) ? patientsData : patientsData.data || []
  }, [patientsData])

  // Query Doctors
  const { data: doctorsData } = useQuery({
    queryKey: ["doctors", "list"],
    queryFn: () => doctorService.getDoctors(),
    enabled: isOpen,
  })

  const doctorsList = useMemo(() => {
    if (!doctorsData) return []
    return Array.isArray(doctorsData) ? doctorsData : (doctorsData as any).data || []
  }, [doctorsData])

  // Query Lab Templates Catalog
  const { data: templatesData, isLoading: isSearchingTemplates } = useQuery({
    queryKey: ["lab", "templates", "search", testSearch],
    queryFn: () => labService.getTemplates({ search: testSearch, per_page: 15 }),
    enabled: isOpen,
  })

  const availableTemplates = useMemo(() => {
    if (!templatesData) return []
    const list = Array.isArray(templatesData) ? templatesData : templatesData.data || []
    const selectedIds = new Set(selectedTemplates.map((t) => t.id))
    return list.filter((t) => !selectedIds.has(t.id))
  }, [templatesData, selectedTemplates])

  // Calculations
  const grossTotal = useMemo(() => {
    return selectedTemplates.reduce((sum, t) => sum + (parseFloat(String(t.standard_price)) || 0), 0)
  }, [selectedTemplates])

  const discountNum = Math.min(grossTotal, Math.max(0, parseFloat(discountAmount) || 0))
  const netPayable = Math.max(0, grossTotal - discountNum)

  const totalCost = useMemo(() => {
    return selectedTemplates.reduce((sum, t) => {
      const isOutsource = t.fulfillment_type === "outsourced"
      const cost = isOutsource ? (t.b2b_cost || 0) : (t.reagent_cost || 0)
      return sum + cost
    }, 0)
  }, [selectedTemplates])

  const estimatedProfit = Math.max(0, netPayable - totalCost)
  const estimatedMarginPercent = netPayable > 0 ? Math.round((estimatedProfit / netPayable) * 100) : 0

  const splitTotal = useMemo(() => {
    const cash = parseFloat(splitCashAmount) || 0
    const upi = parseFloat(splitUpiAmount) || 0
    const card = parseFloat(splitCardAmount) || 0
    return Math.round((cash + upi + card) * 100) / 100
  }, [splitCashAmount, splitUpiAmount, splitCardAmount])

  const splitDiff = useMemo(() => {
    return Math.round((netPayable - splitTotal) * 100) / 100
  }, [netPayable, splitTotal])

  const handleSelectPaymentMethod = (method: "cash" | "upi" | "card" | "split") => {
    setPaymentMethod(method)
    if (method === "split") {
      if (!splitCashAmount && !splitUpiAmount && !splitCardAmount && netPayable > 0) {
        const half = Math.round((netPayable / 2) * 100) / 100
        const remainder = Math.round((netPayable - half) * 100) / 100
        setSplitCashAmount(String(half))
        setSplitUpiAmount(String(remainder))
      }
    }
  }

  const handleAllocateRemainder = (target: "upi" | "cash") => {
    if (target === "upi") {
      const cur = parseFloat(splitUpiAmount) || 0
      const updated = Math.max(0, Math.round((cur + splitDiff) * 100) / 100)
      setSplitUpiAmount(String(updated))
    } else {
      const cur = parseFloat(splitCashAmount) || 0
      const updated = Math.max(0, Math.round((cur + splitDiff) * 100) / 100)
      setSplitCashAmount(String(updated))
    }
  }

  // Booking Mutation
  const bookMutation = useMutation({
    mutationFn: () => {
      let finalPaymentBreakdown: Array<{ method: string; amount: number; ref?: string }> | undefined = undefined

      if (paymentMethod === "split") {
        finalPaymentBreakdown = []
        const cashVal = parseFloat(splitCashAmount) || 0
        const upiVal = parseFloat(splitUpiAmount) || 0
        const cardVal = parseFloat(splitCardAmount) || 0

        if (cashVal > 0) {
          finalPaymentBreakdown.push({ method: "cash", amount: cashVal })
        }
        if (upiVal > 0) {
          finalPaymentBreakdown.push({
            method: "upi",
            amount: upiVal,
            ref: splitUpiUtr.trim() || undefined,
          })
        }
        if (cardVal > 0) {
          finalPaymentBreakdown.push({
            method: "card",
            amount: cardVal,
            ref: splitCardRef.trim() || undefined,
          })
        }

        if (finalPaymentBreakdown.length === 0) {
          throw new Error("Please enter split payment amounts for Cash or UPI.")
        }
        if (Math.abs(splitDiff) > 0.05) {
          throw new Error(
            `Split payment total (₹${splitTotal}) must match Net Payable (₹${netPayable.toFixed(2)}). Difference: ₹${splitDiff}`
          )
        }
      } else if (paymentMethod === "upi") {
        if (singleUtrNumber.trim()) {
          finalPaymentBreakdown = [
            {
              method: "upi",
              amount: netPayable,
              ref: singleUtrNumber.trim(),
            },
          ]
        }
      } else if (paymentMethod === "card") {
        if (singleCardRef.trim()) {
          finalPaymentBreakdown = [
            {
              method: "card",
              amount: netPayable,
              ref: singleCardRef.trim(),
            },
          ]
        }
      }

      const payload: any = {
        template_ids: selectedTemplates.map((t) => t.id),
        urgency,
        doctor_id: selectedDoctorId ? parseInt(selectedDoctorId) : null,
        discount_amount: discountNum,
        discount_reason: discountReason || undefined,
        payment_method: paymentMethod,
        payment_breakdown: finalPaymentBreakdown,
        utr_number:
          paymentMethod === "upi"
            ? singleUtrNumber.trim() || undefined
            : paymentMethod === "split"
            ? splitUpiUtr.trim() || undefined
            : undefined,
      }

      if (patientMode === "existing") {
        if (!selectedPatient) throw new Error("Please select an existing patient.")
        payload.patient_id = selectedPatient.id
      } else {
        if (!walkinName.trim()) throw new Error("Please enter patient name.")
        const ageNum = parseInt(walkinAge) || 0
        let finalDob = walkinDob
        if (!finalDob) {
          const d = new Date()
          if (walkinAgeUnit === "Days") {
            d.setDate(d.getDate() - ageNum)
          } else if (walkinAgeUnit === "Months") {
            d.setMonth(d.getMonth() - ageNum)
          } else {
            d.setFullYear(d.getFullYear() - ageNum)
          }
          finalDob = d.toISOString().split("T")[0]
        }

        const trimmedName = walkinName.trim()
        const hasTitlePrefix = /^(mr|mrs|ms|miss|master|baby|dr|prof)\.?\s+/i.test(trimmedName)
        const finalFullName = hasTitlePrefix ? trimmedName : `${walkinTitle} ${trimmedName}`

        payload.walkin_patient = {
          title: walkinTitle,
          name: finalFullName,
          gender: walkinGender,
          age: ageNum,
          age_unit: walkinAgeUnit,
          dob: finalDob,
          mobile: walkinMobile.trim() || undefined,
          address: walkinAddress.trim() || undefined,
        }
      }

      // Validate using Zod schema contract
      const validation = directLabBookingSchema.safeParse(payload)
      if (!validation.success) {
        throw new Error(validation.error.issues[0]?.message || "Invalid direct lab booking payload")
      }

      if (orderToEdit) {
        return labService.updateDirectBooking(orderToEdit.id, payload)
      }

      return labService.createDirectBooking(payload)
    },
    onSuccess: (order) => {
      if (orderToEdit) {
        toast.success(`Lab order #${orderToEdit.order_number} and billing updated successfully!`)
        queryClient.invalidateQueries({ queryKey: ["lab", "orders"] })
        queryClient.invalidateQueries({ queryKey: ["lab", "invoices"] })
        queryClient.invalidateQueries({ queryKey: ["lab", "order", orderToEdit.id] })
        onSuccess?.(order)
        onClose()
      } else {
        toast.success(
          `Direct lab order booked! Phlebotomy Token: ${order.token_number || "P-01"} assigned.`
        )
        queryClient.invalidateQueries({ queryKey: ["lab", "orders"] })
        queryClient.invalidateQueries({ queryKey: ["lab", "invoices"] })
        setCreatedOrder(order)
        onSuccess?.(order)
      }
    },
    onError: (err: any) => {
      toast.error(
        err.message ||
          (orderToEdit ? "Failed to update lab order & bill." : "Failed to create direct lab booking.")
      )
    },
  })

  const addTemplate = (tpl: LabTestTemplate) => {
    setSelectedTemplates((prev) => [...prev, tpl])
    setTestSearch("")
  }

  const removeTemplate = (id: number) => {
    setSelectedTemplates((prev) => prev.filter((t) => t.id !== id))
  }

  const handlePrintSlip = () => {
    if (!createdOrder) return
    const iframe = document.createElement("iframe")
    iframe.style.position = "fixed"
    iframe.style.right = "0"
    iframe.style.bottom = "0"
    iframe.style.width = "0"
    iframe.style.height = "0"
    iframe.style.border = "none"
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow?.document
    if (!doc) return

    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Token Slip - ${createdOrder.token_number || ""}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 3mm;
            }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              width: 74mm;
              font-family: Arial, sans-serif;
              font-size: 11px;
              color: #000;
              background: #fff;
              padding: 4mm 2mm;
              text-align: center;
            }
            .title { font-size: 14px; font-weight: 900; margin-bottom: 2px; }
            .subtitle { font-size: 10px; margin-bottom: 6px; }
            .token-box {
              border: 2px dashed #000;
              padding: 10px 4px;
              margin: 8px 0;
              border-radius: 6px;
            }
            .token-label { font-size: 10px; font-weight: bold; text-transform: uppercase; }
            .token-num { font-size: 36px; font-weight: 900; font-family: monospace; letter-spacing: 2px; margin: 4px 0; }
            .info { text-align: left; font-size: 11px; margin-top: 8px; border-top: 1px solid #000; padding-top: 6px; line-height: 1.5; }
            .info-row { display: flex; justify-content: space-between; }
            .footer { font-size: 9px; margin-top: 10px; border-top: 1px dashed #000; padding-top: 6px; }
          </style>
        </head>
        <body>
          <div class="title">HOSPITAL LABORATORY</div>
          <div class="subtitle">Direct Lab Booking & Invoice • #${createdOrder.order_number}</div>
          <div class="token-box">
            <div class="token-label">Phlebotomy Queue Token</div>
            <div class="token-num">${createdOrder.token_number || "P-01"}</div>
            <div style="font-size: 9px;">Please proceed to Blood Collection Area</div>
          </div>
          <div class="info">
            <div class="info-row"><span>Patient:</span><strong>${createdOrder.patient?.name || ""} (${formatPatientAge(createdOrder.patient?.age, createdOrder.patient?.dob)})</strong></div>
            <div class="info-row"><span>UHID:</span><strong>${createdOrder.patient?.uhid || ""}</strong></div>
            <div class="info-row"><span>Tests Booked:</span><strong>${createdOrder.items?.length || 0} Test(s)</strong></div>
            <div class="info-row"><span>Urgency:</span><strong>${createdOrder.urgency || "Routine"}</strong></div>
            <div class="info-row"><span>Date/Time:</span><span>${new Date().toLocaleString()}</span></div>
          </div>
          <div class="footer">Please hold this slip until your token is called</div>
        </body>
      </html>
    `)
    doc.close()

    iframe.contentWindow?.focus()
    setTimeout(() => {
      iframe.contentWindow?.print()
      setTimeout(() => {
        document.body.removeChild(iframe)
      }, 1000)
    }, 250)
  }

  if (!isOpen) return null

  // ── TOKEN SLIP RECEIPT IN RIGHT SIDEBAR DRAWER (POST-BOOKING) ──
  if (createdOrder) {
    return createPortal(
      <div className="fixed inset-0 z-[100] overflow-hidden bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="absolute inset-0" onClick={onClose} />
        <div className="fixed inset-y-0 right-0 z-[100] flex max-w-full pl-6 sm:pl-10">
          <div className="w-screen max-w-md md:max-w-lg bg-card border-l border-border shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300 ease-out">
            <div className="px-6 py-4 bg-muted/40 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm">Lab Order & Bill Created</h3>
                  <p className="text-xs text-muted-foreground">Order #{createdOrder.order_number}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="text-center space-y-1">
                <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <h3 className="font-black text-lg text-foreground">Booking & Counter Bill Confirmed</h3>
                <p className="text-xs text-muted-foreground">
                  Patient registration & diagnostics order have been logged to the hospital system.
                </p>
              </div>

              {/* Token Slip Box */}
              <div className="p-5 bg-muted/30 border-2 border-dashed border-border rounded-2xl space-y-3 text-left">
                <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    Phlebotomy Queue Token
                  </span>
                  <Badge
                    className={
                      createdOrder.urgency === "STAT"
                        ? "bg-destructive text-destructive-foreground animate-pulse text-[10px]"
                        : "bg-primary text-primary-foreground text-[10px]"
                    }
                  >
                    {createdOrder.urgency}
                  </Badge>
                </div>

                <div className="text-center py-3">
                  <div className="font-mono text-5xl font-black text-primary tracking-widest">
                    {createdOrder.token_number || "P-01"}
                  </div>
                  <span className="text-xs font-medium text-muted-foreground mt-1 inline-block">
                    Please proceed to Blood Collection Waiting Area
                  </span>
                </div>

                <div className="border-t border-border/60 pt-3 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Patient:</span>
                    <span className="font-bold text-foreground">
                      {createdOrder.patient?.name}{" "}
                      <span className="text-[11px] font-normal text-muted-foreground">
                        ({formatPatientAge(createdOrder.patient?.age, createdOrder.patient?.dob)})
                      </span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">UHID:</span>
                    <span className="font-mono font-bold text-primary">
                      {createdOrder.patient?.uhid}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tests Booked:</span>
                    <span className="font-semibold text-foreground">
                      {createdOrder.items?.length || 0} Test(s)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-muted/40 border-t border-border flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="flex-1 text-xs h-10"
              >
                Done
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handlePrintSlip}
                className="flex-1 text-xs h-10 font-bold gap-1.5 shadow-md shadow-primary/20"
              >
                <Printer className="h-4 w-4" />
                Print Token Slip
              </Button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    )
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-hidden bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-[100] flex max-w-full pl-6 sm:pl-10">
        <div className="w-screen max-w-3xl lg:max-w-4xl bg-card border-l border-border shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300 ease-out">
          {/* Header */}
        <div className="px-6 py-4 bg-muted/40 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Ticket className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-base">
                {orderToEdit
                  ? `Edit Lab Order & Bill — #${orderToEdit.order_number}`
                  : "Direct Walk-In Lab Booking & Counter Billing"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {orderToEdit
                  ? "Modify investigations, patient details, discount, and synchronize billing ledger."
                  : "Book pathology tests, generate instant tax invoice, and issue phlebotomy collection token."}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* 1. Patient Selection Toggle */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <Label className="text-xs font-bold text-foreground uppercase tracking-wider">
                1. Patient Identification
              </Label>
              <div className="flex rounded-lg border border-border p-0.5 bg-muted/40 text-xs">
                <button
                  type="button"
                  onClick={() => setPatientMode("existing")}
                  className={`px-3 py-1 rounded-md font-semibold transition-all ${
                    patientMode === "existing"
                      ? "bg-card text-foreground shadow-2xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Existing Hospital Patient
                </button>
                <button
                  type="button"
                  onClick={() => setPatientMode("new")}
                  className={`px-3 py-1 rounded-md font-semibold transition-all ${
                    patientMode === "new"
                      ? "bg-card text-foreground shadow-2xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Quick Register Walk-In
                </button>
              </div>
            </div>

            {patientMode === "existing" ? (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by UHID, Patient Name, or Mobile Number..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    className="pl-9 text-xs h-9"
                  />
                </div>

                {selectedPatient ? (
                  <div className="p-3 rounded-xl border border-primary/40 bg-primary/5 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-foreground text-sm flex items-center gap-2">
                        {selectedPatient.name}
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {selectedPatient.uhid}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        Age: {getPatientAgeDisplay(selectedPatient)} • Gender:{" "}
                        {selectedPatient.gender === "M" || selectedPatient.gender === "Male"
                          ? "Male"
                          : selectedPatient.gender === "F" || selectedPatient.gender === "Female"
                          ? "Female"
                          : selectedPatient.gender || "Other"}{" "}
                        • Mobile: {selectedPatient.mobile || (selectedPatient as any).phone || "N/A"}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedPatient(null)}
                      className="text-xs h-7 text-muted-foreground"
                    >
                      Change
                    </Button>
                  </div>
                ) : isSearchingPatients ? (
                  <div className="py-4 text-center">
                    <LoadingSpinner label="Searching patient records..." />
                  </div>
                ) : searchedPatients.length > 0 ? (
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-border divide-y divide-border">
                    {searchedPatients.map((p: any) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelectedPatient(p)
                          setPatientSearch("")
                        }}
                        className="p-2.5 hover:bg-muted/60 cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <div>
                          <div className="font-semibold text-foreground text-xs">{p.name}</div>
                          <span className="text-[10px] text-muted-foreground">
                            {p.uhid} • Age: {getPatientAgeDisplay(p)} • Mobile: {p.mobile || p.phone || "N/A"}
                          </span>
                        </div>
                        <Badge variant="secondary" className="text-[10px]">
                          Select
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : patientSearch.trim().length >= 2 ? (
                  <div className="text-[11px] text-muted-foreground p-3 border border-dashed rounded-xl text-center">
                    No matching patient found. Switch to "Quick Register Walk-In" to create.
                  </div>
                ) : null}
              </div>
            ) : (
              /* Quick Walk-In Form */
              <div className="p-4 rounded-xl border border-border bg-card space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  {/* Full Name with Title / Salutation Prefix */}
                  <div className="sm:col-span-5 space-y-1">
                    <Label className="text-[11px] font-bold text-foreground">
                      Full Name <span className="text-destructive">*</span>
                    </Label>
                    <div className="flex gap-1.5">
                      <select
                        value={walkinTitle}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        className="h-8.5 px-2 rounded-lg border border-border bg-card text-xs font-bold w-22 cursor-pointer shrink-0 focus:outline-none focus:ring-1 focus:ring-primary"
                        title="Select title / salutation (Mr., Mrs., Ms., Miss, Master, Baby, Dr., Prof.)"
                      >
                        <option value="Mr.">Mr.</option>
                        <option value="Mrs.">Mrs.</option>
                        <option value="Ms.">Ms.</option>
                        <option value="Miss">Miss</option>
                        <option value="Master">Master</option>
                        <option value="Baby">Baby</option>
                        <option value="Dr.">Dr.</option>
                        <option value="Prof.">Prof.</option>
                      </select>
                      <Input
                        placeholder="e.g. Ramesh Kumar / Baby of Priya"
                        value={walkinName}
                        onChange={(e) => setWalkinName(e.target.value)}
                        className="h-8.5 text-xs flex-1"
                      />
                    </div>
                  </div>

                  {/* Gender */}
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-[11px] font-bold text-foreground">Gender</Label>
                    <select
                      value={walkinGender}
                      onChange={(e) => setWalkinGender(e.target.value as any)}
                      className="w-full h-8.5 px-2.5 rounded-lg border border-border bg-card text-xs font-medium"
                    >
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                      <option value="O">Other</option>
                    </select>
                  </div>

                  {/* Age & Unit / DOB */}
                  <div className="sm:col-span-5 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Label className="text-[11px] font-bold text-foreground">Age & Unit</Label>
                        {walkinAgeUnit === "Days" ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30">
                            👶 Newborn
                          </span>
                        ) : walkinAgeUnit === "Months" ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                            🍼 Infant
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground font-medium">
                            🧑 Adult/Child
                          </span>
                        )}
                        {walkinDob && !showDobPicker && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            (DOB: {formatPatientDob(walkinDob)})
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowDobPicker(!showDobPicker)}
                        className="text-[10px] font-semibold text-primary hover:underline cursor-pointer"
                      >
                        {showDobPicker ? "🔢 Enter Age" : "📅 Exact DOB"}
                      </button>
                    </div>

                    {showDobPicker ? (
                      <Input
                        type="date"
                        value={walkinDob}
                        max={new Date().toISOString().split("T")[0]}
                        onChange={(e) => handleDobChange(e.target.value)}
                        className="h-8.5 text-xs font-mono"
                      />
                    ) : (
                      <div className="flex gap-1.5">
                        <Input
                          type="number"
                          min="0"
                          max={walkinAgeUnit === "Days" ? 31 : walkinAgeUnit === "Months" ? 24 : 125}
                          placeholder={walkinAgeUnit === "Days" ? "3" : walkinAgeUnit === "Months" ? "2" : "30"}
                          value={walkinAge}
                          onChange={(e) => {
                            setWalkinAge(e.target.value)
                            syncDobFromAge(e.target.value, walkinAgeUnit)
                          }}
                          className="h-8.5 text-xs font-mono flex-1"
                        />
                        <select
                          value={walkinAgeUnit}
                          onChange={(e) => {
                            const newUnit = e.target.value as "Years" | "Months" | "Days"
                            setWalkinAgeUnit(newUnit)
                            syncDobFromAge(walkinAge, newUnit)
                          }}
                          className="h-8.5 px-2.5 rounded-lg border border-border bg-card text-xs font-bold w-32 cursor-pointer"
                        >
                          <option value="Years">Years (Yrs)</option>
                          <option value="Months">Months (M)</option>
                          <option value="Days">Days (D)</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Second row: Contact & Address Information */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-border/50">
                  {/* Mobile Phone */}
                  <div className="sm:col-span-5 space-y-1">
                    <Label className="text-[11px] font-bold text-foreground">Mobile Phone (Optional)</Label>
                    <Input
                      placeholder="10-digit mobile number"
                      value={walkinMobile}
                      onChange={(e) => setWalkinMobile(e.target.value)}
                      className="h-8.5 text-xs font-mono"
                    />
                  </div>

                  {/* City / Address */}
                  <div className="sm:col-span-7 space-y-1">
                    <Label className="text-[11px] font-bold text-foreground">Address / City / Locality (Optional)</Label>
                    <Input
                      placeholder="Street, City, Area / Locality"
                      value={walkinAddress}
                      onChange={(e) => setWalkinAddress(e.target.value)}
                      className="h-8.5 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. Investigation Search & Selected Tests */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-bold text-foreground uppercase tracking-wider">
                2. Select Pathology Tests from Master Catalog (281+ Tests)
              </Label>
              <span className="text-[11px] text-muted-foreground">
                {selectedTemplates.length} Test(s) Added
              </span>
            </div>

            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search test by name or code (e.g. CBC, Lipid, Creatinine, Thyroid, BSF)..."
                value={testSearch}
                onChange={(e) => setTestSearch(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>

            {testSearch.trim().length > 0 && (
              <div className="max-h-44 overflow-y-auto rounded-xl border border-border divide-y divide-border mb-3 bg-card shadow-lg z-20">
                {isSearchingTemplates ? (
                  <div className="p-3 text-center">
                    <LoadingSpinner label="Searching catalog..." />
                  </div>
                ) : availableTemplates.length === 0 ? (
                  <div className="p-3 text-center text-muted-foreground text-xs">
                    No matching tests found.
                  </div>
                ) : (
                  availableTemplates.map((tpl) => (
                    <div
                      key={tpl.id}
                      onClick={() => addTemplate(tpl)}
                      className="p-2.5 hover:bg-muted/60 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {tpl.test_code}
                        </Badge>
                        <span className="font-semibold text-xs text-foreground">
                          {tpl.test_name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          ({tpl.category})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-primary text-xs">
                          ₹{parseFloat(String(tpl.standard_price)).toFixed(2)}
                        </span>
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
                          <Plus className="h-3 w-3" /> Add
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Selected Tests Table */}
            {selectedTemplates.length > 0 ? (
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 text-[10px] uppercase font-bold text-muted-foreground border-b border-border">
                    <tr>
                      <th className="py-2 px-3 text-left">Test Name</th>
                      <th className="py-2 px-3 text-left">Specimen Tube</th>
                      <th className="py-2 px-3 text-right">Standard Rate</th>
                      <th className="py-2 px-2 text-center w-12">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {selectedTemplates.map((t) => (
                      <tr key={t.id} className="hover:bg-muted/20">
                        <td className="py-2 px-3 font-semibold text-foreground">
                          {t.test_name}
                          <span className="font-mono text-[10px] text-muted-foreground ml-2">
                            [{t.test_code}]
                          </span>
                        </td>
                        <td className="py-2 px-3 text-muted-foreground text-[11px]">
                          {t.container_color || "Red / Plain"}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-foreground">
                          ₹{parseFloat(String(t.standard_price)).toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeTemplate(t.id)}
                            className="text-muted-foreground hover:text-destructive p-1 rounded"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-border text-center text-muted-foreground text-xs">
                No tests added yet. Use the search bar above to add pathology tests.
              </div>
            )}
          </div>

          {/* 3. Clinical Urgency & Referring Doctor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border border-border">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground">
                Clinical Priority / Urgency:
              </Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setUrgency("Routine")}
                  className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-bold transition-all ${
                    urgency === "Routine"
                      ? "border-primary bg-primary/10 text-primary shadow-2xs"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Routine Order
                </button>
                <button
                  type="button"
                  onClick={() => setUrgency("STAT")}
                  className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-bold transition-all ${
                    urgency === "STAT"
                      ? "border-destructive bg-destructive/15 text-destructive shadow-2xs animate-pulse"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  STAT Critical Priority
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground">
                Referring Doctor (Optional):
              </Label>
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="w-full h-8.5 px-2.5 rounded-lg border border-border bg-card text-xs font-medium"
              >
                <option value="">Self / Direct Walk-In</option>
                {doctorsList.map((doc: any) => (
                  <option key={doc.id} value={doc.id}>
                    Dr. {doc.name} ({doc.department?.name || "OPD"})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. Instant Billing & Payment Collection */}
          <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
              <Receipt className="h-4 w-4" />
              4. Counter Payment Collection & Billing
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-[11px] text-muted-foreground block">Gross Total</span>
                <span className="font-mono text-base font-bold text-foreground">
                  ₹{grossTotal.toFixed(2)}
                </span>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-foreground">
                  Concession / Discount (₹)
                </Label>
                <Input
                  type="number"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  placeholder="0"
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div>
                <span className="text-[11px] text-primary font-bold block">Net Payable</span>
                <span className="font-mono text-xl font-black text-primary">
                  ₹{netPayable.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Payment Mode Selection */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-semibold text-foreground">Payment Mode:</Label>
                {paymentMethod === "split" && (
                  <span className={`text-[10px] font-bold ${splitDiff === 0 ? "text-emerald-600" : "text-amber-600"}`}>
                    {splitDiff === 0 ? `✓ Exactly allocated: ₹${netPayable.toFixed(2)}` : `Difference: ₹${splitDiff.toFixed(2)}`}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "cash", label: "Cash", icon: Banknote },
                  { id: "upi", label: "UPI / QR", icon: QrCode },
                  { id: "card", label: "Card / POS", icon: CreditCard },
                  { id: "split", label: "Split / Multi", icon: Split },
                ].map((m) => {
                  const Icon = m.icon
                  const isActive = paymentMethod === m.id
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleSelectPaymentMethod(m.id as any)}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? "border-primary bg-primary text-primary-foreground shadow-2xs"
                          : "border-border bg-card text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {m.label}
                    </button>
                  )
                })}
              </div>

              {/* UPI Mode -> Single UPI UTR Input */}
              {paymentMethod === "upi" && (
                <div className="p-2.5 rounded-lg border border-border/80 bg-background/80 space-y-1 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold text-foreground">
                      UPI Reference / UTR Number (Optional)
                    </Label>
                    <span className="text-[10px] text-muted-foreground">e.g. 12-digit Bank UTR / UPI Ref</span>
                  </div>
                  <Input
                    placeholder="Enter 12-digit UTR No. (e.g. 428712345678 / GPay Ref)..."
                    value={singleUtrNumber}
                    onChange={(e) => setSingleUtrNumber(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              )}

              {/* Card Mode -> Single Card Ref Input */}
              {paymentMethod === "card" && (
                <div className="p-2.5 rounded-lg border border-border/80 bg-background/80 space-y-1 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold text-foreground">
                      Card Last 4 Digits / POS Auth Approval Code (Optional)
                    </Label>
                    <span className="text-[10px] text-muted-foreground">e.g. 4321 / Auth 8912</span>
                  </div>
                  <Input
                    placeholder="Enter Card Last 4 Digits / POS Ref..."
                    value={singleCardRef}
                    onChange={(e) => setSingleCardRef(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              )}

              {/* Split Mode -> Multi-Mode Breakdown Fields */}
              {paymentMethod === "split" && (
                <div className="p-3 rounded-lg border border-primary/20 bg-background/90 space-y-2.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
                    <span className="text-[11px] font-bold text-primary flex items-center gap-1.5">
                      <Split className="h-3.5 w-3.5" />
                      Split Payment Breakdown
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Net Payable: <strong className="text-foreground">₹{netPayable.toFixed(2)}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Cash Part */}
                    <div className="p-2 rounded-md border border-border bg-card space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-bold text-foreground flex items-center gap-1">
                          <Banknote className="h-3 w-3 text-emerald-600" />
                          Cash Amount (₹)
                        </Label>
                        {splitDiff !== 0 && (
                          <button
                            type="button"
                            onClick={() => handleAllocateRemainder("cash")}
                            className="text-[9px] font-bold text-primary hover:underline cursor-pointer"
                          >
                            Auto-Fill Balance
                          </button>
                        )}
                      </div>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0.00"
                        value={splitCashAmount}
                        onChange={(e) => setSplitCashAmount(e.target.value)}
                        className="h-7.5 text-xs font-mono font-bold"
                      />
                    </div>

                    {/* UPI Part + UTR */}
                    <div className="p-2 rounded-md border border-border bg-card space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-bold text-foreground flex items-center gap-1">
                          <QrCode className="h-3 w-3 text-blue-600" />
                          UPI Amount (₹)
                        </Label>
                        {splitDiff !== 0 && (
                          <button
                            type="button"
                            onClick={() => handleAllocateRemainder("upi")}
                            className="text-[9px] font-bold text-primary hover:underline cursor-pointer"
                          >
                            Auto-Fill Balance
                          </button>
                        )}
                      </div>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0.00"
                        value={splitUpiAmount}
                        onChange={(e) => setSplitUpiAmount(e.target.value)}
                        className="h-7.5 text-xs font-mono font-bold"
                      />
                      <Input
                        placeholder="UPI UTR No. (Optional)"
                        value={splitUpiUtr}
                        onChange={(e) => setSplitUpiUtr(e.target.value)}
                        className="h-7 text-[11px] font-mono mt-1"
                      />
                    </div>
                  </div>

                  {/* Summary & Validation status */}
                  <div
                    className={`p-2 rounded-md text-[11px] font-medium flex items-center justify-between ${
                      splitDiff === 0
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                    }`}
                  >
                    <span>
                      Allocated: <strong>₹{splitTotal.toFixed(2)}</strong> of{" "}
                      <strong>₹{netPayable.toFixed(2)}</strong>
                    </span>
                    <span>
                      {splitDiff === 0 ? (
                        <span className="font-bold flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                        </span>
                      ) : splitDiff > 0 ? (
                        <span className="font-bold">₹{splitDiff.toFixed(2)} Pending</span>
                      ) : (
                        <span className="font-bold">₹{Math.abs(splitDiff).toFixed(2)} Over</span>
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-muted/40 border-t border-border flex items-center justify-between">
          <div className="text-xs text-muted-foreground flex items-center gap-3">
            <span>
              {selectedTemplates.length} test(s) • Total: <strong>₹{netPayable.toFixed(2)}</strong>
            </span>
            {totalCost > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-500/15 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                Profit: +₹{estimatedProfit.toFixed(0)} ({estimatedMarginPercent}% Margin)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={bookMutation.isPending}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => bookMutation.mutate()}
              disabled={
                bookMutation.isPending ||
                selectedTemplates.length === 0 ||
                (paymentMethod === "split" && Math.abs(splitDiff) > 0.05)
              }
              title={
                paymentMethod === "split" && Math.abs(splitDiff) > 0.05
                  ? `Allocated split amount (₹${splitTotal}) must match Net Payable (₹${netPayable.toFixed(2)})`
                  : undefined
              }
              className="text-xs font-bold gap-1.5 h-9 px-4"
            >
              <Ticket className="h-4 w-4" />
              {orderToEdit
                ? bookMutation.isPending
                  ? "Saving Changes..."
                  : "Save Changes & Recalculate Bill"
                : bookMutation.isPending
                ? "Booking Order..."
                : "Confirm & Issue Phlebotomy Token"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>,
  document.body
)
}
