import { z } from "zod"

export const ipdAdmissionSchema = z.object({
  patient_id: z.coerce.number().positive("Patient selection is required"),
  doctor_id: z.coerce.number().positive("Attending doctor is required"),
  department_id: z.coerce.number().optional().nullable(),
  ward_id: z.coerce.number().positive("Ward selection is required"),
  bed_id: z.coerce.number().positive("Bed selection is required"),
  provisional_diagnosis: z.string().min(2, "Provisional diagnosis is required"),
  admission_notes: z.string().optional(),
  mlc_case: z.boolean().default(false),
  mlc_number: z.string().optional(),
  estimated_stay_days: z.coerce.number().min(1).default(3),
})

export type IpdAdmissionFormValues = z.infer<typeof ipdAdmissionSchema>

export const batchBedSchema = z.object({
  ward_id: z.coerce.number().positive("Ward is required"),
  bed_type: z.string().min(1, "Bed type is required"),
  prefix: z.string().min(1, "Prefix is required (e.g. B-)"),
  start_number: z.coerce.number().min(1, "Start number must be >= 1"),
  count: z.coerce.number().min(1, "Count must be >= 1").max(50, "Max 50 beds at once"),
  daily_charge: z.coerce.number().min(0, "Daily charge cannot be negative"),
})

export type BatchBedFormValues = z.infer<typeof batchBedSchema>
