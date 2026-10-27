import { sql } from "drizzle-orm";
import { db } from "@/db";
import { monthRange, yearRange } from "@/lib/time";
import { num, ts } from "./sql";

export type StatsPeriod = "monat" | "jahr" | "gesamt";

export function periodRange(period: StatsPeriod, now = new Date()): [Date, Date] | null {
  if (period === "monat") return monthRange(now);
  if (period === "jahr") return yearRange(now);
  return null;
}

export type Stats = {
  count: number;
  avgOverall: number | null;
  spend: { currency: string; totalCents: number; avgCents: number; pricedCount: number }[];
  byType: { typeId: number; name: string; count: number }[];
  bestByType: {
    typeId: number;
    typeName: string;
    placeId: number;
    placeName: string;
    avgOverall: number;
    count: number;
    avgPriceCents: number | null;
    currency: string | null;
    latestEntryId: number;
  }[];
};

export async function getStats(userId: string, period: StatsPeriod, now = new Date()): Promise<Stats> {
  const range = periodRange(period, now);
  const inRange = range ? sql`and e.eaten_at >= ${ts(range[0])} and e.eaten_at < ${ts(range[1])}` : sql``;

  const [overview] = await db.execute<Record<string, unknown>>(sql`
    select count(*)::int as count, avg(e.overall)::float8 as avg
    from entry e where e.user_id = ${userId} ${inRange}`);

  const spend = await db.execute<Record<string, unknown>>(sql`
    select e.currency, sum(e.price_cents)::int as total, avg(e.price_cents)::float8 as avg, count(*)::int as n
    from entry e where e.user_id = ${userId} and e.price_cents is not null ${inRange}
    group by e.currency order by count(*) desc`);

  const byType = await db.execute<Record<string, unknown>>(sql`
    select t.id, t.name, count(*)::int as n
    from entry e join kebab_type t on t.id = e.type_id
    where e.user_id = ${userId} ${inRange}
    group by t.id, t.name order by count(*) desc, t.name`);

  // best place per type: highest avg(overall), tie-break by number of visits
  const best = await db.execute<Record<string, unknown>>(sql`
    with per_place as (
      select e.type_id, e.place_id, avg(e.overall)::float8 as avg, count(*)::int as n,
        avg(e.price_cents)::float8 as avg_price,
        mode() within group (order by e.currency) as currency,
        (array_agg(e.id order by e.eaten_at desc))[1] as latest_id
      from entry e where e.user_id = ${userId} ${inRange}
      group by e.type_id, e.place_id
    ), ranked as (
      select *, row_number() over (partition by type_id order by avg desc, n desc, place_id) as rk from per_place
    )
    select r.type_id, t.name as type_name, r.place_id, p.name as place_name, r.avg, r.n, r.avg_price, r.currency, r.latest_id
    from ranked r join kebab_type t on t.id = r.type_id join place p on p.id = r.place_id
    where r.rk = 1
    order by r.avg desc, r.n desc, t.name`);

  return {
    count: num(overview?.count) ?? 0,
    avgOverall: num(overview?.avg),
    spend: spend.map((r) => ({
      currency: String(r.currency).trim(),
      totalCents: num(r.total) ?? 0,
      avgCents: Math.round(num(r.avg) ?? 0),
      pricedCount: num(r.n) ?? 0,
    })),
    byType: byType.map((r) => ({ typeId: Number(r.id), name: String(r.name), count: num(r.n) ?? 0 })),
    bestByType: best.map((r) => ({
      typeId: Number(r.type_id),
      typeName: String(r.type_name),
      placeId: Number(r.place_id),
      placeName: String(r.place_name),
      avgOverall: num(r.avg) ?? 0,
      count: num(r.n) ?? 0,
      avgPriceCents: r.avg_price == null ? null : Math.round(Number(r.avg_price)),
      currency: (r.currency as string | null)?.trim() ?? null,
      latestEntryId: Number(r.latest_id),
    })),
  };
}
