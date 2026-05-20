"use client";

import { useState } from "react";
import Link from "next/link";

// Phase 4 placeholder. Phase 6 polishes with the shared form components.
// The success state is shown unconditionally on any non-server-error
// response — per security.md §5 the endpoint itself always returns the
// same body, so the UI shows the same banner regardless of whether the
// email is registered.

type Status = "idle" | "sending" | "sent" | "error";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const r = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStatus(r.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div
      className="w-full rounded-lg p-xxl"
      style={{ border: "1px solid var(--color-hairline)" }}
    >
      <h1 className="text-heading-lg font-display font-semibold text-ink">
        Reset your password
      </h1>
      <p className="mt-lg text-body-md text-body">
        Enter your account email and we&apos;ll send you a reset link if an account
        exists.
      </p>
      <form onSubmit={handleSubmit} className="mt-xl">
        <label htmlFor="forgot-email" className="text-body-sm font-medium text-ink">
          Email
        </label>
        <input
          id="forgot-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === "sending"}
          className="mt-sm block h-input w-full rounded-full px-lg"
          style={{
            border: "1px solid var(--color-hairline)",
            fontSize: "var(--font-size-body-md)",
          }}
        />
        <button
          type="submit"
          disabled={status === "sending" || !email}
          aria-busy={status === "sending"}
          className="mt-lg inline-flex h-button items-center justify-center rounded-full bg-primary px-xl text-button-md font-medium text-on-primary disabled:opacity-50"
        >
          {status === "sending" ? "Sending…" : "Send reset link"}
        </button>
      </form>
      {status === "sent" && (
        <p role="alert" aria-live="polite" className="mt-lg text-body-sm text-body">
          If an account exists for that email, we&apos;ve sent a reset link. Check
          your inbox.
        </p>
      )}
      {status === "error" && (
        <p
          role="alert"
          aria-live="polite"
          className="mt-lg text-body-sm"
          style={{ color: "var(--color-error)" }}
        >
          Something went wrong on our end. Please try again in a moment.
        </p>
      )}
      <p className="mt-xl text-body-sm text-body">
        <Link href="/login" className="underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
