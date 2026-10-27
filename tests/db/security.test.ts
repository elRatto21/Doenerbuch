import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { entry, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import type { EntryInput } from "@/lib/validation";
import { createEntry } from "@/server/queries/entries";
import { searchUsers } from "@/server/queries/friends";
import { addEntry, befriend, CENTER, makeUser, resetData, typeId } from "./helpers";

beforeEach(resetData);

async function input(name: string): Promise<EntryInput> {
  return {
    eatenAt: new Date().toISOString(),
    typeId: await typeId("Döner"),
    meat: "kalb",
    placeId: null,
    placeName: name,
    placeAddress: null,
    placeCity: null,
    placeOsmId: null,
    lat: CENTER.lat,
    lng: CENTER.lng,
    accuracyM: 5,
    priceCents: 700,
    currency: "EUR",
    photoKey: null,
    companionIds: [],
  };
}

describe("entry rate limit", () => {
  it("allows 3 new döner per minute", async () => {
    const me = await makeUser("Niklas");
    for (let i = 0; i < 3; i++) await createEntry(me, await input(`Laden ${i}`), { enforceRateLimit: true });
    await expect(createEntry(me, await input("Laden 4"), { enforceRateLimit: true })).rejects.toThrow(/3 Döner pro Minute/);
  });

  it("holds under parallel requests", async () => {
    const me = await makeUser("Niklas");
    const results = await Promise.allSettled(
      Array.from({ length: 6 }, async (_, i) => createEntry(me, await input(`Parallel ${i}`), { enforceRateLimit: true })),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(3);
    expect(await db.$count(entry, eq(entry.userId, me))).toBe(3);
  });

  it("caps 30 per day", async () => {
    const me = await makeUser("Niklas");
    // 30 entries created earlier today
    for (let i = 0; i < 30; i++) await addEntry(me, { place: `Alt ${i}`, overall: 4, at: "2026-10-27T10:00:00Z", lat: CENTER.lat + i * 0.01 });
    await db.update(entry).set({ createdAt: new Date(Date.now() - 2 * 3600_000) }).where(eq(entry.userId, me));
    await expect(createEntry(me, await input("Noch einer"), { enforceRateLimit: true })).rejects.toThrow(/mehr geht erst morgen/);
  });
});

describe("auth API can't be used to impersonate", () => {
  it("forces name = username on sign-up", async () => {
    const res = await auth.api.signUpEmail({
      body: { email: "fake@example.com", password: "password123", name: "lena", username: "faker", displayUsername: "faker" },
    });
    const row = await db.query.user.findFirst({ where: eq(user.id, res.user.id) });
    expect(row?.name).toBe("faker");
    expect(row?.friendCode).toMatch(/^DÖN-/);
  });
});

describe("privacy", () => {
  it("search hides the döner count of users who don't share", async () => {
    const me = await makeUser("Niklas");
    const shy = await makeUser("Shy", { visibleToFriends: false });
    const open = await makeUser("Shown");
    await addEntry(shy, { place: "A", overall: 4, at: "2026-10-01T12:00:00Z" });
    await addEntry(open, { place: "B", overall: 4, at: "2026-10-01T12:00:00Z" });
    await befriend(me, open);
    expect((await searchUsers(me, "shy"))[0]?.entryCount).toBeNull();
    expect((await searchUsers(me, "shown"))[0]?.entryCount).toBe(1);
  });
});
