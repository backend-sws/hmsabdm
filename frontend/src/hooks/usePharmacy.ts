import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { pharmacyService } from "@/services/pharmacyService"
import { toast } from "sonner"

export const PHARMACY_QUERY_KEYS = {
  stats: ["pharmacy", "stats"] as const,
  formulary: (params?: any) => ["pharmacy", "formulary", params] as const,
  masterSearch: (query: string) => ["pharmacy", "master-search", query] as const,
  suppliers: (params?: any) => ["pharmacy", "suppliers", params] as const,
  supplierLedger: (id: number) => ["pharmacy", "suppliers", "ledger", id] as const,
  supplierPayments: (params?: any) => ["pharmacy", "supplier-payments", params] as const,
  purchases: (params?: any) => ["pharmacy", "purchases", params] as const,
  purchase: (id: number) => ["pharmacy", "purchase", id] as const,
  batches: (params?: any) => ["pharmacy", "batches", params] as const,
  nearExpiry: (days?: number) => ["pharmacy", "near-expiry", days] as const,
  medicineBatches: (id: number) => ["pharmacy", "batches", "medicine", id] as const,
  prescriptions: (params?: any) => ["pharmacy", "prescriptions", params] as const,
  rxDispense: (id: number) => ["pharmacy", "prescription-dispense", id] as const,
  sales: (params?: any) => ["pharmacy", "sales", params] as const,
  sale: (id: number) => ["pharmacy", "sale", id] as const,
  returns: (params?: any) => ["pharmacy", "returns", params] as const,
  returnDetails: (id: number) => ["pharmacy", "return", id] as const,
  transactions: (params?: any) => ["pharmacy", "transactions", params] as const,
  expiryDashboard: ["pharmacy", "expiry-dashboard"] as const,
  supplierReturns: (params?: any) => ["pharmacy", "supplier-returns", params] as const,
  supplierReturn: (id: number) => ["pharmacy", "supplier-return", id] as const,
  substitutes: (params?: any) => ["pharmacy", "substitutes", params] as const,
  patientMedicationHistory: (patientId?: number) => ["pharmacy", "patient-history", patientId] as const,
  cdscoRegister: (params?: any) => ["pharmacy", "cdsco-register", params] as const,
  gstReport: (params?: any) => ["pharmacy", "gst-report", params] as const,
  wardIndents: (params?: any) => ["pharmacy", "ward-indents", params] as const,
  wardIndent: (id: number) => ["pharmacy", "ward-indent", id] as const,
  lowStockAlerts: ["pharmacy", "low-stock-alerts"] as const,
  purchaseOrders: (params?: any) => ["pharmacy", "purchase-orders", params] as const,
  purchaseOrder: (id: number) => ["pharmacy", "purchase-order", id] as const,
}

// Queries
export function usePharmacyDashboardStats() {
  return useQuery({
    queryKey: PHARMACY_QUERY_KEYS.stats,
    queryFn: () => pharmacyService.getDashboardStats(),
    staleTime: 30 * 1000,
  })
}

export function useFormulary(params?: Record<string, any>) {
  return useQuery({
    queryKey: PHARMACY_QUERY_KEYS.formulary(params),
    queryFn: () => pharmacyService.getFormulary(params),
  })
}

export function useSearchMasterMedicines(query: string) {
  return useQuery({
    queryKey: PHARMACY_QUERY_KEYS.masterSearch(query),
    queryFn: () => pharmacyService.searchMasterMedicines(query),
    enabled: query.trim().length >= 2,
    staleTime: 5 * 60 * 1000,
  })
}

export function useSuppliers(params?: Record<string, any>) {
  return useQuery({
    queryKey: PHARMACY_QUERY_KEYS.suppliers(params),
    queryFn: () => pharmacyService.getSuppliers(params),
  })
}

export function useSupplierLedger(supplierId: number) {
  return useQuery({
    queryKey: PHARMACY_QUERY_KEYS.supplierLedger(supplierId),
    queryFn: () => pharmacyService.getSupplierLedger(supplierId),
    enabled: supplierId > 0,
  })
}

export function useSupplierPayments(params?: Record<string, any>) {
  return useQuery({
    queryKey: PHARMACY_QUERY_KEYS.supplierPayments(params),
    queryFn: () => pharmacyService.getSupplierPayments(params),
  })
}

