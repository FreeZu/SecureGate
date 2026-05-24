import { z } from "zod";

// Server-side validation for the auth surface. Per security.md §4:
//   - .trim().toLowerCase() on every email field
//   - .max(...) on every string (oversized-payload DoS)
//   - .strict() on write schemas (blocks mass assignment per security.md §7)
//
// Password constraints per security.md §1:
//   - signup: min 8, max 72, must include lowercase, uppercase, number, symbol
//   - login:  min 1, max 72 (the schema only confirms shape — bcrypt.compare
//             does the real work; older passwords may predate the strength rule)
// 72 is bcrypt's hard limit; longer strings are silently truncated, which
// becomes a vulnerability if not enforced.

export const signupSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().toLowerCase().email().max(254),
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

export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    password: z.string().min(1).max(72),
    // NOTE: .strip() (default) is intentional here. NextAuth's authorize()
    // callback receives extra fields (csrfToken, callbackUrl, redirect, json)
    // alongside the user-submitted credentials. .strict() would reject those
    // as unrecognized keys before bcrypt runs, breaking every login attempt.
    // We only extract email and password; the rest are safely discarded.
  });

export type LoginInput = z.infer<typeof loginSchema>;

// Verification tokens are 64 lowercase hex characters from
// crypto.randomBytes(32).toString("hex"). Validate the shape before any DB
// lookup so malformed inputs return notFound() fast and consistently.
export const verifyEmailSchema = z
  .object({
    token: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

export const resendVerificationSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
  })
  .strict();

export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
