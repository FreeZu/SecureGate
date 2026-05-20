# Skill — NextAuth Integration

> When to use this skill: any time you're configuring NextAuth, debugging session behavior, writing the `authorize` function, working on the JWT/session callbacks, or extending the session shape. NextAuth (Auth.js) is the central nervous system of SecureGate — the patterns in this skill control how sessions are created, refreshed, validated, and destroyed.

---

## 0. Scope

This skill covers:

- The full `authOptions` configuration for the Credentials provider
- The `authorize` function — verifying credentials against the database
- The JWT and session callbacks — what data flows from the database into the token into the client session
- The `pages` configuration — routing NextAuth's UI to SecureGate's custom auth pages
- Session strategy choice (JWT vs database) and the trade-offs
- Type augmentation so `session.user.id` and `session.user.emailVerified` are typed
- Middleware integration for protecting `/dashboard`
- Sign-out behavior
- Common debugging signatures

What this skill does **not** cover:
- The OAuth providers (Google, GitHub, etc.) — SecureGate uses Credentials only
- 2FA — not in current scope
- Magic links — not in current scope
- The database schema NextAuth would use for the database session strategy — see `prisma-auth-schema-and-migrations` if/when that strategy is chosen

---

## 1. Session Strategy — JWT vs Database

NextAuth supports two session strategies. **Pick one before writing any other code.** The choice cascades into the schema, the callbacks, the middleware, and the logout behavior.

### JWT strategy (recommended for SecureGate)

The session is a signed JWT stored in an HttpOnly cookie. The server can verify the cookie by checking the signature alone — no DB query per request.

**Pros:**
- No DB round-trip on every authenticated request
- Simpler schema (no `Session`, `Account` tables needed)
- Works well with edge runtimes (Vercel Edge)

