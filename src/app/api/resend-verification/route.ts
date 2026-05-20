import type { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { resendVerificationSchema } from "@/lib/validations/auth";
import { rateLimit } from "@/lib/rate-limit";
import { issueVerificationToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/email";
import {
  okWithMessage,
  badRequest,
  forbidden,
  rateLimited,
  serverError,
} from "@/lib/api-responses";

// Archetype A: pre-session POST.
// Existence-safe: return the same response regardless of whether the email
// is registered or whether the account is already verified. Internally we
// only issue + send when (a) the user exists and (b) emailVerified is null.

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, "resend-verification");
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

  const parsed = resendVerificationSchema.safeParse(body);
  if (!parsed.success) return badRequest();

  try {
    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true, name: true, email: true, emailVerified: true },
    });

    if (user && user.emailVerified === null) {
      const { token } = await issueVerificationToken(user.email);
      const verifyUrl = `${env.NEXTAUTH_URL}/verify-email/${token}`;
      try {
        await sendVerificationEmail({
          to: user.email,
          name: user.name,
          verifyUrl,
        });
      } catch {
        // Resend failure: swallow and still return success. The user can
        // request another email; we log server-side for support.
        if (process.env.NODE_ENV !== "production") {
          console.error("[api/resend-verification] send failed for user", user.id);
        }
      }
    }

    return okWithMessage(
      "If an account is awaiting verification, we've sent a new email.",
    );
  } catch (err) {
    console.error("[api/resend-verification]", err);
    return serverError();
  }
}
