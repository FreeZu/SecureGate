// Shared inline styles for React Email templates. Per react-email-templates
// skill §4: extract style objects to a shared module to avoid the sync hazard
// of duplicating them across templates.
//
// Token values are duplicated from tokens.css because email clients do not
// load external stylesheets. Each duplication carries a `// tokens.css: ...`
// breadcrumb so a future tokens.css change can be reconciled here manually.

export const body = {
  backgroundColor: "#ffffff", // tokens.css: --color-canvas
  fontFamily: "Arial, Helvetica, sans-serif",
};

export const container = {
  margin: "0 auto",
  padding: "32px 24px", // tokens.css: --spacing-xxl, --spacing-xl
  maxWidth: "560px",
};

export const heading = {
  fontSize: "24px", // tokens.css: --font-size-heading-lg
  fontWeight: 600,
  color: "#000000", // tokens.css: --color-ink
  margin: "0 0 16px 0",
};

export const text = {
  fontSize: "16px", // tokens.css: --font-size-body-md
  lineHeight: "24px",
  color: "#525252", // tokens.css: --color-charcoal
  margin: "16px 0",
};

export const textSmall = {
  fontSize: "14px", // tokens.css: --font-size-body-sm
  lineHeight: "20px",
  color: "#737373", // tokens.css: --color-body
  margin: "16px 0 4px 0",
};

export const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
};

export const button = {
  backgroundColor: "#121111", // tokens.css: --color-primary
  color: "#ffffff", // tokens.css: --color-on-primary
  fontSize: "14px", // tokens.css: --font-size-button-md
  fontWeight: 500,
  padding: "12px 24px",
  borderRadius: "9999px", // tokens.css: --rounded-full
  textDecoration: "none",
  display: "inline-block",
};

export const link = {
  fontSize: "14px",
  color: "#000000",
  wordBreak: "break-all" as const,
  margin: "0 0 16px 0",
};

export const hr = {
  borderTop: "1px solid #e5e5e5", // tokens.css: --color-hairline
  margin: "32px 0 16px 0",
};

export const footer = {
  fontSize: "12px", // tokens.css: --font-size-caption-sm
  lineHeight: "16px",
  color: "#737373", // tokens.css: --color-body
};
