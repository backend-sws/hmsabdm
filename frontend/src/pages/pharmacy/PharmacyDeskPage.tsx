import React, { useState } from "react"
import {
  ShoppingCart,
  Layers,
  FileText,
  RotateCcw,
  Building2,
  Pill,
  Stethoscope,
} from "lucide-react"
import { usePharmacyDashboardStats, usePendingPrescriptions } from "@/hooks/usePharmacy"
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

export const PharmacyDeskPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "pos" | "prescriptions" | "formulary" | "suppliers" | "grn" | "inventory" | "rtv" | "returns"
  >("pos")

  const [posInitialPatient, setPosInitialPatient] = useState<any>(undefined)
  const [posInitialCart, setPosInitialCart] = useState<any[] | undefined>(undefined)

  const { data: stats, isLoading: isLoadingStats } = usePharmacyDashboardStats()
  const { data: pendingRxData } = usePendingPrescriptions()
  const pendingCount = pendingRxData?.data?.length || 0

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
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Page Title & KPI Stats */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Hospital Pharmacy & Supply Chain Desk
            </h1>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
              Enterprise Suite
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Omni-Channel Point of Sale, Vendor Credit Ledger, Medicine Formulary, Batch Surveillance & Inward GRNs
          </p>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <PharmacyStatsHeader stats={stats} isLoading={isLoadingStats} />

      {/* Main Workstation Navigation Tabs */}
      <div className="border-b border-slate-200 dark:border-border">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveTab("pos")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === "pos"
                ? "border-primary text-primary"
                : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <ShoppingCart className="h-4 w-4" />
            POS Billing Counter
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("prescriptions")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === "prescriptions"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
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
