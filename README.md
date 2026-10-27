# Dönerbuch

Mobile-first PWA for tracking your Döner: type, place (GPS), price, then a rating that lands in your journal, statistics, map and friends' leaderboard.

Design reference and the original handoff: [`docs/HANDOFF.md`](docs/HANDOFF.md), [`docs/design/`](docs/design).

**Stack:** Next.js 15 (App Router, Server Actions, TS strict) · Tailwind CSS v4 · PostgreSQL + Drizzle ORM · Better Auth (email/password + optional Google) · MapLibre GL + OpenFreeMap · Nominatim reverse geocoding · S3/MinIO photo uploads · Serwist service worker · zod · date-fns.

## Quick start (local)

Requirements: Node 22, pnpm 10, Docker.

```bash
cp .env.example .env          # set BETTER_AUTH_SECRET (openssl rand -base64 32)
docker compose up -d          # Postgres :5432, MinIO :9000 (console :9001), bucket "doenerbuch"
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
| `pnpm test:e2e` | Playwright smoke test of the entry flow (needs `pnpm build` and a migrated `DATABASE_URL`) |
| `pnpm db:generate` | Create a migration from `src/db/schema.ts` |
| `pnpm db:migrate` | Apply migrations and sync badges/standard types |
| `pnpm db:seed` | Demo data with the names from the designs |
| `pnpm icons` | Re-render PWA icons into `public/icons` |

Create the test DB once: `createdb -U doener doenerbuch_test` (or `docker compose exec db createdb -U doener doenerbuch_test`).

## Environment

See [`.env.example`](.env.example). Required in production: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, the `S3_*` values and `GEOCODER_USER_AGENT` (with a real contact address, required by the Nominatim usage policy).

- **Google sign-in** shows up only when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set. Authorized redirect URI: `https://<your-domain>/api/auth/callback/google`. Google users pick their `@username` on first login (`/willkommen`).
- **Photos** are disabled (camera button hidden) when no S3 credentials are set.
- **Map tiles** come from OpenFreeMap (no key). Swap with `NEXT_PUBLIC_MAP_STYLE_URL` (build-time).
- **Geocoding** sits behind the `Geocoder` interface in `src/server/geocode.ts`. Nominatim is rate-limited to 1 request/s per server process and cached on an ~11 m grid.

## Deploy on Coolify

1. **Postgres:** create a PostgreSQL 16 resource and copy its internal connection URL into `DATABASE_URL`.
2. **MinIO:** create a bucket (e.g. `doenerbuch`), keep it private, and create an access key with read/write on it.
   - The browser uploads directly to MinIO with a presigned POST, so the S3 API must be reachable from the internet. Set `S3_PUBLIC_ENDPOINT` to the public HTTPS URL; `S3_ENDPOINT` can be the internal URL.
   - Allow your app origin via CORS: MinIO's default `MINIO_API_CORS_ALLOW_ORIGIN=*` works; tighten it to `https://<your-domain>` if you like.
3. **App:** add the repo as a *Dockerfile* application, port `3000`.
   - Set the runtime env vars from `.env.example`.
   - Pass `NEXT_PUBLIC_APP_URL` (and optionally `NEXT_PUBLIC_MAP_STYLE_URL`) as **build arguments**.
   - The container runs pending migrations on start (`RUN_MIGRATIONS=true`) and exposes `GET /api/health` for the health check.

## Project layout

```
src/app/            routes (see table below), API routes for auth, geocoding, CSV export, health
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
