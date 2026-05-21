import { Suspense } from "react";
import { AuthCard } from "@/components/AuthCard";
import { LoginForm } from "@/components/forms/LoginForm";

// Suspense boundary required by useSearchParams inside LoginForm
// (nextauth-integration §5 + Next.js 14 client-side-bailout warning).

export default function LoginPage() {
  return (
    <AuthCard>
      <h1 className="text-heading-lg font-display font-semibold text-ink">Sign in to SecureGate</h1>
      <p className="mt-lg text-body-md text-body">
        Welcome back. Enter your credentials to continue.
      </p>
      <div className="mt-xl">
        <Suspense fallback={<p className="text-body-sm text-body">Loading…</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </AuthCard>
  );
}