**Cons:**
- No immediate session revocation. If you change a user's password, their existing JWT is still valid until it expires.
- Token contents are visible to anyone who decodes the JWT (it's signed, not encrypted by default).

### Database strategy

The session is a row in a `Session` table; the cookie carries an opaque session ID. Every request looks up the row.

**Pros:**
- Immediate revocation (delete the row, the session is dead)
- No data leaks via JWT inspection
- Per-session metadata possible (last-used IP, device fingerprint)

**Cons:**
- DB query per authenticated request
- Requires three extra Prisma models (`Account`, `Session`, plus changes to `User`)
- Slightly more setup

### Recommendation for SecureGate: **JWT**

Reasoning:
- SecureGate doesn't currently need immediate session revocation
- The schema stays minimal (the three PRD-specified models, no `Session` table)
- Logout still works correctly with JWT — the cookie is cleared client-side, and even if intercepted, the JWT can be added to a revocation list in a future iteration

**Document this choice in `README.md`** so the next person (or AI) understands the trade-off.

The rest of this skill assumes JWT strategy unless explicitly noted.

---

## 2. File Locations

```
src/
├── app/
│   └── api/
│       └── auth/
│           └── [...nextauth]/
│               └── route.ts            # Thin handler — exports the NextAuth handler
├── lib/
│   └── auth.ts                          # authOptions live here — all configuration
├── types/
│   └── next-auth.d.ts                   # Type augmentation for session.user
└── middleware.ts                        # Protects /dashboard
```

**Rule:** all NextAuth configuration lives in `src/lib/auth.ts`. The route file is two lines.

---

## 3. The Catch-All Route Handler

`src/app/api/auth/[...nextauth]/route.ts` is intentionally minimal:

```ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
```

That's the entire file. Do not add business logic here. NextAuth handles `/api/auth/signin`, `/api/auth/signout`, `/api/auth/csrf`, `/api/auth/session`, etc. through this single catch-all.

---

## 4. The Full `authOptions` Configuration

`src/lib/auth.ts`:

```ts
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";              // Validated env (see security.md §10)
import { loginSchema } from "@/lib/validations/auth";

// A valid-format bcrypt hash that will never match. Used in the timing-attack
// mitigation when the user is not found. See security.md §5.
const DUMMY_HASH = "$2b$12$" + "x".repeat(53);

export const authOptions: NextAuthOptions = {
  // 1. Session strategy
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  // jwt.maxAge is redundant with session.maxAge when strategy is "jwt" —
  // the session config already drives expiry. Both are set here to make
  // the intent explicit and to survive a future strategy change.
  jwt: {
    maxAge: 7 * 24 * 60 * 60,
  },

  // 2. Secret — read from the validated env module so the app fails fast at
  //    boot if NEXTAUTH_SECRET is missing or too short (see security.md §10).
  secret: env.NEXTAUTH_SECRET,

  // 3. Custom pages — point NextAuth to SecureGate's own UI
  pages: {
    signIn: "/login",
    signOut: "/login",
    error: "/login",          // ?error=... query param surfaces failure
    // verifyRequest is not used (Credentials provider, not Email)
    // newUser is not used (signup is a custom route, not NextAuth-driven)
  },

  // 4. The Credentials provider
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        // Note: these labels/placeholders only render on NextAuth's default
        // sign-in page. Since SecureGate uses pages.signIn: "/login" to
        // redirect to a custom form, this object is effectively dead code
        // for the UI. It's kept because NextAuth requires it for the provider
        // definition to function correctly.
      },
      async authorize(credentials) {
        // Server-side validation of the credentials shape.
        // Never trust the client to have validated.
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          // Return null = generic failure. NextAuth maps this to the
          // sign-in error page with no detail leaked.
          return null;
        }

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        // Constant-time comparison. Even if the user does not exist, run
        // bcrypt.compare against a dummy hash so timing does not leak
        // existence. See security.md §5.
        const isValid = user
          ? await bcrypt.compare(password, user.password)
          : await bcrypt.compare(password, DUMMY_HASH);

        if (!user || !isValid) {
          // Generic failure. Never disclose which check failed.
          return null;
        }

        // Return value becomes `user` in the jwt callback.
        // Allow-list the fields we want to carry into the token.
        // NEVER include the password, even hashed.
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
        };
      },
    }),
  ],

  // 5. Callbacks — control what flows from authorize into the JWT into the session
  callbacks: {
    async jwt({ token, user }) {
      // `user` is only present on initial sign-in. On subsequent requests,
      // we already have `token` from the cookie and don't need to do work.
      if (user) {
        token.id = user.id;
        token.emailVerified = user.emailVerified;
      }
      return token;
    },

    async session({ session, token }) {
      // Copy from JWT into the session object that gets sent to the client.
      // Never put sensitive data here — the JWT body is decodable.
      if (session.user) {
        session.user.id = token.id;
        session.user.emailVerified = token.emailVerified;
      }
      return session;
    },
  },

  // 6. Cookies — keep NextAuth defaults (HttpOnly, Secure, SameSite=Lax).
  // No override needed unless you're hosting on a subdomain pattern that
  // requires `domain` config. SecureGate's single domain works with defaults.

  // 7. Debug — only in dev
  // NODE_ENV is framework-managed; using process.env directly is safe here
  // because it's never a secret and doesn't need env-module validation.
  debug: process.env.NODE_ENV === "development",
};
```

### Walk through what each block does

**`session.strategy`** controls whether the session is a JWT or a DB row. Once you pick `jwt`, the `adapter` field is not needed.

**`secret`** signs every JWT issued. Must be at least 32 random characters. Generate with `openssl rand -base64 32`. Rotating this secret invalidates every active session.

**`pages.signIn: "/login"`** tells NextAuth: whenever you would redirect to your built-in sign-in page, redirect here instead. SecureGate's `/login` calls `signIn("credentials", { ... })` from a client-side form.

**`pages.error: "/login"`** sends auth errors back to the login page with `?error=...` in the URL. The login UI reads the error code and shows the appropriate (generic) message.

**`authorize` returning `null`** triggers a sign-in failure that NextAuth handles by appending `?error=CredentialsSignin` to the page URL. Returning a user object means success.

**`jwt({ token, user })`** runs every time a JWT is created (sign-in) or read (every authenticated request). The trick is that `user` is only defined on the very first call (during sign-in); on subsequent calls, only `token` is passed. That's why we only copy fields when `user` is present.

**`session({ session, token })`** runs every time the client requests `getSession()` or `useSession()`. It shapes the session object sent to the client. Don't put anything sensitive in here — the JWT body is base64-encoded, not encrypted.

---

## 5. The Login Form — How the Client Calls `signIn`

```tsx
// src/components/forms/LoginForm.tsx
"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  // useSearchParams requires a Suspense boundary in the parent page.
  // Wrap this component (or the page that renders it) in <Suspense> to
  // avoid the Next.js 14 client-side bailout warning.
  // Example: <Suspense fallback={<div>Loading...</div>}><LoginForm /></Suspense>
  const rawCallbackUrl = params.get("callbackUrl") ?? "/dashboard";
  // Open-redirect guard: only honor same-origin relative paths.
  // `//evil.example` is rejected (protocol-relative URL); `https://...` is rejected.
  const callbackUrl =
    rawCallbackUrl.startsWith("/") && !rawCallbackUrl.startsWith("//")
      ? rawCallbackUrl
      : "/dashboard";
  const errorParam = params.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    errorParam ? "We could not sign you in. Please check your details and try again." : null
  );

  // Clean the ?error= query off the URL after we've read it once — otherwise
  // it lingers in browser history and analytics referrers, signaling to
  // observers that this user hit a sign-in failure.
  useEffect(() => {
    if (errorParam) {
      router.replace("/login");
    }
  }, [errorParam, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false, // we'll redirect manually so we can show errors
    });

    setIsLoading(false);

    if (!result?.ok) {
      setError("We could not sign you in. Please check your details and try again.");
      return;
    }

    router.push(callbackUrl);
    router.refresh(); // forces server components to re-render with the new session
  }

  return (/* ... form JSX ... */);
}
```

### Three rules for the login form

1. **`redirect: false`** in the `signIn` call so you can handle the success/failure in the form itself. The default behavior redirects on the server-rendered NextAuth page, which loses control of the UX.
2. **`router.refresh()` after success.** This re-fetches all server components on the page, ensuring they see the new session. Without it, the user is "signed in" but server components still think they're anonymous until the next navigation.
3. **The same generic error message for every failure mode.** Never branch on `result.error` to show different messages — that breaks existence-safety.

---

## 6. Reading the Session — Server vs Client

### In a Server Component

```ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    // Shouldn't happen — middleware should have redirected.
    // But belt-and-suspenders.
    return null;
  }
  return <div>Welcome, {session.user.name ?? "User"}</div>;
}
```

`getServerSession(authOptions)` is the canonical way to read the session in Server Components and API routes. Pass `authOptions` so it uses your callbacks; without that argument, the session shape will be the default (no `id`, no `emailVerified`).

### In a Client Component

```tsx
"use client";

