import React, { useState, useMemo } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  FlaskConical,
  TestTube2,
  Barcode,
  Search,
  RefreshCw,
  Plus,
  Clock,
  Printer,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  Layers,
  MonitorPlay,
  Megaphone,
  UserPlus,
  XCircle,
  RotateCcw,
  Receipt,
  Edit3,
  Wallet,
  History,
} from "lucide-react"

import { PageHeader } from "@/components/common/PageHeader"
import { SectionCard } from "@/components/SectionCard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { EmptyState } from "@/components/common/EmptyState"

import { labService } from "@/services/labService"
import { SampleCollectionModal } from "@/components/lab/SampleCollectionModal"
import { useNavigate } from "react-router"
import { DirectLabBookingModal } from "@/components/lab/DirectLabBookingModal"
import { ThermalBarcodeStickerModal } from "@/components/lab/ThermalBarcodeStickerModal"
import { SampleRejectionModal } from "@/components/lab/SampleRejectionModal"
import { LabAuditLogModal } from "@/components/lab/LabAuditLogModal"
import { CollectPaymentModal } from "@/components/lab/CollectPaymentModal"
import type { LabOrder, LabTestTemplate } from "@/types/lab"

export const LabDeskPage: React.FC = () => {
  const navigate = useNavigate()

  // Tab navigation
  const [activeTab, setActiveTab] = useState<"worklist" | "phlebotomy" | "invoices" | "archive" | "catalog">("worklist")

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all")
  const [catalogCategory, setCatalogCategory] = useState<string>("all")

  // Invoices Billing History Tab Search & Filter
  const [invoiceSearch, setInvoiceSearch] = useState("")
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>("all")

  // Station / Booth
  const [selectedBooth, setSelectedBooth] = useState<string>("Booth 1")

  // Right Sidebars Drawers state
  const [isDirectBookingOpen, setIsDirectBookingOpen] = useState(false)
  const [orderToEditForBooking, setOrderToEditForBooking] = useState<LabOrder | null>(null)
  const [orderForCollectPayment, setOrderForCollectPayment] = useState<LabOrder | null>(null)
  const [selectedOrderForSample, setSelectedOrderForSample] = useState<LabOrder | null>(null)
  const [selectedOrderForThermalBarcode, setSelectedOrderForThermalBarcode] = useState<LabOrder | null>(null)
  const [selectedOrderForRejection, setSelectedOrderForRejection] = useState<LabOrder | null>(null)
  const [selectedOrderForAudit, setSelectedOrderForAudit] = useState<LabOrder | null>(null)

  // 1. Fetch Orders Worklist
  const {
    data: ordersRaw,
    isLoading: ordersLoading,
    refetch: refetchOrders,
    isRefetching: ordersRefetching,
  } = useQuery({
    queryKey: ["lab", "orders"],
    queryFn: () => labService.getOrders({ per_page: 100 }),
    refetchInterval: 15_000, // Poll every 15s for real-time billed orders
  })

  // Normalize orders array safely
  const ordersList: LabOrder[] = useMemo(() => {
    if (Array.isArray(ordersRaw)) return ordersRaw
    if (ordersRaw && Array.isArray((ordersRaw as any).data)) return (ordersRaw as any).data
    return []
  }, [ordersRaw])

  // 2. Fetch Test Templates Catalog (281+ tests)
  const {
    data: templatesRaw,
    isLoading: templatesLoading,
  } = useQuery({
    queryKey: ["lab", "templates"],
    queryFn: () => labService.getTemplates({ per_page: 300 }),
  })

  // Normalize templates array safely
  const templatesList: LabTestTemplate[] = useMemo(() => {
    if (Array.isArray(templatesRaw)) return templatesRaw
    if (templatesRaw && Array.isArray((templatesRaw as any).data)) return (templatesRaw as any).data
    return []
  }, [templatesRaw])

  // 3. Sync Billed Orders Mutation
  const syncMutation = useMutation({
    mutationFn: () => labService.syncBilledOrders(),
    onSuccess: (data) => {
      toast.success(`Synchronized ${data.synced_count} billed orders from OPD Billing!`)
      refetchOrders()
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to sync billed investigations.")
    },
  })

  // 4. Phlebotomy Call Token Mutation
  const callTokenMutation = useMutation({
    mutationFn: ({ orderId, boothNumber }: { orderId: number; boothNumber: string }) =>
      labService.callToken(orderId, boothNumber),
    onSuccess: (data) => {
      toast.success(`Token ${data.token_number} called to ${data.booth_number}! Waiting Room TV display updated.`)
      refetchOrders()
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to call token.")
    },
  })

  // 5. Sample Recollection Mutation
  const recollectMutation = useMutation({
    mutationFn: (orderId: number) => labService.recollectSample(orderId),
    onSuccess: (data) => {
      toast.success(`Priority recollection token ${data.token_number} assigned! Patient moved to Phlebotomy.`)
      refetchOrders()
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to initiate sample recollection.")
    },
  })

  // 6. Fetch Lab Billing Invoices
  const {
    data: invoicesRaw,
    isLoading: invoicesLoading,
    refetch: refetchInvoices,
  } = useQuery({
    queryKey: ["lab", "invoices", invoiceStatusFilter, invoiceSearch],
    queryFn: () =>
      labService.getInvoices({
        search: invoiceSearch,
        payment_status: invoiceStatusFilter !== "all" ? invoiceStatusFilter : undefined,
      }),
    enabled: activeTab === "invoices",
  })

  const invoicesList: any[] = useMemo(() => {
    if (Array.isArray(invoicesRaw)) return invoicesRaw
    if (invoicesRaw && Array.isArray((invoicesRaw as any).data)) return (invoicesRaw as any).data
    return []
  }, [invoicesRaw])

  const printLabBillSlip = (order: LabOrder) => {
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

    const inv = order.invoice
    const gross =
      inv?.gross_amount ??
      order.items?.reduce((s, it) => s + parseFloat(String(it.rate || (it as any).price || 0)), 0) ??
      0
    const discount = inv?.discount_amount ?? 0
    const net = inv?.net_amount ?? Math.max(0, gross - discount)
    const paid = inv?.paid_amount ?? (inv?.payment_status === "paid" ? net : 0)
    const due = inv?.balance_due ?? Math.max(0, net - paid)

    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Lab Bill Slip - #${order.order_number}</title>
          <style>
            @page { size: 80mm auto; margin: 3mm; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { width: 74mm; font-family: Arial, sans-serif; font-size: 11px; color: #000; background: #fff; padding: 4mm 2mm; text-align: center; }
            .title { font-size: 14px; font-weight: 900; margin-bottom: 2px; }
            .subtitle { font-size: 10px; margin-bottom: 6px; }
            .token-box { border: 2px dashed #000; padding: 8px 4px; margin: 6px 0; border-radius: 4px; }
            .token-num { font-size: 32px; font-weight: 900; font-family: monospace; }
            .info { text-align: left; font-size: 10px; margin-top: 6px; border-top: 1px solid #000; padding-top: 4px; line-height: 1.4; }
            .info-row { display: flex; justify-content: space-between; }
            .table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 10px; text-align: left; }
            .table th { border-bottom: 1px solid #000; padding: 2px 0; }
            .table td { padding: 3px 0; border-bottom: 1px dashed #ccc; }
            .totals { margin-top: 6px; border-top: 1px solid #000; padding-top: 4px; font-size: 10px; line-height: 1.5; }
            .footer { font-size: 9px; margin-top: 10px; border-top: 1px dashed #000; padding-top: 6px; }
          </style>
        </head>
        <body>
          <div class="title">HOSPITAL LABORATORY</div>
          <div class="subtitle">Tax Invoice / Bill • #${inv?.invoice_number || order.order_number}</div>
          ${order.token_number ? `
          <div class="token-box">
            <div style="font-size: 9px; font-weight: bold;">Phlebotomy Queue Token</div>
            <div class="token-num">${order.token_number}</div>
          </div>` : ""}
          <div class="info">
            <div class="info-row"><span>Date:</span><strong>${new Date(order.created_at || (order as any).order_date).toLocaleString()}</strong></div>
            <div class="info-row"><span>Patient:</span><strong>${order.patient?.name || ""}</strong></div>
            <div class="info-row"><span>UHID:</span><strong>${order.patient?.uhid || ""}</strong></div>
            <div class="info-row"><span>Age/Gender:</span><span>${order.patient?.age || ""} Y / ${order.patient?.gender || ""}</span></div>
            <div class="info-row"><span>Ref Doctor:</span><span>${order.doctor?.name || "Self / Walk-In"}</span></div>
          </div>
          <table class="table">
            <thead>
              <tr>
                <th>Investigation</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${(order.items || []).map(it => `
                <tr>
                  <td>${it.test_name}</td>
                  <td style="text-align: right;">₹${parseFloat(String(it.rate || (it as any).price || 0)).toFixed(2)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <div class="totals">
            <div class="info-row"><span>Gross Total:</span><span>₹${gross.toFixed(2)}</span></div>
            ${discount > 0 ? `<div class="info-row"><span>Discount:</span><span>-₹${discount.toFixed(2)}</span></div>` : ""}
            <div class="info-row" style="font-weight: 900; font-size: 12px; border-top: 1px solid #000; padding-top: 2px;">
              <span>Net Payable:</span><span>₹${net.toFixed(2)}</span>
            </div>
            <div class="info-row"><span>Amount Paid:</span><span>₹${paid.toFixed(2)}</span></div>
            <div class="info-row" style="color: ${due > 0 ? '#b91c1c' : '#047857'}; font-weight: bold;">
              <span>Balance Due:</span><span>₹${due.toFixed(2)}</span>
            </div>
            <div class="info-row"><span>Payment Status:</span><strong style="text-transform: uppercase;">${inv?.payment_status || (due === 0 ? "PAID" : "PENDING")}</strong></div>
          </div>
          <div class="footer">
            Fast report turnaround. Track online with UHID.<br/>
            *** Computer Generated Tax Receipt ***
          </div>
        </body>
      </html>
    `)
    doc.close()
    iframe.contentWindow?.focus()
    setTimeout(() => {
      iframe.contentWindow?.print()
      setTimeout(() => {
        if (iframe.parentNode) document.body.removeChild(iframe)
      }, 2000)
    }, 300)
  }

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return ordersList.filter((ord) => {
      // Tab specific filter
      if (activeTab === "phlebotomy") {
        const isPending = ord.status === "pending_sample"
        const isRejectedNeedsRecollect = ord.rejection_reason && !ord.is_recollected
        if (!isPending && !isRejectedNeedsRecollect) {
          return false
        }
      }
      if (activeTab === "archive" && ord.status !== "authorized") {
        return false
      }

      // Status filter
      if (statusFilter !== "all" && ord.status !== statusFilter) {
        return false
      }

      // Urgency filter
      if (urgencyFilter !== "all" && ord.urgency !== urgencyFilter) {
        return false
      }

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchOrd = ord.order_number?.toLowerCase().includes(q)
        const matchAcc = ord.sample_accession_number?.toLowerCase().includes(q)
        const matchPat = ord.patient?.name?.toLowerCase().includes(q) || ord.patient?.uhid?.toLowerCase().includes(q)
        const matchTests = ord.items?.some(
          (i) => i.test_name?.toLowerCase().includes(q) || i.test_code?.toLowerCase().includes(q)
        )
        if (!matchOrd && !matchAcc && !matchPat && !matchTests) return false
      }

      return true
    })
  }, [ordersList, activeTab, statusFilter, urgencyFilter, searchQuery])

  // Filtered Templates
  const filteredTemplates = useMemo(() => {
    return templatesList.filter((tpl) => {
      if (catalogCategory !== "all" && tpl.category !== catalogCategory) {
        return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = tpl.test_name?.toLowerCase().includes(q)
        const matchCode = tpl.test_code?.toLowerCase().includes(q)
        const matchMethod = tpl.method?.toLowerCase().includes(q)
        if (!matchName && !matchCode && !matchMethod) return false
      }
      return true
    })
  }, [templatesList, catalogCategory, searchQuery])

  // Summary Metrics
  const metrics = useMemo(() => {
    const pending = ordersList.filter((o) => o.status === "pending_sample").length
    const collected = ordersList.filter((o) => o.status === "sample_collected").length
    const statCount = ordersList.filter((o) => o.urgency === "STAT" && o.status !== "authorized").length
    const readyToSign = ordersList.filter((o) => o.status === "result_entered").length
    const authorized = ordersList.filter((o) => o.status === "authorized").length

    return {
      pending,
      collected,
      statCount,
      readyToSign,
      authorized,
      totalTemplates: templatesList.length,
    }
  }, [ordersList, templatesList])

  const getUrgencyBadge = (urgency: string) => {
    if (urgency === "STAT") {
      return (
        <Badge variant="destructive" className="animate-pulse text-[10px] font-bold uppercase">
          STAT Critical
        </Badge>
      )
    }
    if (urgency === "Urgent") {
      return (
        <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px] font-bold">
          Urgent
        </Badge>
      )
    }
    return (
      <Badge variant="secondary" className="text-[10px]">
        Routine
      </Badge>
    )
  }

  const getStatusBadge = (status: string, items?: any[]) => {
    switch (status) {
      case "pending_sample":
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">
            Pending Sample
          </Badge>
        )
      case "sample_collected":
        return (
          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px]">
            Sample Collected
          </Badge>
        )
      case "in_progress":
        return (
          <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-[10px]">
            Testing In Progress
          </Badge>
        )
      case "result_entered":
        return (
          <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 text-[10px]">
            Awaiting Sign-off
          </Badge>
        )
      case "partially_authorized": {
        const authCount = items?.filter(i => i.status === "authorized").length || 0
        const total = items?.length || 0
        return (
          <Badge className="bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30 text-[10px] font-bold gap-1">
            <ShieldCheck className="h-3 w-3" />
            Partial Approved {total > 0 ? `(${authCount}/${total})` : ""}
          </Badge>
        )
      }
      case "authorized":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold">
            ✓ Authorized Final
          </Badge>
        )
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Laboratory & Diagnostics Desk"
        subtitle="Live diagnostic worklist, phlebotomy barcode tracking, result entry with automatic formulas, and authorized reports."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="gap-1.5 text-xs h-9"
              title="Auto-intake all tests marked as billed in OPD Billing"
            >
              <RefreshCw className={`h-4 w-4 ${syncMutation.isPending || ordersRefetching ? "animate-spin" : ""}`} />
              Sync Billed Orders
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open("/lab/display", "_blank")}
              className="gap-1.5 text-xs h-9 border-cyan-500/40 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/10"
              title="Open Phlebotomy Calling TV Display Kiosk in a new tab"
            >
              <MonitorPlay className="h-4 w-4" />
              Waiting TV Display
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/lab/tests/create")}
              className="gap-1.5 text-xs h-9"
            >
              <Plus className="h-4 w-4" />
              Custom Test
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsDirectBookingOpen(true)}
              className="gap-1.5 text-xs h-9 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
            >
              <UserPlus className="h-4 w-4" />
              Walk-In Lab Order
            </Button>
          </div>
        }
      />

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Card className="border-border bg-card">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground">Pending Sample</span>
              <TestTube2 className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-1 text-2xl font-bold text-foreground font-mono">{metrics.pending}</div>
            <span className="text-[10px] text-muted-foreground">Awaiting phlebotomy</span>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground">Sample Collected</span>
              <Barcode className="h-4 w-4 text-blue-500" />
            </div>
            <div className="mt-1 text-2xl font-bold text-foreground font-mono">{metrics.collected}</div>
            <span className="text-[10px] text-muted-foreground">In processing lab</span>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground">STAT Urgency</span>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </div>
            <div className="mt-1 text-2xl font-bold text-red-600 font-mono">{metrics.statCount}</div>
            <span className="text-[10px] text-muted-foreground">Critical fast-track</span>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground">Awaiting Review</span>
              <Clock className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="mt-1 text-2xl font-bold text-foreground font-mono">{metrics.readyToSign}</div>
            <span className="text-[10px] text-muted-foreground">Needs pathologist sign</span>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground">Authorized Final</span>
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-1 text-2xl font-bold text-foreground font-mono">{metrics.authorized}</div>
            <span className="text-[10px] text-muted-foreground">Reports released</span>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground">Test Catalog</span>
              <Sparkles className="h-4 w-4 text-purple-500" />
            </div>
            <div className="mt-1 text-2xl font-bold text-foreground font-mono">{metrics.totalTemplates}</div>
            <span className="text-[10px] text-muted-foreground">Pre-seeded tests</span>
          </CardContent>
        </Card>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex border-b border-border text-xs font-semibold">
        <button
          onClick={() => setActiveTab("worklist")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition-colors ${
            activeTab === "worklist"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FlaskConical className="h-4 w-4" />
          Live Orders Worklist ({ordersList.length})
        </button>

        <button
          onClick={() => setActiveTab("phlebotomy")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition-colors ${
            activeTab === "phlebotomy"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <TestTube2 className="h-4 w-4" />
          Phlebotomy Desk ({metrics.pending})
        </button>

        <button
          onClick={() => setActiveTab("invoices")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition-colors ${
            activeTab === "invoices"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Receipt className="h-4 w-4" />
          Lab Billing & Invoices History ({invoicesList.length})
        </button>

        <button
          onClick={() => setActiveTab("archive")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition-colors ${
            activeTab === "archive"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Printer className="h-4 w-4" />
          Authorized Reports Archive ({metrics.authorized})
        </button>

        <button
          onClick={() => setActiveTab("catalog")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition-colors ${
            activeTab === "catalog"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layers className="h-4 w-4" />
          Lab Test Master Catalog ({templatesList.length}+)
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: LIVE ORDERS WORKLIST & TAB 2 / TAB 3
         ───────────────────────────────────────────────────────────── */}
      {activeTab !== "catalog" && activeTab !== "invoices" && (
        <SectionCard
          title={
            activeTab === "worklist"
              ? "Laboratory Live Worklist Queue"
              : activeTab === "phlebotomy"
              ? "Phlebotomy & Sample Accessioning Queue"
              : "Authorized Diagnostic Reports Archive"
          }
          description="Click 'Collect Sample' to generate barcode sticker, 'Enter Results' to compute test parameters, or 'Print Report' to preview official report."
        >
          {/* Phlebotomy Calling Console Banner */}
          {activeTab === "phlebotomy" && (
            <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white border border-slate-700/80 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <Megaphone className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <div className="font-bold text-sm text-white flex items-center gap-2">
                    Phlebotomy Calling Console
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                      Online
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-300">
                    Call waiting patients for blood collection & broadcast live to Waiting TV.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-1.5 bg-slate-950/70 border border-slate-700 px-2.5 py-1 rounded-xl">
                  <span className="text-[11px] text-slate-400 font-semibold">Active Booth:</span>
                  <select
                    value={selectedBooth}
                    onChange={(e) => setSelectedBooth(e.target.value)}
                    className="bg-transparent text-xs font-bold text-cyan-400 outline-none cursor-pointer"
                  >
                    <option value="Booth 1" className="bg-slate-900 text-white">Booth 1</option>
                    <option value="Booth 2" className="bg-slate-900 text-white">Booth 2</option>
                    <option value="Booth 3" className="bg-slate-900 text-white">Booth 3</option>
                    <option value="Booth 4" className="bg-slate-900 text-white">Booth 4</option>
                  </select>
                </div>

                <Button
                  size="sm"
                  onClick={() => {
                    const nextOrder = ordersList.find((o) => o.status === "pending_sample" && !o.is_called)
                    if (nextOrder) {
                      callTokenMutation.mutate({ orderId: nextOrder.id, boothNumber: selectedBooth })
                    } else {
                      toast.info("No uncalled pending tokens waiting in queue!")
                    }
                  }}
                  disabled={callTokenMutation.isPending}
                  className="h-8 text-xs font-bold gap-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow"
                >
                  <Megaphone className="h-3.5 w-3.5" />
                  Call Next Token
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open("/lab/display", "_blank")}
                  className="h-8 text-xs font-semibold gap-1.5 bg-slate-800 border-slate-600 text-slate-200 hover:text-white"
                >
                  <MonitorPlay className="h-3.5 w-3.5" />
                  Open TV Screen
                </Button>
              </div>
            </div>
          )}

          {/* Toolbar */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by UHID, Patient, Barcode, Test..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              {activeTab === "worklist" && (
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-9 px-2.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending_sample">Pending Sample</option>
                  <option value="sample_collected">Sample Collected</option>
                  <option value="result_entered">Awaiting Sign-off</option>
                  <option value="authorized">Authorized Final</option>
                </select>
              )}

              <select
                value={urgencyFilter}
                onChange={(e) => setUrgencyFilter(e.target.value)}
                className="h-9 px-2.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground"
              >
                <option value="all">All Priorities</option>
                <option value="STAT">STAT Critical Only</option>
                <option value="Urgent">Urgent Priority</option>
                <option value="Routine">Routine Orders</option>
              </select>
            </div>
          </div>

          {/* Orders Table */}
          {ordersLoading ? (
            <div className="py-16">
              <LoadingSpinner label="Fetching live lab worklist..." />
            </div>
          ) : filteredOrders.length === 0 ? (
            <EmptyState
              title="No laboratory orders found"
              description="No diagnostic orders match your current filter. When doctors advise tests in OPD and payment is collected, they will appear here automatically."
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border/70 bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Order & Token</th>
                      <th className="px-4 py-3">Patient Demographics</th>
                      <th className="px-4 py-3">Tests & Required Tubes</th>
                      <th className="px-4 py-3">Sample Barcode</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-muted/30 transition-colors">
                        {/* Order & Token */}
                        <td className="px-4 py-3">
                          <div className="font-mono font-bold text-primary text-xs flex items-center gap-1.5">
                            {ord.order_number}
                          </div>

                          {/* Token badge */}
                          {ord.token_number && (
                            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`font-mono font-black text-[11px] px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                                  ord.urgency === "STAT"
                                    ? "bg-red-500/15 text-red-600 border-red-500/30"
                                    : "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30"
                                }`}
                              >
                                Token: {ord.token_number}
                              </span>
                              {ord.is_called && (
                                <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/20">
                                  {ord.booth_number || "Booth 1"}
                                </span>
                              )}
                            </div>
                          )}

                          <div className="mt-1 flex items-center gap-1.5">
                            {getUrgencyBadge(ord.urgency)}
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(ord.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </td>

                        {/* Patient Demographics */}
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground text-sm">
                            {ord.patient?.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            UHID: <span className="font-mono font-bold text-primary">{ord.patient?.uhid}</span> • {ord.patient?.age || "N/A"} Y / {ord.patient?.gender === "M" ? "Male" : "Female"}
                          </div>
                          {ord.doctor?.name && (
                            <span className="text-[10px] text-muted-foreground block truncate max-w-[180px]">
                              Dr: {ord.doctor.name}
                            </span>
                          )}

                          {/* IPD Inpatient Location & Bedside Collection Tag */}
                          {(ord.order_type === "IPD" || ord.ipd_admission_id) && (
                            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded">
                                IPD Inpatient
                              </span>
                              {ord.ipd_admission?.ward && (
                                <span className="text-[10px] font-semibold text-foreground">
                                  {ord.ipd_admission.ward.name} • Bed #{ord.ipd_admission.bed?.bed_number || "—"}
                                </span>
                              )}
                              {ord.is_bedside_collection && (
                                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/20">
                                  Bedside Draw
                                </span>
                              )}
                            </div>
                          )}

                          {/* Specimen Rejection alert */}
                          {ord.rejection_reason && (
                            <div className="mt-1">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded">
                                <XCircle className="h-3 w-3" /> Rejected: {ord.rejection_reason}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Tests List & Tubes */}
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <div className="space-y-1">
                              {ord.items?.map((item) => (
                                <div key={item.id} className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold text-foreground">
                                    {item.test_name}
                                  </span>
                                  {item.test_template?.container_color && (
                                    <Badge variant="outline" className="text-[9px] px-1 py-0 text-muted-foreground">
                                      {item.test_template.container_color.split("/")[0]}
                                    </Badge>
                                  )}
                                  {/* Test individual status badge */}
                                  <Badge
                                    variant="outline"
                                    className={`text-[9px] px-1.5 py-0 font-medium ${
                                      item.status === "authorized"
                                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-bold"
                                        : item.status === "completed" || item.status === "result_entered"
                                        ? "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 font-medium"
                                        : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                                    }`}
                                  >
                                    {item.status === "authorized"
                                      ? "✓ Approved"
                                      : item.status === "completed" || item.status === "result_entered"
                                      ? "Entered"
                                      : "Pending"}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>

                        {/* Barcode Accession */}
                        <td className="px-4 py-3">
                          {ord.sample_accession_number ? (
                            <div>
                              <span className="font-mono font-bold text-foreground text-xs block">
                                {ord.sample_accession_number}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {ord.sample_collected_at
                                  ? new Date(ord.sample_collected_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                                  : "Collected"}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-amber-600 font-medium">
                              Not Collected
                            </span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="px-4 py-3">
                          {getStatusBadge(ord.status, ord.items)}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {/* Phlebotomy Token Calling Button */}
                            {ord.status === "pending_sample" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => callTokenMutation.mutate({ orderId: ord.id, boothNumber: selectedBooth })}
                                disabled={callTokenMutation.isPending}
                                className="h-7 text-xs gap-1 border-cyan-500/40 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/10 font-bold"
                                title={`Call Token ${ord.token_number || ""} to ${selectedBooth}`}
                              >
                                <Megaphone className="h-3.5 w-3.5" />
                                {ord.is_called ? "Recall" : "Call"}
                              </Button>
                            )}

                            {/* Collect Sample button */}
                            {ord.status === "pending_sample" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedOrderForSample(ord)}
                                className="h-7 text-xs gap-1 border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 font-bold"
                              >
                                <TestTube2 className="h-3.5 w-3.5" />
                                Collect
                              </Button>
                            )}

                            {/* Thermal Barcode Sticker button */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedOrderForThermalBarcode(ord)}
                              className="h-7 text-xs gap-1 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-muted font-medium"
                              title="Print 2x1 Thermal Barcode Vial Sticker"
                            >
                              <Barcode className="h-3.5 w-3.5" />
                              Sticker
                            </Button>

                            {/* Reject Specimen button (for collected/testing samples) */}
                            {(ord.status === "sample_collected" || ord.status === "in_progress") && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedOrderForRejection(ord)}
                                className="h-7 text-xs gap-1 text-red-600 hover:text-red-700 hover:bg-red-500/10 font-medium"
                                title="Reject sample (hemolyzed, clotted, insufficient volume)"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                Reject
                              </Button>
                            )}

                            {/* Priority Recollection button if rejected */}
                            {ord.rejection_reason && !ord.is_recollected && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => recollectMutation.mutate(ord.id)}
                                disabled={recollectMutation.isPending}
                                className="h-7 text-xs gap-1 bg-red-600 hover:bg-red-500 text-white font-bold"
                                title="Generate priority STAT recollection token"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Recollect
                              </Button>
                            )}

                            {/* Enter / Edit Results button -> Full Page (Available whenever sample is collected, in progress, awaiting sign-off, or authorized!) */}
                            {(["sample_collected", "in_progress", "result_entered", "partially_authorized", "authorized"].includes(ord.status) || Boolean(ord.sample_accession_number)) && (
                              <Button
                                variant={ord.status === "authorized" ? "outline" : "default"}
                                size="sm"
                                onClick={() => navigate(`/lab/orders/${ord.id}/results`)}
                                className={`h-7 text-xs gap-1 font-bold ${
                                  ord.status === "partially_authorized"
                                    ? "bg-teal-600 hover:bg-teal-500 text-white"
                                    : ""
                                }`}
                                title="Enter or modify test parameter results"
                              >
                                <FlaskConical className="h-3.5 w-3.5" />
                                {ord.status === "authorized"
                                  ? "Edit Results"
                                  : ord.status === "partially_authorized"
                                  ? "Enter Results"
                                  : ord.status === "result_entered"
                                  ? "Edit Results"
                                  : "Enter Results"}
                              </Button>
                            )}

                            {/* View Audit Trail button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedOrderForAudit(ord)}
                              className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground font-medium"
                              title="View Audit Trail & Modification History"
                            >
                              <History className="h-3 w-3" />
                              Audit
                            </Button>

                            {/* Edit Bill button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setOrderToEditForBooking(ord)
                                setIsDirectBookingOpen(true)
                              }}
                              className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground font-medium"
                              title="Edit Investigation Bill, Patient, and Tests"
                            >
                              <Edit3 className="h-3 w-3" />
                              Edit Bill
                            </Button>

                            {/* Bill Slip button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => printLabBillSlip(ord)}
                              className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                              title="Print 80mm Counter Slip"
                            >
                              <Receipt className="h-3 w-3" />
                              Slip
                            </Button>

                            {/* Print Report button -> Full Page */}
                            {(ord.status === "result_entered" || ord.status === "authorized") && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/lab/orders/${ord.id}/report`)}
                                className="h-7 text-xs gap-1 border-primary/40 text-primary hover:bg-primary/10 font-bold"
                              >
                                <Printer className="h-3.5 w-3.5" />
                                Report
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </SectionCard>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB: LAB BILLING & INVOICES HISTORY LEDGER
         ───────────────────────────────────────────────────────────── */}
      {activeTab === "invoices" && (
        <SectionCard
          title="Lab Invoices & Billing Ledger"
          description="History of all bills created in the laboratory, tracking gross amount, discounts, collections, outstanding dues, and real-time bill editing."
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchInvoices()}
                disabled={invoicesLoading}
                className="text-xs h-8 gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${invoicesLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  setOrderToEditForBooking(null)
                  setIsDirectBookingOpen(true)
                }}
                className="text-xs h-8 gap-1.5 font-bold"
              >
                <Plus className="h-3.5 w-3.5" />
                New Lab Bill
              </Button>
            </div>
          }
        >
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by invoice #, bill #, patient name, UHID, order #..."
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
              <span className="text-muted-foreground text-[11px] font-semibold mr-1">Payment Status:</span>
              {[
                { id: "all", label: "All Bills" },
                { id: "paid", label: "Paid" },
                { id: "partial", label: "Partial Due" },
                { id: "pending", label: "Pending Due" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setInvoiceStatusFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    invoiceStatusFilter === f.id
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "bg-muted/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Invoices Table */}
          {invoicesLoading ? (
            <div className="py-16 text-center">
              <LoadingSpinner label="Loading lab billing history ledger..." />
            </div>
          ) : invoicesList.length === 0 ? (
            <EmptyState
              title="No Invoices Found"
              description="No lab bills found matching your search or payment status filter."
              actionLabel="Reset Filters"
              onAction={() => {
                setInvoiceSearch("")
                setInvoiceStatusFilter("all")
              }}
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border text-[10px] uppercase font-bold text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Date & Bill / Order</th>
                    <th className="px-4 py-3">Patient Details</th>
                    <th className="px-4 py-3">Investigations Prescribed</th>
                    <th className="px-4 py-3 text-right">Gross Total</th>
                    <th className="px-4 py-3 text-right">Discount</th>
                    <th className="px-4 py-3 text-right">Net Payable</th>
                    <th className="px-4 py-3 text-right">Paid Amount</th>
                    <th className="px-4 py-3 text-right">Balance Due</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoicesList.map((ord: LabOrder) => {
                    const inv = ord.invoice
                    const gross =
                      inv?.gross_amount ??
                      ord.items?.reduce(
                        (s, it) => s + parseFloat(String(it.rate || (it as any).price || 0)),
                        0
                      ) ??
                      0
                    const discount = inv?.discount_amount ?? 0
                    const net = inv?.net_amount ?? Math.max(0, gross - discount)
                    const paid = inv?.paid_amount ?? (inv?.payment_status === "paid" ? net : 0)
                    const due = inv?.balance_due ?? Math.max(0, net - paid)

                    return (
                      <tr key={ord.id} className="hover:bg-muted/30 transition-colors">
                        {/* Date & Bill Numbers */}
                        <td className="px-4 py-3">
                          <div className="font-mono font-bold text-foreground">
                            {inv?.invoice_number || `ORD-${ord.order_number}`}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {new Date(ord.created_at || (ord as any).order_date).toLocaleDateString()}{" "}
                            {new Date(ord.created_at || (ord as any).order_date).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                          {ord.token_number && (
                            <span className="inline-block mt-0.5 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">
                              Token: {ord.token_number}
                            </span>
                          )}
                        </td>

                        {/* Patient */}
                        <td className="px-4 py-3">
                          <div className="font-bold text-foreground">{ord.patient?.name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            UHID: {ord.patient?.uhid} • {ord.patient?.gender} / {ord.patient?.age}Y
                          </div>
                          {ord.doctor && (
                            <div className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                              Dr. {ord.doctor.name}
                            </div>
                          )}
                        </td>

                        {/* Investigations */}
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {(ord.items || []).map((it) => (
                              <span
                                key={it.id}
                                className="px-2 py-0.5 rounded bg-muted text-[10px] font-medium text-foreground truncate max-w-[140px]"
                                title={it.test_name}
                              >
                                {it.test_name}
                              </span>
                            ))}
                          </div>
                          <span className="text-[10px] text-muted-foreground mt-0.5 block">
                            {ord.items?.length || 0} test panel(s)
                          </span>
                        </td>

                        {/* Financials */}
                        <td className="px-4 py-3 text-right font-mono font-semibold text-foreground">
                          ₹{parseFloat(String(gross)).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                          {discount > 0 ? (
                            <span className="text-amber-600 font-bold">
                              -₹{parseFloat(String(discount)).toFixed(2)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-black text-foreground">
                          ₹{parseFloat(String(net)).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">
                          ₹{parseFloat(String(paid)).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold">
                          {due > 0 ? (
                            <span className="text-red-600 font-black">
                              ₹{parseFloat(String(due)).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-emerald-600">₹0.00</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 text-center">
                          {inv?.payment_status === "paid" || due === 0 ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                              Paid
                            </Badge>
                          ) : inv?.payment_status === "partial" || (paid > 0 && due > 0) ? (
                            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">
                              Partial Due
                            </Badge>
                          ) : (
                            <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-[10px]">
                              Pending Due
                            </Badge>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1 flex-wrap">
                            {/* Edit Bill */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setOrderToEditForBooking(ord)
                                setIsDirectBookingOpen(true)
                              }}
                              className="h-7 text-xs gap-1 font-semibold"
                              title="Edit Bill, Add/Remove Tests, Change Discount"
                            >
                              <Edit3 className="h-3 w-3 text-primary" />
                              Edit Bill
                            </Button>

                            {/* Collect Due Payment */}
                            {due > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setOrderForCollectPayment(ord)}
                                className="h-7 text-xs gap-1 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 font-bold"
                                title="Collect Pending Balance Due"
                              >
                                <Wallet className="h-3 w-3" />
                                Collect Due
                              </Button>
                            )}

                            {/* Print Bill Slip */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => printLabBillSlip(ord)}
                              className="h-7 text-xs gap-1"
                              title="Print 80mm Counter Bill / Tax Invoice Slip"
                            >
                              <Printer className="h-3 w-3 text-muted-foreground" />
                              Slip
                            </Button>

                            {/* Result Entry / View */}
                            {ord.status === "result_entered" || ord.status === "authorized" ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/lab/orders/${ord.id}/report`)}
                                className="h-7 text-xs gap-1 text-primary font-bold"
                              >
                                Report
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/lab/orders/${ord.id}/results`)}
                                className="h-7 text-xs gap-1 font-semibold"
                              >
                                Results
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 4: LAB TEST MASTER CATALOG (281+ TESTS)
         ───────────────────────────────────────────────────────────── */}
      {activeTab === "catalog" && (
        <SectionCard
          title="Laboratory Test Master Catalog"
          description="Browse, filter, and customize all pre-seeded pathology tests, formulas, units, and biological reference intervals."
          actions={
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate("/lab/tests/create")}
              className="gap-1.5 text-xs h-8 font-bold"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Custom Test
            </Button>
          }
        >
          {/* Department Tabs & Search */}
          <div className="space-y-3 mb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search 281+ tests by name, code, method..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 text-xs h-9"
                />
              </div>

              <div className="text-xs text-muted-foreground font-semibold">
                Showing {filteredTemplates.length} of {templatesList.length} diagnostic tests
              </div>
            </div>

            {/* Department Pill Filters */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                "all",
                "Biochemistry",
                "Haematology",
                "Clinical Pathology",
                "Serology & Immunology",
                "Microbiology",
                "Hormones",
                "Vitamins",
                "Molecular Diagnostics",
              ].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCatalogCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    catalogCategory === cat
                      ? "bg-primary text-primary-foreground font-bold"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {cat === "all" ? "All Departments" : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Test Cards Grid */}
          {templatesLoading ? (
            <div className="py-20">
              <LoadingSpinner label="Loading 281+ pathology test catalog..." />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <EmptyState
              title="No tests found"
              description="No diagnostic test template matches your search criteria."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredTemplates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-all flex flex-col justify-between shadow-2xs group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">
                          {tpl.test_name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.2 rounded">
                            {tpl.test_code}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {tpl.category}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-sm text-foreground">
                          ₹{tpl.standard_price || 0}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1 text-[11px] text-muted-foreground">
                      <div className="flex items-center justify-between">
                        <span>Specimen / Tube:</span>
                        <span className="font-medium text-foreground truncate max-w-[150px]">
                          {tpl.container_color || tpl.sample_type || "Serum"}
                        </span>
                      </div>
                      {tpl.method && (
                        <div className="flex items-center justify-between">
                          <span>Method:</span>
                          <span className="font-medium text-foreground truncate max-w-[150px]">
                            {tpl.method}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span>Parameters:</span>
                        <span className="font-bold text-primary">
                          {tpl.parameters?.length || 1} parameter(s)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      TAT: {tpl.tat_hours || 24}h
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/lab/tests/${tpl.id}/edit`)}
                      className="h-6 text-[11px] px-2 text-primary hover:text-primary font-bold"
                    >
                      Edit Test
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {/* ─── MODALS ─── */}
      {/* 1. Sample Collection Modal */}
      {selectedOrderForSample && (
        <SampleCollectionModal
          order={selectedOrderForSample}
          onClose={() => setSelectedOrderForSample(null)}
          onSuccess={() => {
            setSelectedOrderForSample(null)
            refetchOrders()
          }}
        />
      )}

      {/* 2. Direct Walk-In Lab Booking & Instant Billing Right Sidebar Drawer */}
      {isDirectBookingOpen && (
        <DirectLabBookingModal
          isOpen={isDirectBookingOpen}
          orderToEdit={orderToEditForBooking}
          onClose={() => {
            setIsDirectBookingOpen(false)
            setOrderToEditForBooking(null)
          }}
          onSuccess={() => {
            setIsDirectBookingOpen(false)
            setOrderToEditForBooking(null)
            refetchOrders()
            refetchInvoices()
          }}
        />
      )}

      {/* 3. Collect Balance Due Payment Modal */}
      {orderForCollectPayment && (
        <CollectPaymentModal
          order={orderForCollectPayment}
          onClose={() => setOrderForCollectPayment(null)}
          onSuccess={() => {
            setOrderForCollectPayment(null)
            refetchOrders()
            refetchInvoices()
          }}
        />
      )}

      {/* 5. Thermal 2"x1" Barcode Sticker Label Modal */}
      {selectedOrderForThermalBarcode && (
        <ThermalBarcodeStickerModal
          onClose={() => setSelectedOrderForThermalBarcode(null)}
          order={selectedOrderForThermalBarcode}
        />
      )}

      {/* 6. Sample Rejection & Recollection Modal */}
      {selectedOrderForRejection && (
        <SampleRejectionModal
          onClose={() => setSelectedOrderForRejection(null)}
          order={selectedOrderForRejection}
          onSuccess={() => {
            setSelectedOrderForRejection(null)
            refetchOrders()
          }}
        />
      )}

      {/* 7. Diagnostic Result Audit Trail Modal */}
      {selectedOrderForAudit && (
        <LabAuditLogModal
          order={selectedOrderForAudit}
          isOpen={Boolean(selectedOrderForAudit)}
          onClose={() => setSelectedOrderForAudit(null)}
        />
      )}

    </div>
  )
}
