# Skill — DB Migration Runner

> When to use this skill: any time you're about to run a Prisma migration command, change the schema after Phase 1, resolve a migration conflict between branches, or deploy a schema change to production. This skill covers the **operational** side of migrations (commands, procedure, rollback). For the SecureGate-specific schema content (the three auth models, atomic-consumption transactions), see the `prisma-auth-schema-and-migrations` skill — they are designed to complement, not duplicate.

---

## 0. Scope

This skill is about **running migrations safely**. It covers:

- Which Prisma CLI command to use in which situation
- The procedure for adding, renaming, deleting columns without breaking running code
- Handling merge conflicts when two branches both introduce migrations
- The production migration procedure (different commands, different stakes)
- Rollback decisions when a migration goes wrong

What this skill does **not** cover:
- The SecureGate schema design itself — see `prisma-auth-schema-and-migrations`
- Query patterns or `$transaction` usage — see `prisma-auth-schema-and-migrations` and `security.md` §2
- Connection pooling for serverless — see `architecture.md` §4

---

## 1. The Command Decision Tree

```
You need to do something with the database. Which command?

├── Adding/changing fields in schema.prisma, working locally?
│   → npx prisma migrate dev --name <descriptive-name>
│     Creates a migration file, applies it, regenerates the client.
│     ALWAYS pass --name. Unnamed migrations become "migration_0001" and rot.
│
├── Need to apply already-committed migrations to a fresh local DB?
│   → npx prisma migrate dev
│     Applies any pending migrations without prompting for a new one.
│
├── Deploying to staging or production?
│   → npx prisma migrate deploy
│     Applies pending migrations only. Never creates new ones.
│     Safe to run in CI/CD. NEVER use migrate dev on staging or prod.
│
├── Checking what's pending without applying?
│   → npx prisma migrate status
│     Shows migrations that exist in the migrations folder but haven't run on this DB.
│
├── Pulling the schema from an existing database (rare)?
│   → npx prisma db pull
│     Generates schema.prisma from the DB's current state.
│     Use only when adopting an existing DB; never as a "fix" for migration drift
│     (see §10 for the correct drift-resolution procedure).
│
├── Local prototyping where you don't care about history (forbidden after Phase 1)?
│   → npx prisma db push
│     Syncs schema directly without creating a migration file.
│     STOP. Once you have committed migrations, db push will desync them.
│     The only acceptable time to use this is the very first scaffold; after that,
│     migrate dev only.
│
└── Need to throw away the local DB and start over (DESTRUCTIVE)?
    → npx prisma migrate reset
      Drops the database, recreates it, runs all migrations, then seeds.
      DEV ONLY. Never run this with DATABASE_URL pointing at staging or prod.
      Triple-check the DATABASE_URL value before running.
```

---

## 2. Hard Rules — Never Violate

| # | Rule | Why |
|---|---|---|
| 2.1 | `migrate dev` is **dev only**. Never on staging, never on prod. | It prompts for unnamed migrations and can reset the database. |
| 2.2 | `migrate deploy` is the **only** way to apply migrations to staging or prod. | It is idempotent, non-interactive, and only applies pending migrations. |
| 2.3 | `migrate reset` is **destructive**. | Drops all data. If you run it against the wrong `DATABASE_URL`, you delete production. |
| 2.4 | `db push` is **forbidden after Phase 1**. | It bypasses migration history; the next `migrate dev` will see drift and try to reset. |
| 2.5 | **Always pass `--name` when `migrate dev` will create a new migration.** | Required when there are pending schema changes; not needed when just applying already-committed migrations. Without a name, new migrations get sequential numbers that mean nothing six months later. |
| 2.6 | **Commit generated migration SQL files** in `prisma/migrations/`. | They are the source of truth for what runs in production. |
| 2.7 | **Never hand-edit a migration file after committing it.** | The migration is identified by a content hash; editing creates drift between machines. |
| 2.8 | **Never run a destructive command without verifying `DATABASE_URL`.** | `echo $DATABASE_URL` before `migrate reset` or `prisma db execute`. Saves your job. |
| 2.9 | The `.env` file Prisma reads from is **`.env`, not `.env.local`**. | Next.js reads `.env.local`; Prisma CLI does not. Either symlink `.env` → `.env.local`, create a `.env` with `DATABASE_URL` only, or use `dotenv-cli` to load the correct file. |

---

## 3. Schema Change Playbook — Add a Column

How you add a column depends on whether it's **nullable** and whether the table has **existing data** that needs a value.

### Case A — Nullable column, any data

Trivial. One step.

```prisma
model User {
  // ... existing fields
  bio String? // new field, nullable
}
```

```bash
npx prisma migrate dev --name add_user_bio
```

