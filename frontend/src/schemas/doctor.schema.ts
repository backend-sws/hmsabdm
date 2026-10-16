import { z } from "zod"

// ─── Schedule Entry (per day) ─────────────────────────────────────────────────
export const doctorScheduleSchema = z.object({
  day_of_week: z.number().min(0).max(6),
  enabled: z.boolean(),
  start_time: z.string(),
  end_time: z.string(),
  max_patients: z.number().min(1, "Min 1 patient").max(500),
  opd_fee: z.union([z.string(), z.number()]).optional(),
})

export type DoctorScheduleValues = z.infer<typeof doctorScheduleSchema>

// ─── Doctor Create / Edit Form ────────────────────────────────────────────────
export const doctorFormSchema = z.object({
  name: z
    .string()
    .min(2, "Doctor name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),

  username: z.string().optional(),

  password: z
    .string()
    .optional()
    .refine((val) => !val || val.length >= 6, {
      message: "Password must be at least 6 characters",
    }),

  email: z
    .string()
    .optional()
    .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      message: "Enter a valid email address",
    }),

  phone: z
    .string()
    .optional()
    .refine((val) => !val || /^[6-9]\d{9}$/.test(val), {
      message: "Enter a valid 10-digit Indian mobile number",
    }),

  department_id: z
    .union([z.string(), z.number()])
    .refine((v) => v !== "" && !isNaN(Number(v)) && Number(v) > 0, {
      message: "Department is required",
    }),

  specialization: z.string().optional(),
  qualification: z.string().optional(),
  hpr_id: z.string().optional(),

  consultation_time: z.number().min(5, "Minimum 5 minutes").max(120).optional(),

  is_active: z.boolean(),

  schedules: z.array(doctorScheduleSchema).length(7),
})

export type DoctorFormValues = z.infer<typeof doctorFormSchema>
