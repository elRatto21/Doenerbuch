"use client";

import { useCallback, useState } from "react";

export type GeoFix = { lat: number; lng: number; accuracyM: number };
export type GeoState =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "ok"; fix: GeoFix }
  | { status: "error"; reason: "denied" | "unavailable" | "timeout" | "unsupported" };

export const GEO_ERROR_TEXT: Record<Extract<GeoState, { status: "error" }>["reason"], string> = {
  denied: "Standort nicht erlaubt – tipp auf die Karte, um den Ort zu setzen.",
  unavailable: "Standort nicht verfügbar – tipp auf die Karte, um den Ort zu setzen.",
  timeout: "Standort dauert zu lange – nochmal versuchen oder auf der Karte setzen.",
  unsupported: "Dein Browser kann keinen Standort – tipp auf die Karte, um den Ort zu setzen.",
};

export function getPosition(): Promise<GeoFix> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(Object.assign(new Error("unsupported"), { reason: "unsupported" }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracyM: Math.round(pos.coords.accuracy) }),
      (err) =>
        reject(
          Object.assign(new Error(err.message), {
            reason: err.code === err.PERMISSION_DENIED ? "denied" : err.code === err.TIMEOUT ? "timeout" : "unavailable",
          }),
        ),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
    );
  });
}

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({ status: "idle" });
  const locate = useCallback(async (): Promise<GeoFix | null> => {
    setState({ status: "locating" });
    try {
      const fix = await getPosition();
      setState({ status: "ok", fix });
      return fix;
    } catch (err) {
      setState({ status: "error", reason: (err as { reason?: "denied" }).reason ?? "unavailable" });
      return null;
    }
  }, []);
  return { state, locate };
}
