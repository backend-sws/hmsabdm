import React, { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  DollarSign,
  Receipt,
  Tag,
  Settings,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Edit2,
  Printer,
  Sparkles,
  Building,
  User,
  Clock,
  CreditCard,
  FlaskConical,
  CheckCircle2,
  RotateCcw,
  DoorOpen,
  BarChart3,
  Banknote,
  ShieldCheck,
} from "lucide-react"

import {
  OpdQuickBillCounterTab,
  CollectAdvanceDepositModal,
  CashierDayEndModal,
  PrintTaxInvoiceModal,
  PrintGatePassModal,
  CentralSettlementModal,
  IssueRefundModal,
} from "@/components/billing"
import { DirectLabBookingModal } from "@/components/lab/DirectLabBookingModal"
import { PageHeader } from "@/components/common/PageHeader"
import { DataTable, type Column } from "@/components/common/DataTable"
import { FormContainer } from "@/components/formContainer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

import { billingService } from "@/services/billingService"
import { patientService } from "@/services/patientService"
import { ipdService } from "@/services/ipdService"
import { queryKeys } from "@/constants/queryKeys"
import type {
  ChargeItem,
  BillingLedgerItem,
  CreateChargePayload,
  UpdateChargePayload,
  CreateCategoryPayload,
  PostLedgerPayload,
  BedBillingConfig,
  PendingDischargeItem,
} from "@/types/billing"

