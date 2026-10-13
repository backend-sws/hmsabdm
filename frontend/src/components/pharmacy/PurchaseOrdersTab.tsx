import React, { useState } from "react"
import {
  FileText,
  Plus,
  Search,
  Printer,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Loader2,
  RefreshCw,
  ShoppingCart,
  Send,
  XCircle,
  Eye,
} from "lucide-react"
import {
  usePurchaseOrders,
  useLowStockAlerts,
  useCreatePurchaseOrderMutation,
  useUpdatePurchaseOrderStatusMutation,
  useSuppliers,
  useFormulary,
} from "@/hooks/usePharmacy"
import type {
  PharmacyPurchaseOrder,
  LowStockAlertItem,
  PharmacySupplier,
  HospitalMedicine,
} from "@/types/pharmacy"

export const PurchaseOrdersTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<"orders" | "low_stock">("orders")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [searchQuery, setSearchQuery] = useState("")

  // Modals
  const [isCreatePoModalOpen, setIsCreatePoModalOpen] = useState(false)
  const [prefilledSupplierId, setPrefilledSupplierId] = useState<number | undefined>(undefined)
  const [prefilledItems, setPrefilledItems] = useState<any[] | undefined>(undefined)
  const [viewPo, setViewPo] = useState<PharmacyPurchaseOrder | null>(null)

  // Fetch Purchase Orders
  const { data: poData, isLoading, refetch } = usePurchaseOrders({
    status: statusFilter === "ALL" ? undefined : statusFilter,
    search: searchQuery.trim() || undefined,
  })
  const orders: PharmacyPurchaseOrder[] = poData?.data || []

  // Fetch Low Stock Alerts
  const { data: lowStockData, isLoading: isLoadingLowStock, refetch: refetchLowStock } = useLowStockAlerts()
  const lowStockItems: LowStockAlertItem[] = lowStockData?.items || []
  const totalLowStockCount = lowStockData?.total_low_stock_count || 0

  // Status mutation
  const updateStatusMutation = useUpdatePurchaseOrderStatusMutation()

  const handle1ClickPoForSupplier = (supplierId: number, items: LowStockAlertItem[]) => {
    setPrefilledSupplierId(supplierId)
    setPrefilledItems(
      items.map((it) => ({
        hospital_medicine_id: it.medicine_id,
        name: it.brand_name,
        pack_quantity: it.suggested_packs,
        strip_size: it.strip_size,
        pack_size: it.pack_size,
        pack_purchase_rate: it.default_purchase_rate * it.pack_size * it.strip_size,
        gst_rate: it.gst_rate,
        discount_percent: 0,
      }))
    )
    setIsCreatePoModalOpen(true)
  }

  const handlePrintPo = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-border dark:bg-card">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            <FileText className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              Purchase Orders & Reorder Intelligence
              {totalLowStockCount > 0 && (
                <span
                  onClick={() => setActiveSubTab("low_stock")}
                  className="cursor-pointer rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700 hover:bg-rose-200 dark:bg-rose-950 dark:text-rose-300"
                >
                  {totalLowStockCount} Low Stock Deficits
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Vendor Purchase Orders (PO), Automated Low-Stock Reorder Triggers & GRN Inward Reconciliation
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setPrefilledSupplierId(undefined)
            setPrefilledItems(undefined)
            setIsCreatePoModalOpen(true)
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-primary/90 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Generate Purchase Order (PO)
        </button>
      </div>

      {/* Sub Tabs: Purchase Orders vs Low Stock Alerts */}
      <div className="border-b border-slate-200 dark:border-border">
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setActiveSubTab("orders")}
            className={`flex items-center gap-2 border-b-2 py-3 text-sm font-bold transition-all ${activeSubTab === "orders"
                ? "border-primary text-primary"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white"
              }`}
          >
            <span>All Purchase Orders</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {orders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("low_stock")}
            className={`flex items-center gap-2 border-b-2 py-3 text-sm font-bold transition-all ${activeSubTab === "low_stock"
                ? "border-rose-600 text-rose-600 dark:text-rose-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white"
              }`}
          >
            <AlertTriangle className="h-4 w-4 text-rose-500" />
            <span>Low Stock Reorder Alerts</span>
            {totalLowStockCount > 0 && (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-black text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                {totalLowStockCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* VIEW 1: PURCHASE ORDERS LIST */}
      {activeSubTab === "orders" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-border dark:bg-card">
            <div className="flex flex-wrap items-center gap-1">
              {["ALL", "ORDERED", "PARTIALLY_RECEIVED", "COMPLETED", "CANCELLED"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${statusFilter === st
                      ? "bg-primary text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                >
                  {st.replace("_", " ")}
                </button>
              ))}
            </div>

            <div className="relative w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search PO #, supplier name, GSTIN..."
                className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs outline-none focus:border-primary dark:border-border dark:bg-card"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-border dark:bg-card">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-3 text-xs font-bold text-slate-600">Loading purchase orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500 dark:border-border dark:bg-card">
              <FileText className="h-10 w-10 text-slate-300 mb-2" />
              <p className="font-bold text-sm">No Purchase Orders Found</p>
              <p className="text-xs text-slate-400">Generate purchase orders for suppliers or import low stock suggestions.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 dark:bg-slate-900/60 dark:text-slate-300 border-b border-slate-200 font-bold">
                    <tr>
                      <th className="py-3 px-4">PO Number</th>
                      <th className="py-3 px-4">PO Date</th>
                      <th className="py-3 px-4">Supplier</th>
                      <th className="py-3 px-4 text-center">Items</th>
                      <th className="py-3 px-4 text-right">Taxable (₹)</th>
                      <th className="py-3 px-4 text-right">Tax (₹)</th>
                      <th className="py-3 px-4 text-right">Net PO Value (₹)</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-border text-slate-800 dark:text-slate-200">
                    {orders.map((po) => (
                      <tr key={po.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                        <td className="py-3 px-4 font-mono font-bold text-primary">{po.po_number}</td>
                        <td className="py-3 px-4 font-medium text-slate-600 dark:text-slate-400">{po.po_date}</td>
                        <td className="py-3 px-4 font-semibold">
                          {po.supplier?.supplier_name || "Supplier"}
                          {po.supplier?.gstin && (
                            <div className="font-mono text-[10px] text-slate-400">{po.supplier.gstin}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-bold">{po.total_items_count}</td>
                        <td className="py-3 px-4 text-right font-medium">{po.taxable_amount.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-medium">{po.tax_amount.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-white">
                          ₹{po.net_amount.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${po.status === "COMPLETED"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : po.status === "ORDERED"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                  : po.status === "CANCELLED"
                                    ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                    : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              }`}
                          >
                            {po.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setViewPo(po)}
                              title="View & Print PO"
                              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 dark:border-border dark:text-slate-300"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>

                            {po.status === "ORDERED" && (
                              <button
                                type="button"
                                onClick={() => updateStatusMutation.mutate({ id: po.id, status: "CANCELLED" })}
                                title="Cancel PO"
                                className="rounded-lg border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </button>
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
        </div>
      )}

      {/* VIEW 2: LOW STOCK REORDER ALERTS */}
      {activeSubTab === "low_stock" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-900/40 dark:bg-rose-950/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold text-sm">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
                <span>Automated Reorder Surveillance Active</span>
              </div>
              <button
                type="button"
                onClick={() => refetchLowStock()}
                className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 hover:underline"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh Stock Audit
              </button>
            </div>
            <p className="mt-1 text-xs text-rose-700/80 dark:text-rose-300/80">
              The following medicines have stock levels at or below their configured Minimum Reorder Level across active batches. You can trigger an instant Purchase Order with 1-click.
            </p>
          </div>

          {isLoadingLowStock ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-border dark:bg-card">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-3 text-xs font-bold text-slate-600">Calculating batch stock levels...</p>
            </div>
          ) : lowStockItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-border dark:bg-card">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2" />
              <p className="font-bold text-sm text-slate-800 dark:text-white">All Stock Levels Optimal</p>
              <p className="text-xs text-slate-400">No medicines are currently below their minimum safety threshold.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 dark:bg-slate-900/60 dark:text-slate-300 border-b border-slate-200 font-bold">
                    <tr>
                      <th className="py-3 px-4">Medicine & Form</th>
                      <th className="py-3 px-4">Packaging Unit</th>
                      <th className="py-3 px-4 text-center">Current Stock</th>
                      <th className="py-3 px-4 text-center">Min Level</th>
                      <th className="py-3 px-4 text-center">Deficit</th>
                      <th className="py-3 px-4 text-center">Suggested Order</th>
                      <th className="py-3 px-4">Preferred Supplier</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-border text-slate-800 dark:text-slate-200">
                    {lowStockItems.map((item) => (
                      <tr key={item.medicine_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                        <td className="py-3 px-4 font-bold">
                          {item.brand_name}
                          <div className="text-[11px] font-normal text-slate-400">{item.generic_name}</div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">
                          1 Pack = {item.strip_size * item.pack_size} {item.base_unit}s
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="rounded-md bg-rose-50 px-2 py-0.5 font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                            {item.current_stock_units} {item.base_unit}s
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                          {item.min_reorder_level} {item.base_unit}s
                        </td>
                        <td className="py-3 px-4 text-center font-black text-rose-600">
                          -{item.deficit_units}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-600">
                          {item.suggested_packs} Packs
                        </td>
                        <td className="py-3 px-4 font-semibold">
                          {item.preferred_supplier?.supplier_name || "Any Supplier"}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              handle1ClickPoForSupplier(item.preferred_supplier?.id || 0, [item])
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-primary/90"
                          >
                            <ShoppingCart className="h-3 w-3" />
                            1-Click PO
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CREATE PURCHASE ORDER MODAL */}
      {isCreatePoModalOpen && (
        <CreatePurchaseOrderModal
          prefilledSupplierId={prefilledSupplierId}
          prefilledItems={prefilledItems}
          onClose={() => setIsCreatePoModalOpen(false)}
          onSuccess={() => {
            setIsCreatePoModalOpen(false)
            refetch()
            refetchLowStock()
          }}
        />
      )}

      {/* VIEW & PRINT PO MODAL */}
      {viewPo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-border dark:bg-card">
            <div className="flex items-center justify-between border-b pb-4 print:hidden">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Purchase Order Details: {viewPo.po_number}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintPo}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-primary/90"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print Official PO
                </button>
                <button
                  type="button"
                  onClick={() => setViewPo(null)}
                  className="rounded-xl p-1 text-slate-400 hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Official Printable PO Layout */}
            <div className="mt-4 p-4 text-slate-900 dark:text-white">
              <div className="border-b pb-4 text-center">
                <h2 className="text-xl font-black uppercase tracking-wider">Hospital Pharmacy Purchase Order</h2>
                <p className="text-xs text-slate-500">Official Distributor Procurement Requisition</p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="font-bold text-slate-500">PO Number:</div>
                  <div className="font-mono font-black text-primary text-sm">{viewPo.po_number}</div>
                  <div className="mt-2 font-bold text-slate-500">PO Date:</div>
                  <div className="font-bold">{viewPo.po_date}</div>
                </div>

                <div>
                  <div className="font-bold text-slate-500">Vendor / Supplier:</div>
                  <div className="font-black text-sm">{viewPo.supplier?.supplier_name}</div>
                  <div className="text-slate-500">GSTIN: {viewPo.supplier?.gstin || "N/A"}</div>
                  <div className="text-slate-500">Phone: {viewPo.supplier?.phone || "N/A"}</div>
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 font-bold dark:bg-slate-800">
                    <tr>
                      <th className="p-2">Item Description</th>
                      <th className="p-2 text-center">Pack Qty</th>
                      <th className="p-2 text-right">Pack Rate (₹)</th>
                      <th className="p-2 text-right">Taxable (₹)</th>
                      <th className="p-2 text-right">GST %</th>
                      <th className="p-2 text-right">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-border">
                    {viewPo.items.map((it) => (
                      <tr key={it.id}>
                        <td className="p-2 font-bold">
                          {it.medicine?.brand_name}
                          <div className="text-[10px] text-slate-400">
                            Pack: {it.strip_size * it.pack_size} units
                          </div>
                        </td>
                        <td className="p-2 text-center font-bold">{it.pack_quantity}</td>
                        <td className="p-2 text-right">{it.pack_purchase_rate.toFixed(2)}</td>
                        <td className="p-2 text-right">{it.taxable_amount.toFixed(2)}</td>
                        <td className="p-2 text-right">{it.gst_rate}%</td>
                        <td className="p-2 text-right font-black">₹{it.total_amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t font-black bg-slate-50 dark:bg-slate-900">
                    <tr>
                      <td colSpan={5} className="p-2 text-right">
                        Net Purchase Total:
                      </td>
                      <td className="p-2 text-right text-primary text-sm">
                        ₹{viewPo.net_amount.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="mt-12 grid grid-cols-2 gap-8 text-center text-xs print:grid">
                <div className="border-t border-slate-400 pt-2">
                  <span className="font-bold">Prepared By:</span> {viewPo.createdBy?.name || "Pharmacist"}
                </div>
                <div className="border-t border-slate-400 pt-2 font-bold">
                  Authorized Pharmacy Manager Signatory
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Subcomponent: Create Purchase Order Modal
const CreatePurchaseOrderModal: React.FC<{
  prefilledSupplierId?: number
  prefilledItems?: any[]
  onClose: () => void
  onSuccess: () => void
}> = ({ prefilledSupplierId, prefilledItems, onClose, onSuccess }) => {
  const [supplierId, setSupplierId] = useState<number | undefined>(prefilledSupplierId)
  const [poDate, setPoDate] = useState<string>(() => new Date().toISOString().split("T")[0])
  const [expectedDate, setExpectedDate] = useState<string>("")
  const [notes, setNotes] = useState("")

  const [items, setItems] = useState<any[]>(prefilledItems || [])
  const [medSearch, setMedSearch] = useState("")

  const { data: suppliersData } = useSuppliers()
  const suppliers: PharmacySupplier[] = (suppliersData as any)?.data || []

  const { data: formularyData } = useFormulary({ search: medSearch, per_page: 10 })
  const searchResults: HospitalMedicine[] = formularyData?.data || []

  const createPoMutation = useCreatePurchaseOrderMutation()

  const handleAddMedicine = (med: HospitalMedicine) => {
    if (items.some((it) => it.hospital_medicine_id === med.id)) return
    const stripSize = med.strip_size || 1
    const packSize = med.pack_size || 1
    const packRate = med.default_purchase_price * stripSize * packSize

    setItems((prev) => [
      ...prev,
      {
        hospital_medicine_id: med.id,
        name: med.brand_name,
        pack_quantity: 1,
        strip_size: stripSize,
        pack_size: packSize,
        pack_purchase_rate: packRate,
        discount_percent: 0,
        gst_rate: med.gst_rate || 12,
      },
    ])
    setMedSearch("")
  }

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  // Calculate live PO summary
  const subtotal = items.reduce((sum, it) => sum + (it.pack_quantity * it.pack_purchase_rate), 0)
  const totalTaxable = items.reduce((sum, it) => {
    const lineTotal = it.pack_quantity * it.pack_purchase_rate
    const lineDisc = (lineTotal * (it.discount_percent || 0)) / 100
    return sum + (lineTotal - lineDisc)
  }, 0)
  const totalTax = items.reduce((sum, it) => {
    const lineTotal = it.pack_quantity * it.pack_purchase_rate
    const lineDisc = (lineTotal * (it.discount_percent || 0)) / 100
    const taxable = lineTotal - lineDisc
    return sum + ((taxable * (it.gst_rate || 12)) / 100)
  }, 0)
  const netTotal = totalTaxable + totalTax

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supplierId || items.length === 0) return

    await createPoMutation.mutateAsync({
      supplier_id: supplierId,
      po_date: poDate,
      expected_delivery_date: expectedDate || undefined,
      notes,
      items,
    })
    onSuccess()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-border dark:bg-card">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Generate Vendor Purchase Order (PO)
            </h3>
            <p className="text-xs text-slate-500">
              Procurement order with automated pack/strip unit calculation and tax forecasting
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-1 text-slate-400 hover:bg-slate-100">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Select Supplier:</label>
              <select
                value={supplierId || ""}
                onChange={(e) => setSupplierId(parseInt(e.target.value))}
                required
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold outline-none focus:border-primary dark:border-border dark:bg-card"
              >
                <option value="">-- Choose Vendor / Stockist --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.supplier_name} {s.gstin ? `(${s.gstin})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">PO Date:</label>
              <input
                type="date"
                value={poDate}
                onChange={(e) => setPoDate(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs font-bold outline-none dark:border-border dark:bg-card"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Expected Delivery:</label>
              <input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs font-semibold outline-none dark:border-border dark:bg-card"
              />
            </div>
          </div>

          {/* Medicine Search */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Search & Add Medicines to PO:
            </label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={medSearch}
                onChange={(e) => setMedSearch(e.target.value)}
                placeholder="Search brand or salt to order..."
                className="w-full rounded-xl border border-slate-200 py-2 pl-8 pr-3 text-xs outline-none focus:border-primary dark:border-border dark:bg-card"
              />
            </div>

            {medSearch.trim().length >= 2 && searchResults.length > 0 && (
              <div className="mt-1 max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-border dark:bg-card">
                {searchResults.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => handleAddMedicine(m)}
                    className="flex cursor-pointer items-center justify-between p-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <div>
                      <span className="font-bold">{m.brand_name}</span>
                      <span className="ml-2 text-slate-400 text-[11px]">{m.generic_name}</span>
                    </div>
                    <span className="font-bold text-slate-600">Rate: ₹{m.default_purchase_price}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Items Table */}
          {items.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 font-bold text-slate-600">
                  <tr>
                    <th className="p-2.5">Medicine</th>
                    <th className="p-2.5 text-center">Pack Qty</th>
                    <th className="p-2.5 text-right">Pack Rate (₹)</th>
                    <th className="p-2.5 text-right">Disc %</th>
                    <th className="p-2.5 text-right">GST %</th>
                    <th className="p-2.5 text-right">Line Total</th>
                    <th className="p-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-border">
                  {items.map((it, idx) => {
                    const lineTotal = it.pack_quantity * it.pack_purchase_rate
                    const lineDisc = (lineTotal * (it.discount_percent || 0)) / 100
                    const taxable = lineTotal - lineDisc
                    const tax = (taxable * (it.gst_rate || 12)) / 100
                    const netLine = taxable + tax

                    return (
                      <tr key={it.hospital_medicine_id}>
                        <td className="p-2.5 font-bold">
                          {it.name}
                          <div className="text-[10px] text-slate-400">
                            1 Pack = {it.strip_size * it.pack_size} units
                          </div>
                        </td>
                        <td className="p-2.5 text-center">
                          <input
                            type="number"
                            min={1}
                            value={it.pack_quantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 1
                              setItems((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, pack_quantity: val } : item))
                              )
                            }}
                            className="w-16 rounded-lg border text-center font-bold p-1 text-xs"
                          />
                        </td>
                        <td className="p-2.5 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={it.pack_purchase_rate}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0
                              setItems((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, pack_purchase_rate: val } : item))
                              )
                            }}
                            className="w-20 rounded-lg border text-right font-bold p-1 text-xs"
                          />
                        </td>
                        <td className="p-2.5 text-right">
                          <input
                            type="number"
                            value={it.discount_percent}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0
                              setItems((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, discount_percent: val } : item))
                              )
                            }}
                            className="w-14 rounded-lg border text-right p-1 text-xs"
                          />
                        </td>
                        <td className="p-2.5 text-right font-semibold">{it.gst_rate}%</td>
                        <td className="p-2.5 text-right font-black">₹{netLine.toFixed(2)}</td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-rose-500 hover:text-rose-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Financial Summary */}
          <div className="flex justify-end">
            <div className="w-64 space-y-1.5 rounded-2xl bg-slate-50 p-4 text-xs font-semibold dark:bg-slate-900/40">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Taxable Amount:</span>
                <span>₹{totalTaxable.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Estimated GST:</span>
                <span>₹{totalTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-1.5 font-black text-sm text-slate-900 dark:text-white">
                <span>Net PO Value:</span>
                <span className="text-primary">₹{netTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Notes / Terms:</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Delivery required within 48 hours to pharmacy store"
              className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs outline-none dark:border-border dark:bg-card"
            />
          </div>

          <div className="mt-5 flex items-center justify-end gap-3 border-t pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createPoMutation.isPending || !supplierId || items.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-primary/90 disabled:opacity-50"
            >
              {createPoMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Save & Issue Purchase Order
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
