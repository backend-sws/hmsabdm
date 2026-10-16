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
import type { LabOrder, LabTestTemplate } from "@/types/lab"

interface DirectLabBookingModalProps {
  isOpen?: boolean
  orderToEdit?: LabOrder | null
  onClose: () => void
  onSuccess?: (order?: LabOrder) => void
}

const getPatientAgeDisplay = (p?: any): string => {
  if (!p) return "N/A"
  if (p.age !== undefined && p.age !== null && p.age !== "") {
    return String(p.age)
  }
  if (p.dob) {
    const dob = new Date(p.dob)
    if (!isNaN(dob.getTime())) {
      const now = new Date()
      let years = now.getFullYear() - dob.getFullYear()
      const m = now.getMonth() - dob.getMonth()
      if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
        years--
      }
      if (years >= 0) return String(years)
    }
  }
  return "N/A"
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
  const [walkinName, setWalkinName] = useState("")
  const [walkinGender, setWalkinGender] = useState<"M" | "F" | "O">("M")
  const [walkinAge, setWalkinAge] = useState<string>("30")
  const [walkinMobile, setWalkinMobile] = useState("")
  const [walkinAddress, setWalkinAddress] = useState("")

  // Referring Doctor & Urgency
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("")
  const [urgency, setUrgency] = useState<"Routine" | "STAT">("Routine")

  // Selected Tests
  const [testSearch, setTestSearch] = useState("")
  const [selectedTemplates, setSelectedTemplates] = useState<LabTestTemplate[]>([])

  // Billing & Payment
  const [discountAmount, setDiscountAmount] = useState<string>("0")
  const [discountReason] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "card">("cash")

  // Success Token Slip State
  const [createdOrder, setCreatedOrder] = useState<LabOrder | null>(null)

  // Initialize from orderToEdit if provided
  useEffect(() => {
    if (!isOpen) return
    if (!orderToEdit) {
      setPatientMode("existing")
      setSelectedPatient(null)
      setWalkinName("")
      setWalkinGender("M")
      setWalkinAge("30")
      setWalkinMobile("")
      setWalkinAddress("")
      setSelectedDoctorId("")
      setUrgency("Routine")
      setSelectedTemplates([])
      setDiscountAmount("0")
      setCreatedOrder(null)
      return
    }

    if (orderToEdit.patient) {
      setSelectedPatient(orderToEdit.patient)
      setPatientMode("existing")
      setWalkinName(orderToEdit.patient.name || "")
      setWalkinGender(
        orderToEdit.patient.gender === "Female" || orderToEdit.patient.gender === "F" ? "F" : "M"
      )
      setWalkinAge(String(orderToEdit.patient.age || "30"))
      setWalkinMobile((orderToEdit.patient as any).phone || (orderToEdit.patient as any).mobile || "")
      setWalkinAddress((orderToEdit.patient as any).address || "")
    }

    if (orderToEdit.doctor_id) {
      setSelectedDoctorId(String(orderToEdit.doctor_id))
    }
    if (orderToEdit.urgency) {
      setUrgency(orderToEdit.urgency as any)
    }

    if (orderToEdit.invoice) {
      setDiscountAmount(String(orderToEdit.invoice.discount_amount || 0))
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

  // Booking Mutation
  const bookMutation = useMutation({
    mutationFn: () => {
      const payload: any = {
        template_ids: selectedTemplates.map((t) => t.id),
        urgency,
        doctor_id: selectedDoctorId ? parseInt(selectedDoctorId) : null,
        discount_amount: discountNum,
        discount_reason: discountReason || undefined,
        payment_method: paymentMethod,
      }

      if (patientMode === "existing") {
        if (!selectedPatient) throw new Error("Please select an existing patient.")
        payload.patient_id = selectedPatient.id
      } else {
        if (!walkinName.trim()) throw new Error("Please enter patient name.")
        payload.walkin_patient = {
          name: walkinName.trim(),
          gender: walkinGender,
          age: parseInt(walkinAge) || 30,
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
            <div class="info-row"><span>Patient:</span><strong>${createdOrder.patient?.name || ""}</strong></div>
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
                      {createdOrder.patient?.name}
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
                        Age: {getPatientAgeDisplay(selectedPatient)} Y • Gender:{" "}
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
                            {p.uhid} • Age: {getPatientAgeDisplay(p)} Y • Mobile: {p.mobile || p.phone || "N/A"}
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
              <div className="p-4 rounded-xl border border-border bg-card grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-[11px] font-bold text-foreground">
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. Ramesh Kumar"
                    value={walkinName}
                    onChange={(e) => setWalkinName(e.target.value)}
                    className="h-8.5 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-foreground">Gender</Label>
                  <select
                    value={walkinGender}
                    onChange={(e) => setWalkinGender(e.target.value as any)}
                    className="w-full h-8.5 px-2.5 rounded-lg border border-border bg-card text-xs"
                  >
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="O">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-foreground">Age (Years)</Label>
                  <Input
                    type="number"
                    placeholder="35"
                    value={walkinAge}
                    onChange={(e) => setWalkinAge(e.target.value)}
                    className="h-8.5 text-xs font-mono"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-[11px] font-bold text-foreground">Mobile Phone</Label>
                  <Input
                    placeholder="9876543210"
                    value={walkinMobile}
                    onChange={(e) => setWalkinMobile(e.target.value)}
                    className="h-8.5 text-xs font-mono"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-[11px] font-bold text-foreground">City / Address</Label>
                  <Input
                    placeholder="Local Area / Address"
                    value={walkinAddress}
                    onChange={(e) => setWalkinAddress(e.target.value)}
                    className="h-8.5 text-xs"
                  />
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
            <div className="space-y-1.5 pt-1">
              <Label className="text-[11px] font-semibold text-foreground">Payment Mode:</Label>
              <div className="flex gap-2">
                {[
                  { id: "cash", label: "Cash", icon: Banknote },
                  { id: "upi", label: "UPI / QR", icon: QrCode },
                  { id: "card", label: "Card / POS", icon: CreditCard },
                ].map((m) => {
                  const Icon = m.icon
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                        paymentMethod === m.id
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
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-muted/40 border-t border-border flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {selectedTemplates.length} test(s) • Total: ₹{netPayable.toFixed(2)}
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
              disabled={bookMutation.isPending || selectedTemplates.length === 0}
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
