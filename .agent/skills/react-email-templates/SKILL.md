# Skill — React Email Templates

> When to use this skill: any time you're writing a new email template, modifying an existing one, configuring Resend, or debugging why an email looks wrong in Gmail/Outlook. Email rendering is its own hostile environment — knowledge that's perfectly correct for the web doesn't apply here. Read before touching anything in `src/emails/`.

---

## 0. Scope

This skill covers:

- The React Email + Resend setup for SecureGate
- The two essential templates: verification and password reset
- The cross-client compatibility rules (Gmail, Outlook, Apple Mail, mobile)
- Inline-styling discipline and why CSS classes mostly don't work
- Local preview workflow
- Deliverability hygiene (SPF, DKIM, the `from` address)
- Testing the templates before they go to real users

This skill does **not** cover:
- Token generation or expiry — see `prisma-auth-schema-and-migrations` §5
- The API routes that trigger emails — see `api-route-scaffolder`
- The Resend API key management — see `.agent/rules/security.md` §10

---

## 1. The Hostile Environment — Why Email Is Not the Web

Web browsers in 2026 are highly standardized. Email clients are not. The dominant clients:

| Client | Rendering engine | Key limitation |
|---|---|---|
| Gmail (web) | Limited CSS subset, strips `<style>` in some cases | No `<style>` block in the email head (some flows strip it). External stylesheets never load. |
| Gmail (iOS / Android app) | WebKit / Chromium | More forgiving but inconsistent with web Gmail |
| Outlook (Windows desktop) | **Microsoft Word's rendering engine** | No flexbox, no grid, broken padding on `<div>`, table-based layouts only |
| Outlook.com (web) | Better than desktop, still limited | `<style>` works; media queries partially supported |
| Apple Mail (macOS / iOS) | WebKit | Most forgiving; supports modern CSS including `prefers-color-scheme` |
| Yahoo Mail | Limited CSS | Similar to Gmail web |
| Thunderbird | Gecko | Mostly fine |

The lowest common denominator is **Outlook Windows desktop**. It's the reason emails still use `<table>` for layout — Word's renderer (which Outlook borrows) does not understand flexbox, grid, or padding on `<div>` reliably.

### What this means in practice

