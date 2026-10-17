import { apiClient } from "./apiClient"
import type {
  ChargeCategory,
  ChargeItem,
  BillingLedgerItem,
  PatientLedgerSummary,
  BedBillingConfig,
  Invoice,
  CreateChargePayload,
  UpdateChargePayload,
  CreateCategoryPayload,
  PostLedgerPayload,
} from "@/types/billing"

export const billingService = {
  // ─── 1. Categories ──────────────────────────────────────────────────
  async getCategories(): Promise<ChargeCategory[]> {
    return apiClient<ChargeCategory[]>("/billing/charges/categories")
  },

  async createCategory(payload: CreateCategoryPayload): Promise<ChargeCategory> {
    return apiClient<ChargeCategory>("/billing/charges/categories", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  // ─── 2. Charges Master / Tariff ─────────────────────────────────────
  async getCharges(params?: {
    category?: string
    category_id?: number
    billing_type?: string
    ward_id?: number
    search?: string
    all?: boolean
  }): Promise<ChargeItem[]> {
    const query = new URLSearchParams()
    if (params) {
      if (params.category) query.set("category", params.category)
      if (params.category_id) query.set("category_id", String(params.category_id))
      if (params.billing_type) query.set("billing_type", params.billing_type)
      if (params.ward_id) query.set("ward_id", String(params.ward_id))
      if (params.search) query.set("search", params.search)
      if (params.all !== undefined) query.set("all", String(params.all))
    }
    const queryString = query.toString() ? `?${query.toString()}` : ""
    return apiClient<ChargeItem[]>(`/billing/charges${queryString}`)
  },

  async createCharge(payload: CreateChargePayload): Promise<ChargeItem> {
    return apiClient<ChargeItem>("/billing/charges", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  async updateCharge(id: number, payload: UpdateChargePayload): Promise<ChargeItem> {
    return apiClient<ChargeItem>(`/billing/charges/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })
  },

  async deleteCharge(id: number): Promise<void> {
    return apiClient<void>(`/billing/charges/${id}`, {
      method: "DELETE",
    })
  },

  async triggerBedCharges(): Promise<any> {
    return apiClient<any>("/billing/charges/apply-bed-charges", {
      method: "POST",
    })
  },

  // ─── 3. Patient Running Ledger ──────────────────────────────────────
  async postLedgerCharge(payload: PostLedgerPayload): Promise<BillingLedgerItem> {
    return apiClient<BillingLedgerItem>("/billing/ledger/charge", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  async getPatientLedger(
    patientId: number,
    params?: {
      encounter_type?: string
      encounter_id?: number
      status?: string
    }
  ): Promise<PatientLedgerSummary> {
    const query = new URLSearchParams()
    if (params) {
      if (params.encounter_type) query.set("encounter_type", params.encounter_type)
      if (params.encounter_id) query.set("encounter_id", String(params.encounter_id))
      if (params.status) query.set("status", params.status)
    }
    const queryString = query.toString() ? `?${query.toString()}` : ""
    return apiClient<PatientLedgerSummary>(`/billing/ledger/patient/${patientId}${queryString}`)
  },

  async cancelLedgerItem(id: number, reason: string): Promise<BillingLedgerItem> {
    return apiClient<BillingLedgerItem>(`/billing/ledger/${id}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    })
  },

  // ─── 4. Bed Billing Rules ───────────────────────────────────────────
  async getBedBillingConfig(): Promise<BedBillingConfig> {
    return apiClient<BedBillingConfig>("/hospital/settings/bed-billing")
  },

  async updateBedBillingConfig(payload: Partial<BedBillingConfig>): Promise<BedBillingConfig> {
    return apiClient<BedBillingConfig>("/hospital/settings/bed-billing", {
      method: "PUT",
      body: JSON.stringify(payload),
    })
  },

  // ─── 5. Invoices ────────────────────────────────────────────────────
  async getInvoice(id: number): Promise<{ invoice: Invoice; category_breakdown: Array<{ category: string; count: number; total_amount: number }> }> {
    return apiClient<{ invoice: Invoice; category_breakdown: Array<{ category: string; count: number; total_amount: number }> }>(`/invoices/${id}`)
  },

  async getPatientInvoices(patientId: number): Promise<Invoice[]> {
    return apiClient<Invoice[]>(`/invoices/patient/${patientId}`)
  },

  // ─── 6. OPD Quick Billing Counter ────────────────────────────────────
  async getOpdPendingOrders(params?: {
    search?: string
    date?: string
    status?: "all" | "pending" | "billed"
  }): Promise<import("@/types/billing").OpdPendingOrder[]> {
    const query = new URLSearchParams()
    if (params?.search) query.set("search", params.search)
    if (params?.date) query.set("date", params.date)
    if (params?.status) query.set("status", params.status)
    const queryString = query.toString() ? `?${query.toString()}` : ""
    const res = await apiClient<any>(`/billing/opd-pending-orders${queryString}`)
    return Array.isArray(res) ? res : res?.data || []
  },

  async createOpdBill(payload: import("@/types/billing").CreateOpdBillPayload): Promise<import("@/types/billing").OpdReceiptData> {
    const res = await apiClient<any>("/billing/opd-bill", {
      method: "POST",
      body: JSON.stringify(payload),
    })
    return res?.data || res
  },

  async getOpdReferrals(): Promise<import("@/types/billing").OpdAdmissionReferral[]> {
    const res = await apiClient<any>("/ipd/opd-referrals")
    return Array.isArray(res) ? res : res?.data || []
  },

  // ─── 7. Global Invoices Register & Audit ──────────────────────────────
  async getInvoices(params?: import("@/types/billing").InvoiceFilterParams): Promise<import("@/types/billing").InvoicesResponse> {
    const query = new URLSearchParams()
    if (params) {
      if (params.search) query.set("search", params.search)
      if (params.payment_status && params.payment_status !== "all") query.set("payment_status", params.payment_status)
      if (params.encounter_type && params.encounter_type !== "all") query.set("encounter_type", params.encounter_type)
      if (params.date_from) query.set("date_from", params.date_from)
      if (params.date_to) query.set("date_to", params.date_to)
      if (params.page) query.set("page", String(params.page))
      if (params.per_page) query.set("per_page", String(params.per_page))
    }
    const queryString = query.toString() ? `?${query.toString()}` : ""
    return apiClient<import("@/types/billing").InvoicesResponse>(`/invoices${queryString}`)
  },

  // ─── 8. Cashier Day-End Closing & Shift Handover ──────────────────────
  async getDayEndSummary(params?: { date?: string; user_id?: number }): Promise<import("@/types/billing").DayEndSummaryData> {
    const query = new URLSearchParams()
    if (params?.date) query.set("date", params.date)
    if (params?.user_id) query.set("user_id", String(params.user_id))
    const queryString = query.toString() ? `?${query.toString()}` : ""
    return apiClient<import("@/types/billing").DayEndSummaryData>(`/billing/day-end-summary${queryString}`)
  },

  // ─── 9. Central Advance Deposit Collection ───────────────────────────
  async collectDeposit(payload: import("@/types/billing").AdvanceDepositPayload): Promise<import("@/types/billing").AdvanceDepositReceiptData> {
    return apiClient<import("@/types/billing").AdvanceDepositReceiptData>("/billing/deposits", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  // ─── 10. Pending Inpatient Discharge Settlement Queue ────────────────
  async getPendingDischarges(params?: { search?: string; ward_id?: number }): Promise<import("@/types/billing").PendingDischargeItem[]> {
    const query = new URLSearchParams()
    if (params?.search) query.set("search", params.search)
    if (params?.ward_id) query.set("ward_id", String(params.ward_id))
    const queryString = query.toString() ? `?${query.toString()}` : ""
    return apiClient<import("@/types/billing").PendingDischargeItem[]>(`/billing/pending-discharges${queryString}`)
  },

  // ─── 11. Patient Refund / Credit Note ────────────────────────────────
  async issueRefund(payload: import("@/types/billing").RefundPayload): Promise<import("@/types/billing").CreditNoteReceiptData> {
    return apiClient<import("@/types/billing").CreditNoteReceiptData>("/billing/refunds", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },
}

