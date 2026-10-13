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
  doctor_reg_no?: string | null
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
      name?: string
      first_name?: string
      last_name?: string
      phone?: string
      mobile?: string
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

export interface GenericSubstituteItem {
  id: number
  brand_name: string
  generic_name?: string | null
  dosage_form: string
  strength?: string | null
  manufacturer?: string | null
  mrp: number
  default_selling_price: number
  min_price: number
  max_price: number
  pack_size: number
  prescription_type: "OTC" | "SCHEDULE_H" | "SCHEDULE_H1" | "NARCOTIC"
  total_stock: number
  in_stock: boolean
  earliest_expiry?: string | null
  days_to_expiry?: number | null
  is_current: boolean
  fefo_batch?: PharmacyBatch | null
  batches: PharmacyBatch[]
}

export interface GenericSubstituteResponse {
  target_medicine?: HospitalMedicine | null
  generic_name: string
  substitutes: GenericSubstituteItem[]
  total_count: number
}

export interface PatientMedicationHistoryItem {
  medicine_id: number
  brand_name: string
  generic_name?: string | null
  dosage_form: string
  strength?: string | null
  prescription_type: "OTC" | "SCHEDULE_H" | "SCHEDULE_H1" | "NARCOTIC"
  pack_size: number
  last_purchased_at?: string
  last_invoice_no?: string
  last_quantity: number
  last_unit_price: number
  purchase_count: number
  current_stock: number
  in_stock: boolean
  fefo_batch?: PharmacyBatch | null
  can_refill: boolean
}

export interface PatientMedicationHistoryResponse {
  patient_id: number
  recent_sales: PharmacySale[]
  medications: PatientMedicationHistoryItem[]
  total_past_rx: number
}

export interface CdscoRegisterEntry {
  id: number
  sale_id: number
  invoice_number: string
  dispensed_at: string
  dispensed_date: string
  dispensed_time: string
  sale_type: string

  // Patient
  patient_uhid?: string | null
  patient_name: string
  patient_phone?: string | null
  patient_address: string

  // Prescribing Doctor
  doctor_name: string
  doctor_reg_no: string
  doctor_qualification?: string | null

  // Drug
  medicine_id?: number
  brand_name: string
  generic_name?: string | null
  dosage_form: string
  strength?: string | null
  prescription_type: "SCHEDULE_H" | "SCHEDULE_H1" | "NARCOTIC"
  manufacturer: string
  hsn_code?: string

  // Batch & Qty
  batch_number: string
  expiry_date: string
  quantity: number
  unit_price: number
  total_amount: number

  // Qualified Pharmacist Sign-Off
  dispensed_by: string
  pharmacist_sign_off: string
}

export interface CdscoRegisterSummary {
  total_dispensed: number
  schedule_h1: number
  schedule_h: number
  narcotics: number
}

export interface CdscoRegisterResponse {
  paginated?: {
    data: CdscoRegisterEntry[]
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
  records?: CdscoRegisterEntry[]
  summary: CdscoRegisterSummary
}

export interface GstPeriod {
  start_date: string
  end_date: string
}

export interface GstReportSummary {
  // Outward (Sales)
  sales_count: number
  sales_gross_total: number
  sales_taxable: number
  sales_cgst: number
  sales_sgst: number
  sales_output_tax: number

  // Customer Return Reversals
  cust_returns_count: number
  cust_return_taxable: number
  cust_return_reversal: number

  // Net Outward Liability
  net_outward_taxable: number
  net_output_cgst: number
  net_output_sgst: number
  net_output_tax: number

  // Inward Supplies (Purchases / GRN ITC)
  purchases_count: number
  purchases_gross: number
  purchases_taxable: number
  purchases_cgst: number
  purchases_sgst: number
  purchases_igst: number
  purchases_itc: number

  // Supplier Returns (RTV Reversals)
  supplier_returns_count: number
  supplier_returns_reversal: number
  net_itc_available: number

