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
} from "lucide-react"

import { OpdQuickBillCounterTab } from "@/components/billing/OpdQuickBillCounterTab"
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
  Invoice,
} from "@/types/billing"

export const BillingDeskPage: React.FC = () => {
  const queryClient = useQueryClient()

  // ─── Active Tab ──────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"opd-counter" | "tariff" | "ledger" | "rules" | "invoices">("opd-counter")

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

  // ─── Invoices Tab States ─────────────────────────────────────────────
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false)

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

  // 6. Selected Patient's Invoices
  const { data: patientInvoices = [] } = useQuery({
    queryKey: queryKeys.billing.patientInvoices(selectedPatientId || 0),
    queryFn: () => billingService.getPatientInvoices(selectedPatientId!),
    enabled: !!selectedPatientId && activeTab === "invoices",
  })

  // 7. Bed Billing Configuration
  const { data: bedConfig, refetch: refetchBedConfig } = useQuery({
    queryKey: queryKeys.billing.bedConfig,
    queryFn: () => billingService.getBedBillingConfig(),
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
        actions={
          <div className="flex flex-wrap items-center gap-2">
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
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("opd-counter")}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "opd-counter"
              ? "border-primary text-primary bg-primary/5 font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <CreditCard className="h-4 w-4" /> OPD Token Quick Bill
        </button>

        <button
          onClick={() => setActiveTab("tariff")}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "tariff"
              ? "border-primary text-primary bg-primary/5 font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Tag className="h-4 w-4" /> Service Tariff Master ({charges.length})
        </button>

        <button
          onClick={() => setActiveTab("ledger")}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "ledger"
              ? "border-primary text-primary bg-primary/5 font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <DollarSign className="h-4 w-4" /> Patient Running Ledger
        </button>

        <button
          onClick={() => setActiveTab("rules")}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "rules"
              ? "border-primary text-primary bg-primary/5 font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Settings className="h-4 w-4" /> Bed Billing Policy & Rules
        </button>

        <button
          onClick={() => setActiveTab("invoices")}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "invoices"
              ? "border-primary text-primary bg-primary/5 font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Receipt className="h-4 w-4" /> Final Tax Invoices
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          TAB 0: OPD TOKEN QUICK BILL COUNTER
         ════════════════════════════════════════════════════════════════ */}
      {activeTab === "opd-counter" && <OpdQuickBillCounterTab />}

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
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-sm text-foreground">
                  Itemized Running Charges Accumulator
                </h3>
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
                  <Plus className="h-3.5 w-3.5" /> Post Bedside / Service Charge
                </Button>
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
          TAB 4: INVOICES & RECEIPTS
         ════════════════════════════════════════════════════════════════ */}
      {activeTab === "invoices" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-border bg-card space-y-3">
            <Label className="text-xs font-bold uppercase tracking-wider block">
              Patient Invoice Lookup
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={patientSearchTerm}
                onChange={(e) => setPatientSearchTerm(e.target.value)}
                placeholder="Search patient by name, mobile, or UHID to view final tax invoices..."
                className="pl-9 text-xs"
              />

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
                        {p.uhid} • {p.mobile || "No Mobile"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {selectedPatientId && patientInvoices.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {patientInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-all space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        INVOICE NUMBER
                      </span>
                      <h4 className="font-bold text-sm text-foreground font-mono">
                        {inv.invoice_number}
                      </h4>
                    </div>
                    <Badge
                      className={
                        inv.payment_status === "paid"
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                          : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                      }
                    >
                      {inv.payment_status.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs border-y py-2">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Net Bill:</span>
                      <span className="font-mono font-bold">₹{inv.net_amount}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Amount Paid:</span>
                      <span className="font-mono font-bold text-emerald-600">
                        ₹{inv.amount_paid}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Payment Mode:</span>
                      <span className="capitalize">{inv.payment_method}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Issued Date:</span>
                      <span>{new Date(inv.issued_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs gap-1.5"
                    onClick={() => {
                      setSelectedInvoice(inv)
                      setInvoiceModalOpen(true)
                    }}
                  >
                    <Printer className="h-3.5 w-3.5" /> View & Print Tax Invoice
                  </Button>
                </div>
              ))}
            </div>
          ) : selectedPatientId ? (
            <div className="p-8 text-center border-2 border-dashed rounded-xl border-border text-xs text-muted-foreground">
              No finalized tax invoices found for this patient.
            </div>
          ) : null}
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

      {/* ────────────────────────────────────────────────────────────────
          MODAL: PRINT FINAL TAX INVOICE
         ──────────────────────────────────────────────────────────────── */}
      <FormContainer
        open={invoiceModalOpen}
        onOpenChange={setInvoiceModalOpen}
        title="Tax Invoice"
        description={`Invoice #${selectedInvoice?.invoice_number}`}
        size="xl"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setInvoiceModalOpen(false)}>
              Close
            </Button>
            <Button onClick={() => window.print()} className="gap-2">
              <Printer className="h-4 w-4" /> Print Invoice
            </Button>
          </div>
        }
      >
        {selectedInvoice && (
          <div className="p-6 border-2 border-dashed border-border rounded-2xl bg-card space-y-4 text-xs font-mono">
            <div className="text-center pb-3 border-b">
              <h2 className="font-bold text-lg text-foreground uppercase tracking-widest">
                FINAL TAX INVOICE
              </h2>
              <Badge className="mt-1 bg-emerald-600 text-white font-mono">
                {selectedInvoice.invoice_number}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs border-b pb-3">
              <div>
                <span className="text-muted-foreground block text-[10px]">PATIENT NAME:</span>
                <span className="font-bold">{selectedInvoice.patient?.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">UHID:</span>
                <span className="font-bold">{selectedInvoice.patient?.uhid}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">PAYMENT MODE:</span>
                <span className="font-bold uppercase">{selectedInvoice.payment_method}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">DATE:</span>
                <span className="font-bold">
                  {new Date(selectedInvoice.issued_at).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between">
                <span>Total Gross Charges:</span>
                <span className="font-bold">₹{selectedInvoice.total_amount}</span>
              </div>
              <div className="flex justify-between">
                <span>Advance Adjusted:</span>
                <span className="text-emerald-600 font-bold">
                  -₹{selectedInvoice.advance_adjusted}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Courtesy Discount:</span>
                <span className="text-emerald-600 font-bold">
                  -₹{selectedInvoice.discount_amount}
                </span>
              </div>
              {selectedInvoice.insurance_amount > 0 && (
                <div className="flex justify-between">
                  <span>Insurance / TPA Claim:</span>
                  <span className="text-sky-600 font-bold">
                    -₹{selectedInvoice.insurance_amount}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2 text-sm font-bold">
                <span>Amount Paid:</span>
                <span className="text-emerald-600 font-mono">
                  ₹{selectedInvoice.amount_paid}
                </span>
              </div>
            </div>
          </div>
        )}
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
    </div>
  )
}

export default BillingDeskPage
