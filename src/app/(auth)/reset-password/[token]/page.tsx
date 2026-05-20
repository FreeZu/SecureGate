"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Phase 4 placeholder. Posts { token, password } to /api/reset-password
// where the API does the actual bcrypt+update+delete in a transaction.
// On success the user is redirected to /login; on failure the page shows
// a generic message (the API does not distinguish "expired" from
// "weak password" — both come back as 400/404 with the same wire shape).

type Status = "idle" | "submitting" | "success" | "error" | "invalid";

export default function ResetPasswordTokenPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setStatus("invalid");
      return;
    }
    setStatus("submitting");
    try {
      const r = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: params.token, password }),
      });
      if (r.ok) {
        setStatus("success");
        // Brief pause so the user sees the success banner, then route to login.
        setTimeout(() => router.push("/login"), 1200);
      } else {
        setStatus("error");
      }
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
        Choose a new password
      </h1>
      <p className="mt-lg text-body-md text-body">
        Pick a password with at least 8 characters that includes a letter and a number.
      </p>
      <form onSubmit={handleSubmit} className="mt-xl">
        <label htmlFor="reset-password-input" className="text-body-sm font-medium text-ink">
          New password
        </label>
        <input
          id="reset-password-input"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={72}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={status === "submitting" || status === "success"}
          className="mt-sm block h-input w-full rounded-full px-lg"
          style={{
            border: "1px solid var(--color-hairline)",
            fontSize: "var(--font-size-body-md)",
          }}
        />
        <label
          htmlFor="reset-password-confirm"
          className="mt-lg block text-body-sm font-medium text-ink"
        >
          Confirm new password
        </label>
        <input
          id="reset-password-confirm"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={72}
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={status === "submitting" || status === "success"}
          className="mt-sm block h-input w-full rounded-full px-lg"
          style={{
            border: "1px solid var(--color-hairline)",
            fontSize: "var(--font-size-body-md)",
          }}
        />
        <button
          type="submit"
          disabled={status === "submitting" || status === "success" || !password || !confirm}
          aria-busy={status === "submitting"}
          className="mt-lg inline-flex h-button items-center justify-center rounded-full bg-primary px-xl text-button-md font-medium text-on-primary disabled:opacity-50"
        >
          {status === "submitting" ? "Updating…" : "Update password"}
        </button>
      </form>
      {status === "success" && (
        <p role="alert" aria-live="polite" className="mt-lg text-body-sm text-body">
          Password updated. Redirecting to sign in…
        </p>
      )}
      {status === "invalid" && (
        <p
          role="alert"
          aria-live="polite"
          className="mt-lg text-body-sm"
          style={{ color: "var(--color-error)" }}
        >
          Passwords do not match.
        </p>
      )}
      {status === "error" && (
        <>
          <p
            role="alert"
            aria-live="polite"
            className="mt-lg text-body-sm"
            style={{ color: "var(--color-error)" }}
          >
            We couldn&apos;t reset your password. The link may have expired or the
            password doesn&apos;t meet the requirements.
          </p>
          <p className="mt-md text-body-sm text-body">
            <Link href="/forgot-password" className="underline">
              Request a new reset link
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
