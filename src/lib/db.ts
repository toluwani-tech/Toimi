import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// The local `npx prisma dev` proxy mishandles unnamed prepared statements under
// concurrent pooled connections ("bind message supplies N parameters, but prepared
// statement requires M") — a bug in that proxy, not the adapter or a real Postgres
// server. Capping the pool to a single connection avoids the race; only needed for
// this local dev database, not for a real hosted Postgres (e.g. Neon) in production.
const isLocalDevProxy = process.env.DATABASE_URL?.includes("localhost");
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ...(isLocalDevProxy ? { max: 1 } : {}),
});

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
