import { and, eq, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { friendship, user } from "@/db/schema";
import { normalizeFriendCode } from "@/server/friend-code";
import { friendIdsSql, num } from "./sql";

export type FriendSummary = { id: string; name: string; username: string | null; avatarKey: string | null };

export async function listFriends(userId: string): Promise<FriendSummary[]> {
  const rows = await db.execute<FriendSummary>(sql`
    select u.id, u.name, u.username, u.avatar_key as "avatarKey"
    from "user" u where u.id in ${friendIdsSql(userId)}
    order by lower(u.name)`);
  return [...rows];
}

export async function isFriend(userId: string, otherId: string): Promise<boolean> {
  const row = await db.query.friendship.findFirst({
    where: and(
      eq(friendship.status, "accepted"),
      or(
        and(eq(friendship.requesterId, userId), eq(friendship.addresseeId, otherId)),
        and(eq(friendship.requesterId, otherId), eq(friendship.addresseeId, userId)),
      ),
    ),
    columns: { id: true },
  });
  return Boolean(row);
}

/** entryCount is null when the user doesn't share their activity (visibleToFriends off). */
export type IncomingRequest = FriendSummary & { requestId: number; entryCount: number | null; mutualCount: number };

const SHARED_ENTRY_COUNT = (alias: string) =>
  sql.raw(`case when coalesce((${alias}.settings->>'visibleToFriends')::boolean, true)
    then (select count(*)::int from entry e where e.user_id = ${alias}.id) end`);

export async function incomingRequests(userId: string): Promise<IncomingRequest[]> {
  const rows = await db.execute<Record<string, unknown>>(sql`
    select f.id as "requestId", u.id, u.name, u.username, u.avatar_key as "avatarKey",
      ${SHARED_ENTRY_COUNT("u")} as "entryCount",
      (select count(*)::int from ${friendIdsSql(userId)} mine(id)
         where mine.id in (select case when f2.requester_id = u.id then f2.addressee_id else f2.requester_id end
                           from friendship f2 where f2.status = 'accepted' and (f2.requester_id = u.id or f2.addressee_id = u.id))) as "mutualCount"
    from friendship f join "user" u on u.id = f.requester_id
    where f.addressee_id = ${userId} and f.status = 'pending'
    order by f.created_at desc`);
  return rows.map((r) => ({
    requestId: Number(r.requestId),
    id: String(r.id),
    name: String(r.name),
    username: (r.username as string | null) ?? null,
    avatarKey: (r.avatarKey as string | null) ?? null,
    entryCount: num(r.entryCount),
    mutualCount: num(r.mutualCount) ?? 0,
  }));
}

export async function pendingIncomingCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(friendship)
    .where(and(eq(friendship.addresseeId, userId), eq(friendship.status, "pending")));
  return row?.n ?? 0;
}

export type Relation = "self" | "friends" | "outgoing" | "incoming" | "none";

export type UserSearchResult = FriendSummary & { entryCount: number | null; relation: Relation };

/** Search by friend code (exact) or username/name prefix. */
export async function searchUsers(userId: string, query: string): Promise<UserSearchResult[]> {
  const q = query.trim().replace(/^@/, "");
  if (q.length < 2) return [];
  const code = normalizeFriendCode(q);
  const like = q.toLowerCase().replace(/[%_\\]/g, (c) => "\\" + c) + "%";
  const rows = await db.execute<Record<string, unknown>>(sql`
    select u.id, u.name, u.username, u.avatar_key as "avatarKey",
      ${SHARED_ENTRY_COUNT("u")} as "entryCount",
      (select case
          when f.status = 'accepted' then 'friends'
          when f.status = 'pending' and f.requester_id = ${userId} then 'outgoing'
          when f.status = 'pending' then 'incoming'
          else 'none' end
        from friendship f
        where (f.requester_id = ${userId} and f.addressee_id = u.id) or (f.requester_id = u.id and f.addressee_id = ${userId})
        limit 1) as relation
    from "user" u
    where u.id <> ${userId} and u.username is not null
      and (${code ? sql`u.friend_code = ${code} or ` : sql``} u.username like ${like} or lower(u.name) like ${like}
           or lower(u.name) like ${"% " + like})
    order by (u.friend_code = ${code ?? ""}) desc, (u.username = ${q.toLowerCase()}) desc, lower(u.name)
    limit 20`);
  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    username: (r.username as string | null) ?? null,
    avatarKey: (r.avatarKey as string | null) ?? null,
    entryCount: num(r.entryCount),
    relation: ((r.relation as Relation | null) ?? "none") as Relation,
  }));
}

export async function findUserByFriendCode(code: string) {
  const normalized = normalizeFriendCode(code);
  if (!normalized) return null;
  return (await db.query.user.findFirst({ where: eq(user.friendCode, normalized) })) ?? null;
}

export async function relationTo(userId: string, otherId: string): Promise<Relation> {
  if (userId === otherId) return "self";
  const row = await db.query.friendship.findFirst({
    where: or(
      and(eq(friendship.requesterId, userId), eq(friendship.addresseeId, otherId)),
      and(eq(friendship.requesterId, otherId), eq(friendship.addresseeId, userId)),
    ),
  });
  if (!row || row.status === "declined") return "none";
  if (row.status === "accepted") return "friends";
  return row.requesterId === userId ? "outgoing" : "incoming";
}

// --- mutations ----------------------------------------------------------------

/** Sends a request, or accepts the other side's pending request. */
export async function requestFriendship(userId: string, otherId: string): Promise<Relation> {
  if (userId === otherId) return "self";
  const existing = await db.query.friendship.findFirst({
    where: or(
      and(eq(friendship.requesterId, userId), eq(friendship.addresseeId, otherId)),
      and(eq(friendship.requesterId, otherId), eq(friendship.addresseeId, userId)),
    ),
  });
  if (!existing) {
    await db.insert(friendship).values({ requesterId: userId, addresseeId: otherId, status: "pending" }).onConflictDoNothing();
    return relationTo(userId, otherId);
  }
  if (existing.status === "accepted") return "friends";
  if (existing.requesterId === otherId && existing.status === "pending") {
    await db.update(friendship).set({ status: "accepted" }).where(eq(friendship.id, existing.id));
    return "friends";
  }
  // re-request after decline (either direction) → new pending request from me
  await db
    .update(friendship)
    .set({ requesterId: userId, addresseeId: otherId, status: "pending", createdAt: new Date() })
    .where(eq(friendship.id, existing.id));
  return "outgoing";
}

export async function respondToRequest(userId: string, requestId: number, accept: boolean) {
  await db
    .update(friendship)
    .set({ status: accept ? "accepted" : "declined" })
    .where(and(eq(friendship.id, requestId), eq(friendship.addresseeId, userId), eq(friendship.status, "pending")));
}

/** Cancels an outgoing request or ends a friendship. */
export async function removeFriendship(userId: string, otherId: string) {
  await db
    .delete(friendship)
    .where(
      or(
        and(eq(friendship.requesterId, userId), eq(friendship.addresseeId, otherId)),
        and(eq(friendship.requesterId, otherId), eq(friendship.addresseeId, userId), eq(friendship.status, "accepted")),
      ),
    );
}
