# Workflow — New Component

> Step-by-step procedure for creating a new React component in SecureGate. This workflow is the **process**; the `.agent/skills/component-builder/SKILL.md` skill is the **expertise**. Follow these steps in order; the skill answers the "how" of each step.

---

## Before You Start

Confirm the component is actually needed. Many UI needs are satisfied by composing existing primitives in `src/components/ui/` rather than introducing a new component. Ask:

- Is this just a styling variation of an existing component? → Add a prop, not a new component.
- Is this used in exactly one place? → It might belong inline or under `src/app/<route>/_components/`.
- Is this a route-specific shape that won't ever be reused? → Keep it route-local.

If after that the component is genuinely new and reusable, proceed.

---

## Step 1 — Decide Where the File Goes

Refer to `component-builder` skill §1. The decision tree resolves to one of:

| Type | Location |
|---|---|
| Route-private | `src/app/<route>/_components/<Name>.tsx` |
| Atomic UI primitive | `src/components/ui/<Name>.tsx` |
| Composed form | `src/components/forms/<Name>.tsx` |
| Feature component | `src/components/<Name>.tsx` |

If none fit, stop and surface to a human — you may be inventing a category.

---

## Step 2 — Decide Server vs Client

Refer to `component-builder` skill §3. The rule is:

> Default to Server Component. Add `'use client'` only if the component needs `useState`, `useEffect`, event handlers, `useSession`, or browser APIs.

Write down (mentally or in the PR description) which boundary you chose and why. If you're not sure, you almost certainly need Client.

---

## Step 3 — Sketch the Props

Before opening the editor, list:

- Required props
- Optional props (with defaults)
- Event handlers (named `on*`)
- Children, if applicable

Decide whether to type the props inline or as an extracted `interface` per `component-builder` skill §4 (rule of thumb: extract if ≥ 4 props or if the type will be reused).

---

## Step 4 — Create the File

Use the appropriate skeleton from `component-builder` skill §5. The two skeletons:

- **Client Component:** `"use client";` directive, `useState` for state, `try/catch` around async handlers
- **Server Component:** no directive, `async function`, can `await prisma.*` directly

File name in PascalCase matching the export. Named export, not default.

---

## Step 5 — Wire Accessibility

Every interactive component must satisfy the accessibility baseline in `component-builder` skill §6. The non-negotiables:

- Every `<input>` has a `<label htmlFor>` (placeholder is not a label)
- Error messages are linked via `aria-describedby` and `role="alert"`
- Loading states disable the button and set `aria-busy`
- Icon-only buttons have `aria-label`
- Single submit button per form, explicit `type` on every button

Do this *while* writing the markup, not after. Bolting it on later usually leaves gaps.

---

## Step 6 — Apply Styles

All visual values come from `tokens.css`. Refer to:

- **`.agent/rules/design-system.md`** for which token to use for which element (lookup tables, component patterns)
- **`tokens/tokens.css`** for the actual variable names

Use Tailwind utility classes mapped to the tokens (preferred) or inline `style={{ ... }}` with `var(--token-name)` (acceptable). Never raw hex, never raw pixels.

If `design-system.md` already has a pattern for the component you're building (Primary Button, TextInput, Auth Card, etc.), use that pattern — don't reinvent.

---

## Step 7 — Add Loading and Error States

If the component is interactive (form, action button), it must handle:

- **Loading:** disabled state, spinner or "...", `aria-busy="true"`
- **Error:** specific message in `var(--color-error)`, linked to the field via `aria-describedby`

Generic errors like "Something went wrong" are forbidden in form fields (per `design-system.md` §4 anti-patterns). Be specific. For auth flows specifically, see `security.md` §5 for the existence-safe wording rules.

---

## Step 8 — Hand-Test the Component

Open the page that renders the component in the browser. Verify:

- [ ] Tab through the component with the keyboard. Focus is visible at every step.
- [ ] If there's a form, submit it without filling required fields. Errors show inline and announce to screen readers.
- [ ] If there's a submit button, click it. Loading state appears.
- [ ] On mobile viewport, layout doesn't break.
- [ ] The component renders correctly in both light and (if applicable) any reduced-motion preferences.

---

## Step 9 — Self-Check Against the Skill Checklist

Run through `component-builder` skill §9. Every box must be checkable.

---

## Step 10 — Commit

Per `.agent/rules/code-style.md` §11, the commit message format is:

```
<type>(<scope>): <subject>

<optional body>
```

Examples:
- `feat(ui): add PasswordStrength indicator component`
- `feat(forms): add SignupForm with email + password fields`
- `refactor(ui): extract Button variants from inline styles`

One component per commit when possible. Easier to review, easier to revert.

---

## Common Pitfalls

| Pitfall | Symptom | Fix |
|---|---|---|
| Created a Client Component when Server would have sufficed | Bundle size grows; component re-renders unnecessarily | Remove `'use client'` and useState if state was only needed for static display |
| Created a Server Component that tries to use `useState` | Build error: "Cannot use useState in a Server Component" | Add `'use client'` directive at the top |
| Forgot `<label htmlFor>` | Screen reader users can't identify the field | Add the label; placeholder is never a substitute |
| Used raw hex color instead of token | Inconsistent with the rest of the system | Refer to `tokens.css` and use `var(--color-...)` |
| Used a hand-rolled spinner with custom timing | Doesn't match other loading states | Use the shared `Spinner` from `src/components/ui/` |
| Form submits without preventDefault | Page reloads, state lost, fetch never fires | `e.preventDefault()` in the submit handler |
| Multiple `<button>` elements without explicit `type` | Default `type="submit"` fires on Enter key in any field | Set `type="button"` on every non-submit button |

---

## Related

- **Skill:** `component-builder` — the how-to expertise this workflow walks through
- **Rule:** `.agent/rules/architecture.md` §1 (folder layout), §3 (server vs client)
- **Rule:** `.agent/rules/code-style.md` (TypeScript, naming, imports)
- **Rule:** `.agent/rules/design-system.md` (styling, accessibility hooks for interactive components)
