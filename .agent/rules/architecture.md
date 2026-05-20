---
trigger: always_on
---
# Architecture Rules — SecureGate

> Read before creating any new file, route, or module. Companion files: `security.md`, `code-style.md`, `design-system.md`.

## 0. Architecture Directive

1. **The folder structure in Section 1 is canonical.** Do not place files outside the documented locations without surfacing the deviation.
2. **App Router only.** This project uses Next.js 14 App Router. Pages Router (`pages/`) is forbidden.
3. **Server Components are the default.** A component is a Server Component unless it has `'use client'` at the top.
4. **One Prisma client per process.** Always import from `@/lib/prisma`. Never instantiate `new PrismaClient()` elsewhere.
5. **Every API route validates input with Zod before doing anything else.**
6. **No business logic in route handlers beyond orchestration.** Heavy logic lives in `src/lib/` functions that route handlers call.

---

## 1. Canonical Folder Structure

```
securegate/
├── prisma/
│   ├── schema.prisma                      # User, VerificationToken, PasswordResetToken
│   └── migrations/                        # Auto-generated, do not edit by hand
│
├── src/
│   ├── app/                               # Next.js App Router
│   │   ├── layout.tsx                     # Root layout (HTML shell, global providers)
│   │   ├── page.tsx                       # Home page (marketing surface)
│   │   ├── globals.css                    # Imports tokens.css + Tailwind directives
│   │   │
│   │   ├── (auth)/                        # Route group — unauthenticated screens
│   │   │   ├── layout.tsx                 # Centered auth-card shell
│   │   │   ├── signup/page.tsx
│   │   │   ├── login/page.tsx
│   │   │   ├── forgot-password/page.tsx
│   │   │   ├── reset-password/[token]/page.tsx
│   │   │   ├── verify-email/[token]/page.tsx
│   │   │   └── verify-email-required/page.tsx  # Landing for signed-in-but-unverified users (see nextauth-integration skill §7)
│   │   │
│   │   ├── (protected)/                   # Route group — requires auth + verified email
│   │   │   ├── layout.tsx                 # Top-bar nav, session boundary
│   │   │   └── dashboard/page.tsx
│   │   │
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts # NextAuth handler — do not edit beyond config
│   │       ├── signup/route.ts             # POST: create account
│   │       ├── verify-email/route.ts       # POST: consume verification token
│   │       ├── forgot-password/route.ts    # POST: request reset email
│   │       ├── reset-password/route.ts     # POST: consume reset token
│   │       └── resend-verification/route.ts # POST: re-issue verification email
│   │
│   ├── lib/                                # Server-only utilities
│   │   ├── prisma.ts                       # Singleton Prisma client (see §4)
│   │   ├── auth.ts                         # NextAuth config (authOptions export)
│   │   ├── tokens.ts                       # crypto.randomBytes helpers, expiry math
│   │   ├── email.ts                        # Resend wrapper (send + template selection)
│   │   ├── rate-limit.ts                   # Upstash limiter instances + helper
│   │   ├── password.ts                     # bcrypt hash + compare wrappers
│   │   ├── session.ts                      # getCurrentUser, requireVerified helpers
│   │   ├── errors.ts                       # Typed error classes + safe-message mapper
│   │   ├── constants.ts                    # Named constants (TOKEN_TTL_MS, etc.)
│   │   └── validations/                    # Zod schemas — one file per resource
│   │       ├── auth.ts                     # signupSchema, loginSchema
│   │       └── password.ts                 # forgotPasswordSchema, resetPasswordSchema
│   │
│   ├── components/                         # React components
│   │   ├── ui/                             # Atomic primitives (Button, Input, Label, Spinner)
│   │   ├── forms/                          # Composed form components (SignupForm, LoginForm)
│   │   └── PasswordStrength.tsx
│   │
│   ├── emails/                             # React Email templates
│   │   ├── verify-email.tsx
│   │   └── reset-password.tsx
│   │
│   ├── types/                              # Shared TypeScript types
│   │   └── next-auth.d.ts                  # Module augmentation for session.user shape
│   │
│   └── middleware.ts                       # Auth gate + rate-limit dispatch (single file)
│
├── tokens/                                 # Design tokens (top-level — imported by src/app/globals.css)
│   ├── tokens.css                          # SOURCE OF TRUTH for visual values
│   └── tokens.json                         # Same tokens in JSON for Figma sync / build pipelines
│
├── public/                                 # Static assets (favicon, shield mark PNGs)
│
├── .agent/
│   ├── rules/
│   │   ├── architecture.md                 # This file
│   │   ├── code-style.md
│   │   ├── design-system.md
│   │   └── security.md
│   ├── skills/                             # Per-task scaffolders (api-route-scaffolder, component-builder, etc.)
│   └── workflows/                          # Ordered procedures (new-component.md, new-api-route.md)
│
├── .env.local                              # Dev secrets — NEVER commit
├── .env.example                            # Safe placeholder keys — commit this
├── .gitignore                              # Must include .env.local before first push
├── next.config.js                          # Security headers (see security.md §8)
├── tailwind.config.ts                      # Reads from tokens.css via CSS variables
├── tsconfig.json                           # strict: true, paths: { "@/*": ["src/*"] }
├── AGENTS.md                               # Project-wide agent context
└── README.md
```

