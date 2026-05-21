"use client";

import type { ButtonHTMLAttributes } from "react";
import { Spinner } from "./Spinner";

// Primary black-pill button per design-system.md §3. The skill rule from
// component-builder §6 is enforced here: type defaults to "button" so the
// caller must explicitly opt in to "submit" on the one submit button per
// form. Stops the "Enter inside any field accidentally submits" footgun.

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
}

export function Button({
  isLoading = false,
  disabled,
  type = "button",
  children,
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={
        "inline-flex h-button items-center justify-center gap-sm rounded-full bg-primary px-xl text-button-md font-medium text-on-primary transition-colors disabled:cursor-not-allowed disabled:opacity-50 " +
        (className ?? "")
      }
      {...rest}
    >
      {isLoading ? <Spinner /> : null}
      <span>{children}</span>
    </button>
  );
}
