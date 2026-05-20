# Skill — Component Builder

> When to use this skill: any time you're about to create a new React component file in `src/components/`. Read this skill *before* creating the file. For visual / style decisions, consult `.agent/rules/design-system.md` — this skill defers all styling to that file.

---

## 0. Scope

This skill covers **scaffolding** — file location, naming, prop typing, server-vs-client boundary, accessibility hooks, error/loading states. It does **not** cover colors, spacing, radius, or any other visual token; those live in `tokens.css` and the rules in `design-system.md`.

The split is deliberate. Style values change with redesigns. Scaffolding patterns don't.

---

## 1. Decision Tree — Where Does the Component Live?

```
You need a new component. Ask in order:

1. Is it a route-specific component (used by exactly one page)?
   YES → src/app/<route>/_components/<Name>.tsx   (private to that route)
   NO  → continue

2. Is it an atomic UI primitive (button, input, label, spinner, badge)?
   YES → src/components/ui/<Name>.tsx
   NO  → continue

3. Is it a composed form (signup form, login form, reset-password form)?
   YES → src/components/forms/<Name>.tsx
   NO  → continue

4. Is it a feature component reused across multiple routes (PasswordStrength, AuthCard)?
   YES → src/components/<Name>.tsx
   NO  → STOP. Surface to a human before creating it — you may be inventing a category.
```

The `_components/` folder convention (underscore prefix) tells Next.js not to treat the folder as a route segment — useful for route-private components.

---

## 2. File Naming and Export Rules

| Rule | Example |
|---|---|
| File name in PascalCase | `PasswordStrength.tsx`, not `password-strength.tsx` |
| File name matches the primary export | `PasswordStrength.tsx` exports `PasswordStrength` |
| Named export, not default | `export function PasswordStrength(...)`, not `export default` |
| One component per file | If you need a sub-component, extract it to a sibling file or keep it private inside the same file (not exported) |
| No `index.ts` barrel files | Imports go direct to the component file — barrel files break tree-shaking and slow type-checking |

The only place a default export is acceptable is for Next.js page/layout/route files, which the framework requires.

---

## 3. Server vs Client — Decide Before You Type

This decision controls everything else. Get it wrong and the build breaks at runtime, not compile time.

### Default to Server Component

If you can write the component without:
- `useState`, `useReducer`, `useEffect`, `useMemo`, `useCallback`
- Event handlers (`onClick`, `onChange`, `onSubmit`)
- `useSession()` from NextAuth
- Browser APIs (`window`, `document`, `localStorage`)

…then it's a Server Component. No `'use client'` directive at the top. Server Components can be `async` and can `await` Prisma queries directly.

### Add `'use client'` when needed

```tsx
"use client";

import { useState } from "react";
// ...
```

The directive goes on the **first line** of the file (above all imports). Once present, the entire file and everything it directly imports becomes part of the client bundle.

### Critical boundary rules

- A Server Component **can render** a Client Component.
- A Client Component **cannot render** a Server Component as a child, but it **can receive** one as a prop (typically `children`).
- A Client Component **must not import** `@/lib/prisma`, `@/lib/auth`, or anything that reads `process.env.*` (except `NEXT_PUBLIC_*` vars).

### Common SecureGate components and their boundary

| Component | Boundary | Reason |
|---|---|---|
| `Button` | Server Component | No state. Stateful behavior comes from the parent form. |
| `Label`, `Spinner`, `Badge` | Server Component | Pure presentation. |
| `TextInput` (with controlled value + onChange) | Client Component | Wires an `onChange` handler to a host `<input>` — DOM event listeners can only be attached from client code, so the component itself must be in the Client bundle. |
| `PasswordStrength` | Client Component | Recomputes on every keystroke. |
| `SignupForm`, `LoginForm`, `ResetPasswordForm` | Client Component | Has `useState`, `onSubmit`, fetch calls. |
| `AuthCard` (the container with header + form + footer) | Server Component | The card itself is structural; the form inside is the Client Component. |

> Page-level files (`src/app/**/page.tsx`) are out of scope for this skill — see [architecture.md §3](../../rules/architecture.md) for their server/client rules.

---

## 4. Prop Typing — Two Patterns

### Inline type for simple components (≤ 3 props, no reuse of the type)

```tsx
export function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return <label htmlFor={htmlFor}>{children}</label>;
}
```

### Extracted `interface` or `type` for complex or reused-type components

Either `interface` or `type` is acceptable for prop shapes — pick one per file and stay consistent ([code-style.md §1](../../rules/code-style.md)). The examples below use `interface`; `type TextInputProps = { ... }` is equally valid.

```tsx
interface TextInputProps {
  id: string;
  label: string;
  type?: "text" | "email" | "password";
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helper?: string;
  autoComplete?: string;
  disabled?: boolean;
}

export function TextInput({
  id,
  label,
  type = "text",
  value,
  onChange,
  error,
  helper,
  autoComplete,
  disabled = false,
}: TextInputProps) {
  // ...
}
```

### Rules
- **Always destructure props at the function signature**, not inside the body.
- **Set defaults at destructuring** (`disabled = false`), not inside the body.
- **Optional props use `?`**, not `| undefined`.
- **No `any`**. Use a union or `unknown`.
- **Children** is typed as `React.ReactNode`, not `JSX.Element` (the latter excludes strings, numbers, fragments).
- **Event handlers** in the prop type are simplified: `(value: string) => void`, not the raw DOM event type, unless the parent genuinely needs the event object.

---

## 5. The Standard Component Skeleton

