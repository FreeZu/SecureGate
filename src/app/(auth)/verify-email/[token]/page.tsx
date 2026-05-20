"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Reads the token from the URL segment and POSTs it to /api/verify-email
// so the token never ends up in server access logs / referrer headers
// (per react-email-templates §8 and the api-route-scaffolder note about
// flat token routes).

type Status = "verifying" | "success" | "error";

export default function VerifyEmailTokenPage({ params }: { params: { token: string } }) {
  const [status, setStatus] = useState<Status>("verifying");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: params.token }),
    })
      .then((r) => {
        if (cancelled) return;
        setStatus(r.ok ? "success" : "error");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [params.token]);

  return (
    <div
      className="w-full rounded-lg p-xxl"
      style={{ border: "1px solid var(--color-hairline)" }}
    >
      {status === "verifying" && (
        <>
          <h1 className="text-heading-lg font-display font-semibold text-ink">
            Verifying your email…
          </h1>
          <p className="mt-lg text-body-md text-body">One moment.</p>
        </>
      )}
      {status === "success" && (
        <>
          <h1 className="text-heading-lg font-display font-semibold text-ink">
            Email verified
          </h1>
          <p className="mt-lg text-body-md text-body">
            You can now sign in to your account.
          </p>
          <Link
            href="/login"
            className="mt-xl inline-block text-button-md font-medium text-primary underline"
          >
            Continue to sign in
          </Link>
        </>
      )}
      {status === "error" && (
        <>
          <h1 className="text-heading-lg font-display font-semibold text-ink">
            Link no longer valid
          </h1>
          <p className="mt-lg text-body-md text-body">
            This verification link has expired or already been used.
          </p>
          <Link
            href="/verify-email-required"
            className="mt-xl inline-block text-button-md font-medium text-primary underline"
          >
            Request a new verification email
          </Link>
        </>
      )}
    </div>
  );
}
