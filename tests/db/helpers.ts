import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { friendship, kebabType, user, type Meat } from "@/db/schema";
import type { EntryInput } from "@/lib/validation";
import { createEntry } from "@/server/queries/entries";
import { syncReferenceData } from "@/server/reference-data";

export async function resetData() {
  await db.execute(sql`truncate entry_companion, entry, place, friendship, user_badge, session, account, "user" restart identity cascade`);
  // kebab_type references user, so the cascade empties it too
  await syncReferenceData(db);
}

let counter = 0;
export async function makeUser(name: string, settings?: Partial<typeof user.$inferInsert.settings>) {
  counter++;
  const id = `u_${name.toLowerCase()}_${counter}`;
  await db.insert(user).values({
    id,
    name,
    email: `${id}@test.local`,
    username: `${name.toLowerCase()}${counter}`,
    friendCode: `DÖN-T${String(counter).padStart(3, "2").slice(-3)}`,
    settings: { autoGps: true, visibleToFriends: true, notifications: true, currency: "EUR", ...settings },
  });
  return id;
}

export async function befriend(a: string, b: string) {
  await db.insert(friendship).values({ requesterId: a, addresseeId: b, status: "accepted" });
}

export async function typeId(name: string) {
  const row = await db.query.kebabType.findFirst({ where: and(isNull(kebabType.userId), eq(kebabType.name, name)) });
  if (!row) throw new Error(`type ${name} missing`);
  return row.id;
}

export const CENTER = { lat: 50.9375, lng: 6.9603 };

export async function addEntry(
  userId: string,
  opts: {
    place: string;
    type?: string;
    overall: number;
    price?: number | null;
    currency?: string;
    at: string;
    lat?: number;
    lng?: number;
    meat?: Meat;
    companions?: string[];
    city?: string;
  },
) {
  const input: EntryInput = {
    eatenAt: new Date(opts.at).toISOString(),
    typeId: await typeId(opts.type ?? "Döner"),
    meat: opts.meat ?? "kalb",
    placeId: null,
    placeName: opts.place,
    placeAddress: null,
    placeCity: opts.city ?? "Köln",
    placeOsmId: null,
    lat: opts.lat ?? CENTER.lat,
    lng: opts.lng ?? CENTER.lng,
    accuracyM: 8,
    priceCents: opts.price === undefined ? 750 : opts.price,
    currency: (opts.currency ?? "EUR") as EntryInput["currency"],
    overall: opts.overall,
    rMeat: null,
    rBread: null,
    rSauce: null,
    rSalad: null,
    rPortion: null,
    rValue: null,
    note: null,
    photoKey: null,
    companionIds: opts.companions ?? [],
  };
  return (await createEntry(userId, input)).id;
}
