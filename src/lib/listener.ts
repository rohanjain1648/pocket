import { db } from "@/lib/db";

const DEMO_HANDLE = "demo-listener";

/**
 * The Listener Hub's identity is hardcoded to one demo user rather than a
 * real auth system — but it's a genuine row in the Listener table, and
 * every session, recommendation log, and "why you'll love this" below it is
 * computed from real, persisted listening behavior, not seeded/faked data.
 */
export async function getDemoListener() {
  const existing = await db.listener.findUnique({ where: { handle: DEMO_HANDLE } });
  if (existing) return existing;
  return db.listener.create({ data: { handle: DEMO_HANDLE, displayName: "Alex" } });
}
