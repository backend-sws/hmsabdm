export interface MasterMedicine {
  id: number
  brand_name: string
  generic_name?: string
  salt_composition?: string
  dosage_form?: string
  manufacturer?: string
  therapeutic_category?: string
  prescription_type?: string
  mrp?: number
  is_generic?: boolean
}

export interface PharmacyBatch {
  id: number
  hospital_id: number
  hospital_medicine_id: number
  batch_number: string
  mfg_date?: string | null
  expiry_date: string
  purchase_rate: number
  mrp: number
  selling_price: number
  available_quantity: number
  reserved_quantity?: number
  rack_location?: string | null
  is_active: boolean
  expiry_status?: "GOOD" | "NEAR_EXPIRY" | "CRITICAL" | "EXPIRED" | "QUARANTINED"
  quarantined_at?: string | null
  supplier_id?: number | null
  supplier?: PharmacySupplier
  quarantined_by_user_id?: number | null
  medicine?: HospitalMedicine
  created_at?: string
  updated_at?: string
}

export interface HospitalMedicine {
  id: number
  hospital_id: number
  master_medicine_id?: number | null
  item_code?: string
  brand_name: string
  generic_name?: string | null
  dosage_form: string
  strength?: string | null
  manufacturer?: string | null
  default_purchase_price: number
  default_selling_price: number
  mrp: number
  hsn_code: string
  gst_rate: number
  rack_location?: string | null
  min_reorder_level: number
  max_stock_level?: number | null
  strip_size?: number
  box_size?: number
  base_unit?: string
  reorder_unit?: string
  prescription_type: "OTC" | "SCHEDULE_H" | "SCHEDULE_H1" | "NARCOTIC"
  is_active: boolean
  active_batches?: PharmacyBatch[]
  total_batches_count?: number
  total_stock?: number
  package_type?: string
  pack_size?: number
  unit_name?: string
  packaging_summary?: string
  stock_breakdown?: {
    total_units: number
    packs: number
    loose_units: number
    pack_type: string
    unit_name: string
    pack_size: number
    formatted: string
  }
  created_at?: string
  updated_at?: string
}

export interface PharmacySupplier {
  id: number
  hospital_id: number
  supplier_name: string
  contact_person?: string | null
  phone?: string | null
  email?: string | null
  gstin?: string | null
  drug_license_no?: string | null
  pan_no?: string | null
  address?: string | null
  credit_days: number
  credit_limit?: number
  opening_balance?: number
  bank_name?: string | null
  bank_account_no?: string | null
  bank_ifsc?: string | null
  is_active: boolean
  purchases_count?: number
  calculated_total_purchases?: number
  calculated_total_paid?: number
  calculated_outstanding?: number
  calculated_credit_utilization?: number
  is_credit_limit_exceeded?: boolean
  created_at?: string
  updated_at?: string
}

export interface PharmacySupplierPayment {
  id: number
  hospital_id: number
  supplier_id: number
  purchase_id?: number | null
  payment_number: string
  payment_date: string
  amount: number
  tds_amount?: number
  payment_mode: "NEFT_RTGS" | "CHEQUE" | "UPI" | "CASH"
  reference_number?: string | null
  notes?: string | null
  paid_by_user_id?: number | null
  paid_by_user?: { id: number; name: string }
  supplier?: PharmacySupplier
  purchase?: { id: number; grn_number: string; supplier_invoice_no: string }
  created_at?: string
}

export interface PharmacySupplierLedger {
  supplier: PharmacySupplier & {
    total_purchases_amount: number
    total_paid_amount: number
    outstanding_balance: number
    available_credit: number
    credit_utilization: number
    purchases_count: number
    payments_count: number
  }
  purchases: PharmacyPurchase[]
  payments: PharmacySupplierPayment[]
}

export interface PharmacyPurchaseItem {
  id: number
  purchase_id: number
  hospital_medicine_id: number
  batch_id?: number | null
  batch_number: string
  mfg_date?: string | null
  expiry_date: string
  pack_size: number
  pack_quantity: number
  free_pack_quantity: number
  total_unit_quantity: number
  purchase_rate_per_unit: number
  discount_percent: number
  gst_rate: number
  unit_mrp: number
  selling_price_per_unit: number
  taxable_amount: number
  cgst_amount: number
  sgst_amount: number
  total_amount: number
  medicine?: HospitalMedicine
  batch?: PharmacyBatch
}

export interface PharmacyPurchase {
  id: number
  hospital_id: number
  supplier_id: number
  grn_number: string
  supplier_invoice_no: string
  invoice_date: string
  received_date: string
  subtotal_amount: number
  discount_amount: number
  taxable_amount: number
  cgst_amount: number
  sgst_amount: number
  igst_amount: number
  round_off: number
  net_amount: number
  payment_status: "UNPAID" | "PARTIAL" | "PAID"
  paid_amount: number
  notes?: string | null
  supplier?: PharmacySupplier
  items?: PharmacyPurchaseItem[]
  items_count?: number
  received_by_user?: { id: number; name: string } | null
  created_at?: string
}

export interface PharmacySaleItem {
  id: number
  sale_id: number
  hospital_medicine_id: number
  batch_id?: number | null
  batch_number: string
  expiry_date: string
  hsn_code: string
  quantity: number
  unit_mrp: number
  unit_price: number
  discount_percent: number
  taxable_amount: number
  gst_rate: number
  cgst_amount: number
  sgst_amount: number
  total_amount: number
  returned_quantity: number
  medicine?: HospitalMedicine
  batch?: PharmacyBatch
}

