const EARTH_RADIUS_M = 6_371_000;

export function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** Lat/lng deltas for a square of `meters` around `lat` – used as an index-friendly prefilter. */
export function boundingDelta(lat: number, meters: number): { dLat: number; dLng: number } {
  const dLat = (meters / EARTH_RADIUS_M) * (180 / Math.PI);
  const dLng = dLat / Math.max(Math.cos((lat * Math.PI) / 180), 0.01);
  return { dLat, dLng };
}

/** "Kebap Haus Ece" / "kebap-haus  ECE" → "kebaphausece"; also folds ä/ö/ü/ß and Turkish letters. */
export function normalizePlaceName(name: string): string {
  return name
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/ı/g, "i")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]/g, "");
}

export const PLACE_DEDUPE_RADIUS_M = 50;
export const PLACE_SUGGEST_RADIUS_M = 150;
