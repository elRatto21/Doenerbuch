"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { ChevronRight, LocateFixed, Loader2, Search, Star } from "lucide-react";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { getPosition } from "@/hooks/use-geolocation";
import { firstName, formatDistance, formatRating } from "@/lib/format";
import { haversineMeters, normalizePlaceName } from "@/lib/geo";
import { DEFAULT_CENTER, DEFAULT_ZOOM, MAP_STYLE_URL } from "@/lib/map-config";
import { dayLabel } from "@/lib/time";
import type { MapPlace } from "@/server/queries/social";
import { collapseAttribution, loadMapLibre } from "@/lib/maplibre";
import { createDotMarker } from "./marker";

type Place = Omit<MapPlace, "lastAt"> & { lastAt: string };
type Filter = "alle" | "meine" | "freunde" | "top";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "alle", label: "Alle" },
  { key: "meine", label: "Meine" },
  { key: "freunde", label: "Freunde" },
  { key: "top", label: "Ab 4 ★" },
];

function scoreFor(p: Place, filter: Filter): number | null {
  if (filter === "meine" && p.myAvg != null) return p.myAvg;
  if (filter === "freunde" && p.friendAvg != null) return p.friendAvg;
  return p.avg;
}

function styleMarker(el: HTMLButtonElement, p: Place, filter: Filter, selected: boolean) {
  const friendOnly = p.myCount === 0;
  el.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="${selected ? "#fff" : "var(--color-ink)"}" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg><span>${scoreFor(p, filter) == null ? "offen" : formatRating(scoreFor(p, filter))}</span>`;
  const score = scoreFor(p, filter);
  el.setAttribute("aria-label", score == null ? `${p.name}, noch nicht bewertet` : `${p.name}, ${formatRating(score)} Sterne`);
  el.setAttribute("aria-pressed", String(selected));
  el.style.cssText = [
    "height:34px;padding:0 10px;border:2px solid var(--color-ink);border-radius:17px;display:flex;align-items:center;gap:4px",
    "font-family:inherit;font-weight:700;font-size:14px;cursor:pointer;box-shadow:2px 2px 0 var(--color-ink)",
    selected
      ? "background:var(--color-accent);color:#fff;transform:scale(1.15);z-index:2"
      : friendOnly
        ? "background:#fff;color:var(--color-ink);border-style:dashed"
        : "background:var(--color-mustard);color:var(--color-ink)",
  ].join(";");
}

