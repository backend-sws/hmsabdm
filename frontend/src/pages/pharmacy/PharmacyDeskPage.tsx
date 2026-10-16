import React, { useState } from "react"
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

export const PharmacyDeskPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    | "pos"
    | "prescriptions"
    | "indents"
    | "cdsco"
    | "gst"
    | "po"
    | "formulary"
    | "suppliers"
    | "grn"
    | "inventory"
    | "rtv"
    | "returns"
  >("pos")

  const [posInitialPatient, setPosInitialPatient] = useState<any>(undefined)
  const [posInitialCart, setPosInitialCart] = useState<any[] | undefined>(undefined)

  const { data: stats, isLoading: isLoadingStats } = usePharmacyDashboardStats()
  const { data: pendingRxData } = usePendingPrescriptions()
  const pendingCount = pendingRxData?.data?.length || 0

  const { data: indentsData } = useWardIndents({ status: "PENDING" })
  const pendingIndentCount = indentsData?.data?.length || 0

  const { data: lowStockData } = useLowStockAlerts()
  const lowStockCount = lowStockData?.total_low_stock_count || 0

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

      {/* Main Workstation Navigation Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab("pos")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "pos"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShoppingCart className="h-4 w-4" />
            POS Billing Counter
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("prescriptions")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "prescriptions"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Stethoscope className="h-4 w-4" />
            <span>Doctor Rx Queue</span>
            {pendingCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[10px] font-black text-white">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("indents")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === "indents"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <Bed className="h-4 w-4 text-indigo-500" />
            <span>Ward Indents (IPD)</span>
            {pendingIndentCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 text-[10px] font-black text-white animate-pulse">
                {pendingIndentCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("cdsco")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === "cdsco"
                ? "border-amber-500 text-amber-600 dark:text-amber-400"
                : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            <span>CDSCO Register</span>
            <span className="rounded-full bg-amber-100 px-1.5 py-0.2 text-[10px] font-black text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              Form 35
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("gst")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === "gst"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <IndianRupee className="h-4 w-4 text-blue-600" />
            <span>GST Tax Ledger & Filing</span>
            <span className="rounded-full bg-blue-100 px-1.5 py-0.2 text-[10px] font-black text-blue-800 dark:bg-blue-950 dark:text-blue-300">
              GSTR-3B
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("formulary")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === "formulary"
                ? "border-primary text-primary"
                : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <Pill className="h-4 w-4" />
            Hospital Formulary & Master
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("suppliers")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === "suppliers"
                ? "border-primary text-primary"
                : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <Building2 className="h-4 w-4" />
            Suppliers & Vendor Ledger
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("po")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === "po"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <ClipboardList className="h-4 w-4 text-blue-600" />
            <span>Purchase Orders & PO</span>
            {lowStockCount > 0 && (
              <span className="rounded-full bg-rose-100 px-1.5 py-0.2 text-[10px] font-black text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                {lowStockCount} Deficit
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("grn")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === "grn"
                ? "border-primary text-primary"
                : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <FileText className="h-4 w-4" />
            Purchase Inward (GRN)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("inventory")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === "inventory"
                ? "border-primary text-primary"
                : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <Layers className="h-4 w-4" />
            Batch Inventory & Expiry
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("rtv")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === "rtv"
                ? "border-orange-500 text-orange-600 dark:text-orange-400"
                : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <RotateCcw className="h-4 w-4" />
            Supplier Returns (RTV)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("returns")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === "returns"
                ? "border-primary text-primary"
                : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <RotateCcw className="h-4 w-4" />
            Customer Sales Returns
          </button>
        </div>
      </div>

      {/* Tab Panels */}
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

        {activeTab === "cdsco" && <CdscoRegisterTab />}
        {activeTab === "gst" && <GstReportTab />}

        {activeTab === "po" && <PurchaseOrdersTab />}

        {activeTab === "formulary" && <FormularyTab />}

        {activeTab === "suppliers" && <SuppliersLedgerTab />}

        {activeTab === "grn" && <PurchaseGrnTab />}

        {activeTab === "inventory" && <BatchInventoryTab />}

        {activeTab === "rtv" && <SupplierReturnsTab />}

        {activeTab === "returns" && <CustomerReturnTab />}
      </div>
    </div>
  )
}
