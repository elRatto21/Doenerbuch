import { and, between, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { place } from "@/db/schema";
import { boundingDelta, haversineMeters, normalizePlaceName, PLACE_DEDUPE_RADIUS_M, PLACE_SUGGEST_RADIUS_M } from "@/lib/geo";
import { num, sharingFriendIdsSql } from "./sql";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type PlaceInput = {
  placeId: number | null;
  name: string;
  address: string | null;
  city: string | null;
  osmId: string | null;
  lat: number | null;
  lng: number | null;
};

/**
 * Returns the place for an entry. An explicit placeId wins; otherwise a place with the
 * same normalised name within 50 m is reused, else a new one is created.
 */
export async function findOrCreatePlace(tx: Tx | typeof db, userId: string, input: PlaceInput): Promise<number> {
  const nameNormalized = normalizePlaceName(input.name) || input.name.toLowerCase();

  if (input.placeId && !(await placeVisibleTo(userId, input.placeId))) input = { ...input, placeId: null };

  if (input.placeId) {
    const existing = await tx.query.place.findFirst({ where: eq(place.id, input.placeId) });
    if (existing) {
      // same shop chosen but renamed? → treat as a new / other place
      if (existing.nameNormalized === nameNormalized) {
        if ((!existing.address && input.address) || (!existing.city && input.city)) {
          await tx
            .update(place)
            .set({ address: existing.address ?? input.address, city: existing.city ?? input.city })
            .where(eq(place.id, existing.id));
        }
        return existing.id;
      }
      input = { ...input, lat: input.lat ?? existing.lat, lng: input.lng ?? existing.lng };
    }
  }

  if (input.lat == null || input.lng == null) {
    throw new PlaceError("Bitte Standort erfassen oder auf der Karte setzen.");
  }
  const origin = { lat: input.lat, lng: input.lng };

  const { dLat, dLng } = boundingDelta(origin.lat, PLACE_DEDUPE_RADIUS_M);
  const candidates = await tx
    .select()
    .from(place)
    .where(
      and(
        eq(place.nameNormalized, nameNormalized),
        between(place.lat, origin.lat - dLat, origin.lat + dLat),
        between(place.lng, origin.lng - dLng, origin.lng + dLng),
      ),
    );
  const nearest = candidates
    .map((p) => ({ p, d: haversineMeters(origin, p) }))
    .filter((c) => c.d <= PLACE_DEDUPE_RADIUS_M)
    .sort((a, b) => a.d - b.d)[0];
  if (nearest) {
    if ((!nearest.p.address && input.address) || (!nearest.p.city && input.city)) {
      await tx
        .update(place)
        .set({ address: nearest.p.address ?? input.address, city: nearest.p.city ?? input.city })
        .where(eq(place.id, nearest.p.id));
    }
    return nearest.p.id;
  }

  const [created] = await tx
    .insert(place)
    .values({
      name: input.name.trim(),
      nameNormalized,
      lat: origin.lat,
      lng: origin.lng,
      address: input.address,
      city: input.city,
      osmId: input.osmId,
      createdBy: userId,
    })
    .returning({ id: place.id });
  return created!.id;
}

export class PlaceError extends Error {}

export type PlaceSuggestion = {
  id: number;
  name: string;
  address: string | null;
  city: string | null;
  lat: number;
  lng: number;
  distanceM: number | null;
  myVisits: number;
  friendVisits: number;
  lastPriceCents: number | null;
  lastCurrency: string | null;
};

/**
 * Places known to the user (own + sharing friends' entries). Places within 150 m come
 * first sorted by distance; with a query, other name matches follow.
 */
export async function suggestPlaces(
  userId: string,
  opts: { lat?: number | null; lng?: number | null; q?: string | null; limit?: number },
): Promise<PlaceSuggestion[]> {
  const rows = await db.execute<Record<string, unknown>>(sql`
    select p.id, p.name, p.name_normalized as "nameNormalized", p.address, p.city, p.lat, p.lng,
      count(*) filter (where e.user_id = ${userId})::int as "myVisits",
      count(*) filter (where e.user_id <> ${userId})::int as "friendVisits",
      (array_agg(e.price_cents order by e.eaten_at desc) filter (where e.user_id = ${userId} and e.price_cents is not null))[1] as "lastPriceCents",
      (array_agg(e.currency order by e.eaten_at desc) filter (where e.user_id = ${userId} and e.price_cents is not null))[1] as "lastCurrency"
    from place p
    join entry e on e.place_id = p.id
    where e.user_id = ${userId} or e.user_id in ${sharingFriendIdsSql(userId)}
    group by p.id`);

  const origin = opts.lat != null && opts.lng != null ? { lat: opts.lat, lng: opts.lng } : null;
  const q = opts.q ? normalizePlaceName(opts.q) : "";
  const all = rows.map((r) => {
    const lat = Number(r.lat);
    const lng = Number(r.lng);
    return {
      id: Number(r.id),
      name: String(r.name),
      nameNormalized: String(r.nameNormalized),
      address: (r.address as string | null) ?? null,
      city: (r.city as string | null) ?? null,
      lat,
      lng,
      distanceM: origin ? haversineMeters(origin, { lat, lng }) : null,
      myVisits: num(r.myVisits) ?? 0,
      friendVisits: num(r.friendVisits) ?? 0,
      lastPriceCents: num(r.lastPriceCents),
      lastCurrency: (r.lastCurrency as string | null)?.trim() ?? null,
    };
  });

  const matches = (p: (typeof all)[number]) => !q || p.nameNormalized.includes(q);
  const nearby = all
    .filter((p) => p.distanceM != null && p.distanceM <= PLACE_SUGGEST_RADIUS_M && matches(p))
    .sort((a, b) => a.distanceM! - b.distanceM!);
  const rest = q
    ? all
        .filter((p) => !nearby.includes(p) && matches(p))
        .sort((a, b) => b.myVisits - a.myVisits || (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity))
    : [];

  return [...nearby, ...rest].slice(0, opts.limit ?? 8).map((p) => ({
    id: p.id,
    name: p.name,
    address: p.address,
    city: p.city,
    lat: p.lat,
    lng: p.lng,
    distanceM: p.distanceM,
    myVisits: p.myVisits,
    friendVisits: p.friendVisits,
    lastPriceCents: p.lastPriceCents,
    lastCurrency: p.lastCurrency,
  }));
}

/** A place is usable if the user created it or it has entries by them or sharing friends. */
export async function placeVisibleTo(userId: string, placeId: number): Promise<boolean> {
  const rows = await db.execute(sql`
    select 1 from place p where p.id = ${placeId} and (
      p.created_by = ${userId}
      or exists(select 1 from entry e where e.place_id = p.id
                and (e.user_id = ${userId} or e.user_id in ${sharingFriendIdsSql(userId)})))
    limit 1`);
  return rows.length > 0;
}
