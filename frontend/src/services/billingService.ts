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
  async getInvoice(id: number): Promise<Invoice> {
    return apiClient<Invoice>(`/invoices/${id}`)
  },

  async getPatientInvoices(patientId: number): Promise<Invoice[]> {
    return apiClient<Invoice[]>(`/invoices/patient/${patientId}`)
  },
}
