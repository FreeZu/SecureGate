# AGENTS.md — SecureGate

> Context file for AI coding agents working on this repository inside VS Code. Read this file in full before generating, editing, or refactoring any code.

---

## 1. Project Overview

**SecureGate** is a **standalone, production-grade authentication system** built as a focused Next.js application. It is **not a full product** — its single responsibility is to demonstrate correct, secure identity and access management (IAM) patterns that could be extracted and dropped into any serious application.

**Scope discipline:** Small surface area, deep execution, zero shortcuts. Do not add features outside this spec (no social logins, no 2FA, no admin panel, etc.) unless explicitly instructed.

### Core features the agent must implement
1. Sign Up (with validation, password strength indicator, email confirmation)
2. Login (email + password, NextAuth session, non-leaky error messages)
3. Email verification flow (token link → DB update)
4. Protected dashboard (only verified + authenticated users)
5. Forgot-password flow (request → email → reset, with token expiry)
6. Rate limiting middleware (brute-force protection)
7. Logout (clean session destruction + redirect)
8. Password hashing (bcrypt, salt rounds = 12)

---

## 2. Guiding Principles (Non-Negotiable)

These two principles override convenience, brevity, and even readability when they conflict:

### Murphy's Law
> "Anything that can go wrong in an auth system will go wrong."

Build as if Murphy himself is a user. For every line of auth code, the agent must ask:
- What happens if this input is `null`, `undefined`, an empty string, or 10MB of junk?
- What happens if this token is expired, reused, or forged?
- What happens if this request is sent 1,000 times in 10 seconds?
- What happens if the DB call fails mid-flow?

### Kerckhoffs's Principle
> "A system's security must not depend on the secrecy of its design."

Security comes from:
- Strong hashing (bcrypt, 12 rounds)
- Token integrity and expiry
- Secrets stored in environment variables (never hardcoded, never committed)
- **Not** from obscure code or hidden endpoints.

---

## 3. Tech Stack (Locked)

| Layer | Tool | Notes |
|---|---|---|
| Framework | **Next.js 14 (App Router)** | Do **not** use the Pages Router |
| Language | **TypeScript** | Strict mode on; no `any` unless justified in a comment |
| Database | **PostgreSQL** via **Prisma ORM** | Migrations only via `prisma migrate dev` |
| Auth | **NextAuth.js (Auth.js)** | Credentials provider |
| Hashing | **bcryptjs** | `salt rounds = 12`. Never md5/sha1/plain |
| Email | **Resend** + **React Email** | For verification + reset emails |
| Validation | **Zod** | **Server-side** schemas required on every API route |
| Rate Limiting | **@upstash/ratelimit** (preferred) or custom middleware | |
| Styling | **Tailwind CSS** | Utilities mapped to `tokens.css` variables via `tailwind.config.ts` |
| Deployment | **Vercel** | Env vars via dashboard, never in code |
| VCS | **GitHub** | `.env.local` MUST be in `.gitignore` before first push |

**Do not introduce alternative libraries** (e.g., Lucia, Clerk, Auth0, Drizzle, raw SQL, argon2) without explicit user approval.

---

## 4. Repository Structure (Target)

```
securegate/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── signup/page.tsx
│   │   │   ├── login/page.tsx
│   │   │   ├── forgot-password/page.tsx
│   │   │   ├── reset-password/[token]/page.tsx
│   │   │   └── verify-email/[token]/page.tsx
│   │   ├── (protected)/
│   │   │   └── dashboard/page.tsx
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── signup/route.ts
│   │   │   ├── forgot-password/route.ts
│   │   │   ├── reset-password/route.ts
│   │   │   └── verify-email/route.ts
│   │   └── layout.tsx
│   ├── lib/
│   │   ├── prisma.ts          # Singleton Prisma client
│   │   ├── auth.ts            # NextAuth config
│   │   ├── rate-limit.ts      # Upstash/Redis limiter
│   │   ├── tokens.ts          # crypto.randomBytes helpers
│   │   ├── email.ts           # Resend wrapper
│   │   └── validations/       # Zod schemas
│   ├── components/
│   │   ├── ui/                # Buttons, inputs, etc.
│   │   └── PasswordStrength.tsx
│   ├── emails/                # React Email templates
│   └── middleware.ts          # NextAuth + rate-limit middleware
├── .env.local                 # NEVER commit
├── .env.example               # Safe to commit; placeholder values only
├── .gitignore
├── next.config.js             # Security headers live here
└── AGENTS.md                  # This file
```

