# Skill — Prisma Auth Schema and Migrations

> When to use this skill: any time you're writing or modifying the Prisma schema for SecureGate, or writing query code that touches the auth tables (`User`, `VerificationToken`, `PasswordResetToken`). For the operational side — which migration commands to run, how to handle merge conflicts, deploying schema changes — see the companion `db-migration-runner` skill. This skill is the *content*; that one is the *procedure*.

---

## 0. Scope

This skill covers:

- The three canonical SecureGate models and exactly how they should be shaped
- The atomic-consumption transaction patterns for tokens (verification + reset)
- Query patterns specific to the auth tables — including the security-critical `select` and `where` rules
- Index strategy for the auth surface
- Why the schema is the way it is (so future changes preserve the invariants)

It does **not** cover:
- Migration commands and procedures → `db-migration-runner` skill
- General code style, naming, async patterns → `.agent/rules/code-style.md`
- Why token hashing and bcrypt rounds are what they are → `.agent/rules/security.md`

---

## 1. The Three Canonical Models

This is the schema as specified in the SecureGate PRD. Place at `prisma/schema.prisma`.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  password      String    // bcrypt hash, never plain text
  emailVerified DateTime?
  createdAt     DateTime  @default(now())

  // No separate @@index([email]) needed — @unique already creates one.
}

model VerificationToken {
  identifier String   // the user's email
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@index([expires])
}

model PasswordResetToken {
  email   String
  token   String   @unique
  expires DateTime

  @@index([email])
  @@index([expires])
}
```

### Field-by-field rationale

**`User.id` as `String @default(cuid())`** — CUIDs are URL-safe, collision-resistant, and don't leak creation order the way auto-increment integers do. UUIDs would also work but CUIDs are shorter and sort lexicographically by creation time, which is convenient.

**`User.email` as `@unique`** — enforced at the DB level so the application code never has to check before insert. The unique constraint makes the signup-existence-leak protection cleaner: when a duplicate is attempted, the DB throws a constraint error, which signup handler can map to the silent-handle behavior (see `security.md` §5).

**`User.password` as plain `String`** — the field holds the bcrypt hash (e.g., `$2b$12$...`), not the plaintext. The Prisma type is `String` regardless; the bcrypt format is enforced in application code at `src/lib/password.ts`. Never type this column with any Prisma-level validator that constrains length — bcrypt hashes are 60 characters but you don't want to fail-closed on a length mismatch at the DB layer.

**`User.emailVerified` as `DateTime?`** — nullable. `null` means "not verified," a timestamp means "verified at this moment." This is the NextAuth convention; do not change it to `Boolean isVerified` even though that feels cleaner. The timestamp is useful for auditing and for future re-verification flows.

**`User.createdAt` as `DateTime @default(now())`** — every table should have this. Forensic value, low cost.

**`VerificationToken.identifier`** — holds the email, not a foreign key to `User.id`. This is intentional and matches the NextAuth conventions. It allows pre-signup verification flows (verify an email before the user record exists) if you ever add them. For SecureGate's current flow, the verification token is created right after signup, but the schema doesn't force a join.

**`VerificationToken.token` as `@unique`** — the token itself is the lookup key. The application code does `findUnique({ where: { token } })` to consume.

**`@@unique([identifier, token])` on VerificationToken** — prevents a duplicate token for the same email from being inserted accidentally. Practical effect is minimal (the `token` unique constraint already prevents collisions across the table) but it documents intent.

**`PasswordResetToken.email`** — same pattern as VerificationToken's `identifier`, but named `email` because there's no NextAuth convention to follow here. Either name works; pick one and stick with it.

**Index on `expires`** for both token tables — supports a periodic cleanup job that deletes expired tokens (`DELETE FROM "VerificationToken" WHERE expires < NOW()`). Without an index, that scan becomes expensive once the table has any size.

---

## 2. Field-Level Constraints That Should Live in Application Code, Not the Schema

Prisma supports some validation in the schema (`@db.VarChar(100)`, regex constraints via `@check` on Postgres). **For SecureGate, almost all validation lives in Zod** (`src/lib/validations/`), not in the schema. Reasons:

1. **Zod errors produce user-friendly messages.** DB constraint violations produce stack traces.
2. **Zod runs before the DB query**, so invalid input is rejected at the API boundary, not after a round-trip.
3. **Zod schemas are reusable** across frontend and backend (with care).
4. **The DB-level constraint runs anyway** as a safety net via `@unique` on email — defense in depth.

The exception is `@unique`: that one belongs at the DB level because race conditions exist between Zod validation and insertion, and only the DB can be authoritative about uniqueness.

---

## 3. Atomic Token Consumption — The Critical Transaction Pattern

The most security-sensitive query in the entire codebase is consuming a verification or reset token. Get this wrong and you get a Murphy's-Law worst case: a token that's been "used" but the user isn't verified, or a password that's been changed but the token still works.

**Always use `prisma.$transaction` for the "consume token + update user" pair.**

### Verification token consumption

```ts
// src/lib/tokens.ts
import { prisma } from "@/lib/prisma";

