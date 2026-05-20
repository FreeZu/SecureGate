# Design Rules — SecureGate

## 0. Source of Truth — Highest Priority

1. **`tokens.css` is the single source of truth for every visual value.** Read it once before starting any styling task. Re-read its section whenever you reach for a value.
2. **Never hardcode a raw style value.** Every color, size, spacing, radius, border, and breakpoint comes from a CSS custom property defined in `tokens.css`.
3. **If a value you need is not in `tokens.css`, STOP.** Do not invent one. Either compose from existing tokens or flag the gap to the human.
4. **`tokens.css` > `DESIGN.md` > anything else.** When in conflict, the CSS file wins. The markdown is documentation; the CSS is canonical.
5. **Tailwind config must read from CSS variables**, never duplicate token values.

### Violation examples — fix on sight

```css
/* WRONG */
.btn { background: #000; padding: 8px 20px; border-radius: 9999px; }

/* RIGHT */
.btn {
  background: var(--color-primary);
  padding: var(--button-padding-y) var(--button-padding-x);
  border-radius: var(--rounded-full);
}
```

```tsx
{/* WRONG */}
<div style={{ color: "#737373", fontSize: 14 }}>...</div>

{/* RIGHT */}
<div className="text-body text-body-sm">...</div>
{/* or */}
<div style={{ color: "var(--color-body)", fontSize: "var(--font-size-body-sm)" }}>...</div>
```

---

## 1. Hard Rules — Never Violate

| # | Rule |
|---|---|
| 1.1 | **All interactive elements use `var(--rounded-full)`.** Buttons, pill inputs, search pill, code-snippet pill, traffic-light dots. No exceptions. |
| 1.2 | **All cards use `var(--rounded-lg)` (12px).** Pricing cards, terminal mockup, auth-form card. |
| 1.3 | **No drop shadows. Anywhere.** Cards lift via 1px `var(--color-hairline)` border OR inverted `var(--color-surface-dark)` fill. Nothing else. |
| 1.4 | **No gradients. No atmospheric backgrounds.** Canvas is pure `var(--color-canvas)`. |
| 1.5 | **One black-pill primary CTA per fold.** Counting nav + hero + pricing-card CTA together. Restraint is the design. |
| 1.6 | **The dark surface (`var(--color-surface-dark)`) appears at most once per page.** It's the "look here" cue — overusing it kills it. |
| 1.7 | **Semantic colors (`--color-error`, `--color-success`, `--color-warning`) are reserved for in-product form validation only.** Never on marketing chrome, never on the homepage, never on pricing. |
| 1.8 | **Hero headline uses `var(--font-size-display-xl)` only.** Do not introduce intermediate display sizes. |
| 1.9 | **Body copy uses `var(--font-size-body-md)` in `var(--color-body)`.** This is the default. Reach for other sizes only when this doc explicitly says so. |
| 1.10 | **Every form input has a `<label htmlFor>`.** No floating labels. No placeholder-as-label. |

---

## 2. Token Quick Reference

> Full definitions live in `tokens.css`. This table is a lookup — when uncertain, open the file.

### Colors

| Use this for | Token |
|---|---|
| Primary CTAs, links, headings, solid icons | `var(--color-primary)` |
| Page background, card surface | `var(--color-canvas)` |
| Pill input bg, code-snippet pill bg, soft chips | `var(--color-surface-soft)` |
| The single "look here" dark surface (Max pricing card) | `var(--color-surface-dark)` |
| Card border, divider, FAQ separator | `var(--color-hairline)` |
| Body paragraph copy, FAQ answers, footer | `var(--color-body)` |
| Secondary list text, disabled secondary | `var(--color-charcoal)` |
| Captions, terminal-comment gray | `var(--color-mute)` |
| Text on black pill | `var(--color-on-primary)` |
| Text on dark Max card | `var(--color-on-dark)` |
| Validation errors (in-product only) | `var(--color-error)` |
| Password-strength "strong", success states | `var(--color-success)` |
| Password-strength "fair", token-expiring warnings | `var(--color-warning)` |

### Spacing

