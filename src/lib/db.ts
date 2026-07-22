import dotenv from "dotenv";
import path from "node:path";
import { Pool as PgPool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/src/generated/prisma/client";

// Neon env pull escribe en .env; debe ganar sobre .env.local (SQLite local).
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env", override: true });

function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  if (url.startsWith("file:")) {
    const filePath = url.replace(/^file:/, "");
    const absolute = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath);
    return absolute;
  }
  return url;
}

function isPostgresUrl(url: string): boolean {
  return url.startsWith("postgres://") || url.startsWith("postgresql://");
}

function createPrismaClient() {
  const url = resolveDatabaseUrl();

  if (isPostgresUrl(url)) {
    const pool = new PgPool({ connectionString: url });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  }

  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export { createPrismaClient };
