import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Server-side session helpers per architecture.md §1.
// Both helpers redirect rather than throw so they can be called from layouts
// and pages without surfacing as 500s.

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

/**
 * Require an authenticated AND email-verified session, or redirect.
 * Pre-verification users land on /verify-email-required so they can
 * trigger a fresh email rather than seeing a generic "please sign in".
 */
export async function requireVerified() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");
  if (!session.user.emailVerified) redirect("/auth/verify-email-required");
  return session;
}
