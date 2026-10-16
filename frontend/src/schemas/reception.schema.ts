import { z } from "zod"

// ─── Department + Doctor OPD Visit Assignment ─────────────────────────────────
// Previously defined inline in DeptDoctorPicker.tsx — centralized here
export const deptDoctorSchema = z.object({
  department_id: z
    .union([z.string(), z.number()])
    .refine(
      (v) => v !== "" && v !== undefined && v !== null && !isNaN(Number(v)) && Number(v) > 0,
      { message: "Please select a department" }
    )
    .transform((v) => Number(v)),

  doctor_id: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) =>
      v !== "" && v !== undefined && !isNaN(Number(v)) ? Number(v) : undefined
    ),

  slot_time: z.string().optional(),
  chief_complaint: z.string().optional(),

  fee_charged: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) =>
      v !== "" && v !== undefined && !isNaN(Number(v)) ? Number(v) : 0
    ),

  payment_method: z.string().default("cash"),
  payment_status: z.string().default("paid"),
})

export type DeptDoctorFormValues = z.infer<typeof deptDoctorSchema>

// ─── Walk-in / Revisit Patient Quick Search ───────────────────────────────────
export const quickPatientSearchSchema = z.object({
  search: z.string().min(1, "Enter UHID, name, or mobile to search"),
})

export type QuickPatientSearchFormValues = z.infer<typeof quickPatientSearchSchema>
