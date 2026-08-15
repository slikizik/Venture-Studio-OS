import { PrismaClient } from "@prisma/client";

// Singleton to avoid exhausting connections in dev hot-reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// NOTE: The real PrismaClient is constructed LAZILY on first access, not at
// module load. This is the fix for a real leak: test files import @/lib services
// at the top of the file, which used to trigger `new PrismaClient()` at import
// time — BEFORE `setupTestDb()` (run in `beforeAll`) could redirect
// DATABASE_URL to an isolated test DB. The already-built singleton then kept
// pointing at the app's dev.db, so test writes leaked into the live database
// (observed as 40 stray "P-VER-*" projects in the Portfolio dashboard).
//
// By deferring construction to first use, the client binds to whatever
// DATABASE_URL is set at that moment: a test DB in tests, dev.db in the app.
export const prisma =
  globalForPrisma.prisma ??
  (new Proxy({} as PrismaClient, {
    get(_target, prop) {
      if (!lazyClient) {
        lazyClient = new PrismaClient({
          log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
        });
        if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = lazyClient;
      }
      return (lazyClient as unknown as Record<PropertyKey, unknown>)[prop];
    },
  }) as PrismaClient);

let lazyClient: PrismaClient | undefined;

export default prisma;
