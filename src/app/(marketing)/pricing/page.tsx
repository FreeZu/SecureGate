import { PricingCard } from "@/components/PricingCard";
import { FAQRow } from "@/components/FAQRow";

// Pricing page per DESIGN.md. Three tiers (Free / Pro / Max) — the Max
// tier uses the inverted pricing-card-dark variant, which is the
// system's single "look here" cue per design-system.md §1.5.
//
// Tier prices and feature lists are illustrative; adjust when the actual
// commercial model is set. The security primitives (bcrypt 12, tokens,
// rate limits) are real and ship in every tier — they're table stakes,
// not gated features.

const FREE_TIER = {
  name: "Free",
  price: "$0",
  description: "For solo projects and prototypes.",
  ctaLabel: "Get started",
  ctaHref: "/auth/signup",
  features: [
    "Up to 1,000 users",
    "All security primitives: bcrypt-12, JWT, rate limits",
    "Email verification and password reset",
    "Self-host, MIT licensed",
  ],
};

const PRO_TIER = {
  name: "Pro",
  price: "$20",
  priceSuffix: "/month",
  description: "Scale up without rewriting the auth layer.",
  ctaLabel: "Get Pro",
  ctaHref: "/auth/signup",
  featuresHeader: "Everything in Free, plus:",
  features: [
    "Up to 50,000 users",
    "Custom email-sending domain (DKIM / DMARC)",
    "Audit logs retained 90 days",
    "Priority issue triage",
  ],
};

const MAX_TIER = {
  name: "Max",
  price: "$99",
  priceSuffix: "/month",
  description: "For teams that need the strongest guarantees.",
  ctaLabel: "Get Max",
  ctaHref: "/auth/signup",
  featuresHeader: "Everything in Pro, plus:",
  features: [
    "Unlimited users",
    "SSO / SAML (roadmap)",
    "99.9% uptime SLA",
    "Dedicated support channel",
  ],
};

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-pricing-grid px-xl py-section">
      <section className="text-center">
        <h1 className="text-display-lg font-display font-medium text-ink">Pricing</h1>
        <p className="mt-md text-body-md text-body">
          Start free. Scale secure. Same security primitives at every tier.
        </p>
      </section>

      <section className="mt-xxl grid gap-xl md:grid-cols-3">
        <PricingCard {...FREE_TIER} />
        <PricingCard {...PRO_TIER} />
        <PricingCard {...MAX_TIER} dark />
      </section>

      <section className="mx-auto mt-section max-w-content">
        <h2 className="text-display-lg font-display font-medium text-ink">
          Frequently asked questions
        </h2>
        <div className="mt-xl">
          <FAQRow question="Is SecureGate open source?">
            Yes. The code lives on GitHub under the MIT license. You can read every
            line, fork it, and self-host it. The hosted tiers exist to take the ops
            burden off teams that would rather not run their own database, Redis, and
            email sender.
          </FAQRow>
          <FAQRow question="How are passwords stored?">
            Hashed with bcryptjs at 12 salt rounds before they ever touch the database.
            The plaintext is never written to disk, never logged, never returned in an
            API response. Login uses a constant-time compare against a dummy hash even
            when the user is not found, so response timing does not leak account
            existence.
          </FAQRow>
          <FAQRow question="How do you prevent account-enumeration attacks?">
            Forgot-password always returns the same success response regardless of
            whether the email is registered. Login errors use a single generic
            sentence. Token-consumption endpoints return 404 for any failure mode —
            invalid shape, not found, expired, already consumed. An attacker cannot
            tell which case happened from the response.
          </FAQRow>
          <FAQRow question="Can I bring my own database?">
            Yes. Prisma supports PostgreSQL, MySQL, SQLite, CockroachDB, and SQL Server.
            Swap the DATABASE_URL and run prisma migrate dev. The schema is three
            tables: User, VerificationToken, PasswordResetToken.
          </FAQRow>
          <FAQRow question="How is rate limiting handled?">
            @upstash/ratelimit backed by Upstash Redis, run at the Edge before any DB
            query touches Postgres. Sign-in allows 5 attempts per IP per 10 minutes;
            signup allows 10 per IP per hour; forgot-password and reset are equally
            tight. The full quota schedule lives in the security rules.
          </FAQRow>
          <FAQRow question="Do you support social logins?">
            Not in the current scope. SecureGate ships the NextAuth Credentials provider
            only. Adding Google, GitHub, or other OAuth providers is straightforward via
            NextAuth&apos;s standard provider config — we just haven&apos;t, because the
            auth surface stays small on purpose.
          </FAQRow>
        </div>
      </section>
    </main>
  );
}
