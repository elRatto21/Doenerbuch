# Dönerbuch – Handoff für Claude Code

Mobile-first Web-App (PWA) zum Tracken von Dönern: Eintrag mit Sorte, Ort (GPS), Preis → Bewertung → Journal, Statistik, Karte, Freunde.

Die Design-Referenz liegt in `design/` (10 Screens als `.dc.html`, je 390×844). Sie sind **nur visuelle Referenz** – Markup nicht 1:1 übernehmen, sondern als React-Komponenten mit Tailwind nachbauen.

---

## 1. Prompt zum Einfügen in Claude Code

```
Lies HANDOFF.md und die Screens in design/. Baue daraus die App "Dönerbuch"
nach Abschnitt 2–7. Arbeite in den Meilensteinen aus Abschnitt 8, einer nach
dem anderen. Nach jedem Meilenstein: kurz zusammenfassen, was fertig ist, und
auf mein OK warten. Nutze pnpm. UI-Texte auf Deutsch.
```

---

## 2. Stack

- **Next.js 15** (App Router, Server Actions, TypeScript strict), **pnpm**
- **Tailwind CSS v4** – Tokens aus Abschnitt 3 als Theme-Variablen
- **PostgreSQL + Drizzle ORM** (drizzle-kit für Migrationen)
- **Better Auth** (E-Mail + Passwort, optional Google), Session-Cookies
- **MapLibre GL** + OpenStreetMap-Tiles für Karte; Reverse-Geocoding über Nominatim (mit Rate-Limit + User-Agent) – austauschbar halten
- **PWA**: Manifest, Icons, Service Worker (z. B. Serwist), installierbar
- **Bilder** (Foto zum Eintrag): S3-kompatibel (MinIO), Upload über Presigned URL
- **Deploy**: Docker-Image für Coolify (`output: "standalone"`)
- Validierung mit **zod**, Datum mit **date-fns** (de-Locale)

---

## 3. Design-Tokens („Imbiss-Schild“)

| Token | Wert | Verwendung |
|---|---|---|
| `ink` | `#1B1A17` | Text, alle Konturen, Offset-Schatten |
| `ground` | `#F5F3EE` | App-Hintergrund |
| `surface` | `#FFFFFF` | Karten, Inputs |
| `accent` | `#C8321F` (Peperoni-Rot) | Primär-CTA, aktiver Tab, Top-Werte |
| `mustard` | `#F6B814` (Kurkuma) | Chips, Sterne, Highlights |
| `muted` | `#5E5A52` | Sekundärtext |
| `map` | `#E6E2D6` | Kartenfläche/Platzhalter |
| `hairline` | `#E6E2D6` | Trenner in Listen |

- **Schrift**: Display *Bricolage Grotesque* (700/800), Body *DM Sans* (400/500/700) via `next/font/google`
- **Konturen**: `2px solid ink`, Chips `1.5px`
- **Radius**: Karten 14–16px, Buttons 12–14px, Chips 6px / Pills rund
- **Schatten**: harter Offset `3px 3px 0 ink` (klein: `2px 2px 0`) – keine weichen Schatten
- **Touch-Targets** ≥ 44px, Primär-CTA 56px hoch
- Icons: Lucide (Stroke 2–2.2), keine Emojis
- Zahlen mit `tabular-nums`; Preise im Format `€ 7,50`, Noten `4,5`

---

## 4. Screens & Routen

| Route | Screen (design/) | Inhalt |
|---|---|---|
| `/` | `Main` / `Willkommen` | Journal: 3 Kennzahl-Kacheln (Döner gesamt, Ø Bewertung, diesen Monat), Einträge nach Monat gruppiert, Filter. Leerzustand = `Willkommen` |
| `/neu` | `NeuerEintrag` | Schritt 1/2: Datum/Uhrzeit (Default jetzt), Sorte (Chips), Fleisch (Segment), Imbiss-Name (Autocomplete aus eigenen + Freundes-Orten in der Nähe), GPS-Standort mit Mini-Karte + „Neu orten“, Preis (+ „wie letztes Mal“) |
| `/neu/bewertung` | `Bewertung` | Schritt 2/2: Gesamt 1–5 Sterne, 6 Kategorien je 1–5 (Fleisch, Brot, Sauce, Salat & Gemüse, Portion, Preis/Leistung), Freunde markieren, Notiz, Foto → „Ins Dönerbuch eintragen“ |
| `/eintrag/[id]` | `Detail` | Foto, Sorte/Fleisch, Datum, Kacheln (Note, Preis, „x× hier gewesen“), Kategorie-Balken, Ort + Link zur Karte, Notiz, markierte Freunde, „Nochmal hier“ (Formular vorbefüllt), Teilen, Bearbeiten/Löschen |
| `/karte` | `Karte` | Vollbild-Karte, Pins = Orte mit Ø-Note, Filter (Alle/Meine/Freunde/ab 4★), Suche, „Mein Standort“, Bottom-Card zum gewählten Ort |
| `/statistik` | `A-Statistik` | Zeitraum Monat/Jahr/Gesamt; Anzahl + Ausgaben + Ø Preis; Balken „Was du isst“ pro Sorte; „Die Besten je Sorte“ (höchste Ø-Note pro Sorte, mind. 1 Eintrag) |
| `/freunde` | `Freunde` | Rangliste des Monats (Anzahl Döner, Ø Note, eigener Rang hervorgehoben), Feed der Freunde-Einträge |
| `/freunde/hinzufuegen` | `FreundHinzufuegen` | Eigener Freundescode + QR, Link teilen (Web Share API), QR scannen, Suche nach Code/Username, eingehende Anfragen annehmen/ablehnen |
| `/profil` | `Profil` | Avatar, Name, @username, Abzeichen, Einstellungen (Auto-GPS, für Freunde sichtbar, Benachrichtigungen, Währung, eigene Sorten, CSV-Export), Abmelden |
| `/login`, `/registrieren` | – | Better-Auth-Formulare im selben Stil |

