import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { badge, userBadge } from "@/db/schema";
import { BADGES, STANDARD_TYPES, type BadgeKey } from "@/lib/badges";
import { APP_TIMEZONE } from "@/lib/time";
import { num } from "@/server/queries/sql";

export type BadgeMetrics = {
  total: number;
  maxSameType: number;
  maxSamePlace: number;
  cities: number;
  places: number;
  standardTypes: number;
  social: number;
  nightOwl: boolean;
  perfect: boolean;
};

export async function badgeMetrics(userId: string): Promise<BadgeMetrics> {
  const [row] = await db.execute<Record<string, unknown>>(sql`
    select
      count(*)::int as total,
      coalesce((select max(c)::int from (select count(*) c from entry where user_id = ${userId} group by type_id) x), 0) as "maxSameType",
      coalesce((select max(c)::int from (select count(*) c from entry where user_id = ${userId} group by place_id) x), 0) as "maxSamePlace",
      (select count(distinct lower(p.city))::int from entry e join place p on p.id = e.place_id where e.user_id = ${userId} and p.city is not null) as cities,
      count(distinct place_id)::int as places,
      (select count(distinct t.name)::int from entry e join kebab_type t on t.id = e.type_id where e.user_id = ${userId} and t.user_id is null) as "standardTypes",
      (select count(distinct c.entry_id)::int from entry_companion c join entry e on e.id = c.entry_id where e.user_id = ${userId}) as social,
      bool_or(extract(hour from eaten_at at time zone ${APP_TIMEZONE}) >= 23 or extract(hour from eaten_at at time zone ${APP_TIMEZONE}) < 4) as "nightOwl",
      bool_or(overall = 5 and r_meat = 5 and r_bread = 5 and r_sauce = 5 and r_salad = 5 and r_portion = 5 and r_value = 5) as perfect
    from entry where user_id = ${userId}`);
  return {
    total: num(row?.total) ?? 0,
    maxSameType: num(row?.maxSameType) ?? 0,
    maxSamePlace: num(row?.maxSamePlace) ?? 0,
    cities: num(row?.cities) ?? 0,
    places: num(row?.places) ?? 0,
    standardTypes: num(row?.standardTypes) ?? 0,
    social: num(row?.social) ?? 0,
    nightOwl: row?.nightOwl === true,
    perfect: row?.perfect === true,
  };
}

export function earnedBadgeKeys(m: BadgeMetrics): BadgeKey[] {
  const rules: Record<BadgeKey, boolean> = {
    first: m.total >= 1,
    ten: m.total >= 10,
    fifty: m.total >= 50,
    hundred: m.total >= 100,
    same_type_10: m.maxSameType >= 10,
    regular: m.maxSamePlace >= 5,
    cities_5: m.cities >= 5,
    places_10: m.places >= 10,
    all_types: m.standardTypes >= STANDARD_TYPES.length,
    social_5: m.social >= 5,
    night_owl: m.nightOwl,
    perfect: m.perfect,
  };
  return BADGES.map((b) => b.key).filter((k) => rules[k]);
}

/** Awards newly earned badges (badges are never taken away). Returns the new keys. */
export async function evaluateBadges(userId: string): Promise<BadgeKey[]> {
  const earned = earnedBadgeKeys(await badgeMetrics(userId));
  if (earned.length === 0) return [];
  const catalogue = await db.select().from(badge);
  const have = new Set(
    (await db.select({ badgeId: userBadge.badgeId }).from(userBadge).where(eq(userBadge.userId, userId))).map((r) => r.badgeId),
  );
  const fresh = catalogue.filter((b) => earned.includes(b.key as BadgeKey) && !have.has(b.id));
  if (fresh.length === 0) return [];
  await db
    .insert(userBadge)
    .values(fresh.map((b) => ({ userId, badgeId: b.id })))
    .onConflictDoNothing();
  return fresh.map((b) => b.key as BadgeKey);
}

export async function userBadges(userId: string) {
  const rows = await db
    .select({ key: badge.key, earnedAt: userBadge.earnedAt })
    .from(userBadge)
    .innerJoin(badge, eq(badge.id, userBadge.badgeId))
    .where(eq(userBadge.userId, userId));
  const earned = new Map(rows.map((r) => [r.key, r.earnedAt]));
  return BADGES.map((b) => ({ ...b, earnedAt: earned.get(b.key) ?? null }));
}