export async function consumeVerificationToken(token: string) {
  const record = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!record) return null;                          // not found
  if (record.expires < new Date()) {                 // expired
    // Optional: clean up. Not strictly required since the periodic
    // job will catch it, but immediate cleanup is tidier.
    await prisma.verificationToken.delete({ where: { token } });
    return null;
  }

  // Atomic: verify the user AND delete the token in one transaction.
  // If either step fails, both roll back.
  //
  // There is a TOCTOU window between the findUnique above and this
  // transaction: two concurrent requests with the same token could both
  // see it as valid. This is acceptable because the operations inside the
  // transaction are idempotent — setting emailVerified to a new Date twice
  // and deleting an already-deleted token (no-op) produce the same end
  // state regardless of ordering.
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

### Password reset token consumption

```ts
// src/lib/password-reset.ts
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;

export async function consumeResetToken(token: string, newPassword: string) {
  const record = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  if (!record) return null;
  if (record.expires < new Date()) {
    await prisma.passwordResetToken.delete({ where: { token } });
    return null;
  }

  const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await prisma.$transaction([
    prisma.user.update({
      where: { email: record.email },
      data: { password: hashedPassword },
    }),
    prisma.passwordResetToken.delete({ where: { token } }),
  ]);

  return record;
}
```

### Why this pattern is non-negotiable

Without `$transaction`, two failure modes become possible:

1. **Token deleted, user not updated** — the user clicks the link, the token gets removed, but the user update fails (race condition, DB error). The user is now stuck: token gone, account not verified, no path forward without admin intervention.

2. **User updated, token not deleted** — the user is verified (or password changed), but the token still exists in the DB. An attacker who intercepted the link can replay it. Single-use property violated.

`$transaction` makes both operations succeed or both fail. No partial state.

### Important `$transaction` notes

- The array form (`prisma.$transaction([op1, op2])`) is **interactive transactions** — runs the operations sequentially in a real DB transaction. This is what you want.
- The callback form (`prisma.$transaction(async (tx) => { ... })`) lets you read intermediate results between writes. Use this when you need a conditional second write based on the first.
- Transactions have a default timeout (5 seconds). Don't put external API calls inside a transaction.
- Never put a `bcrypt.hash` call inside a `$transaction` array — `hash` is async and the array form expects synchronous Promise creation. Hash before the transaction, like the reset example above.

---

## 4. Query Patterns — User Lookups

### Looking up a user for authentication

```ts
const user = await prisma.user.findUnique({
  where: { email },
});
```

Returns all fields, including the hashed password. This is fine inside the auth flow because the password is needed for `bcrypt.compare`. Never return this user object to the client.

### Looking up a user for display (e.g., dashboard)

```ts
const user = await prisma.user.findUnique({
  where: { id: session.user.id },
  select: {
    id: true,
    name: true,
    email: true,
    emailVerified: true,
    createdAt: true,
    // password is NOT selected — never returned to the client
  },
});
```

**Rule:** any query whose result might end up in an API response **must** use `select` to allow-list non-sensitive fields. The password field is the obvious one to exclude. Never write `prisma.user.findUnique({ where: ... })` without a `select` if the result will be serialized to the client.

