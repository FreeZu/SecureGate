import { AuthCard } from "@/components/AuthCard";
import { ResetPasswordForm } from "@/components/forms/ResetPasswordForm";

export default function ResetPasswordTokenPage({ params }: { params: { token: string } }) {
  return (
    <AuthCard>
      <h1 className="text-heading-lg font-display font-semibold text-ink">Choose a new password</h1>
      <div className="mt-xl">
        <ResetPasswordForm token={params.token} />
      </div>
    </AuthCard>
  );
}
