"use client";

import { useState } from "react";
import { Label } from "./Label";

// Accessibility hooks per component-builder skill §6 and design-system.md §3:
//   - <label htmlFor> (placeholder is never a label)
//   - aria-invalid mirrors !!error
//   - aria-describedby points at error AND helper ids when each is present
//   - Error message has role="alert" so screen readers announce immediately
//
// Password fields get a custom reveal toggle. We render it ourselves rather
// than relying on the browser-native eye (Edge ::-ms-reveal) because that
// reveal button only appears once the user types into the field, so it is
// invisible when the password manager autofills.

interface TextInputProps {
  id: string;
  label: string;
  type?: "text" | "email" | "password";
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helper?: string;
  autoComplete?: string;
  required?: boolean;
  disabled?: boolean;
  minLength?: number;
  maxLength?: number;
  placeholder?: string;
  autoFocus?: boolean;
}

export function TextInput({
  id,
  label,
  type = "text",
  value,
  onChange,
  error,
  helper,
  autoComplete,
  required = false,
  disabled = false,
  minLength,
  maxLength,
  placeholder,
  autoFocus = false,
}: TextInputProps) {
  const errorId = error ? `${id}-error` : undefined;
  const helperId = helper ? `${id}-helper` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(" ") || undefined;
  const hasError = !!error;
  const isPassword = type === "password";

  const [revealed, setRevealed] = useState(false);
  const effectiveType = isPassword && revealed ? "text" : type;

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative mt-sm">
        <input
          id={id}
          type={effectiveType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          minLength={minLength}
          maxLength={maxLength}
          placeholder={placeholder}
          autoFocus={autoFocus}
          aria-invalid={hasError || undefined}
          aria-describedby={describedBy}
          className={
            "block h-input w-full rounded-full text-body-md disabled:bg-surface-soft " +
            (isPassword ? "pl-lg pr-12" : "px-lg")
          }
          style={{
            border: `1px solid ${hasError ? "var(--color-error)" : "var(--color-hairline)"}`,
            fontSize: "var(--font-size-body-md)",
          }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? "Hide password" : "Show password"}
            aria-pressed={revealed}
            tabIndex={disabled ? -1 : 0}
            disabled={disabled}
            className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-full text-body hover:text-ink disabled:opacity-50"
          >
            {revealed ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </div>
      {helper && (
        <p id={helperId} className="mt-xs text-body-sm text-body">
          {helper}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-xs text-body-sm"
          style={{ color: "var(--color-error)" }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

function EyeIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 3l18 18" />
      <path d="M10.6 6.2A10 10 0 0 1 12 6c6.5 0 10 6 10 6a17.6 17.6 0 0 1-3.2 4" />
      <path d="M6.6 6.6A17.5 17.5 0 0 0 2 12s3.5 6 10 6a9.9 9.9 0 0 0 4.7-1.2" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}
