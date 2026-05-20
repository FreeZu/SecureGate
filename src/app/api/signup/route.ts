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
    // createAccount returns null on duplicate email; both branches produce
    // the same response so the API does not disclose existence (security.md §5).
    // Phase 3 will branch the email send: new account gets verification mail,
    // existing user gets a "someone tried to sign up with your email" notice.
    await createAccount(parsed.data);
    return okWithMessage(
      "Account created. Verification email will be sent in Phase 3.",
    );
  } catch (err) {
    console.error("[api/signup]", err);
    return serverError();
  }
}
