# SecureGate — Design System

> ## Scope Note (Read Before Building)
>
> This document describes the **complete design vocabulary** for SecureGate's surface — including marketing pages (`/`, `/pricing`, FAQ) that are **not currently in PRD scope**. AGENTS.md §1 limits the current build to the eight core auth features (sign-up, login, email verification, protected dashboard, forgot/reset password, rate limiting, logout, password hashing).
>
> Treat the marketing-surface specs (terminal mockup, pricing tiers, FAQ wall, "Auth done right" section) as **forward-looking documentation** — the design vocabulary they establish (pill geometry, token usage, typography rhythm) carries into the auth surface, but the marketing pages themselves should not be built until the PRD is extended.
>
> The auth-surface specs (`auth-card`, `text-input`, `password-strength`, `button-primary`, error/info banners) ARE in current scope and the design described here is what the codebase implements.

> ## Agent Directive — Source of Truth
>
> **Before writing any style value — color, font size, spacing, radius, border width, breakpoint, or component dimension — you MUST first consult `tokens.css`.**
>
> `tokens.css` is the single source of truth for every visual value in this project. This `DESIGN.md` describes *intent, usage, and composition*; `tokens.css` defines the *actual values*.
>
> **Rules the agent must follow:**
>
> 1. **Never hardcode a raw value** (e.g. `color: #000`, `padding: 32px`, `border-radius: 12px`, `font-size: 16px`). Always reference the corresponding CSS custom property: `color: var(--color-primary)`, `padding: var(--spacing-xxl)`, `border-radius: var(--rounded-lg)`, `font-size: var(--font-size-body-md)`.
> 2. **If a value you need does not exist in `tokens.css`, stop.** Do not invent one. Either (a) compose it from existing tokens, or (b) flag the gap to the human and propose a new token to be added to `tokens.css` first.
> 3. **When this `DESIGN.md` and `tokens.css` disagree**, `tokens.css` wins. Treat the markdown as documentation that may drift; treat the CSS file as canonical.
> 4. **When using Tailwind**, configure `tailwind.config.ts` to read from these CSS variables (e.g. `colors: { primary: 'var(--color-primary)' }`). Do not duplicate token values inside the Tailwind config.
> 5. **Token references in this document** (e.g. `{colors.primary}`, `{spacing.section}`, `{rounded.full}`) map directly to CSS variables (`--color-primary`, `--spacing-section`, `--rounded-full`). When in doubt about the exact variable name, open `tokens.css` and search for the token by group.
>
> Read `tokens.css` end-to-end once before starting any styling task in this repo. Every subsequent style decision should begin with: *"Which token in `tokens.css` covers this?"*

---

## Overview

SecureGate's site is the most aggressively under-designed marketing surface in the auth-tooling space, and that is the entire point. The home page reads like a Markdown README rendered with care: a 36px center-aligned heading sits above an inline code-snippet pill inside a soft-gray pill, a single black "Get Started" CTA, and a hand-drawn shield mark as the only ornament. Everything else — the "Auth done right" block, the "Start free. Scale secure." pricing pair, the "Your data stays yours" guarantee strip, FAQ wall on `/pricing` — sits on the same paper-white canvas (`{colors.canvas}`) with quiet `{colors.body}` neutrals carrying the prose. The system is the documentation, and the documentation is the system.

The design philosophy is geometric: every interactive element collapses to `{rounded.full}` (9999px) — buttons, search pills, code-snippet pills, text inputs, and the terminal-traffic-light dots. There are no decorative drop shadows, no gradients, no hero illustrations beyond the shield mark. Cards (the rare ones, on `/pricing`) use a soft `{rounded.lg}` (12px) and a 1px hairline. The single inverted moment in the entire system is the dark "Max" pricing tier — `{colors.surface-dark}` with white text — which acts as the only attention-grabbing surface in an otherwise studiously flat layout.

Typography pairs SF Pro Rounded (display headings, weight 500–600) with the operating system's default sans (`ui-sans-serif`) for body and `ui-monospace` for code. The roundness of the heading face is the only "personality" the chrome carries — it gently echoes the `{rounded.full}` button geometry without being decorative about it.

