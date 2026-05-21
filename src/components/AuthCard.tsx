// Centered auth-card container per design-system.md §3.
// border: 1px solid hairline, radius lg, padding xxl, max-width auth-card.
// The layout in (auth)/layout.tsx centers this; the card itself is just the
// chromed box around the form contents.

interface AuthCardProps {
  children: React.ReactNode;
}

export function AuthCard({ children }: AuthCardProps) {
  return (
    <div
      className="w-full rounded-lg p-xxl"
      style={{ border: "1px solid var(--color-hairline)" }}
    >
      {children}
    </div>
  );
}
