// Marketing home placeholder. Phase 6 will replace with a real surface;
// for Phase 1 we only need a renderable root so npm run build succeeds.
export default function HomePage() {
  return (
    <main className="mx-auto max-w-content px-xl py-section">
      <h1 className="text-display-xl font-display font-medium text-ink">SecureGate</h1>
      <p className="mt-lg text-body-md text-body">
        A focused, production-grade authentication system.
      </p>
    </main>
  );
}
