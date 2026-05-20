"use client";

import { useState } from "react";

// Landing for two cases:
//   1. The middleware redirected an authenticated-but-unverified user here
//      from /dashboard.
//   2. A verification link expired and the verify-email/[token] page sent
//      the user here.
// In both cases the page collects an email and POSTs /api/resend-verification.
// Phase 6 may pre-fill from session (requires SessionProvider) — left as
// a manual entry for now since the page is reachable unauthenticated.

type Status = "idle" | "sending" | "sent" | "error";

export default function VerifyEmailRequiredPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const r = await fetch("/api/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      // Existence-safe: same UX for any outcome short of a server error.
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
        Verify your email to continue
      </h1>
      <p className="mt-lg text-body-md text-body">
        Enter the email address you signed up with and we&apos;ll send a fresh
        verification link.
      </p>
      <form onSubmit={handleSubmit} className="mt-xl">
        <label htmlFor="verify-email-input" className="text-body-sm font-medium text-ink">
          Email
        </label>
        <input
          id="verify-email-input"
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
          {status === "sending" ? "Sending…" : "Send verification email"}
        </button>
      </form>
      {status === "sent" && (
        <p role="alert" aria-live="polite" className="mt-lg text-body-sm text-body">
          If an account is awaiting verification, we&apos;ve sent a new email.
          Check your inbox.
        </p>
      )}
      {status === "error" && (
        <p role="alert" aria-live="polite" className="mt-lg text-body-sm" style={{ color: "var(--color-error)" }}>
          Something went wrong. Please try again in a moment.
        </p>
      )}
    </div>
  );
}
