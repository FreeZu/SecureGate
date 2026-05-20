import { requireVerified } from "@/lib/session";

// Belt-and-suspenders: middleware redirects unverified users at the Edge,
// this layout repeats the check on the Node side so anything the matcher
// misses still lands correctly. requireVerified() redirects on its own.

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  await requireVerified();
  return <div className="min-h-screen">{children}</div>;
}
