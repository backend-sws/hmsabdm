import { z } from "zod"

export const collectLabPaymentSchema = z.object({
  amount: z.coerce
    .number()
    .positive("Payment amount must be greater than 0"),
  payment_method: z.enum(["cash", "upi", "card", "neft", "split"], {
    message: "Select a valid payment method",
  }),
  payment_breakdown: z
    .array(
      z.object({
        method: z.string(),
        amount: z.coerce.number().min(0),
        ref: z.string().optional(),
      })
    )
    .optional(),
  utr_number: z.string().optional(),
  transaction_reference: z.string().optional(),
})

export type CollectLabPaymentFormValues = z.infer<typeof collectLabPaymentSchema>

export const rejectSampleSchema = z.object({
  reason: z.string().min(3, "Rejection reason must be at least 3 characters"),
  notes: z.string().optional(),
})

export type RejectSampleFormValues = z.infer<typeof rejectSampleSchema>

export const directLabBookingSchema = z
  .object({
    template_ids: z.array(z.coerce.number()).min(1, "Select at least one test to order"),
    urgency: z.string().default("Routine"),
    doctor_id: z.coerce.number().optional().nullable(),
    discount_amount: z.coerce.number().min(0, "Discount cannot be negative").default(0),
    discount_reason: z.string().optional(),
    payment_method: z.string().default("cash"),
    payment_breakdown: z
      .array(
        z.object({
          method: z.string(),
          amount: z.coerce.number().min(0),
          ref: z.string().optional(),
        })
      )
      .optional(),
    utr_number: z.string().optional(),
    transaction_reference: z.string().optional(),
    patient_id: z.coerce.number().optional().nullable(),
    walkin_patient: z
      .object({
        title: z.string().optional(),
        name: z.string().min(2, "Patient name must be at least 2 characters"),
        gender: z.string().default("M"),
        age: z.coerce.number().min(0).max(130),
        age_unit: z.enum(["Years", "Months", "Days", "years", "months", "days"]).default("Years").optional(),
        dob: z.string().optional(),
        mobile: z.string().optional(),
        address: z.string().optional(),
      })
      .optional(),
  })
  .refine((data) => !!data.patient_id || !!data.walkin_patient?.name, {
    message: "Either select an existing patient or provide walk-in patient details",
    path: ["patient_id"],
  })

export type DirectLabBookingFormValues = z.infer<typeof directLabBookingSchema>

export const recordLabResultsSchema = z.object({
  results: z.record(z.string(), z.any()),
  technician_notes: z.string().optional(),
  flag_abnormal: z.boolean().optional(),
})

export type RecordLabResultsFormValues = z.infer<typeof recordLabResultsSchema>
