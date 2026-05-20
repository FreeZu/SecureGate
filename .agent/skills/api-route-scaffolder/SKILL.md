# Skill — API Route Scaffolder

> When to use this skill: any time you're creating or editing a file under `src/app/api/`. Read this skill alongside `.agent/rules/architecture.md` §5, which defines the base POST handler skeleton. This skill covers the **variants** that base pattern doesn't — GET handlers, dynamic segments, multi-method routes, streaming, error helpers, and the auth-required vs auth-optional split.

---

## 0. Scope

`architecture.md` §5 shows the canonical POST handler. That's the trunk. This skill is the branches:

- GET handlers that return data, not just acks
- Dynamic segments (`[token]`, `[id]`)
- Routes that need session context
- Routes that don't (signup, forgot-password — pre-session)
- Reusable error helpers (so you stop writing `NextResponse.json(...)` by hand)
- Status code selection (the right code, not the convenient one)
- Response shape consistency

`security.md` §2 (Tokens), §3 (Rate Limiting), §5 (Error Messages), and §7 (Authorization & Ownership) cover the security rules these routes must follow. This skill assumes you've read them and focuses on the structural patterns.

---

## 1. File Naming and Method Exports

Every API route lives at `src/app/api/<route-name>/route.ts` (kebab-case folder, always `route.ts` filename). The file exports one named function per HTTP method:

```ts
export async function GET(req: NextRequest) { /* ... */ }
export async function POST(req: NextRequest) { /* ... */ }
export async function PATCH(req: NextRequest) { /* ... */ }
export async function DELETE(req: NextRequest) { /* ... */ }
```

Method exports must be uppercase. Lowercase `get` will compile but Next.js will not route to it.

### One resource per file

`src/app/api/account/route.ts` handles GET, PATCH, DELETE for the account resource. Don't split into `account-update/route.ts` and `account-delete/route.ts` — that violates REST semantics and bloats the file tree.

### Dynamic segments

If you add a route using a dynamic segment (e.g., `src/app/api/resource/[id]/route.ts`), Next.js passes the segment value in `params`:

```ts
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // params.id is the dynamic segment value
}
```

**Always validate `params` with Zod** before using it — a dynamic segment is user input. For a token-shaped segment (64-char hex from `crypto.randomBytes(32).toString('hex')`):

```ts
const tokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
const parsed = tokenSchema.safeParse(params.token);
if (!parsed.success) return notFound(); // invalid shape == doesn't exist (existence-safe)
```

For an `id` segment (cuid), use the cuid regex from your validations module. The general rule: every dynamic segment gets a shape check before any DB call.

> **SecureGate note:** The current API surface uses flat route paths — tokens are sent in the request body, not URL segments. The `(auth)` route group's `[token]` folders are page routes (`page.tsx`), not API routes (`route.ts`). See Archetype B for the body-based token pattern. This keeps tokens out of URL logs and browser history.

---

## 2. Five Route Archetypes for SecureGate

Pick the archetype that matches your route, then fill in the specifics.

### Archetype A — Pre-session POST (signup, forgot-password)
The user is not authenticated yet. Rate-limit by IP. Validate the body. Run the action. Always return the same response regardless of success/failure (for existence-safe routes).

### Archetype B — Token-consuming POST (verify-email, reset-password)
Token is sent in the request body (not a URL segment). Validate the token shape, look it up, check expiry, consume atomically, respond.

### Archetype C — Session-required GET (account, dashboard data)
Requires a valid session. Reads data scoped to `session.user.id`. No body to validate. Always filters by owner (see `security.md` §7 — IDOR rule).

### Archetype D — Session-required mutation (update-profile, change-password)
Requires session. Validates body with `.strict()` Zod schema. Mutates only resources owned by the session user. Re-authenticates for sensitive actions.

### Archetype E — NextAuth catch-all
`src/app/api/auth/[...nextauth]/route.ts` — this is generated and configured via `authOptions` in `src/lib/auth.ts`. Do not write business logic here. See the `nextauth-integration` skill.

---

## 3. Reusable Response Helpers

