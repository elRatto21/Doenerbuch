import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { entry, entryCompanion } from "@/db/schema";
import { monthRange } from "@/lib/time";
import type { EntryInput } from "@/lib/validation";
import { evaluateBadges } from "@/server/badges";
import { isFriend, listFriends } from "./friends";
import { findOrCreatePlace } from "./places";
import { num, ts } from "./sql";
import { typeUsableBy } from "./types";

export class EntryError extends Error {}

async function validateInput(userId: string, input: EntryInput) {
  if (!(await typeUsableBy(userId, input.typeId))) throw new EntryError("Unbekannte Sorte.");
  if (input.photoKey && !input.photoKey.startsWith(`entries/${userId}/`)) throw new EntryError("Ungültiges Foto.");
  const friendIds = new Set((await listFriends(userId)).map((f) => f.id));
  const companions = [...new Set(input.companionIds)].filter((id) => id !== userId);
  if (companions.some((id) => !friendIds.has(id))) throw new EntryError("Du kannst nur Freunde markieren.");
  return companions;
}

function entryValues(input: EntryInput) {
  return {
    typeId: input.typeId,
    meat: input.meat,
    eatenAt: new Date(input.eatenAt),
    priceCents: input.priceCents,
    currency: input.currency,
    lat: input.lat,
    lng: input.lng,
    accuracyM: input.accuracyM,
    overall: input.overall,
    rMeat: input.rMeat,
    rBread: input.rBread,
    rSauce: input.rSauce,
    rSalad: input.rSalad,
    rPortion: input.rPortion,
    rValue: input.rValue,
    note: input.note || null,
    photoKey: input.photoKey,
  };
}

function placeInput(input: EntryInput) {
  return {
    placeId: input.placeId,
    name: input.placeName,
    address: input.placeAddress,
    city: input.placeCity,
    osmId: input.placeOsmId,
    lat: input.lat,
    lng: input.lng,
  };
}

export async function createEntry(userId: string, input: EntryInput) {
  const companions = await validateInput(userId, input);
  const id = await db.transaction(async (tx) => {
    const placeId = await findOrCreatePlace(tx, userId, placeInput(input));
    const [row] = await tx
      .insert(entry)
      .values({ userId, placeId, ...entryValues(input) })
      .returning({ id: entry.id });
    if (companions.length > 0) {
      await tx.insert(entryCompanion).values(companions.map((friendUserId) => ({ entryId: row!.id, friendUserId })));
    }
    return row!.id;
  });
  const newBadges = await evaluateBadges(userId);
  return { id, newBadges };
}

export async function updateEntry(userId: string, entryId: number, input: EntryInput) {
  const existing = await db.query.entry.findFirst({ where: and(eq(entry.id, entryId), eq(entry.userId, userId)) });
  if (!existing) throw new EntryError("Eintrag nicht gefunden.");
  const companions = await validateInput(userId, input);
  // editing without re-locating keeps the stored GPS fix
  const withPosition: EntryInput =
    input.lat == null && existing.lat != null
      ? { ...input, lat: existing.lat, lng: existing.lng, accuracyM: existing.accuracyM }
      : input;
  await db.transaction(async (tx) => {
    const placeId = await findOrCreatePlace(tx, userId, placeInput(withPosition));
    await tx
      .update(entry)
      .set({ placeId, ...entryValues(withPosition), updatedAt: new Date() })
      .where(eq(entry.id, entryId));
    await tx.delete(entryCompanion).where(eq(entryCompanion.entryId, entryId));
    if (companions.length > 0) {
      await tx.insert(entryCompanion).values(companions.map((friendUserId) => ({ entryId, friendUserId })));
    }
  });
  const newBadges = await evaluateBadges(userId);
  return { id: entryId, newBadges, oldPhotoKey: existing.photoKey !== input.photoKey ? existing.photoKey : null };
}

export async function deleteEntry(userId: string, entryId: number) {
  const [row] = await db
    .delete(entry)
    .where(and(eq(entry.id, entryId), eq(entry.userId, userId)))
    .returning({ photoKey: entry.photoKey });
  return row ?? null;
}

// --- reads ------------------------------------------------------------------

export type JournalFilters = { typeId?: number | null; minRating?: number | null; q?: string | null };

export type JournalEntry = {
  id: number;
  eatenAt: Date;
  placeName: string;
  placeAddress: string | null;
  typeName: string;
  meat: string;
  overall: number;
  priceCents: number | null;
  currency: string;
  companions: string[];
  photoKey: string | null;
};

