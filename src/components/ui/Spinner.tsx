// Inline SVG spinner. Inherits currentColor so it pairs with the button text.
// Accessible via aria-hidden — the parent button uses aria-busy to announce
// loading state to assistive tech.

interface SpinnerProps {
  size?: number;
}

export function Spinner({ size = 16 }: SpinnerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      role="presentation"
      style={{ animation: "sg-spin 720ms linear infinite" }}
    >
      <style>{`@keyframes sg-spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
