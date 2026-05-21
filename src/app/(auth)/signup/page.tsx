import { AuthCard } from "@/components/AuthCard";
import { SignupForm } from "@/components/forms/SignupForm";

export default function SignupPage() {
  return (
    <AuthCard>
      <h1 className="text-heading-lg font-display font-semibold text-ink">
        Create your SecureGate account
      </h1>
      <p className="mt-lg text-body-md text-body">
        Sign up with your name, email, and a password. We&apos;ll send a verification link to
        confirm your address.
      </p>
      <div className="mt-xl">
        <SignupForm />
      </div>
    </AuthCard>
  );
}
