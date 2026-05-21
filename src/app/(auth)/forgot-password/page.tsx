import { AuthCard } from "@/components/AuthCard";
import { ForgotPasswordForm } from "@/components/forms/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <AuthCard>
      <h1 className="text-heading-lg font-display font-semibold text-ink">Reset your password</h1>
      <p className="mt-lg text-body-md text-body">
        Enter your account email and we&apos;ll send a reset link if an account exists.
      </p>
      <div className="mt-xl">
        <ForgotPasswordForm />
      </div>
    </AuthCard>
  );
}
