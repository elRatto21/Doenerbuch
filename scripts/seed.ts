/**
 * Demo data with the names from the designs.
 *   pnpm db:seed            → adds demo users if missing
 * Login: niklas@example.com / doener123 (also lena@, tim@, jonas@, selin@, tobi@)
 */
import "dotenv/config";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { entry, friendship, kebabType, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import type { EntryInput } from "@/lib/validation";
import { createEntry, rateEntry } from "@/server/queries/entries";
import { syncReferenceData } from "@/server/reference-data";

const PASSWORD = "doener123";

const USERS = [
  { key: "niklas", name: "Niklas Tran", username: "niklas" },
  { key: "lena", name: "Lena Meyer", username: "lena" },
  { key: "tim", name: "Tim Kaya", username: "timkebab" },
  { key: "jonas", name: "Jonas Brandt", username: "jonas" },
  { key: "selin", name: "Selin Aydın", username: "selin" },
  { key: "tobi", name: "Tobi D.", username: "tobi_d" },
] as const;
type Key = (typeof USERS)[number]["key"];

// Köln
const PLACES = {
  bosporus: { name: "Bosporus Grill", address: "Hauptstraße 12", lat: 50.9384, lng: 6.9497 },
  anatolia: { name: "Anatolia Imbiss", address: "Bahnhofplatz", lat: 50.9428, lng: 6.9584 },
  ece: { name: "Kebap Haus Ece", address: "Marktgasse 3", lat: 50.9369, lng: 6.9586 },
  mangal: { name: "Mangal Ocakbaşı", address: "Rheinufer 40", lat: 50.9336, lng: 6.9672 },
  lahmacun: { name: "Lahmacun Ustası", address: "Ehrenstraße 51", lat: 50.9393, lng: 6.9393 },
  efe: { name: "Efe Grill", address: "Zülpicher Str. 8", lat: 50.9301, lng: 6.9354 },
} as const;
type PlaceKey = keyof typeof PLACES;

async function main() {
  await syncReferenceData(db);
  const types = await db.select().from(kebabType);
  const typeId = (name: string) => types.find((t) => t.name === name && t.userId === null)!.id;

  const ids = {} as Record<Key, string>;
  for (const u of USERS) {
    const email = `${u.key}@example.com`;
    const existing = await db.query.user.findFirst({ where: eq(user.email, email) });
    if (existing) {
      ids[u.key] = existing.id;
      continue;
    }
    const res = await auth.api.signUpEmail({ body: { email, password: PASSWORD, name: u.username, username: u.username, displayUsername: u.username } });
    ids[u.key] = res.user.id;
  }
  await db.update(user).set({ createdAt: new Date("2026-01-08T10:00:00Z") }).where(eq(user.id, ids.niklas));

  const already = await db.select({ id: entry.id }).from(entry).where(inArray(entry.userId, Object.values(ids))).limit(1);
  if (already.length > 0) {
    console.log("Demo data already present – nothing to do.");
    process.exit(0);
  }

  const pairs: [Key, Key, "accepted" | "pending"][] = [
    ["niklas", "lena", "accepted"],
    ["tim", "niklas", "accepted"],
    ["niklas", "jonas", "accepted"],
    ["lena", "tim", "accepted"],
    ["jonas", "tim", "accepted"],
    ["niklas", "tobi", "accepted"],
    ["selin", "niklas", "pending"],
    ["selin", "lena", "accepted"],
    ["selin", "tim", "accepted"],
  ];
  await db
    .insert(friendship)
    .values(pairs.map(([a, b, status]) => ({ requesterId: ids[a], addresseeId: ids[b], status })))
    .onConflictDoNothing();

  const add = async (
    who: Key,
    p: PlaceKey,
    at: string,
    type: string,
    overall: number | null,
    price: number | null,
    opts: { with?: Key[]; meat?: EntryInput["meat"]; note?: string; ratings?: number[] } = {},
  ) => {
    const place = PLACES[p];
    const r = opts.ratings ?? [];
    const { id } = await createEntry(ids[who], {
      eatenAt: new Date(at).toISOString(),
      typeId: typeId(type),
      meat: opts.meat ?? "kalb",
      placeId: null,
      placeName: place.name,
      placeAddress: place.address,
      placeCity: "Köln",
      placeOsmId: null,
      lat: place.lat + (Math.random() - 0.5) * 0.0002,
      lng: place.lng + (Math.random() - 0.5) * 0.0002,
      accuracyM: 6 + Math.round(Math.random() * 10),
      priceCents: price,
      currency: "EUR",
      photoKey: null,
      companionIds: (opts.with ?? []).map((k) => ids[k]),
    });
    if (overall != null) {
      await rateEntry(ids[who], id, {
        overall,
        rMeat: r[0] ?? null,
        rBread: r[1] ?? null,
        rSauce: r[2] ?? null,
        rSalad: r[3] ?? null,
        rPortion: r[4] ?? null,
        rValue: r[5] ?? null,
        note: opts.note ?? null,
      });
    }
  };

  // Niklas – October 2026 (as in the Journal design)
  await add("niklas", "bosporus", "2026-10-27T10:40:00Z", "Dürüm", 5, 750, { with: ["lena"], note: "Extra scharf, Brot frisch vom Grill. Bester Dürüm in der Stadt.", ratings: [5, 4, 5, 4, 4, 5] });
  await add("niklas", "anatolia", "2026-10-24T17:30:00Z", "Döner", 4, 690);
  await add("niklas", "efe", new Date(Date.now() - 20 * 60_000).toISOString(), "Döner", null, 650); // just eaten, still "offen"
  await add("niklas", "ece", "2026-10-19T11:15:00Z", "Döner-Box", 3, 800, { with: ["tim", "jonas"], meat: "haehnchen" });
  await add("niklas", "mangal", "2026-10-15T18:45:00Z", "Teller", 4, 1150, { with: ["lena"], meat: "hack" });
  await add("niklas", "bosporus", "2026-10-11T12:05:00Z", "Döner", 5, 750);
  await add("niklas", "lahmacun", "2026-10-04T12:30:00Z", "Lahmacun", 4, 450, { meat: "veggie" });
  // older history
  const older: [PlaceKey, string, string, number, number][] = [
    ["bosporus", "2026-09-28T12:00:00Z", "Dürüm", 5, 750],
    ["anatolia", "2026-09-20T19:10:00Z", "Döner", 4, 690],
    ["ece", "2026-09-12T12:20:00Z", "Döner-Box", 5, 800],
    ["bosporus", "2026-09-03T13:00:00Z", "Dürüm", 4, 700],
    ["anatolia", "2026-08-25T12:45:00Z", "Döner", 5, 650],
    ["ece", "2026-08-14T21:40:00Z", "Döner-Box", 5, 800],
    ["mangal", "2026-07-30T18:00:00Z", "Teller", 4, 1100],
    ["bosporus", "2026-07-18T12:00:00Z", "Dürüm", 5, 700],
    ["anatolia", "2026-06-02T12:00:00Z", "Döner", 4, 650],
    ["bosporus", "2026-03-11T22:15:00Z", "Döner", 4, 650],
  ];
  for (const [p, at, type, overall, price] of older) await add("niklas", p, at, type, overall, price);

  // friends (feed + ranking)
  for (let d = 1; d <= 9; d++) await add("tim", d % 2 ? "ece" : "anatolia", `2026-10-${String(d * 3 - 2).padStart(2, "0")}T12:00:00Z`, d % 2 ? "Döner-Box" : "Döner", d % 3 === 0 ? 3 : 4, 800);
  await add("tim", "ece", "2026-10-27T09:30:00Z", "Döner-Box", 5, 800);
  for (let d = 1; d <= 4; d++) await add("lena", "bosporus", `2026-10-0${d * 2}T12:30:00Z`, "Dürüm", d === 2 ? 4 : 5, 750);
  await add("lena", "bosporus", "2026-10-27T10:40:00Z", "Dürüm", 5, 750, { with: ["niklas"] });
  await add("jonas", "anatolia", "2026-10-05T13:00:00Z", "Döner", 4, 690);
  await add("jonas", "ece", "2026-10-19T11:15:00Z", "Döner-Box", 4, 800, { with: ["niklas", "tim"] });
  await add("jonas", "efe", "2026-10-26T19:00:00Z", "Döner", 4, 650);
  await add("selin", "lahmacun", "2026-10-20T12:00:00Z", "Lahmacun", 5, 450);

  console.log("Seeded demo data. Login: niklas@example.com / doener123");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
