import { z } from "zod";

// Phase 4 password-flow schemas. Constraints mirror src/lib/validations/auth.ts:
//   - email: .trim().toLowerCase().email().max(254)
//   - new password: 8-72 chars, must include a letter AND a number (security.md §1)
//   - token: 64 lowercase hex chars (crypto.randomBytes(32).toString("hex"))
//   - .strict() on every schema (blocks mass assignment per security.md §7)

export const forgotPasswordSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
  })
  .strict();

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().regex(/^[a-f0-9]{64}$/),
    password: z
      .string()
      .min(8)
      .max(72)
      .regex(/[A-Za-z]/, "Password must include a letter")
      .regex(/[0-9]/, "Password must include a number"),
  })
  .strict();

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
