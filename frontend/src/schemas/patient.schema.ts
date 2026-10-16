import { z } from "zod"

const indianMobileRegex = /^[6-9]\d{9}$/
const pincodeRegex = /^\d{6}$/
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ─── Patient Register / Edit Form ─────────────────────────────────────────────
export const patientFormSchema = z.object({
  name: z
    .string()
    .min(2, "Patient name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),

  mobile: z
    .string()
    .optional()
    .refine((val) => !val || indianMobileRegex.test(val), {
      message: "Enter a valid 10-digit Indian mobile number",
    }),

  email: z
    .string()
    .optional()
    .refine((val) => !val || emailRegex.test(val), {
      message: "Enter a valid email address",
    }),

  gender: z.enum(["M", "F", "O", ""], {
    message: "Gender is required",
  }),

  dob: z.string().optional(),

  blood_group: z.string().optional(),

  id_proof_type: z.string().optional(),

  id_proof_number: z
    .string()
    .optional()
    .refine((val) => !val || val.length >= 4, {
      message: "ID proof number must be at least 4 characters",
    }),

  guardian_name: z.string().optional(),
  guardian_relation: z.string().optional(),
  guardian_phone: z
    .string()
    .optional()
    .refine((val) => !val || indianMobileRegex.test(val), {
      message: "Enter a valid 10-digit Indian mobile number",
    }),

  address: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  pincode: z
    .string()
    .optional()
    .refine((val) => !val || pincodeRegex.test(val), {
      message: "Enter a valid 6-digit pincode",
    }),
})

export type PatientFormValues = z.infer<typeof patientFormSchema>
