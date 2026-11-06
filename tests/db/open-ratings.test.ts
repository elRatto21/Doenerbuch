import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { journalSummary, listJournal, rateEntry } from "@/server/queries/entries";
import { mapPlaces, monthlyRanking } from "@/server/queries/social";
import { getStats } from "@/server/queries/stats";
import { addEntry, makeUser, resetData } from "./helpers";

beforeEach(resetData);

const NOW = new Date("2026-10-27T12:00:00Z");

describe("entries saved first, rated later", () => {
  it("counts open entries but leaves them out of averages and the best list", async () => {
    const me = await makeUser("Niklas");
    await addEntry(me, { place: "Bosporus Grill", overall: 4, at: "2026-10-20T12:00:00Z" });
    const open = await addEntry(me, { place: "Neuer Laden", overall: null, at: "2026-10-27T11:00:00Z", lat: 50.95 });

    expect(await journalSummary(me, NOW)).toEqual({ total: 2, avgOverall: 4, thisMonth: 2, open: 1 });
    const stats = await getStats(me, "monat", NOW);
    expect(stats.count).toBe(2);
    expect(stats.avgOverall).toBe(4);
    expect(stats.bestByType.map((b) => b.placeName)).toEqual(["Bosporus Grill"]);
    expect((await monthlyRanking(me, NOW))[0]).toMatchObject({ count: 2, avgOverall: 4 });
    expect((await mapPlaces(me)).find((p) => p.name === "Neuer Laden")?.avg).toBeNull();

    const { entries } = await listJournal(me, { open: true });
    expect(entries.map((e) => [e.id, e.overall])).toEqual([[open, null]]);
  });

  it("rating an open entry stores the rating and the time", async () => {
    const me = await makeUser("Niklas");
    const id = await addEntry(me, { place: "Neuer Laden", overall: null, at: "2026-10-27T11:00:00Z" });
    await rateEntry(me, id, { overall: 5, rMeat: 5, rBread: 5, rSauce: 5, rSalad: 5, rPortion: 5, rValue: 5, note: "Top" });
    const row = await db.query.entry.findFirst({ where: (e, { eq }) => eq(e.id, id) });
    expect(row).toMatchObject({ overall: 5, note: "Top" });
    expect(row?.ratedAt).toBeInstanceOf(Date);
    expect((await journalSummary(me, NOW)).open).toBe(0);
  });

  it("does not let others rate my entry", async () => {
    const me = await makeUser("Niklas");
    const other = await makeUser("Fremd");
    const id = await addEntry(me, { place: "Neuer Laden", overall: null, at: "2026-10-27T11:00:00Z" });
    await expect(rateEntry(other, id, { overall: 1, rMeat: null, rBread: null, rSauce: null, rSalad: null, rPortion: null, rValue: null, note: null })).rejects.toThrow();
  });
});
