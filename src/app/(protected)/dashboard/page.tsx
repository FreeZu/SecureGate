import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";

// Reads the session server-side (middleware + (protected)/layout already
// guarantee an authenticated, verified user). Renders a greeting and the
// LogoutButton; Phase 6+ can grow this into a real dashboard.

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  return (
    <main className="mx-auto max-w-content px-xl py-section">
      <header className="flex items-start justify-between gap-xl">
        <div>
          <h1 className="text-display-lg font-display font-semibold text-ink">
            Welcome{session?.user.name ? `, ${session.user.name}` : ""}
          </h1>
          <p className="mt-lg text-body-md text-body">
            Signed in as{" "}
            <span className="font-medium text-ink">{session?.user.email}</span>.
          </p>
        </div>
        <LogoutButton />
      </header>
    </main>
  );
}
