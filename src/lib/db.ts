import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";

function getDatabaseUrl(): string {
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    const tmpDbPath = path.join("/tmp", "dev.db");
    const sourceDbPath = path.join(process.cwd(), "prisma", "dev.db");

    try {
      if (!fs.existsSync(tmpDbPath)) {
        if (fs.existsSync(sourceDbPath)) {
          fs.copyFileSync(sourceDbPath, tmpDbPath);
        }
      }
      return `file:${tmpDbPath}`;
    } catch (e) {
      console.error("Error setting up SQLite in /tmp:", e);
    }
  }

  return process.env.DATABASE_URL || "file:./dev.db";
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