| Use case | Token | Value |
|---|---|---|
| Tight inline gaps (label ↔ input) | `var(--spacing-xs)` | 4px |
| Form field row gap | `var(--spacing-lg)` | 16px |
| Card internal padding | `var(--spacing-xxl)` | 32px |
| Major section vertical gap | `var(--spacing-section)` | 88px desktop / 64px tablet / 48px mobile |

### Radius

| Use case | Token |
|---|---|
| Every button, every pill input | `var(--rounded-full)` |
| Cards (pricing, terminal, auth, info-banner) | `var(--rounded-lg)` |
| Inline code chips, command tags | `var(--rounded-sm)` |
| Structural lines (nav, footer) | `var(--rounded-none)` |

### Typography

| Element | Class / token combo |
|---|---|
| Hero headline | `font-family: var(--font-display); font-size: var(--font-size-display-xl); font-weight: 500;` |
| Section subhead | `var(--font-display)` + `var(--font-size-heading-lg)` + weight 600 |
| Form field label | `var(--font-sans)` + `var(--font-size-body-md)` + weight 500 |
| Body paragraph | `var(--font-sans)` + `var(--font-size-body-md)` + `var(--color-body)` |
| Button label | `var(--font-sans)` + `var(--font-size-button-md)` + weight 500 |
| Code snippet | `var(--font-mono)` + `var(--font-size-code-md)` |
| Validation error | `var(--font-sans)` + `var(--font-size-body-sm)` + weight 500 + `var(--color-error)` |

---

## 3. Component Patterns

### Primary Button
```tsx
<button
  className="primary-btn"
  style={{
    background: "var(--color-primary)",
    color: "var(--color-on-primary)",
    height: "var(--button-height)",
    padding: "0 var(--button-padding-x)",
    borderRadius: "var(--rounded-full)",
    fontFamily: "var(--font-sans)",
    fontSize: "var(--font-size-button-md)",
    fontWeight: 500,
  }}
>
  Get Started
</button>
```
- Loading state: replace label with white spinner. Disable the button.
- Pressed state: background becomes `var(--color-ink-deep)`.

### Text Input + Label + Helper + Error
```tsx
<div>
  <label htmlFor="email" className="field-label">Email</label>
  <input
    id="email"
    type="email"
    aria-invalid={hasError}
    aria-describedby="email-error email-helper"
    style={{
      height: "var(--input-height)",
      padding: "0 var(--input-padding-x)",
      borderRadius: "var(--rounded-full)",
      border: `1px solid ${hasError ? "var(--color-error)" : "var(--color-hairline)"}`,
      fontSize: "var(--font-size-body-md)",
    }}
  />
  {helper && <p id="email-helper" className="helper">{helper}</p>}
  {hasError && <p id="email-error" className="error-msg">{errorText}</p>}
</div>
```
- `errorText` must be **specific** ("Email must be a valid address"). Never "Something went wrong."
- For login: error is always **generic** ("Invalid credentials"). Never disclose which field was wrong.

### Auth Card
- Max-width `var(--auth-card-max-width)` (440px).
- Padding `var(--spacing-xxl)` (32px). Mobile: `var(--spacing-xl)` (24px).
- Border `1px solid var(--color-hairline)`.
- Radius `var(--rounded-lg)`.
- Vertically centered on viewport at desktop; top-aligned with 48px top padding on mobile.

### Password Strength Indicator
- Three segments, 4px height, full width of password input.
- States and tokens:
  - **Weak:** 1 segment `var(--color-error)`, 2 segments `var(--color-hairline)`. Label "Weak" in `var(--color-error)`.
  - **Fair:** 2 segments `var(--color-warning)`, 1 segment `var(--color-hairline)`. Label "Fair" in `var(--color-warning)`.
  - **Strong:** 3 segments `var(--color-success)`. Label "Strong" in `var(--color-success)`.
- Label uses `var(--font-size-caption-sm)` (12px).

### Forgot-Password Success Banner (existence-safe wording)
- Background `var(--color-surface-soft)`, border `1px solid var(--color-hairline)`, radius `var(--rounded-lg)`, padding `12px 16px`.
- Text in `var(--color-charcoal)`, `var(--font-size-body-sm)`.
- **Wording rule:** *"If an account exists for that email, we've sent a reset link."* Never confirm or deny existence.

---

## 4. Anti-Patterns — Do Not Do

