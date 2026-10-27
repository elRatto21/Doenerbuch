import { createSerwistRoute } from "@serwist/turbopack";

// Turbopack has no plugin API yet, so Serwist builds the service worker in this
// route handler at build time and serves it from /serwist/sw.js.
const revision = process.env.SOURCE_COMMIT ?? crypto.randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  swSrc: "src/app/sw.ts",
  useNativeEsbuild: true,
  additionalPrecacheEntries: [{ url: "/offline", revision }],
});
