import { z } from "zod";

// Validates the application's environment at boot. Per security.md §10:
// "If any required var is missing, the app fails to start with a clear error."
//
// Any file that needs an env var imports { env } from "@/lib/env" and reads
// from the validated object, never directly from process.env.

// Treat empty strings and the "FILL_ME_IN" placeholder as "not set" so the
// dev .env.local can declare a slot without satisfying the schema yet.
// Used only on vars that are optional in this phase.
const stripPlaceholder = (v: unknown): unknown =>
  typeof v === "string" && (v === "" || v === "FILL_ME_IN") ? undefined : v;

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
  RESEND_API_KEY: z.string().min(1),
  // Upstash vars are optional until Phase 5 wires up rate-limit.ts. At that
  // point they become required at boot. Phase 5 TODO: drop the preprocess
  // and the .optional() so security.md §10's "fail at boot if missing" holds.
  UPSTASH_REDIS_REST_URL: z.preprocess(stripPlaceholder, z.string().url().optional()),
  UPSTASH_REDIS_REST_TOKEN: z.preprocess(stripPlaceholder, z.string().min(1).optional()),
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
