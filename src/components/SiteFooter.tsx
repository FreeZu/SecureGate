import Link from "next/link";

// Per DESIGN.md footer-section: hairline top border, caption-sm body
// text, horizontal row of small links + copyright. Wraps on narrow
// screens (flex-wrap).

const GITHUB_URL = "https://github.com/FreeZu/SecureGate";

export function SiteFooter() {
  return (
    <footer
      className="mt-section pt-xl pb-xxl"
      style={{ borderTop: "1px solid var(--color-hairline)" }}
    >
      <div className="mx-auto flex max-w-content flex-wrap items-center justify-center gap-md px-xl text-caption-sm text-body">
        <Link href="/pricing" className="underline-offset-2 hover:underline">
          Pricing
        </Link>
        <span aria-hidden="true">·</span>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-2 hover:underline"
        >
          GitHub
        </a>
        <span aria-hidden="true">·</span>
        <Link href="/auth/login" className="underline-offset-2 hover:underline">
          Sign in
        </Link>
        <span aria-hidden="true">·</span>
        <span>&copy; 2026 SecureGate</span>
      </div>
    </footer>
  );
}
