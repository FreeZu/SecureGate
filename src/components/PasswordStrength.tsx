"use client";

// Three-segment strength indicator per design-system.md §3.
//   Weak:   1 error + 2 hairline segments
//   Fair:   2 warning + 1 hairline segment
//   Strong: 3 success segments
// Recomputes on every keystroke — Client Component.

type Strength = "weak" | "fair" | "strong";

function computeStrength(password: string): Strength {
  if (password.length < 8) return "weak";

  let variety = 0;
  if (/[a-z]/.test(password)) variety++;
  if (/[A-Z]/.test(password)) variety++;
  if (/[0-9]/.test(password)) variety++;
  if (/[^a-zA-Z0-9]/.test(password)) variety++;

  if (password.length >= 12 && variety >= 3) return "strong";
  if (variety >= 2) return "fair";
  return "weak";
}

const VARIANT: Record<Strength, { label: string; filled: number; color: string }> = {
  weak: { label: "Weak", filled: 1, color: "var(--color-error)" },
  fair: { label: "Fair", filled: 2, color: "var(--color-warning)" },
  strong: { label: "Strong", filled: 3, color: "var(--color-success)" },
};

interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  if (!password) return null;

  const strength = computeStrength(password);
  const { label, filled, color } = VARIANT[strength];

  return (
    <div className="mt-sm" aria-live="polite">
      <div className="flex gap-xs" role="presentation">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              height: "4px",
              flex: 1,
              borderRadius: "var(--rounded-full)",
              backgroundColor: i < filled ? color : "var(--color-hairline)",
            }}
          />
        ))}
      </div>
      <p
        className="mt-xs text-caption-sm font-medium"
        style={{ color, fontSize: "var(--font-size-caption-sm)" }}
      >
        {label}
      </p>
    </div>
  );
}
