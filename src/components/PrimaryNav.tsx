import Link from "next/link";
import { ShieldMark } from "@/components/icons/ShieldMark";
import { Button } from "@/components/ui/Button";

// Per DESIGN.md primary-nav: canvas bg, ink text, h-nav (56px), hairline
// bottom border. Server Component — the marketing layout reads the
// session and passes user state so the nav renders the right CTA cluster
// without a client-side hydration flash.

interface PrimaryNavProps {
  isAuthenticated: boolean;
}

const GITHUB_URL = "https://github.com/FreeZu/SecureGate";

export function PrimaryNav({ isAuthenticated }: PrimaryNavProps) {
  return (
    <header
      className="w-full bg-canvas"
      style={{ borderBottom: "1px solid var(--color-hairline)" }}
    >
      <nav className="mx-auto flex h-nav max-w-content items-center justify-between px-xl">
        <Link href="/" className="flex items-center gap-sm text-ink">
          <ShieldMark size={28} />
          <span className="text-body-md font-display font-semibold">SecureGate</span>
        </Link>

        <div className="flex items-center gap-lg text-body-sm font-medium text-ink">
          <Link href="/pricing" className="hidden sm:inline">
            Pricing
          </Link>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="hidden sm:inline">
            GitHub
          </a>
          {isAuthenticated ? (
            <Link href="/dashboard" className="inline-flex">
              <Button>Dashboard</Button>
            </Link>
          ) : (
            <>
              <Link href="/auth/login" className="hidden sm:inline">
                Sign in
              </Link>
              <Link href="/auth/signup" className="inline-flex">
                <Button>Get started</Button>
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
