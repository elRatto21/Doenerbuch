"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { DEFAULT_CENTER, DEFAULT_ZOOM, MAP_STYLE_URL } from "@/lib/map-config";
import { collapseAttribution, loadMapLibre } from "@/lib/maplibre";
import { createDotMarker } from "./marker";

type Props = {
  position: { lat: number; lng: number } | null;
  accuracyM?: number | null;
  /** When set, tapping the map / dragging the marker picks a position. */
  onPick?: (pos: { lat: number; lng: number }) => void;
  interactive?: boolean;
  className?: string;
  zoom?: number;
  /** Tiny thumbnails drop the attribution control; the full-size maps credit OSM. */
  attribution?: boolean;
};

const ACCURACY_SOURCE = "accuracy";

function circlePolygon(lat: number, lng: number, radiusM: number) {
  const points = 48;
  const coords: [number, number][] = [];
  const dLat = radiusM / 111_320;
  const dLng = radiusM / (111_320 * Math.cos((lat * Math.PI) / 180));
  for (let i = 0; i <= points; i++) {
    const a = (i / points) * 2 * Math.PI;
    coords.push([lng + dLng * Math.cos(a), lat + dLat * Math.sin(a)]);
  }
  return { type: "Feature" as const, properties: {}, geometry: { type: "Polygon" as const, coordinates: [coords] } };
}

export function MiniMap({ position, accuracyM, onPick, interactive = false, className = "", zoom = 16, attribution = true }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onPickRef = useRef(onPick);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  useEffect(() => {
    let cancelled = false;
    let created: MapLibreMap | null = null;
    void loadMapLibre()
      .then((maplibregl) => {
        if (cancelled || !container.current) return;
        const map = new maplibregl.Map({
          container: container.current,
          style: MAP_STYLE_URL,
          center: DEFAULT_CENTER,
          zoom: DEFAULT_ZOOM,
          // a picker needs touch handlers, but must not hijack page scrolling
          interactive: interactive || Boolean(onPickRef.current),
          cooperativeGestures: Boolean(onPickRef.current) && !interactive,
          locale: { "CooperativeGesturesHandler.MobileHelpText": "Mit zwei Fingern verschieben", "CooperativeGesturesHandler.WindowsHelpText": "Strg + Scrollen zum Zoomen", "CooperativeGesturesHandler.MacHelpText": "⌘ + Scrollen zum Zoomen" },
          attributionControl: attribution ? { compact: true } : false,
        });
        created = map;
        mapRef.current = map;
        const marker = new maplibregl.Marker({ element: createDotMarker(), draggable: Boolean(onPickRef.current) });
        markerRef.current = marker;
        marker.on("dragend", () => {
          const ll = marker.getLngLat();
          onPickRef.current?.({ lat: ll.lat, lng: ll.lng });
        });
        map.on("click", (e) => onPickRef.current?.({ lat: e.lngLat.lat, lng: e.lngLat.lng }));
        map.on("load", () => {
          map.addSource(ACCURACY_SOURCE, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
          map.addLayer({
            id: "accuracy-fill",
            type: "fill",
            source: ACCURACY_SOURCE,
            paint: { "fill-color": "#C8321F", "fill-opacity": 0.15 },
          });
          collapseAttribution(container.current);
          setReady(true);
        });
        map.on("error", (e) => {
          // style/tiles unreachable (offline) → show placeholder pattern
          if ((e.error as { status?: number } | undefined)?.status || !map.isStyleLoaded()) setFailed(true);
        });
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      created?.remove();
      mapRef.current = null;
    };
  }, [interactive, attribution]);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    if (position) {
      marker.setLngLat([position.lng, position.lat]).addTo(map);
      map.jumpTo({ center: [position.lng, position.lat], zoom: Math.max(map.getZoom(), zoom) });
    } else {
      marker.remove();
    }
    const source = map.getSource(ACCURACY_SOURCE) as { setData?: (d: unknown) => void } | undefined;
    source?.setData?.(
      position && accuracyM
        ? { type: "FeatureCollection", features: [circlePolygon(position.lat, position.lng, Math.min(accuracyM, 500))] }
        : { type: "FeatureCollection", features: [] },
    );
  }, [position, accuracyM, ready, zoom]);

  return (
    <div className={`relative overflow-hidden bg-map ${className}`}>
      {/* maplibre sets position:relative on its container, so size it via a wrapper */}
      <div className="absolute inset-0">
        <div ref={container} className="h-full w-full" />
      </div>
      {failed ? <div className="map-placeholder absolute inset-0" aria-hidden="true" /> : null}
    </div>
  );
}