---

## 5. Database Schema (Prisma)

The agent must implement these models exactly. Do not rename fields.

```prisma
model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  password      String    // bcrypt hash, NEVER plain text
  emailVerified DateTime?
  createdAt     DateTime  @default(now())
}

model VerificationToken {
  identifier String   // user email
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model PasswordResetToken {
  email   String
  token   String   @unique
  expires DateTime
}
```

After any schema change: run `npx prisma migrate dev --name <descriptive-name>` and verify tables in a DB client before continuing.

---

## 6. Environment Variables

Required in `.env.local` (dev) and the Vercel dashboard (prod):

```
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
RESEND_API_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
CRON_SECRET=
```

`CRON_SECRET` authenticates the `/api/cron/cleanup-tokens` route invoked by Vercel Cron (Phase 5). Generate the same way as `NEXTAUTH_SECRET`: `openssl rand -base64 32`.

### Domain status

`securegate.dev` is used **as a placeholder throughout the docs**. The real production domain has not been provisioned yet.

- **Dev (Phases 1–5):** `NEXTAUTH_URL=http://localhost:3000`. Email sends use Resend's `onboarding@resend.dev` from-address (acceptable for dev, never for production — see `react-email-templates` skill §7.5). All emails go to Resend's test addresses or developer inboxes; nothing reaches the public.
- **Phase 6 deploy is blocked** until a real domain is provided. Substitute the real domain into: `NEXTAUTH_URL` env var, `FROM_ADDRESS` in `src/lib/email.ts`, DNS records (SPF / DKIM / DMARC), the CORS allowlist in `security.md` §8, and any hardcoded references in copy.

**Rules for the agent:**
- Never hardcode any of these values.
- Never echo secret values in logs, comments, or error messages.
- Always update `.env.example` with the *key* (and a placeholder) when adding a new env var.
- Never commit `.env.local`. Confirm it sits in `.gitignore` before any `git add .`.

---

## 7. Build Phases (Follow In Order)

The agent must respect this ordering. **Do not skip ahead.** A broken Phase 2 built on a shaky Phase 1 is worse than a solid Phase 1 alone.

### Phase 1 — Scaffold & DB
- Bootstrap Next.js 14 (App Router, TS, Tailwind, ESLint).
- Init Prisma, connect to Postgres, create the three models above.
- `prisma migrate dev` and verify tables.
- Push to GitHub **before** writing feature code.

### Phase 2 — Auth Core
- Configure NextAuth with the Credentials provider.
- `authorize()` must: look up user by email → `bcrypt.compare()` → return user or `null`.
- Choose JWT **or** database sessions. Document the choice and rationale in `README.md`.
- `POST /api/signup`: Zod-validate → `bcrypt.hash(password, 12)` → save user.
- Protect `/dashboard` via `middleware.ts` — unauthenticated users redirect to `/login`.
- Manual test: confirm DB password is a bcrypt hash, **not plain text**.

### Phase 3 — Email Verification
- On signup, generate token: `crypto.randomBytes(32).toString('hex')`.
- Save token + 15-minute expiry to `VerificationToken`.
- Send via Resend, URL: `${NEXTAUTH_URL}/verify-email/${token}`.
- `/verify-email/[token]`: validate token, check expiry, set `user.emailVerified = new Date()`, delete token.
- On expired/missing token: clear error + "Resend verification" CTA.
- Update middleware/session callback: **only verified users access `/dashboard`**.

### Phase 4 — Forgot Password
- `/forgot-password` page → POST endpoint.
- Generate reset token, save with **1-hour expiry** to `PasswordResetToken`.
- Send reset email via Resend.
- `/reset-password/[token]`: validate token + expiry → accept new password → `bcrypt.hash` → save → **delete token** → redirect to `/login`.
- **Critical:** if the email is not found, **still return success**. Never confirm or deny existence of an account.

