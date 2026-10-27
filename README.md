# Dönerbuch

Mobile-first PWA for tracking your Döner: type, place (GPS), price, then a rating that lands in your journal, statistics, map and friends' leaderboard.

Design reference and the original handoff: [`docs/HANDOFF.md`](docs/HANDOFF.md), [`docs/design/`](docs/design).

**Stack:** Next.js 16 (App Router, Turbopack, Server Actions, TS strict) · React 19 · Tailwind CSS v4 · PostgreSQL + Drizzle ORM · Better Auth (email/password + optional Google) · MapLibre GL + OpenFreeMap · Nominatim reverse geocoding · S3-compatible photo uploads (Cloudflare R2, MinIO, AWS) · Serwist service worker (`@serwist/turbopack`) · zod · date-fns.

## Quick start (local)

Requirements: Node 24, pnpm 10 (`corepack enable`), a PostgreSQL database and, for photos, an S3-compatible bucket (R2, MinIO, …).

```bash
cp .env.example .env          # DATABASE_URL, BETTER_AUTH_SECRET (openssl rand -base64 32), S3_*
pnpm install
pnpm db:migrate               # migrations + badges/standard types
pnpm db:seed                  # optional demo data
pnpm dev                      # http://localhost:3000
```

Demo login after seeding: `niklas@example.com` / `doener123` (also `lena@`, `tim@`, `jonas@`, `selin@`, `tobi@example.com`). Selin has a pending friend request to Niklas.

Geolocation needs a secure context. `localhost` works; to test on a phone use an HTTPS tunnel.

## Scripts

| Script | What it does |
|---|---|
| `pnpm dev` / `build` / `start` | Next.js |
| `pnpm lint` / `typecheck` | ESLint, `tsc --noEmit` |
| `pnpm test` | Vitest: unit tests + DB tests for stats, ranking, feed, places, badges (uses `TEST_DATABASE_URL`, default `postgres://doener:doener@localhost:5432/doenerbuch_test` – the DB is wiped) |
| `pnpm test:e2e` | Playwright smoke test of the entry flow (needs `pnpm build` and a migrated `DATABASE_URL`; set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to use an existing Chromium) |
| `pnpm db:generate` | Create a migration from `src/db/schema.ts` |
| `pnpm db:migrate` | Apply migrations and sync badges/standard types |
| `pnpm db:seed` | Demo data with the names from the designs |
| `pnpm icons` | Re-render PWA icons into `public/icons` |

Create the test DB once: `createdb doenerbuch_test`.

## Environment

See [`.env.example`](.env.example). Required in production: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, the `S3_*` values and `GEOCODER_USER_AGENT` (with a real contact address, required by the Nominatim usage policy).

- **Google sign-in** shows up only when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set. Authorized redirect URI: `https://<your-domain>/api/auth/callback/google`. Google users pick their `@username` on first login (`/willkommen`).
- **Photos** are disabled (camera button hidden) when no S3 credentials are set.
- **Map tiles** come from OpenFreeMap (no key). Swap with `NEXT_PUBLIC_MAP_STYLE_URL` (build-time).
- **Geocoding** sits behind the `Geocoder` interface in `src/server/geocode.ts`. Nominatim is rate-limited to 1 request/s per server process and cached on an ~11 m grid.

## Deploy on Coolify (Nixpacks)

1. **Postgres:** create a PostgreSQL resource and use its internal URL as `DATABASE_URL`.
2. **Storage (R2 / MinIO / S3):** create a bucket (e.g. `doenerbuch`) and an API token / access key with read & write on it. Browsers upload directly with a presigned PUT, so:
   - `S3_ENDPOINT` = the S3 API endpoint, for R2 `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` (with `S3_REGION=auto`). Leave `S3_PUBLIC_ENDPOINT` empty unless the browser needs a different hostname than the server.
   - Photos are shown via signed URLs, so the bucket can stay private. Optionally set `S3_PUBLIC_URL` (e.g. the R2 `https://pub-….r2.dev` URL or a custom domain) to serve photos from the public URL instead.
   - Add a CORS rule on the bucket allowing your app origin with methods `PUT` and `GET` and header `content-type` (R2: bucket → Settings → CORS policy).
3. **App:** add the repository with build pack **Nixpacks**, the branch you deploy (currently `feat/mvp` – the repo has no `main` yet), base directory `/`, port **3000**. Set the env vars from `.env.example`.
   - Nixpacks picks Node 24 from `engines` and pnpm 10 via corepack; `nixpacks.toml` installs a current corepack (Nixpacks' bundled one can't fetch pnpm 10) and starts with `pnpm start`.
   - The build doesn't need any secrets, so env vars don't have to be marked "available at build time" – except `NEXT_PUBLIC_MAP_STYLE_URL` if you change it (inlined into the client bundle).
   - Pending migrations run automatically on start (`RUN_MIGRATIONS=false` to opt out). Health check: `GET /api/health`.

## Project layout

```
src/app/            routes (see table below), API routes for auth, geocoding, CSV export, health; /serwist/sw.js
src/components/     UI, grouped by screen (entry, journal, detail, map, friends, profile)
src/server/queries/ all DB reads/writes – SQL aggregations for stats, ranking, feed, map
src/server/actions/ server actions (zod-validated, always scoped to the session user)
src/db/schema.ts    Drizzle schema (Better Auth tables + app tables)
src/stores/         client draft for the two-step entry flow (sessionStorage)
drizzle/            SQL migrations
tests/              unit + DB tests (Vitest), e2e (Playwright)
```

| Route | Screen |
|---|---|
| `/` | Journal (empty state = Willkommen), filter via `?sorte=&min=&q=` |
| `/neu`, `/neu/bewertung` | Entry flow, step 1/2 and 2/2; `?von=<id>` = "Nochmal hier", `?bearbeiten=<id>` = edit, `?ort=<placeId>` |
| `/eintrag/[id]` | Detail (owner, or friends/tagged companions without exact GPS) |
| `/karte` | Map with pins, filters, search, own location; `?ort=<placeId>` |
| `/statistik` | Month / year / all time |
| `/freunde`, `/freunde/hinzufuegen`, `/freunde/einladung/[code]` | Ranking + feed, code/QR/search/requests, invite link target |
| `/profil`, `/profil/bearbeiten`, `/profil/sorten` | Settings, badges, export, own types |
| `/login`, `/registrieren`, `/willkommen` | Auth + username onboarding |

## Rules worth knowing

- **Places** are deduplicated: same normalized name within 50 m = same place. Suggestions show your and your friends' places within 150 m first, sorted by distance.
- **Privacy:** entries are private unless "Für Freunde sichtbar" is on (default). Friends never see the exact GPS fix, only the place. Tagged friends always see entries they were tagged in.
- **Time zone:** month boundaries, stats and the ranking use `APP_TIMEZONE` (default `Europe/Berlin`).
- **Currencies:** each entry stores its own currency. Totals are shown per currency, with no conversion.
- **Notifications** are in-app only for now: a dot on the Freunde tab for open requests, which the profile setting toggles. Web Push would need VAPID keys and was left out of the MVP.
- **MapLibre worker:** MapLibre v6 can't locate its worker inside the Next bundle, so `scripts/copy-maplibre-worker.mjs` copies it to `public/` on install/dev/build.
