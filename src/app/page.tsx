import Link from "next/link";
import { Button } from "@/components/ui/Button";

// Marketing surface. SecureGate's PRD is auth-only, so this is intentionally
// minimal — a clear path into /login and /signup, plus a short pitch.

export default function HomePage() {
  return (
    <main className="mx-auto max-w-content px-xl py-section">
      <h1 className="text-display-xl font-display font-medium text-ink">SecureGate</h1>
      <p className="mt-lg text-body-md text-body">
        A focused, production-grade authentication system.
      </p>
      <div className="mt-xl flex flex-wrap items-center gap-md">
        <Link href="/auth/signup" className="inline-flex">
          <Button>Create an account</Button>
        </Link>
        <Link href="/auth/login" className="text-button-md font-medium text-primary underline">
          Sign in
        </Link>
      </div>
    </main>
  );
}
