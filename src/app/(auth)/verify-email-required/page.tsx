import { AuthCard } from "@/components/AuthCard";
import { ResendVerificationForm } from "@/components/forms/ResendVerificationForm";

// Landing for two cases:
//   1. middleware redirected an authenticated-but-unverified user from /dashboard
//   2. /verify-email/[token] failed (expired or already-consumed link)
// Both cases ultimately need a fresh verification email.

export default function VerifyEmailRequiredPage() {
  return (
    <AuthCard>
      <h1 className="text-heading-lg font-display font-semibold text-ink">
        Verify your email to continue
      </h1>
      <p className="mt-lg text-body-md text-body">
        Enter the email address you signed up with and we&apos;ll send a fresh verification link.
      </p>
      <div className="mt-xl">
        <ResendVerificationForm />
      </div>
    </AuthCard>
  );
}
