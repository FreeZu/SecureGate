"use client";

import { SessionProvider } from "next-auth/react";

// Mount point for client-side context providers. SessionProvider is the
// only one for SecureGate today. Kept in a separate Client Component so
// the root layout can stay a Server Component (nextauth-integration §6).

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