**Key Characteristics:**
- Paper-white `{colors.canvas}` end-to-end with no surface alternation — the whole page is one continuous sheet
- Center-aligned hero with `{typography.display-xl}` SF Pro Rounded headline, no eyebrow, no subhead beyond a small "Authentication, hardened" line under the shield mark
- Pill geometry everywhere: every button and pill input is `{rounded.full}`; cards use `{rounded.lg}`; nothing is sharp-cornered except section dividers
- Single-color CTA system: near-black `{colors.primary}` (`#121111`) pills carry every action; "Get Pro" / "Get Max" inside pricing cards are the only variations
- Inline code-snippet pill rendered as a pill with `{typography.code-md}` — the most signature element, sitting directly under the hero headline
- Terminal-mockup card with macOS traffic-light dots and inline `npx create-securegate-app` example — the home page's only "product preview"
- Inverted dark `{component.pricing-card-dark}` for the highest-tier "Max" plan, breaking the flat-white rhythm exactly once per page

## Colors

> **Source pages:** `/` (home) and `/pricing`. The chrome palette is identical across both — only content changes.

### Brand & Accent
- **Near-Black** (`{colors.primary}` — `#121111`): the brand. Every primary CTA, every black pill, every link in the nav, and every solid icon. There is no other "brand color." This is a single-bit-off-black so the pill reads as "soft black" rather than absolute black — see `{colors.ink}` (`#000000`) for the truly-black text role.
- **Ink Deep** (`{colors.ink-deep}` — `#090909`): pressed-state black for the primary pill — a single notch below pure.

### Surface
- **Canvas** (`{colors.canvas}` — `#ffffff`): the page itself. Nearly every surface in the system.
- **Soft Surface** (`{colors.surface-soft}` — `#fafafa`): code-snippet pill background, search pill, secondary chip backgrounds, alternating row fill where one is needed.
- **Surface Dark** (`{colors.surface-dark}` — `#171717`): the dark "Max" pricing card and dark CTA strips. The single inverted surface in the system.
- **Hairline** (`{colors.hairline}` — `#e5e5e5`): 1px card border, divider line above footer, divider between FAQ rows.
- **Hairline Strong** (`{colors.hairline-strong}` — `#d4d4d4`): rare slightly stronger divider where extra separation is needed (e.g., between unrelated FAQ groups).

### Text
- **Ink** (`{colors.ink}` — `#000000`): all headlines, primary nav links, button text on light surfaces, prices on pricing cards.
- **Charcoal** (`{colors.charcoal}` — `#525252`): list-item text and disabled-state secondary copy.
- **Body** (`{colors.body}` — `#737373`): default body color for paragraph copy, FAQ answers, footer link text — the system's most-used text color after pure black.
- **Mute** (`{colors.mute}` — `#a3a3a3`): caption text, command-line "comment" gray inside terminal mockups, lowest-emphasis utility text.
- **On Dark** (`{colors.on-dark}` — `#ffffff`): primary text on `{colors.surface-dark}`.
- **On Dark Mute** (`{colors.on-dark-mute}` — `rgba(255,255,255,0.7)`): secondary copy inside the dark "Max" pricing card.

### Semantic
The marketing surface has effectively no error/success/warning palette — there are no validation states, no destructive flows, no banners on the public pages. **However, because SecureGate's actual product is an auth app, the auth forms (`/signup`, `/login`, `/forgot-password`, `/reset-password/[token]`) DO need form-validation states.** The semantic palette below extends the system for in-product use:

- **Error** (`{colors.error}` — `#dc2626`): invalid-input border, validation error message text, the existence-safe login error ("We could not sign you in. Please check your details and try again.") rendered inline beneath the login form.
- **Error Soft** (`{colors.error-soft}` — `#fef2f2`): error message background fill (rare — most errors live inline beneath the field).
- **Success** (`{colors.success}` — `#16a34a`): password-strength "strong" indicator, "Email verified" confirmation badge, success toast accent.
- **Warning** (`{colors.warning}` — `#ca8a04`): password-strength "fair" indicator, "Token expiring soon" notice.
- **Info Mute** (`{colors.info-mute}` — `#525252`): the same as `{colors.charcoal}` — used for neutral info messages ("We've sent a verification email") to keep them quiet rather than alarming.

The only other "semantic" colors are the macOS terminal traffic lights inside the terminal mockup:

- **Terminal Red** (`{colors.terminal-red}` — `#ff5f56`): close-window dot.
- **Terminal Yellow** (`{colors.terminal-yellow}` — `#ffbd2e`): minimize dot.
- **Terminal Green** (`{colors.terminal-green}` — `#27c93f`): zoom dot.

