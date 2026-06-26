import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // Append pgbouncer=true so Prisma avoids prepared statements,
  // which are incompatible with Supabase transaction-mode pooling (port 6543).
  const url = process.env.DATABASE_URL!;
  const connectionString = url.includes("pgbouncer=true") ? url : `${url}${url.includes("?") ? "&" : "?"}pgbouncer=true`;
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
