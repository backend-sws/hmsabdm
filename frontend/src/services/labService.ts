import { apiClient } from "./apiClient"
import type {
  LabOrder,
  LabOrderItem,
  LabTestTemplate,
  DiagnosticReportPayload,
  DeltaHistoryItem,
  QueueDisplayResponse,
  LabAuditLog,
  LabExternalVendor,
  LabOutsourceManifest,
  LabRateListMatrixItem,
  LabProfitabilityAnalytics,
  LabReconciliationVendorSummary,
} from "@/types/lab"

export const labService = {
  /**
   * Direct Walk-In Lab Booking: Book and bill tests directly at counter
   */
  createDirectBooking: async (payload: {
    patient_id?: number
    walkin_patient?: {
      name: string
      gender: string
      age?: number
      age_unit?: "Years" | "Months" | "Days"
      dob?: string
      mobile?: string
      address?: string
    }
    doctor_id?: number | null
    template_ids: number[]
    urgency?: "Routine" | "Urgent" | "STAT"
    discount_amount?: number
    discount_reason?: string
    payment_method?: "cash" | "upi" | "card" | "net_banking"
  }): Promise<LabOrder> => {
    return apiClient<LabOrder>("/lab/orders/direct-booking", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  /**
   * Update existing Direct Lab Booking / Invoice
   */
  updateDirectBooking: async (
    orderId: number,
    payload: {
      walkin_patient?: {
        name?: string
        gender?: string
        age?: number
        age_unit?: "Years" | "Months" | "Days"
        dob?: string
        mobile?: string
        address?: string
      }
      doctor_id?: number | null
      template_ids?: number[]
      urgency?: "Routine" | "Urgent" | "STAT"
      discount_amount?: number
      discount_reason?: string
      amount_paid?: number
      payment_method?: "cash" | "upi" | "card" | "net_banking"
    }
  ): Promise<LabOrder> => {
    return apiClient<LabOrder>(`/lab/orders/${orderId}/direct-booking`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })
  },

  /**
   * Settle / Collect due balance payment on a lab invoice
   */
  collectPayment: async (
    orderId: number,
    data:
      | {
          amount: number
          payment_method?: string
          transaction_reference?: string
          utr_number?: string
          payment_breakdown?: Array<{ method: string; amount: number; ref?: string }>
          notes?: string
        }
      | number
  ): Promise<LabOrder> => {
    const payload = typeof data === "number" ? { amount: data } : data
    return apiClient<LabOrder>(`/lab/orders/${orderId}/collect-payment`, {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  /**
   * Revoke pathologist authorization to allow modifying results
   */
  revokeAuthorization: async (orderId: number, reason?: string): Promise<LabOrder> => {
    return apiClient<LabOrder>(`/lab/orders/${orderId}/revoke-authorization`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    })
  },

  /**
   * List Lab Invoices & Billing History
   */
  getInvoices: async (params?: {
    search?: string
    payment_status?: string
    order_status?: string
    page?: number
    per_page?: number
  }): Promise<{ data: LabOrder[]; meta?: any } | LabOrder[]> => {
    const q = new URLSearchParams()
    if (params?.search) q.set("search", params.search)
    if (params?.payment_status) q.set("payment_status", params.payment_status)
    if (params?.order_status) q.set("order_status", params.order_status)
    if (params?.page) q.set("page", String(params.page))
    if (params?.per_page) q.set("per_page", String(params.per_page))

    return apiClient<any>(`/lab/invoices?${q.toString()}`)
  },

  /**
   * Phlebotomy: Call token for specific booth
   */
  callToken: async (orderId: number, boothNumber: string = "Booth 1"): Promise<LabOrder> => {
    return apiClient<LabOrder>(`/lab/orders/${orderId}/call-token`, {
      method: "POST",
      body: JSON.stringify({ booth_number: boothNumber }),
    })
  },

  /**
   * Live Queue for TV Display Kiosk
   */
  getQueueDisplay: async (): Promise<QueueDisplayResponse> => {
    return apiClient<QueueDisplayResponse>("/lab/queue/display")
  },

  /**
   * Reject a collected sample with reason & audit note
   */
  rejectSample: async (orderId: number, reason: string, notes?: string): Promise<LabOrder> => {
    return apiClient<LabOrder>(`/lab/orders/${orderId}/reject-sample`, {
      method: "POST",
      body: JSON.stringify({ reason, notes }),
    })
  },

  /**
   * Re-collect rejected sample with priority STAT token
   */
  recollectSample: async (orderId: number): Promise<LabOrder> => {
    return apiClient<LabOrder>(`/lab/orders/${orderId}/recollect-sample`, {
      method: "POST",
    })
  },

  /**
   * Delta Check: Fetch previous authorized results for patient
   */
  getDeltaHistory: async (patientId: number): Promise<DeltaHistoryItem[]> => {
    return apiClient<DeltaHistoryItem[]>(`/lab/patients/${patientId}/delta-history`)
  },

  /**
   * Get live laboratory worklist orders
   */
  getOrders: async (params?: {
    status?: string
    urgency?: string
    order_type?: string
    ipd_admission_id?: number
    patient_id?: number
    is_bedside_collection?: boolean
    search?: string
    date?: string
    page?: number
    per_page?: number
  }): Promise<{ data: LabOrder[]; meta?: any } | LabOrder[]> => {
    const q = new URLSearchParams()
    if (params?.status) q.set("status", params.status)
    if (params?.urgency) q.set("urgency", params.urgency)
    if (params?.order_type) q.set("order_type", params.order_type)
    if (params?.ipd_admission_id) q.set("ipd_admission_id", String(params.ipd_admission_id))
    if (params?.patient_id) q.set("patient_id", String(params.patient_id))
    if (params?.is_bedside_collection !== undefined) q.set("is_bedside_collection", String(params.is_bedside_collection))
    if (params?.search) q.set("search", params.search)
    if (params?.date) q.set("date", params.date)
    if (params?.page) q.set("page", String(params.page))
    if (params?.per_page) q.set("per_page", String(params.per_page))

    const res = await apiClient<any>(`/lab/orders?${q.toString()}`)
    return res
  },

  /**
   * Create Bedside Lab Requisition for an Admitted IPD Patient (with Auto-Billing to IPD Ledger)
   */
  createIpdLabOrder: async (payload: {
    ipd_admission_id: number
    template_ids: number[]
    doctor_id?: number | null
    urgency?: "Routine" | "Urgent" | "STAT"
    is_bedside_collection?: boolean
    clinical_notes?: string
  }): Promise<LabOrder> => {
    return apiClient<LabOrder>("/lab/orders/ipd-requisition", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  /**
   * Sync billed prescription investigations into LabOrders
   */
  syncBilledOrders: async (): Promise<{ synced_count: number }> => {
    return apiClient<{ synced_count: number }>("/lab/orders/sync-billed", {
      method: "POST",
    })
  },

  /**
   * Get single LabOrder with items, parameters, and results
   */
  getOrder: async (id: number): Promise<LabOrder> => {
    return apiClient<LabOrder>(`/lab/orders/${id}`)
  },

  /**
   * Phlebotomy: Mark sample collected & assign accession number
   */
  collectSample: async (id: number, notes?: string): Promise<LabOrder> => {
    return apiClient<LabOrder>(`/lab/orders/${id}/collect-sample`, {
      method: "POST",
      body: JSON.stringify({ notes }),
    })
  },

  /**
   * Record laboratory test results with live formula evaluations
   */
  recordResults: async (
    id: number,
    payload: {
      results: Array<{
        order_item_id: number
        parameter_id?: number | null
        parameter_name?: string
        short_code?: string | null
        unit?: string | null
        method?: string | null
        observed_value: string
        is_calculated?: boolean
        formula?: string | null
      }>
      item_remarks?: Record<number, { technician_remarks?: string; pathologist_remarks?: string; interpretation?: string }>
      technician_remarks?: string
      pathologist_remarks?: string
      clinical_notes?: string
      action?: "draft" | "approve"
      doctor_id?: number | null
      authorization_notes?: string
      approved_item_ids?: number[]
    }
  ): Promise<LabOrder> => {
    return apiClient<LabOrder>(`/lab/orders/${id}/results`, {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  /**
   * Pathologist authorization & sign-off release (full report)
   */
  authorizeOrder: async (
    id: number,
    payload: { notes?: string; clinical_notes?: string }
  ): Promise<LabOrder> => {
    return apiClient<LabOrder>(`/lab/orders/${id}/authorize`, {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  /**
   * Pathologist independent test approval for selected test items
   */
  approveOrderItems: async (
    id: number,
    itemIds: number[],
    notes?: string
  ): Promise<LabOrder> => {
    return apiClient<LabOrder>(`/lab/orders/${id}/approve-items`, {
      method: "POST",
      body: JSON.stringify({ item_ids: itemIds, notes }),
    })
  },

  /**
   * Revoke approval for an individual test item
   */
  revokeOrderItem: async (
    id: number,
    itemId: number,
    reason?: string
  ): Promise<LabOrder> => {
    return apiClient<LabOrder>(`/lab/orders/${id}/items/${itemId}/revoke`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    })
  },

  /**
   * Get complete audit log history for a lab order
   */
  getAuditLogs: async (id: number): Promise<LabAuditLog[]> => {
    return apiClient<LabAuditLog[]>(`/lab/orders/${id}/audit-logs`)
  },

  /**
   * Get complete formatted printable diagnostic report payload (optionally for selected item IDs)
   */
  getDiagnosticReport: async (id: number, itemIds?: number[]): Promise<DiagnosticReportPayload> => {
    const q = itemIds && itemIds.length > 0 ? `?tests=${itemIds.join(",")}` : ""
    return apiClient<DiagnosticReportPayload>(`/lab/orders/${id}/report${q}`)
  },

  /**
   * Get public diagnostic report for QR-code mobile scanning
   */
  getPublicDiagnosticReport: async (id: number, itemIds?: number[]): Promise<DiagnosticReportPayload> => {
    const q = itemIds && itemIds.length > 0 ? `?tests=${itemIds.join(",")}` : ""
    return apiClient<DiagnosticReportPayload>(`/public/lab/report/${id}${q}`)
  },

  // ==========================================
  // 🗂️ TEST TEMPLATES CATALOG (281+ TESTS)
  // ==========================================

  /**
   * Search / list test templates
   */
  getTemplates: async (params?: {
    category?: string
    department_id?: number
    search?: string
    page?: number
    per_page?: number
  }): Promise<{ data: LabTestTemplate[]; meta?: any } | LabTestTemplate[]> => {
    const q = new URLSearchParams()
    if (params?.category) q.set("category", params.category)
    if (params?.department_id) q.set("department_id", String(params.department_id))
    if (params?.search) q.set("search", params.search)
    if (params?.page) q.set("page", String(params.page))
    if (params?.per_page) q.set("per_page", String(params.per_page))

    return apiClient<any>(`/lab/templates?${q.toString()}`)
  },

  /**
   * Get single test template details
   */
  getTemplate: async (id: number): Promise<LabTestTemplate> => {
    return apiClient<LabTestTemplate>(`/lab/templates/${id}`)
  },

  /**
   * Create custom test template with parameters
   */
  createTemplate: async (payload: Partial<LabTestTemplate>): Promise<LabTestTemplate> => {
    return apiClient<LabTestTemplate>("/lab/templates", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  /**
   * Update test template
   */
  updateTemplate: async (id: number, payload: Partial<LabTestTemplate>): Promise<LabTestTemplate> => {
    return apiClient<LabTestTemplate>(`/lab/templates/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })
  },

  /**
   * Deactivate test template
   */
  deleteTemplate: async (id: number): Promise<any> => {
    return apiClient<any>(`/lab/templates/${id}`, {
      method: "DELETE",
    })
  },

  // ─── OUTSOURCE REFERENCE LAB DESK ─────────────────────────────────────────

  getVendors: async (): Promise<LabExternalVendor[]> => {
    return apiClient<LabExternalVendor[]>("/lab/outsource/vendors")
  },

  saveVendor: async (payload: Partial<LabExternalVendor>): Promise<LabExternalVendor> => {
    return apiClient<LabExternalVendor>("/lab/outsource/vendors", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  getPendingDispatch: async (): Promise<LabOrderItem[]> => {
    return apiClient<LabOrderItem[]>("/lab/outsource/pending-dispatch")
  },

  createManifest: async (payload: {
    vendor_id: number
    item_ids: number[]
    temperature_condition?: "ambient" | "cold_chain" | "frozen" | "formalin"
    courier_name?: string
    courier_phone?: string
    courier_tracking_no?: string
    notes?: string
  }): Promise<LabOutsourceManifest> => {
    return apiClient<LabOutsourceManifest>("/lab/outsource/manifests", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  getManifests: async (params?: { page?: number; per_page?: number }): Promise<any> => {
    const q = new URLSearchParams()
    if (params?.page) q.append("page", params.page.toString())
    if (params?.per_page) q.append("per_page", params.per_page.toString())
    return apiClient<any>(`/lab/outsource/manifests?${q.toString()}`)
  },

  getManifestDetails: async (id: number): Promise<LabOutsourceManifest> => {
    return apiClient<LabOutsourceManifest>(`/lab/outsource/manifests/${id}`)
  },

  receiveSample: async (payload: {
    order_item_id: number
    external_accession_no?: string
    external_report_file?: string
    technician_remarks?: string
    status?: "completed" | "authorized"
  }): Promise<LabOrderItem> => {
    return apiClient<LabOrderItem>("/lab/outsource/receive-sample", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  getReconciliation: async (month?: string): Promise<{ month: string; vendors: LabReconciliationVendorSummary[] }> => {
    const q = month ? `?month=${month}` : ""
    return apiClient<{ month: string; vendors: LabReconciliationVendorSummary[] }>(`/lab/outsource/reconciliation${q}`)
  },

  // ─── DIRECT RATE LIST & PRICING MATRIX ───────────────────────────────────

  getRateList: async (params?: { category?: string; fulfillment_type?: string; search?: string }): Promise<{ total_tests: number; tests: LabRateListMatrixItem[] }> => {
    const q = new URLSearchParams()
    if (params?.category) q.append("category", params.category)
    if (params?.fulfillment_type) q.append("fulfillment_type", params.fulfillment_type)
    if (params?.search) q.append("search", params.search)
    return apiClient<{ total_tests: number; tests: LabRateListMatrixItem[] }>(`/lab/rate-list?${q.toString()}`)
  },

  bulkUpdateRateList: async (items: Array<{
    id: number
    standard_price?: number
    b2b_cost?: number
    reagent_cost?: number
    fulfillment_type?: "in_house" | "outsourced" | "hybrid"
    default_vendor_id?: number | null
    tat_hours?: number
    is_active?: boolean
  }>): Promise<any> => {
    return apiClient<any>("/lab/rate-list/bulk-update", {
      method: "PUT",
      body: JSON.stringify({ items }),
    })
  },

  applyPercentage: async (payload: {
    category?: string
    fulfillment_type?: string
    field: "standard_price" | "b2b_cost" | "reagent_cost"
    percentage: number
    round_to?: number
  }): Promise<any> => {
    return apiClient<any>("/lab/rate-list/apply-percentage", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  getProfitabilityAnalytics: async (): Promise<LabProfitabilityAnalytics> => {
    return apiClient<LabProfitabilityAnalytics>("/lab/analytics/profitability")
  },
}
