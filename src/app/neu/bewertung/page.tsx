import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { listFriends } from "@/server/queries/friends";
import { listTypes } from "@/server/queries/types";
import { photoUrl, storageEnabled } from "@/server/storage";
import { StepTwo } from "@/components/entry/step-two";

export const metadata: Metadata = { title: "Bewertung" };

export default async function RatingPage() {
  const me = await requireUser();
  const [friends, types] = await Promise.all([listFriends(me.id), listTypes(me.id, { includeArchived: true })]);
  const withAvatars = await Promise.all(friends.map(async (f) => ({ id: f.id, name: f.name, avatarUrl: await photoUrl(f.avatarKey) })));
  return <StepTwo friends={withAvatars} types={types.map((t) => ({ id: t.id, name: t.name }))} photosEnabled={storageEnabled} />;
}
