import { PrismaClient } from "@prisma/client";

/**
 * Shared Prisma client.
 *
 * The schema is PostgreSQL (for Vercel Postgres / Prisma Postgres in prod).
 * In local dev without a postgres URL, the client may fail to connect —
 * callers should wrap queries in try/catch and degrade gracefully.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient(): PrismaClient {
  try {
    return new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  } catch {
    // Will throw on first query — routes handle it.
    return {} as PrismaClient;
  }
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