- **Inline styles only.** External CSS, `<style>` blocks, and CSS classes are inconsistently supported. Every style goes on the element via `style="..."` (or React's `style={{}}` prop).
- **Tables for layout.** `<table>` with explicit `width`, `cellpadding`, `cellspacing`, `border` attributes. `<div>` is only used inside a table cell.
- **No web fonts.** Stick to system fonts (`Arial`, `Helvetica`, `Georgia`, `system-ui`). Web fonts will fail silently in many clients.
- **No SVG.** Some clients block it as an XSS vector. Use PNG for any images.
- **No JavaScript.** Mostly blocked. Email is a one-way medium.
- **No `:hover` you can rely on.** Some clients support it, many strip it.

React Email abstracts most of this — its components compile to email-safe HTML automatically. But you still have to think about the constraints.

---

## 2. Setup — Install and Configure

### Dependencies

```bash
npm install resend @react-email/components @react-email/render
npm install -D react-email
```

The split:
- **`resend`** — the SDK for actually sending emails via the Resend API
- **`@react-email/components`** — pre-built primitives (`<Html>`, `<Head>`, `<Body>`, `<Container>`, `<Heading>`, `<Text>`, `<Button>`, `<Hr>`, etc.) that render to email-safe HTML
- **`@react-email/render`** — converts a React component to an HTML string suitable for `resend.emails.send`
- **`react-email`** — dev-only CLI for the local preview server

### File structure

```
src/
├── emails/
│   ├── verify-email.tsx
│   └── reset-password.tsx
└── lib/
    └── email.ts                # Resend client + send helpers
```

### The Resend client

`src/lib/email.ts`:

```ts
import { Resend } from "resend";
import { render } from "@react-email/render";
import { VerifyEmail } from "@/emails/verify-email";
import { ResetPassword } from "@/emails/reset-password";
import { env } from "@/lib/env";

const resend = new Resend(env.RESEND_API_KEY);

const FROM_ADDRESS = "SecureGate <no-reply@securegate.dev>";

export async function sendVerificationEmail(params: {
  to: string;
  name: string;
  verifyUrl: string;
}) {
  const element = <VerifyEmail name={params.name} verifyUrl={params.verifyUrl} />;
  const html = await render(element);
  const text = await render(element, { plainText: true });

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: params.to,
    subject: "Verify your SecureGate email",
    html,
    text, // critical for spam filters
    // List-Unsubscribe header satisfies Gmail's 2024+ sender requirements
    // even for transactional mail. The mailto target should be a real address
    // monitored by ops; Resend ignores the header itself but receivers honor it.
    headers: {
      "List-Unsubscribe": "<mailto:unsubscribe@securegate.dev>",
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });

  if (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[email/verify] send failed", { error, to: params.to });
    }
    throw new Error("Email send failed");
  }
  return data;
}

export async function sendResetEmail(params: {
  to: string;
  name: string;
  resetUrl: string;
}) {
  const element = <ResetPassword name={params.name} resetUrl={params.resetUrl} />;
  const html = await render(element);
  const text = await render(element, { plainText: true });

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: params.to,
    subject: "Reset your SecureGate password",
    html,
    text,
    headers: {
      "List-Unsubscribe": "<mailto:unsubscribe@securegate.dev>",
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });

  if (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[email/reset] send failed", { error, to: params.to });
    }
    throw new Error("Email send failed");
  }
  return data;
}
```

### Why both `html` and `text` are required

Spam filters score emails partly on having both versions. An HTML-only email is more likely to land in the spam folder. React Email's `render(..., { plainText: true })` generates a clean text version automatically.

---

## 3. The Verification Email Template

`src/emails/verify-email.tsx`:

```tsx
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface VerifyEmailProps {
  name: string;
  verifyUrl: string;
}

export function VerifyEmail({ name, verifyUrl }: VerifyEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Confirm your email address to finish setting up your SecureGate account.</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading as="h1" style={heading}>Welcome to SecureGate</Heading>
          <Text style={text}>Hi {name},</Text>
          <Text style={text}>
            Thanks for signing up. Please confirm your email address by clicking the button below.
            This link will expire in 15 minutes.
          </Text>
          <Section style={buttonContainer}>
            <Button href={verifyUrl} style={button}>
              Verify email
            </Button>
          </Section>
          <Text style={textSmall}>
            Or copy and paste this link into your browser:
          </Text>
          <Text style={link}>{verifyUrl}</Text>
          <Hr style={hr} />
          <Text style={footer}>
            If you didn't create a SecureGate account, you can safely ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// All styles inline. Approximated from tokens.css but values are duplicated
// because email clients do not load external CSS. This is the ONE place where
// duplicating token values is acceptable — flagged here so future tokens.css
// changes prompt a manual sync.

const body = {
  backgroundColor: "#ffffff",        // tokens.css: --color-canvas
  fontFamily: "Arial, Helvetica, sans-serif",
};

const container = {
  margin: "0 auto",
  padding: "32px 24px",              // tokens.css: --spacing-xxl, --spacing-xl
  maxWidth: "560px",
};

const heading = {
  fontSize: "24px",                  // tokens.css: --font-size-heading-lg
  fontWeight: 600,
  color: "#000000",                  // tokens.css: --color-ink
  margin: "0 0 16px 0",
};

const text = {
  fontSize: "16px",                  // tokens.css: --font-size-body-md
  lineHeight: "24px",
  color: "#525252",                  // tokens.css: --color-charcoal
  margin: "16px 0",
};

const textSmall = {
  fontSize: "14px",                  // tokens.css: --font-size-body-sm
  lineHeight: "20px",
  color: "#737373",                  // tokens.css: --color-body
  margin: "16px 0 4px 0",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#000000",        // tokens.css: --color-primary
  color: "#ffffff",                  // tokens.css: --color-on-primary
  fontSize: "14px",                  // tokens.css: --font-size-button-md
  fontWeight: 500,
  padding: "12px 24px",
  borderRadius: "9999px",            // tokens.css: --rounded-full
  textDecoration: "none",
  display: "inline-block",
};

const link = {
  fontSize: "14px",
  color: "#000000",
  wordBreak: "break-all" as const,
  margin: "0 0 16px 0",
};

const hr = {
  borderTop: "1px solid #e5e5e5",    // tokens.css: --color-hairline
  margin: "32px 0 16px 0",
};

const footer = {
  fontSize: "12px",                  // tokens.css: --font-size-caption-sm
  lineHeight: "16px",
  color: "#737373",                  // tokens.css: --color-body
};
```

### Why each part is shaped the way it is

**`<Preview>`** — the snippet text shown in the inbox list (Gmail, Apple Mail, etc.) before the user opens the email. Make it descriptive and action-oriented. If absent, clients use the first line of body text, which is often unhelpful ("Hi {name},...").

**`<Container>` with `maxWidth: "560px"`** — emails are typically read in narrow panes (Outlook reading pane, mobile). 560px is a standard email-safe width that doesn't get clipped.

**`<Button href>` not `<a>`** — React Email's `<Button>` component renders to a properly-attributed `<a>` styled as a button, with the table-cell wrapper Outlook needs. Don't hand-roll buttons.

**Showing the URL as plain text** below the button — many corporate email clients strip or proxy button URLs. Pasting the link as text is the fallback.

**`as const` on `textAlign` and `wordBreak`** — TypeScript needs help understanding that these strings are valid CSS values, not arbitrary strings.

**The footer disclaimer** — "If you didn't create a SecureGate account, you can safely ignore this email." This is standard anti-confusion language for transactional emails. Required by some email-best-practice frameworks.

---

## 4. The Password Reset Template

`src/emails/reset-password.tsx`:

```tsx
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface ResetPasswordProps {
  name: string;
  resetUrl: string;
}

export function ResetPassword({ name, resetUrl }: ResetPasswordProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your SecureGate password. This link expires in 1 hour.</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading as="h1" style={heading}>Reset your password</Heading>
          <Text style={text}>Hi {name},</Text>
          <Text style={text}>
            We received a request to reset your password. Click the button below to choose a new one.
            This link will expire in 1 hour.
          </Text>
          <Section style={buttonContainer}>
            <Button href={resetUrl} style={button}>
              Reset password
            </Button>
          </Section>
          <Text style={textSmall}>
            Or copy and paste this link into your browser:
          </Text>
          <Text style={link}>{resetUrl}</Text>
          <Hr style={hr} />
          <Text style={footer}>
            If you didn't request a password reset, you can safely ignore this email.
            Your password will not change unless you click the link above.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Styles MUST be extracted to a shared file. Duplicating style objects
// across templates is fragile — the first edit that touches one template's
// styles MUST also update src/emails/_styles.ts and re-import it in both
// templates. Don't copy styles; import them.

// import { body, container, heading, text, textSmall, buttonContainer,
//         button, link, hr, footer } from "./_styles";
```

### Why the disclaimer in reset is longer

The footer in reset specifically reassures the user that their password won't change unless they click the link. This is important because reset emails sometimes go to users who didn't request them (someone typo'd their email, or an attacker is fishing). The reassurance reduces panic and support burden.

---

## 5. Local Preview Workflow

React Email ships a dev server that renders templates with hot reload:

`package.json`:

```json
{
  "scripts": {
    "email:dev": "email dev --dir src/emails"
  }
}
```

Run:

```bash
npm run email:dev
```

Opens a browser at `http://localhost:3000` (yes, conflicts with Next.js — change the port if both are running) showing every template under `src/emails/` with a live preview. Edit the file, save, see the change.

**Use this every time you touch a template.** Don't ship without previewing.

### What to look for in preview

1. The button renders as a button, not a plain link
2. Long URLs wrap rather than overflow the container
3. The Preview text appears in the simulated inbox snippet
4. Mobile view (toggle the viewport size) doesn't break the layout
5. Dark mode (toggle in the React Email preview UI) doesn't make text invisible against a dark background

---

## 6. Testing Across Real Clients

Local preview catches structural issues but not client-specific rendering bugs. Three testing approaches:

### Option A — Send to your own inboxes (cheapest)

Sign up for free Gmail, Outlook.com, Yahoo accounts. Send the email to all three (and your iCloud/Apple Mail if you have one). Inspect:
- Inbox vs spam folder placement
- Visual rendering in each client
- Button click behavior

### Option B — Resend's test addresses

Resend has special test addresses you can send to without consuming quota:

```
delivered@resend.dev   → simulates successful delivery
bounced@resend.dev     → simulates a bounce
complained@resend.dev  → simulates a spam complaint
```

Useful for testing the *send* path (does your code handle errors correctly) more than the render path.

### Option C — Litmus or Email on Acid (commercial)

Paid services that render your email across 50+ clients simultaneously. Overkill for SecureGate's two templates; consider if you ever scale to a marketing email program.

For SecureGate, Option A is sufficient.

---

## 7. Deliverability — Don't Land in Spam

Even a perfect template lands in spam if the sending domain isn't configured correctly. Three things must be set up:

### 7.1 — Domain verification in Resend

In Resend's dashboard, add `securegate.dev` as a sending domain. Resend will provide DNS records you need to add.

### 7.2 — SPF (Sender Policy Framework)

DNS TXT record on `securegate.dev`:

```
v=spf1 include:amazonses.com ~all
```

(Resend uses Amazon SES under the hood. The exact include value comes from Resend's dashboard — copy from there, don't hand-write it.)

### 7.3 — DKIM (DomainKeys Identified Mail)

Resend provides three DNS CNAME records. Add them as-instructed. They enable cryptographic signing of every email so receivers can verify the sender.

### 7.4 — DMARC (optional but recommended)

DNS TXT record on `_dmarc.securegate.dev`:

```
v=DMARC1; p=none; rua=mailto:dmarc-reports@securegate.dev
```

Start with `p=none` (monitor only). Once you have a few weeks of clean DMARC reports, upgrade to `p=quarantine` or `p=reject` for stricter enforcement.

### 7.5 — The `from` address

Use a real-looking `from`:

```
SecureGate <no-reply@securegate.dev>
```

Never `Resend <onboarding@resend.dev>` (the default for unverified domains) — these go straight to spam in production and look unprofessional.

### 7.6 — Avoid spam-trigger content

- No ALL CAPS subject lines
- No excessive punctuation (`!!!`, `???`)
- No "FREE" or "WINNER" or "CONGRATULATIONS"
- Reasonable text-to-HTML ratio (the templates above are fine)
- Include the plain-text version (`text:` field — see Section 2)

---

## 8. The `verifyUrl` and `resetUrl` — Construction Rules

These URLs are constructed in the API route, not in the email template. The template just receives them as props.

```ts
// In the signup API route
import { issueVerificationToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/email";

const { token } = await issueVerificationToken(email);

// CRITICAL: use NEXTAUTH_URL, not a hardcoded host.
// In dev: http://localhost:3000
// In prod: https://app.securegate.dev
const verifyUrl = `${env.NEXTAUTH_URL}/verify-email/${token}`;

await sendVerificationEmail({ to: email, name, verifyUrl });
```

### Rules

- **Use `env.NEXTAUTH_URL`** (from the validated env module), not a hardcoded value. Otherwise dev emails point at production and vice versa.
- **Use HTTPS in production.** `NEXTAUTH_URL` should be `https://...` in Vercel env. If you ever see `http://` in a verification email link from production, that's a deployment misconfiguration to fix immediately.
- **URL-encode the token if it contains special characters.** `crypto.randomBytes(32).toString('hex')` produces only `[a-f0-9]` so encoding is not strictly needed, but `encodeURIComponent(token)` is defensive.
- **The token is the only secret in the URL.** Never append the user's email, ID, or any other identifier to the URL — they'd then live in browser history and referer headers.

---

## 9. Email-Send Error Handling

`resend.emails.send` returns `{ data, error }`. Both can be present (rare), or one or the other.

```ts
const { data, error } = await resend.emails.send({ ... });

if (error) {
  if (process.env.NODE_ENV !== "production") {
    console.error("[email/verify] send failed", { error, to: params.to });
  }
  // The user signed up successfully but the email failed to send.
  // Don't throw at the user — the account exists, they just won't get email.
  // Surface a "resend verification" option in the UI.
  throw new Error("Email send failed");
}
```

### What to do on send failure

- **Log the error server-side** with the recipient address (so support can troubleshoot). Guard with `process.env.NODE_ENV !== "production"` so PII is not logged in production.
- **Do not surface the error to the user in detail** — generic "We couldn't send the email. Please try resending." is sufficient
- **Don't roll back the signup** — the user account is fine, only the email failed. The "resend verification" flow exists for this.
- **Don't retry inline** — Resend handles retries internally. Hammering the API on transient failures makes things worse.

### The caller pattern — wrap the email call, never let it fail the signup

The helpers throw on send failure. **The calling API route must catch the throw and continue**, otherwise a transient Resend outage would surface to the user as a 500 and the "don't roll back the signup" guidance becomes prose-only:

```ts
// src/app/api/signup/route.ts (excerpt)
const user = await prisma.user.create({ data: { ... } });
const { token } = await issueVerificationToken(user.email);
const verifyUrl = `${env.NEXTAUTH_URL}/verify-email/${token}`;

// Email is best-effort. The account is already created; if Resend fails the
// user can request another verification email from the UI.
let emailSent = true;
try {
  await sendVerificationEmail({ to: user.email, name: user.name, verifyUrl });
} catch {
  emailSent = false;
}

return okWithMessage(
  emailSent
    ? "Account created. Check your email to verify."
    : "Account created. We couldn't send the verification email — please request a new one from the login page."
);
```

The signup returns success either way. The UI tells the user what happened. The "resend verification" CTA exists to make the recovery path one click.

---

## 10. What to Never Do

- **Never use external `<style>` tags or `<link rel="stylesheet">`.** Many clients strip them.
- **Never use CSS variables.** Computed styles don't propagate through email rendering. Hardcode the values.
- **Never use flexbox or grid.** Outlook desktop won't render them.
- **Never use `position: absolute/fixed`.** Almost no client supports them.
- **Never embed images via `<img src="data:...">`** Base64-encoded images bloat the email and some clients block them.
- **Never use forms or interactive elements.** Most clients strip them; the ones that don't can't post to your API anyway.
- **Never include JavaScript.** Universally blocked.
- **Never send emails from a non-verified `from` domain.** The deliverability hit is catastrophic.
- **Never include user-supplied content without escaping.** React Email escapes by default, but be careful if you ever use `dangerouslySetInnerHTML` (don't).
- **Never log the rendered email HTML.** It contains the verification URL with the token, which is sensitive.

---

## 11. Pre-Commit Self-Check

Before declaring an email template done:

- [ ] Template is in `src/emails/`, kebab-case filename, named export
- [ ] All styles are inline (no className, no `<style>` blocks)
- [ ] `<Preview>` element present with descriptive text
- [ ] `<Button>` from `@react-email/components`, not a hand-rolled `<a>`
- [ ] URL is shown as plain text below the button (for clients that strip button URLs)
- [ ] Footer includes an "if this wasn't you" disclaimer
- [ ] Token URL is constructed from `env.NEXTAUTH_URL` (validated env module), not hardcoded
- [ ] Both `html` and `text` versions are sent (text via React Email's `render(..., { plainText: true })`)
- [ ] `List-Unsubscribe` and `List-Unsubscribe-Post` headers are set in `resend.emails.send` (Gmail 2024+ sender requirement)
- [ ] `<Heading as="h1">` (or other explicit level) — never rely on the default
- [ ] Preview tested locally via `npm run email:dev`
- [ ] Sent to at least one real Gmail inbox and verified rendering
- [ ] `from` address uses the verified `securegate.dev` domain
- [ ] Resend `data`/`error` response is checked; errors logged with recipient context, guarded by `process.env.NODE_ENV !== "production"`
- [ ] Calling route wraps `sendVerificationEmail` / `sendResetEmail` in try/catch so a send failure does not fail the signup (§9)
- [ ] Dark mode toggle in preview doesn't make text invisible; foreground/background contrast is maintained
- [ ] No `console.log` of the rendered HTML or the token URL

---

## 12. Related

- **Skill:** `prisma-auth-schema-and-migrations` §5 (token generation that produces the token used in the email URL)
- **Skill:** `api-route-scaffolder` (the routes that call `sendVerificationEmail` and `sendResetEmail`)
- **Rule:** `.agent/rules/security.md` §2 (token lifecycle), §10 (env var management for `RESEND_API_KEY`)
- **Rule:** `.agent/rules/architecture.md` §1 (where emails live in the folder tree), §7 (the rare-but-acceptable token-style-duplication note for email templates)
