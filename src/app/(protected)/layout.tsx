import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Belt-and-suspenders: middleware already redirects unauthenticated requests
// for /dashboard, but middleware runs on Edge and only handles the path
// matcher. This server-side check covers anything the matcher might miss and
// keeps the contract explicit. Per nextauth-integration skill §6.

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  // Phase 3 adds:
  //   if (!session.user.emailVerified) redirect("/verify-email-required");

  return <div className="min-h-screen">{children}</div>;
}
