import { z } from "zod"

// ─── Login Form ───────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  login_id: z.string().min(1, "Please enter your User ID or Email"),
  password: z.string().min(1, "Please enter your password"),
  rememberMe: z.boolean().optional(),
})

export type LoginFormValues = z.infer<typeof loginSchema>
