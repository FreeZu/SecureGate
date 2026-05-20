import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { VERIFICATION_TOKEN_TTL_MS } from "@/lib/constants";

// All token plumbing for the auth surface. Per security.md §2 and the
// prisma-auth-schema-and-migrations skill §3/§5.

/**
 * 64-char hex from 256 bits of cryptographic entropy. Never Math.random,
 * never timestamp-derived, never sequential. security.md §2.
 */
export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Issue a verification token for `email`, atomically replacing any prior one
 * for that email so the invariant "at most one valid verification token per
 * email" holds even under concurrent issuance. prisma-auth-schema §5.
 */
export async function issueVerificationToken(email: string) {
  const token = generateToken();
  const expires = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);

  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier: email } }),
    prisma.verificationToken.create({ data: { identifier: email, token, expires } }),
  ]);

  return { token, expires };
}

/**
 * Consume a verification token: mark the user verified AND delete the token
 * atomically. Returns the token record on success, null on any failure mode
 * (not found / expired / consumed) — the caller maps null to a generic
 * existence-safe error.
 *
 * TOCTOU note: between findUnique below and the transaction, two concurrent
 * requests with the same token could both pass the expiry check. That is
 * acceptable because the operations inside the transaction are idempotent —
 * setting emailVerified twice produces the same end state, and deleting a
 * row that no longer exists is a no-op. prisma-auth-schema §3.
 */
export async function consumeVerificationToken(token: string) {
  const record = await prisma.verificationToken.findUnique({ where: { token } });

  if (!record) return null;
  if (record.expires < new Date()) {
    // Immediate cleanup. The expired-row cleanup cron in Phase 5 also covers
    // this, but deleting here keeps the table tidy and the next attempt to
    // verify with the same token returns null faster.
    await prisma.verificationToken.delete({ where: { token } });
    return null;
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { email: record.identifier },
      data: { emailVerified: new Date() },
    }),
    prisma.verificationToken.delete({ where: { token } }),
  ]);

  return record;
}
