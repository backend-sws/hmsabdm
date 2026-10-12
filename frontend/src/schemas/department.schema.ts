import { z } from "zod"

// ─── Department Create / Edit Form ───────────────────────────────────────────
export const departmentFormSchema = z.object({
  name: z
    .string()
    .min(2, "Department name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),

  code: z
    .string()
    .min(2, "Code identifier must be at least 2 characters")
    .max(20, "Code cannot exceed 20 characters"),

  description: z.string().optional(),

  is_active: z.boolean(),
})

export type DepartmentFormValues = z.infer<typeof departmentFormSchema>