export async function listJournal(userId: string, filters: JournalFilters = {}, limit = 50): Promise<{ entries: JournalEntry[]; hasMore: boolean }> {
  const q = filters.q?.trim();
  const rows = await db.execute<Record<string, unknown>>(sql`
    select e.id, e.eaten_at as "eatenAt", p.name as "placeName", p.address as "placeAddress", t.name as "typeName",
      e.meat, e.overall, e.price_cents as "priceCents", e.currency, e.photo_key as "photoKey",
      coalesce((select array_agg(u.name order by u.name) from entry_companion c join "user" u on u.id = c.friend_user_id where c.entry_id = e.id), '{}') as companions
    from entry e
    join place p on p.id = e.place_id
    join kebab_type t on t.id = e.type_id
    where e.user_id = ${userId}
      ${filters.typeId ? sql`and e.type_id = ${filters.typeId}` : sql``}
      ${filters.minRating ? sql`and e.overall >= ${filters.minRating}` : sql``}
      ${q ? sql`and (p.name ilike ${"%" + q + "%"} or coalesce(p.address, '') ilike ${"%" + q + "%"} or coalesce(e.note, '') ilike ${"%" + q + "%"})` : sql``}
    order by e.eaten_at desc, e.id desc
    limit ${limit + 1}`);
  const entries = rows.slice(0, limit).map((r) => ({
    id: Number(r.id),
    eatenAt: new Date(r.eatenAt as string),
    placeName: String(r.placeName),
    placeAddress: (r.placeAddress as string | null) ?? null,
    typeName: String(r.typeName),
    meat: String(r.meat),
    overall: Number(r.overall),
    priceCents: num(r.priceCents),
    currency: String(r.currency).trim(),
    companions: (r.companions as string[]) ?? [],
    photoKey: (r.photoKey as string | null) ?? null,
  }));
  return { entries, hasMore: rows.length > limit };
}

export async function journalSummary(userId: string, now = new Date()) {
  const [start, end] = monthRange(now);
  const [row] = await db.execute<Record<string, unknown>>(sql`
    select count(*)::int as total, avg(overall)::float8 as avg,
      count(*) filter (where eaten_at >= ${ts(start)} and eaten_at < ${ts(end)})::int as "thisMonth"
    from entry where user_id = ${userId}`);
  return { total: num(row?.total) ?? 0, avgOverall: num(row?.avg), thisMonth: num(row?.thisMonth) ?? 0 };
}

export async function entryCount(userId: string): Promise<number> {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(entry).where(eq(entry.userId, userId));
  return row?.n ?? 0;
}

export async function lastEntry(userId: string) {
  return (
    (await db.query.entry.findFirst({
      where: eq(entry.userId, userId),
      orderBy: (e, { desc }) => [desc(e.eatenAt), desc(e.id)],
      with: { place: true },
    })) ?? null
  );
}

/**
 * Full entry for the detail page. Owners see everything; accepted friends (if the owner
 * shares) and tagged companions see it without the exact GPS position.
 */
export async function getEntryForViewer(viewerId: string, entryId: number) {
  const row = await db.query.entry.findFirst({
    where: eq(entry.id, entryId),
    with: {
      place: true,
      type: true,
      user: { columns: { id: true, name: true, username: true, avatarKey: true, settings: true } },
      companions: { with: { friend: { columns: { id: true, name: true, username: true, avatarKey: true } } } },
    },
  });
  if (!row) return null;
  const isOwner = row.userId === viewerId;
  if (!isOwner) {
    const tagged = row.companions.some((c) => c.friendUserId === viewerId);
    const friends = await isFriend(viewerId, row.userId);
    const shares = row.user.settings?.visibleToFriends !== false;
    if (!friends || !(shares || tagged)) return null;
  }
  const [visits] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(entry)
    .where(and(eq(entry.userId, row.userId), eq(entry.placeId, row.placeId)));

  const { user: owner, companions, ...rest } = row;
  return {
    entry: isOwner ? rest : { ...rest, lat: null, lng: null, accuracyM: null },
    owner: { id: owner.id, name: owner.name, username: owner.username, avatarKey: owner.avatarKey },
    companions: companions.map((c) => c.friend),
    isOwner,
    visitsHere: visits?.n ?? 0,
  };
}

/** Entry for prefilling the form ("Nochmal hier" / edit). Owner only. */
export async function getOwnEntry(userId: string, entryId: number) {
  return (
    (await db.query.entry.findFirst({
      where: and(eq(entry.id, entryId), eq(entry.userId, userId)),
      with: { place: true, companions: true },
    })) ?? null
  );
}
