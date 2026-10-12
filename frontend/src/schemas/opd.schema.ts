import { z } from "zod"

export const prescriptionItemSchema = z.object({
  id: z.string().optional(),
  medicine_id: z.coerce.number().optional().nullable(),
  medicine_name: z.string().min(1, "Medicine name is required"),
  dosage_form: z.string().default("Tablet"),
  dosage: z.string().min(1, "Dosage is required"),
  frequency: z.string().min(1, "Frequency is required"),
  duration: z.string().min(1, "Duration is required"),
  duration_unit: z.enum(["Days", "Weeks", "Months"]).default("Days"),
  route: z.string().default("Oral"),
  instructions: z.string().optional(),
})

export type PrescriptionItemFormValues = z.infer<typeof prescriptionItemSchema>

export const diagnosisItemSchema = z.object({
  id: z.string().optional(),
  code: z.string().optional(),
  term: z.string().min(1, "Diagnosis term is required"),
  is_primary: z.boolean().default(false),
})

export type DiagnosisItemFormValues = z.infer<typeof diagnosisItemSchema>

export const prescriptionPayloadSchema = z.object({
  opd_visit_id: z.coerce.number().positive("Valid OPD Visit is required"),
  doctor_id: z.coerce.number().positive("Doctor is required"),
  patient_id: z.coerce.number().positive("Patient is required"),
  complaints: z.string().optional(),
  clinical_notes: z.string().optional(),
  diagnoses: z.array(diagnosisItemSchema).default([]),
  medicines: z.array(prescriptionItemSchema).min(1, "Prescription must contain at least 1 medicine"),
  investigations: z.array(z.string()).default([]),
  advice: z.string().optional(),
  follow_up_date: z.string().optional(),
})

export type PrescriptionPayloadFormValues = z.infer<typeof prescriptionPayloadSchema>
