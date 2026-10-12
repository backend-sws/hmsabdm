import { z } from "zod"

// 1. Custom Medicine Creation Schema
export const createCustomMedicineSchema = z.object({
  brand_name: z.string().min(2, "Brand name must be at least 2 characters"),
  generic_name: z.string().optional(),
  dosage_form: z.string().min(1, "Please select dosage form"),
  strength: z.string().optional(),
  manufacturer: z.string().optional(),
  package_type: z.string().optional(),
  pack_size: z.number().min(1).optional(),
  unit_name: z.string().optional(),
  strip_size: z.number().min(1).optional(),
  box_size: z.number().min(1).optional(),
  base_unit: z.string().optional(),
  reorder_unit: z.string().optional(),
  default_purchase_price: z.number().min(0, "Price cannot be negative"),
  default_selling_price: z.number().min(0, "Selling price cannot be negative"),
  mrp: z.number().min(0, "MRP cannot be negative"),
  hsn_code: z.string().min(2, "HSN code is required"),
  gst_rate: z.number().min(0, "GST rate must be valid"),
  rack_location: z.string().optional(),
  min_reorder_level: z.number().min(0, "Min reorder level cannot be negative"),
  max_stock_level: z.number().optional(),
  prescription_type: z.enum(["OTC", "SCHEDULE_H", "SCHEDULE_H1", "NARCOTIC"]),
  item_code: z.string().optional(),
  is_active: z.boolean().optional(),
})

export type CreateCustomMedicineFormValues = z.infer<typeof createCustomMedicineSchema>

// 2. Import Master Medicine Schema
export const importMasterMedicineSchema = z.object({
  master_medicine_id: z.number().min(1, "Please select a master drug"),
  item_code: z.string().optional(),
  dosage_form: z.string().optional(),
  strength: z.string().optional(),
  package_type: z.string().optional(),
  pack_size: z.number().min(1).optional(),
  unit_name: z.string().optional(),
  default_purchase_price: z.number().min(0).optional(),
  default_selling_price: z.number().min(0).optional(),
  mrp: z.number().min(0).optional(),
  hsn_code: z.string().optional(),
  gst_rate: z.number().optional(),
  rack_location: z.string().optional(),
  min_reorder_level: z.number().min(0).optional(),
  max_stock_level: z.number().optional(),
  prescription_type: z.enum(["OTC", "SCHEDULE_H", "SCHEDULE_H1", "NARCOTIC"]).optional(),
})

export type ImportMasterMedicineFormValues = z.infer<typeof importMasterMedicineSchema>

// 3. Supplier Master Schema
export const supplierSchema = z.object({
  supplier_name: z.string().min(2, "Supplier name is required"),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
  gstin: z.string().optional(),
  drug_license_no: z.string().optional(),
  pan_no: z.string().optional(),
  address: z.string().optional(),
  credit_days: z.number().min(0).optional(),
  credit_limit: z.number().min(0).optional(),
  opening_balance: z.number().min(0).optional(),
  bank_name: z.string().optional(),
  bank_account_no: z.string().optional(),
  bank_ifsc: z.string().optional(),
  is_active: z.boolean().optional(),
})

export type SupplierFormValues = z.infer<typeof supplierSchema>

// 3b. Supplier Payment Voucher Schema
export const supplierPaymentSchema = z.object({
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  payment_date: z.string().min(1, "Payment date is required"),
  payment_mode: z.enum(["NEFT_RTGS", "CHEQUE", "UPI", "CASH"]),
  reference_number: z.string().optional(),
  purchase_id: z.number().optional(),
  tds_amount: z.number().min(0).optional(),
  notes: z.string().optional(),
})

export type SupplierPaymentFormValues = z.infer<typeof supplierPaymentSchema>

// 4. Inward GRN Purchase Item Schema
export const purchaseItemSchema = z.object({
  hospital_medicine_id: z.number().min(1, "Select medicine"),
  medicine_name: z.string().optional(),
  batch_number: z.string().min(1, "Batch number is required"),
  mfg_date: z.string().optional(),
  expiry_date: z.string().min(1, "Expiry date is required"),
  pack_size: z.number().min(1, "Pack size must be at least 1"),
  pack_quantity: z.number().min(1, "Quantity must be at least 1"),
  free_pack_quantity: z.number().min(0),
  purchase_rate_per_unit: z.number().min(0, "Purchase rate cannot be negative"),
  discount_percent: z.number().min(0).max(100),
  gst_rate: z.number().min(0),
  unit_mrp: z.number().min(0),
  selling_price_per_unit: z.number().min(0),
})

export type PurchaseItemValues = z.infer<typeof purchaseItemSchema>

