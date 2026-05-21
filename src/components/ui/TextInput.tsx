"use client";

import { Label } from "./Label";

// Accessibility hooks per component-builder skill §6 and design-system.md §3:
//   - <label htmlFor> (placeholder is never a label)
//   - aria-invalid mirrors !!error
//   - aria-describedby points at error AND helper ids when each is present
//   - Error message has role="alert" so screen readers announce immediately

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
}: TextInputProps) {
  const errorId = error ? `${id}-error` : undefined;
  const helperId = helper ? `${id}-helper` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(" ") || undefined;
  const hasError = !!error;

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        disabled={disabled}
        minLength={minLength}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-invalid={hasError || undefined}
        aria-describedby={describedBy}
        className="mt-sm block h-input w-full rounded-full px-lg text-body-md disabled:bg-surface-soft"
        style={{
          border: `1px solid ${hasError ? "var(--color-error)" : "var(--color-hairline)"}`,
          fontSize: "var(--font-size-body-md)",
        }}
      />
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
