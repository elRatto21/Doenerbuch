"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { user } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { removeFriendship, requestFriendship, respondToRequest, type Relation } from "@/server/queries/friends";
import { rateLimit, RateLimitError } from "@/server/rate-limit";

const userId = z.string().min(1).max(100);

export type FriendResult = { relation: Relation; error?: string };

function failed(err: unknown, relation: Relation): FriendResult {
  if (err instanceof RateLimitError) return { relation, error: err.message };
  throw err;
}

export async function sendFriendRequest(otherId: string): Promise<FriendResult> {
  const me = await requireUser();
  try {
    rateLimit("friendRequest", me.id);
    const id = userId.parse(otherId);
    const other = await db.query.user.findFirst({ where: eq(user.id, id), columns: { id: true, username: true } });
    if (!other?.username) return { relation: "none", error: "Diesen Nutzer gibt es nicht." };
    const relation = await requestFriendship(me.id, id);
    revalidatePath("/freunde", "layout");
    return { relation };
  } catch (err) {
    return failed(err, "none");
  }
}

export async function cancelFriendship(otherId: string): Promise<FriendResult> {
  const me = await requireUser();
  try {
    rateLimit("friendAnswer", me.id);
    await removeFriendship(me.id, userId.parse(otherId));
    revalidatePath("/freunde", "layout");
    return { relation: "none" };
  } catch (err) {
    return failed(err, "outgoing");
  }
}

export async function answerFriendRequest(requestId: number, accept: boolean): Promise<{ error?: string }> {
  const me = await requireUser();
  try {
    rateLimit("friendAnswer", me.id);
    await respondToRequest(me.id, z.number().int().positive().parse(requestId), z.boolean().parse(accept));
    revalidatePath("/freunde", "layout");
    return {};
  } catch (err) {
    if (err instanceof RateLimitError) return { error: err.message };
    throw err;
  }
}