  // Net GST Settlement (GSTR-3B)
  net_gst_payable: number
  itc_carried_forward: number
}

export interface GstSlabBreakdown {
  gst_rate: number
  slab_label: string
  outward_taxable: number
  outward_tax: number
  inward_taxable: number
  inward_itc: number
  net_tax: number
}

export interface GstOutwardInvoice {
  id: number
  invoice_number: string
  invoice_date: string
  customer_name: string
  payment_mode: string
  taxable_amount: number
  cgst_amount: number
  sgst_amount: number
  total_tax: number
  net_amount: number
}

export interface GstInwardPurchase {
  id: number
  grn_number: string
  supplier_invoice_no: string
  invoice_date: string
  supplier_name: string
  supplier_gstin: string
  taxable_amount: number
  cgst_amount: number
  sgst_amount: number
  igst_amount: number
  total_itc: number
  net_amount: number
}

export interface GstReportResponse {
  period: GstPeriod
  summary: GstReportSummary
  slab_breakdown: GstSlabBreakdown[]
  outward_invoices: GstOutwardInvoice[]
  inward_purchases: GstInwardPurchase[]
}

export interface PharmacyWardIndentItem {
  id: number
  ward_indent_id: number
  hospital_medicine_id: number
  batch_id?: number | null
  requested_quantity: number
  dispensed_quantity: number
  returned_quantity: number
  unit_price: number
  gst_rate: number
  taxable_amount: number
  tax_amount: number
  total_amount: number
  dosage_instruction?: string | null
  billing_ledger_item_id?: number | null
  status: "PENDING" | "DISPENSED" | "OUT_OF_STOCK" | "REJECTED" | "RETURNED"
  medicine?: HospitalMedicine
  batch?: PharmacyBatch
}

export interface PharmacyWardIndent {
  id: number
  hospital_id: number
  indent_number: string
  ipd_admission_id: number
  patient_id: number
  ward_name?: string | null
  bed_number?: string | null
  priority: "ROUTINE" | "URGENT" | "STAT"
  status: "PENDING" | "DISPENSED" | "PARTIALLY_DISPENSED" | "REJECTED" | "RETURNED"
  requested_by_user_id: number
  dispensed_by_user_id?: number | null
  dispensed_at?: string | null
  notes?: string | null
  rejection_reason?: string | null
  total_taxable: number
  total_tax: number
  total_amount: number
  created_at: string
  updated_at: string
  patient?: {
    id: number
    uhid: string
    name: string
    gender?: string
    age?: number
    phone?: string
  }
  ipdAdmission?: {
    id: number
    ipd_number: string
    admission_date: string
    doctor_id?: number
  }
  requestedBy?: {
    id: number
    name: string
  }
  dispensedBy?: {
    id: number
    name: string
  }
  items: PharmacyWardIndentItem[]
}

export interface PharmacyPurchaseOrderItem {
  id: number
  purchase_order_id: number
  hospital_medicine_id: number
  pack_quantity: number
  strip_size: number
  pack_size: number
  total_loose_units: number
  pack_purchase_rate: number
  unit_purchase_price: number
  discount_percent: number
  gst_rate: number
  taxable_amount: number
  cgst_amount: number
  sgst_amount: number
  total_amount: number
  received_quantity: number
  status: "PENDING" | "PARTIALLY_RECEIVED" | "COMPLETED" | "CANCELLED"
  medicine?: HospitalMedicine
}

export interface PharmacyPurchaseOrder {
  id: number
  hospital_id: number
  po_number: string
  supplier_id: number
  po_date: string
  expected_delivery_date?: string | null
  status: "DRAFT" | "ORDERED" | "PARTIALLY_RECEIVED" | "COMPLETED" | "CANCELLED"
  total_items_count: number
  subtotal_amount: number
  discount_amount: number
  taxable_amount: number
  tax_amount: number
  net_amount: number
  notes?: string | null
  created_by_user_id: number
  approved_by_user_id?: number | null
  created_at: string
  updated_at: string
  supplier?: PharmacySupplier
  items: PharmacyPurchaseOrderItem[]
  createdBy?: { id: number; name: string }
  approvedBy?: { id: number; name: string }
}

export interface LowStockAlertItem {
  medicine_id: number
  brand_name: string
  generic_name?: string | null
  dosage_form: string
  base_unit: string
  strip_size: number
  pack_size: number
  current_stock_units: number
  current_stock_packs: number
  min_reorder_level: number
  deficit_units: number
  suggested_packs: number
  default_purchase_rate: number
  mrp: number
  gst_rate: number
  preferred_supplier?: PharmacySupplier | null
}

export interface LowStockAlertResponse {
  total_low_stock_count: number
  items: LowStockAlertItem[]
}



