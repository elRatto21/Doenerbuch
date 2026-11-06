import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RatingForm } from "@/components/entry/rating-form";
import { requireUser } from "@/lib/session";
import { getOwnEntry } from "@/server/queries/entries";
import { photoUrl } from "@/server/storage";

export const metadata: Metadata = { title: "Bewerten" };

export default async function RatePage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const e = await getOwnEntry(me.id, id);
  if (!e) notFound();
  return (
    <RatingForm
      entryId={e.id}
      summary={{
        typeName: e.type.name,
        placeName: e.place.name,
        priceCents: e.priceCents,
        currency: e.currency.trim(),
        photoUrl: await photoUrl(e.photoKey),
      }}
      initial={{
        overall: e.overall,
        ratings: { rMeat: e.rMeat, rBread: e.rBread, rSauce: e.rSauce, rSalad: e.rSalad, rPortion: e.rPortion, rValue: e.rValue },
        note: e.note ?? "",
      }}
    />
  );
}
