import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import type { SignupInput } from "@/lib/validations/auth";

// Phase 2: create the user with a bcrypt-hashed password. The verification
// token issuance + email send lands in Phase 3 (this function gets extended
// there to issue a VerificationToken and call sendVerificationEmail before
// returning).
//
// Existence-safe: on duplicate email returns null instead of throwing. The
// route handler responds with the same success message either way so the API
// does not leak whether the email was already registered (security.md §5).

export async function createAccount(input: SignupInput) {
  const hashedPassword = await hashPassword(input.password);

  try {
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        password: hashedPassword,
      },
      // select: never return the password field, even on the server (defense
      // in depth against accidental serialization down the call stack).
      select: { id: true, email: true, name: true },
    });
    return user;
  } catch (err) {
    if (isUniqueViolation(err)) return null;
    throw err;
  }
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
