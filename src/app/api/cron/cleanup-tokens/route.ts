import type { NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { ok, unauthorized, serverError } from "@/lib/api-responses";

// Vercel Cron invokes this with `Authorization: Bearer ${CRON_SECRET}`.
// Authentication uses timingSafeEqual so byte-by-byte comparison doesn't
// leak the secret via response timing (prisma-auth-schema §6 smaller item).
//
// Deletes all expired verification + reset tokens in a single transaction.
// Schedule (daily at 03:00 UTC) lives in vercel.json. Vercel's Hobby plan
// caps cron at once per day; if you upgrade to Pro, tighten the cadence
// (e.g., every 6 hours) for fresher cleanup.

export async function GET(req: NextRequest) {
  const provided = req.headers.get("authorization");
  if (!provided) return unauthorized();

  const expected = `Bearer ${env.CRON_SECRET}`;

  // timingSafeEqual requires equal-length buffers. Bail before the call if
  // lengths differ so we don't throw — same security outcome.
  if (provided.length !== expected.length) return unauthorized();

  const isValid = timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  if (!isValid) return unauthorized();

  try {
    const now = new Date();
    const [verifications, resets] = await prisma.$transaction([
      prisma.verificationToken.deleteMany({ where: { expires: { lt: now } } }),
      prisma.passwordResetToken.deleteMany({ where: { expires: { lt: now } } }),
    ]);
    return ok({
      deletedVerifications: verifications.count,
      deletedResets: resets.count,
    });
  } catch (err) {
    console.error("[api/cron/cleanup-tokens]", err);
    return serverError();
  }
}
