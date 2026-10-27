import { and, eq, isNull, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { badge, kebabType } from "@/db/schema";
import { BADGES, STANDARD_TYPES } from "@/lib/badges";

/** Idempotently upserts badges and standard kebab types. Safe to run on every start. */
export async function syncReferenceData(db: Db) {
  await db
    .insert(badge)
    .values(BADGES.map((b) => ({ key: b.key, name: b.name, description: b.description })))
    .onConflictDoUpdate({
      target: badge.key,
      set: { name: sql`excluded.name`, description: sql`excluded.description` },
    });

  for (const [i, name] of STANDARD_TYPES.entries()) {
    const existing = await db.query.kebabType.findFirst({
      where: and(isNull(kebabType.userId), eq(kebabType.name, name)),
    });
    if (existing) {
      if (existing.sort !== i) await db.update(kebabType).set({ sort: i }).where(eq(kebabType.id, existing.id));
    } else {
      await db.insert(kebabType).values({ name, sort: i, userId: null });
    }
  }
}