export function usePurchases(params?: Record<string, any>) {
  return useQuery({
    queryKey: PHARMACY_QUERY_KEYS.purchases(params),
    queryFn: () => pharmacyService.getPurchases(params),
  })
}

export function usePurchase(id: number) {
  return useQuery({
    queryKey: PHARMACY_QUERY_KEYS.purchase(id),
    queryFn: () => pharmacyService.getPurchase(id),
    enabled: id > 0,
  })
}

export function useBatchStock(params?: Record<string, any>) {
  return useQuery({
    queryKey: PHARMACY_QUERY_KEYS.batches(params),
    queryFn: () => pharmacyService.getBatchStock(params),
  })
}

export function useNearExpiryBatches(days = 90) {
  return useQuery({
    queryKey: PHARMACY_QUERY_KEYS.nearExpiry(days),
    queryFn: () => pharmacyService.getNearExpiryBatches(days),
  })
}

export function useMedicineBatches(medicineId: number) {
  return useQuery({
    queryKey: PHARMACY_QUERY_KEYS.medicineBatches(medicineId),
    queryFn: () => pharmacyService.getBatchesForMedicine(medicineId),
    enabled: medicineId > 0,
  })
}

export function usePendingPrescriptions(params?: Record<string, any>) {
  return useQuery({
    queryKey: PHARMACY_QUERY_KEYS.prescriptions(params),
    queryFn: () => pharmacyService.getPendingPrescriptions(params),
    refetchInterval: 15 * 1000, // Poll every 15s for new prescriptions
  })
}

export function usePrescriptionDispenseDetails(prescriptionId: number) {
  return useQuery({
    queryKey: PHARMACY_QUERY_KEYS.rxDispense(prescriptionId),
    queryFn: () => pharmacyService.getPrescriptionDispenseDetails(prescriptionId),
    enabled: prescriptionId > 0,
  })
}

export function useSales(params?: Record<string, any>) {
  return useQuery({
    queryKey: PHARMACY_QUERY_KEYS.sales(params),
    queryFn: () => pharmacyService.getSales(params),
  })
}

export function useSale(id: number) {
  return useQuery({
    queryKey: PHARMACY_QUERY_KEYS.sale(id),
    queryFn: () => pharmacyService.getSale(id),
    enabled: id > 0,
  })
}

export function useReturns(params?: Record<string, any>) {
  return useQuery({
    queryKey: PHARMACY_QUERY_KEYS.returns(params),
    queryFn: () => pharmacyService.getReturns(params),
  })
}

export function useReturnDetails(id: number) {
  return useQuery({
    queryKey: PHARMACY_QUERY_KEYS.returnDetails(id),
    queryFn: () => pharmacyService.getReturn(id),
    enabled: id > 0,
  })
}

export function useStockTransactions(params?: Record<string, any>) {
  return useQuery({
    queryKey: PHARMACY_QUERY_KEYS.transactions(params),
    queryFn: () => pharmacyService.getStockTransactions(params),
  })
}

// Mutations
export function useImportMedicineMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: any) => pharmacyService.importFromMaster(payload),
    onSuccess: (data) => {
      toast.success(`Medicine "${data.brand_name}" imported into hospital catalog!`)
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "formulary"] })
      queryClient.invalidateQueries({ queryKey: PHARMACY_QUERY_KEYS.stats })
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to import medicine")
    },
  })
}

export function useCreateCustomMedicineMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: any) => pharmacyService.createCustomMedicine(payload),
    onSuccess: (data) => {
      toast.success(`Custom medicine "${data.brand_name}" created successfully!`)
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "formulary"] })
      queryClient.invalidateQueries({ queryKey: PHARMACY_QUERY_KEYS.stats })
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to create custom medicine")
    },
  })
}

export function useUpdateMedicineMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => pharmacyService.updateMedicine(id, payload),
    onSuccess: () => {
      toast.success("Medicine catalog updated successfully!")
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "formulary"] })
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update medicine")
    },
  })
}

export function useCreateSupplierMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: any) => pharmacyService.createSupplier(payload),
    onSuccess: (data) => {
      toast.success(`Supplier "${data.supplier_name}" added successfully!`)
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "suppliers"] })
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to add supplier")
    },
  })
}

export function useUpdateSupplierMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => pharmacyService.updateSupplier(id, payload),
    onSuccess: (data) => {
      toast.success(`Supplier "${data.supplier_name}" updated!`)
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "suppliers"] })
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update supplier")
    },
  })
}

export function useRecordSupplierPaymentMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ supplierId, payload }: { supplierId: number; payload: any }) =>
      pharmacyService.recordSupplierPayment(supplierId, payload),
    onSuccess: (data) => {
      toast.success(`Payment voucher "${data.payment_number}" recorded!`)
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "suppliers"] })
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "purchases"] })
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "supplier-payments"] })
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to record payment voucher")
    },
  })
}

export function useCreatePurchaseMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: any) => pharmacyService.createPurchase(payload),
    onSuccess: (data) => {
      toast.success(`Purchase GRN "${data.grn_number}" recorded and batches added to inventory!`)
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "purchases"] })
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "batches"] })
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "formulary"] })
      queryClient.invalidateQueries({ queryKey: PHARMACY_QUERY_KEYS.stats })
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to record purchase GRN")
    },
  })
}

export function useAdjustBatchStockMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ batchId, payload }: { batchId: number; payload: { adjustment_quantity: number; reason: string } }) =>
      pharmacyService.adjustBatchStock(batchId, payload),
    onSuccess: () => {
      toast.success("Batch stock adjusted successfully!")
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "batches"] })
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "formulary"] })
      queryClient.invalidateQueries({ queryKey: PHARMACY_QUERY_KEYS.stats })
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to adjust stock")
    },
  })
}

export function useProcessSaleMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: any) => pharmacyService.processSale(payload),
    onSuccess: (data) => {
      toast.success(`Invoice "${data.invoice_number}" generated! Net Amount: ₹${data.net_amount}`)
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "sales"] })
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "batches"] })
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "formulary"] })
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "prescriptions"] })
      queryClient.invalidateQueries({ queryKey: PHARMACY_QUERY_KEYS.stats })
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to complete POS checkout")
    },
  })
}

export function useProcessReturnMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: any) => pharmacyService.processReturn(payload),
    onSuccess: (data) => {
      toast.success(`Credit Note "${data.credit_note_number}" generated! Refund: ₹${data.refund_amount}`)
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "returns"] })
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "sales"] })
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "batches"] })
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "formulary"] })
      queryClient.invalidateQueries({ queryKey: PHARMACY_QUERY_KEYS.stats })
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to process customer return")
    },
  })
}

export function useExpiryDashboard() {
  return useQuery({
    queryKey: PHARMACY_QUERY_KEYS.expiryDashboard,
    queryFn: () => pharmacyService.getExpiryDashboard(),
    staleTime: 60 * 1000,
  })
}

export function useQuarantineBatchMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (batchId: number) => pharmacyService.quarantineBatch(batchId),
    onSuccess: (data) => {
      toast.success(`Batch ${data.batch_number} moved to Quarantine Zone!`)
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "batches"] })
      queryClient.invalidateQueries({ queryKey: PHARMACY_QUERY_KEYS.expiryDashboard })
      queryClient.invalidateQueries({ queryKey: PHARMACY_QUERY_KEYS.stats })
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to quarantine batch")
    },
  })
}

export function useSupplierReturns(params?: Record<string, any>) {
  return useQuery({
    queryKey: PHARMACY_QUERY_KEYS.supplierReturns(params),
    queryFn: () => pharmacyService.getSupplierReturns(params),
  })
}

export function useCreateSupplierReturnMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: any) => pharmacyService.createSupplierReturn(payload),
    onSuccess: (data) => {
      toast.success(`RTV Challan "${data.rtv_number}" generated! Total: ₹${data.total_return_value}`)
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "supplier-returns"] })
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "batches"] })
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "suppliers"] })
      queryClient.invalidateQueries({ queryKey: PHARMACY_QUERY_KEYS.expiryDashboard })
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to create Supplier Return (RTV)")
    },
  })
}

export function useUpdateSupplierReturnStatusMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) =>
      pharmacyService.updateSupplierReturnStatus(id, payload),
    onSuccess: (data) => {
      toast.success(`RTV "${data.rtv_number}" updated to ${data.status}!`)
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "supplier-returns"] })
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "suppliers"] })
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update supplier return status")
    },
  })
}