**Bottom-Nav** (auf `/`, `/karte`, `/freunde`, `/statistik`): Journal · Karte · **[+]** (erhöhter roter Button → `/neu`) · Freunde · Statistik. Profil über Avatar oben rechts im Journal.

Der Eintrag-Flow (`/neu` → `/neu/bewertung`) hält den Zustand clientseitig (z. B. Zustand-Store oder Form-State), gespeichert wird erst am Ende per Server Action.

---

## 5. Datenmodell (Drizzle, Vorschlag)

```ts
// Better Auth erzeugt user/session/account/verification – user erweitern um:
//   username (unique), friendCode (unique, z. B. "DÖN-4K7Q"), avatarUrl,
//   settings jsonb { autoGps, visibleToFriends, notifications, currency }

kebabType      id, userId (null = Standard), name, sort         // Döner, Dürüm, Döner-Box, Lahmacun, Teller, Yufka, Pide
place          id, name, lat, lng, address, osmId?, createdBy, createdAt
               // Dedupe: gleicher Name (normalisiert) innerhalb ~50 m = gleicher Ort
entry          id, userId, placeId, typeId, meat enum('kalb','haehnchen','gemischt','veggie'),
               eatenAt timestamptz, priceCents int, currency char(3) default 'EUR',
               lat, lng, accuracyM,            // tatsächliche GPS-Position beim Eintrag
               overall smallint 1–5,
               rMeat, rBread, rSauce, rSalad, rPortion, rValue smallint 1–5,
               note text, photoKey text, createdAt, updatedAt
entryCompanion entryId, friendUserId           // "mit Lena gegessen"
friendship     id, requesterId, addresseeId, status enum('pending','accepted','declined'), createdAt
               // unique(requesterId, addresseeId)
badge          id, key, name, description
userBadge      userId, badgeId, earnedAt
```

Indizes: `entry(userId, eatenAt desc)`, `entry(placeId)`, `place(lat, lng)` (oder PostGIS, falls gewünscht).

---

## 6. Logik & Regeln

- **GPS**: `navigator.geolocation.getCurrentPosition` (highAccuracy, Timeout 10 s). Genauigkeit anzeigen („±8 m“). Ohne Erlaubnis: Ort manuell auf Karte setzen.
- **Ort-Vorschläge**: Orte im Umkreis 150 m sortiert nach Entfernung zuerst anbieten.
- **Statistik**: alles per SQL-Aggregation im Zeitraum – Anzahl pro Sorte, Summe/Ø Preis, Ø Note, beste Orte je Sorte (`avg(overall)` gruppiert nach Sorte + Ort, Tie-Break nach Anzahl).
- **Rangliste**: eigene + akzeptierte Freunde, aktueller Monat, sortiert nach Anzahl, dann Ø Note.
- **Feed**: Einträge akzeptierter Freunde mit `visibleToFriends = true`, neueste zuerst, paginiert.
- **Markieren**: nur akzeptierte Freunde; markierter Freund sieht „… mit dir“ im Feed.
- **Datenschutz**: Einträge sind privat, außer für Freunde wenn freigegeben; exakte GPS-Position nur für den Besitzer, Freunde sehen nur den Ort (`place`).
- **Abzeichen** (erste Ideen): Erster Döner, 10× gleiche Sorte, Stammgast (5× gleicher Ort), 5 Städte.
- **CSV-Export** aller eigenen Einträge.

---

## 7. Qualität

- Mobile-first, getestet bei 360–430px Breite; Desktop = zentrierte 480px-Spalte
- Barrierefreiheit: echte `<button>`/`<a>`, Labels an Inputs, `aria-label` an Icon-Buttons, Kontrast ≥ 4.5:1
- Loading- und Leerzustände für jede Liste
- Seed-Skript mit Beispieldaten (die Namen aus den Designs)
- Vitest für Statistik-/Ranglisten-Queries, Playwright-Smoke-Test für den Eintrag-Flow

---

## 8. Meilensteine

1. **Setup** – Next.js, Tailwind-Tokens, Fonts, Drizzle + Postgres (docker-compose), Better Auth, Login/Registrierung, Layout + Bottom-Nav
2. **Eintragen** – `/neu` + `/neu/bewertung` inkl. GPS, Orte-Dedupe, Speichern
3. **Journal & Detail** – `/`, Leerzustand, `/eintrag/[id]`, Bearbeiten/Löschen, „Nochmal hier“
4. **Statistik** – `/statistik` mit Zeitraum-Umschalter
5. **Karte** – `/karte` mit MapLibre, Pins, Filter
6. **Freunde** – Codes, Anfragen, Markieren, Feed, Rangliste
7. **Profil & Extras** – Einstellungen, Abzeichen, Foto-Upload (MinIO), CSV-Export
8. **PWA & Deploy** – Manifest, Service Worker, Dockerfile für Coolify, GitHub Actions (Lint, Typecheck, Tests)
