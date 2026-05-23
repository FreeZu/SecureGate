import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { PadlockMark } from "@/components/icons/PadlockMark";
import { PrimaryNav } from "@/components/PrimaryNav";

// Ollama-style landing: nav at the top, big centered illustration with a
// tiny sub-line and a two-line headline, then sparse whitespace, then a
// "Get started with SecureGate" close at the bottom. No code-snippet
// pill, no middle promo sections — sparse on purpose.

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  return (
    <>
      <PrimaryNav isAuthenticated={!!session} />

      <main>
        {/* Hero */}
        <section className="flex flex-col items-center px-xl pt-section pb-section text-center">
          <div className="text-ink">
            <PadlockMark size={160} />
          </div>
          <p className="mt-xl text-body-md text-body">Authentication, hardened</p>
          <h1 className="mt-md max-w-[680px] text-display-xl font-display font-medium text-ink">
            Secured authentication
            <br />
            built for your software
          </h1>
        </section>

        {/* Bottom close — single oversized black pill */}
        <section className="flex flex-col items-center px-xl pb-section text-center">
          <Link href="/auth/signup" className="inline-flex">
            <Button className="!h-20 !px-16 !text-xl">Get started</Button>
          </Link>
        </section>
      </main>
    </>
  );
}
