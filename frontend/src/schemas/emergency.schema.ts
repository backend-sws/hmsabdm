import { z } from "zod"

export const priorityLevelSchema = z.enum(["red", "yellow", "green", "black"], {
  message: "Priority level must be Red, Yellow, Green, or Black",
})

export const emergencyStatusSchema = z.enum([
  "triage",
  "in_treatment",
  "observation",
  "admitted_ipd",
  "transferred",
  "discharged",
  "lama",
  "dead_on_arrival",
  "expired",
])

export const emergencyTriageAdmissionSchema = z.object({
  patient_id: z.number().nullable().optional(),
  name: z.string().min(2, "Patient name must be at least 2 characters").max(100),
  age: z.coerce.number().min(0, "Age must be >= 0").max(130, "Age cannot exceed 130"),
  gender: z.enum(["male", "female", "other"], {
    message: "Gender is required",
  }),
  phone: z.string().optional().refine(val => !val || /^[0-9+\-\s]{7,15}$/.test(val), {
    message: "Invalid phone number format",
  }),
  priority_level: priorityLevelSchema,
  chief_complaints: z.string().min(2, "Chief complaints are required for triage"),
  provisional_diagnosis: z.string().optional(),
  assigned_doctor_id: z.coerce.number().nullable().optional(),
  is_mlc: z.boolean().default(false),
  mlc_details: z.string().optional(),
  police_station: z.string().optional(),
  brought_by: z.string().optional(),
  brought_by_contact: z.string().optional(),
  vitals: z
    .object({
      pulse: z.string().optional(),
      bp_systolic: z.string().optional(),
      bp_diastolic: z.string().optional(),
      spo2: z.string().optional(),
      temp: z.string().optional(),
      rr: z.string().optional(),
      gcs: z.string().optional(),
    })
    .optional(),
})

export type EmergencyTriageAdmissionFormValues = z.infer<typeof emergencyTriageAdmissionSchema>

export const emergencyStatusUpdateSchema = z.object({
  status: emergencyStatusSchema,
  discharge_disposition: z.string().optional(),
  notes: z.string().optional(),
})

export type EmergencyStatusUpdateFormValues = z.infer<typeof emergencyStatusUpdateSchema>
