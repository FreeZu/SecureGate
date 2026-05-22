import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ShieldMark } from "@/components/icons/ShieldMark";

// Marketing landing surface. Implements the in-scope subset of DESIGN.md:
//   - Centered hero with shield mark, display-xl headline, and the
//     signature code-snippet pill
//   - One "Your data stays yours" security strip
//   - Minimal footer
// Out of current PRD scope (per DESIGN.md scope note): /pricing tiers,
// FAQ wall, terminal mockup, "Auth done right" split. Add those only when
// the PRD is explicitly extended.

const HERO_SNIPPET = 'await signIn("credentials", { email, password })';

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

        {/* Code-snippet pill — signature element from DESIGN.md */}
        <div className="mt-xxl inline-flex h-code-snippet items-center rounded-full bg-surface-soft px-xl">
          <code className="font-mono text-code-md text-ink">{HERO_SNIPPET}</code>
        </div>

        {/* CTAs — one primary pill + one text link, per design-system §1.5 */}
        <div className="mt-xl flex flex-wrap items-center justify-center gap-md">
          <Link href="/auth/signup" className="inline-flex">
            <Button>Create an account</Button>
          </Link>
          <Link
            href="/auth/login"
            className="text-button-md font-medium text-primary underline"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* Security strip — the single "Your data stays yours" guarantee */}
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
              Sign-in and reset endpoints rate-limited at the edge. HSTS
              preload-eligible.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="mt-section pt-xl text-center text-caption-sm text-body"
        style={{ borderTop: "1px solid var(--color-hairline)" }}
      >
        &copy; 2026 SecureGate
      </footer>
    </main>
  );
}
