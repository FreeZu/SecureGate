import { AuthCard } from "@/components/AuthCard";
import { ResetPasswordForm } from "@/components/forms/ResetPasswordForm";

export default function ResetPasswordTokenPage({ params }: { params: { token: string } }) {
  return (
    <AuthCard>
      <h1 className="text-heading-lg font-display font-semibold text-ink">Choose a new password</h1>
      <p className="mt-lg text-body-md text-body">
        Pick a password with at least 8 characters that includes a letter and a number.
      </p>
      <div className="mt-xl">
        <ResetPasswordForm token={params.token} />
      </div>
    </AuthCard>
  );
}
