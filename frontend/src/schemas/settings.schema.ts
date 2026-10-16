import { z } from "zod"

// ─── Hospital Profile Form ────────────────────────────────────────────────────
export const hospitalProfileSchema = z.object({
  name: z.string().min(2, "Hospital name must be at least 2 characters").max(150),
  code: z.string().min(2, "Hospital code is required").max(20),
  abdm_hip_id: z.string().optional(),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || /^[6-9]\d{9}$/.test(val), {
      message: "Enter a valid 10-digit Indian mobile number",
    }),
  email: z
    .string()
    .optional()
    .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      message: "Enter a valid email address",
    }),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z
    .string()
    .optional()
    .refine((val) => !val || /^\d{6}$/.test(val), {
      message: "Enter a valid 6-digit pincode",
    }),
})

export type HospitalProfileFormValues = z.infer<typeof hospitalProfileSchema>

// ─── Numbering Sequence Base ──────────────────────────────────────────────────
const numberingBaseSchema = (prefix: string) =>
  z.object({
    [`${prefix}_prefix`]: z.string().min(1, "Prefix is required").max(10),
    [`${prefix}_format`]: z.string().min(1, "Format is required"),
    [`${prefix}_padding`]: z.coerce.number().min(1).max(10),
    [`${prefix}_sequence_reset`]: z.enum(["daily", "monthly", "yearly", "never"]),
    [`${prefix}_next_sequence`]: z.coerce.number().min(1),
  })

export const uhidNumberingSchema = numberingBaseSchema("uhid")
export const opdNumberingSchema = numberingBaseSchema("opd")
export const ipdNumberingSchema = numberingBaseSchema("ipd")

export type UhidNumberingFormValues = z.infer<typeof uhidNumberingSchema>
export type OpdNumberingFormValues = z.infer<typeof opdNumberingSchema>
export type IpdNumberingFormValues = z.infer<typeof ipdNumberingSchema>

// ─── Vital Config Form ────────────────────────────────────────────────────────
export const vitalConfigSchema = z.object({
  field_key: z
    .string()
    .min(2, "Field key is required")
    .regex(/^[a-z_]+$/, "Use lowercase letters and underscores only"),
  label: z.string().min(2, "Label is required").max(50),
  unit: z.string().optional(),
  input_type: z.enum(["number", "text", "select", "boolean"]),
  options_text: z.string().optional(),
  min_value: z.coerce.number().optional(),
  max_value: z.coerce.number().optional(),
  is_required: z.boolean().default(false),
})

export type VitalConfigFormValues = z.infer<typeof vitalConfigSchema>

// ─── OPD Slot Settings Form ───────────────────────────────────────────────────
const timeRegex = /^\d{2}:\d{2}$/

export const opdSlotSettingsSchema = z
  .object({
    slot_duration_minutes: z.coerce
      .number()
      .min(5, "Minimum 5 minutes")
      .max(120, "Maximum 120 minutes"),
    morning_start: z.string().regex(timeRegex, "Enter valid time HH:MM"),
    morning_end: z.string().regex(timeRegex, "Enter valid time HH:MM"),
    evening_start: z.string().regex(timeRegex, "Enter valid time HH:MM"),
    evening_end: z.string().regex(timeRegex, "Enter valid time HH:MM"),
    max_patients_per_slot: z.coerce
      .number()
      .min(1, "At least 1 patient per slot")
      .max(100),
    allow_fifo_live_token: z.boolean().default(true),
  })
  .refine(
    (data) => data.morning_start < data.morning_end,
    { message: "Morning end must be after morning start", path: ["morning_end"] }
  )
  .refine(
    (data) => data.evening_start < data.evening_end,
    { message: "Evening end must be after evening start", path: ["evening_end"] }
  )

export type OpdSlotSettingsFormValues = z.infer<typeof opdSlotSettingsSchema>