export function useGenericSubstitutes(
  params?: { medicine_id?: number; generic_name?: string; search?: string },
  enabled = true
) {
  const hasParam = Boolean(params?.medicine_id || params?.generic_name || params?.search)
  return useQuery({
    queryKey: PHARMACY_QUERY_KEYS.substitutes(params),
    queryFn: () => pharmacyService.getSubstitutes(params),
    enabled: enabled && hasParam,
    staleTime: 30 * 1000,
  })
}

export function usePatientMedicationHistory(patientId?: number, enabled = true) {
  return useQuery({
    queryKey: PHARMACY_QUERY_KEYS.patientMedicationHistory(patientId),
    queryFn: () => pharmacyService.getPatientMedicationHistory(patientId!),
    enabled: enabled && Boolean(patientId && patientId > 0),
    staleTime: 60 * 1000,
  })
}

export function useCdscoRegister(params?: {
  schedule_type?: string
  start_date?: string
  end_date?: string
  search?: string
  per_page?: number
  all?: boolean
}) {
  return useQuery({
    queryKey: PHARMACY_QUERY_KEYS.cdscoRegister(params),
    queryFn: () => pharmacyService.getCdscoRegister(params),
    staleTime: 15 * 1000,
  })
}

export function useGstReport(params?: {
  start_date?: string
  end_date?: string
  period?: string
}) {
  return useQuery({
    queryKey: PHARMACY_QUERY_KEYS.gstReport(params),
    queryFn: () => pharmacyService.getGstReport(params),
    staleTime: 30 * 1000,
  })
}

// IPD Ward Indents Hooks
export function useWardIndents(params?: Record<string, any>) {
  return useQuery({
    queryKey: PHARMACY_QUERY_KEYS.wardIndents(params),
    queryFn: () => pharmacyService.getWardIndents(params),
    staleTime: 10 * 1000,
  })
}

export function useWardIndent(id: number) {
  return useQuery({
    queryKey: PHARMACY_QUERY_KEYS.wardIndent(id),
    queryFn: () => pharmacyService.getWardIndent(id),
    enabled: Boolean(id && id > 0),
  })
}

export function useCreateWardIndentMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: any) => pharmacyService.createWardIndent(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "ward-indents"] })
      toast.success("Ward indent created successfully")
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to create ward indent")
    },
  })
}

export function useDispenseWardIndentMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload?: any }) =>
      pharmacyService.dispenseWardIndent(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "ward-indents"] })
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "batches"] })
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "stats"] })
      toast.success("Ward indent dispensed & charged to IPD ledger")
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to dispense ward indent")
    },
  })
}

export function useRejectWardIndentMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      pharmacyService.rejectWardIndent(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "ward-indents"] })
      toast.success("Ward indent marked as rejected")
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to reject ward indent")
    },
  })
}

export function useReturnWardIndentItemMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ indentId, itemId, returnQuantity }: { indentId: number; itemId: number; returnQuantity: number }) =>
      pharmacyService.returnWardIndentItem(indentId, itemId, returnQuantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "ward-indents"] })
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "batches"] })
      toast.success("Ward item returned & IPD ledger updated")
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to return ward item")
    },
  })
}

// Low Stock & Purchase Orders Hooks
export function useLowStockAlerts() {
  return useQuery({
    queryKey: PHARMACY_QUERY_KEYS.lowStockAlerts,
    queryFn: () => pharmacyService.getLowStockAlerts(),
    staleTime: 30 * 1000,
  })
}

export function usePurchaseOrders(params?: Record<string, any>) {
  return useQuery({
    queryKey: PHARMACY_QUERY_KEYS.purchaseOrders(params),
    queryFn: () => pharmacyService.getPurchaseOrders(params),
    staleTime: 15 * 1000,
  })
}

export function usePurchaseOrder(id: number) {
  return useQuery({
    queryKey: PHARMACY_QUERY_KEYS.purchaseOrder(id),
    queryFn: () => pharmacyService.getPurchaseOrder(id),
    enabled: Boolean(id && id > 0),
  })
}

export function useCreatePurchaseOrderMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: any) => pharmacyService.createPurchaseOrder(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "purchase-orders"] })
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "low-stock-alerts"] })
      toast.success("Purchase order generated successfully")
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to generate purchase order")
    },
  })
}

export function useUpdatePurchaseOrderStatusMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      pharmacyService.updatePurchaseOrderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "purchase-orders"] })
      toast.success("Purchase order status updated")
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update purchase order status")
    },
  })
}