import { useSession } from "next-auth/react";

export function UserBadge() {
  const { data: session, status } = useSession();

  if (status === "loading") return <span>...</span>;
  if (status === "unauthenticated") return null;

  return <span>Signed in as {session?.user.name}</span>;
}
```

`useSession` requires a `<SessionProvider>` somewhere in the tree. `SessionProvider` is a Client Component — it cannot be rendered directly from a Server Component layout. Use a separate provider wrapper:

```tsx
// src/app/providers.tsx
"use client";
import { SessionProvider } from "next-auth/react";
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

```tsx
// src/app/layout.tsx — stays a Server Component
import { Providers } from "./providers";
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
```

---

## 7. Protecting `/dashboard` — Middleware

`src/middleware.ts`:

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { env } from "@/lib/env";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/dashboard")) {
    const token = await getToken({
      req,
      secret: env.NEXTAUTH_SECRET,
    });

    // Not signed in: send to login with a callback URL
    if (!token) {
      const url = new URL("/login", req.url);
      url.searchParams.set("callbackUrl", req.url);
      return NextResponse.redirect(url);
    }

    // Signed in but email not verified — redirect to a page prompting
    // the user to check their inbox for the verification link.
    // Create this page at src/app/(auth)/verify-email-required/page.tsx
    // in Phase 3.
    if (!token.emailVerified) {
      return NextResponse.redirect(new URL("/verify-email-required", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
```

### Two important details

**`getToken` from `next-auth/jwt`** — not `getServerSession`. Middleware runs on the Edge runtime, which doesn't support all Node APIs. `getToken` is the Edge-compatible alternative.

**The `matcher` config** — limits middleware to only the routes it actually needs to inspect. Running middleware on every request (including static assets) is expensive and unnecessary.

---

## 8. Sign-out

```tsx
"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button onClick={() => signOut({ callbackUrl: "/login" })}>
      Log out
    </button>
  );
}
```

`signOut` does three things:
1. Calls the server endpoint that invalidates the cookie
2. Clears the cookie client-side
3. Redirects to `callbackUrl`

For the JWT strategy, the "invalidation" is purely cookie clearing — the JWT itself is still valid until its `maxAge` expires. If you switch to database sessions, `signOut` also deletes the session row.

---

## 9. Type Augmentation — Non-Negotiable

Without this file, `session.user.id` and `session.user.emailVerified` will be `undefined` in TypeScript. With it, they're properly typed everywhere.

`src/types/next-auth.d.ts`:

```ts
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      emailVerified: Date | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    emailVerified: Date | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    emailVerified: Date | null;
  }
}
```

Make sure `tsconfig.json` includes this file:

```json
{
  "include": ["next-env.d.ts", "src/**/*.ts", "src/**/*.tsx", "src/types/**/*.d.ts"]
}
```

---
## 10. Common Debugging Signatures

| Symptom | Likely cause |
|---|---|
| `session.user.id` is `undefined` | Missing the `jwt` or `session` callback that copies fields; or missing the type augmentation |
| Login appears to succeed but `useSession` shows unauthenticated | Forgot `router.refresh()` after `signIn`; or `SessionProvider` is missing from the layout |
| `getServerSession()` returns null in an API route | Called without passing `authOptions` — the default config doesn't include your callbacks |
| Middleware redirect loop between `/login` and `/dashboard` | `pages.signIn` set to `/dashboard` by mistake, or middleware matching `/login` |
| `JWT_SESSION_ERROR` in dev logs | `NEXTAUTH_SECRET` is missing or changed since the last sign-in — clear cookies and try again |
| `CredentialsSignin` error on every sign-in | `authorize` returning null. Add a temporary `console.error("[authorize]", { ok: parsed.success, email: parsed.data?.email })` inside `authorize` to inspect — **never log `credentials` directly, it contains the password.** Remove the line before committing. Likely Zod rejection or wrong-format password compare. |
| Session works in dev but not in prod | `NEXTAUTH_URL` env var missing in Vercel, or set to `http://` instead of `https://` |
| Sign-out clears cookies but `useSession` still returns the old user briefly | Expected — `useSession` is cached client-side. `signOut({ callbackUrl })` with redirect handles this; sub-page navigation does not |

