"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { PasswordStrength } from "@/components/PasswordStrength";

type Status = "idle" | "submitting" | "success" | "error";

interface ResetPasswordFormProps {
  token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  // Live mismatch check. Hidden while the confirm field is empty so we do not
  // flag a mismatch before the user has finished typing it.
  const mismatchError =
    confirm.length > 0 && password !== confirm ? "Passwords do not match." : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mismatchError) return;
    setStatus("submitting");

    try {
      const r = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (r.ok) {
        setStatus("success");
        setTimeout(() => router.push("/auth/login"), 1200);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  const isSubmitting = status === "submitting";
  const isDone = status === "success";

  if (isDone) {
    return (
      <p role="alert" aria-live="polite" className="text-body-md text-body">
        Password updated. Redirecting to sign in…
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-lg" noValidate>
      <div>
        <TextInput
          id="reset-password"
          label="New password"
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
      <TextInput
        id="reset-password-confirm"
        label="Confirm new password"
        type="password"
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
        required
        disabled={isSubmitting}
        minLength={8}
        maxLength={72}
        error={mismatchError ?? undefined}
      />
      {status === "error" && (
        <div role="alert" aria-live="polite">
          <p className="text-body-sm" style={{ color: "var(--color-error)" }}>
            We couldn&apos;t reset your password. The link may have expired, or the password
            doesn&apos;t meet the requirements.
          </p>
          <p className="mt-md text-body-sm text-body">
            <Link href="/auth/forgot-password" className="underline">
              Request a new reset link
            </Link>
          </p>
        </div>
      )}
      <Button
        type="submit"
        isLoading={isSubmitting}
        disabled={!password || !confirm || !!mismatchError}
        className="self-start mt-sm"
      >
        {isSubmitting ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
