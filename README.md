# SecureGate

A focused, production-grade authentication system built as a standalone Next.js application. Small scope, deep execution, zero shortcuts.

See [`AGENTS.md`](./AGENTS.md) for the full project specification.

---

## Tech stack

- **Next.js 14** (App Router)
- **TypeScript** (strict mode)
- **PostgreSQL** + **Prisma ORM**
- **NextAuth.js** (Credentials provider, JWT session strategy)
- **bcryptjs** (salt rounds = 12)
- **Resend** + **React Email** (verification + reset emails)
- **Zod** (server-side input validation)
- **@upstash/ratelimit** (brute-force protection)
- **Tailwind CSS** (utilities map to `tokens.css` via CSS variables)
- **Vercel** (deployment)

---

## Local development

### Prerequisites

- Node.js 20+
- A PostgreSQL database (Neon recommended)
- A Resend account (for transactional email)
- An Upstash Redis database (for rate limiting)

### Setup

1. Clone the repo.
2. Copy `.env.example` to `.env.local` and fill in real values:
   - `DATABASE_URL` — Postgres connection string
   - `NEXTAUTH_SECRET` — generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
   - `NEXTAUTH_URL` — `http://localhost:3000` for dev
   - `RESEND_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — from each provider's dashboard
   - `CRON_SECRET` — same generation method as `NEXTAUTH_SECRET`
3. Install dependencies: `npm install`
4. Run the initial migration: `npx prisma migrate dev`
5. Start the dev server: `npm run dev`

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the Next.js dev server at `http://localhost:3000` |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint |
| `npm run format` | Prettier-format `src/` and `prisma/` |
| `npm run email:dev` | React Email preview server (separate port — change if it collides with Next.js dev) |
| `npx prisma migrate dev --name <name>` | Apply a new schema change locally |
| `npx prisma studio` | Inspect the database in a browser |

---

## Session strategy: JWT

SecureGate uses NextAuth's **JWT** session strategy (not the database session strategy). The cookie carries a signed JWT; the server verifies it without a DB round-trip on each authenticated request.

**Why JWT here:**

- No immediate session revocation is required by the PRD.
- Keeps the schema minimal — the three PRD-specified models, no `Session` or `Account` table.
- Works well with Vercel Edge middleware (`getToken` from `next-auth/jwt`).

**Trade-off:** changing a user's password does not invalidate existing JWTs until they expire (7-day `maxAge`). If immediate revocation becomes a requirement, switch to the database session strategy per the `nextauth-integration` skill §1.

---

## Project structure

See [`.agent/rules/architecture.md`](./.agent/rules/architecture.md) §1 for the canonical folder layout.

## Conventions

- [`.agent/rules/code-style.md`](./.agent/rules/code-style.md) — TypeScript, naming, imports
- [`.agent/rules/security.md`](./.agent/rules/security.md) — passwords, tokens, sessions, rate limits, error wording
- [`.agent/rules/design-system.md`](./.agent/rules/design-system.md) — styling, anti-patterns
- [`tokens/tokens.css`](./tokens/tokens.css) — source of truth for visual values
