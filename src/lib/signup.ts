import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { hashPassword } from "@/lib/password";
import { issueVerificationToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/email";
import type { SignupInput } from "@/lib/validations/auth";

// Existence-safe: on duplicate email returns null instead of throwing. The
// route handler responds with the same success message either way so the API
// does not leak whether the email was already registered (security.md §5).
//
// Phase 3 additions over the Phase 2 version:
//   - Issue a verification token after the user row is created.
//   - Send the verification email. Per react-email-templates §9 caller
//     pattern, the email send is wrapped in try/catch by the route handler
//     so a Resend outage does not fail the signup. The account exists either
//     way; the user can request a new verification email from the
//     verify-email-required page.

export interface CreateAccountResult {
  /** undefined when the email was already registered. */
  userId?: string;
  /** false when token issuance or the Resend call failed. The route returns
   *  success either way and the user can resend later. */
  emailSent: boolean;
}

export async function createAccount(input: SignupInput): Promise<CreateAccountResult> {
  const hashedPassword = await hashPassword(input.password);

  let user;
  try {
    user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        password: hashedPassword,
      },
      // select: never return the password column, even on the server (defense
      // in depth against accidental serialization down the call stack).
      select: { id: true, email: true, name: true },
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      // Phase 3 TODO: notify the existing user via the "someone tried to
      // sign up with your email" template (security.md §5). Out of scope
      // until that template exists.
      return { emailSent: false };
    }
    throw err;
  }

  let emailSent = true;
  try {
    const { token } = await issueVerificationToken(user.email);
    const verifyUrl = `${env.NEXTAUTH_URL}/auth/verify-email/${token}`;
    await sendVerificationEmail({
      to: user.email,
      name: user.name,
      verifyUrl,
    });
  } catch {
    emailSent = false;
    if (process.env.NODE_ENV !== "production") {
      console.error("[signup] verification email failed", { userId: user.id });
    }
  }

  return { userId: user.id, emailSent };
}

function isUniqueViolation(err: unknown): err is Prisma.PrismaClientKnownRequestError {
  // P2002 = unique constraint violation (the User.email @unique).
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "P2002"
  );
}
