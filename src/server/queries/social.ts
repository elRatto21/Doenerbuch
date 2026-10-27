import { sql } from "drizzle-orm";
import { db } from "@/db";
import { monthRange } from "@/lib/time";
import { friendIdsSql, num, sharingFriendIdsSql, ts } from "./sql";

export type RankingRow = {
  userId: string;
  name: string;
  avatarKey: string | null;
  count: number;
  avgOverall: number | null;
  isMe: boolean;
  rank: number;
};

/** Me + sharing friends for the current month, by count then average rating. */
export async function monthlyRanking(userId: string, now = new Date()): Promise<RankingRow[]> {
  const [start, end] = monthRange(now);
  const rows = await db.execute<Record<string, unknown>>(sql`
    select u.id, u.name, u.avatar_key as "avatarKey",
      count(e.id)::int as n, avg(e.overall)::float8 as avg
    from "user" u
    left join entry e on e.user_id = u.id and e.eaten_at >= ${ts(start)} and e.eaten_at < ${ts(end)}
    where u.id = ${userId} or u.id in ${sharingFriendIdsSql(userId)}
    group by u.id
    order by count(e.id) desc, avg(e.overall) desc nulls last, lower(u.name)`);
  return rows.map((r, i) => ({
    userId: String(r.id),
    name: String(r.name),
    avatarKey: (r.avatarKey as string | null) ?? null,
    count: num(r.n) ?? 0,
    avgOverall: num(r.avg),
    isMe: r.id === userId,
    rank: i + 1,
  }));
}

export type FeedItem = {
  id: number;
  userId: string;
  userName: string;
  avatarKey: string | null;
  placeName: string;
  typeName: string;
  overall: number;
  priceCents: number | null;
  currency: string;
  eatenAt: Date;
  withMe: boolean;
  newSpot: boolean;
};

/**
 * Entries of sharing friends plus entries a friend tagged me in, newest first.
 * Never exposes exact GPS positions.
 */
export async function friendFeed(userId: string, { limit = 20, offset = 0 } = {}): Promise<{ items: FeedItem[]; hasMore: boolean }> {
  const rows = await db.execute<Record<string, unknown>>(sql`
    select e.id, e.user_id, u.name as user_name, u.avatar_key, p.name as place_name, t.name as type_name,
      e.overall, e.price_cents, e.currency, e.eaten_at,
      exists(select 1 from entry_companion c where c.entry_id = e.id and c.friend_user_id = ${userId}) as with_me,
      not exists(select 1 from entry e2 where e2.place_id = e.place_id
                 and (e2.eaten_at < e.eaten_at or (e2.eaten_at = e.eaten_at and e2.id < e.id))) as new_spot
    from entry e
    join "user" u on u.id = e.user_id
    join place p on p.id = e.place_id
    join kebab_type t on t.id = e.type_id
    where e.user_id in ${sharingFriendIdsSql(userId)}
       or (e.user_id in ${friendIdsSql(userId)}
           and exists(select 1 from entry_companion c where c.entry_id = e.id and c.friend_user_id = ${userId}))
    order by e.eaten_at desc, e.id desc
    limit ${limit + 1} offset ${offset}`);
  const items = rows.slice(0, limit).map((r) => ({
    id: Number(r.id),
    userId: String(r.user_id),
    userName: String(r.user_name),
    avatarKey: (r.avatar_key as string | null) ?? null,
    placeName: String(r.place_name),
    typeName: String(r.type_name),
    overall: Number(r.overall),
    priceCents: num(r.price_cents),
    currency: String(r.currency).trim(),
    eatenAt: new Date(r.eaten_at as string),
    withMe: r.with_me === true,
    newSpot: r.new_spot === true,
  }));
  return { items, hasMore: rows.length > limit };
}

export type MapPlace = {
  id: number;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  myCount: number;
  myAvg: number | null;
  friendCount: number;
  friendAvg: number | null;
  avg: number;
  count: number;
  lastAt: Date;
  myLastEntryId: number | null;
  friendNames: string[];
};

export async function mapPlaces(userId: string): Promise<MapPlace[]> {
  const rows = await db.execute<Record<string, unknown>>(sql`
    select p.id, p.name, p.address, p.lat, p.lng,
      count(*) filter (where e.user_id = ${userId})::int as my_count,
      avg(e.overall) filter (where e.user_id = ${userId})::float8 as my_avg,
      count(*) filter (where e.user_id <> ${userId})::int as friend_count,
      avg(e.overall) filter (where e.user_id <> ${userId})::float8 as friend_avg,
      avg(e.overall)::float8 as avg, count(*)::int as n, max(e.eaten_at) as last_at,
      (array_agg(e.id order by e.eaten_at desc) filter (where e.user_id = ${userId}))[1] as my_last_id,
      coalesce(array_agg(distinct u.name) filter (where e.user_id <> ${userId}), '{}') as friend_names
    from place p
    join entry e on e.place_id = p.id
    join "user" u on u.id = e.user_id
    where e.user_id = ${userId} or e.user_id in ${sharingFriendIdsSql(userId)}
    group by p.id`);
  return rows.map((r) => ({
    id: Number(r.id),
    name: String(r.name),
    address: (r.address as string | null) ?? null,
    lat: Number(r.lat),
    lng: Number(r.lng),
    myCount: num(r.my_count) ?? 0,
    myAvg: num(r.my_avg),
    friendCount: num(r.friend_count) ?? 0,
    friendAvg: num(r.friend_avg),
    avg: num(r.avg) ?? 0,
    count: num(r.n) ?? 0,
    lastAt: new Date(r.last_at as string),
    myLastEntryId: num(r.my_last_id),
    friendNames: (r.friend_names as string[]) ?? [],
  }));
}