export interface PharmacySale {
  id: number
  hospital_id: number
  invoice_number: string
  sale_type: "WALK_IN" | "OPD" | "IPD" | "EMERGENCY"
  patient_id?: number | null
  opd_visit_id?: number | null
  ipd_admission_id?: number | null
  prescription_id?: number | null
  customer_name: string
  customer_phone?: string | null
  doctor_name?: string | null
  subtotal_amount: number
  discount_amount: number
  taxable_amount: number
  cgst_amount: number
  sgst_amount: number
  round_off: number
  net_amount: number
  payment_mode: "CASH" | "UPI" | "CARD" | "SPLIT" | "IPD_LEDGER"
  payment_details?: Record<string, any> | null
  payment_status: "PAID" | "CHARGED_TO_IPD" | "REFUNDED" | "PARTIALLY_REFUNDED"
  notes?: string | null
  patient?: {
    id: number
    uhid: string
    first_name: string
    last_name: string
    phone?: string
  } | null
  items?: PharmacySaleItem[]
  items_count?: number
  created_at?: string
}

export interface PharmacyReturnItem {
  id: number
  return_id: number
  sale_item_id: number
  hospital_medicine_id: number
  batch_id: number
  quantity_returned: number
  unit_price: number
  taxable_amount_reversed: number
  cgst_reversed: number
  sgst_reversed: number
  net_refund_amount: number
  medicine?: HospitalMedicine
  batch?: PharmacyBatch
}

export interface PharmacyReturn {
  id: number
  hospital_id: number
  credit_note_number: string
  sale_id: number
  customer_name: string
  customer_phone?: string | null
  return_reason?: string | null
  refund_amount: number
  refund_mode: "CASH" | "UPI" | "IPD_DEDUCTION"
  sale?: PharmacySale
  items?: PharmacyReturnItem[]
  items_count?: number
  created_at?: string
}

export interface StockTransaction {
  id: number
  hospital_id: number
  hospital_medicine_id: number
  batch_id?: number | null
  transaction_type: "PURCHASE_INWARD" | "SALE_DISPENSE" | "SALES_RETURN" | "PURCHASE_RETURN" | "STOCK_ADJUSTMENT" | "EXPIRED_DISPOSAL"
  quantity_in: number
  quantity_out: number
  balance_after: number
  reference_id?: string | null
  notes?: string | null
  medicine?: {
    id: number
    brand_name: string
    dosage_form: string
    item_code?: string
  }
  batch?: {
    id: number
    batch_number: string
    expiry_date: string
  }
  performed_by_user?: {
    id: number
    name: string
  }
  created_at: string
}

export interface PharmacyDashboardStats {
  today_sales_count: number
  today_revenue: number
  total_medicines: number
  low_stock_count: number
  near_expiry_count: number
  expired_count: number
}

export interface PendingPrescriptionItem {
  prescription_item_id: number
  medicine_name: string
  dosage_form?: string
  dosage?: string
  frequency?: string
  duration_days?: number
  instructions?: string
  is_dispensed: boolean
  hospital_medicine?: HospitalMedicine | null
  available_batches?: PharmacyBatch[]
  fefo_batch?: PharmacyBatch | null
}

export interface PendingPrescriptionResponse {
  prescription: {
    id: number
    prescription_number: string
    encounter_type?: string
    chief_complaints?: any
    clinical_notes?: string
    created_at: string
    patient?: {
      id: number
      uhid: string
      first_name: string
      last_name: string
      phone?: string
      age?: number
      gender?: string
    }
    doctor?: {
      id: number
      full_name: string
      specialization?: string
    }
    opd_visit?: {
      id: number
      token_number: number
      visit_date: string
    }
  }
  dispense_items: PendingPrescriptionItem[]
}

export interface PharmacySupplierReturnItem {
  id: number
  supplier_return_id: number
  hospital_medicine_id: number
  batch_id: number
  batch_number: string
  expiry_date: string
  quantity_returned: number
  purchase_rate: number
  line_total: number
  medicine?: HospitalMedicine
  batch?: PharmacyBatch
}

export interface PharmacySupplierReturn {
  id: number
  hospital_id: number
  rtv_number: string
  supplier_id: number
  purchase_id?: number | null
  return_reason: "NEAR_EXPIRY" | "EXPIRED" | "DAMAGED" | "WRONG_GOODS" | "QUALITY_ISSUE"
  notes?: string | null
  status: "DRAFT" | "CHALLAN_PRINTED" | "SUPPLIER_ACCEPTED" | "DEBIT_NOTE_ISSUED" | "CLOSED"
  total_return_value: number
  debit_note_amount?: number
  debit_note_number?: string | null
  debit_note_date?: string | null
  initiated_by_user_id?: number | null
  approved_by_user_id?: number | null
  approved_at?: string | null
  supplier?: PharmacySupplier
  purchase?: PharmacyPurchase | null
  items?: PharmacySupplierReturnItem[]
  items_count?: number
  initiated_by?: { id: number; name: string }
  approved_by?: { id: number; name: string }
  created_at?: string
  updated_at?: string
}

export interface ExpiryDashboardEntry {
  batch_id: number
  batch_number: string
  hospital_medicine_id?: number
  medicine_name?: string
  generic_name?: string
  item_code?: string
  expiry_date: string
  available_quantity: number
  purchase_rate?: number
  supplier_id?: number | null
  supplier_name?: string | null
  supplier?: PharmacySupplier
  days_to_expiry: number
  category: "EXPIRED" | "CRITICAL" | "NEAR_EXPIRY" | "GOOD"
}

export interface ExpiryDashboardData {
  summary: {
    expired_count: number
    critical_count: number
    near_expiry_count: number
    good_count: number
  }
  expired: ExpiryDashboardEntry[]
  critical: ExpiryDashboardEntry[]
  near_expiry: ExpiryDashboardEntry[]
}

