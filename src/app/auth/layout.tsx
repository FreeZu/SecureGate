import { PrimaryNav } from "@/components/PrimaryNav";

// Centered-card shell per design-system.md §3 (Auth Card). The card chrome
// itself (border, radius, padding) belongs on the form components in Phase 6;
// this layout only centers the column and provides vertical rhythm.
//
// PrimaryNav is mounted here with hideAuthCtas so users on /auth/* can click
// the wordmark to return to marketing without seeing a "Sign in" link that
// points at the page they're already on.

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <PrimaryNav isAuthenticated={false} hideAuthCtas />
      <main className="mx-auto flex w-full max-w-auth-card flex-1 flex-col justify-center px-lg py-xxl">
        {children}
      </main>
    </div>
  );
}