These appear only inside `{component.terminal-card}` and have no other use.

### Focus
- **Focus Ring** (`{colors.focus-ring}` — `rgba(59,130,246,0.5)`): translucent blue browser-default focus ring around interactive elements. The only blue in the system.

## Typography

### Font Family
- **SF Pro Rounded** (display headings) — Apple's rounded geometric sans, used at weights 500 and 600 for headlines from `{typography.display-xl}` (36px) down to `{typography.heading-lg}` (24px). Falls back to `system-ui` → `-apple-system`.
- **ui-sans-serif** (body, links, buttons, captions) — the operating system's default sans-serif. Carries every non-display text role at 12–20px. Falls back through `system-ui` and platform emoji families.
- **ui-monospace** (code, code-snippet pill, command tags) — the OS default monospace. Used inside the terminal mockup, the inline code-snippet pill, and any inline `<code>` formatting. Falls back to SFMono-Regular → Menlo → Monaco → Consolas.

The pairing of SF Pro Rounded display + system sans body + system mono code is intentionally "stock Apple" — the design decision is to not have a typography decision. Branded display faces would compete with the system's documentation feel.

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `{typography.display-xl}` | 36px | 500 | 1.11 | 0 | Hero headline ("Authentication, hardened by default") |
| `{typography.display-lg}` | 30px | 500 | 1.2 | 0 | Major section headlines ("Pricing", "Frequently asked questions") |
| `{typography.heading-lg}` | 24px | 600 | 1.33 | 0 | Section subheading inside body ("Auth done right", "Start free. Scale secure.") |
| `{typography.heading-md}` | 20px | 500 | 1.4 | 0 | Pricing tier name ("Free", "Pro", "Max"), card title, form section header |
| `{typography.heading-sm}` | 18px | 500 | 1.56 | 0 | FAQ question label, form field-group label, in-card subtitle |
| `{typography.body-md}` | 16px | 400 | 1.5 | 0 | Default body, FAQ answers, paragraph copy, form input value |
| `{typography.body-strong}` | 16px | 500 | 1.5 | 0 | Inline emphasis, primary-nav link, form field label |
| `{typography.body-sm}` | 14px | 400 | 1.43 | 0 | Feature bullet, footer link, form helper text |
| `{typography.body-sm-strong}` | 14px | 500 | 1.43 | 0 | Button label, pricing-card eyebrow, validation error message |
| `{typography.caption-sm}` | 12px | 400 | 1.33 | 0 | Footer copyright row, smallest meta text, password-strength indicator label |
| `{typography.code-md}` | 16px | 400 | 1.5 | 0 | Code-snippet pill, in-terminal command |
| `{typography.code-sm}` | 14px | 400 | 1.43 | 0 | Terminal output line, inline `<code>` chips, token strings in confirmation screens |
| `{typography.button-md}` | 14px | 500 | 1 | 0 | Every button label across the system |

### Principles
The typography is built for legibility at small sizes on a flat-white canvas. SF Pro Rounded's softened terminals on the heading face do almost all of the brand expression; everything below 20px collapses into the operating system's default sans, which renders identically to the way docs.securegate.dev and a Node/Next.js CLI's help text would appear in a terminal. There is almost no letter-spacing variation, no display-only weights, no italic, and the heading-to-body ratio compresses tightly (36 → 30 → 24 → 20 → 16) so the page reads as a single readable column rather than a marketing pyramid.

### Note on Font Substitutes
SF Pro Rounded is Apple-licensed and ships only on macOS/iOS. On other systems it falls back to `system-ui` (Segoe UI / Roboto / DejaVu Sans depending on platform) — SecureGate explicitly accepts that the heading face will look slightly different on Windows/Linux. The closest open-source substitute is **Nunito** (rounded geometric sans, weights 500/600). For the body face, **Inter** is a near-perfect match for `system-ui` rendered metrics. For code, **JetBrains Mono** or **Fira Code** are the canonical open-source substitutes for `ui-monospace`.

## Layout