> **Supersedes architecture.md §5.** The base route skeleton in [architecture.md §5](../../rules/architecture.md) shows hand-rolled `NextResponse.json(...)` calls for brevity. **This skill is the canonical pattern** — use the helpers below, not inline JSON. Treat any conflict between architecture.md §5 and this section as resolved in favor of this section.

Writing `NextResponse.json({ error: "..." }, { status: 400 })` over and over in every route is how inconsistencies sneak in (one route says `error`, another says `message`, a third returns 401 where 400 was correct). Centralize in `src/lib/api-responses.ts`:

```ts
import { NextResponse } from "next/server";

/** 200: successful operation with optional payload */
export function ok<T>(data?: T) {
  return NextResponse.json({ ok: true, data }, { status: 200 });
}

/** 200: successful operation with a user-facing message */
export function okWithMessage(message: string) {
  return NextResponse.json({ ok: true, message }, { status: 200 });
}

/** 400: client sent malformed or invalid input */
export function badRequest(message = "Your request couldn't be processed. Please check the form and try again.") {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

/** 401: not authenticated. Use sparingly — prefer 404 for "exists but you can't see it" (see security.md §7) */
export function unauthorized(message = "Please sign in to continue.") {
  return NextResponse.json({ ok: false, error: message }, { status: 401 });
}

/** 403: request rejected by policy (CSRF origin mismatch, disallowed CORS origin). NOT for ownership/role checks — use notFound() for those. */
export function forbidden(message = "This request was rejected.") {
  return NextResponse.json({ ok: false, error: message }, { status: 403 });
}

/** 404: resource does not exist OR exists but user doesn't own it (existence-safe) */
export function notFound(message = "We could not find what you were looking for.") {
  return NextResponse.json({ ok: false, error: message }, { status: 404 });
}

/** 429: rate-limited. retryAfterSeconds becomes a Retry-After header */
export function rateLimited(retryAfterSeconds: number, message = "Too many requests. Please wait a few minutes before trying again.") {
  return NextResponse.json(
    { ok: false, error: message },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}

/** 500: something went wrong on the server. Always log the full error server-side. */
export function serverError(message = "Something went wrong on our end. Please try again.") {
  return NextResponse.json({ ok: false, error: message }, { status: 500 });
}
```

**Rule:** every route uses these helpers. No hand-rolled `NextResponse.json` calls in route handlers. The consistency makes the client easier to write and prevents drift.

---

## 4. Status Code Selection — When Each One Is Right

| Code | When to use | Example |
|---|---|---|
| 200 | The operation completed and you have a response body | Login success, profile fetched |
| 201 | A new resource was created and its URL is in the `Location` header | Rarely used in SecureGate; signup returns 200 |
| 204 | The operation completed and the response body is empty | Logout (NextAuth handles this) |
| 400 | The request was malformed or failed validation | Zod rejected the body |
| 401 | The user is not authenticated | Hit a protected route without a session |
| 403 | Request rejected by **policy** (CSRF origin mismatch, disallowed CORS origin). **Never** for "you don't own this resource" — that's 404 (see `security.md` §7). |
| 404 | Resource not found, OR exists but the user doesn't own it | IDOR-safe response |
| 405 | The route exists but doesn't support this method | Next.js handles this automatically when you don't export the method |
| 409 | A conflict with current resource state | Rarely used; signup conflicts are silent-handled per `security.md` §5 |
| 429 | Rate limit hit | Brute-force protection |
| 500 | Unhandled server error | The `catch` block of any route |

### Three rules to remember

1. **401 means "no valid session."** Anything that smells like "you don't own this / aren't allowed to see this" returns **404**, not 403.
2. **403 is policy-level only** — CSRF origin failure or disallowed CORS origin. It is a rejection of *the request itself*, not a statement about the resource. Use `forbidden()`.
3. **400 is for the request itself being wrong.** Not for "the operation can't proceed for some business reason" — that's a 200 with `ok: false` and a user-facing message, or sometimes a 404.
4. **500 means we don't know what happened.** Catch + log server-side + return generic.

---

## 5. The Five Archetypes Filled In

### Archetype A — Pre-session POST (e.g., `/api/forgot-password`)

