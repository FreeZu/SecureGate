// 16px copy-to-clipboard icon (two overlapping rounded squares). Inline
// SVG, inherits currentColor.

interface CopyIconProps {
  size?: number;
  className?: string;
}

export function CopyIcon({ size = 16, className }: CopyIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15 H4 a 1 1 0 0 1 -1 -1 V4 a 1 1 0 0 1 1 -1 H14 a 1 1 0 0 1 1 1 V5" />
    </svg>
  );
}
