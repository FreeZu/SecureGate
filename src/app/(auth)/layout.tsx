// Centered-card shell per design-system.md §3 (Auth Card). The card chrome
// itself (border, radius, padding) belongs on the form components in Phase 6;
// this layout only centers the column and provides vertical rhythm.

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-auth-card flex-col justify-center px-lg py-xxl">
      {children}
    </main>
  );
}
