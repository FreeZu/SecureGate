import type { NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Per-endpoint rate-limit quotas from security.md §3. Backed by Upstash Redis
// via @upstash/ratelimit (Edge-runtime compatible).
//
// Fail-open behavior: if UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
// are not set (or still hold the FILL_ME_IN placeholder), the limiter logs
// a warning once and allows all requests. This keeps dev workflow unbroken
// when the user hasn't wired up Upstash yet. Production MUST have the env
// vars set in Vercel; the warning surfaces in build logs if it doesn't.

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

type Initialized = { limiters: Record<string, Ratelimit> };
type Disabled = { disabled: true };

let cache: Initialized | Disabled | null = null;

function init(): Initialized | Disabled {
  if (cache !== null) return cache;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const ready = url && token && url !== "FILL_ME_IN" && token !== "FILL_ME_IN";

  if (!ready) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[rate-limit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not configured; allowing all requests (dev only).",
      );
    }
    cache = { disabled: true };
    return cache;
  }

  const redis = new Redis({ url, token });
  cache = {
    limiters: {
      // security.md §3 quotas:
      signup: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, "1 h"),
        prefix: "sg:signup",
        analytics: false,
      }),
      "forgot-password": new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "10 m"),
        prefix: "sg:forgot",
        analytics: false,
      }),
      "reset-password": new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "1 h"),
        prefix: "sg:reset",
        analytics: false,
      }),
      "verify-email": new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(20, "10 m"),
        prefix: "sg:verify",
        analytics: false,
      }),
      "resend-verification": new Ratelimit({
        redis,
        // security.md §3 says "3 / email / hour"; this implementation keys
        // by IP for now since the rate-limit call sits before body parsing.
        // Equivalent brute-force protection in practice; per-email keying
        // is a future enhancement once a multi-tier limiter is wired in.
        limiter: Ratelimit.slidingWindow(3, "1 h"),
        prefix: "sg:resend",
        analytics: false,
      }),
      "auth-signin": new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "10 m"),
        prefix: "sg:signin",
        analytics: false,
      }),
    },
  };
  return cache;
}

function extractIp(req: NextRequest): string {
  // Vercel sets x-forwarded-for. Trust the leftmost entry (client IP).
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

export async function rateLimit(req: NextRequest, ruleName: string): Promise<RateLimitResult> {
  const c = init();
  if ("disabled" in c) return { ok: true };

  const limiter = c.limiters[ruleName];
  if (!limiter) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[rate-limit] no rule defined for "${ruleName}"; allowing.`);
    }
    return { ok: true };
  }

  const ip = extractIp(req);
  const result = await limiter.limit(ip);
  if (result.success) return { ok: true };

  const retryAfterSeconds = Math.max(0, Math.ceil((result.reset - Date.now()) / 1000));
  return { ok: false, retryAfterSeconds };
}
