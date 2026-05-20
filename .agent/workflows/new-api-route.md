# Workflow — New API Route

> Step-by-step procedure for creating a new API route in SecureGate. This workflow is the **process**; the `.agent/skills/api-route-scaffolder/SKILL.md` skill is the **expertise**. Follow these steps in order; the skill answers the "how" of each step.

---

## Before You Start

Confirm the route is actually needed.

- Is the operation already covered by NextAuth (`/api/auth/*`)? → Don't add another route.
- Is this a read that could be a Server Component instead? → Prefer the Server Component. Server-side data is fetched directly via Prisma without an API hop.
- Is this idempotent and could be triggered by a GET? → Prefer GET. POST is for state-changing operations.

If the route is genuinely new, proceed.

---

## Step 1 — Pick the Archetype

Refer to `api-route-scaffolder` skill §2. The five archetypes:

| Archetype | Use when |
|---|---|
| A — Pre-session POST | Signup, forgot-password — user is not authenticated yet |
| B — Token-consuming POST | Verify-email, reset-password — dynamic token segment |
| C — Session-required GET | Reading authenticated user data |
| D — Session-required mutation | Updating authenticated user data |
| E — NextAuth catch-all | Already configured — do not customize |

Write down (in the PR description) which archetype you chose. If none fit, stop and surface to a human.

---

## Step 2 — Choose the File Location

Per `.agent/rules/architecture.md` §1:

```
src/app/api/<route-name>/route.ts                # Static route
src/app/api/<route-name>/[param]/route.ts        # Dynamic segment
```

Folder is kebab-case. Filename is always `route.ts` (lowercase, no PascalCase here).

---

## Step 3 — Define or Extend the Zod Schema

Every API route validates input with Zod, even if the client also validates (per `security.md` §4).

Schemas live in `src/lib/validations/<resource>.ts`:

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

- **`.trim().toLowerCase()`** on every email field
- **`.max(...)`** on every string (prevent oversized-payload DoS)
- **`.strict()`** on schemas used for write operations (blocks mass assignment per `security.md` §7)
- **Export the inferred TS type** for use in helper functions

If a suitable schema already exists, extend it rather than duplicating.

---

## Step 4 — Write Business Logic in `src/lib/`, Not in the Route

Route handlers are glue. The actual work lives in `src/lib/<domain>.ts` helper functions.

Example: for a signup route, the helper might be:

```ts
// src/lib/signup.ts
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { issueVerificationToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/email";
import type { SignupInput } from "@/lib/validations/auth";

export async function createAccount(input: SignupInput) {
  const hashedPassword = await hash(input.password, 12);

  try {
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        password: hashedPassword,
      },
    });

    const { token } = await issueVerificationToken(user.email);
    const verifyUrl = `${process.env.NEXTAUTH_URL}/verify-email/${token}`;
    await sendVerificationEmail({
      to: user.email,
      name: user.name,
      verifyUrl,
    });

    return user;
  } catch (err: any) {
    // Existence-safe: if email is already registered, behave silently
    // (notify the existing user separately if you want; see security.md §5)
    if (err.code === "P2002") {
      // Existing user. Do not throw, do not create. Caller still returns success.
      return null;
    }
    throw err;
  }
}
```

The route handler calls this. The route itself stays thin.

---

## Step 5 — Scaffold the Route Handler

Copy the archetype skeleton from `api-route-scaffolder` skill §5. The skeleton has a fixed order:

1. Rate-limit (before any DB work)
2. Parse body (inside try/catch — malformed JSON returns 400, not 500)
3. Validate with Zod `.safeParse` (never `.parse` — never let validation throw)
4. For session-required routes: check session
5. For dynamic-segment routes: validate the param with its own Zod schema
6. Call the helper from `src/lib/`
7. Return via the helpers in `src/lib/api-responses.ts` — never hand-roll `NextResponse.json`

Do not deviate from this order. The order is the security model.

---

## Step 6 — Wire the Response Helpers

Confirm `src/lib/api-responses.ts` exists. If it doesn't (first API route in the project), create it now using the helpers in `api-route-scaffolder` skill §3.

Every response in your route uses these helpers:
- `ok(data)` for 200 success
- `okWithMessage(text)` for 200 with a user-facing string
- `badRequest()` for 400
- `unauthorized()` for 401 (no session)
- `notFound()` for 404 (resource doesn't exist OR user doesn't own it)
- `rateLimited(seconds)` for 429
- `serverError()` for 500

Status codes follow the table in `api-route-scaffolder` skill §4. The most important rule: **prefer 404 over 403** for any "you can't see this" scenario (per `security.md` §7).

---

## Step 7 — Wire Rate Limiting

Confirm `src/lib/rate-limit.ts` exists with an Upstash limiter configured. The per-endpoint quotas come from `security.md` §3:

| Endpoint | Limit |
|---|---|
| `/api/auth/signin` | 5 / IP / 10 min |
| `/api/forgot-password` | 5 / IP / 10 min |
| `/api/signup` | 10 / IP / hour |
| `/api/reset-password` | 5 / IP / hour |
| `/api/resend-verification` | 3 / email / hour |