export const BillingDeskPage: React.FC = () => {
  const queryClient = useQueryClient()

  // ─── Active Tab ──────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<
    "opd-counter" | "pending-discharge" | "invoices" | "ledger" | "tariff" | "rules"
  >("opd-counter")

  // ─── Modal States for Enhanced Billing Desk ─────────────────────────
  const [depositModalOpen, setDepositModalOpen] = useState(false)
  const [dayEndModalOpen, setDayEndModalOpen] = useState(false)
  const [taxInvoiceModalOpen, setTaxInvoiceModalOpen] = useState(false)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null)
  const [gatePassModalOpen, setGatePassModalOpen] = useState(false)
  const [selectedGatePassAdmissionId, setSelectedGatePassAdmissionId] = useState<number | null>(null)
  const [settlementModalOpen, setSettlementModalOpen] = useState(false)
  const [selectedSettlementAdmissionId, setSelectedSettlementAdmissionId] = useState<number | null>(null)
  const [refundModalOpen, setRefundModalOpen] = useState(false)
  const [refundPatient, setRefundPatient] = useState<{ id: number; name: string; uhid: string } | null>(null)

  // ─── Global Invoices Register Filters & Pagination ───────────────────
  const [invoiceSearch, setInvoiceSearch] = useState("")
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<"all" | "paid" | "partially_paid" | "pending">("all")
  const [invoiceEncounterFilter, setInvoiceEncounterFilter] = useState<"all" | "ipd" | "opd" | "emergency" | "lab" | "pharmacy">("all")
  const [invoiceDateFrom, setInvoiceDateFrom] = useState("")
  const [invoiceDateTo, setInvoiceDateTo] = useState("")
  const [invoicePage, setInvoicePage] = useState(1)

  // ─── Tariff Tab Filters & States ─────────────────────────────────────
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [tariffSearch, setTariffSearch] = useState<string>("")
  const [createChargeModalOpen, setCreateChargeModalOpen] = useState(false)
  const [createCategoryModalOpen, setCreateCategoryModalOpen] = useState(false)
  const [editingCharge, setEditingCharge] = useState<ChargeItem | null>(null)

  // ─── Ledger Tab States ───────────────────────────────────────────────
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null)
  const [patientSearchTerm, setPatientSearchTerm] = useState<string>("")
  const [postChargeModalOpen, setPostChargeModalOpen] = useState(false)
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [itemToCancel, setItemToCancel] = useState<BillingLedgerItem | null>(null)
  const [cancelReason, setCancelReason] = useState<string>("")

  // ─── Direct Lab Billing Modal State ──────────────────────────────────
  const [directLabModalOpen, setDirectLabModalOpen] = useState(false)


  // ─── Queries ────────────────────────────────────────────────────────
  // 1. Categories
  const { data: categories = [] } = useQuery({
    queryKey: queryKeys.billing.categories,
    queryFn: () => billingService.getCategories(),
  })

  // 2. Charges Catalog
  const {
    data: charges = [],
    isLoading: chargesLoading,
    isRefetching: chargesRefetching,
  } = useQuery({
    queryKey: queryKeys.billing.charges({ category: categoryFilter, search: tariffSearch }),
    queryFn: () =>
      billingService.getCharges({
        category: categoryFilter === "all" ? undefined : categoryFilter,
        search: tariffSearch || undefined,
        all: true,
      }),
  })

  // 3. Wards for Tariff Linking
  const { data: wards = [] } = useQuery({
    queryKey: queryKeys.ipd.wards,
    queryFn: () => ipdService.getWards(),
    enabled: createChargeModalOpen || !!editingCharge,
  })

  // 4. Patients search for Ledger
  const { data: patientsData } = useQuery({
    queryKey: queryKeys.patients.list({ search: patientSearchTerm }),
    queryFn: () => patientService.getPatients({ search: patientSearchTerm, limit: 10 }),
    enabled: patientSearchTerm.length >= 2,
  })
  const searchResultsPatients = useMemo(() => patientsData?.data || [], [patientsData])

  // 5. Selected Patient's Live Running Ledger
  const {
    data: patientLedger,
    isLoading: ledgerLoading,
  } = useQuery({
    queryKey: queryKeys.billing.patientLedger(selectedPatientId || 0),
    queryFn: () => billingService.getPatientLedger(selectedPatientId!),
    enabled: !!selectedPatientId,
  })

  // 7. Bed Billing Configuration
  const { data: bedConfig, refetch: refetchBedConfig } = useQuery({
    queryKey: queryKeys.billing.bedConfig,
    queryFn: () => billingService.getBedBillingConfig(),
  })

  // 8. Global Invoices Register & Master Audit
  const {
    data: globalInvoicesData,
    isLoading: globalInvoicesLoading,
  } = useQuery({
    queryKey: queryKeys.billing.invoices({
      search: invoiceSearch,
      payment_status: invoiceStatusFilter,
      encounter_type: invoiceEncounterFilter,
      date_from: invoiceDateFrom,
      date_to: invoiceDateTo,
      page: invoicePage,
    }),
    queryFn: () =>
      billingService.getInvoices({
        search: invoiceSearch || undefined,
        payment_status: invoiceStatusFilter,
        encounter_type: invoiceEncounterFilter,
        date_from: invoiceDateFrom || undefined,
        date_to: invoiceDateTo || undefined,
        page: invoicePage,
        per_page: 15,
      }),
    enabled: activeTab === "invoices",
  })

  // 9. Pending Discharge Settlement Queue
  const {
    data: pendingDischarges = [],
    isLoading: pendingDischargesLoading,
    refetch: refetchPendingDischarges,
  } = useQuery({
    queryKey: queryKeys.billing.pendingDischarges(),
    queryFn: () => billingService.getPendingDischarges(),
  })


  // ─── Mutations ──────────────────────────────────────────────────────
  // Create / Update Charge
  const [chargePayload, setChargePayload] = useState<CreateChargePayload>({
    category_id: 1,
    code: "",
    name: "",
    description: "",
    billing_type: "fixed",
    standard_rate: 0,
    tax_percentage: 0,
    ward_id: undefined,
  })

  const saveChargeMutation = useMutation({
    mutationFn: () => {
      if (editingCharge) {
        const updatePayload: UpdateChargePayload = {
          name: chargePayload.name,
          description: chargePayload.description,
          billing_type: chargePayload.billing_type,
          standard_rate: Number(chargePayload.standard_rate),
          tax_percentage: Number(chargePayload.tax_percentage),
          ward_id: chargePayload.ward_id,
        }
        return billingService.updateCharge(editingCharge.id, updatePayload)
      }
      return billingService.createCharge({
        ...chargePayload,
        standard_rate: Number(chargePayload.standard_rate),
        tax_percentage: Number(chargePayload.tax_percentage),
      })
    },
    onSuccess: () => {
      toast.success(editingCharge ? "Tariff rate updated!" : "New service tariff created!")
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.charges() })
      setCreateChargeModalOpen(false)
      setEditingCharge(null)
    },
    onError: (err: any) => toast.error(err.message || "Failed to save charge"),
  })

  // Delete Charge
  const deleteChargeMutation = useMutation({
    mutationFn: (id: number) => billingService.deleteCharge(id),
    onSuccess: () => {
      toast.success("Charge tariff deactivated")
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.charges() })
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete charge"),
  })

  // Create Category
  const [categoryPayload, setCategoryPayload] = useState<CreateCategoryPayload>({
    name: "",
    display_name: "",
    description: "",
  })

  const createCategoryMutation = useMutation({
    mutationFn: () => billingService.createCategory(categoryPayload),
    onSuccess: () => {
      toast.success("Charge category created!")
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.categories })
      setCreateCategoryModalOpen(false)
      setCategoryPayload({ name: "", display_name: "", description: "" })
    },
    onError: (err: any) => toast.error(err.message || "Failed to create category"),
  })

  // Post Ledger Charge
  const [ledgerPayload, setLedgerPayload] = useState<PostLedgerPayload>({
    patient_id: 0,
    encounter_type: "ipd",
    encounter_id: 1,
    charge_id: undefined,
    item_name: "",
    unit_price: 0,
    quantity: 1,
    tax_amount: 0,
    discount_amount: 0,
    notes: "",
  })

  const postLedgerMutation = useMutation({
    mutationFn: () =>
      billingService.postLedgerCharge({
        ...ledgerPayload,
        patient_id: selectedPatientId!,
        unit_price: Number(ledgerPayload.unit_price),
        quantity: Number(ledgerPayload.quantity),
      }),
    onSuccess: () => {
      toast.success("Charge posted to patient running ledger!")
      queryClient.invalidateQueries({
        queryKey: queryKeys.billing.patientLedger(selectedPatientId!),
      })
      setPostChargeModalOpen(false)
    },
    onError: (err: any) => toast.error(err.message || "Failed to post ledger charge"),
  })

  // Cancel Ledger Item
  const cancelLedgerMutation = useMutation({
    mutationFn: () => {
      if (!itemToCancel) throw new Error("No item selected")
      return billingService.cancelLedgerItem(itemToCancel.id, cancelReason)
    },
    onSuccess: () => {
      toast.success("Ledger charge item cancelled")
      queryClient.invalidateQueries({
        queryKey: queryKeys.billing.patientLedger(selectedPatientId!),
      })
      setCancelModalOpen(false)
      setItemToCancel(null)
      setCancelReason("")
    },
    onError: (err: any) => toast.error(err.message || "Failed to cancel item"),
  })

  // Update Bed Billing Config
  const [configState, setConfigState] = useState<BedBillingConfig | null>(null)
  React.useEffect(() => {
    if (bedConfig) setConfigState(bedConfig)
  }, [bedConfig])

  const updateBedConfigMutation = useMutation({
    mutationFn: () => {
      if (!configState) throw new Error("No configuration loaded")
      return billingService.updateBedBillingConfig(configState)
    },
    onSuccess: () => {
      toast.success("Bed billing policies saved successfully!")
      refetchBedConfig()
    },
    onError: (err: any) => toast.error(err.message || "Failed to update bed settings"),
  })

  // Trigger Bed Billing Engine
  const triggerBedChargesMutation = useMutation({
    mutationFn: () => billingService.triggerBedCharges(),
    onSuccess: (res) => {
      toast.success(
        `Bed billing engine executed! Processed: ${res?.total_admissions_scanned ?? 0} admissions, Charged: ${res?.total_charges_created ?? 0} cycles`
      )
      if (selectedPatientId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.billing.patientLedger(selectedPatientId),
        })
      }
    },
    onError: (err: any) => toast.error(err.message || "Engine trigger failed"),
  })

  // ─── Table Columns: Tariff Catalog ──────────────────────────────────
  const tariffColumns: Column<ChargeItem>[] = [
    {
      key: "code",
      header: "Code",
      className: "w-[120px]",
      cell: (row) => (
        <span className="font-mono text-xs font-bold text-foreground bg-muted px-2 py-0.5 rounded">
          {row.code}
        </span>
      ),
    },
    {
      key: "name",
      header: "Service / Tariff Name",
      cell: (row) => (
        <div>
          <div className="font-semibold text-foreground text-xs">{row.name}</div>
          {row.description && (
            <div className="text-[11px] text-muted-foreground line-clamp-1">{row.description}</div>
          )}
          {row.ward && (
            <div className="text-[10px] text-primary flex items-center gap-1 mt-0.5">
              <Building className="h-3 w-3" /> Linked Ward: {row.ward.name}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      className: "w-[160px]",
      cell: (row) => (
        <Badge variant="outline" className="text-[10px] font-medium uppercase tracking-wider">
          {row.category?.display_name || row.category?.name || "General"}
        </Badge>
      ),
    },
    {
      key: "billing_type",
      header: "Billing Type",
      className: "w-[110px]",
      cell: (row) => {
        const types: Record<string, { label: string; color: string }> = {
          per_day: { label: "Per Day", color: "bg-sky-500/15 text-sky-700 dark:text-sky-400" },
          fixed: { label: "Fixed", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
          per_hour: { label: "Per Hour", color: "bg-purple-500/15 text-purple-700 dark:text-purple-400" },
          per_unit: { label: "Per Unit", color: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
        }
        const t = types[row.billing_type] || { label: row.billing_type, color: "bg-muted text-foreground" }
        return <Badge className={`${t.color} text-[10px] border`}>{t.label}</Badge>
      },
    },
    {
      key: "standard_rate",
      header: "Standard Rate",
      className: "w-[120px] text-right",
      cell: (row) => (
        <div className="text-right">
          <span className="font-mono font-bold text-foreground text-sm">
            ₹{Number(row.standard_rate).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
          {Number(row.tax_percentage) > 0 && (
            <span className="block text-[10px] text-muted-foreground font-mono">
              +{row.tax_percentage}% GST
            </span>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-[100px] text-right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            title="Edit Tariff"
            onClick={() => {
              setEditingCharge(row)
              setChargePayload({
                category_id: row.category_id,
                code: row.code,
                name: row.name,
                description: row.description || "",
                billing_type: row.billing_type,
                standard_rate: Number(row.standard_rate),
                tax_percentage: Number(row.tax_percentage),
                ward_id: row.ward_id || undefined,
              })
              setCreateChargeModalOpen(true)
            }}
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
            title="Deactivate Tariff"
            onClick={() => {
              if (confirm(`Deactivate tariff "${row.name}"?`)) {
                deleteChargeMutation.mutate(row.id)
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  // ─── Table Columns: Running Ledger ───────────────────────────────────
  const ledgerColumns: Column<BillingLedgerItem>[] = [
    {
      key: "charged_at",
      header: "Date & Time",
      className: "w-[140px]",
      cell: (row) => (
        <div className="text-[11px] font-mono text-muted-foreground">
          {new Date(row.charged_at).toLocaleDateString([], {
            month: "short",
            day: "numeric",
          })}{" "}
          •{" "}
          {new Date(row.charged_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      ),
    },
    {
      key: "encounter",
      header: "Encounter",
      className: "w-[90px]",
      cell: (row) => (
        <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider">
          {row.encounter_type}
        </Badge>
      ),
    },
    {
      key: "item_name",
      header: "Service / Description",
      cell: (row) => (
        <div className={row.status === "cancelled" ? "line-through opacity-50" : ""}>
          <div className="font-semibold text-foreground text-xs">{row.item_name}</div>
          <div className="text-[10px] text-muted-foreground flex items-center gap-2">
            <span className="uppercase font-mono">{row.category.replace(/_/g, " ")}</span>
            {row.auto_generated && (
              <span className="text-primary flex items-center gap-0.5">
                <Sparkles className="h-2.5 w-2.5" /> Auto-Cycle
              </span>
            )}
          </div>
          {row.notes && (
            <div className="text-[10px] text-muted-foreground italic mt-0.5">{row.notes}</div>
          )}
        </div>
      ),
    },
    {
      key: "rate",
      header: "Rate × Qty",
      className: "w-[120px] text-right",
      cell: (row) => (
        <div className="text-right text-xs font-mono">
          <span>₹{row.unit_price}</span> × <span>{row.quantity}</span>
        </div>
      ),
    },
    {
      key: "total_amount",
      header: "Net Total",
      className: "w-[110px] text-right",
      cell: (row) => (
        <div className="text-right">
          <span
            className={`font-mono font-bold text-xs ${
              row.status === "cancelled"
                ? "line-through text-muted-foreground"
                : "text-foreground"
            }`}
          >
            ₹{Number(row.total_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      className: "w-[90px]",
      cell: (row) => {
        if (row.status === "billed") {
          return (
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[9px]">
              Billed
            </Badge>
          )
        }
        if (row.status === "cancelled") {
          return (
            <Badge variant="outline" className="text-[9px] text-muted-foreground">
              Cancelled
            </Badge>
          )
        }
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[9px]">
            Unbilled
          </Badge>
        )
      },
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-[80px] text-right",
      cell: (row) => {
        if (row.status === "unbilled") {
          return (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-1.5 text-[10px] text-rose-600 hover:bg-rose-500/10"
              onClick={() => {
                setItemToCancel(row)
                setCancelModalOpen(true)
              }}
            >
              Cancel
            </Button>
          )
        }
        return null
      },
    },
  ]

  // ─── Table Columns: Pending Discharge Settlement Queue ──────────────
  const pendingDischargeColumns: Column<PendingDischargeItem>[] = [
    {
      key: "ipd_number",
      header: "IPD #",
      className: "w-[120px]",
      cell: (row) => (
        <div>
          <span className="font-mono text-xs font-bold text-foreground bg-muted px-2 py-0.5 rounded">
            {row.ipd_number}
          </span>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Admitted {row.days_admitted}d ago
          </div>
        </div>
      ),
    },
    {
      key: "patient",
      header: "Patient Details",
      cell: (row) => (
        <div>
          <div className="font-bold text-foreground text-xs flex items-center gap-1.5">
            {row.patient?.name}
            <Badge variant="outline" className="text-[10px] font-mono">
              {row.patient?.uhid}
            </Badge>
          </div>
          <div className="text-[11px] text-muted-foreground">
            {row.patient?.gender} • Mob: {row.patient?.mobile || "N/A"}
          </div>
        </div>
      ),
    },
    {
      key: "ward",
      header: "Ward & Bed",
      cell: (row) => (
        <div>
          <div className="font-semibold text-xs flex items-center gap-1 text-foreground">
            <Building className="h-3 w-3 text-primary" />
            {row.ward?.name || "General"}
          </div>
          <div className="text-[10px] text-muted-foreground font-mono">
            Bed: {row.bed?.bed_number || "Allotted"}
          </div>
        </div>
      ),
    },
    {
      key: "doctor",
      header: "Consultant",
      cell: (row) => (
        <span className="text-xs font-medium text-foreground">
          {row.doctor?.name || "Dr. Arvind Mehra"}
        </span>
      ),
    },
    {
      key: "unbilled",
      header: "Unbilled Items",
      className: "w-[100px] text-center",
      cell: (row) => (
        <Badge variant="secondary" className="font-mono text-[10px]">
          {row.unbilled_items_count} charges
        </Badge>
      ),
    },
    {
      key: "gross_amount",
      header: "Gross Bill",
      className: "text-right w-[110px]",
      cell: (row) => (
        <span className="font-mono font-semibold text-xs">
          ₹{row.gross_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: "advance_paid",
      header: "Advance Paid",
      className: "text-right w-[110px]",
      cell: (row) => (
        <span className="font-mono text-emerald-600 font-bold text-xs">
          -₹{row.advance_deposit_paid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: "estimated_due",
      header: "Est. Net Balance Due",
      className: "text-right w-[130px]",
      cell: (row) => (
        <span className="font-mono font-extrabold text-xs text-amber-700 dark:text-amber-400">
          ₹{row.estimated_due.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Clearance Action",
      className: "w-[150px] text-right",
      cell: (row) => (
        <Button
          size="sm"
          className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          onClick={() => {
            setSelectedSettlementAdmissionId(row.id)
            setSettlementModalOpen(true)
          }}
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> Settle & Clear
        </Button>
      ),
    },
  ]

  // ─── Table Columns: Global Invoices Register ─────────────────────────
  const invoiceColumns: Column<any>[] = [
    {
      key: "invoice_number",
      header: "Invoice #",
      className: "w-[150px]",
      cell: (row) => (
        <div>
          <span className="font-mono text-xs font-bold text-foreground">
            {row.invoice_number}
          </span>
          {row.gate_pass_number && (
            <div className="text-[10px] text-emerald-600 font-mono flex items-center gap-1 mt-0.5">
              <ShieldCheck className="h-3 w-3" /> {row.gate_pass_number}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "patient",
      header: "Patient",
      cell: (row) => (
        <div>
          <div className="font-bold text-foreground text-xs flex items-center gap-1.5">
            {row.patient?.name}
            <Badge variant="outline" className="text-[10px] font-mono">
              {row.patient?.uhid}
            </Badge>
          </div>
          <div className="text-[10px] text-muted-foreground">
            {row.patient?.gender} • {row.patient?.mobile || "No Mobile"}
          </div>
        </div>
      ),
    },
    {
      key: "encounter_type",
      header: "Dept / Encounter",
      className: "w-[110px]",
      cell: (row) => (
        <Badge variant="secondary" className="uppercase font-mono text-[9px]">
          {row.encounter_type || "IPD"}
        </Badge>
      ),
    },
    {
      key: "invoice_date",
      header: "Issued Date",
      className: "w-[130px]",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {new Date(row.invoice_date || row.issued_at).toLocaleString([], {
            dateStyle: "short",
            timeStyle: "short",
          })}
        </span>
      ),
    },
    {
      key: "net_amount",
      header: "Net Amount",
      className: "text-right w-[110px]",
      cell: (row) => (
        <span className="font-mono font-bold text-xs text-foreground">
          ₹{Number(row.net_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: "amount_paid",
      header: "Amount Paid",
      className: "text-right w-[110px]",
      cell: (row) => (
        <span className="font-mono font-bold text-xs text-emerald-600">
          ₹{Number(row.amount_paid).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: "payment_status",
      header: "Status",
      className: "w-[90px]",
      cell: (row) => (
        <Badge
          className={
            row.payment_status === "paid"
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[9px]"
              : row.payment_status === "partially_paid"
              ? "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30 text-[9px]"
              : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[9px]"
          }
        >
          {String(row.payment_status).toUpperCase()}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-[180px] text-right",
      cell: (row) => (
        <div className="flex justify-end gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 border-primary/40 text-primary hover:bg-primary/10"
            onClick={() => {
              setSelectedInvoiceId(row.id)
              setTaxInvoiceModalOpen(true)
            }}
          >
            <Printer className="h-3 w-3" /> Tax Invoice
          </Button>

          {(row.encounter_type === "ipd" || row.gate_pass_number) && row.encounter_id && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 border-slate-700/40 text-slate-700 dark:text-slate-300 hover:bg-slate-500/10"
              onClick={() => {
                setSelectedGatePassAdmissionId(row.encounter_id)
                setGatePassModalOpen(true)
              }}
            >
              <DoorOpen className="h-3 w-3" /> Gate Pass
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (

    <div className="space-y-6">
      {/* ────────────────────────────────────────────────────────────────
          TOP BAR: PAGE HEADER & ACTIONS
         ──────────────────────────────────────────────────────────────── */}
      <PageHeader
        title="Hospital Tariff & Billing Desk"
        subtitle="Customizable tariff catalog, patient running ledger accumulator, automated bed calculations & tax invoices"
        badgeText="Finance & Tariff"
        badgeVariant="default"
        icon={Receipt}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button

              size="sm"
              onClick={() => setDepositModalOpen(true)}
              className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
              title="Collect advance deposit and generate official deposit voucher"
            >
              <CreditCard className="h-3.5 w-3.5" />
              Collect Advance Deposit
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setDayEndModalOpen(true)}
              className="gap-1.5 text-xs border-sky-500/40 text-sky-700 dark:text-sky-300 hover:bg-sky-500/10 font-bold"
              title="Cash drawer reconciliation, payment modes breakup and shift closing sheet"
            >
              <BarChart3 className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
              Day-End Summary
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setDirectLabModalOpen(true)}
              className="gap-1.5 text-xs border-purple-500/40 text-purple-700 dark:text-purple-300 hover:bg-purple-500/10 font-bold"
              title="Create direct walk-in laboratory investigation bill and assign phlebotomy token"
            >
              <FlaskConical className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              Direct Lab Bill
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => triggerBedChargesMutation.mutate()}
              disabled={triggerBedChargesMutation.isPending}
              className="gap-1.5 text-xs border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
              title="Runs daily bed rent and nursing charge calculation for all admitted inpatients"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  triggerBedChargesMutation.isPending ? "animate-spin" : ""
                }`}
              />
              ⚡ Trigger Bed Charges Engine
            </Button>

            <Button
              size="sm"
              className="gap-1.5 text-xs bg-primary text-primary-foreground font-semibold"
              onClick={() => {
                setEditingCharge(null)
                setChargePayload({
                  category_id: categories[0]?.id || 1,
                  code: "",
                  name: "",
                  description: "",
                  billing_type: "fixed",
                  standard_rate: 0,
                  tax_percentage: 0,
                  ward_id: undefined,
                })
                setCreateChargeModalOpen(true)
              }}
            >
              <Plus className="h-4 w-4" /> Add Service Tariff
            </Button>
          </div>
        }
      />

      {/* ────────────────────────────────────────────────────────────────
          NAVIGATION TABS
         ──────────────────────────────────────────────────────────────── */}
      <div className="flex border-b border-border overflow-x-auto scrollbar-none gap-1 pb-0.5">
        <button
          onClick={() => setActiveTab("opd-counter")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "opd-counter"
              ? "border-primary text-primary bg-primary/5 font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <CreditCard className="h-4 w-4" /> OPD Token Quick Bill
        </button>

        <button
          onClick={() => setActiveTab("pending-discharge")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "pending-discharge"
              ? "border-primary text-primary bg-primary/5 font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <DoorOpen className="h-4 w-4" />
          Pending Discharges
          {pendingDischarges.length > 0 && (
            <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0 h-4 rounded-full font-mono">
              {pendingDischarges.length}
            </Badge>
          )}
        </button>

        <button
          onClick={() => setActiveTab("invoices")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "invoices"
              ? "border-primary text-primary bg-primary/5 font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Receipt className="h-4 w-4" /> Global Invoices & Audit
        </button>

        <button
          onClick={() => setActiveTab("ledger")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "ledger"
              ? "border-primary text-primary bg-primary/5 font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <DollarSign className="h-4 w-4" /> Patient Running Ledger
        </button>

        <button
          onClick={() => setActiveTab("tariff")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "tariff"
              ? "border-primary text-primary bg-primary/5 font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Tag className="h-4 w-4" /> Service Tariff Master ({charges.length})
        </button>

        <button
          onClick={() => setActiveTab("rules")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "rules"
              ? "border-primary text-primary bg-primary/5 font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Settings className="h-4 w-4" /> Bed Billing Policy & Rules
        </button>
      </div>


      {/* ════════════════════════════════════════════════════════════════
          TAB 0: OPD TOKEN QUICK BILL COUNTER
         ════════════════════════════════════════════════════════════════ */}
      {activeTab === "opd-counter" && <OpdQuickBillCounterTab />}

      {/* ════════════════════════════════════════════════════════════════
          TAB: PENDING INPATIENT DISCHARGE SETTLEMENT QUEUE
         ════════════════════════════════════════════════════════════════ */}
      {activeTab === "pending-discharge" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-3 bg-muted/30 border rounded-xl">
            <div>
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <DoorOpen className="h-4 w-4 text-primary" />
                Inpatient Discharge Clearance Queue ({pendingDischarges.length})
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Review running estimates, adjust advances, authorize concessions, settle balance & generate Security Gate Passes.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchPendingDischarges()}
              disabled={pendingDischargesLoading}
              className="gap-1.5 text-xs font-semibold"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${pendingDischargesLoading ? "animate-spin" : ""}`} /> Refresh Queue
            </Button>
          </div>

          <DataTable
            columns={pendingDischargeColumns}
            data={pendingDischarges}
            isLoading={pendingDischargesLoading}
            rowKey="id"
            emptyTitle="No Pending Discharge Settlements"
            emptyDescription="All admitted patients are either under ongoing care or have settled their final discharge invoices."
          />
        </div>
      )}


      {/* ════════════════════════════════════════════════════════════════
          TAB 1: SERVICE TARIFF MASTER
         ════════════════════════════════════════════════════════════════ */}
      {activeTab === "tariff" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/80">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs rounded-lg border border-input bg-background px-3 py-1.5 text-foreground focus:outline-hidden"
              >
                <option value="all">All Charge Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.display_name}
                  </option>
                ))}
              </select>

              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={() => setCreateCategoryModalOpen(true)}
              >
                <Plus className="h-3 w-3" /> New Category
              </Button>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search tariff code, service name..."
                value={tariffSearch}
                onChange={(e) => setTariffSearch(e.target.value)}
                className="pl-8 text-xs h-8"
              />
            </div>
          </div>

          <DataTable
            title="Hospital Service Tariffs Catalog"
            columns={tariffColumns}
            data={charges}
            isLoading={chargesLoading || chargesRefetching}
            rowKey="id"
            emptyTitle="No Tariff Items Found"
            emptyDescription="Create service charges to build your hospital rate master."
          />
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB 2: PATIENT RUNNING LEDGER
         ════════════════════════════════════════════════════════════════ */}
      {activeTab === "ledger" && (
        <div className="space-y-5">
          {/* Patient Selector Strip */}
          <div className="p-4 rounded-xl border border-border bg-card space-y-3">
            <Label className="text-xs font-bold uppercase tracking-wider block">
              1. Select Inpatient / OPD Patient for Running Bill
            </Label>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={patientSearchTerm}
                onChange={(e) => setPatientSearchTerm(e.target.value)}
                placeholder="Type patient name, mobile, or UHID..."
                className="pl-9 text-xs"
              />

              {/* Autocomplete dropdown */}
              {searchResultsPatients.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {searchResultsPatients.map((p: any) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedPatientId(p.id)
                        setPatientSearchTerm(`${p.name} (${p.uhid})`)
                      }}
                      className="p-2.5 hover:bg-muted cursor-pointer flex justify-between items-center text-xs border-b last:border-0"
                    >
                      <span className="font-semibold text-foreground">{p.name}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {p.uhid} • {p.gender} • {p.mobile || "No Mobile"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {selectedPatientId && patientLedger ? (
            <div className="space-y-4">
              {/* Financial Running Totals Ribbon */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl border border-border bg-card">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                    Gross Charges
                  </span>
                  <div className="text-xl font-bold font-mono text-foreground mt-1">
                    ₹{patientLedger.gross_total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {patientLedger.item_count} ledger items
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-card">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                    Applicable Tax
                  </span>
                  <div className="text-xl font-bold font-mono text-foreground mt-1">
                    ₹{patientLedger.tax_total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-muted-foreground">GST & Service Tax</span>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-card">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                    Hospital Discount
                  </span>
                  <div className="text-xl font-bold font-mono text-emerald-600 mt-1">
                    -₹{patientLedger.discount_total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-muted-foreground">Concessions applied</span>
                </div>

                <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5">
                  <span className="text-[10px] text-primary uppercase tracking-wider font-bold block">
                    Net Running Bill
                  </span>
                  <div className="text-xl font-bold font-mono text-primary mt-1">
                    ₹{patientLedger.net_total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-muted-foreground">Payable at discharge</span>
                </div>
              </div>

              {/* Category Breakdown Pills */}
              {Object.keys(patientLedger.by_category).length > 0 && (
                <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/30 rounded-xl border border-border/80">
                  <span className="text-[11px] font-semibold text-muted-foreground mr-1">
                    Category Breakdown:
                  </span>
                  {Object.entries(patientLedger.by_category).map(([cat, info]) => (
                    <Badge key={cat} variant="outline" className="text-[10px] py-1 font-mono gap-1">
                      <span className="uppercase text-muted-foreground font-sans">
                        {cat.replace(/_/g, " ")}:
                      </span>
                      <strong className="text-foreground">
                        ₹{info.total.toLocaleString("en-IN")} ({info.count})
                      </strong>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Action Strip & Ledger Table */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <h3 className="font-bold text-sm text-foreground">
                  Itemized Running Charges Accumulator
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs border-emerald-600/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 font-semibold"
                    onClick={() => setDepositModalOpen(true)}
                  >
                    <Banknote className="h-3.5 w-3.5 text-emerald-600" /> Collect Deposit
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs border-rose-500/30 text-rose-700 dark:text-rose-400 hover:bg-rose-500/10"
                    onClick={() => {
                      if (selectedPatientId && searchResultsPatients) {
                        const p = searchResultsPatients.find((pt: any) => pt.id === selectedPatientId)
                        setRefundPatient({ id: selectedPatientId, name: p?.name || "Patient", uhid: p?.uhid || "" })
                        setRefundModalOpen(true)
                      }
                    }}
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-rose-600" /> Issue Refund
                  </Button>

                  <Button
                    size="sm"
                    className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                    onClick={() => {
                      setLedgerPayload({
                        patient_id: selectedPatientId,
                        encounter_type: "ipd",
                        encounter_id: 1,
                        charge_id: undefined,
                        item_name: "",
                        unit_price: 0,
                        quantity: 1,
                        tax_amount: 0,
                        discount_amount: 0,
                        notes: "",
                      })
                      setPostChargeModalOpen(true)
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" /> Post Charge
                  </Button>
                </div>
              </div>


              <DataTable
                columns={ledgerColumns}
                data={patientLedger.items}
                isLoading={ledgerLoading}
                rowKey="id"
                emptyTitle="No Ledger Entries"
                emptyDescription="No billable charges have been posted to this patient yet."
              />
            </div>
          ) : (
            <div className="p-12 text-center border-2 border-dashed rounded-2xl border-border bg-card/50">
              <User className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="font-semibold text-foreground text-sm">No Patient Selected</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Search and select an active inpatient or OPD patient above to inspect their real-time
                running bill and post bedside charges.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB 3: BED BILLING POLICY & RULES
         ════════════════════════════════════════════════════════════════ */}
      {activeTab === "rules" && configState && (
        <div className="space-y-6 w-full">
          <div className="p-4 rounded-xl border border-border bg-card space-y-4 text-xs">
            <div>
              <h3 className="font-bold text-sm text-foreground">
                Customizable Inpatient Bed Calculation Policies
              </h3>
              <p className="text-muted-foreground text-xs mt-0.5">
                Configure how ward bed charges are accumulated without rigid midnight limitations.
              </p>
            </div>

            {/* Bed Billing Cycle Options */}
            <div className="space-y-2">
              <Label className="font-bold uppercase tracking-wider block">
                1. Bed Billing Cycle Calculation Mode
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 24h Allotment */}
                <div
                  onClick={() =>
                    setConfigState({ ...configState, bed_billing_cycle: "admission_24h" })
                  }
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    configState.bed_billing_cycle === "admission_24h"
                      ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                      : "border-border hover:border-primary/40 bg-card"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-foreground">
                    <Clock className="h-4 w-4 text-primary" />
                    24h Allotment Timestamp Cycle
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    Charges 1 day exactly every 24 hours from patient bed allotment timestamp (e.g.
                    admitted 3:30 PM → Cycle 2 at 3:30 PM next day).
                  </p>
                </div>

                {/* Traditional Midnight */}
                <div
                  onClick={() => setConfigState({ ...configState, bed_billing_cycle: "midnight" })}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    configState.bed_billing_cycle === "midnight"
                      ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                      : "border-border hover:border-primary/40 bg-card"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-foreground">
                    <Clock className="h-4 w-4 text-primary" />
                    Traditional Midnight (00:00 AM)
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    Calendar day cutoff. Charges apply at 00:00 midnight regardless of check-in time.
                  </p>
                </div>

                {/* Custom Cutoff */}
                <div
                  onClick={() =>
                    setConfigState({ ...configState, bed_billing_cycle: "custom_cutoff" })
                  }
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    configState.bed_billing_cycle === "custom_cutoff"
                      ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                      : "border-border hover:border-primary/40 bg-card"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-foreground">
                    <Clock className="h-4 w-4 text-primary" />
                    Custom Hospital Cutoff Time
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    Hospital defines daily cutoff hour (e.g. 12:00 PM check-out time).
                  </p>
                </div>

                {/* Hourly Prorated */}
                <div
                  onClick={() => setConfigState({ ...configState, bed_billing_cycle: "hourly" })}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    configState.bed_billing_cycle === "hourly"
                      ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                      : "border-border hover:border-primary/40 bg-card"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-foreground">
                    <Clock className="h-4 w-4 text-primary" />
                    Hourly Prorated Billing
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    Prorated exact hourly occupancy for day-care, observation, and ICU beds.
                  </p>
                </div>
              </div>
            </div>

            {/* Cutoff time input if custom */}
            {configState.bed_billing_cycle === "custom_cutoff" && (
              <div>
                <Label>Cutoff Time (HH:MM)</Label>
                <Input
                  type="time"
                  value={configState.bed_cutoff_time || "12:00"}
                  onChange={(e) =>
                    setConfigState({ ...configState, bed_cutoff_time: e.target.value })
                  }
                  className="w-48 text-xs mt-1"
                />
              </div>
            )}

            {/* Grace period & Same day rule */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <Label>Admission / Discharge Grace Period (Minutes)</Label>
                <Input
                  type="number"
                  value={configState.bed_grace_period_minutes}
                  onChange={(e) =>
                    setConfigState({
                      ...configState,
                      bed_grace_period_minutes: Number(e.target.value),
                    })
                  }
                  placeholder="e.g. 120"
                  className="mt-1 text-xs"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Buffer minutes before an additional bed day charge triggers.
                </p>
              </div>

              <div>
                <Label>Same-Day Discharge Policy</Label>
                <select
                  value={configState.same_day_discharge_rule}
                  onChange={(e) =>
                    setConfigState({
                      ...configState,
                      same_day_discharge_rule: e.target.value as any,
                    })
                  }
                  className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1"
                >
                  <option value="half_day">Half Day Charge (50% Bed Rent)</option>
                  <option value="full_day">Full Day Charge (100% Bed Rent)</option>
                  <option value="hourly">Hourly Prorated</option>
                  <option value="free_if_under_grace">Free if discharged within Grace Period</option>
                </select>
              </div>
            </div>

            {/* Auto Apply Nursing Fee Toggle */}
            <div className="pt-2 border-t border-border">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={configState.auto_apply_nursing_with_bed}
                  onChange={(e) =>
                    setConfigState({
                      ...configState,
                      auto_apply_nursing_with_bed: e.target.checked,
                    })
                  }
                  className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                />
                <div>
                  <span className="font-bold text-xs text-foreground block">
                    Auto-Post Ward Nursing Fee with Bed Rent
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    When bed charge engine executes, automatically posts ward routine nursing fee
                    alongside bed rent to the patient running ledger.
                  </span>
                </div>
              </label>
            </div>

            {/* Save Button */}
            <div className="pt-3 flex justify-end">
              <Button
                onClick={() => updateBedConfigMutation.mutate()}
                disabled={updateBedConfigMutation.isPending}
                className="gap-2"
              >
                {updateBedConfigMutation.isPending && (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                )}
                Save Bed Billing Policy
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB: GLOBAL INVOICES REGISTER & MASTER AUDIT
         ════════════════════════════════════════════════════════════════ */}
      {activeTab === "invoices" && (
        <div className="space-y-4">
          {/* Revenue KPI Summary Cards */}
          {globalInvoicesData?.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-muted/40 border rounded-xl space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  Total Invoiced (Net)
                </span>
                <div className="font-mono font-bold text-lg text-foreground">
                  ₹{globalInvoicesData.summary.total_net_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {globalInvoicesData.summary.total_invoices_count} invoices generated
                </span>
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1">
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-bold tracking-wider">
                  Total Collected
                </span>
                <div className="font-mono font-bold text-lg text-emerald-700 dark:text-emerald-300">
                  ₹{globalInvoicesData.summary.total_amount_paid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-500">
                  Realized revenue on record
                </span>
              </div>

              <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl space-y-1">
                <span className="text-[10px] text-sky-700 dark:text-sky-400 uppercase font-bold tracking-wider">
                  Discounts / Concessions
                </span>
                <div className="font-mono font-bold text-lg text-sky-700 dark:text-sky-300">
                  ₹{globalInvoicesData.summary.total_discount_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[10px] text-sky-600 dark:text-sky-500">
                  Approved courtesy discounts
                </span>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
                <span className="text-[10px] text-amber-700 dark:text-amber-400 uppercase font-bold tracking-wider">
                  Balance Outstanding
                </span>
                <div className="font-mono font-bold text-lg text-amber-700 dark:text-amber-300">
                  ₹{globalInvoicesData.summary.total_balance_due.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[10px] text-amber-600 dark:text-amber-500">
                  Credit & partially paid balance
                </span>
              </div>
            </div>
          )}

          {/* Filter Toolbar */}
          <div className="p-3 bg-card border rounded-xl space-y-3">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={invoiceSearch}
                  onChange={(e) => {
                    setInvoiceSearch(e.target.value)
                    setInvoicePage(1)
                  }}
                  placeholder="Search Invoice #, UHID, Name, Mobile..."
                  className="pl-8 text-xs h-8"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <select
                  value={invoiceStatusFilter}
                  onChange={(e) => {
                    setInvoiceStatusFilter(e.target.value as any)
                    setInvoicePage(1)
                  }}
                  className="text-xs rounded-md border border-input bg-background px-2.5 py-1.5 h-8 font-medium"
                >
                  <option value="all">All Payment Statuses</option>
                  <option value="paid">Paid (Fully Cleared)</option>
                  <option value="partially_paid">Partially Paid</option>
                  <option value="pending">Pending Balance</option>
                </select>

                <select
                  value={invoiceEncounterFilter}
                  onChange={(e) => {
                    setInvoiceEncounterFilter(e.target.value as any)
                    setInvoicePage(1)
                  }}
                  className="text-xs rounded-md border border-input bg-background px-2.5 py-1.5 h-8 font-medium"
                >
                  <option value="all">All Departments</option>
                  <option value="ipd">IPD (Inpatient)</option>
                  <option value="opd">OPD (Outpatient)</option>
                  <option value="emergency">Emergency / Casualty</option>
                  <option value="lab">Pathology / LIS</option>
                  <option value="pharmacy">Pharmacy Dispense</option>
                </select>

                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Input
                    type="date"
                    value={invoiceDateFrom}
                    onChange={(e) => {
                      setInvoiceDateFrom(e.target.value)
                      setInvoicePage(1)
                    }}
                    className="text-xs h-8 w-32 font-mono"
                    title="From Date"
                  />
                  <span>to</span>
                  <Input
                    type="date"
                    value={invoiceDateTo}
                    onChange={(e) => {
                      setInvoiceDateTo(e.target.value)
                      setInvoicePage(1)
                    }}
                    className="text-xs h-8 w-32 font-mono"
                    title="To Date"
                  />
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setInvoiceSearch("")
                    setInvoiceStatusFilter("all")
                    setInvoiceEncounterFilter("all")
                    setInvoiceDateFrom("")
                    setInvoiceDateTo("")
                    setInvoicePage(1)
                  }}
                  className="text-xs h-8 text-muted-foreground hover:text-foreground"
                >
                  Reset
                </Button>
              </div>
            </div>
          </div>

          {/* DataTable */}
          <DataTable
            columns={invoiceColumns}
            data={globalInvoicesData?.data || []}
            isLoading={globalInvoicesLoading}
            rowKey="id"
            emptyTitle="No Invoices Found"
            emptyDescription="No finalized billing invoices matched your selected search and filter criteria."
          />

          {/* Pagination Controls */}
          {globalInvoicesData?.pagination && globalInvoicesData.pagination.last_page > 1 && (
            <div className="flex justify-between items-center pt-2 text-xs text-muted-foreground">
              <span>
                Page {globalInvoicesData.pagination.current_page} of {globalInvoicesData.pagination.last_page} (Total {globalInvoicesData.pagination.total} invoices)
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setInvoicePage((p) => Math.max(1, p - 1))}
                  disabled={invoicePage <= 1}
                  className="h-7 text-xs"
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setInvoicePage((p) => Math.min(globalInvoicesData.pagination.last_page, p + 1))}
                  disabled={invoicePage >= globalInvoicesData.pagination.last_page}
                  className="h-7 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}


      {/* ────────────────────────────────────────────────────────────────
          MODAL: ADD / EDIT SERVICE TARIFF RATE
         ──────────────────────────────────────────────────────────────── */}
      <FormContainer
        open={createChargeModalOpen}
        onOpenChange={setCreateChargeModalOpen}
        title={editingCharge ? "Edit Service Tariff Rate" : "Add Billable Service Tariff"}
        description="Standard catalog rate, category, and billing type configuration"
        size="lg"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setCreateChargeModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => saveChargeMutation.mutate()}
              disabled={saveChargeMutation.isPending}
            >
              {saveChargeMutation.isPending && <RefreshCw className="h-4 w-4 animate-spin mr-1" />}
              {editingCharge ? "Update Tariff Rate" : "Save Service Tariff"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category *</Label>
              <select
                value={chargePayload.category_id}
                onChange={(e) =>
                  setChargePayload({ ...chargePayload, category_id: Number(e.target.value) })
                }
                className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.display_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Tariff Code *</Label>
              <Input
                value={chargePayload.code}
                onChange={(e) => setChargePayload({ ...chargePayload, code: e.target.value })}
                placeholder="e.g. NURS-DRESS-MIN"
                disabled={!!editingCharge}
                className="mt-1 text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <Label>Service / Procedure Name *</Label>
            <Input
              value={chargePayload.name}
              onChange={(e) => setChargePayload({ ...chargePayload, name: e.target.value })}
              placeholder="e.g. Wound Dressing (Minor)"
              className="mt-1 text-xs"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Billing Type *</Label>
              <select
                value={chargePayload.billing_type}
                onChange={(e) =>
                  setChargePayload({ ...chargePayload, billing_type: e.target.value as any })
                }
                className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1"
              >
                <option value="fixed">Fixed</option>
                <option value="per_day">Per Day</option>
                <option value="per_hour">Per Hour</option>
                <option value="per_unit">Per Unit</option>
              </select>
            </div>

            <div>
              <Label>Standard Rate (₹) *</Label>
              <Input
                type="number"
                value={chargePayload.standard_rate || ""}
                onChange={(e) =>
                  setChargePayload({ ...chargePayload, standard_rate: Number(e.target.value) })
                }
                placeholder="₹ Amount"
                className="mt-1 text-xs font-mono"
              />
            </div>

            <div>
              <Label>Tax Percentage (%)</Label>
              <Input
                type="number"
                value={chargePayload.tax_percentage || ""}
                onChange={(e) =>
                  setChargePayload({ ...chargePayload, tax_percentage: Number(e.target.value) })
                }
                placeholder="0.00"
                className="mt-1 text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <Label>Link to Specific Ward (Optional)</Label>
            <select
              value={chargePayload.ward_id || ""}
              onChange={(e) =>
                setChargePayload({
                  ...chargePayload,
                  ward_id: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1"
            >
              <option value="">General (Not tied to ward)</option>
              {wards.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Description / Audit Notes</Label>
            <Input
              value={chargePayload.description || ""}
              onChange={(e) =>
                setChargePayload({ ...chargePayload, description: e.target.value })
              }
              placeholder="e.g. Applicable for regular aseptic bedside dressings"
              className="mt-1 text-xs"
            />
          </div>
        </div>
      </FormContainer>

      {/* ────────────────────────────────────────────────────────────────
          MODAL: CREATE NEW CATEGORY
         ──────────────────────────────────────────────────────────────── */}
      <FormContainer
        open={createCategoryModalOpen}
        onOpenChange={setCreateCategoryModalOpen}
        title="Create Hospital Charge Category"
        description="Categorize your tariffs (e.g. Physiotherapy, Dialysis, Ambulance)"
        size="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setCreateCategoryModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createCategoryMutation.mutate()}
              disabled={createCategoryMutation.isPending}
            >
              {createCategoryMutation.isPending && (
                <RefreshCw className="h-4 w-4 animate-spin mr-1" />
              )}
              Create Category
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <div>
            <Label>System Slug Name (lowercase_underscore) *</Label>
            <Input
              value={categoryPayload.name}
              onChange={(e) =>
                setCategoryPayload({
                  ...categoryPayload,
                  name: e.target.value.toLowerCase().replace(/\s+/g, "_"),
                })
              }
              placeholder="e.g. dialysis_charges"
              className="mt-1 text-xs font-mono"
            />
          </div>

          <div>
            <Label>Display Name (Title Case) *</Label>
            <Input
              value={categoryPayload.display_name}
              onChange={(e) =>
                setCategoryPayload({ ...categoryPayload, display_name: e.target.value })
              }
              placeholder="e.g. Hemodialysis & Renal Care"
              className="mt-1 text-xs"
            />
          </div>

          <div>
            <Label>Description</Label>
            <Input
              value={categoryPayload.description || ""}
              onChange={(e) =>
                setCategoryPayload({ ...categoryPayload, description: e.target.value })
              }
              placeholder="e.g. Charges for dialysis sessions and consumables"
              className="mt-1 text-xs"
            />
          </div>
        </div>
      </FormContainer>

      {/* ────────────────────────────────────────────────────────────────
          MODAL: POST BEDSIDE / SERVICE CHARGE TO PATIENT LEDGER
         ──────────────────────────────────────────────────────────────── */}
      <FormContainer
        open={postChargeModalOpen}
        onOpenChange={setPostChargeModalOpen}
        title="Post Bedside / Service Charge to Patient"
        description="Manually post service fee, procedure, or consumable to patient's running bill"
        size="lg"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setPostChargeModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => postLedgerMutation.mutate()}
              disabled={postLedgerMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {postLedgerMutation.isPending && <RefreshCw className="h-4 w-4 animate-spin mr-1" />}
              Post to Ledger
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          {/* Pick from Tariff Catalog */}
          <div>
            <Label>Select Service from Tariff Master</Label>
            <select
              onChange={(e) => {
                const chargeId = Number(e.target.value)
                const item = charges.find((c) => c.id === chargeId)
                if (item) {
                  setLedgerPayload({
                    ...ledgerPayload,
                    charge_id: item.id,
                    item_name: item.name,
                    category: item.category?.name || "other",
                    unit_price: Number(item.standard_rate),
                    tax_amount: (Number(item.standard_rate) * Number(item.tax_percentage || 0)) / 100,
                  })
                }
              }}
              className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1"
            >
              <option value="">-- Choose from Tariff Catalog --</option>
              {charges.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} • {c.name} (₹{c.standard_rate})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Service Item Name *</Label>
              <Input
                value={ledgerPayload.item_name}
                onChange={(e) => setLedgerPayload({ ...ledgerPayload, item_name: e.target.value })}
                placeholder="e.g. Bedside ECG"
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <Label>Encounter Type</Label>
              <select
                value={ledgerPayload.encounter_type}
                onChange={(e) =>
                  setLedgerPayload({ ...ledgerPayload, encounter_type: e.target.value as any })
                }
                className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 mt-1 font-semibold"
              >
                <option value="ipd">IPD (Inpatient)</option>
                <option value="opd">OPD (Outpatient)</option>
                <option value="emergency">Emergency (Casualty)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Unit Price (₹) *</Label>
              <Input
                type="number"
                value={ledgerPayload.unit_price || ""}
                onChange={(e) =>
                  setLedgerPayload({ ...ledgerPayload, unit_price: Number(e.target.value) })
                }
                placeholder="Rate"
                className="mt-1 text-xs font-mono"
              />
            </div>

            <div>
              <Label>Quantity *</Label>
              <Input
                type="number"
                step="0.1"
                value={ledgerPayload.quantity || ""}
                onChange={(e) =>
                  setLedgerPayload({ ...ledgerPayload, quantity: Number(e.target.value) })
                }
                placeholder="Qty"
                className="mt-1 text-xs font-mono"
              />
            </div>

            <div>
              <Label>Estimated Total (₹)</Label>
              <div className="p-2 border rounded-md font-mono font-bold text-xs bg-muted mt-1">
                ₹{(Number(ledgerPayload.unit_price) * Number(ledgerPayload.quantity || 1)).toFixed(2)}
              </div>
            </div>
          </div>

          <div>
            <Label>Notes / Reason</Label>
            <Input
              value={ledgerPayload.notes || ""}
              onChange={(e) => setLedgerPayload({ ...ledgerPayload, notes: e.target.value })}
              placeholder="e.g. Conducted during evening doctor round"
              className="mt-1 text-xs"
            />
          </div>
        </div>
      </FormContainer>

      {/* ────────────────────────────────────────────────────────────────
          MODAL: CANCEL UNBILLED LEDGER ITEM
         ──────────────────────────────────────────────────────────────── */}
      <FormContainer
        open={cancelModalOpen}
        onOpenChange={setCancelModalOpen}
        title="Cancel Unbilled Ledger Charge"
        description={`Item: ${itemToCancel?.item_name} • ₹${itemToCancel?.total_amount}`}
        size="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setCancelModalOpen(false)}>
              Back
            </Button>
            <Button
              variant="destructive"
              onClick={() => cancelLedgerMutation.mutate()}
              disabled={cancelLedgerMutation.isPending || !cancelReason.trim()}
            >
              Confirm Cancellation
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-xs">
          <p className="text-muted-foreground">
            Provide an audit reason for cancelling this charge from the running bill. This action is
            permanently recorded in the financial audit log.
          </p>

          <div>
            <Label>Cancellation Reason *</Label>
            <Input
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Entry made by mistake on wrong patient"
              className="mt-1 text-xs"
            />
          </div>
        </div>
      </FormContainer>


      {/* Direct Walk-In Lab Booking & Invoice Modal */}
      <DirectLabBookingModal
        isOpen={directLabModalOpen}
        onClose={() => setDirectLabModalOpen(false)}
        onSuccess={() => {
          setDirectLabModalOpen(false)
          queryClient.invalidateQueries({ queryKey: queryKeys.billing.all })
          queryClient.invalidateQueries({ queryKey: ["lab", "orders"] })
        }}
      />

      {/* ────────────────────────────────────────────────────────────────
          ENHANCED BILLING & FINANCE MODALS
         ──────────────────────────────────────────────────────────────── */}
      {/* 1. Advance Deposit Collection Modal */}
      <CollectAdvanceDepositModal
        isOpen={depositModalOpen}
        onClose={() => setDepositModalOpen(false)}
        defaultPatientId={selectedPatientId || undefined}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: queryKeys.billing.all })
        }}
      />

      {/* 2. Cashier Day-End Closing & Shift Handover Modal */}
      <CashierDayEndModal
        isOpen={dayEndModalOpen}
        onClose={() => setDayEndModalOpen(false)}
      />

      {/* 3. Official NABH/ABDM/GST 3-Copy Tax Invoice Modal */}
      <PrintTaxInvoiceModal
        isOpen={taxInvoiceModalOpen}
        onClose={() => {
          setTaxInvoiceModalOpen(false)
          setSelectedInvoiceId(null)
        }}
        invoiceId={selectedInvoiceId}
      />

      {/* 4. Security Clearance Gate Pass Modal */}
      <PrintGatePassModal
        isOpen={gatePassModalOpen}
        onClose={() => {
          setGatePassModalOpen(false)
          setSelectedGatePassAdmissionId(null)
        }}
        admissionId={selectedGatePassAdmissionId}
      />

      {/* 5. Central Cashier Inpatient Settlement Modal */}
      <CentralSettlementModal
        isOpen={settlementModalOpen}
        onClose={() => {
          setSettlementModalOpen(false)
          setSelectedSettlementAdmissionId(null)
        }}
        admissionId={selectedSettlementAdmissionId}
        onSettledSuccess={(invId, admId) => {
          setSelectedInvoiceId(invId)
          setSelectedGatePassAdmissionId(admId)
          setTaxInvoiceModalOpen(true)
        }}
      />

      {/* 6. Patient Refund / Credit Note Modal */}
      <IssueRefundModal
        isOpen={refundModalOpen}
        onClose={() => {
          setRefundModalOpen(false)
          setRefundPatient(null)
        }}
        patientId={refundPatient?.id}
        patientName={refundPatient?.name}
        uhid={refundPatient?.uhid}
        encounterType="ipd"
      />
    </div>

  )
}

export default BillingDeskPage
