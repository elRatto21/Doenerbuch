let loader: Promise<typeof import("maplibre-gl")> | null = null;

/** Lazy-loads MapLibre in the browser and points it at the worker served from /public. */
export function loadMapLibre() {
  loader ??= import("maplibre-gl").then((lib) => {
    lib.setWorkerUrl("/maplibre-gl-worker.mjs");
    return lib;
  });
  return loader;
}

/** MapLibre opens the compact attribution on load; start collapsed so it doesn't cover small maps. */
export function collapseAttribution(container: HTMLElement | null) {
  container?.querySelector(".maplibregl-compact-show")?.classList.remove("maplibregl-compact-show");
}