If your route fits one of these patterns, use the matching quota. If it doesn't, default to 5/IP/10min and document the choice.

Rate-limiter runs **before** any DB query. A failed DB lookup must still count against the limit.

---

## Step 8 — Mass-Assignment and IDOR Audit

If the route is Archetype C or D (session-required), verify:

- [ ] The `where` clause on user-scoped queries derives identity **from the session**, never from the request body. Specifically: `where: { id: session.user.id }`, never `where: { id: body.userId }`.
- [ ] If the route accepts a resource ID in the URL or body, the query filters by **both** the resource ID AND the session user's ID (`where: { id: params.id, userId: session.user.id }`).
- [ ] If the resource isn't found OR isn't owned by the session user, the response is **404**, not 403.
- [ ] If the route updates resources, the Zod schema uses `.strict()` to reject unknown keys.
- [ ] The query result returned to the client uses `select` to allow-list non-sensitive fields. **The password field is never returned.**

These are the IDOR and mass-assignment rules from `security.md` §7. Violations here are CRITICAL findings.

---

## Step 9 — Error Handling and Logging

Every route ends with a top-level `try/catch`. The catch:

```ts
} catch (err) {
  console.error("[api/route-name]", err);
  return serverError();
}
```

Rules:
- **Tag the log with `[api/route-name]`** — makes Vercel logs greppable.
- **Pass the error object as second arg**, not a string — preserves stack traces.
- **Generic message to the client** — never the raw error.
- **Never log the request body, headers, or any secret** — see `security.md` §10.

---

## Step 10 — Hand-Test the Route

Use `curl` or Postman to hit the route from outside the app. Test these cases:

For a POST route:
- [ ] Valid body, valid session (if required) → 200 (or appropriate success code)
- [ ] Malformed JSON body → 400 ("...your request couldn't be processed")
- [ ] Empty body → 400
- [ ] Body with the right shape but invalid values → 400
- [ ] Body with extra unknown fields (mass-assignment attempt) → 400 (if `.strict()` schema)
- [ ] No session when one is required → 401
- [ ] Trying to access another user's resource (if applicable) → 404
- [ ] Send 6 requests in quick succession (if rate-limited) → 6th returns 429

For a GET route:
- [ ] Authenticated request → 200 with allow-listed fields only
- [ ] No session → 401
- [ ] Trying to fetch another user's resource → 404
- [ ] DB throws → 500 with generic message, full error in server logs

---

## Step 11 — Self-Check Against the Skill Checklist

Run through `api-route-scaffolder` skill §11. Every box must be checkable.

---

## Step 12 — Update the Self-Attack Checklist

If this route introduces a new attack surface, add a corresponding verification step to `security.md` §13. Examples:

- New token-consuming route → add a "replay the same token twice → second call returns 404" check
- New session-required mutation → add a "POST with another user's ID in the body → 404" check
- New rate-limited endpoint → add a "send N+1 requests rapidly → request N+1 returns 429" check

This keeps the pre-shipping security audit in sync with the actual attack surface.

---

## Step 13 — Commit

```
feat(api): add /api/<route-name> for <purpose>
```

If the commit touches both the schema (via Zod schema additions) and the route, mention both:

```
feat(api): add /api/account PATCH for profile updates

- Adds updateAccountSchema with .strict() to validations/auth.ts
- Adds session check + IDOR-safe where clause
- Adds rate limit: 5/IP/10min
```

---

## Common Pitfalls

| Pitfall | Symptom | Fix |
|---|---|---|
| `NextResponse.json` hand-rolled in the route | Inconsistent error shapes across routes | Use helpers from `src/lib/api-responses.ts` |
| `.parse()` instead of `.safeParse()` | Zod errors throw and bubble up as 500s | Switch to `.safeParse()` and handle the result |
| Request body parsed outside try/catch | Malformed JSON returns 500 instead of 400 | Wrap `await req.json()` in try/catch |
| Forgot `.strict()` on a write schema | Mass-assignment: client adds `role: "admin"` and it sticks | Add `.strict()` to every write schema |
| `where: { id: body.userId }` on a session-required mutation | User can update other users' resources | Always `where: { id: session.user.id }` |
| Returning full user object including password hash | Password hash leaked in API response | Use `select` to allow-list non-sensitive fields |
| Rate-limit running after the DB query | A failed lookup doesn't count toward the limit | Move rate-limit to the top of the handler |
| 403 instead of 404 on unauthorized access | Confirms the resource exists | Return 404 consistently |
| Catching errors but not logging | Production failures are invisible | `console.error("[api/route]", err)` before returning |
| Generic catch returning `err.message` | Stack trace leaked to the client | Return a generic message; log the error server-side |

---

## Related

- **Skill:** `api-route-scaffolder` — the how-to expertise this workflow walks through
- **Skill:** `nextauth-integration` — when your route needs to read the session via `getServerSession`
- **Skill:** `prisma-auth-schema-and-migrations` — when your route touches the auth tables
- **Rule:** `.agent/rules/architecture.md` §5 (base route skeleton)
- **Rule:** `.agent/rules/security.md` (every section applies)
- **Rule:** `.agent/rules/code-style.md` (TypeScript, async, error handling)