---

## 11. What to Never Do

- **Never put the password (hashed or plain) in the JWT payload.** It's decodable. Allow-list only id, email, name, emailVerified.
- **Never branch on `result.error` from `signIn` to show specific messages.** Generic message for all failures — see `security.md` §5.
- **Never call `signOut` from a Server Component or API route.** It's a client-side function. For server-side logout, redirect to `/api/auth/signout` directly.
- **Never modify `authOptions.callbacks.session` to return database data fetched per-request without considering the perf hit.** Every authenticated request will hit the DB. If you need that, switch to the database session strategy.
- **Never hand-roll a JWT verification.** Use `getToken` (Edge) or `getServerSession` (Node). The library handles signature verification, expiry checking, and rotation correctly.
- **Never use `signIn` without `redirect: false` if you want to handle errors in the UI.** The default redirect loses control of the failure flow.
- **Never call `fetch("/api/auth/signin")` or any NextAuth route directly without going through the `signIn` client function.** The `signIn` function automatically includes the CSRF token required by the Credentials provider. A raw `fetch` bypasses CSRF protection and will be rejected by NextAuth — or worse, if you add custom logic that skips the CSRF check, you open an attack vector.

---

## 12. Pre-Commit Self-Check

Before declaring NextAuth integration done:

- [ ] `src/lib/auth.ts` exports `authOptions` and is imported by both the route handler and `getServerSession` calls
- [ ] `src/app/api/auth/[...nextauth]/route.ts` is the two-line minimal handler
- [ ] Session strategy choice is documented in `README.md`
- [ ] `authorize` validates credentials with Zod before any DB query
- [ ] `authorize` returns only the allow-listed fields (id, email, name, emailVerified) — never the password
- [ ] Timing-attack mitigation: `bcrypt.compare` always runs, with a dummy hash if user not found
- [ ] `jwt` and `session` callbacks copy `id` and `emailVerified` correctly
- [ ] Type augmentation in `src/types/next-auth.d.ts` is in place and the file is in `tsconfig.json` `include`
- [ ] Middleware uses `getToken` (Edge-compatible), not `getServerSession`
- [ ] Middleware checks both authentication AND `emailVerified` for `/dashboard`
- [ ] Login form uses `redirect: false` and handles success/failure in-component
- [ ] Login form calls `router.refresh()` after success to re-render server components
- [ ] All sign-in error UI uses the same generic message regardless of failure mode
- [ ] `NEXTAUTH_SECRET` is ≥32 chars random, set in env, not committed
- [ ] `NEXTAUTH_URL` is set in env and matches the actual host (https in prod)
- [ ] `@/lib/env` module exists, validates `NEXTAUTH_SECRET` (≥32 chars) and `NEXTAUTH_URL` at boot, and is imported by both `auth.ts` and `middleware.ts`

---

## 13. Related

- **Skill:** `prisma-auth-schema-and-migrations` — the User model NextAuth queries against
- **Skill:** `api-route-scaffolder` — for the signup, forgot-password, and other auth-adjacent routes that NextAuth doesn't handle
- **Rule:** `.agent/rules/security.md` §5 (existence safety in error messages), §6 (sessions and cookie flags), §8 (CORS for cross-origin auth), §9 (NextAuth handles CSRF for `/api/auth/*` automatically — do not disable), §10 (validated env module backing `env.NEXTAUTH_SECRET`)
- **Rule:** `.agent/rules/architecture.md` §6 (middleware structure)
- **Rule:** `.agent/rules/code-style.md` (TypeScript conventions, especially around `as` casts and `any`)