| # | Anti-pattern | Correction |
|---|---|---|
| 4.1 | `box-shadow: 0 2px 4px rgba(0,0,0,.1)` on a card | Remove. Use the 1px hairline border instead. |
| 4.2 | `border-radius: 8px` on a button | Use `var(--rounded-full)`. |
| 4.3 | `border-radius: 9999px` on a card | Use `var(--rounded-lg)`. |
| 4.4 | Login error: "No account with that email" or "Wrong password" | Always "Invalid credentials." |
| 4.5 | Forgot-password response confirms email exists | Generic success message regardless. |
| 4.6 | Error message: "Something went wrong" | Be specific ("Password must be at least 8 characters."). |
| 4.7 | A second `var(--color-surface-dark)` block on the same page | Remove one. Dark surface = one per page max. |
| 4.8 | A new brand color (blue, green, purple) for a CTA | Black pill only. Always. |
| 4.9 | `font-size: 17px` or any value not in `tokens.css` | Pick from the typography scale. If none fits, propose a new token first. |
| 4.10 | Tailwind class with arbitrary value: `bg-[#fafafa]` | Use `bg-surface-soft` (mapped to the token in `tailwind.config.ts`). |
| 4.11 | Inline `style={{ marginBottom: 24 }}` | Use `var(--spacing-xl)` or the Tailwind utility that maps to it. |
| 4.12 | Custom focus ring color | Use `var(--color-focus-ring)` or the browser default. |
| 4.13 | Animations longer than 200ms | Stick to `var(--transition-fast)` (120ms) or `var(--transition-base)` (180ms). |
| 4.14 | Sticky/floating elements on the marketing surface | Page is a flat document. Nothing floats. |

---

## 5. Decision Tree — When Uncertain

```
You need to pick a style value.
│
├── Is the value about color, spacing, size, radius, border, or breakpoint?
│   ├── YES → Open tokens.css. Find the token. Use var(--token-name).
│   └── NO  → Re-read the question. It probably is.
│
├── Did you find a matching token?
│   ├── YES → Use it. Done.
│   └── NO  → STOP.
│       ├── Can you compose it from existing tokens? (e.g. spacing-lg + spacing-sm)
│       │   ├── YES → Compose. Add a comment naming the tokens used.
│       │   └── NO  → Surface the gap to the human. Propose a new token.
│       │             Do NOT inline a one-off value.
│
└── Is the choice ambiguous (multiple tokens could work)?
    └── Default to the more restrained option:
        ├── Smaller font over larger
        ├── Lighter color over heavier
        ├── Less spacing over more (except for {spacing.section} between blocks)
        └── No new component over a new component
```

---

## 6. Self-Check Before Committing

Before you finish a styling task, scan your diff and confirm:

- [ ] No raw hex/rgb/hsl color values (`#xxx`, `rgb(...)`) anywhere in the diff.
- [ ] No raw pixel values for spacing, font-size, or border-radius outside `tokens.css` itself.
- [ ] Every interactive element has `var(--rounded-full)`. Every card has `var(--rounded-lg)`.
- [ ] No `box-shadow` properties were added.
- [ ] Every form field has a `<label htmlFor>` and an `aria-describedby` linking to its error/helper.
- [ ] Error messages are specific for form-validation, generic for auth ("Invalid credentials").
- [ ] Forgot-password responses do not disclose account existence.
- [ ] At most one black-pill primary CTA is visible at any time.
- [ ] At most one `var(--color-surface-dark)` block exists on the page.
- [ ] Semantic colors are not used on marketing chrome.

If any box is unchecked: fix before declaring done.

---

## 7. Related Files

- **`tokens.css`** — canonical token values. Source of truth.
- **`tokens.json`** — same tokens in design-tool-friendly JSON format. Use for Figma sync or build pipelines.
- **`DESIGN.md`** — full descriptive design system documentation. Read for *intent*; come back here for *rules*.
- **`AGENTS.md`** — project-wide agent context (auth security, build phases, tech stack). Read first when starting work on a new feature.

---

**Remember:** SecureGate's design strength is its restraint. The pull toward "add a shadow," "soften the radius," "introduce a brand color," "create a new component" must be resisted. Every visual choice in this system already exists in `tokens.css`. Your job is to assemble, not invent.
