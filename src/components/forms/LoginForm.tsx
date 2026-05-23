"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";

// Full LoginForm per nextauth-integration §5:
//   - redirect: false so we handle success/failure in the UI
//   - router.refresh() after success so Server Components re-render with
//     the new session
//   - open-redirect guard on callbackUrl (same-origin relative paths only)
//   - useEffect to clean ?error=... off the URL so the failure breadcrumb
//     doesn't sit in history / analytics referrers
//   - generic error message for every failure mode (security.md §5)
//
// The page that renders this form must wrap it in <Suspense> because
// useSearchParams triggers Next.js 14's client-side bailout warning
// without one.

type Status = "idle" | "submitting" | "error";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();

  const rawCallbackUrl = params.get("callbackUrl") ?? "/dashboard";
  // Reject protocol-relative or absolute URLs; only allow same-origin
  // relative paths to reach router.push.
  const callbackUrl =
    rawCallbackUrl.startsWith("/") && !rawCallbackUrl.startsWith("//")
      ? rawCallbackUrl
      : "/dashboard";
  const errorParam = params.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(
    errorParam ? "We could not sign you in. Please check your details and try again." : null,
  );

  // Clean ?error= off the URL once we've read it.
  useEffect(() => {
    if (errorParam) {
      const cleaned = new URLSearchParams(params);
      cleaned.delete("error");
      const qs = cleaned.toString();
      router.replace(qs ? `/auth/login?${qs}` : "/auth/login");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorParam]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (!result?.ok) {
      setStatus("error");
      // Middleware short-circuits with 429 when the per-IP signin rate
      // limit is exceeded (security.md §3). The 429 fires regardless of
      // whether the email exists, so this message leaks no information
      // about account existence — it's about request rate, not credentials.
      if (result?.status === 429) {
        setError(
          "Too many sign-in attempts. Please wait a few minutes before trying again.",
        );
      } else {
        setError("We could not sign you in. Please check your details and try again.");
      }
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  const isSubmitting = status === "submitting";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-lg" noValidate>
      <TextInput
        id="login-email"
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="email"
        required
        disabled={isSubmitting}
        maxLength={254}
        autoFocus
      />
      <TextInput
        id="login-password"
        label="Password"
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
        required
        disabled={isSubmitting}
        maxLength={72}
      />
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
        disabled={!email || !password}
        className="self-start"
      >
        {isSubmitting ? "Signing in…" : "Sign in"}
      </Button>
      <div className="mt-md flex flex-col gap-xs text-body-sm text-body">
        <Link href="/auth/forgot-password" className="underline">
          Forgot your password?
        </Link>
        <span>
          Need an account?{" "}
          <Link href="/auth/signup" className="underline">
            Sign up
          </Link>
        </span>
      </div>
    </form>
  );
}