### Phase 5 — Rate Limiting & Hardening
- Rate-limit `POST /api/auth/signin`: **5 attempts / IP / 10 minutes**.
- Rate-limit `POST /api/forgot-password`: same or stricter.
- Audit every API error message — see Section 8.
- Add security headers in `next.config.js`:
```js
  headers: async () => [{
    source: '/(.*)',
    headers: [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    ],
  }]
```
- Self-attack: wrong password, expired token, missing fields, replayed tokens, SQL-ish inputs. Document findings.

### Phase 6 — UI Polish & Deploy
- Accessible labels (`<label htmlFor>` on every input).
- Real, specific validation messages — **never** "Something went wrong".
- Loading states on every submit button (disable + spinner).
- Password strength indicator: weak / fair / strong based on length + character variety.
- Deploy to Vercel, set env vars via dashboard, smoke-test live URL end-to-end.
- Final check: `.env.local` is **not** in the GitHub repo.

---

## 8. Security Rules the Agent Must Always Follow

1. **Never trust client input.** Every API route validates with a Zod schema **server-side**, even if the client also validates.
2. **Never store plain-text passwords.** Always `bcrypt.hash(pw, 12)` before any `prisma.user.create` or `update`.
3. **Never leak existence.** Login errors, forgot-password responses, and signup errors must use generic language:
   - Good: "Invalid credentials"
   - Bad: "No account with that email"
   - Bad: "Wrong password"
4. **Never leak stack traces or DB errors** to the client. Catch, log server-side, return a generic message.
5. **Tokens must expire** (verification: 15 min, reset: 1 hr) **and be single-use** (delete on consumption).
6. **Tokens must be cryptographically random:** `crypto.randomBytes(32).toString('hex')`. Never `Math.random()`, never sequential IDs, never JWTs for email tokens.
7. **Rate-limit before processing.** The limiter runs *before* the DB query, not after.
8. **CSRF:** NextAuth handles CSRF for its own routes; for custom POST endpoints, verify the session or use NextAuth's helpers.
9. **No secrets in client components.** If a value would appear in the browser bundle, it cannot be a secret.
10. **HTTPS only in production.** `NEXTAUTH_URL` must be `https://...` on Vercel.

---

## 9. Coding Conventions

- **TypeScript strict mode.** `noImplicitAny`, `strictNullChecks` on.
- **Server Components by default.** Mark client components with `'use client'` only when needed (forms, interactivity).
- **Async/await over `.then()`.**
- **One Prisma client instance** — import from `src/lib/prisma.ts`, never `new PrismaClient()` in route handlers.
- **Zod schemas live in `src/lib/validations/`**, one file per resource (`auth.ts`, `password.ts`).
- **No `console.log` in committed code** — use a logger or remove before commit.
- **Imports:** use `@/` path alias for `src/`.
- **Component naming:** PascalCase files for components, kebab-case for routes.

---

## 10. What the Agent Should NOT Do

- Add features outside the spec (OAuth providers, magic links, 2FA, admin roles).
- Use the Pages Router or `getServerSideProps`.
- Swap bcryptjs for another hasher without explicit approval.
- Lower salt rounds below 12.
- Hardcode any URL, secret, or token expiry as a magic number — use named constants.
- Suppress TypeScript errors with `@ts-ignore` or `any` without a comment justifying it.
- Commit `.env.local`, `.env`, or any file containing real secrets.
- Write tests that hit production Resend / Upstash quotas.
- Generate placeholder "TODO" code in security-critical paths — implement it or ask.

---

## 11. When in Doubt

If the agent is uncertain about a security trade-off (e.g., "Should I return 401 or 403 here?", "Should this token live 5 or 15 minutes?"), it must:

1. Default to the **more restrictive** option.
2. Add an inline comment explaining the choice.
3. Flag the decision in the PR description / chat for human review.

Murphy is watching. Build accordingly.