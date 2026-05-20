import type { NextRequest } from "next/server";

// PHASE 2 STUB. Phase 5 replaces the body with @upstash/ratelimit per
// security.md §3. Until then every route gets "allowed" so the structural
// position of the limiter inside each handler (before any DB work) stays
// consistent and Phase 5 only has to swap the implementation.
//
// Phase 5 quotas (security.md §3):
//   POST /api/auth/signin          5  / IP    / 10 min
//   POST /api/forgot-password      5  / IP    / 10 min
//   POST /api/signup               10 / IP    / hour
//   POST /api/reset-password       5  / IP    / hour
//   POST /api/resend-verification  3  / email / hour

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

export async function rateLimit(_req: NextRequest, _key: string): Promise<RateLimitResult> {
  return { ok: true };
}
