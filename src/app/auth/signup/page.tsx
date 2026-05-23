import { AuthCard } from "@/components/AuthCard";
import { SignupForm } from "@/components/forms/SignupForm";

export default function SignupPage() {
  return (
    <AuthCard>
      <h1 className="text-heading-lg font-display font-semibold text-ink">
        Create your account
      </h1>
      <p className="mt-lg text-body-md text-body">
        A verification link will be sent to your email for confirmation.
      </p>
      <div className="mt-xl">
        <SignupForm />
      </div>
    </AuthCard>
  );
}
