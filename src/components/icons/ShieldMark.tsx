// Hand-drawn line illustration of a shield with an inset check per
// DESIGN.md Shapes section. Single-stroke inline SVG (not a Unicode glyph)
// — the only illustration in the system. Inherits currentColor so the
// parent can drive the stroke via `text-ink` or similar.

interface ShieldMarkProps {
  size?: number;
}

export function ShieldMark({ size = 96 }: ShieldMarkProps) {
  return (
    <svg
      width={size}
      height={(size * 80) / 64}
      viewBox="0 0 64 80"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden="true"
      role="presentation"
    >
      {/* Shield silhouette */}
      <path d="M32 4 L8 14 V36 C8 54 20 70 32 76 C44 70 56 54 56 36 V14 Z" />
      {/* Inset check stroke */}
      <path d="M21 38 L29 46 L43 30" />
    </svg>
  );
}
