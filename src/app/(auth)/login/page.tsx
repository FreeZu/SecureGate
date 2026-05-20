// Phase 2 placeholder. The actual LoginForm (with the open-redirect guard,
// the Suspense boundary, and the existence-safe error wording from
// nextauth-integration §5) lands in Phase 6.

export default function LoginPage() {
  return (
    <div className="w-full rounded-lg border-hairline border-solid border-hairline-strong p-xxl">
      <h1 className="text-heading-lg font-display font-semibold text-ink">
        Sign in to SecureGate
      </h1>
      <p className="mt-lg text-body-md text-body">
        The login form lands in Phase 6 — UI polish. Until then the NextAuth
        Credentials endpoint accepts POST requests directly at{" "}
        <code className="text-code-sm">/api/auth/callback/credentials</code> with
        an email/password body.
      </p>
    </div>
  );
}
