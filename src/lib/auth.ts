import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { loginSchema } from "@/lib/validations/auth";

// Full authOptions per nextauth-integration skill §4.
//
// A valid-format bcrypt hash that will never match. Used in the timing-attack
// mitigation when the user is not found, so bcrypt.compare always runs and
// response time doesn't leak account existence. See security.md §5.
const DUMMY_HASH = "$2b$12$" + "x".repeat(53);

export const authOptions: NextAuthOptions = {
  // 1. Session strategy. JWT chosen per README rationale; no DB round-trip
  //    per request, 7-day inactivity timeout. jwt.maxAge is redundant when
  //    strategy is "jwt" (session.maxAge already drives expiry) but is set
  //    explicitly so a future strategy change preserves the intent.
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60,
  },
  jwt: {
    maxAge: 7 * 24 * 60 * 60,
  },

  // 2. Secret from the validated env module (fails fast at boot if missing
  //    or too short — see security.md §10).
  secret: env.NEXTAUTH_SECRET,

  // 3. Custom pages — redirect NextAuth's default UI to SecureGate routes.
  pages: {
    signIn: "/auth/login",
    signOut: "/auth/login",
    error: "/auth/login",
  },

  // 4. Credentials provider.
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        // NextAuth's default sign-in page never renders because pages.signIn
        // redirects to /login, but the provider definition still requires the
        // credentials shape.
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });

        // Constant-time comparison. Always run bcrypt.compare even if the
        // user doesn't exist (see security.md §5).
        const isValid = user
          ? await bcrypt.compare(password, user.password)
          : await bcrypt.compare(password, DUMMY_HASH);

        if (!user || !isValid) return null;

        // Allow-list only the fields we want to carry into the JWT. Never the
        // password, even hashed (the JWT body is base64-decodable).
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // `user` is defined only on initial sign-in; on subsequent reads only
      // `token` is passed. Copying fields here makes them available to the
      // session callback.
      if (user) {
        token.id = user.id;
        token.emailVerified = user.emailVerified;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.emailVerified = token.emailVerified;
      }
      return session;
    },
  },

  // NODE_ENV is framework-managed and never a secret, so process.env is fine
  // here rather than the validated env module.
  debug: process.env.NODE_ENV === "development",
};
