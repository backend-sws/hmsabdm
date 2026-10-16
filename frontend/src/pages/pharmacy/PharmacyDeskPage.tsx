import React, { useState, useRef, useEffect, useCallback } from "react"
import {
  ShoppingCart,
  Layers,
  FileText,
  RotateCcw,
  Building2,
  Pill,
  Stethoscope,
  ShieldAlert,
  IndianRupee,
  Bed,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import {
  usePharmacyDashboardStats,
  usePendingPrescriptions,
  useWardIndents,
  useLowStockAlerts,
} from "@/hooks/usePharmacy"
import { PageHeader } from "@/components/common/PageHeader"
import { pharmacyService } from "@/services/pharmacyService"
import { PharmacyStatsHeader } from "@/components/pharmacy/PharmacyStatsHeader"
import { PosBillingTab } from "@/components/pharmacy/PosBillingTab"
import { PurchaseGrnTab } from "@/components/pharmacy/PurchaseGrnTab"
import { BatchInventoryTab } from "@/components/pharmacy/BatchInventoryTab"
import { CustomerReturnTab } from "@/components/pharmacy/CustomerReturnTab"
import { SuppliersLedgerTab } from "@/components/pharmacy/SuppliersLedgerTab"
import { FormularyTab } from "@/components/pharmacy/FormularyTab"
import { SupplierReturnsTab } from "@/components/pharmacy/SupplierReturnsTab"
import { OpdPrescriptionQueueTab } from "@/components/pharmacy/OpdPrescriptionQueueTab"
import { CdscoRegisterTab } from "@/components/pharmacy/CdscoRegisterTab"
import { GstReportTab } from "@/components/pharmacy/GstReportTab"
import { WardIndentsTab } from "@/components/pharmacy/WardIndentsTab"
import { PurchaseOrdersTab } from "@/components/pharmacy/PurchaseOrdersTab"

export type PharmacyTabId =
  | "pos"
  | "prescriptions"
  | "indents"
  | "returns"
  | "inventory"
  | "formulary"
  | "po"
  | "grn"
  | "suppliers"
  | "rtv"
  | "cdsco"
  | "gst"

interface PharmacyTabItem {
  id: PharmacyTabId
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: React.ReactNode
  activeColor: string
  group: "dispense" | "inventory" | "procurement" | "compliance"
}

export const PharmacyDeskPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<PharmacyTabId>("pos")

  const [posInitialPatient, setPosInitialPatient] = useState<any>(undefined)
  const [posInitialCart, setPosInitialCart] = useState<any[] | undefined>(undefined)

  const { data: stats, isLoading: isLoadingStats } = usePharmacyDashboardStats()
  const { data: pendingRxData } = usePendingPrescriptions()
  const pendingCount = pendingRxData?.data?.length || 0

  const { data: indentsData } = useWardIndents({ status: "PENDING" })
  const pendingIndentCount = indentsData?.data?.length || 0

  const { data: lowStockData } = useLowStockAlerts()
  const lowStockCount = lowStockData?.total_low_stock_count || 0

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const tabButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateScrollState = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    setCanScrollLeft(scrollLeft > 4)
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6)
  }, [])

  useEffect(() => {
    updateScrollState()
    const el = scrollContainerRef.current
    if (!el) return

    const handleResize = () => updateScrollState()
    window.addEventListener("resize", handleResize)

    // Non-passive wheel handler: converts vertical wheel to smooth horizontal scroll on tab container
    const handleWheel = (e: WheelEvent) => {
      if (el.scrollWidth > el.clientWidth) {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          e.preventDefault()
          el.scrollLeft += e.deltaY * 0.9
          updateScrollState()
        }
      }
    }

    el.addEventListener("wheel", handleWheel, { passive: false })

    return () => {
      window.removeEventListener("resize", handleResize)
      el.removeEventListener("wheel", handleWheel)
    }
  }, [updateScrollState])

  // Auto-scroll active tab button into view when activeTab changes
  useEffect(() => {
    const activeBtn = tabButtonRefs.current[activeTab]
    if (activeBtn) {
      activeBtn.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      })
    }
    const timer = setTimeout(updateScrollState, 350)
    return () => clearTimeout(timer)
  }, [activeTab, updateScrollState])

  const handleScrollClick = (direction: "left" | "right") => {
    const el = scrollContainerRef.current
    if (!el) return
    const distance = 300
    el.scrollBy({
      left: direction === "left" ? -distance : distance,
      behavior: "smooth",
    })
    setTimeout(updateScrollState, 350)
  }

  // Clinical & operational priority order:
  // 1. Patient Dispensing & POS Workflows (Daily Immediate Priority)
  // 2. Stock Inventory & Formulary Master (Daily Operations)
  // 3. Purchase Orders & Procurement (Supply Chain)
  // 4. Statutory CDSCO Drug Registers & GST Ledgers (Audit & Periodic Compliance)
  const tabs: PharmacyTabItem[] = [
    {
      id: "pos",
      label: "POS Billing Counter",
      icon: ShoppingCart,
      activeColor: "border-primary text-primary",
      group: "dispense",
    },
    {
      id: "prescriptions",
      label: "Doctor Rx Queue",
      icon: Stethoscope,
      badge: pendingCount > 0 ? (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[10px] font-black text-white">
          {pendingCount}
        </span>
      ) : null,
      activeColor: "border-primary text-primary",
      group: "dispense",
    },
    {
      id: "indents",
      label: "Ward Indents (IPD)",
      icon: Bed,
      badge: pendingIndentCount > 0 ? (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 text-[10px] font-black text-white animate-pulse">
          {pendingIndentCount}
        </span>
      ) : null,
      activeColor: "border-indigo-600 text-indigo-600 dark:text-indigo-400",
      group: "dispense",
    },
    {
      id: "returns",
      label: "Customer Sales Returns",
      icon: RotateCcw,
      activeColor: "border-primary text-primary",
      group: "dispense",
    },
    {
      id: "inventory",
      label: "Batch Inventory & Expiry",
      icon: Layers,
      activeColor: "border-primary text-primary",
      group: "inventory",
    },
    {
      id: "formulary",
      label: "Hospital Formulary & Master",
      icon: Pill,
      activeColor: "border-primary text-primary",
      group: "inventory",
    },
    {
      id: "po",
      label: "Purchase Orders & PO",
      icon: ClipboardList,
      badge: lowStockCount > 0 ? (
        <span className="rounded-full bg-rose-100 px-1.5 py-0.2 text-[10px] font-black text-rose-800 dark:bg-rose-950 dark:text-rose-300">
          {lowStockCount} Deficit
        </span>
      ) : null,
      activeColor: "border-blue-600 text-blue-600 dark:text-blue-400",
      group: "procurement",
    },
    {
      id: "grn",
      label: "Purchase Inward (GRN)",
      icon: FileText,
      activeColor: "border-primary text-primary",
      group: "procurement",
    },
    {
      id: "suppliers",
      label: "Suppliers & Vendor Ledger",
      icon: Building2,
      activeColor: "border-primary text-primary",
      group: "procurement",
    },
    {
      id: "rtv",
      label: "Supplier Returns (RTV)",
      icon: RotateCcw,
      activeColor: "border-orange-500 text-orange-600 dark:text-orange-400",
      group: "procurement",
    },
    {
      id: "cdsco",
      label: "CDSCO Register",
      icon: ShieldAlert,
      badge: (
        <span className="rounded-full bg-amber-100 px-1.5 py-0.2 text-[10px] font-black text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          Form 35
        </span>
      ),
      activeColor: "border-amber-500 text-amber-600 dark:text-amber-400",
      group: "compliance",
    },
    {
      id: "gst",
      label: "GST Tax Ledger & Filing",
      icon: IndianRupee,
      badge: (
        <span className="rounded-full bg-blue-100 px-1.5 py-0.2 text-[10px] font-black text-blue-800 dark:bg-blue-950 dark:text-blue-300">
          GSTR-3B
        </span>
      ),
      activeColor: "border-blue-600 text-blue-600 dark:text-blue-400",
      group: "compliance",
    },
  ]

  const handleFulfillPrescription = async (prescriptionId: number, patientData: any) => {
    try {
      const details = await pharmacyService.getPrescriptionDispenseDetails(prescriptionId)
      const cartItems = (details.dispense_items || [])
        .filter((it: any) => it.fefo_batch && it.fefo_batch.available_quantity > 0)
        .map((it: any) => ({
          batch_id: it.fefo_batch.id,
          hospital_medicine_id: it.fefo_batch.hospital_medicine_id,
          brand_name: it.fefo_batch.medicine?.brand_name || it.medicine_name,
          generic_name: it.fefo_batch.medicine?.generic_name || "",
          dosage_form: it.fefo_batch.medicine?.dosage_form || "Tablet",
          batch_number: it.fefo_batch.batch_number,
          expiry_date: it.fefo_batch.expiry_date,
          available_quantity: it.fefo_batch.available_quantity,
          quantity: 1,
          unit_price: it.fefo_batch.selling_price || it.fefo_batch.mrp,
          unit_mrp: it.fefo_batch.mrp,
          discount_percent: 0,
          gst_rate: it.fefo_batch.medicine?.gst_rate || 12,
          hsn_code: it.fefo_batch.medicine?.hsn_code || "3004",
          strip_size: it.fefo_batch.medicine?.pack_size || 10,
          prescription_type: it.fefo_batch.medicine?.prescription_type || "OTC",
        }))

      setPosInitialPatient(patientData)
      setPosInitialCart(cartItems)
      setActiveTab("pos")
    } catch {
      setPosInitialPatient(patientData)
      setActiveTab("pos")
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Title & Header */}
      <PageHeader
        title="Hospital Pharmacy & Supply Chain Desk"
        subtitle="Omni-Channel Point of Sale, Vendor Credit Ledger, Medicine Formulary, Batch Surveillance & Inward GRNs"
        icon={Pill}
        badge={
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary border border-primary/20">
            Enterprise Suite
          </span>
        }
      />

      {/* KPI Stats Bar */}
      <PharmacyStatsHeader stats={stats} isLoading={isLoadingStats} />

      {/* Main Workstation Navigation Tabs with Horizontal Scroll Controls */}
      <div className="relative flex items-center border-b border-border bg-card/40 rounded-xl p-1 shadow-2xs">
        {/* Left Scroll Button */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => handleScrollClick("left")}
            className="shrink-0 mr-1 flex h-8 w-8 items-center justify-center rounded-lg bg-background text-foreground shadow-xs border border-border/80 hover:bg-muted transition-all cursor-pointer focus:outline-hidden"
            title="Scroll left"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        {/* Scrollable Tabs List */}
        <div
          ref={scrollContainerRef}
          onScroll={updateScrollState}
          className="flex-1 flex items-center gap-1.5 overflow-x-auto py-1 px-1 scroll-smooth select-none scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40"
          style={{ scrollbarWidth: "thin" }}
        >
          {tabs.map((tab, idx) => {
            const isSelected = activeTab === tab.id
            const Icon = tab.icon
            const showDivider = idx > 0 && tabs[idx - 1].group !== tab.group

            return (
              <React.Fragment key={tab.id}>
                {showDivider && (
                  <div
                    className="h-5 w-px bg-border/70 mx-1 shrink-0 self-center"
                    aria-hidden="true"
                  />
                )}
                <button
                  ref={(el) => {
                    tabButtonRefs.current[tab.id] = el
                  }}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 border-b-2 px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 rounded-t-lg cursor-pointer ${
                    isSelected
                      ? `${tab.activeColor} bg-muted/40 font-bold shadow-2xs`
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/20"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{tab.label}</span>
                  {tab.badge}
                </button>
              </React.Fragment>
            )
          })}
        </div>

        {/* Right Scroll Button */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => handleScrollClick("right")}
            className="shrink-0 ml-1 flex h-8 w-8 items-center justify-center rounded-lg bg-background text-foreground shadow-xs border border-border/80 hover:bg-muted transition-all cursor-pointer focus:outline-hidden animate-pulse"
            title="More tabs available - Scroll right"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Tab Panels in Logical Priority Sequence */}
      <div>
        {activeTab === "pos" && (
          <PosBillingTab
            initialPatient={posInitialPatient}
            initialCartItems={posInitialCart}
          />
        )}

        {activeTab === "prescriptions" && (
          <OpdPrescriptionQueueTab onFulfillPrescription={handleFulfillPrescription} />
        )}

        {activeTab === "indents" && <WardIndentsTab />}

        {activeTab === "returns" && <CustomerReturnTab />}

        {activeTab === "inventory" && <BatchInventoryTab />}

        {activeTab === "formulary" && <FormularyTab />}

        {activeTab === "po" && <PurchaseOrdersTab />}

        {activeTab === "grn" && <PurchaseGrnTab />}

        {activeTab === "suppliers" && <SuppliersLedgerTab />}

        {activeTab === "rtv" && <SupplierReturnsTab />}

        {activeTab === "cdsco" && <CdscoRegisterTab />}

        {activeTab === "gst" && <GstReportTab />}
      </div>
    </div>
  )
}

