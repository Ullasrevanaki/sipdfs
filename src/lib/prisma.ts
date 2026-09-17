import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const configuredConnectionString = process.env.DIRECT_URL;

if (!configuredConnectionString) {
  throw new Error("DIRECT_URL is not defined");
}

// pg 8.23 warns that `sslmode=require` will change meaning in pg 9.
// `verify-full` preserves the current secure behavior explicitly.
const connectionUrl = new URL(configuredConnectionString);
if (["prefer", "require", "verify-ca"].includes(connectionUrl.searchParams.get("sslmode") ?? "")) {
  connectionUrl.searchParams.set("sslmode", "verify-full");
}

const adapter = new PrismaPg({
  connectionString: connectionUrl.toString(),
});

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