### Looking up a user by email — the timing-safe pattern

When checking credentials (login), the application always runs `bcrypt.compare` whether or not the user exists, to prevent timing attacks. See `security.md` §5 for the full pattern. The DB query side is:

```ts
const user = await prisma.user.findUnique({ where: { email } });
// then ALWAYS call bcrypt.compare, with a dummy hash if user is null
```

---

## 5. Token Creation — Single Place to Generate

Token generation lives in one helper, not scattered across routes:

```ts
// src/lib/tokens.ts
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const VERIFICATION_TOKEN_TTL_MS = 15 * 60 * 1000;     // 15 minutes
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;            // 1 hour

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export async function issueVerificationToken(email: string) {
  const token = generateToken();
  const expires = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);

  // Atomic: clear old tokens and create the new one in a single transaction.
  // Without this, a failure between deleteMany and create would leave the
  // user with no valid verification token and no path forward.
  await prisma.$transaction([
    prisma.verificationToken.deleteMany({
      where: { identifier: email },
    }),
    prisma.verificationToken.create({
      data: { identifier: email, token, expires },
    }),
  ]);

  return { token, expires };
}

export async function issueResetToken(email: string) {
  const token = generateToken();
  const expires = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({
      where: { email },
    }),
    prisma.passwordResetToken.create({
      data: { email, token, expires },
    }),
  ]);

  return { token, expires };
}
```

### Why delete-before-insert

If a user requests a second verification email before the first expires, two valid tokens shouldn't coexist — that's two paths to verify the same account, doubling the surface area. Deleting prior tokens for the same email keeps the invariant of "at most one valid token per (table, email) pair."

The pattern applies to both verification and reset.

---

## 6. Expired Token Cleanup

A periodic job should delete expired tokens. Without it, the token tables grow unboundedly even though no row past expiry is ever valid.

For Vercel, this is a cron-style API route invoked by Vercel Cron Jobs:

```ts
// src/app/api/cron/cleanup-tokens/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

export async function GET(req: NextRequest) {
  // Verify the request is from Vercel Cron (see Vercel docs for the auth header)
  if (req.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const now = new Date();

  const [verifications, resets] = await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { expires: { lt: now } } }),
    prisma.passwordResetToken.deleteMany({ where: { expires: { lt: now } } }),
  ]);

  return NextResponse.json({
    ok: true,
    deletedVerifications: verifications.count,
    deletedResets: resets.count,
  });
}
```

Then in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-tokens",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

Runs every 6 hours. Tokens are at most 1 hour stale before cleanup; 6-hour resolution is fine.

For Phase 1-5 implementation, this cron is optional — the indexes on `expires` mean the table stays performant for a long time even without cleanup. Defer to Phase 6 or post-launch.

---

## 7. Schema Evolution — Common SecureGate Cases

When you do need to change the schema, these are the most likely cases and the right patterns. For the operational procedure (which `prisma migrate` command, etc.), see `db-migration-runner` §3–5.

### Adding a tracking field to User

E.g., `failedLoginCount Int @default(0)` for account-locking after N failed attempts. Single migration, defaulted, no backfill needed.

### Adding a relation to User

E.g., a `Session` table for DB-backed sessions instead of JWTs. Requires:

```prisma
model User {
  // ...
  sessions Session[]
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expires])
}
```

`onDelete: Cascade` is important — deleting a user should delete their sessions, otherwise you have orphaned rows pointing at a missing FK.

### Renaming the `name` field

Don't. The cost is high (see `db-migration-runner` §4 — expand-and-contract pattern) and the benefit is minimal. If you find yourself wanting to rename, ask whether the answer is "add a new field with the better name and treat `name` as legacy" instead.

### Adding 2FA

A new field on User:

```prisma
model User {
  // ...
  twoFactorSecret  String?  // null = 2FA not enabled
  twoFactorEnabled DateTime? // timestamp when enabled, null when disabled
}
```

Nullable, defaults to null for existing users. Single migration. The application code branches on whether `twoFactorEnabled` is set.

