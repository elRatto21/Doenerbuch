/**
 * Reverse geocoding behind a small interface so the provider can be swapped.
 * Default: Nominatim (usage policy: ≤1 request/s, identifying User-Agent, caching).
 */
export type ReverseResult = {
  address: string | null;
  city: string | null;
  poiName: string | null;
  osmId: string | null;
};

export interface Geocoder {
  reverse(lat: number, lng: number): Promise<ReverseResult | null>;
}

type NominatimResponse = {
  name?: string;
  category?: string;
  type?: string;
  osm_type?: string;
  osm_id?: number;
  address?: Record<string, string | undefined>;
};

const POI_CATEGORIES = new Set(["amenity", "shop"]);
const POI_TYPES = new Set(["fast_food", "restaurant", "cafe", "food_court", "kiosk", "bar", "pub", "deli", "convenience"]);

export function parseNominatim(data: NominatimResponse): ReverseResult {
  const a = data.address ?? {};
  const street = a.road ?? a.pedestrian ?? a.footway ?? a.square ?? a.path ?? null;
  const address = street ? [street, a.house_number].filter(Boolean).join(" ") : (a.neighbourhood ?? a.suburb ?? null);
  const city = a.city ?? a.town ?? a.village ?? a.municipality ?? null;
  const isPoi = Boolean(data.name) && POI_CATEGORIES.has(data.category ?? "") && POI_TYPES.has(data.type ?? "");
  return {
    address: address ?? null,
    city,
    poiName: isPoi ? data.name! : null,
    osmId: isPoi && data.osm_type && data.osm_id ? `${data.osm_type[0]}${data.osm_id}` : null,
  };
}

class NominatimGeocoder implements Geocoder {
  private queue: Promise<unknown> = Promise.resolve();
  private pending = 0;
  /** Beyond this many waiting lookups we answer "unknown" right away instead of queueing (≈ 10 s). */
  private static MAX_PENDING = 10;
  private last = 0;
  private cache = new Map<string, { at: number; value: ReverseResult | null }>();

  constructor(
    private baseUrl: string,
    private userAgent: string,
  ) {}

  async reverse(lat: number, lng: number) {
    // ~11 m grid
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < 24 * 3600_000) return hit.value;

    if (this.pending >= NominatimGeocoder.MAX_PENDING) return null;
    this.pending++;
    const run = this.queue.then(async () => {
      const wait = this.last + 1100 - Date.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      this.last = Date.now();
      const url = new URL("/reverse", this.baseUrl);
      url.search = new URLSearchParams({
        format: "jsonv2",
        lat: String(lat),
        lon: String(lng),
        zoom: "18",
        addressdetails: "1",
        "accept-language": "de",
      }).toString();
      const res = await fetch(url, { headers: { "User-Agent": this.userAgent }, signal: AbortSignal.timeout(6000) });
      if (!res.ok) return null;
      return parseNominatim((await res.json()) as NominatimResponse);
    });
    this.queue = run.catch(() => undefined);
    void run.finally(() => this.pending--).catch(() => undefined);
    const value = await run.catch(() => null);
    this.cache.set(key, { at: Date.now(), value });
    if (this.cache.size > 5000) this.cache.clear();
    return value;
  }
}

const globalForGeocoder = globalThis as unknown as { geocoder?: Geocoder };

export const geocoder: Geocoder = (globalForGeocoder.geocoder ??= new NominatimGeocoder(
  process.env.GEOCODER_URL ?? "https://nominatim.openstreetmap.org",
  process.env.GEOCODER_USER_AGENT ?? "Doenerbuch/1.0",
));
