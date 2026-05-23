"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { PasswordStrength } from "@/components/PasswordStrength";

// /api/signup is existence-safe: the same success body is returned whether
// the account is new, duplicate, or Resend rejected the verification email
// (security.md §5). The form mirrors that — on a 200 response we always
// show "check your email" regardless of internal branch.

type Status = "idle" | "submitting" | "success" | "error";

// Mirror of server-side rule in src/lib/validations/auth.ts. Kept loose
// on purpose — the server's Zod schema is the source of truth; this only
// blocks obvious mistakes before a network round-trip.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  // Live, derived per render. The `length > 0` guard keeps us from yelling
  // at the user the moment the page loads — an empty field is "not yet
  // filled," not "wrong."
  const nameError =
    name.length > 0 && name.trim().length < 2
      ? "Name must be at least 2 characters."
      : null;
  const emailError =
    email.length > 0 && !EMAIL_RE.test(email.trim())
      ? "Please enter a valid email address."
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (nameError || emailError) return;
    setStatus("submitting");
    setError(null);

    try {
      const r = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      if (r.ok) {
        setStatus("success");
      } else {
        // Status 400: validation failed (existence-safe — same wording for
        // any field that failed). 429: rate-limit. 500: server error.
        const body = await r.json().catch(() => ({ error: undefined }));
        setStatus("error");
        setError(
          body?.error ??
            "We couldn't create your account. Please check your details and try again.",
        );
      }
    } catch {
      setStatus("error");
      setError("Something went wrong on our end. Please try again.");
    }
  }

  const isSubmitting = status === "submitting";
  const isDone = status === "success";

  if (isDone) {
    return (
      <div role="alert" aria-live="polite">
        <p className="text-body-md text-body">
          Check your email to confirm your account. The verification link expires in 15 minutes.
        </p>
        <div className="mt-lg text-body-sm text-body">
          Already verified?{" "}
          <Link href="/auth/login" className="underline">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-lg" noValidate>
      <TextInput
        id="signup-name"
        label="Name"
        type="text"
        value={name}
        onChange={setName}
        autoComplete="name"
        required
        disabled={isSubmitting}
        maxLength={100}
        autoFocus
        error={nameError ?? undefined}
      />
      <TextInput
        id="signup-email"
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="email"
        required
        disabled={isSubmitting}
        maxLength={254}
        error={emailError ?? undefined}
      />
      <div>
        <TextInput
          id="signup-password"
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          required
          disabled={isSubmitting}
          minLength={8}
          maxLength={72}
          helper="At least 8 characters, with uppercase, lowercase, a number, and a symbol."
        />
        <PasswordStrength password={password} />
      </div>
      {error && (
        <p
          role="alert"
          aria-live="polite"
          className="text-body-sm"
          style={{ color: "var(--color-error)" }}
        >
          {error}
        </p>
      )}
      <Button
        type="submit"
        isLoading={isSubmitting}
        disabled={!name || !email || !password || !!nameError || !!emailError}
        className="self-start"
      >
        {isSubmitting ? "Creating account…" : "Create account"}
      </Button>
      <div className="mt-md text-body-sm text-body">
        Already have an account?{" "}
        <Link href="/auth/login" className="underline">
          Sign in
        </Link>
      </div>
    </form>
  );
}
