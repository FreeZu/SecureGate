"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";

// Posts /api/resend-verification. Existence-safe: same banner on any
// non-server-error response.

type Status = "idle" | "submitting" | "sent" | "error";

export function ResendVerificationForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    try {
      const r = await fetch("/api/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStatus(r.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  }

  const isSubmitting = status === "submitting";
  const isSent = status === "sent";

  if (isSent) {
    return (
      <div role="alert" aria-live="polite">
        <p className="text-body-md text-body">
          If an account is awaiting verification, we&apos;ve sent a new email. Check your inbox.
        </p>
        <div className="mt-lg text-body-sm text-body">
          <Link href="/auth/login" className="underline">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-lg" noValidate>
      <TextInput
        id="resend-email"
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="email"
        required
        disabled={isSubmitting}
        maxLength={254}
      />
      {status === "error" && (
        <p
          role="alert"
          aria-live="polite"
          className="text-body-sm"
          style={{ color: "var(--color-error)" }}
        >
          Something went wrong on our end. Please try again in a moment.
        </p>
      )}
      <Button
        type="submit"
        isLoading={isSubmitting}
        disabled={!email}
        className="self-start"
      >
        {isSubmitting ? "Sending…" : "Send verification email"}
      </Button>
    </form>
  );
}
