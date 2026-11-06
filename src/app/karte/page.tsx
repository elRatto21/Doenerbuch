import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { mapPlaces } from "@/server/queries/social";
import { PlacesMap } from "@/components/map/places-map";

export const metadata: Metadata = { title: "Karte" };

export default async function MapPage({ searchParams }: { searchParams: Promise<{ ort?: string }> }) {
  const me = await requireUser();
  const { ort } = await searchParams;
  const places = await mapPlaces(me.id);
  return (
    <PlacesMap
      places={places.map((p) => ({ ...p, lastAt: p.lastAt.toISOString() }))}
      initialPlaceId={ort ? Number(ort) : null}
    />
  );
}