### Spacing System
- **Base unit:** 8px (with finer 2/4/6px steps available for tight inline gaps)
- **Tokens (front matter):** `{spacing.xxs}` (2px) · `{spacing.xs}` (4px) · `{spacing.sm}` (8px) · `{spacing.md}` (12px) · `{spacing.lg}` (16px) · `{spacing.xl}` (24px) · `{spacing.xxl}` (32px) · `{spacing.section}` (88px)
- **Universal section rhythm:** every page uses `{spacing.section}` (88px) as the vertical gap between major content blocks (hero → auth-done-right → start-free/scale-secure → your-data-stays-yours → get-started footer call). This is the single largest spacing token in the system and it is used liberally.
- **Card internal padding:** pricing cards sit at `{spacing.xxl}` (32px) all around; FAQ rows use `{spacing.lg}` (16px) vertical with no horizontal padding.
- **Auth form padding:** the auth-page card (login/signup/forgot/reset forms) sits at `{spacing.xxl}` (32px) all around with `{spacing.lg}` (16px) gap between fields.

### Grid & Container
- **Max width:** ~720px content column on the home page (the whole page is laid out as a single narrow reading column with optional 2-column splits inside specific sections).
- **Auth pages:** centered card, max-width ~440px, vertically centered in the viewport with `{spacing.xxl}` (32px) of top/bottom breathing room.
- **Dashboard:** single-column reading width (~720px) inside a top-bar nav, no sidebar.
- **Pricing grid:** 3-up cards at desktop with a max content width of ~960px; collapses to 1-up below 768px.
- **Auth-done-right split:** desktop 50/50 left-text/right-terminal-mockup; mobile stacks vertical with the terminal below the text.
- **FAQ:** single-column stacked rows, full-width within the 720px content column.
- **Footer:** single-row of small body-sm links, center-aligned at desktop, wrapping to two rows on narrow screens.

### Whitespace Philosophy
Whitespace is the entire layout. Sections are separated by 88px of plain white air, never by decorative dividers, never by colored bands. Inside a section, content sits in a tight reading column with no decorative columns, callout boxes, or lifted cards. The site treats the page as a long-form Markdown document, and the air between sections is the equivalent of a blank line in Markdown source.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| 0 — Flat | No border, no shadow | Hero, auth-done-right, your-data-stays-yours, footer — the dominant treatment across the page |
| 1 — Hairline border | 1px solid `{colors.hairline}` | Pricing cards, FAQ row dividers, terminal mockup card, auth-form card |
| 2 — Inverted dark | `{colors.surface-dark}` fill | Dark "Max" pricing card and dark CTA strip — the system's only "elevated" surfaces use color, not shadow |

The system has no drop-shadow elevation at all. Nothing lifts, nothing floats, nothing layers. The only depth cue beyond hairline borders is the single dark surface used on the highest-tier pricing card to draw attention to it.

