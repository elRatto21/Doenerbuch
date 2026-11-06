import { and, asc, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { kebabType } from "@/db/schema";

/** Standard types + the user's own (non-archived) ones, in display order. */
export async function listTypes(userId: string, { includeArchived = false } = {}) {
  return db
    .select()
    .from(kebabType)
    .where(
      and(
        or(isNull(kebabType.userId), eq(kebabType.userId, userId)),
        includeArchived ? undefined : eq(kebabType.archived, false),
      ),
    )
    .orderBy(asc(kebabType.sort), asc(kebabType.id));
}

export async function typeUsableBy(userId: string, typeId: number): Promise<boolean> {
  const row = await db.query.kebabType.findFirst({
    where: and(eq(kebabType.id, typeId), or(isNull(kebabType.userId), eq(kebabType.userId, userId))),
    columns: { id: true },
  });
  return Boolean(row);
}
