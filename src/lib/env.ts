import { z } from "zod";

// Validates the application's environment at boot. Per security.md §10:
// "If any required var is missing, the app fails to start with a clear error."
//
// Any file that needs an env var imports { env } from "@/lib/env" and reads
// from the validated object, never directly from process.env.

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
  RESEND_API_KEY: z.string().min(1),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  CRON_SECRET: z.string().min(32),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Server-only file. The error includes which keys failed but never echoes the values.
  const flat = parsed.error.flatten().fieldErrors;
  const issues = Object.entries(flat)
    .map(([key, msgs]) => `  ${key}: ${msgs?.join(", ")}`)
    .join("\n");
  throw new Error(`Invalid environment variables:\n${issues}`);
}

export const env = parsed.data;
