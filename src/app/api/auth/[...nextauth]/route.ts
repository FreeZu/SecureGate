import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// Per nextauth-integration skill §3 / api-route-scaffolder Archetype E:
// thin handler. All business logic lives in @/lib/auth.

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