For a Client Component with state and an event handler:

```tsx
"use client";

import { useState } from "react";

interface MyComponentProps {
  initialValue?: string;
  onSubmit: (value: string) => void;
}

export function MyComponent({ initialValue = "", onSubmit }: MyComponentProps) {
  const [value, setValue] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setIsLoading(true);
    setError(null);
    try {
      await onSubmit(value);
    } catch (err) {
      // Dev-only logging. Never surface `err` directly to the user —
      // see security.md §5 ("Any raw exception message routed to the UI" is forbidden).
      if (process.env.NODE_ENV !== "production") {
        console.error("[component/MyComponent]", err);
      }
      setError("We couldn't complete that action. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>{/* ... */}</div>
  );
}
```

For a Server Component:

```tsx
import { prisma } from "@/lib/prisma";

interface MyComponentProps {
  userId: string;
}

export async function MyComponent({ userId }: MyComponentProps) {
  const data = await prisma.someTable.findUnique({ where: { id: userId } });
  return <div>{/* ... */}</div>;
}
```

---

## 6. Accessibility — Non-Negotiable Hooks

Every component the user can interact with must satisfy these baseline rules. None of them are visual — they all belong here, not in the design system.

| Element | Requirement |
|---|---|
| Every `<input>` | Has a corresponding `<label htmlFor={id}>`. Never use placeholder-as-label. |
| Every interactive element | Has a visible focus indicator (browser default is fine; do not remove it) |
| Every error message | Linked to the input via `aria-describedby` and `aria-invalid="true"` |
| Every helper text | Linked to the input via `aria-describedby` |
| Every loading button | `disabled={isLoading}` plus an accessible loading state — visually a spinner, semantically `aria-busy="true"` and `aria-live="polite"` if the state change should be announced |
| Every dynamic content region (loading → error → success) | Has `aria-live="polite"` on the container so screen readers announce state changes |
| Every icon-only button | Has `aria-label` describing what it does |
| Every form | Has a single `<button type="submit">` (or explicit `type="button"` for non-submit buttons — defaulting to type=submit is a common foot-gun) |
| Tabbable order | Matches visual order. Do not use `tabIndex` to reorder. |

The TextInput pattern with all hooks wired:

```tsx
<div>
  <label htmlFor={id}>{label}</label>
  <input
    id={id}
    type={type}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    aria-invalid={!!error}
    aria-describedby={[error && `${id}-error`, helper && `${id}-helper`].filter(Boolean).join(" ") || undefined}
    autoComplete={autoComplete}
    disabled={disabled}
  />
  {helper && <p id={`${id}-helper`}>{helper}</p>}
  {error && <p id={`${id}-error`} role="alert">{error}</p>}
</div>
```

---

## 7. State Patterns — What Lives Where

| State | Lives in |
|---|---|
| Form field values (controlled inputs that need real-time validation) | `useState` in the form component |
| Form field values (no real-time validation, just submit) | Uncontrolled — read from `FormData` on submit |
| Loading / submitting | `useState` boolean in the form component |
| Server-returned errors | `useState` string-or-null in the form component |
| Authenticated user data | `useSession()` from NextAuth — never duplicate into local state |
| Persistent UI preferences | URL search params (via `useSearchParams`), not `localStorage` |
| Server-fetched data displayed in a Server Component | Direct `await prisma.*` in the Server Component itself |

Avoid global state libraries (Redux, Zustand, Jotai) for SecureGate. The auth surface is small enough that local state + NextAuth session covers everything.

---

## 8. Styling Reference (does not live here)

This skill does not specify colors, spacing, radius, font sizes, or any other visual token. For all of those, consult:

- **`tokens/tokens.css`** — source of truth for visual values
- **`.agent/rules/design-system.md`** — usage rules, component patterns with style code, anti-patterns
- **`DESIGN.md`** — descriptive documentation for intent and rationale

When this skill and `design-system.md` cover the same component (e.g., `TextInput`), this skill defines **structure** (props, accessibility, state) and `design-system.md` defines **appearance** (the actual style values). They compose.

---

## 9. Pre-Commit Self-Check

Before declaring the component done:

- [ ] File is in the correct location per Section 1
- [ ] File name matches the export, both PascalCase
- [ ] Named export, not default (unless it's a Next.js page/layout/route)
- [ ] `'use client'` is present if-and-only-if needed (Section 3)
- [ ] Props are typed (either `interface` or `type` — consistent within the file); defaults are at the destructure
- [ ] No `any`, no `@ts-ignore`
- [ ] Boolean props use JSX shorthand (`<Button disabled />`, not `<Button disabled={true} />`)
- [ ] Every input has a `<label htmlFor>` (Section 6)
- [ ] Every error message has `role="alert"` and is linked via `aria-describedby`
- [ ] Loading state disables the submit button, shows a spinner, and the container has `aria-live="polite"`
- [ ] Tabbable order matches visual order — no `tabIndex` reordering
- [ ] Server Component does not contain hooks; Client Component does not import server-only modules
- [ ] All style values come from `tokens.css` (no raw hex, no raw px) — see `design-system.md`
- [ ] No unguarded `console.*` statements (the dev-only `console.error` in §5 is wrapped in a `NODE_ENV` check)

---

## 10. Related

- **Rules:** `.agent/rules/architecture.md` (folder layout), `.agent/rules/code-style.md` (TypeScript + naming), `.agent/rules/design-system.md` (styling)
- **Workflow:** `.agent/workflows/new-component.md` (the step-by-step procedure for creating a new component file)