```ts
import { NextRequest } from "next/server";
import { forgotPasswordSchema } from "@/lib/validations/password";
import { rateLimit } from "@/lib/rate-limit";
import { okWithMessage, badRequest, forbidden, rateLimited, serverError } from "@/lib/api-responses";
import { issueResetTokenIfUserExists } from "@/lib/password-reset";

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, "forgot-password");
  if (!rl.ok) return rateLimited(rl.retryAfterSeconds);

  // CSRF check: pre-session routes can't rely on NextAuth's built-in CSRF.
  // Only validate if Origin is present (server-to-server requests omit it).
  // See security.md §9.
  const origin = req.headers.get("origin");
  if (origin && origin !== process.env.NEXTAUTH_URL) {
    return forbidden();
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest();
  }

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) return badRequest();

  try {
    // Always behaves the same whether the user exists or not (existence-safety)
    await issueResetTokenIfUserExists(parsed.data.email);
    return okWithMessage("If an account exists for that email, we've sent a reset link.");
  } catch (err) {
    console.error("[api/forgot-password]", err);
    return serverError();
  }
}
```

### Archetype B — Token-consuming POST (e.g., `/api/verify-email`)

The token is sent in the request body (not a URL segment) to avoid leaking it into server logs, browser history, and referrer headers. The corresponding page at `verify-email/[token]/page.tsx` extracts the token from the URL and POSTs it to this flat API route.

> **Critical:** `consumeVerificationToken` MUST do its "mark user verified + delete token" work inside a single `prisma.$transaction([...])`. A partial state where the token is deleted but the user is not yet marked verified is the worst-case Murphy scenario — the user is locked out with no way to retry. See [security.md §2](../../rules/security.md) for the canonical transaction snippet.

```ts
import { NextRequest } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { okWithMessage, notFound, badRequest, rateLimited, serverError } from "@/lib/api-responses";
import { consumeVerificationToken } from "@/lib/tokens";

const verifyEmailSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, "verify-email");
  if (!rl.ok) return rateLimited(rl.retryAfterSeconds);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest();
  }

  const parsed = verifyEmailSchema.safeParse(body);
  if (!parsed.success) return notFound(); // invalid shape == doesn't exist

  try {
    const result = await consumeVerificationToken(parsed.data.token);
    if (!result) return notFound(); // expired, used, or never existed — all read the same
    return okWithMessage("Your email is verified. You can now sign in.");
  } catch (err) {
    console.error("[api/verify-email]", err);
    return serverError();
  }
}
```

### Archetype C — Session-required GET (e.g., `/api/account`)

```ts
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, unauthorized, serverError } from "@/lib/api-responses";

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  try {
    const account = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, emailVerified: true, createdAt: true },
    });
    if (!account) {
      // Session points to a deleted user. Returning 401 alone leaves a valid-looking
      // session cookie on the client; the next request will hit this branch again.
      // Force a clean logout by clearing the NextAuth session cookie on the response.
      const res = unauthorized();
      res.cookies.delete("next-auth.session-token");
      res.cookies.delete("__Secure-next-auth.session-token"); // production cookie name
      return res;
    }
    return ok(account);
  } catch (err) {
    console.error("[api/account GET]", err);
    return serverError();
  }
}
```

Note the `select` clause — never return the password field, even hashed. Allow-list explicitly.

### Archetype D — Session-required mutation (e.g., `/api/account` PATCH)

```ts
import { NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { ok, badRequest, unauthorized, rateLimited, serverError } from "@/lib/api-responses";

const updateAccountSchema = z.object({
  name: z.string().trim().min(1).max(100),
}).strict(); // unknown keys rejected — blocks mass assignment

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  const rl = await rateLimit(req, "account-update");
  if (!rl.ok) return rateLimited(rl.retryAfterSeconds);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest();
  }

  const parsed = updateAccountSchema.safeParse(body);
  if (!parsed.success) return badRequest();

  try {
    const updated = await prisma.user.update({
      where: { id: session.user.id }, // identity from session, NEVER from body
      data: parsed.data,
      select: { id: true, name: true, email: true },
    });
    return ok(updated);
  } catch (err) {
    console.error("[api/account PATCH]", err);
    return serverError();
  }
}
```

The non-negotiable line is `where: { id: session.user.id }`. Never trust an `id` from the body.