Done. Existing rows have `bio = NULL`; new code reads it as `null`.

### Case B — Non-nullable column with default, any data

Still one step — the default fills existing rows.

```prisma
model User {
  // ...
  failedLoginCount Int @default(0) // new field, defaulted
}
```

```bash
npx prisma migrate dev --name add_user_failed_login_count
```

### Case C — Non-nullable column without default, existing data

**This is the dangerous one.** A naive add will fail because existing rows can't satisfy the constraint.

Run in **three migration steps across two or three deploys** (the backfill in Step 2 can ride with Step 1 if you ship it as a data-migration SQL file alongside the schema change; otherwise it's its own deploy):

**Step 1 — Add as nullable.** Ship to production. Existing rows have NULL.

```prisma
model User {
  // ...
  twoFactorMethod String? // added nullable
}
```

```bash
npx prisma migrate dev --name add_user_two_factor_method_nullable
```

**Step 2 — Backfill with code or a data migration.** Run after the nullable column ships:

```ts
// scripts/backfill-two-factor-method.ts
await prisma.user.updateMany({
  where: { twoFactorMethod: null },
  data: { twoFactorMethod: "none" },
});
```

For large tables, batch (Prisma's `updateMany` doesn't support `take`, so `findMany` first):

```ts
let records;
do {
  records = await prisma.user.findMany({
    where: { twoFactorMethod: null },
    take: 1000,
    select: { id: true },
  });
  if (records.length === 0) break;
  await prisma.user.updateMany({
    where: { id: { in: records.map((r) => r.id) } },
    data: { twoFactorMethod: "none" },
  });
} while (records.length > 0);
```

**Step 3 — Tighten the constraint.** After backfill completes and the app has been running on the nullable version without issues:

```prisma
model User {
  // ...
  twoFactorMethod String // now non-nullable
}
```

```bash
npx prisma migrate dev --name make_user_two_factor_method_required
```

This three-step pattern means the running production code never sees a state that violates the schema.

---

## 4. Schema Change Playbook — Rename a Column

**Never rename in a single migration.** Prisma's migrate diff treats a rename as DROP + CREATE, which destroys all existing data in the column.

### The expand-and-contract pattern

**Step 1 — Add the new column.** Ship.

```prisma
model User {
  fullName String? // new column, nullable
  name     String  // old column, still present
}
```

**Step 2 — Backfill the new column from the old one.** Either as a SQL data migration or a code script. Ship.

```ts
await prisma.$executeRaw`UPDATE "User" SET "fullName" = "name" WHERE "fullName" IS NULL`;
```

**Step 3 — Update application code to read/write the new column.** Ship.

**Step 4 — Make the new column non-nullable** (if needed). Ship.

**Step 5 — Drop the old column.** Ship.

```prisma
model User {
  fullName String
  // name column removed
}
```

Yes, that's potentially five deploys for a rename. That's the price of zero-downtime schema changes. For SecureGate this is rare — but when it comes up, this is the only safe way.

---

## 5. Schema Change Playbook — Delete a Column

Same expand-and-contract pattern in reverse:

**Step 1 — Stop writing to the column** in application code. Ship.

**Step 2 — Stop reading from the column** in application code. Ship.

**Step 3 — Drop the column.**

```prisma
model User {
  // password field removed
}
```

```bash
npx prisma migrate dev --name remove_user_legacy_field
```

Wait at least one full deploy cycle between each step. If anything breaks, you can roll back without data loss.

---

## 6. Adding and Removing Indexes

Indexes are cheap to add but **building one on a large table can lock writes**. Prisma generates a standard `CREATE INDEX`; if your User table grows beyond ~100K rows, switch to PostgreSQL's `CREATE INDEX CONCURRENTLY` by editing the generated SQL **before** committing:

```sql
-- Generated by Prisma:
CREATE INDEX "User_email_idx" ON "User"("email");

-- Manually edit to:
CREATE INDEX CONCURRENTLY "User_email_idx" ON "User"("email");
```

This is the one and only acceptable case of editing a migration file — and only before the migration has been applied or committed anywhere.

> **Transaction caveat:** Prisma wraps each migration in a transaction by default, and PostgreSQL forbids `CREATE INDEX CONCURRENTLY` inside a transaction (`CREATE INDEX CONCURRENTLY cannot run inside a transaction block`). The supported workflow is:
> 1. Run `npx prisma migrate dev --create-only --name add_user_email_index` to generate the SQL without applying it.
> 2. Edit the generated `migration.sql` to (a) add `CREATE INDEX CONCURRENTLY` and (b) split the concurrent statement into its own file by removing any surrounding statements (the concurrent statement must be the only one in the migration).
> 3. Run `npx prisma migrate dev` to apply.

For SecureGate's current scale, the standard `CREATE INDEX` is fine. Flagged for future.

---

## 7. Merge Conflict Resolution

The most common conflict scenario:

- Branch A adds migration `20260520143000_add_user_bio/`
- Branch B adds migration `20260520150000_add_user_avatar/`
- Both merge to main. Both timestamps are in the past. The migrations exist as siblings.

This works — Prisma applies them in timestamp order. No conflict.

### The actual conflict scenario

- Branch A and Branch B both branch from the same commit
- Both run `migrate dev --name <something>` locally and get timestamps minutes apart
- A merges to main first
- B rebases. B's migration timestamp is *earlier* than A's, which is now on main.

If B's earlier migration depends on a column A added, applying in timestamp order fails. The fix:

> **Safe only before B's migration has been applied anywhere** — including teammates' machines and any staging environment. After apply, the `_prisma_migrations` table stores the migration's directory name as its identity; renaming the directory on disk creates drift between the filesystem and the table. If B has already been applied somewhere, the only safe path is a corrective migration, not a rename — surface to a human.

1. **Rename B's migration folder** to a timestamp *after* A's:
   ```bash
   mv prisma/migrations/20260520143000_b_thing prisma/migrations/20260520160000_b_thing
   ```
2. **Reset the local DB** and re-apply the full sequence:
   ```bash
   npx prisma migrate reset  # destructive — local only
   npx prisma migrate dev
   ```
   If `schema.prisma` has uncommitted changes that don't match the migration history, `migrate dev` will prompt to create a new migration. This is expected — answer "yes" and the pending changes will be captured as a new migration.
3. **Verify** by running `npx prisma migrate status` — should report "Database schema is up to date."

If you can't reset (e.g., you have local seed data you want to keep), the manual procedure is more involved — surface to a human rather than improvising.

---

## 8. Production Migration Procedure

Different stakes, different commands.

### Pre-deploy checklist

1. **Verify the migration runs cleanly on a staging mirror** of production data. Never deploy a migration that hasn't run successfully on a staging-shape DB first.
2. **Verify automated backups are current.** Most managed Postgres providers (Neon, Supabase, Vercel Postgres, RDS) back up automatically; confirm via the dashboard.
3. **Confirm the migration is non-destructive** by inspecting the generated SQL:
   ```bash
   cat prisma/migrations/<timestamp>_<name>/migration.sql
   ```
   Look for any `DROP COLUMN`, `DROP TABLE`, `ALTER COLUMN ... TYPE` (which can lock the table), or anything that suggests data loss.
4. **Verify `DATABASE_URL` in Vercel** is the production URL, not a stale value pointing somewhere else.

### Deploy

Vercel's build pipeline should run `prisma migrate deploy` as part of the build command. Configure in `package.json`:

```json
{
  "scripts": {
    "build": "prisma generate && prisma migrate deploy && next build"
  }
}
```

This applies any pending migrations during build, before the new code goes live. If the migration fails, the build fails and the new code never serves — failing safe.

> **Partial-deploy caveat:** If the migration succeeds and `next build` fails *afterward*, the database is now on the new schema while the still-serving previous deploy expects the old schema. Rolling back the application to the previous deploy in this state can break the still-serving code. Two mitigations:
> 1. **Use only forward-compatible migrations** (the §3-5 zero-downtime patterns). A nullable column add, a new table, or a new index is forward-compatible — the old code ignores it.
> 2. **For non-forward-compatible changes** (column drops, type changes, NOT NULL tightening), split into a separate "migrate-only" deploy that runs before the code change, so any code rollback lands on a schema the prior code already knew about.

### Post-deploy verification

1. **Run `prisma migrate status`** against production (read-only command):
   ```bash
   DATABASE_URL="<prod-url>" npx prisma migrate status
   ```
   Should report "Database schema is up to date."

2. **Smoke-test the affected feature.** If the migration added a column, sign up a test user and confirm the column is populated correctly.

3. **Watch error logs for the first 15 minutes.** A bad migration manifests as a flood of `PrismaClientKnownRequestError` errors.

---

## 9. Rollback Decision Tree

A production migration just failed. What now?

```
Did the migration apply partially?
│
├── NO (the migration is fully reverted by Prisma's atomic transaction)
│   → Fix the schema, ship a new migration, redeploy. No rollback needed.
│
├── YES (rare — only happens with certain non-transactional DDL like CREATE INDEX
│        CONCURRENTLY or with multi-statement migrations)
│   ├── Is the partial state safe to leave (e.g., an index that didn't finish building)?
│   │   → Leave it, ship a corrective migration that completes the work.
│   │
│   ├── Is the partial state breaking the app?
│   │   ├── Can you roll forward (ship a corrective migration in <30 min)?
│   │   │   → YES → Do it. This is almost always preferable.
│   │   │   → NO  → Restore from the most recent backup. Document the data loss
│   │   │           window. Surface to a human immediately.
```

### Rules

1. **Roll forward, not back, by default.** Restoring a backup loses data created between the backup and now. Shipping a corrective migration almost always wins.
2. **Never delete a committed migration file.** Even if it failed. The git history is the record of what was attempted. Add a new migration that corrects it.
3. **Document every rollback** in `prisma/migrations/README.md` with date, what failed, what was done. Future you will need this.

---

## 10. Common Errors and What They Mean

| Error | What it means | Fix |
|---|---|---|
| `Database schema is not in sync with Prisma schema` | Someone ran `db push` or hand-edited the DB. The migrations folder no longer reflects reality. | Generally requires `migrate reset` (dev) or a hand-written corrective migration (prod). Surface to a human. |
| `Migration ... failed to apply cleanly: P3009` | A migration was applied but marked as failed in the `_prisma_migrations` table. | Inspect the row in `_prisma_migrations`, fix the underlying issue, then `prisma migrate resolve --applied <migration-name>` to mark it healthy. |
| `Cannot find migration directory ...` | The migrations folder is missing or moved. | Check that `prisma/migrations/` is committed and the working directory is the repo root. |
| `Environment variable not found: DATABASE_URL` | Prisma CLI can't find the URL. | Prisma reads from `.env`, not `.env.local`. Add `DATABASE_URL` to both or symlink. |
| `The table ... already exists in the database` | A previous failed migration left tables behind that the new migration tries to create. | In dev, `migrate reset`. In prod, write a corrective migration with `CREATE TABLE IF NOT EXISTS` (hand-edit before applying). |
| `Drift detected` warning | Schema in DB differs from schema in `schema.prisma`. | Usually means someone ran `db push` against a DB with applied migrations. Investigate before proceeding. |

---

## 11. Seed Data

`prisma/seed.ts` runs after `migrate reset` and can be invoked with `npx prisma db seed`. SecureGate's seed file should be minimal — a development admin user and nothing else. **Never commit production seed data** to git.

```ts
// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // `console.error` is permitted here because this is a CLI script run by Prisma,
  // not committed app code. The code-style.md §9 ban on console.* applies to the
  // Next.js app surface (server/client components, route handlers).
  if (process.env.NODE_ENV === "production") {
    console.error("Seed must not run in production");
    process.exit(1);
  }

  await prisma.user.upsert({
    where: { email: "dev@securegate.local" },
    update: {},
    create: {
      email: "dev@securegate.local",
      name: "Dev User",
      password: await bcrypt.hash("dev-password-12345", 12),
      emailVerified: new Date(),
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

The `NODE_ENV === "production"` guard is paranoia, not policy. Belt-and-suspenders against catastrophe.

---

## 12. Pre-Commit Self-Check

Before committing a migration:

- [ ] `prisma migrate dev --name <descriptive-name>` was used (never `db push`, never unnamed)
- [ ] The migration name describes the change in past tense (`add_user_bio`, `make_user_email_unique`)
- [ ] The generated `migration.sql` was inspected for destructive operations
- [ ] If the change adds a non-nullable column to a table with existing data, the three-step pattern (Section 3 Case C) was used
- [ ] If the change renames a column, the expand-and-contract pattern (Section 4) was used
- [ ] The migration file is **not** hand-edited (exception: switching to `CREATE INDEX CONCURRENTLY` for a large table)
- [ ] `npx prisma migrate status` reports clean
- [ ] The local app starts and the affected feature works
- [ ] The migration was tested against a staging-shape database (for non-trivial changes)

---

## 13. Pre-Deploy Self-Check

Before shipping a migration to production:

- [ ] Staging deploy applied the migration cleanly
- [ ] Smoke test on staging confirms the affected feature works
- [ ] Automated backups are current (verified in provider dashboard)
- [ ] The `build` script in `package.json` runs `prisma migrate deploy` before `next build`
- [ ] No `prisma migrate dev` or `db push` is invoked anywhere in CI/CD
- [ ] `DATABASE_URL` in Vercel points at production
- [ ] A rollback plan exists (corrective migration drafted, or backup restore tested)

---

## 14. Related

- **Skill:** `prisma-auth-schema-and-migrations` — the SecureGate schema content (the three models) and atomic-consumption transaction patterns. This skill is the operational complement.
- **Rule:** `.agent/rules/architecture.md` §4 (Prisma singleton), §1 (folder structure)
- **Rule:** `.agent/rules/security.md` §2 (atomic token consumption), §11 (SQL injection — parameterization)