### Decorative Depth
The site has effectively zero decorative depth in the traditional sense. The "depth" comes entirely from two recurring devices:
- **The hand-drawn shield mark** — SecureGate's brand mascot, appearing once at the top of the hero, once at the top of each pricing card, and once next to the lock icon in the "Your data stays yours" section. It is the only illustration in the system, drawn as a single-stroke line illustration in `{colors.ink}`.
- **A single line-drawn lock icon** — used in the data-privacy section and as the favicon. Stroke-only, no fill, drawn in `{colors.ink}`.

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.none}` | 0px | Nav, footer, FAQ row dividers — flat structural lines |
| `{rounded.sm}` | 6px | Inline code chips, command tags |
| `{rounded.md}` | 8px | Rare medium-radius surfaces (e.g., dropdown panels) |
| `{rounded.lg}` | 12px | Pricing cards, terminal mockup card, auth-form card |
| `{rounded.full}` | 9999px | Every button, every pill input, code-snippet pill, search pill, traffic-light dots |

The dominant shape vocabulary is just two values: pills (`{rounded.full}`) for everything interactive and 12px (`{rounded.lg}`) for the few cards in the system. There are no medium-radius "soft cards" — surfaces are either pills or rectangles with corners large enough to read as deliberately soft.

### Photography Geometry
There is no photography. The only image-like elements are:
- **The shield mark** — a hand-drawn line illustration, ~80–120px on the hero, ~32–48px when it appears as a pricing-card eyebrow icon, ~24px in the auth-form card header.
- **The lock icon** — single stroke line drawing in the privacy section.
- **macOS traffic-light dots** — three filled circles at 12px (`{rounded.full}`) inside the terminal mockup card.

## Components

> **No hover states documented** per system policy. Each spec covers Default and Active/Pressed only.

### Buttons

**`button-primary`** — the universal SecureGate CTA
- Background `{colors.primary}`, text `{colors.on-primary}`, type `{typography.button-md}`, padding `8px 20px`, height `36px`, rounded `{rounded.full}`.
- Used for "Get Started" (top nav), "Sign in" (top nav, paired with Get Started), "Create account", "Get Pro", "Get Max", "Send reset link", "Verify email" — every primary action in the system.
- Pressed state lives in `button-primary-active` — background drops to `{colors.ink-deep}`.

**`button-primary-loading`** — submit-in-progress state
- Same surface as `button-primary` but text is replaced with a small white spinner. Required on every form submit button.

**`button-secondary`** — outline alternative on light canvas
- Background `{colors.canvas}`, text `{colors.ink}`, 1px solid `{colors.hairline-strong}`, type `{typography.button-md}`, padding `8px 20px`, height `36px`, rounded `{rounded.full}`.
- Used as a secondary affordance — e.g., the "Sign in" pill in the top nav when paired with the black "Get Started" pill, "Resend verification email" on the verify-email error screen.

**`button-pill-on-dark`** — white pill on dark surface
- Background `{colors.canvas}`, text `{colors.ink}`, type `{typography.button-md}`, rounded `{rounded.full}`.
- Sits inside the dark "Max" pricing card as the "Get Max" CTA — inverts the standard primary so the dark card itself becomes the visual anchor and the white pill reads as the CTA.

**`button-disabled`**
- Background `{colors.surface-soft}`, text `{colors.mute}`, rounded `{rounded.full}` — flat soft gray.

### Inputs & Forms

**`search-pill`** + **`search-pill-focused`**
- Default: background `{colors.surface-soft}`, text `{colors.ink}`, type `{typography.body-sm}`, padding `8px 16px`, height `36px`, rounded `{rounded.full}`. Anchored in the center of the primary nav with a small magnifier icon prefix and "Search docs" placeholder.
- Focused: background flips to `{colors.canvas}` and the browser-default `{colors.focus-ring}` translucent blue ring appears.

**`text-input`** + **`text-input-focused`** + **`text-input-error`**
- Default: background `{colors.canvas}`, 1px solid `{colors.hairline}`, type `{typography.body-md}`, padding `8px 16px`, height `40px`, rounded `{rounded.full}`. Used on every auth form — email, password, name, new-password fields.
- Focused: 1px `{colors.ink}` border + browser-default focus ring.
- Error: 1px solid `{colors.error}` border + an inline `{typography.body-sm-strong}` validation message in `{colors.error}` sitting directly beneath the field with `{spacing.xs}` (4px) gap.

**`text-input-label`** — form field label
- Type `{typography.body-strong}` (16px / 500) in `{colors.ink}`, sits above the input with `{spacing.xs}` (4px) gap. `<label htmlFor>` is mandatory.

**`helper-text`** — sub-field copy
- Type `{typography.body-sm}` in `{colors.body}`, sits below the input with `{spacing.xs}` (4px) gap. Used for guidance like "Must be at least 8 characters."

**`password-strength`** — three-step strength indicator
- Three-segment horizontal bar at 4px height, full width of the password input, rounded `{rounded.full}`. Segments fill left-to-right as strength improves.
- States: weak (1 segment `{colors.error}`, 2 segments `{colors.hairline}`), fair (2 segments `{colors.warning}`, 1 segment `{colors.hairline}`), strong (3 segments `{colors.success}`).
- Caption label beneath the bar: `{typography.caption-sm}` in the same color as the filled segments.

**`code-snippet-pill`** — the signature inline code pill (replaces Ollama's install snippet)
- Background `{colors.surface-soft}`, text `{colors.ink}` rendered in `{typography.code-md}`, padding `12px 20px`, height `48px`, rounded `{rounded.full}`.
- On the marketing hero, contains a one-line auth code preview (e.g., `await signIn({ email, password })`) with a small copy-icon at the right edge. Sits directly below the hero headline as the page's most prominent "CTA."

**`command-tag`** — small inline command chip
- Background `{colors.surface-soft}`, text `{colors.ink}` in `{typography.code-sm}`, padding `6px 12px`, rounded `{rounded.full}`.
- Used inside the "Auth done right" section for the `npx create-securegate-app` example chip and similar inline-command demos.

### Cards & Containers

**`terminal-card`** — the home page's only "product preview"
- Container: background `{colors.canvas}`, 1px solid `{colors.hairline}`, padding `{spacing.lg}` (16px), rounded `{rounded.lg}`.
- Header: three `{component.terminal-traffic-lights}` dots (red/yellow/green at 12px) anchored to the top-left of the card.
- Body: terminal output rendered in `{typography.code-sm}` with comments in `{colors.mute}` and active commands in `{colors.ink}` (example: `$ npx create-securegate-app my-app` followed by setup output).

**`terminal-traffic-lights`**
- Three 12px filled circles at `{rounded.full}`: `{colors.terminal-red}`, `{colors.terminal-yellow}`, `{colors.terminal-green}`. Sits as a row of three with `{spacing.xs}` gaps between dots inside the terminal card header.

**`auth-card`** — login / signup / forgot-password / reset-password form container
- Container: background `{colors.canvas}`, 1px solid `{colors.hairline}`, padding `{spacing.xxl}` (32px), rounded `{rounded.lg}`, max-width 440px.
- Header: shield mark (~24px) centered above an `{typography.heading-md}` form title and an optional `{typography.body-sm}` `{colors.body}` subtitle.
- Body: stacked `{component.text-input-label}` + `{component.text-input}` + optional `{component.helper-text}` rows with `{spacing.lg}` (16px) row gap, followed by a full-width `{component.button-primary}`.
- Footer: small `{typography.body-sm}` link cluster in `{colors.body}` (e.g., "Already have an account? Sign in") with the link itself in `{colors.ink}` underlined.

**`pricing-card`** — Free / Pro tiers
- Container: background `{colors.canvas}`, 1px solid `{colors.hairline}`, padding `{spacing.xxl}` (32px), rounded `{rounded.lg}`.
- Layout: small shield mark (~32px) at top, tier name in `{typography.heading-md}`, one-line tier description, large price in `{typography.display-lg}` (`$0` / `$20`), single `{component.button-primary}` CTA, divider, `{typography.body-sm-strong}` "Everything in Free, plus:" header, list of `{component.feature-bullet}` rows.

**`pricing-card-dark`** — Max tier (inverted)
- Identical layout to `pricing-card` but with `{colors.surface-dark}` background, `{colors.on-dark}` text, `{colors.on-dark-mute}` secondary text, and `{component.button-pill-on-dark}` CTA. The inversion is the system's single "look here" cue.

**`feature-bullet`** — pricing card list item
- Inline check-mark icon (rendered as an inline SVG, not a Unicode glyph) at 16px stroked in `{colors.ink}`, followed by `{typography.body-sm}` text in `{colors.charcoal}`. No background, no border, just stacked rows with `{spacing.sm}` between them. Use a single-stroke check from a lightweight icon set (e.g., Lucide's `check`) — not the `✓` glyph (`U+2713`), since the project bans Unicode emoji/dingbat glyphs in source.

**`faq-row`** — `/pricing` FAQ entry
- Container: background `{colors.canvas}`, padding `16px 0`, 1px bottom border `{colors.hairline}`.
- Question: `{typography.heading-sm}` (18px / 500) in `{colors.ink}`.
- Answer: `{typography.body-md}` (16px / 400) in `{colors.body}`, sitting directly below the question with `{spacing.xs}` gap. Always expanded — no accordion collapse.

**`cta-strip-dark`** — rare dark CTA band
- Background `{colors.surface-dark}`, text `{colors.on-dark}` in `{typography.heading-lg}`, padding `24px 32px`, rounded `{rounded.lg}`. Used sparingly between sections.

### Inline

**`link-inline`** — body-prose anchor link
- `{colors.ink}` text with underline. Default decoration is `text-decoration: underline`.

**`link-mute`** — secondary anchor in long-form prose
- `{colors.body}` text with underline appearing on default — used in FAQ answers ("see [hello@securegate.dev](mailto:)") and footer.

**`error-message`** — inline form validation message
- Type `{typography.body-sm-strong}` (14px / 500) in `{colors.error}`, sits directly beneath an invalid `{component.text-input-error}` with `{spacing.xs}` (4px) gap. Must be specific ("Email must be a valid address") — never "Something went wrong."

**`info-banner`** — generic top-of-form notice (e.g., after a successful forgot-password submission)
- Background `{colors.surface-soft}`, text `{colors.charcoal}` in `{typography.body-sm}`, padding `12px 16px`, rounded `{rounded.lg}`, 1px solid `{colors.hairline}`. Sits above the form. **Wording for forgot-password success must not confirm whether the email exists** — use language like "If an account exists for that email, we've sent a reset link."

### Navigation

**`primary-nav`**
- Background `{colors.canvas}`, text `{colors.ink}`, height 56px, type `{typography.body-sm-strong}`, rounded `{rounded.none}`.
- Layout (desktop): shield mark (left) followed by "Docs · Pricing · GitHub" text links, centered `{component.search-pill}`, and a right cluster of "Sign in" + black `{component.button-primary}` "Get Started".

**Top Nav (Mobile)**
- Shield mark at left, hamburger drawer trigger at right. Search pill expands to full-width when triggered. The drawer lists "Docs · Pricing · GitHub · Sign in · Get Started" stacked vertically with `{spacing.lg}` row gaps.

**`dashboard-topbar`** — authenticated chrome on `/dashboard`
- Background `{colors.canvas}`, 1px bottom border `{colors.hairline}`, height 56px, padding `0 24px`.
- Layout: shield mark at left, page title in `{typography.body-strong}`, right cluster of user-email caption in `{typography.caption-sm}` `{colors.body}` + `{component.button-secondary}` "Logout".

### Footer

**`footer-section`**
- Background `{colors.canvas}`, 1px top border `{colors.hairline}`, padding `32px 24px`, type `{typography.caption-sm}` `{colors.body}`.
- Single horizontal row of small links: "Docs · GitHub · Status · Contact · Privacy · Terms" + a "© 2026 SecureGate" copyright at the right edge. Wraps to two rows on narrow screens.

## Do's and Don'ts

### Do
- Treat the page like a Markdown document: single reading column, plenty of `{spacing.section}` air between sections, no decorative dividers.
- Use `{component.button-primary}` (black pill) for every primary action. There is no green, no blue, no brand-tinted CTA.
- Default to `{rounded.full}` for any interactive element. Cards get `{rounded.lg}` (12px) and that is the only exception.
- Use `{typography.display-xl}` SF Pro Rounded for the hero headline and `{typography.body-md}` system sans for everything else. Avoid intermediate display sizes.
- Reserve `{component.pricing-card-dark}` (the inverted dark surface) for exactly one "look here" moment per page — never use it twice.
- Render code examples inside `{component.code-snippet-pill}` or `{component.terminal-card}` with `{typography.code-md}` / `{typography.code-sm}`. Code is a first-class component.
- Keep the shield mark the only illustration in the system. It is the brand.
- For auth forms: always pair a `{component.text-input}` with a `{component.text-input-label}`, use real `{component.error-message}` strings (never "Something went wrong"), and use generic existence-safe copy on forgot-password ("If an account exists…").

### Don't
- Don't introduce gradients, drop shadows, or atmospheric backgrounds. The canvas is pure `{colors.canvas}`.
- Don't add brand colors. The system is `{colors.primary}` (black) on `{colors.canvas}` (white) with `{colors.body}` (gray) text. The semantic palette (`{colors.error}`, `{colors.success}`, `{colors.warning}`) exists for form validation only — never for marketing chrome.
- Don't soften pills or sharpen cards — pills stay `{rounded.full}`, cards stay `{rounded.lg}`. Don't introduce `{rounded.md}` for buttons or `{rounded.full}` for cards.
- Don't lift cards with shadows. Use a 1px `{colors.hairline}` border or invert to `{colors.surface-dark}` — those are the only two card treatments.
- Don't replace `ui-sans-serif` with a branded display body face. The system relies on `system-ui` rendering to feel native.
- Don't fill long-form pages with marketing chrome. FAQ answers stay in `{colors.body}` body-md prose with no decorative containers.
- Don't write login/signup errors that disclose existence ("No account with that email", "Wrong password"). Use the existence-safe full-sentence wording from `security.md` §5: **"We could not sign you in. Please check your details and try again."** — generic, in `{colors.error}`. Avoid "Invalid credentials" — `security.md` §5 lists it as forbidden (too terse and technical).

## Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|---|---|---|
| desktop-large | 1280px+ | Default desktop — 720px content column, 3-up pricing grid |
| desktop | 1024px | Same layout; nav remains horizontal |
| tablet | 850px | Pricing collapses from 3-up to 2-up + 1; nav search pill compresses |
| tablet-narrow | 768px | Pricing collapses to 1-up stacked; primary nav becomes hamburger |
| mobile | 640px | Hero headline drops from `{typography.display-xl}` (36px) to ~28px; code-snippet pill wraps; section padding tightens; auth-card padding reduces from 32px to 24px |

### Touch Targets
All interactive elements meet WCAG AA at the 36–40px height range. `{component.button-primary}` and `{component.button-secondary}` sit at 36px height with 20px horizontal padding, giving an effective tappable area of ~36×80px which exceeds the 44×44px AAA threshold via the inline padding. `{component.text-input}` sits at 40px. `{component.search-pill}` sits at 36px height with 16px padding. Footer links use `{typography.caption-sm}` (12px) but receive ~12px line-height + ~8px vertical padding for a tappable row of ~32–36px.

### Collapsing Strategy
- **Primary nav:** desktop horizontal → tablet-narrow hamburger drawer at 768px. The black "Get Started" CTA stays visible at all widths; it never collapses into the menu.
- **Search pill:** desktop fixed width ~360px → tablet compressed to ~240px → mobile collapses to icon-only with a full-width overlay on tap.
- **Pricing grid:** 3-up → 2+1 → 1-up stacked at 850, 768, and below. The dark "Max" card stays in its inverted treatment at every breakpoint.
- **Auth-done-right split:** desktop 50/50 → tablet stacks vertical with text above terminal mockup.
- **Auth-card:** desktop fixed 440px wide, vertically centered → mobile full-width minus 24px gutters, top-aligned with 48px top padding.
- **Hero headline:** `{typography.display-xl}` (36px) at desktop, scaling to ~28px at mobile with line-height holding at ~1.15.
- **Section spacing:** `{spacing.section}` (88px) desktop → 64px tablet → 48px mobile.
- **Code-snippet pill:** wraps the example text to a second line on narrow screens rather than truncating; the copy-icon stays anchored to the right edge.

### Image Behavior
The only image asset is the shield mark (raster PNG at multiple resolutions: 16/32/48/64/180/192/512px, plus an SVG source). It is rendered at fixed pixel sizes on the hero and pricing cards rather than scaling responsively — the brand asset is treated like a logo, not a hero image.

## Iteration Guide

1. Focus on ONE component at a time. Pull its YAML entry from the front matter and verify every property resolves.
2. Reference component names and tokens directly (`{colors.primary}`, `{component.button-primary-active}`, `{rounded.full}`) — do not paraphrase.
3. Run `npx @google/design.md lint DESIGN.md` after edits — `broken-ref`, `contrast-ratio`, and `orphaned-tokens` warnings flag issues automatically.
4. Add new variants as separate component entries (`-active`, `-disabled`, `-focused`, `-error`, `-loading`) — do not bury them inside prose.
5. Default body to `{typography.body-md}`; reach for `{typography.body-sm}` for footer/utility text; reserve `{typography.display-xl}` strictly for the page-top headline.
6. Keep `{colors.primary}` scarce per viewport — there should be at most one black pill per fold (counting nav, hero CTA, and pricing-card CTA together). The design's restraint is the design.
7. When introducing a new component, ask whether it can be expressed with the existing pill + flat-card + terminal-mockup vocabulary before adding new tokens. The system's strength is that it almost never needs new ones.
8. Semantic colors (`{colors.error}`, `{colors.success}`, `{colors.warning}`) are reserved for in-product form validation and password-strength feedback. Never use them on marketing pages.

## Known Gaps

- **Mobile screenshots not captured** — responsive behavior synthesizes the known mobile pattern (hamburger drawer, 1-up pricing stack, code-snippet pill wrap) from desktop evidence and the extracted breakpoint stack.
- **Hover states not documented** by system policy.
- **Authenticated chrome beyond `/dashboard`** (account dropdown, billing settings, profile page) not in this document — those surfaces will likely add a dropdown component and a settings typography tier.
- **Empty / loading / error full-page states** for `/dashboard` not specified — only form-level loading and error states are documented.
- **Email templates** (verification, password reset) rendered via React Email are not part of this surface document — they follow their own constraints (table-based layout, inline styles, no web fonts beyond Arial fallback).
