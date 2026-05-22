// Single-stroke inline check. Used by pricing feature-bullets per
// DESIGN.md — replaces the U+2713 dingbat glyph (project bans Unicode
// emoji/dingbat glyphs in source). Inherits currentColor.

interface CheckIconProps {
  size?: number;
  className?: string;
}

export function CheckIcon({ size = 16, className }: CheckIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M5 12 L10 17 L19 7" />
    </svg>
  );
}
