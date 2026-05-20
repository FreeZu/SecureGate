import type { NextRequest } from "next/server";
import { verifyEmailSchema } from "@/lib/validations/auth";
import { rateLimit } from "@/lib/rate-limit";
import { consumeVerificationToken } from "@/lib/tokens";
import {
  okWithMessage,
  notFound,
  badRequest,
  rateLimited,
  serverError,
} from "@/lib/api-responses";

// Archetype B: token-consuming POST. Token is in the request body (not the
// URL) so it never lands in server access logs, browser history, or referrer
// headers. The corresponding page at /verify-email/[token] reads the URL
// segment and forwards it here.
//
// Existence-safe error mapping: any of (invalid shape, not found, expired,
// already consumed) returns 404 with the same generic message so an attacker
// cannot distinguish between "valid but expired" and "never existed."

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, "verify-email");
  if (!rl.ok) return rateLimited(rl.retryAfterSeconds);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest();
  }

  const parsed = verifyEmailSchema.safeParse(body);
  if (!parsed.success) return notFound();

  try {
    const result = await consumeVerificationToken(parsed.data.token);
    if (!result) return notFound();
    return okWithMessage("Your email is verified. You can now sign in.");
  } catch (err) {
    console.error("[api/verify-email]", err);
    return serverError();
  }
}
