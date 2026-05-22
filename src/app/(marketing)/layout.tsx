import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrimaryNav } from "@/components/PrimaryNav";
import { SiteFooter } from "@/components/SiteFooter";

// Shared chrome for marketing pages — wraps every page under
// src/app/(marketing)/. Reads the session server-side so PrimaryNav
// renders the right CTA cluster on first paint without a flash.
// (auth) and (protected) groups have their own layouts and don't pass
// through here.

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <>
      <PrimaryNav isAuthenticated={!!session} />
      {children}
      <SiteFooter />
    </>
  );
}
