import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { place } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { getOwnEntry, lastEntry } from "@/server/queries/entries";
import { listFriends } from "@/server/queries/friends";
import { placeVisibleTo } from "@/server/queries/places";
import { listTypes } from "@/server/queries/types";
import { photoUrl, storageEnabled } from "@/server/storage";
import { EntryForm, type Prefill } from "@/components/entry/entry-form";

export const metadata: Metadata = { title: "Neuer Döner" };

type Search = { von?: string; bearbeiten?: string; ort?: string };

export default async function NewEntryPage({ searchParams }: { searchParams: Promise<Search> }) {
  const me = await requireUser();
  const params = await searchParams;
  const [types, last, friends] = await Promise.all([listTypes(me.id), lastEntry(me.id), listFriends(me.id)]);
  const friendsWithAvatars = await Promise.all(friends.map(async (f) => ({ id: f.id, name: f.name, avatarUrl: await photoUrl(f.avatarKey) })));

  let prefill: Prefill = { key: "new" };
  const editId = Number(params.bearbeiten);
  const fromId = Number(params.von);
  const placeId = Number(params.ort);

  if (editId) {
    const e = await getOwnEntry(me.id, editId);
    if (!e) notFound();
    prefill = {
      key: `edit:${e.id}`,
      editId: e.id,
      eatenAt: e.eatenAt.toISOString(),
      typeId: e.typeId,
      meat: e.meat,
      placeId: e.placeId,
      placeName: e.place.name,
      placeAddress: e.place.address,
      placeCity: e.place.city,
      lat: e.lat,
      lng: e.lng,
      accuracyM: e.accuracyM,
      priceCents: e.priceCents,
      currency: e.currency.trim(),
      companionIds: e.companions.map((c) => c.friendUserId),
      photoKey: e.photoKey,
      photoUrl: await photoUrl(e.photoKey),
      placeLat: e.place.lat,
      placeLng: e.place.lng,
    };
  } else if (fromId) {
    const e = await getOwnEntry(me.id, fromId);
    if (e) {
      prefill = {
        key: `von:${e.id}`,
        typeId: e.typeId,
        meat: e.meat,
        placeId: e.placeId,
        placeName: e.place.name,
        placeAddress: e.place.address,
        placeCity: e.place.city,
        priceCents: e.priceCents,
        currency: e.currency.trim(),
        placeLat: e.place.lat,
        placeLng: e.place.lng,
      };
    }
  } else if (placeId && (await placeVisibleTo(me.id, placeId))) {
    const p = await db.query.place.findFirst({ where: eq(place.id, placeId) });
    if (p) {
      prefill = {
        key: `ort:${p.id}`,
        placeId: p.id,
        placeName: p.name,
        placeAddress: p.address,
        placeCity: p.city,
        placeLat: p.lat,
        placeLng: p.lng,
      };
    }
  }

  return (
    <EntryForm
      types={types.map((t) => ({ id: t.id, name: t.name }))}
      prefill={prefill}
      autoGps={me.settings.autoGps}
      defaultCurrency={me.settings.currency}
      lastPrice={last?.priceCents != null ? { cents: last.priceCents, currency: last.currency.trim() } : null}
      friends={friendsWithAvatars}
      photosEnabled={storageEnabled}
      fallbackCenter={last ? { lat: last.place.lat, lng: last.place.lng } : null}
    />
  );
}
