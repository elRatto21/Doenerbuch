import { beforeEach, describe, expect, it } from "vitest";
import { getStats } from "@/server/queries/stats";
import { journalSummary } from "@/server/queries/entries";
import { addEntry, makeUser, resetData } from "./helpers";

beforeEach(resetData);

const NOW = new Date("2026-10-27T12:00:00Z");

describe("statistics", () => {
  it("aggregates count, spend and types per period", async () => {
    const me = await makeUser("Niklas");
    await addEntry(me, { place: "Bosporus Grill", type: "Dürüm", overall: 5, price: 750, at: "2026-10-27T10:40:00Z" });
    await addEntry(me, { place: "Anatolia Imbiss", type: "Döner", overall: 4, price: 690, at: "2026-10-24T11:00:00Z" });
    await addEntry(me, { place: "Anatolia Imbiss", type: "Döner", overall: 3, price: null, at: "2026-09-10T11:00:00Z" });
    await addEntry(me, { place: "Anatolia Imbiss", type: "Döner", overall: 4, price: 600, at: "2025-05-10T11:00:00Z" });

    const month = await getStats(me, "monat", NOW);
    expect(month.count).toBe(2);
    expect(month.spend).toEqual([{ currency: "EUR", totalCents: 1440, avgCents: 720, pricedCount: 2 }]);
    expect(month.avgOverall).toBe(4.5);

    const year = await getStats(me, "jahr", NOW);
    expect(year.count).toBe(3);
    expect(year.byType).toEqual([
      expect.objectContaining({ name: "Döner", count: 2 }),
      expect.objectContaining({ name: "Dürüm", count: 1 }),
    ]);

    const all = await getStats(me, "gesamt", NOW);
    expect(all.count).toBe(4);
    expect(all.spend[0]!.totalCents).toBe(2040);
  });

  it("respects the app time zone at month boundaries", async () => {
    const me = await makeUser("Niklas");
    // 2026-10-31 23:30 UTC = 2026-11-01 00:30 in Berlin (CET)
    await addEntry(me, { place: "Spät", overall: 4, at: "2026-10-31T23:30:00Z" });
    expect((await getStats(me, "monat", NOW)).count).toBe(0);
    expect((await getStats(me, "monat", new Date("2026-11-05T12:00:00Z"))).count).toBe(1);
  });

  it("finds the best place per type with tie-break by count", async () => {
    const me = await makeUser("Niklas");
    await addEntry(me, { place: "Kebap Haus Ece", type: "Döner-Box", overall: 5, at: "2026-10-01T12:00:00Z", lat: 50.94 });
    await addEntry(me, { place: "Bosporus Grill", type: "Döner-Box", overall: 3, at: "2026-10-02T12:00:00Z" });
    // tie on avg 4.0 for Döner → place with more visits wins
    await addEntry(me, { place: "Einmal", type: "Döner", overall: 4, at: "2026-10-03T12:00:00Z", lat: 50.95 });
    await addEntry(me, { place: "Zweimal", type: "Döner", overall: 4, at: "2026-10-04T12:00:00Z", lat: 50.96 });
    await addEntry(me, { place: "Zweimal", type: "Döner", overall: 4, at: "2026-10-05T12:00:00Z", lat: 50.96 });

    const { bestByType } = await getStats(me, "gesamt", NOW);
    expect(bestByType.map((b) => [b.typeName, b.placeName, b.avgOverall, b.count])).toEqual([
      ["Döner-Box", "Kebap Haus Ece", 5, 1],
      ["Döner", "Zweimal", 4, 2],
    ]);
  });

  it("summarises the journal", async () => {
    const me = await makeUser("Niklas");
    await addEntry(me, { place: "A", overall: 5, at: "2026-10-20T12:00:00Z" });
    await addEntry(me, { place: "B", overall: 3, at: "2026-08-20T12:00:00Z" });
    expect(await journalSummary(me, NOW)).toEqual({ total: 2, avgOverall: 4, thisMonth: 1 });
  });
});
