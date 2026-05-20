import type { DefaultSession } from "next-auth";

// Type augmentation per nextauth-integration skill §9. Without this file,
// session.user.id and session.user.emailVerified are typed as undefined.
// tsconfig.json includes "src/types/**/*.d.ts" so this module is in scope.

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      emailVerified: Date | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    emailVerified: Date | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    emailVerified: Date | null;
  }
}
