import { PrismaClient } from "@prisma/client";

// Singleton pattern per architecture.md §4. Without the global cache, every
// Next.js hot-reload spawns a new PrismaClient and exhausts DB connections.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