> `DESIGN.md` is referenced by `design-system.md` as descriptive companion documentation but is not currently present in the repo. If added later, it belongs at the top level alongside `AGENTS.md`. Until it exists, `tokens/tokens.css` is the sole canonical design source.

---

## 2. App Router Conventions

### Route Groups
- `(auth)` groups unauthenticated screens that share a centered-card layout. The parentheses make the segment invisible in the URL.
- `(protected)` groups screens requiring auth. Its `layout.tsx` runs `requireVerified()` from `@/lib/session` and redirects to `/login` if missing.
- **Do not create new route groups** without an explicit shared-layout reason.

### Route-Private Components (`_components/`)
- A component used by exactly one route lives at `src/app/<route>/_components/<Name>.tsx`. The underscore prefix tells Next.js not to treat the folder as a route segment.
- Use this when the component would otherwise pollute `src/components/` with one-off shapes that no other route will ever import.
- Anything reused across two or more routes belongs under `src/components/` per the decision tree in the `component-builder` skill — not under any one route's `_components/`.

### Special Files
| File | Purpose |
|---|---|
| `page.tsx` | Renders the route. One per leaf segment. |
| `layout.tsx` | Wraps child segments. Receives `{ children }`. |
| `route.ts` | API endpoint. Exports HTTP method functions (`GET`, `POST`). |
| `loading.tsx` | Suspense fallback for the segment. Use sparingly. |
| `error.tsx` | Error boundary. Must be a Client Component. |
| `not-found.tsx` | Renders for `notFound()` calls. |

### Dynamic Segments
- Format: `[paramName]` (e.g. `reset-password/[token]/page.tsx`).
- Access via the `params` prop: `({ params }: { params: { token: string } })`.
- Always validate the param with Zod before using it.

### Route Naming
- All route folders are **kebab-case** (`forgot-password`, never `forgotPassword`).
- Dynamic segments are camelCase inside the brackets (`[token]`).

---

## 3. Server vs Client Components

### Default: Server Component
- No `'use client'` directive at the top.
- Can be `async`, can `await` Prisma queries, can read cookies/headers.
- Cannot use `useState`, `useEffect`, event handlers, browser APIs.

### Add `'use client'` only when the component needs:
- React state (`useState`, `useReducer`)
- Effects (`useEffect`)
- Event handlers (`onClick`, `onChange`, `onSubmit`)
- Browser-only APIs (`window`, `localStorage`, `document`)
- `useSession()` from NextAuth (client-side session hook)

### Boundary Rules
- A Server Component can render a Client Component.
- A Client Component cannot render a Server Component (but can receive one as `children` prop).
- **Never** call `prisma.*` or read `process.env.SECRET` from a Client Component.
- Data fetched in a Server Component is passed to Client Components as props.

### Example: form pattern
```tsx
// src/app/(auth)/signup/page.tsx — Server Component (no 'use client')
import { SignupForm } from "@/components/forms/SignupForm";

export default function SignupPage() {
  return <SignupForm />;
}

// src/components/forms/SignupForm.tsx — Client Component
"use client";
import { useState } from "react";

export function SignupForm() {
  const [email, setEmail] = useState("");
  // ... form logic, fetch to /api/signup
}
```

---

## 4. Prisma Singleton Pattern

`src/lib/prisma.ts` must look exactly like this:

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

**Why:** Next.js hot-reload in development creates new module instances; without the global cache, every save spawns a new PrismaClient and exhausts DB connections.

**Rule:** Every other file imports the singleton: `import { prisma } from "@/lib/prisma";`. Never `new PrismaClient()` outside this file.

---

## 5. API Route Pattern

Every `route.ts` in `src/app/api/` follows this skeleton:

