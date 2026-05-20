---
trigger: always_on
---
# Security Rules — SecureGate

> Rule file for AI coding agents. Place at `.agent/rules/security.md`. **Read this file before writing any code that touches authentication, tokens, sessions, passwords, or user input.** Companion files: `architecture.md`, `code-style.md`, `design-system.md`.

---

## 0. Two Principles That Override Everything

### Murphy's Law
> "Anything that can go wrong in an auth system will go wrong."

For every line of auth code, the agent must answer:
- What if this input is `null`, `undefined`, empty, or 10MB of junk?
- What if this token is expired, reused, or forged?
- What if this request is sent 1,000 times in 10 seconds?
- What if the DB call fails mid-flow?
- What if the email service is down?

If the answer to any of these is "the system breaks insecurely," fix it before shipping.

### Kerckhoffs's Principle
> "A system's security must not depend on the secrecy of its design."

Security comes from:
- Strong hashing (bcrypt, 12 rounds)
- Cryptographic tokens with expiry
- Secrets in environment variables
- **Not** from hidden endpoints, obscure URLs, or "security by obscurity"

When uncertain about a security trade-off, **default to the more restrictive option**, add an inline comment explaining the choice, and flag it to the human.

---

## 1. Passwords

### Hashing
- **Always `bcrypt.hash(plaintext, 12)`** before any `prisma.user.create` or `prisma.user.update` that touches the password field.
- **Salt rounds: 12.** Not 10, not 14. Twelve. Defined as `BCRYPT_ROUNDS = 12` in `src/lib/constants.ts`.
- **Comparison:** `bcrypt.compare(plaintext, hash)`. This is constant-time — use it even if the user is not found (see §5 timing-attack rule).

### Storage
- Stored in `User.password` (a `String` field in Prisma).
- **Never** stored anywhere else — not in logs, not in error messages, not in JWT claims, not in session data.
- **Never** returned in API responses, even hashed.