// 5. Purchase Inward GRN Header Schema
export const purchaseGrnSchema = z.object({
  supplier_id: z.number().min(1, "Select supplier"),
  supplier_invoice_no: z.string().min(1, "Invoice number is required"),
  invoice_date: z.string().min(1, "Invoice date is required"),
  received_date: z.string().min(1, "Received date is required"),
  discount_amount: z.number().min(0).optional(),
  igst_amount: z.number().min(0).optional(),
  payment_status: z.enum(["UNPAID", "PARTIAL", "PAID"]),
  paid_amount: z.number().min(0).optional(),
  notes: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1, "At least one medicine item is required"),
})

export type PurchaseGrnFormValues = z.infer<typeof purchaseGrnSchema>

// 6. POS Cart Item Schema
export const posCartItemSchema = z.object({
  batch_id: z.number().min(1),
  hospital_medicine_id: z.number().min(1),
  brand_name: z.string(),
  generic_name: z.string().optional(),
  dosage_form: z.string(),
  batch_number: z.string(),
  expiry_date: z.string(),
  available_quantity: z.number(),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unit_price: z.number().min(0),
  unit_mrp: z.number().min(0),
  discount_percent: z.number().min(0).max(100),
  gst_rate: z.number().min(0),
  hsn_code: z.string().optional(),
  strip_size: z.number().optional(),
  prescription_type: z.string().optional(),
})

export type PosCartItemValues = z.infer<typeof posCartItemSchema>

// 7. POS Sale Checkout Schema
export const posSaleCheckoutSchema = z.object({
  sale_type: z.enum(["WALK_IN", "OPD", "IPD", "EMERGENCY"]),
  customer_name: z.string().min(1, "Customer name is required"),
  customer_phone: z.string().optional(),
  doctor_name: z.string().optional(),
  patient_id: z.number().optional(),
  opd_visit_id: z.number().optional(),
  ipd_admission_id: z.number().optional(),
  prescription_id: z.number().optional(),
  discount_amount: z.number().min(0).optional(),
  payment_mode: z.enum(["CASH", "UPI", "CARD", "SPLIT", "IPD_LEDGER"]),
  payment_details: z.record(z.string(), z.any()).optional(),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      batch_id: z.number().min(1),
      quantity: z.number().min(1),
      unit_price: z.number().min(0).optional(),
      discount_percent: z.number().min(0).max(100).optional(),
      gst_rate: z.number().optional(),
      hsn_code: z.string().optional(),
    })
  ).min(1, "Add at least one medicine item to cart"),
})

export type PosSaleCheckoutFormValues = z.infer<typeof posSaleCheckoutSchema>

// 8. Customer Return Item Schema
export const customerReturnSchema = z.object({
  sale_id: z.number().min(1, "Sale ID is required"),
  return_reason: z.string().optional(),
  refund_mode: z.enum(["CASH", "UPI", "IPD_DEDUCTION"]),
  items: z.array(
    z.object({
      sale_item_id: z.number().min(1),
      quantity: z.number().min(1, "Return quantity must be at least 1"),
    })
  ).min(1, "Select at least one item to return"),
})

export type CustomerReturnFormValues = z.infer<typeof customerReturnSchema>

// 9. Batch Stock Adjustment Schema
export const batchStockAdjustmentSchema = z.object({
  adjustment_quantity: z.number().refine((val) => val !== 0, "Adjustment quantity cannot be zero"),
  reason: z.string().min(3, "Reason is required (e.g., breakage, discrepancy)"),
})

export type BatchStockAdjustmentFormValues = z.infer<typeof batchStockAdjustmentSchema>

// 10. Supplier Return to Vendor (RTV) Schema
export const supplierReturnItemSchema = z.object({
  hospital_medicine_id: z.number().min(1, "Select medicine"),
  batch_id: z.number().min(1, "Select batch"),
  batch_number: z.string().min(1),
  expiry_date: z.string().min(1),
  quantity_returned: z.number().min(1, "Quantity must be at least 1"),
  purchase_rate: z.number().min(0, "Purchase rate cannot be negative"),
})

export const createSupplierReturnSchema = z.object({
  supplier_id: z.number().min(1, "Please select a supplier"),
  purchase_id: z.number().optional(),
  return_reason: z.enum(["NEAR_EXPIRY", "EXPIRED", "DAMAGED", "WRONG_GOODS", "QUALITY_ISSUE"]),
  notes: z.string().optional(),
  items: z.array(supplierReturnItemSchema).min(1, "Select at least one batch item to return"),
})

export type CreateSupplierReturnFormValues = z.infer<typeof createSupplierReturnSchema>

