"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { Check, LocateFixed, Loader2, X } from "lucide-react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { getPosition } from "@/hooks/use-geolocation";
import { DEFAULT_CENTER, DEFAULT_ZOOM, MAP_STYLE_URL } from "@/lib/map-config";
import { collapseAttribution, loadMapLibre } from "@/lib/maplibre";

type LatLng = { lat: number; lng: number };

/**
 * Full-screen map to set a position by hand: the pin stays in the middle and the map
 * moves underneath, so the finger never covers the spot being chosen.
 */
export function LocationPicker({
  initial,
  fallbackCenter,
  onConfirm,
  onClose,
}: {
  initial: LatLng | null;
  /** Where to start when nothing is set yet (e.g. the last entry's place). */
  fallbackCenter: LatLng | null;
  onConfirm: (pos: LatLng) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  useEffect(() => {
    dialog.current?.showModal();
    let cancelled = false;
    let created: MapLibreMap | null = null;
    void loadMapLibre().then((lib) => {
      if (cancelled || !container.current) return;
      const start = initial ?? fallbackCenter;
      const map = new lib.Map({
        container: container.current,
        style: MAP_STYLE_URL,
        center: start ? [start.lng, start.lat] : DEFAULT_CENTER,
        zoom: initial ? 17 : start ? 15 : DEFAULT_ZOOM,
        attributionControl: { compact: true },
      });
      created = map;
      mapRef.current = map;
      map.on("load", () => collapseAttribution(container.current));
    });
    return () => {
      cancelled = true;
      created?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- map is created once per opening
  }, []);

  async function locateMe() {
    setLocating(true);
    setLocateError(null);
    try {
      const fix = await getPosition();
      mapRef.current?.flyTo({ center: [fix.lng, fix.lat], zoom: 17, duration: 600 });
    } catch {
      setLocateError("Standort nicht verfügbar – verschieb die Karte von Hand.");
    } finally {
      setLocating(false);
    }
  }

  function confirm() {
    const center = mapRef.current?.getCenter();
    if (center) onConfirm({ lat: center.lat, lng: center.lng });
    dialog.current?.close();
  }

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-labelledby="picker-title"
      className="m-0 h-dvh max-h-none w-full max-w-none overflow-hidden bg-ground p-0 text-ink backdrop:bg-ink/50 md:mx-auto md:max-w-[480px] md:border-x-2 md:border-ink"
    >
      <div className="relative h-full w-full">
        <div className="absolute inset-0 bg-map">
          <div ref={container} className="h-full w-full" />
        </div>

        {/* fixed pin in the middle; its tip marks the chosen point */}
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
          <svg width="44" height="56" viewBox="0 0 44 56">
            <path d="M22 54s-19-17-19-31a19 19 0 0 1 38 0c0 14-19 31-19 31z" fill="var(--color-accent)" stroke="var(--color-ink)" strokeWidth="3" />
            <circle cx="22" cy="22" r="7" fill="#fff" stroke="var(--color-ink)" strokeWidth="2.5" />
          </svg>
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-2 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink/30" />

        <div className="absolute left-4 right-4 top-4 flex items-start gap-2">
          <button type="button" aria-label="Schließen" onClick={() => dialog.current?.close()} className="icon-btn h-12 w-12 shadow-hard">
            <X size={20} strokeWidth={2.4} aria-hidden="true" />
          </button>
          <div className="card flex min-h-12 flex-1 flex-col justify-center rounded-xl px-3 py-1.5">
            <h2 id="picker-title" className="display m-0 text-base font-bold">
              Ort setzen
            </h2>
            <p className="m-0 text-xs text-muted">Karte verschieben, bis der Pin auf dem Imbiss sitzt.</p>
          </div>
          <button type="button" aria-label="Mein Standort" onClick={() => void locateMe()} disabled={locating} className="icon-btn h-12 w-12 shadow-hard">
            {locating ? <Loader2 size={20} className="animate-spin" aria-hidden="true" /> : <LocateFixed size={20} strokeWidth={2.2} aria-hidden="true" />}
          </button>
        </div>

        <div className="absolute inset-x-4 flex flex-col gap-2" style={{ bottom: "calc(44px + env(safe-area-inset-bottom))" }}>
          {locateError ? (
            <p role="alert" className="m-0 self-center rounded-lg border-2 border-ink bg-surface px-2.5 py-1 text-[13px] font-medium">
              {locateError}
            </p>
          ) : null}
          <button type="button" onClick={confirm} className="btn btn-primary w-full">
            <Check size={20} strokeWidth={2.6} aria-hidden="true" />
            Hier setzen
          </button>
        </div>
      </div>
    </dialog>
  );
}
