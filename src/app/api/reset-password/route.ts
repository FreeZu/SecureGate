import type { NextRequest } from "next/server";
import { resetPasswordSchema } from "@/lib/validations/password";
import { rateLimit } from "@/lib/rate-limit";
import { consumeResetToken } from "@/lib/tokens";
import {
  okWithMessage,
  badRequest,
  notFound,
  rateLimited,
  serverError,
} from "@/lib/api-responses";

// Archetype B: token-consuming POST. Token in body, never URL.
// Existence-safe: any failure mode (invalid shape, not found, expired,
// already consumed) maps to 404 with the same generic message so an
// attacker cannot distinguish "this token never existed" from "this token
// existed but is expired."

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, "reset-password");
  if (!rl.ok) return rateLimited(rl.retryAfterSeconds);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest();
  }

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    // 400 here (not 404) because the password shape itself was invalid,
    // which is a client request error. The token shape failure also lands
    // here — slightly less existence-safe than verify-email, but the
    // alternative (404 on bad password) would mislead legitimate users
    // about what went wrong with their input.
    return badRequest();
  }

  try {
    const result = await consumeResetToken(parsed.data.token, parsed.data.password);
    if (!result) return notFound();
    return okWithMessage("Password updated. Sign in with your new password.");
  } catch (err) {
    console.error("[api/reset-password]", err);
    return serverError();
  }
}
