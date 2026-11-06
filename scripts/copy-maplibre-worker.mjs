// MapLibre v6 resolves its worker relative to import.meta.url, which breaks inside the
// Next.js bundle. Serve the worker from /public instead (see src/lib/maplibre.ts).
import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const dist = dirname(require.resolve("maplibre-gl/package.json"));
await mkdir("public", { recursive: true });
await copyFile(join(dist, "dist", "maplibre-gl-worker.mjs"), "public/maplibre-gl-worker.mjs");
