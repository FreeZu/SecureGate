import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ShieldMark } from "@/components/icons/ShieldMark";
import { TerminalCard } from "@/components/TerminalCard";

// Marketing landing surface, implementing the full home-page composition
// from DESIGN.md:
//   - Centered hero (shield, headline, code-snippet pill, CTAs)
//   - "Auth done right" 2-column split (text + terminal mockup)
//   - "Your data stays yours" security strip
// The primary nav and footer come from (marketing)/layout.tsx.

const HERO_SNIPPET = 'await signIn("credentials", { email, password })';

const TERMINAL_CONTENT = `# Clone, configure, run
$ git clone https://github.com/FreeZu/SecureGate.git
$ cd SecureGate
$ cp .env.example .env.local
$ npm install
$ npx prisma migrate dev
$ npm run dev

  Next.js 14.2 — Ready in 1.2s
  Local: http://localhost:3000`;

export default function HomePage() {
  return (
    <main className="mx-auto max-w-content px-xl py-section">
      {/* Hero */}
      <section className="flex flex-col items-center text-center">
        <div className="text-ink">
          <ShieldMark size={96} />
        </div>
        <h1 className="mt-xl text-display-xl font-display font-medium text-ink">
          Authentication, hardened.
        </h1>
        <p className="mt-lg max-w-[520px] text-body-md text-body">
          Email-verified accounts, bcrypt-hashed passwords, single-use tokens,
          rate-limited endpoints. The boring parts of authentication, built carefully.
        </p>

        <div className="mt-xxl inline-flex h-code-snippet items-center rounded-full bg-surface-soft px-xl">
          <code className="font-mono text-code-md text-ink">{HERO_SNIPPET}</code>
        </div>

        <div className="mt-xl flex flex-wrap items-center justify-center gap-md">
          <Link href="/auth/signup" className="inline-flex">
            <Button>Get started</Button>
          </Link>
          <Link
            href="/auth/login"
            className="text-button-md font-medium text-primary underline"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* Auth done right — 2-column split per DESIGN.md Layout */}
      <section className="mt-section grid gap-xxl md:grid-cols-2 md:items-center">
        <div>
          <h2 className="text-heading-lg font-display font-semibold text-ink">
            Auth done right.
          </h2>
          <p className="mt-md text-body-md text-body">
            Clone the repo, drop in your env vars, run one migration, and you have
            a production-grade auth surface. Every primitive is wired the way
            it should be the first time — not patched in after a security audit.
          </p>
          <p className="mt-md text-body-md text-body">
            No social-login glue, no admin dashboards, no scope creep. Just the
            auth flows that every app needs, built carefully enough to stop
            being something you have to think about.
          </p>
        </div>
        <TerminalCard>{TERMINAL_CONTENT}</TerminalCard>
      </section>

      {/* Your data stays yours — security strip */}
      <section
        className="mt-section rounded-lg p-xxl"
        style={{ border: "1px solid var(--color-hairline)" }}
      >
        <div className="flex items-start gap-lg">
          <div className="shrink-0 text-ink">
            <ShieldMark size={32} />
          </div>
          <div>
            <h2 className="text-heading-md font-display font-semibold text-ink">
              Your data stays yours.
            </h2>
            <p className="mt-md text-body-md text-body">
              Passwords hashed with bcrypt at 12 rounds. Verification and reset tokens
              generated from 256 bits of cryptographic entropy and stored single-use.
              Sessions signed with HS256 JWTs in HttpOnly, Secure, SameSite=Lax cookies.
              Sign-in and reset endpoints rate-limited at the edge. HSTS preload-eligible.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