export function PlacesMap({ places, initialPlaceId }: { places: Place[]; initialPlaceId: number | null }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markers = useRef(new Map<number, { marker: Marker; el: HTMLButtonElement }>());
  const meMarker = useRef<Marker | null>(null);
  const libRef = useRef<typeof import("maplibre-gl") | null>(null);
  const [ready, setReady] = useState(false);
  const [filter, setFilter] = useState<Filter>("alle");
  const [selectedId, setSelectedId] = useState<number | null>(initialPlaceId);
  const [query, setQuery] = useState("");
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  const visible = useMemo(
    () =>
      places.filter((p) => {
        if (filter === "meine") return p.myCount > 0;
        if (filter === "freunde") return p.friendCount > 0;
        if (filter === "top") return p.avg != null && p.avg >= 4;
        return true;
      }),
    [places, filter],
  );

  const q = normalizePlaceName(query);
  const results = q ? places.filter((p) => normalizePlaceName(p.name).includes(q)).slice(0, 5) : [];
  const selected = places.find((p) => p.id === selectedId) ?? null;

  // create the map once
  useEffect(() => {
    let cancelled = false;
    let created: MapLibreMap | null = null;
    const markerMap = markers.current;
    void loadMapLibre().then((lib) => {
      if (cancelled || !container.current) return;
      libRef.current = lib;
      const initial = places.find((p) => p.id === initialPlaceId);
      const map = new lib.Map({
        container: container.current,
        style: MAP_STYLE_URL,
        center: initial ? [initial.lng, initial.lat] : DEFAULT_CENTER,
        zoom: initial ? 16 : DEFAULT_ZOOM,
        attributionControl: { compact: true },
      });
      created = map;
      mapRef.current = map;
      // markers don't need the style – show them even if tiles fail to load
      setReady(true);
      if (!initial && places.length > 0) {
        const bounds = new lib.LngLatBounds();
        places.forEach((p) => bounds.extend([p.lng, p.lat]));
        map.fitBounds(bounds, { padding: { top: 150, bottom: 260, left: 40, right: 40 }, maxZoom: 15, duration: 0 });
      }
      map.on("load", () => collapseAttribution(container.current));
      map.on("click", (e) => {
        if ((e.originalEvent.target as HTMLElement).closest("button")) return;
        setSelectedId(null);
      });
    });
    return () => {
      cancelled = true;
      created?.remove();
      mapRef.current = null;
      markerMap.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- map is created once
  }, []);

  // sync markers with filter + selection
  useEffect(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (!map || !lib) return;
    const keep = new Set(visible.map((p) => p.id));
    for (const [id, m] of markers.current) {
      if (!keep.has(id)) {
        m.marker.remove();
        markers.current.delete(id);
      }
    }
    for (const p of visible) {
      let m = markers.current.get(p.id);
      if (!m) {
        const el = document.createElement("button");
        el.type = "button";
        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          setSelectedId(p.id);
        });
        m = { marker: new lib.Marker({ element: el, anchor: "bottom" }).setLngLat([p.lng, p.lat]).addTo(map), el };
        markers.current.set(p.id, m);
      }
      styleMarker(m.el, p, filter, p.id === selectedId);
    }
  }, [visible, filter, selectedId, ready]);

  function flyTo(p: { lat: number; lng: number }, zoom = 16) {
    mapRef.current?.flyTo({ center: [p.lng, p.lat], zoom: Math.max(mapRef.current.getZoom(), zoom), duration: 600 });
  }

  async function locateMe() {
    setLocating(true);
    setLocateError(null);
    try {
      const fix = await getPosition();
      setMe(fix);
      const map = mapRef.current;
      const lib = libRef.current;
      if (map && lib) {
        meMarker.current ??= new lib.Marker({ element: createDotMarker(20) });
        meMarker.current.setLngLat([fix.lng, fix.lat]).addTo(map);
        flyTo(fix, 15);
      }
    } catch {
      setLocateError("Standort nicht verfügbar.");
    } finally {
      setLocating(false);
    }
  }

  function choose(p: Place) {
    setQuery("");
    setSelectedId(p.id);
    if (filter !== "alle" && !visible.some((v) => v.id === p.id)) setFilter("alle");
    flyTo(p);
  }

  const lastFriends = selected ? selected.friendNames.map(firstName) : [];

  return (
    <main className="relative h-dvh overflow-hidden">
      <div className="absolute inset-0 bg-map">
        <div ref={container} className="h-full w-full" aria-label="Karte mit Dönerläden" role="region" />
      </div>

      <div className="absolute left-4 right-4 top-4 z-10 flex flex-col gap-2.5">
        <div className="flex gap-2">
          <form
            role="search"
            className="relative flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              if (results[0]) choose(results[0]);
            }}
          >
            <label htmlFor="suche" className="flex h-12 items-center gap-2 rounded-xl border-2 border-ink bg-surface px-3 shadow-hard">
              <Search size={18} aria-hidden="true" />
              <span className="sr-only">Imbiss suchen</span>
              <input
                id="suche"
                type="search"
                placeholder="Imbiss suchen"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoComplete="off"
                className="h-full w-full min-w-0 border-0 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted"
              />
            </label>
            {query && (
              <ul className="card absolute left-0 right-0 top-[calc(100%+6px)] m-0 list-none overflow-hidden rounded-xl p-0" aria-label="Suchergebnisse">
                {results.length === 0 ? (
                  <li className="px-3 py-3 text-sm text-muted">Kein Imbiss gefunden.</li>
                ) : (
                  results.map((p, i) => (
                    <li key={p.id} className={i > 0 ? "border-t-2 border-hairline" : ""}>
                      <button type="button" onClick={() => choose(p)} className="flex min-h-12 w-full cursor-pointer flex-col items-start border-0 bg-transparent px-3 py-2 text-left">
                        <span className="text-[15px] font-bold">{p.name}</span>
                        {p.address ? <span className="text-xs text-muted">{p.address}</span> : null}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </form>
          <button type="button" aria-label="Mein Standort" onClick={() => void locateMe()} className="icon-btn h-12 w-12 shadow-hard" disabled={locating}>
            {locating ? <Loader2 size={20} className="animate-spin" aria-hidden="true" /> : <LocateFixed size={20} strokeWidth={2.2} aria-hidden="true" />}
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter">
          {FILTERS.map((f) => (
            <button key={f.key} type="button" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)} className="pill h-9 shrink-0 px-3.5 text-[13px] shadow-hard-sm">
              {f.label}
            </button>
          ))}
        </div>
        {locateError ? (
          <p role="alert" className="m-0 self-start rounded-lg border-2 border-ink bg-surface px-2.5 py-1 text-[13px] font-medium">
            {locateError}
          </p>
        ) : null}
      </div>

      {places.length === 0 ? (
        <div className="card absolute inset-x-4 z-10 flex flex-col gap-3 p-4" style={{ bottom: "calc(100px + env(safe-area-inset-bottom))" }}>
          <p className="m-0 text-[15px] font-bold">Noch keine Orte auf der Karte</p>
          <p className="m-0 text-sm text-muted">Sobald du oder deine Freunde Döner eintragen, erscheinen die Läden hier.</p>
          <Link href="/neu" className="btn btn-primary h-12 text-base">
            Döner eintragen
          </Link>
        </div>
      ) : selected ? (
        <Link
          href={selected.myLastEntryId ? `/eintrag/${selected.myLastEntryId}` : `/neu?ort=${selected.id}`}
          className="card absolute inset-x-4 z-10 flex items-center gap-3 p-3 text-ink no-underline hover:text-ink"
          style={{ bottom: "calc(100px + env(safe-area-inset-bottom))" }}
        >
          <div className="flex w-[58px] shrink-0 flex-col items-center justify-center self-stretch rounded-[10px] border-2 border-ink bg-mustard py-1.5">
            <span className="display text-[22px] font-extrabold leading-none tabular-nums">{formatRating(scoreFor(selected, filter))}</span>
            <span className="mt-0.5 flex items-center gap-0.5 text-[11px] font-bold">
              <Star size={10} fill="currentColor" aria-hidden="true" /> {selected.count}×
            </span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="display truncate text-[17px] font-bold">{selected.name}</span>
            <span className="truncate text-[13px] text-muted">
              {[selected.address, me ? formatDistance(haversineMeters(me, selected)) : null].filter(Boolean).join(" · ")}
            </span>
            <span className="truncate text-xs text-muted">
              Zuletzt {dayLabel(selected.lastAt)}
              {lastFriends.length > 0
                ? ` · ${lastFriends.slice(0, 2).join(", ")}${lastFriends.length > 2 ? ` +${lastFriends.length - 2}` : ""} ${lastFriends.length === 1 ? "war" : "waren"} auch hier`
                : ""}
            </span>
          </div>
          <ChevronRight size={22} strokeWidth={2.4} aria-hidden="true" className="shrink-0" />
          <span className="sr-only">{selected.myLastEntryId ? "Letzten Eintrag öffnen" : "Hier eintragen"}</span>
        </Link>
      ) : null}
    </main>
  );
}
