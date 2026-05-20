---
trigger: always_on
---
# Code Style Rules — SecureGate

> Companion files: `architecture.md`, `security.md`, `design-system.md`.

---

## 0. Code Style Directive

1. **TypeScript strict mode is non-negotiable.** No `any`, no `@ts-ignore`, no `@ts-expect-error` without a comment justifying it.
2. **Code must be self-explanatory.** Comments explain *why*, never *what*.
3. **Consistency beats personal preference.** Follow the conventions in this file even when a different style would also work.
4. **Lint and format before declaring done.** `npm run lint` and `npm run format` must pass with zero warnings.

---

## 1. TypeScript

### Strict Settings
`tsconfig.json` must include:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### Types vs Interfaces
- Use `type` for unions, primitives, function signatures, and tuples.
- Use `interface` for object shapes that may be extended.
- Both are fine for component prop shapes; pick one per file and stay consistent.

```ts
// Union → type
type AuthState = "idle" | "loading" | "success" | "error";

// Extensible object → interface
interface User {
  id: string;
  email: string;
}
```

### Return Types
- **Exported functions:** explicit return types.
- **Local/internal functions:** inference is fine when the body is short and obvious.
- **React components:** type `props` explicitly; let the return type be inferred (it's `JSX.Element` or equivalent).

```ts
// Exported — explicit
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

// Local — inference fine
const formatExpiry = (date: Date) => date.toISOString();
```

### Forbidden
- `any` — use `unknown` and narrow, or define the type.
- Non-null assertions (`x!`) — handle the null case explicitly.
- `Object` or `Function` as types — use `Record<string, unknown>` or a specific function signature.
- Type assertions (`as Foo`) on values you control — fix the type instead. Acceptable only at trust boundaries (parsed JSON, third-party libs without types).

### `unknown` over `any`
When you genuinely don't know the type (e.g. parsed JSON):
```ts
const body: unknown = await req.json();
const parsed = signupSchema.safeParse(body);
if (!parsed.success) return badRequest();
// `parsed.data` is now fully typed
```

---

## 2. Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Component file | PascalCase.tsx | `SignupForm.tsx`, `PasswordStrength.tsx` |
| Component export | PascalCase | `export function SignupForm()` |
| Route folder | kebab-case | `forgot-password/`, `reset-password/` |
| Route file | lowercase | `page.tsx`, `route.ts`, `layout.tsx` |
| Utility file | kebab-case.ts | `rate-limit.ts`, `password.ts` |
| Function | camelCase | `hashPassword`, `verifyToken` |
| Constant | UPPER_SNAKE_CASE | `TOKEN_TTL_MS`, `BCRYPT_ROUNDS` |
| Type / Interface | PascalCase, no `I` prefix | `User`, not `IUser` |
| Boolean variable | `is`/`has`/`can` prefix | `isVerified`, `hasExpired`, `canResend` |
| Zod schema | camelCase + `Schema` suffix | `signupSchema`, `resetPasswordSchema` |
| Event handler prop | `on` prefix | `onSubmit`, `onChange` |
| Event handler impl | `handle` prefix | `handleSubmit`, `handleChange` |

### Specifics
- **No abbreviations** in public APIs (`generateResetToken`, not `genRstTok`).
- **Abbreviations allowed** when industry-standard (`url`, `id`, `db`, `jwt`).
- **File-name matches default export:** `SignupForm.tsx` exports `SignupForm`.
- **Test files:** `<unit>.test.ts` next to the unit (if/when tests are added).

---

## 3. Imports

### Order (top to bottom, blank line between groups)
```ts
// 1. External packages
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

// 2. Internal absolute imports (@/)
import { prisma } from "@/lib/prisma";
import { signupSchema } from "@/lib/validations/auth";

// 3. Relative imports (same folder only)
import { formatError } from "./helpers";

// 4. Type-only imports
import type { User } from "@prisma/client";
```

### Rules
- **Always use `@/` for cross-directory imports.** Never `../../../lib/foo`.
- **Relative imports only within the same folder** (`./helpers`, never `../something`).
- **Type-only imports use `import type`** when importing types only — keeps them out of the runtime bundle.
- **No default exports for utilities.** Use named exports. Default exports are acceptable only for page/layout/route components that Next.js requires.

```ts
// WRONG (default export for a utility)
export default function hashPassword() { /* ... */ }

// RIGHT (named)
export function hashPassword() { /* ... */ }
```

---

## 4. React / JSX

### Component Form
- Functional components only. No class components.
- Use named function declarations, not arrow constants, for components.

```tsx
// Preferred
export function SignupForm() {
  return <form>...</form>;
}

// Acceptable but not preferred (acceptable for tiny inline components)
export const Spinner = () => <div className="spinner" />;
```

### Props
- Type props inline for simple cases, extract an interface for complex ones.
- Always destructure props at the top of the function.

```tsx
// Simple — inline type
export function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return <label htmlFor={htmlFor}>{children}</label>;
}

// Complex — extracted
interface TextInputProps {
  id: string;
  label: string;
  type?: "text" | "email" | "password";
  error?: string;
  helper?: string;
  value: string;
  onChange: (value: string) => void;
}

export function TextInput({ id, label, type = "text", error, helper, value, onChange }: TextInputProps) {
  // ...
}
```

### Hooks
- All hooks at the top of the component, before any conditional logic.
- Custom hooks start with `use` (`useDebounce`, `useFormStatus`).
- Custom hooks live next to the component that uses them, or in `src/components/hooks/` if shared.

### Conditional Rendering
- Use ternaries for two-branch cases.
- Use `&&` only when the left side is a real boolean — avoid `array.length && <List />` (renders `0` when empty).

```tsx
// Safe
{items.length > 0 && <List items={items} />}

// Renders "0" when items is empty
{items.length && <List items={items} />}
```

### Lists
- Always provide a stable `key`. Never use array index unless the list is truly static.

### Forms (project-specific)
- Use uncontrolled inputs with `FormData` for simple cases, controlled `useState` for inputs that need real-time validation feedback (e.g. password strength).
- **Never use HTML `<form>` with `action="/api/..."` and full-page reload.** Use `onSubmit` with `preventDefault()` and `fetch`.

---

## 5. Async / Promises

### Rules
- `async/await` over `.then()`. Always.
- Every `await` of an I/O call (DB, network, file) sits inside `try/catch` somewhere up the call stack.
- No floating promises. Either `await` or explicitly `void promise` with a comment.

```ts
// Good
try {
  const user = await prisma.user.findUnique({ where: { email } });
  // ...
} catch (err) {
  console.error("[signup] DB error", err);
  return serverError();
}

// Floating
prisma.user.create({ data }); // missing await
```

### Parallel awaits
Use `Promise.all` for independent operations:
```ts
const [user, token] = await Promise.all([
  prisma.user.findUnique({ where: { email } }),
  generateToken(),
]);
```

---

## 6. Error Handling

### Server-side
- Catch at the route handler boundary.
- Log the full error with a tag identifying the route: `console.error("[api/signup]", err)`.
- Return a **generic** message to the client. Never the raw error.

```ts
try {
  await doStuff();
  return NextResponse.json({ ok: true });
} catch (err) {
  console.error("[api/signup]", err);
  return NextResponse.json({ error: "Could not complete signup" }, { status: 500 });
}
```

### Client-side
- Display user-friendly errors in the UI (see `security.md` for wording rules).
- Never `console.log` an error in production code. Use a logger or remove before commit.

### Custom Error Classes
Define typed errors in `src/lib/errors.ts`:
```ts
export class TokenExpiredError extends Error {
  constructor() {
    super("Token has expired");
    this.name = "TokenExpiredError";
  }
}
```
Use `instanceof` checks rather than string matching.

---

## 7. Comments

### When to comment
- **Why, not what.** The code says what; the comment says why.
- **Security trade-offs.** When choosing a more restrictive option, explain.
- **Non-obvious business rules.** "Token TTL is 15 min per Phase 3 spec."
- **Workarounds.** Link to the issue or upstream bug.

### When NOT to comment
- Restating the function name (`// hash the password` above `await hashPassword(pw)`).
- Marking sections (`// ----- HELPERS -----`). Use file structure instead.
- Commented-out code. Delete it; git has the history.

### TODO comments
- Format: `// TODO(<owner>): <description> — <issue-or-context>`
- Example: `// TODO(alex): switch to argon2 once approved — see ISSUE-42`

---

## 8. File Internal Order

For a typical `.ts` / `.tsx` file:
```ts
// 1. "use client" (if applicable)
"use client";

// 2. Imports (grouped per §3)
import { ... } from "...";

// 3. Types / interfaces local to this file
interface Props { /* ... */ }

// 4. Constants
const MAX_RETRIES = 3;

// 5. Helpers (private to file, not exported)
function formatThing() { /* ... */ }

// 6. Main export(s)
export function Component(props: Props) { /* ... */ }
```

---

## 9. Forbidden Patterns

| Pattern | Why | Use Instead |
|---|---|---|
| `console.log(...)` in committed code | Noise; leaks data | Remove, or use a logger with levels |
| `@ts-ignore` | Hides bugs | Fix the type, or `@ts-expect-error` with explanation |
| `any` | Defeats TypeScript | `unknown` + narrowing, or proper type |
| `Math.random()` for tokens/IDs | Not cryptographically random | `crypto.randomBytes()` (see security.md) |
| `localStorage.setItem("token", ...)` | XSS-readable | HttpOnly cookies via NextAuth |
| Direct `prisma.*` in Client Component | Leaks DB to bundle | Server Component or API route |
| `eval()` / `new Function()` | Code injection risk | Never |
| `dangerouslySetInnerHTML` with user content | XSS | Render as text |
| Empty `catch (err) {}` | Silent failures | Log + handle, or rethrow |
| `// @ts-nocheck` | Disables whole-file type checking | Fix the types |

---

## 10. Formatting

- **Prettier** runs on commit (configured in `.prettierrc`).
- Indent: 2 spaces.
- Quotes: double quotes (`"foo"`), backticks for templates.
- Semicolons: required.
- Trailing commas: `all` (multiline objects, arrays, function params).
- Line length: 100 chars soft cap. Break long JSX attributes onto multiple lines.

### JSX
- One prop per line when more than two props.
- Self-close empty elements: `<input />`, `<br />`.
- Boolean props use shorthand: `<Button disabled />`, not `<Button disabled={true} />`.

```tsx
<TextInput
  id="email"
  label="Email"
  type="email"
  value={email}
  onChange={setEmail}
  error={errors.email}
/>
```

---

## 11. Git Commit Messages

Format:
```
<type>(<scope>): <subject>

<optional body>
```

Types: `feat`, `fix`, `refactor`, `style`, `docs`, `test`, `chore`, `security`.

Examples:
- `feat(auth): add forgot-password flow with 1h reset token`
- `fix(rate-limit): apply limiter before DB lookup in signin`
- `security(tokens): reduce verification TTL from 30m to 15m per spec`

Subject in imperative present tense ("add", not "added" or "adds"). 50 chars max for the subject line.

---

## 12. Self-Check Before Committing

- [ ] No `any`, no `@ts-ignore`, no `console.log`.
- [ ] All imports use `@/` for cross-directory; relative only within the same folder.
- [ ] Every exported function has an explicit return type.
- [ ] Every async I/O is inside `try/catch`.
- [ ] Every error message to the client is generic; full error is logged server-side.
- [ ] No new file lives outside the canonical locations in `architecture.md` §1.
- [ ] No styling values are hardcoded — all reference `tokens.css` (see `design-system.md`).
- [ ] No security shortcuts — `security.md` rules all hold.
- [ ] `npm run lint` passes with zero warnings.
- [ ] `npm run build` succeeds.
