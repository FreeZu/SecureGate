import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Phase 2 dashboard placeholder. Real UI lands in Phase 6.

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  return (
    <main className="mx-auto max-w-content px-xl py-section">
      <h1 className="text-display-lg font-display font-semibold text-ink">
        Welcome to SecureGate
      </h1>
      <p className="mt-lg text-body-md text-body">
        Signed in as{" "}
        <span className="font-medium text-ink">{session?.user.email}</span>.
      </p>
      <p className="mt-sm text-body-sm text-body">
        Real dashboard UI lands in Phase 6.
      </p>
    </main>
  );
}
