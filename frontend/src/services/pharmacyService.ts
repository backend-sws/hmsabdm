import { apiClient } from "./apiClient"
import type {
  HospitalMedicine,
  MasterMedicine,
  PharmacySupplier,
  PharmacyPurchase,
  PharmacyBatch,
  PharmacySale,
  PharmacyReturn,
  StockTransaction,
  PharmacyDashboardStats,
  PendingPrescriptionResponse,
  PharmacySupplierPayment,
  PharmacySupplierLedger,
  PharmacySupplierReturn,
  ExpiryDashboardData,
} from "@/types/pharmacy"

export const pharmacyService = {
  // Dashboard KPI
  getDashboardStats: async (): Promise<PharmacyDashboardStats> => {
    return apiClient<PharmacyDashboardStats>("/pharmacy/dashboard-stats")
  },

  // National Master Search
  searchMasterMedicines: async (q: string, limit = 30): Promise<MasterMedicine[]> => {
    return apiClient<MasterMedicine[]>(`/pharmacy/formulary/search-master?q=${encodeURIComponent(q)}&limit=${limit}`)
  },

  // Hospital Formulary Catalog
  getFormulary: async (params?: Record<string, any>): Promise<{ data: HospitalMedicine[]; current_page: number; total: number }> => {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          query.append(key, String(val))
        }
      })
    }
    return apiClient(`/pharmacy/formulary?${query.toString()}`)
  },

  importFromMaster: async (payload: any): Promise<HospitalMedicine> => {
    return apiClient<HospitalMedicine>("/pharmacy/formulary/import", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  createCustomMedicine: async (payload: any): Promise<HospitalMedicine> => {
    return apiClient<HospitalMedicine>("/pharmacy/formulary/custom", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  updateMedicine: async (id: number, payload: any): Promise<HospitalMedicine> => {
    return apiClient<HospitalMedicine>(`/pharmacy/formulary/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })
  },

  getMedicine: async (id: number): Promise<HospitalMedicine> => {
    return apiClient<HospitalMedicine>(`/pharmacy/formulary/${id}`)
  },

  // Suppliers Master
  getSuppliers: async (params?: Record<string, any>): Promise<PharmacySupplier[]> => {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          query.append(key, String(val))
        }
      })
    }
    return apiClient<PharmacySupplier[]>(`/pharmacy/suppliers?${query.toString()}`)
  },

  createSupplier: async (payload: any): Promise<PharmacySupplier> => {
    return apiClient<PharmacySupplier>("/pharmacy/suppliers", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  updateSupplier: async (id: number, payload: any): Promise<PharmacySupplier> => {
    return apiClient<PharmacySupplier>(`/pharmacy/suppliers/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })
  },

  getSupplierLedger: async (supplierId: number): Promise<PharmacySupplierLedger> => {
    return apiClient<PharmacySupplierLedger>(`/pharmacy/suppliers/${supplierId}/ledger`)
  },

  recordSupplierPayment: async (supplierId: number, payload: any): Promise<PharmacySupplierPayment> => {
    return apiClient<PharmacySupplierPayment>(`/pharmacy/suppliers/${supplierId}/payments`, {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  getSupplierPayments: async (params?: Record<string, any>): Promise<{ data: PharmacySupplierPayment[]; total: number }> => {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          query.append(key, String(val))
        }
      })
    }
    return apiClient(`/pharmacy/supplier-payments?${query.toString()}`)
  },

  // Purchases & GRN
  createPurchase: async (payload: any): Promise<PharmacyPurchase> => {
    return apiClient<PharmacyPurchase>("/pharmacy/purchases", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  getPurchases: async (params?: Record<string, any>): Promise<{ data: PharmacyPurchase[]; current_page: number; total: number }> => {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          query.append(key, String(val))
        }
      })
    }
    return apiClient(`/pharmacy/purchases?${query.toString()}`)
  },

  getPurchase: async (id: number): Promise<PharmacyPurchase> => {
    return apiClient<PharmacyPurchase>(`/pharmacy/purchases/${id}`)
  },

  // Batch Inventory & Expiry
  getBatchStock: async (params?: Record<string, any>): Promise<{ data: PharmacyBatch[]; current_page: number; total: number }> => {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          query.append(key, String(val))
        }
      })
    }
    return apiClient(`/pharmacy/batches?${query.toString()}`)
  },

  getNearExpiryBatches: async (days = 90): Promise<PharmacyBatch[]> => {
    return apiClient<PharmacyBatch[]>(`/pharmacy/batches/near-expiry?days=${days}`)
  },

  getBatchesForMedicine: async (medicineId: number): Promise<PharmacyBatch[]> => {
    return apiClient<PharmacyBatch[]>(`/pharmacy/batches/medicine/${medicineId}`)
  },

  adjustBatchStock: async (batchId: number, payload: { adjustment_quantity: number; reason: string }): Promise<PharmacyBatch> => {
    return apiClient<PharmacyBatch>(`/pharmacy/batches/${batchId}/adjust`, {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  // Prescriptions Dispense Queue
  getPendingPrescriptions: async (params?: Record<string, any>): Promise<{ data: any[]; current_page: number; total: number }> => {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          query.append(key, String(val))
        }
      })
    }
    return apiClient(`/pharmacy/prescriptions/pending?${query.toString()}`)
  },

  getPrescriptionDispenseDetails: async (prescriptionId: number): Promise<PendingPrescriptionResponse> => {
    return apiClient<PendingPrescriptionResponse>(`/pharmacy/prescriptions/${prescriptionId}/dispense-details`)
  },

  // Omni-Channel Sales & POS
  processSale: async (payload: any): Promise<PharmacySale> => {
    return apiClient<PharmacySale>("/pharmacy/sales", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  getSales: async (params?: Record<string, any>): Promise<{ data: PharmacySale[]; current_page: number; total: number }> => {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          query.append(key, String(val))
        }
      })
    }
    return apiClient(`/pharmacy/sales?${query.toString()}`)
  },

  getSale: async (id: number): Promise<PharmacySale> => {
    return apiClient<PharmacySale>(`/pharmacy/sales/${id}`)
  },

  // Returns & Credit Notes
  processReturn: async (payload: any): Promise<PharmacyReturn> => {
    return apiClient<PharmacyReturn>("/pharmacy/returns", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  getReturns: async (params?: Record<string, any>): Promise<{ data: PharmacyReturn[]; current_page: number; total: number }> => {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          query.append(key, String(val))
        }
      })
    }
    return apiClient(`/pharmacy/returns?${query.toString()}`)
  },

  getReturn: async (id: number): Promise<PharmacyReturn> => {
    return apiClient<PharmacyReturn>(`/pharmacy/returns/${id}`)
  },

  // Stock Transactions Ledger
  getStockTransactions: async (params?: Record<string, any>): Promise<{ data: StockTransaction[]; current_page: number; total: number }> => {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          query.append(key, String(val))
        }
      })
    }
    return apiClient(`/pharmacy/stock-transactions?${query.toString()}`)
  },

  // Expiry Intelligence Dashboard
  getExpiryDashboard: async (): Promise<ExpiryDashboardData> => {
    return apiClient<ExpiryDashboardData>("/pharmacy/expiry-dashboard")
  },

  quarantineBatch: async (batchId: number): Promise<PharmacyBatch> => {
    return apiClient<PharmacyBatch>(`/pharmacy/batches/${batchId}/quarantine`, {
      method: "POST",
    })
  },

  // Supplier Returns to Vendor (RTV)
  getSupplierReturns: async (params?: Record<string, any>): Promise<{ data: PharmacySupplierReturn[]; current_page: number; total: number }> => {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          query.append(key, String(val))
        }
      })
    }
    return apiClient(`/pharmacy/supplier-returns?${query.toString()}`)
  },

  createSupplierReturn: async (payload: any): Promise<PharmacySupplierReturn> => {
    return apiClient<PharmacySupplierReturn>("/pharmacy/supplier-returns", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  getSupplierReturn: async (id: number): Promise<PharmacySupplierReturn> => {
    return apiClient<PharmacySupplierReturn>(`/pharmacy/supplier-returns/${id}`)
  },

  updateSupplierReturnStatus: async (id: number, payload: { status: string; debit_note_number?: string; debit_note_date?: string; debit_note_amount?: number }): Promise<PharmacySupplierReturn> => {
    return apiClient<PharmacySupplierReturn>(`/pharmacy/supplier-returns/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    })
  },
}

