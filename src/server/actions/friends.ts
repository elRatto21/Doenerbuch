"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { removeFriendship, requestFriendship, respondToRequest, type Relation } from "@/server/queries/friends";

const userId = z.string().min(1).max(100);

export async function sendFriendRequest(otherId: string): Promise<Relation> {
  const me = await requireUser();
  const relation = await requestFriendship(me.id, userId.parse(otherId));
  revalidatePath("/freunde", "layout");
  return relation;
}

export async function cancelFriendship(otherId: string): Promise<Relation> {
  const me = await requireUser();
  await removeFriendship(me.id, userId.parse(otherId));
  revalidatePath("/freunde", "layout");
  return "none";
}

export async function answerFriendRequest(requestId: number, accept: boolean) {
  const me = await requireUser();
  await respondToRequest(me.id, z.number().int().positive().parse(requestId), accept);
  revalidatePath("/freunde", "layout");
}
