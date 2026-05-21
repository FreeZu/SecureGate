import type { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validations/password";
import { rateLimit } from "@/lib/rate-limit";
import { issueResetToken } from "@/lib/tokens";
import { sendResetEmail } from "@/lib/email";
import {
  okWithMessage,
  badRequest,
  forbidden,
  rateLimited,
  serverError,
} from "@/lib/api-responses";

// Archetype A: pre-session POST.
// CRITICAL existence-safety rule (security.md §5 + AGENTS.md Phase 4):
// ALWAYS return success regardless of whether the email is registered.
// Internally we only issue + send when the user actually exists, but the
// wire response is identical so the endpoint cannot be used to enumerate
// accounts.

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, "forgot-password");
  if (!rl.ok) return rateLimited(rl.retryAfterSeconds);

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

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) return badRequest();

  try {
    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true, name: true, email: true },
    });

    if (user) {
      const { token } = await issueResetToken(user.email);
      const resetUrl = `${env.NEXTAUTH_URL}/auth/reset-password/${token}`;
      try {
        await sendResetEmail({ to: user.email, name: user.name, resetUrl });
      } catch {
        if (process.env.NODE_ENV !== "production") {
          console.error("[api/forgot-password] send failed for user", user.id);
        }
        // Still return success; the user can request another link.
      }
    }

    return okWithMessage(
      "If an account exists for that email, we've sent a reset link.",
    );
  } catch (err) {
    console.error("[api/forgot-password]", err);
    return serverError();
  }
}
