import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Edge runtime can't import @/lib/env (Zod's parse can interact poorly with
// the Edge bundler depending on dependencies). NEXTAUTH_SECRET is read via
// process.env here; the Node-side env module still validates it at boot.

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

    // Phase 3 adds the emailVerified check:
    //   if (!token.emailVerified) return NextResponse.redirect(new URL("/verify-email-required", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