### Validation (server-side, in Zod schema)
- Minimum 8 characters.
- Maximum 72 characters (bcrypt's hard limit — strings longer are silently truncated, which creates a vulnerability if not enforced).
- At least one letter and one number is the minimum bar; the UI shows a 3-step strength indicator (weak/fair/strong) that nudges users toward stronger passwords but does not block "fair" submissions.

### Client-side
- **Never log a password.** Not in `console.log`, not in error tracking.
- **The password field is `<input type="password">`.** Optional toggle to reveal is acceptable; default-revealed is not.
- **`autocomplete="new-password"`** on signup and reset forms; `autocomplete="current-password"` on login.

### Forbidden
- MD5, SHA-1, SHA-256 for passwords (use bcrypt).
- Storing the password in plaintext anywhere, even transiently.
- Sending the password back to the client.
- Including the password in any log line.

---

## 2. Tokens (Email Verification, Password Reset)

### Generation
**Use `crypto.randomBytes(32).toString('hex')` only.**

```ts
import { randomBytes } from "crypto";

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}
```

This produces a 64-character hex string with 256 bits of entropy. Cryptographically secure.

### Forbidden token sources
- `Math.random()` — predictable, not cryptographically secure.
- `Date.now()` or any timestamp-derived value.
- UUIDs (most UUID libs use insecure RNG by default).
- Sequential IDs (`user.id + counter`).
- JWTs for email tokens (JWTs are stateless; we need server-side revocation).

### Expiry
| Token type | TTL | Stored in |
|---|---|---|
| Email verification | **15 minutes** | `VerificationToken` table |
| Password reset | **1 hour** | `PasswordResetToken` table |

Define as named constants in `src/lib/constants.ts`:
```ts
export const VERIFICATION_TOKEN_TTL_MS = 15 * 60 * 1000;
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
```

**Never hardcode TTL values in route handlers.**

### Single-use
- Tokens are deleted from the DB upon successful consumption.
- A reused token must return the same error as an invalid token (do not disclose "this token was already used").

### Token consumption flow
```ts
async function consumeVerificationToken(token: string) {
  const record = await prisma.verificationToken.findUnique({ where: { token } });
  if (!record) return null; // invalid OR already consumed
  if (record.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token } });
    return null; // expired
  }
  // Mark user verified + delete token atomically
  await prisma.$transaction([
    prisma.user.update({
      where: { email: record.identifier },
      data: { emailVerified: new Date() },
    }),
    prisma.verificationToken.delete({ where: { token } }),
  ]);
  return record;
}
```

**Rule:** Use a transaction for the "verify user + delete token" pair. A partial state where the token is gone but the user isn't verified is the worst-case Murphy scenario.

---

## 3. Rate Limiting

### Required Limits
| Endpoint | Limit |
|---|---|
| `POST /api/auth/signin` | **5 attempts per IP per 10 minutes** |
| `POST /api/forgot-password` | **5 attempts per IP per 10 minutes** |
| `POST /api/signup` | **10 attempts per IP per hour** |
| `POST /api/resend-verification` | **3 attempts per email per hour** |
| `POST /api/reset-password` | **5 attempts per IP per hour** |

### Implementation
- Preferred: `@upstash/ratelimit` with Upstash Redis.
- Fallback: in-memory limiter for local dev only (clearly comment as such).
- Limiter runs **before** the DB query, not after. A failed DB lookup must still count against the limit.

### Response on rate-limit hit
```ts
return NextResponse.json(
  { error: "Too many requests. Try again later." },
  { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
);
```

### Forbidden
- Rate-limiting only on successful requests (defeats the purpose against brute-force).
- Rate-limiting per session/user-id instead of per IP (the attacker doesn't have a session yet).
- Disabling rate limits in production "temporarily."

---

## 4. Input Validation (Zod)

### Mandatory Zod
**Every API route validates its input with Zod, server-side, before any other logic.** Even if the client already validates.

```ts
// src/lib/validations/auth.ts
import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(72),
});

export type SignupInput = z.infer<typeof signupSchema>;
```

### Rules
- **`.trim()` and `.toLowerCase()`** on email fields, always.
- **Max length on every string.** Prevents oversized-payload DoS.
- **`.safeParse()` over `.parse()`** in route handlers — never throw raw Zod errors at the client.
- **One schema file per resource** under `src/lib/validations/`.

### Forbidden
- Trusting `req.body` directly.
- Validating only on the client.
- Returning Zod's raw error object to the client (leaks internal field structure).

---

## 5. Error Messages — Existence Safety

### The rule
Auth error messages must **never** disclose whether an account exists, whether a password was wrong, or any other detail that lets an attacker enumerate users.

### Login
Error messages must be **plain, human language** that tells the user what to do next. They must **never** expose backend error codes, stack traces, framework jargon, status codes, or any signal that lets an attacker distinguish between failure modes.

| Scenario | Error message shown to user |
|---|---|
| Email doesn't exist OR password is wrong | *"We could not sign you in. Please check your details and try again."* |
| Rate-limited (429) | *"Too many sign-in attempts. Please wait a few minutes before trying again."* |
| Account locked | *"Your account has been temporarily locked. Please try again later or reset your password."* |
| Email not verified | Same as a failed sign-in on the first attempt. UI may surface a *"Need to verify your email?"* link after 2 failed attempts — but the immediate error stays generic. |
| Session expired | *"Your session has ended. Please sign in again to continue."* |
| Server error (500) | *"Something went wrong on our end. Please try again."* |

**Rule:** Every one of these is full sentences ending in punctuation. None contains "401", "Unauthorized", "Invalid credentials", "JWT", "bcrypt", "Prisma", or any other system noise. The same principle extends to **every** error surfaced anywhere in the app — settings, dashboard, API calls — not only login.

### Signup
| Scenario | Behavior |
|---|---|
| Email already registered | Return a success response. Send an email to the existing user: "Someone tried to sign up with your email. If this was you, sign in." This avoids both enumeration and silent confusion. |

### Forgot Password
**Always return success**, regardless of whether the email exists.

```ts
return NextResponse.json({ ok: true, message: "If an account exists for that email, we've sent a reset link." });
```

If the email does exist: send the reset email.
If it doesn't: do nothing, return the same response. **Do not** add a delay to match timing — instead, always run a constant-time dummy operation.

### Timing-attack protection
When the user is not found during login, **still run `bcrypt.compare`** against a dummy hash:
```ts
const DUMMY_HASH = "$2b$12$" + "x".repeat(53); // valid bcrypt format, never matches

const user = await prisma.user.findUnique({ where: { email } });
const isValid = user
  ? await bcrypt.compare(password, user.password)
  : await bcrypt.compare(password, DUMMY_HASH); // constant-time, always runs
if (!user || !isValid) return invalidCredentials();
```

This prevents an attacker from measuring response times to enumerate accounts.

### Forbidden error wording
- "No account with that email"
- "Wrong password"
- "Email already registered" (on signup — silent-handle instead)
- "Invalid credentials" (too terse and technical — use the full softer sentence)
- "Error 401: Unauthorized"
- "JWT validation failed" / "Invalid token signature"
- "User record not found in database"
- "bcrypt hash comparison returned false"
- "SQL query returned 0 rows"
- Stack traces in client responses
- Prisma error codes in client responses
- "User with id X not found" (leaks ID format)
- Any raw exception message routed to the UI

**Backend errors are logged server-side only.** What the user sees is always a plain, contextually-appropriate sentence.

---

## 6. Sessions

### NextAuth Configuration
- **Strategy:** JWT or database sessions. Document the choice in `README.md` with a rationale. JWT is simpler; DB sessions allow immediate revocation.
- **Secret:** `NEXTAUTH_SECRET` in env. Must be ≥32 chars random. Rotate annually.

### Expiration policy
- **Session lifetime:** default **7 days** of inactivity. Configure in `authOptions`:
  ```ts
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 }, // 7 days in seconds
  jwt: { maxAge: 7 * 24 * 60 * 60 },
  ```
- **Sessions that never expire are a HIGH-severity finding.** One stolen cookie equals permanent unauthorized access.
- **On sensitive actions** (password change, email change, account deletion), require re-authentication even within an active session.

### Refresh token rotation
If you implement refresh tokens (DB-session strategy or a custom layer):
- **Rotate refresh tokens on every use.** When a refresh token is exchanged for a new access token, issue a new refresh token *and invalidate the old one*. The old token must be unusable for any subsequent request.
- **Invalidate all refresh tokens on logout.** Sign-out destroys the session row (DB strategy) or marks the JWT family as revoked (token-family pattern).
- **Detect refresh-token reuse as compromise.** If a previously-rotated (already-invalidated) refresh token is ever presented again, treat it as a stolen-token signal: invalidate the entire token family for that user, force re-authentication, and log the event for review.
- **Store refresh tokens hashed**, the same way passwords are. The raw value lives only in the user's cookie.

### Cookies
NextAuth sets cookies with these flags by default — verify they remain set:
- `HttpOnly` — JS cannot read the cookie (XSS mitigation)
- `Secure` — HTTPS only (production)
- `SameSite=Lax` — CSRF mitigation
- `Path=/`

### Tokens must never appear in URLs, query parameters, or logs
- **No session ID, JWT, or refresh token in any URL path or query string.** URLs end up in browser history, in HTTP referrer headers sent to third-party sites, in server access logs, in analytics tools, and in CDN logs. A token in a URL is a token leaked.
- **Email-verification tokens and password-reset tokens are the only tokens that may appear in URLs** — and only because they are single-use, short-lived, and serve no purpose once consumed. Even so, the verify/reset routes must redirect to a clean URL immediately after consumption so the token doesn't sit in browser history.
- **Never log a session token, JWT, or refresh token.** Not in `console.log`, not in error tracking, not in request logging middleware. The application logger must have an explicit redaction list including `password`, `token`, `authorization`, `cookie`, `set-cookie`, `refreshToken`, and similar.
- **`Authorization: Bearer` headers** are acceptable; the value still must not be logged.

### Session shape
The session payload must include `emailVerified` so middleware can gate `/dashboard`. Extend the type:

```ts
// src/types/next-auth.d.ts
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      emailVerified: Date | null;
    } & DefaultSession["user"];
  }
}
```

### Logout
- Calls `signOut()` from NextAuth.
- Clears the session cookie server-side.
- **Invalidates the refresh token** (DB strategy) or marks the JWT as revoked (revocation-list strategy).
- Redirects to `/login`.
- **Never** leave a stale session cookie after logout.

### Forbidden
- Storing JWTs in `localStorage` or `sessionStorage`.
- Long-lived sessions (> 30 days) without re-authentication.
- Carrying password hashes in the session/JWT.
- Putting any token in a URL, query parameter, or referer-exposed location (except the single-use email/reset token routes).
- Logging the value of any session-bearing cookie or header.
- Leaving a rotated refresh token usable after rotation.

---

## 7. Authorization & Ownership Checks

**Authenticated ≠ authorized.** A valid session proves *who* the user is. It does **not** prove they are allowed to read, modify, or delete the specific resource they are asking for. Every endpoint that touches a user-scoped resource must verify ownership server-side, on every request.

### The IDOR rule
**Insecure Direct Object Reference (IDOR)** is the vulnerability where an endpoint accepts a resource ID without verifying the requesting user owns it. The classic example:

```ts
// DANGER — any logged-in user can read any document by guessing IDs
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return unauthorized();
  const doc = await prisma.document.findUnique({ where: { id: params.id } });
  return NextResponse.json(doc);
}
```

The session check confirms the user is logged in. It does **not** confirm they own document `params.id`. An attacker iterates `id=1, 2, 3, ...` and exfiltrates the whole table.

```ts
// SAFE — query filters by BOTH document id AND owner
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return notFound(); // see "404 not 403" rule below

  const doc = await prisma.document.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!doc) return notFound();

  return NextResponse.json(doc);
}
```

### The 404-not-403 rule
When a user requests a resource they **don't own** (or that doesn't exist), respond with **HTTP 404 Not Found**, not 403 Forbidden.

- A 403 response confirms the resource exists — the attacker just doesn't have access. They now know the ID is valid and can attempt social-engineering, privilege escalation, or further enumeration.
- A 404 response is indistinguishable from "the resource doesn't exist at all." The attacker learns nothing.

| Scenario | HTTP status | Body |
|---|---|---|
| Resource doesn't exist | 404 | *"We could not find what you were looking for."* |
| Resource exists but user doesn't own it | 404 | *"We could not find what you were looking for."* |
| User is not authenticated at all | 401 (or redirect to `/login` for page routes) | *"Please sign in to continue."* |
| User is authenticated but lacks a *role* (e.g. non-admin hitting an admin route) | 404 | *"We could not find what you were looking for."* |

**Rule:** Reserve 401 for "you aren't signed in." Use 404 for everything that smells like "you don't have permission to know if this exists."

### Mass-assignment prevention
**Never** pass a request body directly to a Prisma `create` or `update`. The user can include fields they shouldn't be allowed to set — `emailVerified`, `role`, `id`, `createdAt`, anyone-else's-userId.

```ts
// DANGER — user can promote themselves to admin by adding "role": "admin" to the body
const body = await req.json();
await prisma.user.update({ where: { id: session.user.id }, data: body });
```

```ts
// SAFE — Zod schema allow-lists exactly the fields the user may edit
const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(100),
}).strict(); // .strict() rejects unknown keys instead of silently dropping them

const parsed = updateProfileSchema.safeParse(await req.json());
if (!parsed.success) return badRequest();

await prisma.user.update({
  where: { id: session.user.id },
  data: parsed.data, // only the explicitly-allow-listed fields
});
```

**Rules:**
- Every Zod schema for a write endpoint uses `.strict()` so unknown keys are rejected, not silently ignored.
- The `where` clause **always** includes the authenticated user's id when mutating user-scoped data. Never trust an `id` field from the request body.
- Never spread the request body into `data`: `data: { ...body, ... }` is a foot-gun even with Zod, because the spread invites pasting later.

### SecureGate-specific authorization rules
For the auth app itself, the principle applies even though the resource surface is small today:

| Route | Authorization check |
|---|---|
| `GET /dashboard` | Requires authenticated session **AND** `emailVerified !== null`. Middleware enforces this; never duplicate the check in the page itself in a weaker form. |
| `POST /api/auth/change-password` (future) | Requires session. Must verify the **current** password before accepting a new one — re-authenticates mid-session. |
| `POST /api/auth/update-profile` (future) | Requires session. Zod schema `.strict()`, only fields the user may edit. `where: { id: session.user.id }` always. |
| `DELETE /api/auth/account` (future) | Requires session **AND** re-authentication (current password). Destroys all the user's tokens, sessions, and data atomically. |

### What to never do
- Hide privileged UI buttons and assume that protects the endpoint. The UI is a suggestion; `curl` is the truth.
- Trust an `id` or `userId` field from the request body to identify *which* resource to modify. Always derive identity from the session.
- Return 403 when 404 will do.
- Use a single ownership check at the start of a long handler and assume it still holds for nested resources. Re-check at each boundary.
- `prisma.user.update({ where: { email }, data: body })` — both halves are wrong: trusting the body for fields, and trusting an email lookup for identity.

---

## 8. HTTP Security Headers

Add to `next.config.js`:

```js
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

module.exports = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};
```

### Rules
- These headers ship on **every route**. Not optional, not opt-in.
- **`X-Frame-Options: DENY`** prevents clickjacking via iframe embedding.
- **`X-Content-Type-Options: nosniff`** stops MIME-type confusion attacks.
- **`Strict-Transport-Security`** is **mandatory in production**, not optional. Vercel serves HTTPS by default, so this header is safe to enable from day one. The value above declares:
  - `max-age=63072000` — 2 years (the minimum for the HSTS preload list)
  - `includeSubDomains` — applies to every subdomain of the auth host
  - `preload` — eligible for inclusion in the browser-shipped HSTS preload list (submit at https://hstspreload.org once stable)
- **HTTP must redirect to HTTPS** at the platform level. Vercel does this automatically; verify in the deployment settings.
- **TLS certificates** must be valid and auto-renewing. Vercel handles this; if you ever self-host, monitor expiry and renew with 30+ days of margin.

### CORS
Next.js API routes are same-origin by default — the browser will not send cross-origin requests with credentials unless CORS headers explicitly permit it. **Do not relax this without a reason.**

If you must enable cross-origin access (e.g. a mobile client, a separate marketing site, a partner integration):

```ts
// Explicit allowlist — never wildcard in production
const ALLOWED_ORIGINS = [
  "https://app.securegate.dev",
  "https://www.securegate.dev",
];

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return new NextResponse(null, { status: 403 });
  }
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Max-Age": "86400",
    },
  });
}
```

**Rules:**
- **`Access-Control-Allow-Origin: *` is forbidden in production.** A wildcard CORS policy means any domain can make requests to your API; combined with `Allow-Credentials: true` it becomes a critical data-theft vulnerability. (Browsers refuse to honor `*` together with credentials, but several configuration libraries silently strip credentials in that case — leading to confusing "why isn't this working" debugging that resolves with a wildcard fix that creates a vulnerability instead.)
- **Explicit allowlist only.** Hardcode the production domain(s). Read from an env var if multi-environment, but never accept arbitrary origins.
- **Reflect the origin from the allowlist, not from the request header.** Setting `Access-Control-Allow-Origin: req.headers.origin` without first validating it against the allowlist IS a wildcard in disguise.
- **Development origins** (`http://localhost:3000`) live in dev configuration only — they must never appear in production builds.
- **Preflight (`OPTIONS`)** requests must validate the origin too, not only the actual request.

### Content-Security-Policy
Consider adding once the app's resource needs are stable. Start strict and loosen if needed:
```
default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self';
```

---

## 9. CSRF

- NextAuth has built-in CSRF protection for its own routes (`/api/auth/*`) via the double-submit cookie pattern. Don't disable it.
- **Custom POST routes** (`/api/signup`, `/api/forgot-password`, `/api/reset-password`, `/api/verify-email`) must either:
  - Require a valid session (which carries the CSRF protection), OR
  - For pre-session routes (signup, forgot-password), rely on `SameSite=Lax` cookies + origin verification.
- **Origin check** in pre-session routes:
  ```ts
  const origin = req.headers.get("origin");
  if (origin && origin !== process.env.NEXTAUTH_URL) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  ```

---

## 10. Secrets Management

### Storage
- Dev: `.env.local` (gitignored).
- Prod: Vercel dashboard "Environment Variables."
- **Never** in source code, never in comments, never in test files committed to git.

### .gitignore must contain
```
.env
.env.local
.env*.local
```
Verify before the first `git add`.

### Access
- Only via `process.env.VAR_NAME`.
- Validate at app boot via `src/lib/env.ts`:
  ```ts
  import { z } from "zod";
  const envSchema = z.object({
    DATABASE_URL: z.string().url(),
    NEXTAUTH_SECRET: z.string().min(32),
    NEXTAUTH_URL: z.string().url(),
    RESEND_API_KEY: z.string().min(1),
    UPSTASH_REDIS_REST_URL: z.string().url(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
    CRON_SECRET: z.string().min(32),
  });
  export const env = envSchema.parse(process.env);
  ```
  If any required var is missing, the app fails to start with a clear error.

### Client exposure
- **Only `NEXT_PUBLIC_*` vars are exposed to the browser bundle.** None of the required vars start with `NEXT_PUBLIC_` — none should ever appear in client code.
- If you find yourself wanting `NEXT_PUBLIC_NEXTAUTH_SECRET`, stop. That's a critical mistake.

### Git history scanning — committed secrets must be rotated, not just removed
**A secret that was ever committed to git is compromised forever.** Deleting it in a subsequent commit does **not** undo the leak — the value remains visible in `git log -p`, in every clone, in every fork, and in any service that mirrored the repo (GitHub search index, archive.org, etc.).

**Rules:**
1. **Treat any past commit of a real secret as a CRITICAL finding.** Work on the affected feature stops until the secret is rotated.
2. **Rotation steps, in order:**
   - Issue a new secret value (new `NEXTAUTH_SECRET`, new `RESEND_API_KEY`, new database password, new Upstash token — whichever leaked).
   - Update Vercel dashboard with the new value.
   - Update `.env.local` for every developer's machine.
   - Verify the old value no longer works against the relevant service.
3. **Then, and only then**, optionally rewrite git history with `git filter-repo` or BFG Repo-Cleaner. Rewriting history is **not** a substitute for rotation — it's cosmetic cleanup after the real work is done.
4. **Enable secret scanning** in the GitHub repo settings (Settings → Code security → Secret scanning). It catches a wide range of known token formats and blocks pushes containing them.
5. **Add a pre-commit hook** that runs a secret scanner locally:
   ```bash
   # .git/hooks/pre-commit (or use husky / lefthook)
   gitleaks protect --staged --redact --verbose || {
     echo "Secrets detected. Commit blocked."
     exit 1
   }
   ```
   `gitleaks` and `trufflehog` are the common open-source choices. Pick one.
6. **Before the first push to GitHub**, audit the repo for any value resembling a secret:
   ```bash
   gitleaks detect --source . --verbose
   ```
   If anything is found, rotate before pushing.

### Production bundle secret scan
**Every production build must be checked for accidentally-leaked secrets in the client bundle** before deployment.

The risk: a single mistake — `NEXT_PUBLIC_DATABASE_URL` typed by accident, a secret string concatenated into a client-side string, a `console.log(process.env)` that webpack inlines — turns the JavaScript bundle into a permanent public credential dump.

**Required pre-deploy check:**
```bash
# Build the app
npm run build

# Scan the output for known secret patterns
SECRETS=("$(grep -lr "$NEXTAUTH_SECRET" .next/ 2>/dev/null)")
SECRETS+=("$(grep -lr "$RESEND_API_KEY" .next/ 2>/dev/null)")
SECRETS+=("$(grep -lr "$DATABASE_URL" .next/ 2>/dev/null)")
SECRETS+=("$(grep -lr "$UPSTASH_REDIS_REST_TOKEN" .next/ 2>/dev/null)")

if [ -n "${SECRETS[*]// /}" ]; then
  echo "SECRET LEAK DETECTED in .next/ bundle:"
  printf '%s\n' "${SECRETS[@]}"
  exit 1
fi
```

**Rules:**
1. **This check runs on every CI build**, not only locally. Add it as a step in the GitHub Actions / Vercel build pipeline.
2. **A match in `.next/static/`** (the client bundle) is an immediate **CRITICAL** finding — the secret is in the browser. Stop the deploy, rotate the secret, find the leak, redeploy.
3. **A match in `.next/server/`** is acceptable — that directory runs on the server only and is never sent to the client. Server-side secrets in the server bundle are normal.
4. **Generalize the pattern** for any new secret-looking string you add — extend the script when you add a new env var.
5. **Spot-check manually too:** open the production site in a browser, open DevTools → Sources, search the loaded JS for any secret-looking string (token prefixes like `sk_`, `re_`, JWT-format strings, long random hex). If any of them match a real env value, you've leaked.

### Forbidden patterns around secrets
- `console.log(process.env)` anywhere — webpack may inline the full env object into a client bundle.
- Logging request headers wholesale — `Authorization`, `Cookie`, `Set-Cookie` carry session-bearing values.
- Including secrets in error messages, exception fields, or analytics events.
- Committing a `.env` file with placeholder values that look like real secrets (use `your-secret-here` or `xxxxx`, not a plausible-looking value).
- Saving Vercel env vars to a text file "for backup." Use a real secrets manager (1Password, Bitwarden) if you must persist them.

---

## 11. Database

### Prisma protects against SQL injection
Prisma's query builder parameterizes all inputs. **Never** use:
- `prisma.$queryRawUnsafe(userInput)`
- String concatenation in `prisma.$queryRaw`

Use the tagged-template `prisma.$queryRaw` if you need raw SQL — it parameterizes safely:
```ts
// Safe (parameterized)
const users = await prisma.$queryRaw`SELECT * FROM "User" WHERE email = ${email}`;

// DANGER
const users = await prisma.$queryRawUnsafe(`SELECT * FROM "User" WHERE email = '${email}'`);
```

### Connection pooling
- Use the singleton Prisma client (see `architecture.md` §4).
- In serverless (Vercel), consider Prisma Accelerate or a connection pooler (PgBouncer) for the production `DATABASE_URL`.

---

## 12. Common Attack Vectors — Checklist

| Attack | Mitigation in SecureGate |
|---|---|
| SQL Injection | Prisma parameterizes all queries; no raw SQL with user input |
| XSS | React escapes by default; never `dangerouslySetInnerHTML` with user content; CSP header |
| CSRF | NextAuth CSRF + SameSite=Lax + origin verification on custom POST routes |
| **IDOR (Insecure Direct Object Reference)** | Every resource query filters by the authenticated user's id; 404 (not 403) when ownership check fails — see §7 |
| **Mass assignment / privilege escalation** | Zod schemas use `.strict()`; `where` always derives identity from session, never from request body — see §7 |
| Brute force | Rate limits on signin, forgot-password, signup |
| Credential stuffing | Same rate limits + (future) breach-password check via HIBP |
| Token replay | Single-use tokens, deleted on consumption |
| Token forgery | 256-bit random tokens, DB-backed (not signed JWTs) |
| **Refresh token theft** | Refresh tokens rotated on every use; reuse of a rotated token invalidates the family — see §6 |
| Account enumeration | Soft, generic user-facing error messages; constant-time bcrypt compare with dummy hash |
| Timing attacks | bcrypt.compare always runs (dummy hash when user not found) |
| Session hijacking | HttpOnly + Secure + SameSite cookies; HTTPS-only; tokens never in URLs or logs — see §6 |
| Clickjacking | X-Frame-Options: DENY |
| MIME sniffing | X-Content-Type-Options: nosniff |
| Protocol downgrade | HSTS with 2-year max-age + includeSubDomains + preload — see §8 |
| **Cross-origin data theft** | CORS allowlist (no wildcards); origin reflected from allowlist only — see §8 |
| Open redirect | Validate all `redirect` query params against an allowlist; never pass raw to `Response.redirect()` |
| Email injection | Resend SDK escapes headers; never concatenate user input into raw email headers |
| Logging secrets | No `console.log(req.body)`; structured logger redacts password/token fields; no tokens in URLs — see §6, §10 |
| **Leaked secret in git history** | Pre-commit secret scanning; rotation (not deletion) is the response to any committed secret — see §10 |
| **Leaked secret in client bundle** | Pre-deploy build scan of `.next/static/` for any env var value — see §10 |

---

## 13. Self-Attack Checklist (Before Shipping)

Run these manually against a deployed Vercel preview before declaring done:

- [ ] Submit signin with wrong password 6 times rapidly — 6th request returns 429.
- [ ] Submit signin with no body / malformed JSON — returns 400, not 500.
- [ ] Submit signin with `email: ""` — returns 400 (Zod rejects).
- [ ] Submit signin with a 10KB email string — returns 400 (Zod max length).
- [ ] Click a verification link after 16 minutes — returns "expired" error + resend option.
- [ ] Click the same verification link twice — second click fails (single-use).
- [ ] Submit forgot-password for a non-existent email — same success response as a real email.
- [ ] Inspect the network response on login failure — error reads *"We could not sign you in. Please check your details and try again."*, no internal details.
- [ ] Inspect the DB after signup — `password` field is a bcrypt hash starting with `$2b$12$`.
- [ ] Inspect cookies after login — session cookie is HttpOnly, Secure (in prod), SameSite=Lax.
- [ ] Inspect every URL after login — no session token, JWT, or refresh token appears in any path or query string.
- [ ] Open `/dashboard` without a session — redirects to `/login`.
- [ ] Open `/dashboard` with a session but `emailVerified = null` — redirects to verification screen.
- [ ] Click "Logout" — session cookie is gone; reload `/dashboard` redirects to `/login`. If using refresh tokens, the old refresh token no longer works.
- [ ] **(Authorization)** If any user-scoped resource route exists, request another user's resource by ID — server returns 404, not 403, and no resource data.
- [ ] **(Authorization)** POST to any update endpoint with an extra field the schema doesn't allow (e.g. `role: "admin"`) — server returns 400 (Zod `.strict()` rejects unknown keys).
- [ ] **(HSTS)** Inspect response headers on any production route — `Strict-Transport-Security` is present with `max-age=63072000; includeSubDomains; preload`.
- [ ] **(CORS)** Send a request from a non-allowlisted origin via curl with `Origin: https://evil.example` — server does not return permissive `Access-Control-Allow-Origin` reflecting that origin.
- [ ] **(Bundle scan)** Run `npm run build` then `grep -r "$NEXTAUTH_SECRET" .next/static/` — must produce no matches. Repeat for every secret env var.
- [ ] **(Git history)** Run `gitleaks detect --source .` — must report zero findings.
- [ ] Inspect the GitHub repo — `.env.local` is not present.
- [ ] Inspect Vercel logs — no passwords, tokens, full error stack traces, or token values from URLs visible.
- [ ] Try to embed the site in an iframe on a test page — browser blocks it (X-Frame-Options).
- [ ] Send a POST to `/api/signup` from a different origin via curl — server rejects on origin check (or succeeds, which is acceptable since signup is pre-session; document the choice).

If any check fails: fix before declaring done. Murphy is watching.

---

## 14. When in Doubt

1. **Default to the more restrictive option.** Shorter TTL, stricter rate limit, more generic error.
2. **Add an inline comment** explaining the choice, citing the rule from this file.
3. **Flag the decision** in the PR description so a human can review.
4. **Never disable a security control** to make a test pass. Fix the test, or fix the control properly — never both.

The auth layer is the most expensive thing in the system to get wrong. A bug here is not "we'll patch it next sprint" — it's "users lose their accounts and the company loses trust." Build accordingly.
