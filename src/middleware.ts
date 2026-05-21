import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { rateLimit } from "@/lib/rate-limit";

// Edge runtime.

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rate-limit NextAuth's credential signin endpoint per security.md §3
  // (5 / IP / 10 min). Intercepted here because the route belongs to
  // NextAuth's catch-all; doing it in middleware keeps the limiter ahead
  // of any DB work and concentrates rate-limit logic in one place.
  if (pathname === "/api/auth/callback/credentials" && req.method === "POST") {
    const rl = await rateLimit(req, "auth-signin");
    if (!rl.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "Too many sign-in attempts. Please wait a few minutes before trying again.",
        },
        {
          status: 429,
          headers: { "Retry-After": String(rl.retryAfterSeconds) },
        },
      );
    }
  }

  if (pathname.startsWith("/dashboard")) {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      const url = new URL("/auth/login", req.url);
      url.searchParams.set("callbackUrl", req.url);
      return NextResponse.redirect(url);
    }

    if (!token.emailVerified) {
      return NextResponse.redirect(new URL("/auth/verify-email-required", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/auth/callback/:path*"],
};
