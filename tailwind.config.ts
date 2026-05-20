import type { Config } from "tailwindcss";

// Every value below reads from tokens.css via CSS custom properties.
// Per design-system.md §0 rule 5: "Tailwind config must read from CSS variables,
// never duplicate token values." Adding a new utility means first adding the
// token to tokens.css, then mapping it here.

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "var(--color-primary)",
        "ink-deep": "var(--color-ink-deep)",
        canvas: "var(--color-canvas)",
        "surface-soft": "var(--color-surface-soft)",
        "surface-dark": "var(--color-surface-dark)",
        hairline: "var(--color-hairline)",
        "hairline-strong": "var(--color-hairline-strong)",
        ink: "var(--color-ink)",
        charcoal: "var(--color-charcoal)",
        body: "var(--color-body)",
        mute: "var(--color-mute)",
        "on-primary": "var(--color-on-primary)",
        "on-dark": "var(--color-on-dark)",
        "on-dark-mute": "var(--color-on-dark-mute)",
        error: "var(--color-error)",
        "error-soft": "var(--color-error-soft)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        "info-mute": "var(--color-info-mute)",
        "focus-ring": "var(--color-focus-ring)",
      },
      fontFamily: {
        display: "var(--font-display)",
        sans: "var(--font-sans)",
        mono: "var(--font-mono)",
      },
      fontSize: {
        "display-xl": ["var(--font-size-display-xl)", { lineHeight: "var(--line-height-display-xl)" }],
        "display-lg": ["var(--font-size-display-lg)", { lineHeight: "var(--line-height-display-lg)" }],
        "heading-lg": ["var(--font-size-heading-lg)", { lineHeight: "var(--line-height-heading-lg)" }],
        "heading-md": ["var(--font-size-heading-md)", { lineHeight: "var(--line-height-heading-md)" }],
        "heading-sm": ["var(--font-size-heading-sm)", { lineHeight: "var(--line-height-heading-sm)" }],
        "body-md": ["var(--font-size-body-md)", { lineHeight: "var(--line-height-body-md)" }],
        "body-sm": ["var(--font-size-body-sm)", { lineHeight: "var(--line-height-body-sm)" }],
        "caption-sm": ["var(--font-size-caption-sm)", { lineHeight: "var(--line-height-caption-sm)" }],
        "code-md": "var(--font-size-code-md)",
        "code-sm": "var(--font-size-code-sm)",
        "button-md": ["var(--font-size-button-md)", { lineHeight: "var(--line-height-button-md)" }],
      },
      fontWeight: {
        regular: "var(--font-weight-regular)",
        medium: "var(--font-weight-medium)",
        semibold: "var(--font-weight-semibold)",
      },
      spacing: {
        xxs: "var(--spacing-xxs)",
        xs: "var(--spacing-xs)",
        sm: "var(--spacing-sm)",
        md: "var(--spacing-md)",
        lg: "var(--spacing-lg)",
        xl: "var(--spacing-xl)",
        xxl: "var(--spacing-xxl)",
        section: "var(--spacing-section)",
        "section-tablet": "var(--spacing-section-tablet)",
        "section-mobile": "var(--spacing-section-mobile)",
      },
      borderRadius: {
        none: "var(--rounded-none)",
        sm: "var(--rounded-sm)",
        md: "var(--rounded-md)",
        lg: "var(--rounded-lg)",
        full: "var(--rounded-full)",
      },
      borderWidth: {
        hairline: "var(--border-width-hairline)",
        focus: "var(--border-width-focus)",
      },
      zIndex: {
        base: "var(--z-base)",
        nav: "var(--z-nav)",
        dropdown: "var(--z-dropdown)",
        overlay: "var(--z-overlay)",
        modal: "var(--z-modal)",
        toast: "var(--z-toast)",
      },
      maxWidth: {
        "auth-card": "var(--auth-card-max-width)",
        content: "var(--content-max-width)",
        "pricing-grid": "var(--pricing-grid-max-width)",
      },
      height: {
        button: "var(--button-height)",
        input: "var(--input-height)",
        "search-pill": "var(--search-pill-height)",
        "code-snippet": "var(--code-snippet-height)",
        nav: "var(--nav-height)",
      },
      transitionDuration: {
        fast: "120ms",
        base: "180ms",
      },
    },
  },
  plugins: [],
};

export default config;