---

## 8. Indexes — Why Each One Exists

| Index | Why |
|---|---|
| `User.email` (`@unique`) | Login looks up by email on every sign-in. Unique constraint + index in one. |
| `VerificationToken.token` (`@unique`) | Verification flow looks up by token. Unique constraint + index in one. |
| `VerificationToken.expires` | Periodic cleanup job filters by `expires < now()`. Without an index, full scan. |
| `VerificationToken.identifier + token` (composite `@@unique`) | Documents that a (user, token) pair is unique. Defensive against bugs that might insert duplicates. |
| `PasswordResetToken.token` (`@unique`) | Reset flow looks up by token. |
| `PasswordResetToken.email` | Token-issuance deletes prior tokens by email (`deleteMany where: { email }`). Prevents sequential scan. |
| `PasswordResetToken.expires` | Cleanup job. |

What's deliberately **not** indexed:

- `User.id` — already the primary key, has an implicit index.
- `User.createdAt` — no current query filters by creation time. Add later if it becomes needed.
- `User.emailVerified` — could index if a "list unverified users" admin page ever exists. Not currently.

The principle: index where there's a real query that uses the column for filtering or joining. Don't pre-index for hypothetical queries.

---

## 9. Type Augmentation for NextAuth

The type augmentation lives in `nextauth-integration` §9. Refer to that skill for the canonical `src/types/next-auth.d.ts` content and the `tsconfig.json` `include` update needed.

**Duplicating the type declarations here would create a sync hazard** — a change in one file would silently drift from the other. This file does not repeat them.

---

## 10. Common Pitfalls

| Pitfall | What goes wrong | Fix |
|---|---|---|
| Querying without `select`, returning user object to client | Password hash leaked in API response | Always `select` on user queries that get serialized |
| Looking up tokens with `findFirst` instead of `findUnique` | Multiple rows match (shouldn't happen with `@unique`), `findFirst` returns one nondeterministically | Use `findUnique` for unique-constrained columns |
| Forgetting `delete` after token consumption | Token replay attack possible | Use the `$transaction` patterns in Section 3 |
| Using `Date.now()` instead of `new Date()` in `expires` | Type mismatch; Prisma expects `DateTime`, gets `number` | `new Date(Date.now() + TTL_MS)` |
| Comparing `record.expires < new Date()` works but storing `Date.now()` as `number` doesn't | Type system catches this; don't fight it | Use `Date` objects everywhere, convert at the JSON serialization boundary |
| Setting `User.emailVerified` to `true` or `Date.now()` instead of `new Date()` | Schema expects `DateTime?`, gets boolean or number | `new Date()` is the correct value |
| Adding fields without considering Server vs Client serialization | `Date` fields serialize to ISO strings over the wire; the client receives strings, not Dates | Either parse on the client or expose as strings in the API response |

---

## 11. Pre-Commit Self-Check

Before committing a schema change or new query against the auth tables:

- [ ] The schema follows the canonical shapes in Section 1 (no unnecessary deviations)
- [ ] Any new field has a clear rationale (Section 7's "common cases" list, or surface to a human)
- [ ] Token consumption uses `$transaction` per Section 3
- [ ] User queries that return data to the client use `select` to exclude `password`
- [ ] New token-issuing code deletes prior tokens for the same email (Section 5 pattern)
- [ ] New indexes have a query that justifies them (Section 8)
- [ ] Migration was generated via `prisma migrate dev --name <descriptive-name>` (see `db-migration-runner`)
- [ ] If the change adds a relation, `onDelete` behavior is explicit

---

## 12. Related

- **Skill:** `db-migration-runner` — the operational procedures for migrations (commands, schema-change playbook, rollback decisions). This skill is the content; that one is the procedure.
- **Skill:** `nextauth-integration` — the auth configuration that consumes this schema.
- **Rule:** `.agent/rules/architecture.md` §4 (Prisma singleton client)
- **Rule:** `.agent/rules/security.md` §2 (token rules), §5 (existence safety)
- **Rule:** `.agent/rules/code-style.md` (TypeScript conventions for query results)