### Archetype E — NextAuth catch-all

`src/app/api/auth/[...nextauth]/route.ts` is short and you should not customize the body. It is:

```ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
```

All configuration goes in `src/lib/auth.ts`. See the `nextauth-integration` skill.

---

## 6. Multi-Method Files

When one route file handles multiple methods, the order is:

```ts
// 1. Imports
// 2. Shared schemas (Zod) at top of file
// 3. GET first
// 4. POST
// 5. PATCH
// 6. PUT
// 7. DELETE
```

Each method handler is independent — don't share helpers between them by defining functions in the same file; extract to `src/lib/` instead. That way the file reads as a flat list of HTTP entry points.

---

## 7. Streaming Responses (Not for SecureGate)

`NextResponse` supports streaming via `ReadableStream`. SecureGate has no use case for this — auth flows are request-response, never long-lived. If you find yourself wanting to stream from an auth endpoint, stop and ask whether you're solving the right problem.

---

## 8. CORS and OPTIONS Preflight

By default, Next.js API routes are same-origin. Browsers won't send cross-origin requests with credentials unless CORS headers explicitly permit it. **Do not add CORS** to a route unless you have a specific cross-origin client (mobile app, partner integration).

If you do need CORS, see `security.md` §8 for the allowlist pattern. Add an `OPTIONS` handler that validates the origin against the allowlist before returning the preflight headers. Never use `Access-Control-Allow-Origin: *`.

---

## 9. Request Body Size Limits

Next.js defaults to 4 MB for API route request bodies. For SecureGate this is far too generous — auth payloads are kilobytes, never megabytes.

In each route, reject oversized bodies early via the Zod max-length constraints on each field. The 10 KB email-string self-attack test in `security.md` §13 exists for this reason.

If you ever add a file-upload route (avatars, etc. — not in current scope), you must explicitly cap `bodyParser` size in the route segment config and validate MIME server-side. Out of scope for now; flagged here so it isn't forgotten.

---

## 10. Logging Inside Routes

The pattern is:

```ts
console.error("[api/<route-name>]", err);
```

Rules:
- **Always include the route tag in square brackets** — makes Vercel logs greppable.
- **Pass the full error object as the second argument**, not the message string — Node's logger formats stack traces from objects but not strings.
- **Never log the request body**. Bodies contain passwords, tokens, PII. If you need partial info for debugging, log allow-listed fields explicitly: `console.error("[api/signup] failed for email", email.slice(0, 3) + "***")`.
- **Never log headers wholesale**. `Authorization`, `Cookie`, `Set-Cookie` carry session-bearing values.

---

## 11. Pre-Commit Self-Check

Before declaring an API route done:

- [ ] File is at `src/app/api/<route-name>/route.ts`, kebab-case folder
- [ ] Method exports are uppercase (`POST`, not `post`)
- [ ] Dynamic segments validated with Zod before use
- [ ] Body parsed inside `try/catch` (a malformed JSON body must return 400, not 500)
- [ ] Body validated with Zod `.safeParse`, never `.parse` (no thrown errors from validation)
- [ ] Write schemas use `.strict()` to block mass assignment
- [ ] Rate-limit runs before any DB query
- [ ] Session check (if applicable) runs before DB queries on user data
- [ ] `where` clauses on user-scoped queries always include `session.user.id` (never trust `id` from the body)
- [ ] `select` clauses on user-fetching queries never include the password field
- [ ] Response uses helpers from `src/lib/api-responses.ts`, not hand-rolled `NextResponse.json`
- [ ] Error logging uses the `[api/<route>]` tag and passes the error object
- [ ] No `console.log` of request body, headers, or any sensitive value
- [ ] Status codes match Section 4 (401 only for "no session"; 404 for "can't see it")
- [ ] Generic user-facing error messages — never raw exception text

---

## 12. Related

- **Rule:** `.agent/rules/architecture.md` §5 (base route skeleton), §6 (middleware)
- **Rule:** `.agent/rules/security.md` (entire file — every route must satisfy these)
- **Rule:** `.agent/rules/code-style.md` (TypeScript, async, error handling)
- **Skill:** `nextauth-integration` (the auth catch-all route — Archetype E)
