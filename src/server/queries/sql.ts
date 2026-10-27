import { sql, type SQL } from "drizzle-orm";

/** Subquery: ids of accepted friends of `userId`. */
export function friendIdsSql(userId: string): SQL {
  return sql`(select case when f.requester_id = ${userId} then f.addressee_id else f.requester_id end
    from friendship f
    where f.status = 'accepted' and (f.requester_id = ${userId} or f.addressee_id = ${userId}))`;
}

/** Subquery: accepted friends who share their entries with friends. */
export function sharingFriendIdsSql(userId: string): SQL {
  return sql`(select su.id from "user" su
    where su.id in ${friendIdsSql(userId)}
      and coalesce((su.settings->>'visibleToFriends')::boolean, true))`;
}

/** Postgres returns numerics as strings; normalise optional numbers. */
export function num(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Timestamp parameter for raw SQL (postgres-js can't bind Date objects through drizzle's sql``). */
export function ts(date: Date): SQL {
  return sql`${date.toISOString()}::timestamptz`;
}
