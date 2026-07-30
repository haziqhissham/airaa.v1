import "server-only";

/**
 * Prisma client singleton (server-only). Reused across hot reloads in dev.
 * Backed by Supabase Postgres via DATABASE_URL. Repositories in lib/db build on
 * this in Step 4.
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