```ts
import { NextRequest, NextResponse } from "next/server";
import { someSchema } from "@/lib/validations/auth";
import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  // 1. Rate-limit BEFORE any DB work
  const limited = await rateLimit(req, "signup");
  if (limited) return limited; // returns 429 with Retry-After

  // 2. Parse + validate body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const parsed = someSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // 3. Business logic (call functions in src/lib/*)
  try {
    const result = await doTheThing(parsed.data);
    return NextResponse.json({ ok: true, data: result }, { status: 200 });
  } catch (err) {
    console.error("[api/route-name]", err);
    return NextResponse.json({ error: "Something failed" }, { status: 500 });
  }
}
```

### Rules
- **Order is fixed:** rate-limit → parse → validate → execute → respond. Do not reorder.
- **No business logic inline.** The route handler is glue. Move logic into `src/lib/*` helpers.
- **No `try/catch` swallowing errors silently.** Every catch logs server-side and returns a generic client message.
- **Status codes:** 200 success, 400 client error, 401 unauthenticated, 403 forbidden, 404 not found, 429 rate-limited, 500 server error. Pick the right one.

---

## 6. Middleware (`src/middleware.ts`)

Single file. Two responsibilities:

1. **Auth gate:** Redirect unauthenticated requests for `(protected)` routes to `/login`.
2. **Rate-limit dispatch:** Apply rate-limit checks on `/api/auth/signin`, `/api/forgot-password`, `/api/signup`.

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protected routes
  if (pathname.startsWith("/dashboard")) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
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

**Rules:**
- Do not put route-specific logic in middleware. Middleware handles cross-cutting concerns only.
- Rate-limiting per-route lives in the route handler itself; middleware can optionally short-circuit known abuse patterns but route-level limits are authoritative.

---

## 7. Email Templates

- Location: `src/emails/`
- Each template is a React Email component (functional, typed props).
- Rendered server-side and passed to `resend.emails.send()`.
- **Never** import client-side React features (no hooks, no event handlers).
- Inline styles only — email clients ignore external CSS. Some token values from `tokens.css` will need to be duplicated as inline values here. **This is the only acceptable place to duplicate token values**, and each duplication must have a `// from tokens.css: --color-primary` comment.

---

## 8. Environment Variables

- All sensitive values live in `.env.local` (dev) or the Vercel dashboard (prod).
- **Access only via `process.env.VAR_NAME`** in server-side code.
- **Never reference `process.env` in client components** unless the var starts with `NEXT_PUBLIC_` — and those are non-secrets by definition.
- Add a placeholder line to `.env.example` whenever a new env var is introduced.
- Validate required env vars at app boot (recommended: a `src/lib/env.ts` with a Zod schema that runs on import).

Required vars (see `AGENTS.md` Section 6):
```
DATABASE_URL
NEXTAUTH_SECRET
NEXTAUTH_URL
RESEND_API_KEY
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

---

## 9. Path Aliases

`tsconfig.json` defines:
```json
"paths": { "@/*": ["src/*"] }
```

**Rule:** Always use `@/` for imports from `src/`. Never use relative imports across directories (`../../../lib/prisma`). Relative imports are acceptable only within the same folder (`./helpers`).

---

## 10. Where Does This File Go? — Decision Tree

```
You're about to create a new file. Where does it go?
│
├── Is it a Next.js route (page or API)?
│   ├── Page → src/app/[route-group]/route-name/page.tsx
│   └── API endpoint → src/app/api/endpoint-name/route.ts
│
├── Is it a reusable React component?
│   ├── Atomic primitive (Button, Input) → src/components/ui/
│   ├── Composed form → src/components/forms/
│   └── One-off feature component → src/components/[FeatureName].tsx
│
├── Is it server-side utility logic?
│   └── src/lib/[domain].ts  (one file per domain: auth, email, tokens, etc.)
│
├── Is it a Zod schema?
│   └── src/lib/validations/[resource].ts
│
├── Is it an email template?
│   └── src/emails/[template-name].tsx
│
├── Is it a shared TypeScript type?
│   └── src/types/[domain].d.ts
│
└── Anywhere else?
    └── STOP. Surface the decision to the human before creating it.
```

---

## 11. What Not to Build

- A `pages/` directory anywhere
- A second Prisma client instance
- A new top-level `src/` folder without justification (no `src/services/`, no `src/utils/`, no `src/hooks/` — atomic primitives belong in `components/ui/`, helpers belong in `lib/`)
- Inline SQL — Prisma only
- Custom `_app.tsx` or `_document.tsx` (those are Pages Router)
- Hand-edited Prisma migration SQL files (regenerate via `prisma migrate dev`)
- A `globals.ts` god-file. Domain-specific files in `lib/` instead.
