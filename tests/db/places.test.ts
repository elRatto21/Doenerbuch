import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { addEntry, befriend, CENTER, makeUser, resetData } from "./helpers";
import { suggestPlaces } from "@/server/queries/places";

beforeEach(resetData);

describe("place dedupe", () => {
  it("reuses a place with the same normalized name within 50 m", async () => {
    const me = await makeUser("Niklas");
    await addEntry(me, { place: "Bosporus Grill", overall: 5, at: "2026-10-01T12:00:00Z" });
    // ~30 m north, different spelling
    await addEntry(me, { place: "bosporus-grill", overall: 4, at: "2026-10-02T12:00:00Z", lat: CENTER.lat + 0.00027 });
    const places = await db.query.place.findMany();
    expect(places).toHaveLength(1);
  });

  it("creates a new place when further than 50 m or differently named", async () => {
    const me = await makeUser("Niklas");
    await addEntry(me, { place: "Bosporus Grill", overall: 5, at: "2026-10-01T12:00:00Z" });
    await addEntry(me, { place: "Bosporus Grill", overall: 5, at: "2026-10-01T12:00:00Z", lat: CENTER.lat + 0.001 }); // ~110 m
    await addEntry(me, { place: "Anatolia Imbiss", overall: 4, at: "2026-10-01T12:00:00Z" });
    expect(await db.query.place.findMany()).toHaveLength(3);
  });
});

describe("place suggestions", () => {
  it("offers own and friends' places within 150 m sorted by distance", async () => {
    const me = await makeUser("Niklas");
    const lena = await makeUser("Lena");
    const stranger = await makeUser("Fremd");
    await befriend(me, lena);
    await addEntry(me, { place: "Weit weg", overall: 4, at: "2026-10-01T12:00:00Z", lat: CENTER.lat + 0.01 });
    await addEntry(me, { place: "Nah", overall: 4, at: "2026-10-01T12:00:00Z", lat: CENTER.lat + 0.0009 }); // ~100 m
    await addEntry(lena, { place: "Ganz nah", overall: 4, at: "2026-10-01T12:00:00Z", lat: CENTER.lat + 0.0003 });
    await addEntry(stranger, { place: "Fremder Imbiss", overall: 4, at: "2026-10-01T12:00:00Z" });

    const nearby = await suggestPlaces(me, { ...CENTER });
    expect(nearby.map((p) => p.name)).toEqual(["Ganz nah", "Nah"]);

    const searched = await suggestPlaces(me, { ...CENTER, q: "weit" });
    expect(searched.map((p) => p.name)).toEqual(["Weit weg"]);
  });
});

describe("place visibility", () => {
  it("ignores a placeId the user cannot see", async () => {
    const { placeVisibleTo } = await import("@/server/queries/places");
    const me = await makeUser("Niklas");
    const stranger = await makeUser("Fremd");
    await addEntry(stranger, { place: "Geheimer Ort", overall: 4, at: "2026-10-01T12:00:00Z" });
    const secret = (await db.query.place.findMany())[0]!;
    expect(await placeVisibleTo(me, secret.id)).toBe(false);
    expect(await placeVisibleTo(stranger, secret.id)).toBe(true);
  });
});
