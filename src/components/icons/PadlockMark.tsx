import Image from "next/image";

// Renders public/padlock.png (the hand-drawn open-shackle sketch).
// `size` controls the rendered height; width is derived from the source
// aspect ratio (302:492 ≈ 0.614). priority is set because both usages
// (hero + nav brand mark) sit above the fold.
//
// Replacement note: to swap the brand mark again, either drop a new file
// at public/padlock.png (same dimensions) or update PADLOCK_ASPECT below.

const PADLOCK_ASPECT = 302 / 492;

interface PadlockMarkProps {
  size?: number;
}

export function PadlockMark({ size = 160 }: PadlockMarkProps) {
  return (
    <Image
      src="/padlock.png"
      alt=""
      width={Math.round(size * PADLOCK_ASPECT)}
      height={size}
      priority
    />
  );
}
