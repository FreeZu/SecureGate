import type { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { signupSchema } from "@/lib/validations/auth";
import { rateLimit } from "@/lib/rate-limit";
import { createAccount } from "@/lib/signup";
import {
  okWithMessage,
  badRequest,
  forbidden,
  rateLimited,
  serverError,
} from "@/lib/api-responses";

// Archetype A: pre-session POST. Order is fixed per api-route-scaffolder §5:
// rate-limit -> CSRF origin check -> body parse -> Zod validate -> business
// logic -> response.

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, "signup");
  if (!rl.ok) return rateLimited(rl.retryAfterSeconds);

  // CSRF: pre-session route can't rely on NextAuth's built-in CSRF cookie.
  // Origin is only sent by browsers on non-GET cross-origin requests; when
  // present, it must match our own. Server-to-server requests typically omit
  // it. See security.md §9.
  const origin = req.headers.get("origin");
  if (origin && origin !== env.NEXTAUTH_URL) {
    return forbidden();
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest();
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) return badRequest();

  try {
    // createAccount is existence-safe. Its return value distinguishes new
    // account vs duplicate vs email-send-failed, but the wire response is
    // identical across all branches so the API does not leak which one
    // happened (security.md §5).
    await createAccount(parsed.data);
    return okWithMessage("Check your email to confirm your account.");
  } catch (err) {
    console.error("[api/signup]", err);
    return serverError();
  }
}
