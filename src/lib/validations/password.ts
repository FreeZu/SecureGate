import { z } from "zod";

// Phase 4 password-flow schemas. Constraints mirror src/lib/validations/auth.ts:
//   - email: .trim().toLowerCase().email().max(254)
//   - new password: 8-72 chars, must include lowercase, uppercase, number,
//     and special character (security.md §1)
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
      .regex(/[a-z]/, "Password must include a lowercase letter")
      .regex(/[A-Z]/, "Password must include an uppercase letter")
      .regex(/[0-9]/, "Password must include a number")
      .regex(/[^A-Za-z0-9]/, "Password must include a special character"),
  })
  .strict();

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
