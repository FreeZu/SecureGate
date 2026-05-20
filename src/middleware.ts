import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Edge runtime. NEXTAUTH_SECRET is read via process.env here (the validated
// env module is Node-only); any Node code path that imports @/lib/env will
// still fail at boot if the value is missing.

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/dashboard")) {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // Not signed in -> bounce to /login with a callback URL.
    if (!token) {
      const url = new URL("/login", req.url);
      url.searchParams.set("callbackUrl", req.url);
      return NextResponse.redirect(url);
    }

    // Signed in but email not verified -> verification landing page.
    // emailVerified is a Date when verified, null otherwise. Cast through
    // the augmented JWT interface from src/types/next-auth.d.ts.
    if (!token.emailVerified) {
      return NextResponse.redirect(new URL("/verify-email-required", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
