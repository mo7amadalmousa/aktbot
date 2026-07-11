import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 — الاتصال عبر driver adapter (pooled عادي، لا serverless driver).
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

// Singleton — يمنع تعدّد اتصالات Prisma أثناء التطوير (hot reload).
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
