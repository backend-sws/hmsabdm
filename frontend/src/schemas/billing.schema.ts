import { z } from "zod"

export const opdQuickBillSchema = z.object({
  patient_id: z.coerce.number().positive("Patient is required"),
  department_id: z.coerce.number().optional().nullable(),
  doctor_id: z.coerce.number().optional().nullable(),
  charges: z
    .array(
      z.object({
        charge_id: z.coerce.number().positive(),
        charge_name: z.string(),
        unit_price: z.coerce.number().min(0),
        quantity: z.coerce.number().min(1).default(1),
        total_amount: z.coerce.number().min(0),
      })
    )
    .min(1, "At least one charge must be selected"),
  discount_amount: z.coerce.number().min(0).default(0),
  paid_amount: z.coerce.number().min(0).default(0),
  payment_method: z.enum(["cash", "upi", "card", "neft"]).default("cash"),
  payment_reference: z.string().optional(),
})

export type OpdQuickBillFormValues = z.infer<typeof opdQuickBillSchema>
